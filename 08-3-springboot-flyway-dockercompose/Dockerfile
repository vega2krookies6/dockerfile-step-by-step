# Spring Boot + Flyway + MariaDB 앱 이미지 (멀티 스테이지 빌드)
# - 08-2와 같은 구조, 직접 docker build 하지 않고 compose.yaml의 build: . 으로 빌드됨
# - Flyway 마이그레이션 SQL(src/main/resources/db/migration)은 JAR 안에 함께 들어감
# 실행: docker compose up -d --build   (실행방법.txt 참고)

# 1단계: 빌드용 이미지 (Maven + JDK 17)
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

# pom.xml 먼저 복사 후 의존성 다운로드 (캐싱 최적화)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# 소스 복사 후 JAR 빌드
# - 결과물: /app/target/app.jar (pom.xml의 finalName)
# - -DskipTests: 빌드 중에는 DB가 없으므로 테스트 생략
COPY src ./src
RUN mvn package -DskipTests -B

# 2단계: 실행용 이미지 (JRE 17)
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY --from=build /app/target/app.jar app.jar

# DB 접속 기본값 (compose.yaml의 environment가 있으면 그 값이 우선)
# - DB_HOST: Compose 서비스 이름 mariadb
# - 비밀번호는 여기에 쓰지 않음
ENV DB_HOST=mariadb \
    DB_PORT=3306

EXPOSE 8080

# 건강 상태 검사 (DB 연결 상태 포함)
# - --start-period=60s: Spring Boot 시작 + Flyway 마이그레이션 시간 동안 실패 무시
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
