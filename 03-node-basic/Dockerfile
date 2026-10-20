# Node.js 앱을 실행하는 이미지
# 빌드: docker build -t my-node-app .
# 실행: docker run -d -p 3000:3000 my-node-app → http://localhost:3000 접속

# Node.js 런타임 사용
# - Alpine 리눅스 기반이라 용량이 작음
# - Node 22는 LTS 버전으로 2027년 4월까지 보안 업데이트 지원
FROM node:22-alpine

# 컨테이너 내부 작업 폴더
# - 이후 COPY, RUN, CMD가 모두 /app 기준으로 실행됨
# - 폴더가 없으면 자동 생성
WORKDIR /app

# 1. package.json 먼저 복사 (캐싱 활용)
# - 소스 코드만 바뀌고 의존성이 그대로면 아래 npm install 단계를 캐시로 건너뜀
# - package-lock.json도 있다면 COPY package*.json . 으로 함께 복사 권장
COPY package.json .

# 2. 필요한 패키지 설치
# - package.json에 적힌 의존성을 컨테이너 안에 설치
# - lock 파일을 쓴다면 npm ci가 더 빠르고 버전이 정확히 고정됨
RUN npm install

# 3. 나머지 파일들 복사
# - 현재 폴더의 모든 파일을 /app으로 복사
# - .dockerignore에 node_modules를 넣어야 위에서 설치한 패키지를 덮어쓰지 않음
COPY . .

# 4. 환경 변수 설정
# - NODE_ENV=production: 라이브러리들이 운영 모드로 동작 (성능 최적화, 디버그 출력 감소)
# - PORT: 앱 코드에서 process.env.PORT로 읽어 사용
ENV NODE_ENV=production
ENV PORT=3000

# 5. 포트 열기
# - 실제로 열지는 않고 3000 포트를 쓴다는 문서화 용도
# - 실제 접속은 docker run의 -p 옵션으로 연결해야 함
EXPOSE 3000

# 6. 앱 실행
# - 컨테이너 시작 시 app.js를 Node로 실행
# - 배열 형식으로 써야 docker stop 신호가 Node 프로세스에 바로 전달됨
CMD ["node", "app.js"]