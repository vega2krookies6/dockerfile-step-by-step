# FastAPI(uvicorn) 앱을 실행하는 이미지
# 빌드: docker build -t my-python-app .
# 실행: docker run -d -p 8000:8000 my-python-app → http://localhost:8000 접속

# Python 기본 이미지 사용
# - Python 3.12가 설치된 공식 이미지 (Debian 기반이라 용량이 큰 편 1.14GB)
# - 용량을 줄이려면 python:3.12-slim (148MB 사용 권장)
FROM python:3.12-slim

# 작업 디렉토리 설정
# - 이후 COPY, RUN, CMD가 모두 /app 기준으로 실행됨
# - 폴더가 없으면 자동 생성
WORKDIR /app

# 필요한 파일 복사
# - requirements.txt: 설치할 패키지 목록
# - app/ 폴더 전체를 /app/app/으로 복사 (main.py가 이 안에 있어야 함)
# - 소스가 바뀔 때마다 아래 pip 설치가 다시 실행되므로,
#   COPY app/ 줄을 RUN pip install 아래로 옮기면 캐시를 활용해 빌드가 빨라짐
COPY requirements.txt .
COPY app/ ./app/

# 패키지 설치
# - requirements.txt에 적힌 패키지를 설치 (uvicorn, fastapi 등이 포함되어야 함)
# - --no-cache-dir 옵션을 추가하면 다운로드 캐시를 남기지 않아 이미지 용량 절감
RUN pip install -r requirements.txt

# 포트 열기
# - 실제로 열지는 않고 8000 포트를 쓴다는 문서화 용도
# - 실제 접속은 docker run의 -p 옵션으로 연결해야 함
EXPOSE 8000

# 앱 실행
# - app.main:app → app 폴더의 main.py 안에 있는 app 객체를 실행
# - --host 0.0.0.0: 컨테이너 밖에서 접속 가능하도록 설정 (127.0.0.1이면 외부 접속 불가)
# - --port 8000: EXPOSE, -p 옵션과 같은 포트로 맞춰야 함
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]