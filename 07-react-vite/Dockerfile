# Vite 기반 React 앱을 빌드해 Nginx로 서비스하는 이미지 (멀티 스테이지 빌드)
# 빌드: docker build -t react-vite-app .
# 실행: docker run -d -p 8090:80 react-vite-app → http://localhost:8090 접속

# 1단계: 빌드용 이미지 (Node 22)
# - Vite 8은 Node 20.19 이상 또는 22.12 이상이 필요
# - AS build: 아래 단계에서 결과물을 가져올 수 있도록 이름 지정
FROM node:22-alpine AS build

# 빌드 작업 폴더
WORKDIR /app

# 의존성 파일 먼저 복사 (캐싱 최적화)
# - 의존성이 그대로면 아래 설치 단계를 캐시로 건너뜀
COPY package*.json ./

# 의존성 설치
# - vite는 devDependencies라서 --omit=dev를 쓰면 빌드가 실패함
# - 빌드 도구는 1단계에만 있고 최종 이미지에는 포함되지 않으므로 그대로 설치
RUN npm install

# 소스 복사 후 빌드
# - npm run build → vite build 실행, 결과물이 /app/dist에 생성됨
# - dist에는 HTML, JS, CSS 같은 정적 파일만 들어 있음
COPY . .
RUN npm run build

# 2단계: 실행용 이미지 (Nginx)
# - 빌드된 정적 파일만 서비스하므로 Node가 필요 없음
# - 최종 이미지에는 node_modules와 소스 코드가 포함되지 않아 용량이 작음
FROM nginx:alpine

# Nginx 설정 교체
# - SPA 경로 처리를 위한 설정으로 기본 설정을 덮어씀
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 빌드 결과만 가져오기
# - --from=build: 1단계의 dist 폴더 내용을 Nginx 문서 폴더로 복사
COPY --from=build /app/dist /usr/share/nginx/html

# 포트 열기
# - 실제로 열지는 않고 80 포트를 쓴다는 문서화 용도
EXPOSE 80

# 웹서버 시작하기
# - "daemon off;"로 포그라운드 실행 (메인 프로세스가 끝나면 컨테이너도 종료되기 때문)
CMD ["nginx", "-g", "daemon off;"]