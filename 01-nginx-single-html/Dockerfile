# 정적 HTML 페이지를 Nginx로 서비스하는 이미지
# 빌드: docker build -t my-web .
# 실행: docker run -d -p 8080:80 my-web → http://localhost:8080 접속

# 1단계: 베이스 이미지 선택
# - Alpine 리눅스는 용량이 작고 빌드가 빠름
# - 운영 환경에서는 nginx:1.27-alpine 처럼 버전 고정 권장
FROM nginx:alpine

# 2단계: HTML 파일 복사하기
# - /usr/share/nginx/html/은 Nginx가 웹 페이지를 찾는 기본 경로
# - nginx의 기본 환영 페이지를 나의 index.html로 덮어씀
COPY index.html /usr/share/nginx/html/

# 3단계: 웹서버 시작하기
# - "daemon off;"로 포그라운드 실행 (메인 프로세스가 끝나면 컨테이너도 종료되기 때문)
# - 배열 형식으로 써야 docker stop 신호가 Nginx에 바로 전달됨
CMD ["nginx", "-g", "daemon off;"]