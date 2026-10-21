-- V1: memo 테이블 생성
--
-- [Flyway 파일 이름 규칙]
--   V{버전}__{설명}.sql
--   - V      : 버전 마이그레이션 (한 번만 실행)
--   - 1      : 버전 번호 (숫자 순서대로 실행, 1 → 2 → 3 ...)
--   - __     : 밑줄 2개 (1개면 인식하지 않음)
--   - 설명   : 밑줄은 공백으로 바뀌어 flyway_schema_history에 기록됨
--
-- [주의] 한 번 적용된 파일은 절대 수정하지 않음
--   - Flyway는 적용한 파일의 체크섬(checksum)을 기록해 두고 시작할 때마다 비교함
--   - 내용이 바뀌면 "Validate failed: Migration checksum mismatch"로 앱이 시작되지 않음
--   - 변경이 필요하면 새 버전 파일(V3__...sql)을 추가
--
-- [Entity와 맞춰야 하는 것] (ddl-auto=validate가 검사)
--   - 테이블 이름: Memo 클래스 → memo
--   - 컬럼 이름과 타입: id(Long) → BIGINT, content(String) → VARCHAR, createdAt(LocalDateTime) → DATETIME

CREATE TABLE memo (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    content    VARCHAR(500) NOT NULL,
    created_at DATETIME(6)  NOT NULL,
    PRIMARY KEY (id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;
