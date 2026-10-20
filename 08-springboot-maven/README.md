# 08-springboot-maven

Spring Boot 웹 앱을 **Maven으로 빌드**하고, 가벼운 **JRE 이미지로 실행**하는 멀티 스테이지 빌드 예제입니다.
Spring Boot Actuator의 `/actuator/health`를 이용해 **HEALTHCHECK**도 함께 적용했습니다.

## 이 예제의 목적

실무에서 가장 흔한 Java 백엔드 형태인 Spring Boot 앱을 컨테이너로 만드는 과정을 익히는 예제입니다.
앞 단계에서 배운 내용을 한데 모았습니다.

| 이전 단계 | 이 예제에서 활용한 내용 |
|---|---|
| 03-node-basic | 의존성 파일을 먼저 복사해 캐시 활용 |
| 04-node-healthcheck | HEALTHCHECK로 앱 상태 검사 |
| 06-java-multistage | JDK로 빌드, JRE로 실행하는 멀티 스테이지 빌드 |

### 06-java-multistage와 달라진 점

| 항목 | 06-java-multistage | 08-spring-boot |
|---|---|---|
| 빌드 도구 | `javac` (직접 컴파일) | Maven (의존성 다운로드 + 빌드) |
| 빌드용 이미지 | `eclipse-temurin:17-jdk-alpine` | `maven:3.9-eclipse-temurin-17` |
| 결과물 | `.class` 파일 | 실행 가능한 `.jar` 파일 |
| 웹 서버 | JDK 내장 `HttpServer` | Spring Boot 내장 Tomcat |
| 실행 명령 | `CMD` | `ENTRYPOINT` |
| 상태 검사 | 없음 | Actuator + HEALTHCHECK |

## 파일 구성

```
08-spring-boot/
├── Dockerfile                  # 이미지 빌드 설정 (멀티 스테이지)
├── .dockerignore               # 이미지 빌드에서 제외할 파일
├── pom.xml                     # Maven 설정 (Spring Boot 버전, 의존성)
├── 실행방법.txt                # 빌드, 실행, 확인 명령 모음
└── src/main/
    ├── java/com/example/demo/
    │   ├── DemoApplication.java    # 앱 시작점
    │   └── HelloController.java    # 요청 처리 (/, /hello/{name})
    └── resources/
        └── application.properties  # 포트, Actuator 설정
```

### pom.xml

| 항목 | 역할 |
|---|---|
| `spring-boot-starter-parent` 4.0.6 | Spring Boot 기본 설정 상속, 라이브러리 버전 자동 관리 |
| `java.version` 17 | 사용할 Java 버전 (Spring Boot 4는 Java 17 이상 필요) |
| `spring-boot-starter-web` | REST API 기능과 내장 Tomcat 서버 |
| `spring-boot-starter-actuator` | 상태 확인 경로 `/actuator/health` 제공 |
| `spring-boot-maven-plugin` | `java -jar`로 바로 실행 가능한 JAR 생성 |

### DemoApplication.java

`@SpringBootApplication`이 붙은 앱 시작점입니다. 같은 패키지(`com.example.demo`) 아래의 컨트롤러를 자동으로 찾아 등록합니다.

### HelloController.java

| 경로 | 응답 |
|---|---|
| `/` | `Hello from Spring Boot in Docker!` (텍스트) |
| `/hello/{name}` | `{"message": "Hello, {name}!"}` (JSON) |

### application.properties

```properties
spring.application.name=demo
server.port=8080
management.endpoints.web.exposure.include=health
```

Actuator는 보안을 위해 기본적으로 대부분의 경로를 숨기므로, `health`만 공개하도록 지정했습니다.

## Dockerfile 구조

```
┌─────────────────────────────────────┐
│ 1단계: build                        │
│ maven:3.9-eclipse-temurin-17        │
│                                     │
│  pom.xml 복사 → 의존성 다운로드     │  ← pom.xml이 그대로면 캐시 사용
│  src 복사    → mvn package          │
│                    ↓                │
│         target/demo-0.0.1-SNAPSHOT.jar
└────────────────────┬────────────────┘
                     │ COPY --from=build (JAR만 복사)
┌────────────────────▼────────────────┐
│ 2단계: 최종 이미지                  │
│ eclipse-temurin:17-jre-alpine       │
│                                     │
│  app.jar + HEALTHCHECK + ENTRYPOINT │
└─────────────────────────────────────┘
```

최종 이미지에는 Maven, JDK, 소스 코드, 다운로드한 라이브러리 캐시가 들어가지 않고 **JRE와 JAR 파일만** 남습니다.

### 의존성 캐시 (go-offline)

```dockerfile
COPY pom.xml .
RUN mvn dependency:go-offline -B   # ① 의존성, 플러그인 미리 다운로드

COPY src ./src
RUN mvn package -DskipTests -B     # ② 실제 빌드
```

`go-offline`은 인터넷 없이도 빌드할 수 있도록 필요한 라이브러리와 Maven 플러그인을 미리 내려받는 명령입니다.
Docker는 입력 파일이 바뀌지 않은 단계를 캐시로 재사용하므로 다음과 같이 동작합니다.

| 수정한 파일 | ① 다운로드 | ② 빌드 |
|---|---|---|
| Java 소스만 수정 | 캐시 사용 (건너뜀) | 다시 실행 |
| pom.xml 수정 | 다시 실행 | 다시 실행 |

> `go-offline`이 모든 플러그인을 받아 두지는 못해서, ② 단계에서 몇 개를 추가로 내려받는 로그가 보일 수 있습니다. 정상입니다.

| 옵션 | 의미 |
|---|---|
| `-B` | 배치 모드, 다운로드 진행 표시를 줄여 로그가 깔끔해짐 |
| `-DskipTests` | 테스트를 건너뛰어 빌드 시간 단축 |

### HEALTHCHECK

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1
```

| 옵션 | 의미 |
|---|---|
| `--interval=30s` | 30초마다 검사 |
| `--timeout=3s` | 3초 안에 응답 없으면 실패 |
| `--start-period=30s` | Spring Boot는 시작이 느리므로 처음 30초간 실패는 무시 |

04 단계에서는 별도의 `healthcheck.js`를 만들었지만, 여기서는 Actuator가 상태 확인 경로를 제공하므로 Alpine에 기본 포함된 `wget`으로 호출만 합니다.
`|| exit 1`은 `wget`이 실패하면 종료 코드 1을 반환해 Docker가 실패로 판정하게 합니다.

### ENTRYPOINT와 CMD

```dockerfile
ENTRYPOINT ["java", "-jar", "app.jar"]
```

| 구분 | 특징 |
|---|---|
| `CMD` | `docker run` 뒤에 명령을 적으면 **통째로 교체**됨 |
| `ENTRYPOINT` | 실행 명령이 고정되고, `docker run` 뒤에 적은 값은 **인자로 추가**됨 |

그래서 이미지를 다시 빌드하지 않고도 Spring Boot 설정을 바꿔 실행할 수 있습니다.

```bash
# 실제 실행: java -jar app.jar --server.port=9090
docker run -d -p 8092:9090 --name my-spring-9090 spring-boot-app --server.port=9090
```

## 실행 방법

```bash
# (재실행 시) 기존 컨테이너 정리
docker rm -f my-spring

# 이미지 빌드 (처음에는 라이브러리 다운로드로 몇 분 소요)
docker build -t spring-boot-app .

# 컨테이너 실행
# - 6단계 Java 예제의 8080과 겹치지 않도록 내 PC 포트는 8091 사용
docker run -d -p 8091:8080 --name my-spring spring-boot-app
```

시작 로그에 `Started DemoApplication`이 보이면 준비된 것입니다.

```bash
docker logs my-spring
```

## 테스트

| 주소 | 기대 결과 |
|---|---|
| http://localhost:8091/ | `Hello from Spring Boot in Docker!` |
| http://localhost:8091/hello/World | `{"message":"Hello, World!"}` |
| http://localhost:8091/actuator/health | `{"status":"UP"}` |

## 상태 확인

```bash
# STATUS가 (health: starting) → (healthy)로 바뀌는지 확인
docker ps
```

```powershell
# 상태값만 확인
docker inspect --format="Health Status: {{.State.Health.Status}}" my-spring

# 최근 검사 기록 확인 (시각 | 종료 코드 | 출력)
docker inspect --format='{{range .State.Health.Log}}{{.Start}} | {{.ExitCode}} | {{println .Output}}{{end}}' my-spring
```

### `.State.Health.Status`는 어디서 오는 값인가

직접 정한 변수가 아니라 Docker가 컨테이너마다 저장하는 정보(JSON)의 항목 경로입니다.
`docker inspect my-spring`을 그대로 실행하면 다음과 같은 구조가 출력됩니다.

```json
{
  "State": {
    "Status": "running",
    "Health": {
      "Status": "healthy",
      "FailingStreak": 0,
      "Log": [ { "ExitCode": 0, "Output": "..." } ]
    }
  },
  "Config": {
    "Entrypoint": ["java", "-jar", "app.jar"]
  }
}
```

`--format`은 Go 템플릿 문법으로, 맨 앞의 `.`이 컨테이너 정보 전체를 뜻하고 `.State.Health.Status`는 그 안을 순서대로 따라 들어간 값입니다.
`Health` 항목은 Dockerfile에 HEALTHCHECK가 있을 때만 생깁니다.

```bash
# 어떤 항목이 있는지 부분별로 살펴보기
docker inspect --format='{{json .State}}' my-spring
docker inspect --format='{{json .Config}}' my-spring
```

## 문제 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| 빌드 중 `mvn` 단계가 오래 걸림 | 첫 빌드라 라이브러리 다운로드 중 | 정상, 두 번째부터는 캐시 사용 |
| 시작 직후 접속 안 됨 | Spring Boot가 아직 시작 중 | `docker logs`에서 `Started DemoApplication` 확인 후 접속 |
| 계속 `(health: starting)` | 첫 검사 전 (`start-period` + `interval`) | 1분 정도 기다린 뒤 다시 확인 |
| `unhealthy` | Actuator 의존성 누락, 경로 또는 포트 불일치 | pom.xml과 application.properties 확인 |
| `/actuator/health` 404 | Actuator 의존성이 빠짐 | pom.xml에 `spring-boot-starter-actuator` 확인 후 다시 빌드 |
| 이름 충돌 오류 | 같은 이름의 컨테이너가 이미 있음 | `docker rm -f my-spring` 후 다시 실행 |
| 포트 사용 중 오류 | 내 PC의 8091을 다른 프로그램이 사용 | `-p 8093:8080`처럼 다른 포트 사용 |

## 버전 참고

- Spring Boot **4.0.6** 사용 (4.0.x의 무료 지원은 2026년 12월 31일까지)
- Java **17** (빌드: Maven 이미지의 JDK 17, 실행: JRE 17)
- 계속 사용할 계획이라면 지원 종료 전에 `pom.xml`의 `<parent>` 버전을 상위 버전으로 올리면 됩니다.
