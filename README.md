# dockerfile-step-by-step

정적 HTML 한 장부터 DB 연동 백엔드, LLM RAG 앱까지, **단계별로 Dockerfile 작성법을 익히는 실습 저장소**입니다.
각 단계는 앞 단계에서 배운 내용 위에 새 개념을 하나씩 더하도록 구성했습니다.

## 문서

| 문서 | 내용 |
|---|---|
| [Dockerfile 명령어 정리](./docs/dockerfile-instructions.md) | `FROM`, `COPY`, `RUN`, `ENV`, `HEALTHCHECK`, `CMD`, `ENTRYPOINT`, 멀티 스테이지 빌드, `.dockerignore` |
| [docker 명령어 정리](./docs/docker-commands.md) | `docker build`, `run`, `ps`, `logs`, `exec`, `inspect`, `rmi`, 네트워크, 볼륨, 정리 명령, 문제 해결 |

## 저장소 구조

```
dockerfile-step-by-step/
├── README.md                    ← 지금 보는 문서 (단계별 안내)
├── .gitignore
├── docs/
│   ├── dockerfile-instructions.md ← Dockerfile 명령어 정리
│   └── docker-commands.md        ← docker 명령어 정리
├── 01-nginx-single-html/
├── 02-nginx-static-files/
├── 03-node-basic/
├── 04-node-healthcheck/
├── 05-python-fastapi/
├── 06-java-multistage/
├── 07-react-vite/
├── 08-spring-boot/
├── 08-2-springboot-mariadb/
├── 09-langchain-uv/
└── 10-langchain-rag-uv/
```

모든 단계 폴더에는 `Dockerfile`과 `실행방법.txt`가 있습니다. 명령은 **해당 단계 폴더 안에서** 실행합니다.

## 단계 한눈에 보기

| 단계 | 앱 | 새로 배우는 내용 | 내 PC 포트 |
|---|---|---|---|
| [01](#01-nginx-single-html) | Nginx + HTML 1개 | `FROM`, `COPY`, `CMD` 기본 구조 | 8087 |
| [02](#02-nginx-static-files) | Nginx + HTML, CSS, 이미지 | `WORKDIR`, 여러 파일/폴더 복사, `EXPOSE` | 8087 |
| [03](#03-node-basic) | Node.js (Express) | 의존성 캐싱, `RUN`, `ENV` | 3000 |
| [04](#04-node-healthcheck) | Node.js + 헬스체크 | `LABEL`, `HEALTHCHECK`, `.dockerignore` | 3000 |
| [05](#05-python-fastapi) | Python FastAPI | pip + `requirements.txt`, uvicorn | 8000 |
| [06](#06-java-multistage) | 순수 Java 웹 서버 | **멀티 스테이지 빌드** (JDK → JRE) | 8080 |
| [07](#07-react-vite) | React (Vite) | 프론트엔드 멀티 스테이지 (Node → Nginx) | 8090 |
| [08](#08-spring-boot) | Spring Boot | Maven 빌드, `ENTRYPOINT`, Actuator 헬스체크 | 8091 |
| [08-2](#08-2-springboot-mariadb) | Spring Boot + MariaDB | **컨테이너 2개 연결**, 볼륨, DB 자동 초기화 | 8092, 3306 |
| [09](#09-langchain-uv) | LangChain + FastAPI | **uv**, 비밀 값 분리 (`--env-file`) | 8001 |
| [10](#10-langchain-rag-uv) | PDF RAG (Gradio) | 배포용 코드 수정, 환경 변수로 설정 분리 | 7860 |

---

## 단계별 설명

### 01-nginx-single-html

[📁 폴더](./01-nginx-single-html)

HTML 파일 하나를 Nginx로 서비스합니다. Dockerfile의 가장 기본 구조인 **베이스 이미지 선택 → 파일 복사 → 실행 명령** 세 줄을 익힙니다.

- 파일: `Dockerfile`, `index.html`
- 핵심: Nginx를 `daemon off;`로 **포그라운드** 실행해야 컨테이너가 유지되는 이유

```bash
docker build -t my-simple-website .
docker run -d -p 8087:80 --name my-web my-simple-website
```

### 02-nginx-static-files

[📁 폴더](./02-nginx-static-files)

HTML, CSS, 이미지 폴더처럼 **여러 파일**을 함께 서비스합니다.

- 파일: `Dockerfile`, `index.html`, `style.css`, `images/`
- 핵심: `WORKDIR`로 기준 폴더를 정하고 `.`으로 복사하기, `EXPOSE`는 문서화일 뿐 실제로 포트를 열지 않는다는 점

### 03-node-basic

[📁 폴더](./03-node-basic)

Express로 만든 Node.js 웹 서버입니다. 처음으로 이미지 안에서 **패키지를 설치**합니다.

- 파일: `Dockerfile`, `app.js`, `package.json`
- 핵심: `package.json`을 먼저 복사하고 `npm install`한 뒤 소스를 복사하는 **의존성 캐싱 패턴**, `ENV`로 환경 변수 설정

### 04-node-healthcheck

[📁 폴더](./04-node-healthcheck) · [📄 README](./04-node-healthcheck/README.md)

03단계에 **헬스체크**를 추가해, Docker가 앱이 실제로 응답하는지 주기적으로 확인하게 합니다.

- 파일: `Dockerfile`, `app.js`, `healthcheck.js`, `package.json`, `.dockerignore`
- 핵심: `Up`과 `healthy`의 차이, 헬스체크 출력은 `docker logs`가 아니라 `docker inspect`로 확인, `.dockerignore`로 `node_modules` 제외

### 05-python-fastapi

[📁 폴더](./05-python-fastapi)

Python FastAPI 앱을 pip로 설치하고 uvicorn으로 실행합니다.

- 파일: `Dockerfile`, `requirements.txt`, `app/main.py`
- 핵심: `--host 0.0.0.0`으로 실행해야 컨테이너 밖에서 접속 가능 (`127.0.0.1`이면 접속 불가)

### 06-java-multistage

[📁 폴더](./06-java-multistage)

외부 라이브러리 없이 JDK 내장 기능만으로 만든 Java 웹 서버입니다. 처음으로 **멀티 스테이지 빌드**를 사용합니다.

- 파일: `Dockerfile`, `Main.java`
- 핵심: JDK로 컴파일하고 결과물(`.class`)만 가벼운 JRE 이미지로 옮겨 최종 이미지 크기 줄이기

### 07-react-vite

[📁 폴더](./07-react-vite)

Vite로 만든 React 앱을 빌드해 Nginx로 서비스합니다. 06단계의 멀티 스테이지를 **프론트엔드**에 적용합니다.

- 파일: `Dockerfile`, `nginx.conf`, `package.json`, `vite.config.js`, `index.html`, `src/`, `.dockerignore`
- 핵심: Node로 빌드 → 정적 파일만 Nginx로, SPA 새로고침 404를 막는 `try_files` 설정, 빌드 단계에서는 `--omit=dev`를 쓰면 안 되는 이유

### 08-spring-boot

[📁 폴더](./08-spring-boot) · [📄 README](./08-spring-boot/README.md)

Spring Boot 앱을 Maven으로 빌드해 JRE로 실행합니다.

- 파일: `Dockerfile`, `pom.xml`, `src/main/java/...`, `src/main/resources/application.properties`, `.dockerignore`
- 핵심: `mvn dependency:go-offline`으로 의존성 캐싱, `CMD` 대신 `ENTRYPOINT`를 써서 실행 옵션 덧붙이기, Actuator `/actuator/health`로 헬스체크

### 08-2-springboot-mariadb

[📁 폴더](./08-2-springboot-mariadb) · [📄 README](./08-2-springboot-mariadb/README.md)

08단계 앱에 MariaDB를 붙인 메모 API입니다. 처음으로 **앱 컨테이너와 DB 컨테이너를 함께** 실행합니다.
Dockerfile보다 `docker run` 옵션이 핵심이라 별도 번호 대신 08단계의 확장편으로 두었습니다.

- 파일: `Dockerfile`, `pom.xml`, `src/`, `db/init/01-revoke-drop.sql`, `.env.example`, `.dockerignore`
- 핵심:
  - 컨테이너 안의 `localhost`는 자기 자신이라 DB에 닿지 않음 → `docker network`로 연결하고 **컨테이너 이름**으로 접속
  - 볼륨(`-v`)으로 컨테이너를 지워도 DB 데이터 유지
  - 환경 변수로 DB와 계정 자동 생성, 초기화 SQL로 DROP 권한 회수 (볼륨이 비어 있을 때 한 번만)

```bash
docker network create boot-net
# MariaDB → 앱 순서로 실행 (자세한 옵션은 실행방법.txt)
```

### 09-langchain-uv

[📁 폴더](./09-langchain-uv) · [📄 README](./09-langchain-uv/README.md)

LangChain으로 Groq 모델을 호출하는 FastAPI 서버입니다. 의존성을 **uv**로 관리합니다.

- 파일: `Dockerfile`, `pyproject.toml`, `uv.lock`, `010_FastAPI_Basic.py`, `010_FastAPI_stream_test.html`, `.env.example`, `.dockerignore`
- 핵심: `uv sync --locked`로 정확한 버전 설치, **API 키를 이미지에 넣지 않고** `docker run --env-file .env`로 전달, slim 이미지에서 Python으로 헬스체크

### 10-langchain-rag-uv

[📁 폴더](./10-langchain-rag-uv) · [📄 README](./10-langchain-rag-uv/README.md)

PDF를 업로드하면 문서 내용을 근거로 답변하는 RAG Gradio 앱입니다 (FAISS + Upstage Solar).

- 파일: `Dockerfile`, `pyproject.toml`, `uv.lock`, `04main_rag_faiss_gradio_upstage.py`, `.env.example`, `.dockerignore`
- 핵심:
  - 접속 주소와 포트가 코드에 고정된 앱을 **환경 변수로 바꿔** 로컬과 Docker 양쪽에서 동작하게 수정
  - `PYTHONUNBUFFERED=1`로 `print()` 로그를 `docker logs`에 바로 표시
  - 버전 호환 문제: Python 3.14 제외, Gradio 6.9 미만 (gradio-pdf 호환)

---

## 처음 시작할 때

1. [Docker Desktop](https://www.docker.com/products/docker-desktop/)을 설치하고 실행합니다.
2. 01단계 폴더로 이동해 `실행방법.txt`의 명령을 순서대로 실행합니다.
3. 막히면 [docker 명령어 정리의 문제 해결](./docs/docker-commands.md#문제-해결-빠른-참고)을 먼저 확인합니다.

08-2, 09, 10단계는 `.env.example`을 `.env`로 복사해 비밀번호나 API 키를 넣어야 실행됩니다.
09, 10단계는 PC에 [uv](https://docs.astral.sh/uv/)가 설치되어 있어야 `uv.lock`을 만들 수 있습니다.

## 주의

- `.env`에는 비밀번호와 API 키가 들어가므로 **Git에 올리지 않습니다.** 루트 `.gitignore`에서 제외되어 있습니다.
- `uv.lock`, `.env.example`, `.python-version`은 다른 사람이 같은 환경으로 실행할 수 있도록 **올립니다.**
