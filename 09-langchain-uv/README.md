# 09-langchain-uv

LangChain으로 Groq 모델을 호출하는 FastAPI 서버를 **uv**로 의존성을 관리해 컨테이너로 만드는 예제입니다.
API 키 같은 **비밀 값을 이미지에 넣지 않고 실행 시점에 `.env`로 전달**하는 방법이 핵심입니다.

## 이 예제의 목적

| 주제 | 내용 |
|---|---|
| uv 의존성 관리 | `requirements.txt` 대신 `pyproject.toml` + `uv.lock`으로 정확한 버전 고정 |
| 비밀 값 분리 | `GROQ_API_KEY`를 이미지에 넣지 않고 `docker run --env-file`로 전달 |
| LLM API 서빙 | LangChain 체인을 FastAPI로 직접 서빙 (일반 응답 + SSE 스트리밍) |
| 헬스체크 | slim 이미지에서 curl 없이 Python으로 상태 검사 |

### 이전 단계(05-python-fastapi)와 달라진 점

| 항목 | 05-python-fastapi | 09-langchain-uv |
|---|---|---|
| 패키지 관리 | `pip` + `requirements.txt` | `uv` + `pyproject.toml` + `uv.lock` |
| 베이스 이미지 | `python:3.12` | `python:3.12-slim` |
| 외부 API 호출 | 없음 | Groq API (LLM) |
| 비밀 값 | 없음 | `.env` → `--env-file` |
| 응답 방식 | 일반 JSON | 일반 JSON + SSE 스트리밍 |
| 헬스체크 | 없음 | HEALTHCHECK 적용 |

## 파일 구성

```
09-langchain-uv/
├── Dockerfile                    # 이미지 빌드 설정
├── .dockerignore                 # 이미지에서 제외할 파일 (.env, .venv 등)
├── .env                          # 실제 API 키 (Git, 이미지에 포함 금지)
├── .env.example                  # 키 형식 안내용 (공유 가능)
├── .python-version               # 사용할 Python 버전 (3.12)
├── pyproject.toml                # 프로젝트 정보와 의존성 정의
├── uv.lock                       # uv sync로 생성, 정확한 버전 고정
├── 010_FastAPI_Basic.py          # FastAPI 서버 (LangChain 체인)
├── 010_FastAPI_stream_test.html  # 브라우저용 스트리밍 테스트 페이지
├── 실행방법.txt                  # 빌드, 실행, 테스트 명령 모음
└── README.md
```

## pyproject.toml

코드에서 직접 import하는 외부 라이브러리만 포함했습니다.

| 코드의 import | 패키지 | 용도 |
|---|---|---|
| `import uvicorn` | `uvicorn` | FastAPI 실행 서버 |
| `from dotenv import load_dotenv` | `python-dotenv` | 로컬 실행 시 `.env` 로드 |
| `from fastapi import ...` | `fastapi` | 웹 API, 스트리밍 응답, 파일 응답 |
| `from langchain_core.prompts import PromptTemplate` | `langchain-core` | 프롬프트, 체인 연결 |
| `from langchain_openai import ChatOpenAI` | `langchain-openai` | OpenAI 호환 API로 Groq 호출 |
| `from pydantic import BaseModel, Field` | `pydantic` | 요청/응답 스키마 |
| `json`, `os`, `pathlib` | (기본 모듈) | 설치 불필요 |

> 컨테이너에는 실행에 필요한 패키지만 넣는 것이 원칙입니다.

`[tool.uv]`의 `package = false`는 배포용 라이브러리가 아닌 실행용 앱이라는 뜻으로, `uv sync` 시 의존성만 설치합니다.

## 010_FastAPI_Basic.py

### API 경로

| 메서드 | 경로 | 동작 |
|---|---|---|
| `GET` | `/` | 스트리밍 테스트 페이지(HTML) 반환 |
| `POST` | `/chat` | 질문을 받아 전체 답변을 JSON으로 반환 |
| `POST` | `/chat/stream` | 답변을 SSE로 토큰 단위 스트리밍 |
| `GET` | `/health` | `{"status": "healthy"}` 반환 (헬스체크용) |
| `GET` | `/docs` | FastAPI 자동 API 문서 (Swagger UI) |

### LLM 설정

`ChatOpenAI`에 `base_url`을 Groq 주소로 지정해, OpenAI 호환 API로 Groq 모델(`openai/gpt-oss-120b`)을 호출합니다.

```python
llm = ChatOpenAI(
    api_key=api_key,
    base_url="https://api.groq.com/openai/v1",
    model="openai/gpt-oss-120b",
    temperature=0,
)
```

> Groq는 모델을 자주 교체합니다. 모델 관련 오류가 나면 [Groq 모델 목록](https://console.groq.com/docs/models)에서 현재 이름을 확인하세요.

### 코드를 수정하지 않고 Docker에서 쓸 수 있는 이유

| 원본 코드 | Docker에서의 처리 |
|---|---|
| `HOST = "127.0.0.1"` | `python 파일.py`로 실행할 때만 쓰임. Dockerfile에서는 `uvicorn --host 0.0.0.0`으로 실행하므로 영향 없음 |
| `load_dotenv()` | 컨테이너에는 `.env` 파일이 없어 아무 일도 안 함. 키는 `--env-file`로 들어온 환경 변수를 `os.getenv`가 읽음 |
| 키가 없으면 `RuntimeError` | 서버가 바로 종료(`Exited (1)`)되고 `docker logs`에 원인이 출력됨 |
| HTML 파일 경로 | `Path(__file__).parent` 기준이라, 같은 폴더(`/app`)에 복사하면 그대로 동작 |

## 비밀 값(API 키) 다루기

```
.env (내 PC에만 존재)
  │
  ├─ docker build ──✕── .dockerignore로 제외 → 이미지에 키 없음
  │
  └─ docker run --env-file .env ──→ 컨테이너 환경 변수 GROQ_API_KEY
                                          │
                                          └─ os.getenv("GROQ_API_KEY")
```

| 하지 말아야 할 것 | 이유 |
|---|---|
| Dockerfile에 `ENV GROQ_API_KEY=...` | 이미지를 받은 누구나 `docker inspect`, `docker history`로 볼 수 있음 |
| `.env`를 이미지에 `COPY` | 이미지 안에 파일로 남음 |
| `.env`를 Git에 커밋 | 저장소를 본 누구나 키를 볼 수 있음 |

- `.env`는 `.dockerignore`와 `.gitignore` 양쪽에 넣고, 형식 안내는 `.env.example`로 공유합니다.
- `.env`에는 따옴표나 공백 없이 `GROQ_API_KEY=gsk_...` 형태로 적습니다. `--env-file`은 따옴표까지 값으로 인식합니다.
- `--env-file`로 넣은 값도 **실행 중인 컨테이너의** `docker inspect` 결과(`Config.Env`)에는 보입니다. 내 PC 연습용으로는 괜찮지만, 공유 서버에서는 Docker Secrets 같은 별도 방식을 사용합니다.

## Dockerfile 핵심 부분

### uv 설치와 설정

```dockerfile
FROM python:3.12-slim

# 공식 uv 이미지에서 실행 파일만 복사
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=0
```

| 설정 | 의미 |
|---|---|
| `COPY --from=ghcr.io/astral-sh/uv:latest` | 다른 이미지에서 파일만 가져오기 (멀티 스테이지 문법 응용) |
| `UV_COMPILE_BYTECODE=1` | 설치 시 `.pyc`로 미리 컴파일해 시작 속도 향상 |
| `UV_LINK_MODE=copy` | 컨테이너 환경에서 링크 경고 없이 파일 복사로 설치 |
| `UV_PYTHON_DOWNLOADS=0` | 별도 Python을 내려받지 않고 이미지의 Python 3.12 사용 |

### 의존성 캐시

```dockerfile
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --locked --no-dev

COPY 010_FastAPI_Basic.py 010_FastAPI_stream_test.html ./
```

| 수정한 파일 | 의존성 설치 단계 |
|---|---|
| `.py`, `.html`만 수정 | 캐시 사용 (건너뜀) |
| `pyproject.toml`, `uv.lock` 수정 | 다시 실행 |

| 옵션 | 의미 |
|---|---|
| `--locked` | `uv.lock`이 `pyproject.toml`과 맞지 않으면 빌드 실패 (버전 불일치 방지) |
| `--no-dev` | 개발용 패키지 제외 |

### 가상 환경 경로 등록과 실행

```dockerfile
ENV PATH="/app/.venv/bin:$PATH"

CMD ["uvicorn", "010_FastAPI_Basic:app", "--host", "0.0.0.0", "--port", "8000"]
```

`uv sync`는 `/app/.venv`에 패키지를 설치하므로, PATH에 등록해야 `uvicorn` 명령을 찾을 수 있습니다.
파일 이름이 숫자로 시작해도 uvicorn은 모듈로 불러올 수 있습니다.

### HEALTHCHECK

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=2)"
```

slim 이미지에는 `curl`, `wget`이 없어서 Python 기본 모듈로 `/health`를 호출합니다.
응답이 없거나 오류면 예외가 발생해 종료 코드 1이 되고, Docker가 실패로 판정합니다.
`/health`는 LLM을 호출하지 않으므로 헬스체크로 API 사용량이 발생하지 않습니다.

## 실행 방법

### 0. 사전 준비 (처음 한 번)

1. [Groq 콘솔](https://console.groq.com/keys)에서 API 키 발급
2. `.env.example`을 `.env`로 복사하고 `GROQ_API_KEY` 입력
3. 09 폴더에서 `uv sync` 실행

```bash
uv sync
```

| 생성되는 것 | 역할 | Docker에서 |
|---|---|---|
| `uv.lock` | 설치된 정확한 버전 기록 | **필요함** (`uv sync --locked`에 사용) |
| `.venv/` | 내 PC용 가상 환경 | 필요 없음 (`.dockerignore`로 제외) |

> `pyproject.toml`을 수정하면 다시 `uv sync`를 실행해 `uv.lock`을 갱신해야 합니다. 그대로 빌드하면 `--locked` 옵션 때문에 실패합니다.

### 1. 로컬에서 먼저 확인 (선택)

Docker 빌드 전에 코드 문제를 먼저 걸러낼 수 있습니다.

```bash
# uv run은 .venv를 자동으로 사용하므로 activate 불필요
uv run uvicorn 010_FastAPI_Basic:app --reload
```

- 접속 주소: http://127.0.0.1:8000
- 로컬에서는 `load_dotenv()`가 현재 폴더의 `.env`를 읽음
- 5단계 컨테이너가 8000 포트를 쓰고 있으면 `--port 8002`처럼 다른 포트 지정

### 2. 이미지 빌드

```bash
docker build -t langchain-uv-app .
```

### 3. 컨테이너 실행

```bash
# (재실행 시) 기존 컨테이너 정리
docker rm -f my-langchain

# --env-file .env: 키는 이 단계에서만 컨테이너에 전달됨
# -p 8001:8000: 5단계 FastAPI 예제의 8000과 겹치지 않도록 8001 사용
docker run -d -p 8001:8000 --env-file .env --name my-langchain langchain-uv-app
```

### 4. 상태 확인

```bash
docker ps                 # STATUS가 (healthy)가 되는지 확인
docker logs my-langchain  # 시작 로그, 오류 메시지 확인
```

## 테스트

> `/chat`, `/chat/stream`은 호출할 때마다 Groq API 사용량이 발생합니다.

### 브라우저

| 주소 | 내용 |
|---|---|
| http://localhost:8001/ | 스트리밍 테스트 페이지 (질문 입력 후 전송) |
| http://localhost:8001/docs | Swagger UI에서 `/chat` 테스트 |
| http://localhost:8001/health | `{"status":"healthy"}` |

`/chat/stream`은 SSE라서 Swagger UI에서는 토큰 단위로 보이지 않습니다. 테스트 페이지나 `curl -N`을 사용하세요.

### 터미널 (Git Bash)

```bash
# 전체 답변을 한 번에 받기
curl -X POST http://localhost:8001/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is LangChain?"}'

# 토큰 단위 스트리밍 (-N: 버퍼링 없이 바로 출력)
curl -N -X POST http://localhost:8001/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"question": "LangChain이 뭐야?"}'
```

### 터미널 (PowerShell)

PowerShell에서 `curl`은 다른 명령의 별칭일 수 있으므로 `curl.exe`로 실행합니다.
한글이 깨지면 먼저 `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8`을 실행하세요.

```powershell
curl.exe -X POST http://localhost:8001/chat -H "Content-Type: application/json" -d '{\"question\": \"What is LangChain?\"}'
```

### 스트리밍 응답 형식

```
data: {"token": "Lang"}

data: {"token": "Chain"}

data: {"token": "은"}

data: [DONE]
```

오류가 나면 스트리밍 도중 상태 코드를 바꿀 수 없으므로 `event: error`로 전달됩니다.

## 문제 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| 실행 직후 `Exited (1)` | `GROQ_API_KEY`가 전달되지 않음 | `docker logs`에서 RuntimeError 확인, `--env-file .env` 추가 |
| 빌드 시 lock 파일 오류 | `pyproject.toml` 수정 후 `uv.lock` 미갱신 | `uv sync` 다시 실행 후 빌드 |
| 빌드 시 `uv.lock` not found | 사전 준비 단계 누락 | 09 폴더에서 `uv sync` 실행 |
| `/` 접속 시 404 | HTML 파일이 이미지에 없음 | Dockerfile의 `COPY`에 HTML 파일 포함 여부 확인 |
| `/chat` 502 오류 | 키 오류, 모델 이름 변경, 사용량 초과 | 키 확인, Groq 모델 목록에서 모델 이름 확인 |
| 키를 넣었는데 인증 실패 | `.env` 값에 따옴표나 공백 포함 | `GROQ_API_KEY=gsk_...` 형태로 수정 |
| 이미지가 수 GB | 강의 전체용 `pyproject.toml` 사용 | 이 예제용으로 줄인 버전 사용 |
| 로컬 실행 시 포트 충돌 | 다른 컨테이너가 8000 사용 중 | `--port 8002` 지정 또는 컨테이너 중지 |

키가 컨테이너에 전달되었는지는 값을 출력하지 않고 확인할 수 있습니다.

```bash
# 설정되어 있으면 "set", 없으면 "missing" 출력
docker exec my-langchain python -c "import os; print('set' if os.getenv('GROQ_API_KEY') else 'missing')"
```

## 보안 참고

- 원본 코드는 로컬 전용(`127.0.0.1`)으로 작성되어 있지만, 컨테이너에서는 `0.0.0.0`으로 열립니다. 외부에 공개할 일이 있다면 인증을 먼저 추가하세요.
- 질문 길이는 `MAX_QUESTION_LENGTH`(2000자)로 제한되어 있어, 너무 긴 입력은 422 오류로 거부됩니다 (비용, 남용 방지).
- 운영 환경에서는 `ghcr.io/astral-sh/uv:latest` 대신 특정 버전 태그로 고정하는 것을 권장합니다.
