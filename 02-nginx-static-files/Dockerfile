# 여러 정적 파일(HTML, CSS, 이미지)을 Nginx로 서비스하는 이미지
# 빌드: docker build -t my-web .
# 실행: docker run -d -p 8080:80 my-web → http://localhost:8080 접속

# 베이스 이미지 선택
# - Alpine 리눅스 기반이라 용량이 작고 빌드가 빠름
# - 운영 환경에서는 nginx:1.27-alpine처럼 버전 고정 권장
FROM nginx:alpine

# 작업 디렉토리 설정 (선택사항)
# - 이후 명령의 기준 경로가 되어 아래 COPY에서 .만 써도 됨
# - Nginx 기본 문서 폴더라 파일이 바로 웹에 노출됨
WORKDIR /usr/share/nginx/html

# 여러 파일 복사
# - .은 위에서 지정한 작업 디렉토리를 의미
# - images/는 폴더 안의 내용이 ./images/ 아래로 복사됨
# - HTML에서 경로를 style.css, images/파일명 형태로 참조해야 정상 표시됨
COPY index.html .
COPY style.css .
COPY images/ ./images/

# 포트 알리기 (실제로 열지는 않지만 문서화)
# - 컨테이너가 80 포트를 쓴다는 정보 제공용
# - 실제 접속은 docker run의 -p 옵션으로 연결해야 함
EXPOSE 80

# 웹서버 시작하기
# - "daemon off;"로 포그라운드 실행 (메인 프로세스가 끝나면 컨테이너도 종료되기 때문)
# - 배열 형식으로 써야 docker stop 신호가 Nginx에 바로 전달됨
CMD ["nginx", "-g", "daemon off;"]