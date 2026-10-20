# uv로 의존성을 관리하는 LangChain + FastAPI 스트리밍 서버 이미지
# 사전 준비: uv lock (uv.lock 파일 생성)
# 빌드: docker build -t langchain-uv-app .
# 실행: docker run -d -p 8001:8000 --env-file .env langchain-uv-app

# 베이스 이미지 선택
# - Debian slim 기반 Python 3.12 (Alpine보다 Python 패키지 호환성이 좋음)
FROM python:3.12-slim

# uv 설치
# - 공식 uv 이미지에서 실행 파일만 복사
# - 운영 환경에서는 :latest 대신 특정 버전 태그로 고정 권장
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# uv 동작 설정
# - UV_COMPILE_BYTECODE=1: 설치 시 .pyc로 미리 컴파일해 앱 시작 속도 향상
# - UV_LINK_MODE=copy: 컨테이너 환경에서 링크 경고 없이 파일 복사로 설치
# - UV_PYTHON_DOWNLOADS=0: 별도 Python을 내려받지 않고 이미지의 Python 3.12 사용
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=0

# 작업 디렉토리 설정
WORKDIR /app

# 의존성 파일 먼저 복사 (캐싱 최적화)
# - 세 파일이 그대로면 아래 설치 단계를 캐시로 건너뜀
COPY pyproject.toml uv.lock .python-version ./

# 의존성 설치
# - /app/.venv 가상 환경에 uv.lock에 적힌 버전 그대로 설치
# - --locked: uv.lock이 pyproject.toml과 맞지 않으면 빌드 실패 (버전 불일치 방지)
# - --no-dev: 개발용 패키지 제외
RUN uv sync --locked --no-dev

# 앱 소스 복사
# - HTML 파일이 없으면 / 경로에서 404 발생
COPY 010_FastAPI_Basic.py 010_FastAPI_stream_test.html ./

# 가상 환경을 기본 경로로 등록 (uvicorn, python이 .venv 안의 것으로 실행됨)
ENV PATH="/app/.venv/bin:$PATH"

# 포트 열기 (문서화 용도)
EXPOSE 8000

# 건강 상태 검사
# - slim 이미지에는 wget, curl이 없으므로 Python 기본 모듈로 /health 호출
# - 응답이 없거나 오류면 예외가 발생해 종료 코드 1 → 실패로 판정
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=2)"

# 앱 실행
# - 코드의 HOST(127.0.0.1) 대신 --host 0.0.0.0으로 실행해 컨테이너 밖에서 접속 가능
# - 파일 이름이 숫자로 시작해도 uvicorn은 모듈로 불러올 수 있음
# - GROQ_API_KEY는 여기 없음, docker run의 --env-file로 전달
CMD ["uvicorn", "010_FastAPI_Basic:app", "--host", "0.0.0.0", "--port", "8000"]