# 08-2-springboot-mariadb

08단계의 Spring Boot 앱에 **MariaDB를 연결**하는 예제입니다.
앱과 DB를 **각각 별도 컨테이너**로 실행하고, **Docker 네트워크**로 두 컨테이너를 연결합니다.

## 이 예제의 목적

| 주제 | 내용 |
|---|---|
| 컨테이너 2개 연결 | `docker network`로 앱 컨테이너가 DB 컨테이너를 이름으로 찾기 |
| 데이터 유지 | 볼륨(`-v`)으로 컨테이너를 지워도 DB 데이터가 남도록 |
| DB 자동 초기화 | 환경 변수로 DB, 계정 생성 + 초기화 SQL로 DROP 권한 회수 |
| 설정 분리 | DB 접속 정보를 코드에 넣지 않고 환경 변수로 전달 |

### 08-spring-boot와 달라진 점

| 항목 | 08-spring-boot | 08-2-springboot-mariadb |
|---|---|---|
| 컨테이너 수 | 1개 (앱) | 2개 (앱 + MariaDB) |
| 추가 의존성 | 없음 | `spring-boot-starter-data-jpa`, `mariadb-java-client` |
| API | `/`, `/hello/{name}` | `/`, `/memos` (조회, 저장, 삭제) |
| 설정 | `application.properties` 고정값 | DB 접속 정보는 환경 변수 (`${...}`) |
| 비밀 값 | 없음 | `.env` → `--env-file` (09단계 방식) |
| 헬스체크 | 앱만 검사 | 앱 + **DB 연결 상태**까지 검사 |
| 내 PC 포트 | 8091 | 8092 (앱), 3306 (DB, 내 PC에서만) |

## 전체 구조

```
[내 PC]
  브라우저 ──── localhost:8092 ────┐
  DBeaver  ──── 127.0.0.1:3306 ────┼──────────────────────┐
                                   │                      │
┌──────────── boot-net (Docker 네트워크) ─────────────────┼──┐
│                                  ▼                      ▼  │
│   ┌────────────────────┐                ┌───────────────────┐ │
│   │ boot-app           │  mariadb:3306  │ mariadb           │ │
│   │ Spring Boot (8080) │ ─────────────▶ │ MariaDB (3306)    │ │
│   └────────────────────┘ (컨테이너 이름) └─────────┬─────────┘ │
└─────────────────────────────────────────────────────┼─────────┘
                                                      ▼
                                  볼륨 boot-mariadb-data (/var/lib/mysql)
                                  컨테이너를 지워도 데이터 유지
```

## 파일 구성

```
08-2-springboot-mariadb/
├── Dockerfile                    # 앱 이미지 (08단계와 같은 멀티 스테이지)
├── .dockerignore
├── .env                          # 실제 비밀번호 (Git, 이미지에 포함 금지)
├── .env.example                  # 형식 안내용
├── pom.xml                       # 의존성 (JPA, MariaDB 드라이버 추가)
├── db/init/
│   └── 01-revoke-drop.sql        # MariaDB 최초 시작 시 실행 (DROP 권한 회수)
├── src/main/
│   ├── java/com/example/demo/
│   │   ├── DemoApplication.java  # 앱 시작점
│   │   ├── Memo.java             # Entity (memo 테이블)
│   │   ├── MemoRepository.java   # DB 조회/저장
│   │   └── MemoController.java   # REST API
│   └── resources/
│       └── application.properties
├── 실행방법.txt
└── README.md
```

## 핵심 개념 1: Docker 네트워크

### 왜 localhost로는 안 되는가

컨테이너 안에서 `localhost`는 **그 컨테이너 자기 자신**입니다.
앱 컨테이너에서 `localhost:3306`으로 접속하면 앱 컨테이너 안에서 MariaDB를 찾다가 실패합니다.

| 앱 실행 위치 | DB 주소 | 이유 |
|---|---|---|
| 내 PC (`mvn spring-boot:run`) | `localhost:3306` | MariaDB 컨테이너의 3306이 `-p`로 내 PC에 연결되어 있음 |
| 컨테이너 (`docker run`) | `mariadb:3306` | 같은 네트워크의 컨테이너 이름으로 접속 |

### 네트워크로 연결하기

```bash
# 네트워크 만들기
docker network create boot-net

# 두 컨테이너를 같은 네트워크에 연결
docker run -d --name mariadb  --network boot-net ... mariadb:10.11.18
docker run -d --name boot-app --network boot-net ... boot-mariadb-app
```

같은 사용자 정의 네트워크에 있는 컨테이너끼리는 Docker가 **컨테이너 이름을 주소로** 바꿔 줍니다(내장 DNS).
그래서 앱은 `DB_HOST=mariadb`만 알면 됩니다.

> 컨테이너끼리는 MariaDB의 **내부 포트 3306**으로 바로 접속합니다. `-p 127.0.0.1:3306:3306`은 내 PC의 DBeaver 같은 프로그램을 위한 것이라, 빼도 앱은 정상 동작합니다.

```bash
# 네트워크에 어떤 컨테이너가 연결됐는지 확인
docker network inspect boot-net --format='{{range .Containers}}{{.Name}} {{end}}'
```

## 핵심 개념 2: 볼륨으로 데이터 유지

```bash
-v boot-mariadb-data:/var/lib/mysql
```

| 볼륨 없음 | 볼륨 있음 |
|---|---|
| `docker rm -f mariadb` 하면 DB, 테이블, 데이터 전부 삭제 | 컨테이너를 지워도 볼륨에 데이터가 남음 |
| | 같은 볼륨으로 다시 실행하면 이전 데이터 그대로 |

```bash
docker volume ls                       # 볼륨 목록
docker volume inspect boot-mariadb-data
docker volume rm boot-mariadb-data     # 데이터 완전 삭제 (컨테이너를 먼저 지워야 함)
```

## 핵심 개념 3: MariaDB 자동 초기화

MariaDB 공식 이미지는 **볼륨이 비어 있을 때(처음 시작할 때)만** 아래 순서로 초기화합니다.

```
1. MARIADB_ROOT_PASSWORD로 root 비밀번호 설정
2. MARIADB_DATABASE로 boot_db 생성
3. MARIADB_USER, MARIADB_PASSWORD로 'boot'@'%' 계정 생성
   + boot_db에 대한 ALL PRIVILEGES 부여
4. /docker-entrypoint-initdb.d/ 의 .sql 파일 실행
   → 01-revoke-drop.sql: REVOKE DROP ON boot_db.* FROM 'boot'@'%';
```

직접 SQL로 하던 작업과 같은 결과입니다.

```sql
CREATE DATABASE boot_db;
CREATE USER 'boot'@'%' IDENTIFIED BY '...';
GRANT ALL PRIVILEGES ON boot_db.* TO 'boot'@'%';
REVOKE DROP ON boot_db.* FROM 'boot'@'%';
```

> ⚠️ 이미 데이터가 있는 볼륨으로 시작하면 **1~4단계를 모두 건너뜁니다.** `.env`나 SQL 파일을 바꿨다면 볼륨을 지우고 다시 시작해야 적용됩니다.

### DROP 권한을 뺀 결과

| 동작 | boot 계정 |
|---|---|
| `SELECT`, `INSERT`, `UPDATE`, `DELETE` | 가능 |
| `CREATE TABLE`, `ALTER TABLE` | 가능 (JPA가 테이블을 만들 수 있음) |
| `DROP TABLE`, `DROP DATABASE`, `TRUNCATE` | **불가** |

그래서 JPA 설정을 `ddl-auto=update`로 했습니다. `create`, `create-drop`은 시작할 때 테이블을 DROP하므로 권한 오류가 납니다.

## 핵심 개념 4: 설정을 환경 변수로

`application.properties`
```properties
spring.datasource.url=jdbc:mariadb://${DB_HOST:localhost}:${DB_PORT:3306}/${MARIADB_DATABASE:boot_db}
spring.datasource.username=${MARIADB_USER:boot}
spring.datasource.password=${MARIADB_PASSWORD}
```

`${이름:기본값}`은 환경 변수가 있으면 그 값을, 없으면 기본값을 씁니다.

| 값 | 어디서 오는가 |
|---|---|
| `DB_HOST=mariadb`, `DB_PORT=3306` | Dockerfile의 `ENV` (비밀 값이 아니므로 이미지에 넣음) |
| `MARIADB_DATABASE`, `MARIADB_USER`, `MARIADB_PASSWORD` | `.env` → `--env-file` (MariaDB와 **같은 파일**) |

같은 `.env`를 두 컨테이너가 함께 쓰므로 비밀번호를 한 곳에서만 관리하면 됩니다.

> 이 방식은 앱 컨테이너에도 `MARIADB_ROOT_PASSWORD`가 함께 전달됩니다. 앱은 이 값을 쓰지 않지만, 운영 환경이라면 DB용과 앱용 env 파일을 나누는 것이 더 안전합니다.

## API

| 메서드 | 경로 | 동작 | SQL |
|---|---|---|---|
| `GET` | `/` | 앱 안내 | 없음 |
| `GET` | `/memos` | 메모 전체 조회 | `SELECT` |
| `GET` | `/memos/{id}` | 메모 1개 조회 (없으면 404) | `SELECT ... WHERE id = ?` |
| `POST` | `/memos` | 메모 저장, 본문 `{"content": "..."}` | `INSERT` |
| `DELETE` | `/memos/{id}` | 메모 삭제 (없으면 404) | `DELETE` |
| `GET` | `/actuator/health` | 앱 + DB 상태 | `SELECT 1` 수준의 연결 검사 |

`spring.jpa.show-sql=true`로 실행되는 SQL이 로그에 나오므로, `docker logs -f boot-app`을 켜 두고 API를 호출해 보면 JPA가 어떤 SQL을 만드는지 볼 수 있습니다.

## 실행 방법

자세한 명령과 옵션 설명은 `실행방법.txt`에 있습니다. 순서만 요약하면 다음과 같습니다.

```powershell
# 0. .env.example → .env 복사 후 비밀번호 입력
#    이전에 만든 mariadb 컨테이너가 있다면 삭제
docker rm -f mariadb

# 1. 네트워크 (처음 한 번)
docker network create boot-net

# 2. MariaDB 실행
docker run -d --name mariadb --network boot-net -p 127.0.0.1:3306:3306 --restart unless-stopped --env-file .env -v boot-mariadb-data:/var/lib/mysql -v ./db/init:/docker-entrypoint-initdb.d --health-cmd "healthcheck.sh --connect --innodb_initialized" --health-interval 10s --health-start-period 30s mariadb:10.11.18 --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci

# 3. MariaDB가 (healthy)가 될 때까지 기다림
docker ps

# 4. 앱 빌드
docker build -t boot-mariadb-app .

# 5. 앱 실행
docker run -d --name boot-app --network boot-net -p 8092:8080 --restart unless-stopped --env-file .env boot-mariadb-app
```

### 실행 순서가 중요한 이유

Spring Boot는 시작할 때 DB에 연결합니다. MariaDB가 아직 준비되지 않았으면 연결에 실패해 앱이 종료됩니다.

- MariaDB를 먼저 실행하고 `(healthy)`가 된 뒤 앱을 실행합니다.
- 앱에 `--restart unless-stopped`를 줘서, 혹시 먼저 떠서 종료되더라도 Docker가 다시 시작하게 했습니다.
- MariaDB의 `--health-cmd`는 이미지에 들어 있는 `healthcheck.sh` 스크립트로, 접속이 가능하고 저장 엔진(InnoDB) 초기화가 끝났는지 확인합니다.

> 이렇게 컨테이너 여러 개의 순서와 설정을 매번 명령으로 맞추는 것이 번거롭기 때문에, 다음 단계에서는 **Docker Compose**로 한 파일에 정리하는 방법을 씁니다.

## 테스트

### 브라우저

| 주소 | 기대 결과 |
|---|---|
| http://localhost:8092/ | 앱 안내 JSON |
| http://localhost:8092/memos | `[]` (처음에는 빈 목록) |
| http://localhost:8092/actuator/health | `"status":"UP"`, `components.db.status`도 `UP` |

### PowerShell

```powershell
# 저장
Invoke-RestMethod -Method Post -Uri http://localhost:8092/memos -ContentType "application/json" -Body '{"content":"first memo"}'

# 조회
Invoke-RestMethod http://localhost:8092/memos

# 삭제
Invoke-RestMethod -Method Delete -Uri http://localhost:8092/memos/1
```

### DB에서 직접 확인

```powershell
# 저장된 데이터
docker exec -it mariadb mariadb -uboot -p boot_db -e "SELECT * FROM memo;"

# 권한 목록 (DROP이 없어야 정상)
docker exec -it mariadb mariadb -uboot -p -e "SHOW GRANTS;"

# DROP 시도 → "DROP command denied" 오류가 나야 정상
docker exec -it mariadb mariadb -uboot -p boot_db -e "DROP TABLE memo;"
```

### 데이터 유지 확인

```powershell
docker rm -f boot-app mariadb
# → MariaDB 실행(2단계), 앱 실행(5단계) 명령을 다시 실행
Invoke-RestMethod http://localhost:8092/memos    # 이전에 저장한 메모가 그대로 보이면 성공
```

## 문제 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| `docker run` 시 `name "/mariadb" is already in use` | 이전에 만든 mariadb 컨테이너가 있음 | `docker rm -f mariadb` (데이터는 이전 볼륨에 남음) |
| 앱이 바로 종료되고 로그에 `Connection refused` | MariaDB가 아직 준비 전 | MariaDB가 `(healthy)`가 된 뒤 앱 실행, 또는 `--restart unless-stopped`로 자동 재시도 |
| 로그에 `UnknownHostException: mariadb` | 앱이 다른 네트워크에 있거나 DB 컨테이너 이름이 다름 | 두 컨테이너 모두 `--network boot-net`인지, DB 이름이 `mariadb`인지 확인 |
| `Access denied for user 'boot'` | 비밀번호 불일치, 또는 기존 볼륨으로 시작해 `.env`가 적용 안 됨 | `.env` 확인, 필요하면 볼륨 삭제 후 다시 시작 |
| `Unknown database 'boot_db'` | 기존 볼륨으로 시작해 자동 생성이 건너뛰어짐 | 볼륨 삭제 후 다시 시작 |
| DROP이 여전히 됨 | 기존 볼륨으로 시작해 `01-revoke-drop.sql`이 실행 안 됨 | 볼륨 삭제 후 다시 시작, 또는 root로 `REVOKE` 직접 실행 |
| 앱 시작 시 `DROP command denied` | `ddl-auto`가 `create` 또는 `create-drop` | `update` 또는 `validate`로 변경 |
| Git Bash에서 init 폴더 마운트 실패 | Git Bash가 컨테이너 경로를 Windows 경로로 변환 | PowerShell 사용, 또는 명령 앞에 `MSYS_NO_PATHCONV=1` |
| 한글이 `???`로 저장됨 | 문자셋 옵션 누락 | MariaDB 실행 명령 끝의 `utf8mb4` 옵션 확인 후 볼륨 삭제, 다시 시작 |
| `127.0.0.1:3306` 포트 사용 중 | PC에 MySQL/MariaDB가 설치되어 있음 | `-p 127.0.0.1:3307:3306`으로 바꾸고 DBeaver는 3307로 접속 |

## 정리

```powershell
docker rm -f boot-app mariadb          # 컨테이너 삭제 (데이터는 볼륨에 남음)
docker volume rm boot-mariadb-data     # 데이터까지 삭제
docker network rm boot-net             # 네트워크 삭제
docker rmi boot-mariadb-app            # 앱 이미지 삭제
```

## 보안 참고

- MariaDB 포트는 `127.0.0.1:3306`으로 열어 **내 PC에서만** 접속할 수 있게 했습니다. 다른 PC에서의 접속이 막혀 있습니다.
- 앱은 root가 아닌 **boot 전용 계정**으로 접속하고, 그 계정은 `boot_db`에만 권한이 있으며 DROP도 할 수 없습니다.
- `/actuator/health`의 `show-details=always`는 학습용입니다. 운영 환경에서는 DB 종류 등 내부 정보가 노출되지 않도록 `never` 또는 `when-authorized`로 설정합니다.
- `.env`는 `.dockerignore`와 `.gitignore` 양쪽에 넣어 이미지와 Git에 들어가지 않게 합니다.
