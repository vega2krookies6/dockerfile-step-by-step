# React 메모 클라이언트 이미지 (멀티 스테이지 빌드)
# - 1단계: Node 로 npm run build → dist 폴더 생성
# - 2단계: nginx 가 dist 를 제공하고 /api 는 Spring Boot 로 전달
# 실행 예: docker build -t boot-flyway-web . && docker run -p 3000:80 boot-flyway-web

# 1단계: 빌드용 이미지
FROM node:22-alpine AS build
WORKDIR /app

# package.json 먼저 복사 후 설치 (의존성 캐싱)
COPY package.json package-lock.json ./
RUN npm ci

# 소스 복사 후 빌드 → /app/dist
COPY . .
RUN npm run build

# 2단계: 실행용 이미지
FROM nginx:1.27-alpine

# 설정 템플릿 (컨테이너 시작 시 ${BACKEND_URL} 치환 → /etc/nginx/conf.d/default.conf)
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

# 빌드 결과물
COPY --from=build /app/dist /usr/share/nginx/html

# Spring Boot 주소 기본값 (compose 의 서비스 이름 app, 포트 8080)
ENV BACKEND_URL=http://app:8080

EXPOSE 80
