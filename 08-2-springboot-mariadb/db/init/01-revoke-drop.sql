-- MariaDB 컨테이너가 "처음" 시작될 때 자동으로 실행되는 SQL
-- - /docker-entrypoint-initdb.d 폴더에 연결하면 실행됨 (실행방법.txt의 -v 옵션)
-- - mariadb-data 볼륨이 비어 있을 때(최초 초기화)만 실행되고, 이후 재시작 때는 실행되지 않음
-- - 실행 순서: 환경 변수로 DB(boot_db)와 계정(boot) 생성 → 이 파일 실행
--
-- 목적: boot 계정에서 DROP 권한만 회수
-- - MARIADB_USER로 만든 계정은 boot_db에 대한 ALL PRIVILEGES를 자동으로 받음
-- - 앱 계정이 실수로 테이블이나 DB를 지우지 못하도록 DROP만 뺌
-- - TRUNCATE도 DROP 권한이 필요하므로 함께 막힘
-- - DELETE(행 삭제), ALTER(컬럼 변경)는 그대로 가능

REVOKE DROP ON boot_db.* FROM 'boot'@'%';
