# Dockerfile 명령어 정리

[← 처음으로](../README.md) · [docker 명령어 정리 →](./docker-commands.md)

이 실습에서 사용한 Dockerfile 명령어와 `.dockerignore`를 정리했습니다.
각 항목에는 몇 단계에서 어떻게 썼는지를 함께 적었습니다.

## 한눈에 보기

| 명령어 | 한 줄 설명 | 처음 등장 |
|---|---|---|
| [`FROM`](#from) | 베이스 이미지 선택 | 1단계 |
| [`COPY`](#copy) | 내 PC 파일을 이미지 안으로 복사 | 1단계 |
| [`CMD`](#cmd) | 컨테이너 시작 시 실행할 기본 명령 | 1단계 |
| [`WORKDIR`](#workdir) | 이후 명령의 기준 폴더 지정 | 2단계 |
| [`EXPOSE`](#expose) | 사용하는 포트 문서화 | 2단계 |
| [`RUN`](#run) | 이미지를 만드는 중에 명령 실행 | 3단계 |
| [`ENV`](#env) | 환경 변수 설정 | 3단계 |
| [`LABEL`](#label) | 이미지에 메타정보 기록 | 4단계 |
| [`HEALTHCHECK`](#healthcheck) | 앱 상태를 주기적으로 검사 | 4단계 |
| [`FROM ... AS` / `COPY --from`](#멀티-스테이지-빌드) | 멀티 스테이지 빌드 | 6단계 |
| [`ENTRYPOINT`](#entrypoint) | 컨테이너 시작 시 실행할 고정 명령 | 8단계 |
| [`ARG`](#arg-참고) | 빌드할 때만 쓰는 변수 | (참고) |
| [`USER`](#user-참고) | 명령을 실행할 사용자 지정 | (참고) |

## 빌드 시점과 실행 시점

Dockerfile 명령어는 **언제 동작하는지**로 나누면 이해하기 쉽습니다.

```
docker build  ──→  이미지 만들기 (빌드 시점)
                   FROM, WORKDIR, COPY, RUN, ARG
                   ※ ENV, LABEL, EXPOSE, HEALTHCHECK, CMD, ENTRYPOINT는
                     이 시점에 "설정값"으로 이미지에 기록만 됨

docker run    ──→  컨테이너 실행 (실행 시점)
                   CMD / ENTRYPOINT 실행
                   ENV 값이 환경 변수로 적용
                   HEALTHCHECK 주기적으로 실행
```

| 헷갈리는 짝 | 빌드 시점 | 실행 시점 |
|---|---|---|
| `RUN` vs `CMD` | `RUN npm install` → 이미지 안에 패키지 설치 | `CMD ["node", "app.js"]` → 컨테이너가 뜰 때 앱 실행 |
| `ARG` vs `ENV` | `ARG`는 빌드 중에만 존재 | `ENV`는 빌드 중에도, 실행 중에도 존재 |

---

## FROM

**베이스 이미지를 선택합니다.** 모든 Dockerfile은 `FROM`으로 시작합니다.

```dockerfile
FROM nginx:alpine
FROM node:22-alpine
FROM python:3.12-slim
```

| 태그 | 특징 | 사용 단계 |
|---|---|---|
| `-alpine` | Alpine 리눅스 기반, 가장 작음 | 1~4, 6~8, 8-2단계 |
| `-slim` | Debian 기반 경량판, Python 패키지 호환성이 좋음 | 9, 10단계 |
| (태그 없음) | Debian 전체, 크지만 도구가 많음 | 5단계 |

> 운영 환경에서는 `nginx:1.27-alpine`처럼 **버전을 고정**해야 나중에 예기치 않게 동작이 바뀌지 않습니다.
> `node:16`처럼 지원이 끝난 버전은 보안 업데이트가 없으므로 피합니다.

---

## WORKDIR

**이후 `COPY`, `RUN`, `CMD`가 실행될 기준 폴더**를 지정합니다. 폴더가 없으면 자동으로 만듭니다.

```dockerfile
WORKDIR /app
COPY package.json .        # → /app/package.json
RUN npm install            # → /app 에서 실행
```

> `RUN cd /app` 은 그 줄에서만 효과가 있고 다음 줄에는 이어지지 않습니다. 폴더 이동은 항상 `WORKDIR`로 합니다.

---

## COPY

**내 PC(빌드 컨텍스트)의 파일을 이미지 안으로 복사**합니다.

```dockerfile
COPY index.html /usr/share/nginx/html/   # 파일 1개
COPY images/ ./images/                   # 폴더 내용 전체
COPY package*.json ./                    # 와일드카드 (package.json + package-lock.json)
COPY . .                                 # 현재 폴더 전체 (.dockerignore 제외 항목은 빠짐)
```

### 의존성 캐싱 패턴 (3단계부터 계속 사용)

Docker는 **입력 파일이 바뀌지 않은 단계를 캐시로 재사용**합니다.
의존성 목록 파일을 먼저 복사해 설치하고, 소스 코드는 나중에 복사하면 코드만 고쳤을 때 설치 단계를 건너뜁니다.

```dockerfile
COPY package*.json ./        # ① 의존성 목록만 먼저
RUN npm install              # ② 설치 (①이 그대로면 캐시 사용)
COPY . .                     # ③ 소스 코드는 마지막에
```

| 언어 | ① 먼저 복사할 파일 | ② 설치 명령 | 사용 단계 |
|---|---|---|---|
| Node.js | `package*.json` | `npm install` | 3, 4, 7 |
| Python (pip) | `requirements.txt` | `pip install -r requirements.txt` | 5 |
| Java (Maven) | `pom.xml` | `mvn dependency:go-offline` | 8, 8-2 |
| Python (uv) | `pyproject.toml`, `uv.lock` | `uv sync --locked` | 9, 10 |

> `ADD`도 파일을 복사하지만 압축 해제, URL 다운로드 같은 추가 동작이 있어 예상과 다르게 움직일 수 있습니다. 단순 복사는 항상 `COPY`를 씁니다.

---

## RUN

**이미지를 만드는 도중에 명령을 실행**합니다. 결과는 이미지에 저장됩니다.

```dockerfile
RUN npm install --omit=dev
RUN javac Main.java
RUN mvn package -DskipTests -B
RUN uv sync --locked --no-dev
```

> `RUN`은 줄마다 이미지 층(layer)이 하나씩 생깁니다. 관련 명령은 `&&`로 묶으면 층 수와 용량을 줄일 수 있습니다.
> ```dockerfile
> RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
> ```

---

## ENV

**환경 변수를 설정**합니다. 빌드 중에도, 컨테이너 실행 중에도 적용됩니다.

```dockerfile
ENV NODE_ENV=production
ENV PORT=3000

# 여러 개를 한 번에
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    GRADIO_SERVER_NAME=0.0.0.0
```

| 자주 쓰는 값 | 의미 | 사용 단계 |
|---|---|---|
| `NODE_ENV=production` | Node 라이브러리를 운영 모드로 | 3, 4 |
| `PATH="/app/.venv/bin:$PATH"` | 가상 환경의 명령을 기본으로 사용 | 9, 10 |
| `PYTHONUNBUFFERED=1` | `print()` 출력을 `docker logs`에 바로 표시 | 10 |
| `GRADIO_SERVER_NAME=0.0.0.0` | 컨테이너 밖에서 접속 허용 | 10 |
| `DB_HOST=mariadb` | 같은 네트워크의 DB 컨테이너 이름 (비밀 값이 아니라 이미지에 넣음) | 8-2 |

> ⚠️ **API 키, 비밀번호는 절대 `ENV`에 쓰지 않습니다.** 이미지를 받은 누구나 `docker inspect`로 볼 수 있습니다.
> 비밀 값은 실행할 때 `docker run --env-file .env`로 전달합니다 (8-2, 9, 10단계).

---

## EXPOSE

**컨테이너가 사용하는 포트를 문서로 남깁니다.** 실제로 포트를 열지는 않습니다.

```dockerfile
EXPOSE 3000
```

실제 접속은 `docker run`의 `-p` 옵션으로 연결해야 합니다.

```bash
docker run -p 8087:80 my-web
#             ↑    ↑
#        내 PC 포트  컨테이너 포트 (EXPOSE와 맞춤)
```

> 앞쪽(내 PC 포트)은 비어 있는 번호라면 아무거나 써도 되고, 뒤쪽은 앱이 실제로 듣는 포트여야 합니다.

---

## LABEL

**이미지에 메타정보를 기록**합니다. 동작에는 영향이 없습니다.

```dockerfile
LABEL maintainer="dev@example.com"
LABEL version="1.0"
```

```bash
docker inspect --format='{{json .Config.Labels}}' my-node-app
```

---

## HEALTHCHECK

**앱이 실제로 응답하는지 Docker가 주기적으로 검사**합니다.
`docker ps`의 `Up`은 프로세스가 살아 있다는 뜻일 뿐이라, 앱이 멈춰도 계속 `Up`으로 보이기 때문입니다.

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
  CMD node healthcheck.js
```

| 옵션 | 의미 | 기본값 |
|---|---|---|
| `--interval` | 검사 간격 | 30s |
| `--timeout` | 검사 1회 제한 시간 | 30s |
| `--start-period` | 시작 직후 실패를 무시하는 유예 시간 | 0s |
| `--retries` | unhealthy로 판정할 연속 실패 횟수 | 3 |

Docker는 출력 메시지가 아니라 **종료 코드**로 판정합니다. `0`이면 성공, `1`이면 실패입니다.

| 상태 | 의미 |
|---|---|
| `starting` | 아직 첫 검사 전 |
| `healthy` | 검사 통과 |
| `unhealthy` | 연속 실패 |

### 이미지에 따라 검사 방법이 다름

| 단계 | 이미지 | 검사 방법 |
|---|---|---|
| 4 | `node:22-alpine` | 별도 스크립트 `node healthcheck.js` |
| 8 | `eclipse-temurin:17-jre-alpine` | Alpine 기본 `wget` + Actuator `/actuator/health` |
| 8-2 | 위와 같음 | Actuator가 **DB 연결 상태까지** 검사 (DB가 끊기면 unhealthy) |
| 8-2 (DB) | `mariadb:10.11.18` | Dockerfile 없이 `docker run --health-cmd "healthcheck.sh ..."`로 지정 |
| 9, 10 | `python:3.12-slim` | slim에는 curl, wget이 없어 `python -c "urllib..."` |

```bash
# 상태 확인
docker inspect --format="{{.State.Health.Status}}" node-app

# 검사 스크립트의 출력 메시지 확인 (docker logs에는 안 나옴)
docker inspect --format='{{range .State.Health.Log}}{{println .Output}}{{end}}' node-app
```

---

## CMD

**컨테이너가 시작될 때 실행할 기본 명령**입니다. 메인 프로세스가 끝나면 컨테이너도 종료됩니다.

```dockerfile
CMD ["nginx", "-g", "daemon off;"]
CMD ["node", "app.js"]
CMD ["uvicorn", "010_FastAPI_Basic:app", "--host", "0.0.0.0", "--port", "8000"]
CMD ["python", "04main_rag_faiss_gradio_upstage.py"]
```

`docker run` 뒤에 명령을 적으면 **통째로 교체**됩니다.

```bash
docker run my-node-app            # → node app.js
docker run -it my-node-app sh     # → sh (앱 대신 쉘로 들어가 내부 확인)
```

> - Nginx의 `daemon off;`는 서버를 **포그라운드**로 실행하게 합니다. 백그라운드로 실행되면 메인 프로세스가 바로 끝나 컨테이너도 종료됩니다.
> - `CMD`가 없으면 베이스 이미지의 기본 명령이 실행됩니다. `node` 이미지는 `node`(대화형 모드)만 실행되어, `-d`로 띄우면 출력 없이 `Exited (0)`으로 바로 종료됩니다 (4단계에서 겪은 문제).

---

## ENTRYPOINT

**컨테이너가 시작될 때 실행할 고정 명령**입니다. `docker run` 뒤에 적은 값은 **인자로 덧붙습니다.**

```dockerfile
ENTRYPOINT ["java", "-jar", "app.jar"]
```

```bash
docker run spring-boot-app                       # → java -jar app.jar
docker run spring-boot-app --server.port=9090    # → java -jar app.jar --server.port=9090
```

### CMD와 ENTRYPOINT 비교

| 구분 | `CMD` | `ENTRYPOINT` |
|---|---|---|
| 역할 | 기본 명령 (바꿔도 되는 값) | 고정 명령 (이 컨테이너의 본질) |
| `docker run 이미지 xxx` | xxx로 **교체** | xxx가 **인자로 추가** |
| 덮어쓰기 | 뒤에 명령만 적으면 됨 | `--entrypoint` 옵션 필요 |
| 어울리는 경우 | 웹 서버, 가끔 쉘로 들어가 확인 | 옵션만 바꿔 실행하는 프로그램 |
| 사용 단계 | 1~7, 9, 10 | 8, 8-2 |

함께 쓰면 `ENTRYPOINT`는 고정 명령, `CMD`는 그 기본 인자가 됩니다.

```dockerfile
ENTRYPOINT ["java", "-jar", "app.jar"]
CMD ["--server.port=8080"]       # 인자를 안 주면 이 값 사용
```

```bash
# ENTRYPOINT가 있는 이미지에 쉘로 들어가기
docker run -it --entrypoint sh spring-boot-app
```

### 배열 형식으로 쓰는 이유

```dockerfile
CMD ["node", "app.js"]    # ✅ exec 형식: node가 직접 PID 1로 실행
CMD node app.js           # ❌ shell 형식: /bin/sh -c 를 거쳐 실행
```

shell 형식은 `docker stop` 신호가 앱에 바로 전달되지 않아 종료가 느리고, `ENTRYPOINT`에서는 뒤에 붙인 인자도 무시됩니다.

---

## 멀티 스테이지 빌드

**빌드 도구와 실행 환경을 나눠서**, 최종 이미지에는 실행에 필요한 결과물만 남깁니다.

```dockerfile
# 1단계: 빌드 (무거운 도구 포함)
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /src
COPY Main.java .
RUN javac Main.java

# 2단계: 실행 (가벼운 런타임만)
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /src/*.class ./      # 1단계 결과물만 가져옴
CMD ["java", "Main"]
```

| 문법 | 의미 |
|---|---|
| `FROM ... AS build` | 이 단계에 이름을 붙임 |
| `COPY --from=build` | 이름 붙인 단계의 파일을 가져옴 |
| `COPY --from=ghcr.io/astral-sh/uv:latest` | 다른 **이미지**에서 파일만 가져옴 (9, 10단계 uv 설치) |

| 단계 | 빌드용 | → | 실행용 | 버려지는 것 |
|---|---|---|---|---|
| 6 | JDK 17 | → | JRE 17 | 컴파일러, 소스 코드 |
| 7 | Node 22 | → | Nginx | `node_modules`, Vite, 소스 코드 |
| 8, 8-2 | Maven + JDK 17 | → | JRE 17 | Maven, 라이브러리 캐시, 소스 코드 |

> 빌드 도구는 1단계에만 있으면 되므로, 7단계처럼 `vite`가 devDependencies에 있을 때는 1단계에서 `--omit=dev`를 쓰면 안 됩니다.

---

## ARG (참고)

**빌드할 때만 쓰는 변수**입니다. 실습에서는 쓰지 않았지만 버전을 바꿔 빌드할 때 유용합니다.

```dockerfile
ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-alpine
```

```bash
docker build --build-arg NODE_VERSION=24 -t my-node-app .
```

> `ARG` 값은 `docker history`로 볼 수 있으므로 비밀 값을 넣으면 안 됩니다.

---

## USER (참고)

**이후 명령과 컨테이너를 실행할 사용자**를 지정합니다. 기본값은 `root`입니다.

```dockerfile
# node 공식 이미지에는 node 사용자가 이미 있음
USER node
CMD ["node", "app.js"]
```

> 실습은 단순화를 위해 root로 실행했지만, 운영 환경에서는 일반 사용자로 실행하는 것이 보안상 권장됩니다.

---

## .dockerignore

**이미지 빌드 때 복사하지 않을 파일**을 지정합니다. `.gitignore`와 문법이 같습니다.

```
.env            # 비밀 값
node_modules    # 컨테이너 안에서 새로 설치
.venv           # 컨테이너 안에서 새로 설치
target          # 컨테이너 안에서 새로 빌드
dist
.git
```

| 이유 | 설명 |
|---|---|
| 보안 | `.env`가 이미지에 들어가면 이미지를 받은 누구나 키를 볼 수 있음 |
| 정확성 | 내 PC의 `node_modules`가 컨테이너에서 설치한 패키지를 덮어쓰지 않도록 |
| 속도 | 불필요한 파일을 Docker로 보내지 않아 빌드가 빨라짐 |

> HEALTHCHECK가 실행하는 `healthcheck.js`처럼 **이미지에 꼭 필요한 파일은 넣으면 안 됩니다.**
> 반대로 8-2단계의 `db/` 폴더(DB 초기화 SQL)는 앱 이미지가 아니라 MariaDB 컨테이너에 `-v`로 연결해 쓰므로 제외했습니다.

---

[← 처음으로](../README.md) · [docker 명령어 정리 →](./docker-commands.md)
