# Node.js 앱을 실행하는 이미지 (메타정보, 헬스체크 포함)
# 빌드: docker build -t my-node-app .
# 실행: docker run -d -p 3000:3000 my-node-app → http://localhost:3000 접속

# 단계 1: 베이스 이미지 선택
# - Alpine 리눅스 기반이라 용량이 작음
# - Node 22는 LTS 버전으로 2027년 4월까지 보안 업데이트 지원
FROM node:22-alpine

# 단계 2: 메타정보 추가
# - 이미지에 관리자, 버전 같은 정보를 기록 (동작에는 영향 없음)
# - docker inspect 명령으로 확인 가능
LABEL maintainer="dev@example.com"
LABEL version="1.0"

# 단계 3: 환경 변수 설정
# - NODE_ENV=production: 라이브러리들이 운영 모드로 동작 (성능 최적화, 디버그 출력 감소)
# - PORT: 앱 코드에서 process.env.PORT로 읽어 사용
ENV NODE_ENV=production
ENV PORT=3000

# 단계 4: 작업 디렉토리 설정
# - 이후 COPY, RUN, CMD가 모두 /app 기준으로 실행됨
# - 폴더가 없으면 자동 생성
WORKDIR /app

# 단계 5: 의존성 파일 복사 (캐싱 최적화)
# - package*.json은 package.json과 package-lock.json을 함께 복사
# - 의존성이 그대로면 아래 설치 단계를 캐시로 건너뛰어 빌드가 빨라짐
COPY package*.json ./

# 단계 6: 의존성 설치
# - --omit=dev: devDependencies(테스트, 빌드 도구 등)를 제외하고 설치해 용량 절감
# - Node 22에 포함된 npm에서는 기존 --production 대신 이 옵션을 권장
RUN npm install --omit=dev

# 단계 7: 애플리케이션 소스 복사
# - 현재 폴더의 모든 파일을 /app으로 복사
# - .dockerignore에 node_modules를 넣어야 위에서 설치한 패키지를 덮어쓰지 않음
COPY . .

# 단계 8: 포트 노출
# - 실제로 열지는 않고 3000 포트를 쓴다는 문서화 용도
# - 실제 접속은 docker run의 -p 옵션으로 연결해야 함
EXPOSE 3000

# 단계 9: 건강 상태 검사 추가
# - 30초마다 healthcheck.js를 실행해 앱이 정상인지 확인, 3초 안에 응답 없으면 실패
# - 스크립트가 종료 코드 0이면 healthy, 1이면 unhealthy (docker ps에서 상태 확인)
# - 프로젝트에 healthcheck.js 파일이 반드시 있어야 함
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node healthcheck.js

# 단계 10: 실행 명령
# - 컨테이너 시작 시 app.js를 Node로 실행
# - 배열 형식으로 써야 docker stop 신호가 Node 프로세스에 바로 전달됨
CMD ["node", "app.js"]