# Spring Boot + MariaDB 앱을 Maven으로 빌드해 JRE로 실행하는 이미지 (멀티 스테이지 빌드)
# - 08-spring-boot와 구조가 같고, DB 접속 정보만 실행 시 환경 변수로 받음
# - MariaDB는 이 이미지에 포함되지 않음 (공식 mariadb 이미지로 따로 실행)
# 빌드: docker build -t boot-mariadb-app .
# 실행: 실행방법.txt 참고 (docker network로 MariaDB 컨테이너와 연결)

# 1단계: 빌드용 이미지 (Maven + JDK 17)
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

# pom.xml 먼저 복사 후 의존성 다운로드 (캐싱 최적화)
# - 소스만 바뀌고 pom.xml이 그대로면 다운로드 단계를 캐시로 건너뜀
COPY pom.xml .
RUN mvn dependency:go-offline -B

# 소스 복사 후 JAR 빌드
# - pom.xml의 <finalName>app</finalName> 설정으로 결과물은 /app/target/app.jar
# - -DskipTests: 테스트를 건너뛰어 빌드 시간 단축 (빌드 중에는 DB가 없으므로 테스트 실행 불가)
COPY src ./src
RUN mvn package -DskipTests -B

# 2단계: 실행용 이미지 (JRE 17)
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# 빌드 결과만 가져오기
COPY --from=build /app/target/app.jar app.jar

# DB 접속 기본값
# - DB_HOST: 같은 Docker 네트워크에 있는 MariaDB 컨테이너 이름
#   (컨테이너 안에서 localhost는 "앱 컨테이너 자신"이므로 DB에 닿지 않음)
# - DB_PORT: 컨테이너끼리는 MariaDB 내부 포트 3306으로 바로 접속 (-p로 바꾼 포트와 무관)
# - 비밀번호는 여기에 쓰지 않음, docker run의 --env-file로 전달
ENV DB_HOST=mariadb \
    DB_PORT=3306

# 포트 열기 (문서화 용도)
EXPOSE 8080

# 건강 상태 검사
# - /actuator/health는 DB 연결 상태도 함께 검사하므로, DB가 끊기면 unhealthy가 됨
# - --start-period=60s: Spring Boot 시작 + DB 연결 준비 시간 동안 실패 무시
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1

# 앱 실행
# - ENTRYPOINT라서 docker run 뒤에 --server.port=9090 같은 옵션을 덧붙일 수 있음
ENTRYPOINT ["java", "-jar", "app.jar"]
