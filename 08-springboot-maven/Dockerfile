# Spring Boot 앱을 Maven으로 빌드해 JRE로 실행하는 이미지 (멀티 스테이지 빌드)
# 빌드: docker build -t spring-boot-app .
# 실행: docker run -d -p 8091:8080 spring-boot-app → http://localhost:8091 접속

# 1단계: 빌드용 이미지 (Maven + JDK 17)
# - Maven과 JDK가 함께 설치된 공식 이미지라 PC에 Maven이 없어도 빌드 가능
# - AS build: 아래 단계에서 결과물을 가져올 수 있도록 이름 지정
FROM maven:3.9-eclipse-temurin-17 AS build

# 빌드 작업 폴더
WORKDIR /app

# pom.xml 먼저 복사 후 의존성 다운로드 (캐싱 최적화)
# - 소스만 바뀌고 pom.xml이 그대로면 다운로드 단계를 캐시로 건너뜀
# - -B: 배치 모드 (진행 표시 로그를 줄여 출력이 깔끔해짐)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# 소스 복사 후 JAR 빌드
# - 결과물은 /app/target/demo-0.0.1-SNAPSHOT.jar로 생성됨
# - -DskipTests: 테스트를 건너뛰어 빌드 시간 단축
COPY src ./src
RUN mvn package -DskipTests -B

# 2단계: 실행용 이미지 (JRE 17)
# - 실행만 하면 되므로 Maven과 JDK 없이 가벼운 JRE만 사용
FROM eclipse-temurin:17-jre-alpine

# 실행 작업 폴더
WORKDIR /app

# 빌드 결과만 가져오기
# - --from=build: 1단계의 JAR 파일을 app.jar라는 이름으로 복사
COPY --from=build /app/target/*.jar app.jar

# 포트 열기
# - 실제로 열지는 않고 8080 포트를 쓴다는 문서화 용도
EXPOSE 8080

# 건강 상태 검사 추가
# - 30초마다 /actuator/health를 호출해 응답이 없거나 실패하면 unhealthy
# - --start-period=30s: Spring Boot는 시작이 느리므로 처음 30초간 실패는 무시
# - wget은 Alpine 이미지에 기본 포함되어 있어 따로 설치할 필요 없음
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1

# 앱 실행
# - java -jar로 JAR 파일 실행 (내장 Tomcat이 함께 시작됨)
# - 배열 형식으로 써야 docker stop 신호가 Java 프로세스에 바로 전달됨
ENTRYPOINT ["java", "-jar", "app.jar"]