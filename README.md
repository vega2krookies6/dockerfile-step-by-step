# dockerfile-step-by-step

정적 HTML 한 장부터 LLM RAG 앱까지, **10단계에 걸쳐 Dockerfile 작성법을 익히는 실습 저장소**입니다.
각 단계는 앞 단계에서 배운 내용 위에 새 개념을 하나씩 더하도록 구성했습니다.

## 단계별 목차

| 단계 | 폴더 | 앱 | 새로 배우는 내용 | 내 PC 포트 |
|---|---|---|---|---|
| 1 | [`01-nginx-single-html`](./01-nginx-single-html) | Nginx + HTML 1개 | `FROM`, `COPY`, `CMD` 기본 구조 | 8087 |
| 2 | [`02-nginx-static-files`](./02-nginx-static-files) | Nginx + HTML, CSS, 이미지 | `WORKDIR`, 여러 파일/폴더 복사, `EXPOSE` | 8087 |
| 3 | [`03-node-basic`](./03-node-basic) | Node.js (Express) | 의존성 캐싱, `RUN`, `ENV` | 3000 |
| 4 | [`04-node-healthcheck`](./04-node-healthcheck) | Node.js + 헬스체크 | `LABEL`, `HEALTHCHECK`, `.dockerignore` | 3000 |
| 5 | [`05-python-fastapi`](./05-python-fastapi) | Python FastAPI | pip + `requirements.txt`, uvicorn | 8000 |
| 6 | [`06-java-multistage`](./06-java-multistage) | 순수 Java 웹 서버 | **멀티 스테이지 빌드** (JDK → JRE) | 8080 |
| 7 | [`07-react-vite`](./07-react-vite) | React (Vite) | 프론트엔드 멀티 스테이지 (Node → Nginx) | 8090 |
| 8 | [`08-spring-boot`](./08-spring-boot) | Spring Boot | Maven 빌드, `ENTRYPOINT`, Actuator 헬스체크 | 8091 |
| 9 | [`09-langchain-uv`](./09-langchain-uv) | LangChain + FastAPI | **uv**, 비밀 값 분리 (`--env-file`) | 8001 |
| 10 | [`10-langchain-rag-uv`](./10-langchain-rag-uv) | PDF RAG (Gradio) | 배포용 코드 수정, 환경 변수로 설정 분리 | 7860 |

각 폴더에는 `Dockerfile`과 `실행방법.txt`가 있고, 4·8·9·10단계에는 자세한 `README.md`가 있습니다.

---

## Dockerfile 명령어 요약

### 한눈에 보기

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

### 빌드 시점과 실행 시점

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

### FROM

**베이스 이미지를 선택합니다.** 모든 Dockerfile은 `FROM`으로 시작합니다.

```dockerfile
FROM nginx:alpine
FROM node:22-alpine
FROM python:3.12-slim
```

| 태그 | 특징 | 사용 단계 |
|---|---|---|
| `-alpine` | Alpine 리눅스 기반, 가장 작음 | 1~4, 6~8단계 |
| `-slim` | Debian 기반 경량판, Python 패키지 호환성이 좋음 | 9, 10단계 |
| (태그 없음) | Debian 전체, 크지만 도구가 많음 | 5단계 |

> 운영 환경에서는 `nginx:1.27-alpine`처럼 **버전을 고정**해야 나중에 예기치 않게 동작이 바뀌지 않습니다.
> `node:16`처럼 지원이 끝난 버전은 보안 업데이트가 없으므로 피합니다.

---

### WORKDIR

**이후 `COPY`, `RUN`, `CMD`가 실행될 기준 폴더**를 지정합니다. 폴더가 없으면 자동으로 만듭니다.

```dockerfile
WORKDIR /app
COPY package.json .        # → /app/package.json
RUN npm install            # → /app 에서 실행
```

> `RUN cd /app` 은 그 줄에서만 효과가 있고 다음 줄에는 이어지지 않습니다. 폴더 이동은 항상 `WORKDIR`로 합니다.

---

### COPY

**내 PC(빌드 컨텍스트)의 파일을 이미지 안으로 복사**합니다.

```dockerfile
COPY index.html /usr/share/nginx/html/   # 파일 1개
COPY images/ ./images/                   # 폴더 내용 전체
COPY package*.json ./                    # 와일드카드 (package.json + package-lock.json)
COPY . .                                 # 현재 폴더 전체 (.dockerignore 제외 항목은 빠짐)
```

#### 의존성 캐싱 패턴 (3단계부터 계속 사용)

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
| Java (Maven) | `pom.xml` | `mvn dependency:go-offline` | 8 |
| Python (uv) | `pyproject.toml`, `uv.lock` | `uv sync --locked` | 9, 10 |

> `ADD`도 파일을 복사하지만 압축 해제, URL 다운로드 같은 추가 동작이 있어 예상과 다르게 움직일 수 있습니다. 단순 복사는 항상 `COPY`를 씁니다.

---

### RUN

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

### ENV

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

> ⚠️ **API 키, 비밀번호는 절대 `ENV`에 쓰지 않습니다.** 이미지를 받은 누구나 `docker inspect`로 볼 수 있습니다.
> 비밀 값은 실행할 때 `docker run --env-file .env`로 전달합니다 (9, 10단계).

---

### EXPOSE

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

### LABEL

**이미지에 메타정보를 기록**합니다. 동작에는 영향이 없습니다.

```dockerfile
LABEL maintainer="dev@example.com"
LABEL version="1.0"
```

```bash
docker inspect --format='{{json .Config.Labels}}' my-node-app
```

---

### HEALTHCHECK

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

#### 이미지에 따라 검사 방법이 다름

| 단계 | 이미지 | 검사 방법 |
|---|---|---|
| 4 | `node:22-alpine` | 별도 스크립트 `node healthcheck.js` |
| 8 | `eclipse-temurin:17-jre-alpine` | Alpine 기본 `wget` + Actuator `/actuator/health` |
| 9, 10 | `python:3.12-slim` | slim에는 curl, wget이 없어 `python -c "urllib..."` |

```bash
# 상태 확인
docker inspect --format="{{.State.Health.Status}}" node-app

# 검사 스크립트의 출력 메시지 확인 (docker logs에는 안 나옴)
docker inspect --format='{{range .State.Health.Log}}{{println .Output}}{{end}}' node-app
```

---

### CMD

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

### ENTRYPOINT

**컨테이너가 시작될 때 실행할 고정 명령**입니다. `docker run` 뒤에 적은 값은 **인자로 덧붙습니다.**

```dockerfile
ENTRYPOINT ["java", "-jar", "app.jar"]
```

```bash
docker run spring-boot-app                       # → java -jar app.jar
docker run spring-boot-app --server.port=9090    # → java -jar app.jar --server.port=9090
```

#### CMD와 ENTRYPOINT 비교

| 구분 | `CMD` | `ENTRYPOINT` |
|---|---|---|
| 역할 | 기본 명령 (바꿔도 되는 값) | 고정 명령 (이 컨테이너의 본질) |
| `docker run 이미지 xxx` | xxx로 **교체** | xxx가 **인자로 추가** |
| 덮어쓰기 | 뒤에 명령만 적으면 됨 | `--entrypoint` 옵션 필요 |
| 어울리는 경우 | 웹 서버, 가끔 쉘로 들어가 확인 | 옵션만 바꿔 실행하는 프로그램 |
| 사용 단계 | 1~7, 9, 10 | 8 |

함께 쓰면 `ENTRYPOINT`는 고정 명령, `CMD`는 그 기본 인자가 됩니다.

```dockerfile
ENTRYPOINT ["java", "-jar", "app.jar"]
CMD ["--server.port=8080"]       # 인자를 안 주면 이 값 사용
```

```bash
# ENTRYPOINT가 있는 이미지에 쉘로 들어가기
docker run -it --entrypoint sh spring-boot-app
```

#### 배열 형식으로 쓰는 이유

```dockerfile
CMD ["node", "app.js"]    # ✅ exec 형식: node가 직접 PID 1로 실행
CMD node app.js           # ❌ shell 형식: /bin/sh -c 를 거쳐 실행
```

shell 형식은 `docker stop` 신호가 앱에 바로 전달되지 않아 종료가 느리고, `ENTRYPOINT`에서는 뒤에 붙인 인자도 무시됩니다.

---

### 멀티 스테이지 빌드

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
| 8 | Maven + JDK 17 | → | JRE 17 | Maven, 라이브러리 캐시, 소스 코드 |

> 빌드 도구는 1단계에만 있으면 되므로, 7단계처럼 `vite`가 devDependencies에 있을 때는 1단계에서 `--omit=dev`를 쓰면 안 됩니다.

---

### ARG (참고)

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

### USER (참고)

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

---

## 자주 쓰는 docker 명령

### 이미지와 컨테이너의 관계

```
Dockerfile ──docker build──→ 이미지 ──docker run──→ 컨테이너
 (설계도)                     (틀, 읽기 전용)          (실행 중인 인스턴스)
                               │                        │
                       docker images              docker ps
                       docker rmi                 docker rm
```

- 이미지 하나로 컨테이너를 여러 개 만들 수 있습니다.
- 컨테이너가 사용 중인 이미지는 컨테이너를 먼저 지워야 삭제할 수 있습니다.

### 한눈에 보기

| 분류 | 명령 | 하는 일 |
|---|---|---|
| 이미지 | `docker build` | Dockerfile로 이미지 만들기 |
| | `docker images` | 이미지 목록 |
| | `docker rmi` | 이미지 삭제 |
| | `docker tag` | 이미지에 다른 이름(태그) 붙이기 |
| | `docker history` | 이미지가 만들어진 단계(layer)별 크기 |
| | `docker pull` / `docker push` | 레지스트리에서 받기 / 올리기 |
| 컨테이너 | `docker run` | 이미지로 컨테이너 만들고 실행 |
| | `docker ps` | 컨테이너 목록 |
| | `docker stop` / `start` / `restart` | 중지 / 다시 시작 / 재시작 |
| | `docker rm` | 컨테이너 삭제 |
| 확인 | `docker logs` | 메인 프로세스 출력 |
| | `docker exec` | 실행 중인 컨테이너 안에서 명령 실행 |
| | `docker inspect` | 상세 정보 (JSON) |
| | `docker stats` | CPU, 메모리 사용량 |
| | `docker port` | 포트 연결 상태 |
| | `docker cp` | 컨테이너와 내 PC 사이 파일 복사 |
| 정리 | `docker system df` | 디스크 사용량 |
| | `docker image prune` / `container prune` / `system prune` | 안 쓰는 것 일괄 삭제 |

---

### 이미지 명령

#### docker build — 이미지 만들기

```bash
# 기본: 현재 폴더(.)의 Dockerfile로 빌드
docker build -t my-node-app .

# 버전 태그 붙이기 (태그를 생략하면 :latest)
docker build -t my-node-app:1.0 .

# 캐시 없이 처음부터 다시 빌드 (설치 단계가 꼬였을 때)
docker build --no-cache -t my-node-app .

# 다른 이름의 Dockerfile 사용
docker build -f Dockerfile.dev -t my-node-app:dev .

# 빌드 변수 전달 (Dockerfile의 ARG)
docker build --build-arg NODE_VERSION=24 -t my-node-app .
```

| 옵션 | 의미 |
|---|---|
| `-t 이름:태그` | 이미지 이름과 태그 지정 |
| `.` (마지막 인자) | 빌드 컨텍스트, Docker로 보낼 폴더 (`COPY`의 기준) |
| `--no-cache` | 캐시를 쓰지 않고 모든 단계 다시 실행 |
| `-f 파일` | `Dockerfile`이 아닌 다른 파일 사용 |
| `--build-arg 키=값` | `ARG` 값 전달 |
| `--progress=plain` | 빌드 로그를 줄여 쓰지 않고 전부 출력 (오류 원인 찾을 때) |

> 빌드는 반드시 **해당 단계 폴더 안에서** 실행합니다. 다른 폴더에서 빌드하면 그 폴더의 Dockerfile로 이미지가 만들어집니다 (3단계에서 Nginx 이미지가 만들어진 원인).

#### docker images — 이미지 목록

```bash
docker images                    # 전체 목록
docker images my-node-app        # 특정 이름만
docker images -f dangling=true   # 이름 없는(<none>) 이미지만
```

```
REPOSITORY        TAG       IMAGE ID       CREATED          SIZE
my-node-app       latest    a1b2c3d4e5f6   10 minutes ago   180MB
langchain-uv-app  latest    f6e5d4c3b2a1   2 hours ago      310MB
<none>            <none>    0123456789ab   3 hours ago      305MB
```

> `<none>` 이미지는 같은 이름으로 다시 빌드하면서 이름을 빼앗긴 이전 이미지입니다. 쌓이면 `docker image prune`으로 정리합니다.

#### docker rmi — 이미지 삭제

```bash
docker rmi my-node-app           # 이름으로 삭제 (:latest)
docker rmi my-node-app:1.0       # 특정 태그만 삭제
docker rmi a1b2c3d4e5f6          # IMAGE ID로 삭제 (앞 몇 글자만 써도 됨)
docker rmi -f my-node-app        # 강제 삭제
```

| 오류 메시지 | 원인 | 해결 |
|---|---|---|
| `image is being used by stopped container` | 종료된 컨테이너가 이 이미지를 참조 중 | `docker rm 컨테이너` 후 다시 삭제 |
| `image is being used by running container` | 실행 중인 컨테이너가 사용 중 | `docker rm -f 컨테이너` 후 다시 삭제 |
| `image is referenced in multiple repositories` | 같은 이미지에 태그가 여러 개 | 태그별로 지우거나 IMAGE ID로 `-f` 삭제 |

#### docker tag — 이름 붙이기

이미지를 복사하지 않고 **같은 이미지에 이름만 하나 더** 붙입니다. 레지스트리에 올리기 전에 주로 씁니다.

```bash
docker tag my-node-app my-node-app:1.0
docker tag my-node-app 사용자이름/my-node-app:1.0    # Docker Hub에 올릴 이름
```

#### docker history — 단계별 크기

```bash
docker history my-node-app
```

Dockerfile의 각 줄이 이미지 크기를 얼마나 차지하는지 보여줍니다. 이미지가 예상보다 클 때 원인 찾기에 좋습니다 (예: 강의 전체용 `pyproject.toml`로 PyTorch가 설치된 경우).

> ⚠️ `ENV`, `ARG`에 넣은 값도 여기에 그대로 보입니다. 비밀 값을 Dockerfile에 쓰면 안 되는 이유입니다.

#### docker pull / push — 레지스트리

```bash
docker pull nginx:alpine                       # 미리 받아 두기 (build 시 자동으로 받기도 함)

docker login                                   # Docker Hub 로그인
docker tag my-node-app 사용자이름/my-node-app:1.0
docker push 사용자이름/my-node-app:1.0         # 업로드
```

---

### 컨테이너 명령

#### docker run — 실행

```bash
# 기본 형태
docker run -d -p 내PC포트:컨테이너포트 --name 컨테이너이름 이미지이름

# 실습 예시
docker run -d -p 8087:80 --name my-web my-simple-website
docker run -d -p 8001:8000 --env-file .env --name my-langchain langchain-uv-app

# 확인용으로 잠깐 실행하고 끝나면 자동 삭제
docker run --rm my-node-app ls -la

# 쉘로 들어가서 이미지 내부 살펴보기
docker run -it --rm my-node-app sh

# ENTRYPOINT가 있는 이미지에 쉘로 들어가기 (8단계)
docker run -it --rm --entrypoint sh spring-boot-app
```

| 옵션 | 의미 |
|---|---|
| `-d` | 백그라운드 실행 (터미널을 점유하지 않음) |
| `-p 8087:80` | 내 PC 8087 → 컨테이너 80 연결 |
| `--name` | 컨테이너 이름 지정 (생략하면 무작위 이름) |
| `--env-file .env` | 파일의 값을 환경 변수로 전달 |
| `-e KEY=VALUE` | 환경 변수 1개 전달 |
| `--rm` | 컨테이너가 끝나면 자동 삭제 |
| `-it` | 터미널을 연결해 대화형으로 실행 |
| `--entrypoint` | Dockerfile의 `ENTRYPOINT` 대신 실행할 명령 |
| `--restart unless-stopped` | 오류로 종료되거나 PC가 재부팅되면 자동 재시작 |
| `-v 내PC경로:컨테이너경로` | 폴더 연결 (컨테이너를 지워도 데이터 유지) |

#### docker ps — 목록

```bash
docker ps        # 실행 중인 컨테이너
docker ps -a     # 종료된 컨테이너까지 전부
docker ps -q     # ID만 출력 (다른 명령과 조합할 때)
```

| STATUS | 의미 |
|---|---|
| `Up 2 minutes` | 실행 중 |
| `Up 2 minutes (healthy)` | 실행 중 + 헬스체크 통과 |
| `Up 10 seconds (health: starting)` | 실행 중 + 첫 헬스체크 전 |
| `Exited (0) 5 seconds ago` | 정상 종료 (서버가 계속 실행되지 않음) |
| `Exited (1) 5 seconds ago` | 오류로 종료 → `docker logs` 확인 |

#### docker stop / start / restart

```bash
docker stop my-web       # 중지 (컨테이너는 남아 있음)
docker start my-web      # 중지된 컨테이너 다시 시작 (설정 그대로)
docker restart my-web    # 중지 후 바로 시작
```

> `start`는 **기존 컨테이너**를 다시 켜는 것이라 이미지를 다시 빌드해도 반영되지 않습니다. 코드를 고쳤다면 `rm` 후 새로 `run` 해야 합니다.

#### docker rm — 삭제

```bash
docker rm my-web         # 중지된 컨테이너 삭제
docker rm -f my-web      # 실행 중이어도 강제 삭제 (stop + rm)
```

> 같은 `--name`으로 다시 `run`하려면 기존 컨테이너를 먼저 지워야 합니다. 그래서 각 단계 `실행방법.txt` 첫 줄에 `docker rm -f`가 있습니다.

---

### 확인 명령

#### docker logs — 출력 보기

```bash
docker logs my-rag              # 지금까지의 출력
docker logs -f my-rag           # 실시간으로 계속 보기 (Ctrl + C로 빠져나와도 컨테이너는 계속 실행)
docker logs --tail 50 my-rag    # 마지막 50줄만
docker logs -t my-rag           # 시각 표시
```

> `docker logs`는 **메인 프로세스(`CMD`/`ENTRYPOINT`)의 출력**만 보여줍니다. HEALTHCHECK 스크립트의 출력은 `docker inspect`로 봐야 합니다 (4단계).
> Python의 `print()`가 안 보이면 Dockerfile에 `ENV PYTHONUNBUFFERED=1`이 있는지 확인합니다 (10단계).

#### docker exec — 컨테이너 안에서 명령 실행

```bash
docker exec -it node-app sh                 # 쉘로 들어가기 (exit로 나옴)
docker exec node-app ls -la                 # 명령 하나만 실행
docker exec node-app node healthcheck.js    # 헬스체크 스크립트 직접 실행 (4단계)

# 키가 전달되었는지 값을 출력하지 않고 확인 (9, 10단계)
docker exec my-rag python -c "import os; print('set' if os.getenv('UPSTAGE_API_KEY') else 'missing')"
```

> Alpine, slim 이미지에는 `bash`가 없는 경우가 많으므로 `sh`를 씁니다.

#### docker inspect — 상세 정보

```bash
docker inspect node-app                                      # 전체 JSON

docker inspect --format='{{.State.Status}}' node-app         # running, exited
docker inspect --format='{{.State.Health.Status}}' node-app  # healthy, unhealthy
docker inspect --format='{{range .State.Health.Log}}{{println .Output}}{{end}}' node-app
docker inspect --format='{{json .Config.Cmd}}' my-node-app   # 이미지에 설정된 CMD
docker inspect --format='{{json .State}}' node-app           # State 부분만 보기
```

`--format`은 Go 템플릿 문법입니다. 맨 앞의 `.`이 컨테이너 정보 전체이고, `.State.Health.Status`는 JSON 안을 순서대로 따라 들어간 값입니다.

#### docker stats / port / cp

```bash
docker stats                    # 실행 중인 컨테이너의 CPU, 메모리 실시간 표시 (Ctrl + C로 종료)
docker stats --no-stream        # 한 번만 출력

docker port my-web              # 80/tcp -> 0.0.0.0:8087

docker cp my-web:/usr/share/nginx/html/index.html .   # 컨테이너 → 내 PC
docker cp index.html my-web:/usr/share/nginx/html/    # 내 PC → 컨테이너 (재시작하면 사라짐)
```

---

### 정리 명령

연습하다 보면 종료된 컨테이너와 `<none>` 이미지, 빌드 캐시가 쌓여 디스크를 많이 차지합니다.

```bash
docker system df                # 이미지, 컨테이너, 빌드 캐시가 차지하는 용량

docker container prune          # 종료된 컨테이너 전부 삭제
docker image prune              # 이름 없는(<none>) 이미지 삭제
docker image prune -a           # 컨테이너가 사용하지 않는 이미지 전부 삭제
docker builder prune            # 빌드 캐시 삭제
docker system prune             # 위의 것들(종료된 컨테이너, <none> 이미지, 네트워크, 캐시)을 한 번에
```

> ⚠️ `docker image prune -a`, `docker system prune -a`는 지금 실행 중이 아닌 이미지를 **모두** 지웁니다. 다음 빌드 때 베이스 이미지를 다시 내려받아야 하므로 시간이 걸립니다.

여러 개를 한 번에 지우고 싶을 때는 다른 명령과 조합합니다.

```bash
# 모든 컨테이너 강제 삭제 (Git Bash, PowerShell 모두 동작)
docker rm -f $(docker ps -aq)
```

---

### 단계별 실습 흐름 (코드를 고쳤을 때)

```bash
docker rm -f my-web                                   # 1. 기존 컨테이너 삭제
docker build -t my-simple-website .                   # 2. 이미지 다시 빌드
docker run -d -p 8087:80 --name my-web my-simple-website  # 3. 새 컨테이너 실행
docker ps                                             # 4. STATUS 확인
docker logs my-web                                    # 5. 오류 확인
```

---

## 문제 해결 빠른 참고

| 증상 | 흔한 원인 | 확인 방법 |
|---|---|---|
| `Exited (0)`, 로그 없음 | `CMD`가 없거나 앱이 서버를 띄우지 않고 끝남 | `docker inspect --format='{{json .Config.Cmd}}' 이미지` |
| `Exited (1)` | 앱 오류, 환경 변수(API 키) 누락 | `docker logs 컨테이너` |
| `Up`인데 접속 안 됨 | 앱이 `127.0.0.1`로 열림 (`0.0.0.0` 필요), 포트 불일치 | 앱 시작 로그의 주소 확인 |
| COMMAND가 예상과 다름 | 다른 폴더에서 빌드함 | 빌드한 폴더와 `Dockerfile` 첫 줄 확인 |
| 이름 충돌 오류 | 같은 이름의 컨테이너가 이미 있음 | `docker rm -f 컨테이너이름` |
| 포트 사용 중 오류 | 다른 컨테이너나 프로그램이 포트 사용 | `docker ps`, `netstat -ano \| findstr :포트` |
| 코드를 고쳤는데 반영 안 됨 | 다시 빌드하지 않음 | `docker build` 후 컨테이너 다시 실행 |
