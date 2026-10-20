# Java 앱을 컴파일하고 실행하는 이미지 (멀티 스테이지 빌드)
# 빌드: docker build -t java-app .
# 실행: docker run -d -p 8080:8080 java-app → http://localhost:8080 접속

# 1단계: 빌드용 이미지 (JDK 17)
# - JDK에는 컴파일러(javac)가 포함되어 있어 소스 코드를 .class 파일로 변환 가능
# - AS build: 이 단계에 이름을 붙여 아래 단계에서 결과물을 가져올 수 있게 함
FROM eclipse-temurin:17-jdk-alpine AS build

# 빌드 작업 폴더
# - 이후 COPY, RUN이 /src 기준으로 실행됨
WORKDIR /src

# 소스 코드 복사 후 컴파일
# - javac가 Main.java를 컴파일해 Main.class 생성
COPY Main.java .
RUN javac Main.java

# 2단계: 실행용 이미지 (JRE 17)
# - JRE는 실행만 가능한 런타임이라 JDK보다 용량이 훨씬 작음
# - 1단계의 JDK와 소스 코드는 최종 이미지에 포함되지 않음
FROM eclipse-temurin:17-jre-alpine

# 실행 작업 폴더
WORKDIR /app

# 컴파일 결과만 가져오기
# - --from=build: 1단계에서 만든 .class 파일만 복사
COPY --from=build /src/*.class ./

# 환경 변수 설정
# - Main.java에서 System.getenv("PORT")로 읽어 사용
ENV PORT=8080

# 포트 열기
# - 실제로 열지는 않고 8080 포트를 쓴다는 문서화 용도
# - 실제 접속은 docker run의 -p 옵션으로 연결해야 함
EXPOSE 8080

# 앱 실행
# - Main 클래스를 Java로 실행 (.class 확장자는 붙이지 않음)
# - 배열 형식으로 써야 docker stop 신호가 Java 프로세스에 바로 전달됨
CMD ["java", "Main"]