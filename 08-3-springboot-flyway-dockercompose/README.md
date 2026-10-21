# 08-3-springboot-flyway-dockercompose

08-2의 Spring Boot + MariaDB 앱을 두 가지 방향으로 발전시킨 예제입니다.

1. **Flyway**: 테이블을 JPA가 자동으로 만들지 않고, 버전이 붙은 SQL 파일로 관리
2. **Docker Compose**: `docker network create`, `docker run` 두 번, 실행 순서 맞추기를 `compose.yaml` 하나로 정리

## 이 예제의 목적

| 주제 | 내용 |
|---|---|
| DB 마이그레이션 | 테이블 구조 변경을 `V1__...sql`, `V2__...sql` 파일로 기록하고 순서대로 적용 |
| `ddl-auto=validate` | JPA는 테이블을 만들지 않고 Entity와 테이블이 맞는지 **검사만** |
| Docker Compose | 여러 컨테이너의 설정, 네트워크, 볼륨, 실행 순서를 파일 하나로 관리 |
| 비밀 값 범위 줄이기 | 앱 컨테이너에는 root 비밀번호를 전달하지 않음 |

### 08-2와 달라진 점

| 항목 | 08-2-springboot-mariadb | 08-3-springboot-flyway-dockercompose |
|---|---|---|
| 실행 방법 | `docker network create` + `docker run` × 2 | `docker compose up -d --build` |
| 실행 순서 | MariaDB가 healthy인지 **직접 확인** 후 앱 실행 | `depends_on: condition: service_healthy`로 **자동** |
| 테이블 생성 | JPA `ddl-auto=update` | **Flyway** `V1__create_memo_table.sql` |
| JPA 역할 | 테이블 생성 + 변경 | `ddl-auto=validate` (검사만) |
| 초기 데이터 | 없음 | Flyway `V2__insert_welcome_memo.sql` |
| 추가 의존성 | - | `spring-boot-starter-flyway`, `flyway-mysql` |
| init 폴더 마운트 | `${PWD}`, `$(pwd -W)`, `MSYS_NO_PATHCONV` 필요 | `./db/init` 상대 경로 그대로 (셸 차이 없음) |
| 앱에 전달되는 값 | `.env` 전체 (root 비밀번호 포함) | 필요한 값만 (`environment:` + `${...}` 치환) |
| 내 PC 포트 | 앱 8092, DB 3306 | 앱 **8093**, DB **3307** (08-2와 동시 실행 가능) |

## 파일 구성

```
08-3-springboot-flyway-dockercompose/
├── compose.yaml                          # [추가] MariaDB + 앱 실행 설정
├── Dockerfile                            # 08-2와 같은 구조
├── .dockerignore
├── .env                                  # 실제 비밀번호 (Git, 이미지에 포함 금지)
├── .env.example
├── pom.xml                               # Flyway 의존성 추가
├── db/init/
│   └── 01-revoke-drop.sql                # MariaDB 최초 시작 시 실행 (08-2와 같음)
├── src/main/
│   ├── java/com/example/demo/            # 08-2와 같음 (안내 문구만 변경)
│   │   ├── DemoApplication.java
│   │   ├── Memo.java
│   │   ├── MemoRepository.java
│   │   └── MemoController.java
│   └── resources/
│       ├── application.properties        # ddl-auto=validate, Flyway 설정
│       └── db/migration/                 # [추가] Flyway 마이그레이션
│           ├── V1__create_memo_table.sql
│           └── V2__insert_welcome_memo.sql
├── 실행방법.txt
└── README.md
```

> `db/init/`과 `db/migration/`은 이름이 비슷하지만 역할이 다릅니다.
>
> | 폴더 | 실행 주체 | 실행 시점 | 실행 계정 | 용도 |
> |---|---|---|---|---|
> | `db/init/` | MariaDB 컨테이너 | 볼륨이 비어 있을 때 **한 번** | root | 권한 설정 (DROP 회수) |
> | `src/main/resources/db/migration/` | Spring Boot 앱 (Flyway) | 앱이 시작될 때마다 **새 버전만** | boot | 테이블 구조, 초기 데이터 |

---

## 핵심 개념 1: Flyway

### 왜 필요한가

`ddl-auto=update`는 Entity를 보고 테이블을 알아서 바꿔 주지만 다음 문제가 있습니다.

| `ddl-auto=update`의 한계 | Flyway |
|---|---|
| 어떤 SQL이 실행됐는지 기록이 남지 않음 | 모든 변경이 SQL 파일로 남고 Git으로 관리됨 |
| 컬럼 이름 변경, 삭제, 데이터 이동은 못 함 | 원하는 SQL을 직접 작성 |
| 개발 PC와 운영 DB의 구조가 서로 달라지기 쉬움 | 어느 DB든 같은 파일을 같은 순서로 적용 |
| 초기 데이터를 넣을 방법이 없음 | `INSERT`도 마이그레이션으로 관리 |

### 동작 순서

```
앱 시작
  │
  ├─ 1. Flyway 실행
  │     ├─ flyway_schema_history 테이블이 없으면 생성
  │     ├─ 기록된 버전과 db/migration 폴더의 파일 비교
  │     ├─ 이미 적용된 파일의 체크섬이 바뀌었는지 검사 (바뀌었으면 시작 중단)
  │     └─ 아직 적용 안 된 버전만 순서대로 실행 (V1 → V2 → ...)
  │
  ├─ 2. JPA (ddl-auto=validate)
  │     └─ Memo Entity와 memo 테이블의 컬럼, 타입이 맞는지 검사 (안 맞으면 시작 중단)
  │
  └─ 3. 웹 서버 시작
```

Flyway가 JPA보다 **먼저** 실행되므로, JPA가 검사할 때는 테이블이 이미 준비되어 있습니다.

### 파일 이름 규칙

```
V1__create_memo_table.sql
│ │└────────────────┘ └─ 확장자
│ │      설명 (밑줄은 공백으로 기록됨)
│ └─ 밑줄 2개 (1개면 인식 안 됨)
└─ 버전 (숫자 순서대로 실행)
```

### flyway_schema_history

Flyway가 적용 기록을 남기는 테이블입니다.

```bash
docker compose exec mariadb mariadb -uboot -p boot_db -e "SELECT installed_rank, version, description, success FROM flyway_schema_history;"
```

```
installed_rank  version  description          success
1               1        create memo table    1
2               2        insert welcome memo  1
```

### 지켜야 할 규칙

| 규칙 | 어기면 |
|---|---|
| 적용된 파일은 **절대 수정하지 않음** | `Migration checksum mismatch`로 앱이 시작되지 않음 |
| 변경은 항상 **새 버전 파일**로 추가 (V3, V4, ...) | - |
| Entity를 바꾸면 같은 내용의 마이그레이션도 추가 | `ddl-auto=validate`가 `missing column` 오류로 시작 중단 |

### Flyway와 DROP 권한

boot 계정은 08-2와 마찬가지로 DROP 권한이 없습니다. Flyway의 일반 동작(`migrate`)에는 DROP이 필요 없으므로 문제없습니다.

| 작업 | 필요한 권한 | boot 계정 |
|---|---|---|
| `flyway_schema_history` 생성, 기록 | CREATE, INSERT, UPDATE, SELECT | 가능 |
| `CREATE TABLE`, `ALTER TABLE` 마이그레이션 | CREATE, ALTER | 가능 |
| `DROP TABLE`이 들어간 마이그레이션 | DROP | **불가** (root로 직접 실행) |
| `flyway clean` (모든 테이블 삭제) | DROP | **불가** (`clean-disabled=true`로도 막음) |

---

## 핵심 개념 2: Docker Compose

### docker run과 compose.yaml 비교

| 08-2의 docker run 옵션 | compose.yaml |
|---|---|
| `docker network create boot-net` + `--network boot-net` | 자동 (`boot-flyway_default` 네트워크) |
| `--name mariadb` | 서비스 이름 `mariadb:` (다른 서비스가 이 이름으로 접속) |
| `--env-file .env` | `env_file: .env` |
| `-e KEY=VALUE` | `environment:` |
| `-p 127.0.0.1:3307:3306` | `ports: ["127.0.0.1:3307:3306"]` |
| `-v boot-mariadb-data:/var/lib/mysql` | `volumes:` + 맨 아래 `volumes:` 선언 |
| `-v "${PWD}\db\init:..."` | `./db/init:...` (compose.yaml 기준 상대 경로) |
| `--health-cmd ...` | `healthcheck:` |
| `--restart unless-stopped` | `restart: unless-stopped` |
| 이미지 이름 뒤의 서버 옵션 | `command:` |
| `docker build -t boot-mariadb-app .` | `build: .` + `image: boot-flyway-app` |
| MariaDB가 healthy인지 직접 확인 | `depends_on: condition: service_healthy` |

### depends_on과 healthcheck

```yaml
depends_on:
  mariadb:
    condition: service_healthy
```

| 쓰는 방법 | 앱이 시작되는 시점 |
|---|---|
| `depends_on: [mariadb]` | MariaDB 컨테이너가 **시작되자마자** (DB 준비 전일 수 있음) |
| `condition: service_healthy` | MariaDB의 healthcheck가 **통과한 뒤** |

그래서 MariaDB 쪽에 `healthcheck:`가 반드시 있어야 합니다.

### env_file과 변수 치환

같은 `.env`를 두 가지 방법으로 씁니다.

```yaml
mariadb:
  env_file: .env                           # ① 파일 전체를 환경 변수로 전달

app:
  environment:
    MARIADB_PASSWORD: ${MARIADB_PASSWORD}  # ② .env 값을 이 자리에 치환
```

| 방법 | 동작 | 이 예제에서 |
|---|---|---|
| ① `env_file:` | 파일의 모든 값을 컨테이너에 전달 | MariaDB는 root 비밀번호까지 필요하므로 전체 전달 |
| ② `${변수}` | Compose가 같은 폴더의 `.env`를 읽어 값을 끼워 넣음 | 앱에는 필요한 값만 전달 |

08-2에서는 앱에도 `--env-file .env`를 써서 root 비밀번호가 앱 컨테이너에 들어갔지만, 여기서는 들어가지 않습니다.

```bash
# 치환된 최종 설정 확인 (app의 environment에 MARIADB_ROOT_PASSWORD가 없어야 함)
docker compose config
```

### 이름이 붙는 규칙

`compose.yaml` 맨 위의 `name: boot-flyway`가 모든 이름 앞에 붙습니다.

| 대상 | 이름 |
|---|---|
| 컨테이너 | `boot-flyway-mariadb-1`, `boot-flyway-app-1` |
| 네트워크 | `boot-flyway_default` |
| 볼륨 | `boot-flyway_mariadb-data` |
| 앱 이미지 | `boot-flyway-app` (`image:`로 지정) |

`docker compose` 명령에서는 컨테이너 이름이 아니라 **서비스 이름**(`mariadb`, `app`)을 씁니다.

```bash
docker compose logs app                  # = docker logs boot-flyway-app-1
docker compose exec mariadb mariadb ...  # = docker exec -it boot-flyway-mariadb-1 mariadb ...
```

### 자주 쓰는 명령

| 명령 | 하는 일 |
|---|---|
| `docker compose up -d --build` | 빌드 후 전체 실행 (코드를 고쳤을 때도 이 명령) |
| `docker compose up -d --build app` | 앱만 다시 빌드, 교체 |
| `docker compose ps` | 서비스 상태 |
| `docker compose logs -f app` | 앱 로그 실시간 보기 |
| `docker compose exec mariadb sh` | 컨테이너 안으로 들어가기 |
| `docker compose config` | `.env`가 치환된 최종 설정 확인 |
| `docker compose stop` / `start` | 멈춤 / 다시 시작 (컨테이너 유지) |
| `docker compose down` | 컨테이너, 네트워크 삭제 (**볼륨은 남음**) |
| `docker compose down -v` | 볼륨까지 삭제 (DB 데이터 삭제) |

---

## ddl-auto 값 비교

| 값 | 앱 시작 시 동작 | 필요한 권한 | 사용 단계 |
|---|---|---|---|
| `create` | 테이블을 지우고 새로 만듦 | DROP | - |
| `create-drop` | 시작할 때 만들고, 종료할 때 지움 | DROP | - |
| `update` | 없는 테이블, 컬럼만 추가 | CREATE, ALTER | 08-2 |
| `validate` | 아무것도 바꾸지 않고 **검사만** | SELECT (구조 조회) | **08-3** |
| `none` | 아무것도 하지 않음 | - | - |

`validate`는 Flyway와 함께 쓸 때 안전장치 역할을 합니다. 마이그레이션을 빠뜨리고 Entity만 바꾸면 운영 중에 오류가 나는 대신 **앱 시작 단계에서** 바로 알 수 있습니다.

---

## 실행 방법

자세한 명령과 설명은 `실행방법.txt`에 있습니다. Git Bash와 PowerShell 명령이 같습니다.

```bash
# 0. .env 준비
cp .env.example .env          # 복사 후 비밀번호 입력

# 1. 빌드 + 실행 (MariaDB healthy → 앱 순서로 자동 시작)
docker compose up -d --build

# 2. 상태와 Flyway 로그 확인
docker compose ps
docker compose logs -f app
```

처음 실행하면 앱 로그에 다음이 보입니다.

```
Migrating schema `boot_db` to version "1 - create memo table"
Migrating schema `boot_db` to version "2 - insert welcome memo"
Successfully applied 2 migrations to schema `boot_db`, now at version v2
```

두 번째 실행부터는 `Schema `boot_db` is up to date. No migration necessary.`가 나옵니다.

## 테스트

| 주소 | 기대 결과 |
|---|---|
| http://localhost:8093/ | 앱 안내 JSON |
| http://localhost:8093/memos | V2가 넣은 첫 메모 1개 |
| http://localhost:8093/actuator/health | `"status":"UP"`, `components.db.status`도 `UP` |

```bash
# Git Bash
curl -X POST http://localhost:8093/memos -H "Content-Type: application/json" -d '{"content":"compose memo"}'
curl http://localhost:8093/memos
```

```powershell
# PowerShell
Invoke-RestMethod -Method Post -Uri http://localhost:8093/memos -ContentType "application/json" -Body '{"content":"compose memo"}'
Invoke-RestMethod http://localhost:8093/memos
```

## 실습: V3 마이그레이션 추가

1. `src/main/resources/db/migration/V3__add_updated_at.sql` 생성
   ```sql
   ALTER TABLE memo ADD COLUMN updated_at DATETIME(6) NULL;
   ```
2. `Memo.java`에 필드 추가
   ```java
   @Column(name = "updated_at")
   private LocalDateTime updatedAt;
   ```
3. 앱만 다시 빌드
   ```bash
   docker compose up -d --build app
   docker compose logs -f app     # version "3 - add updated at" 적용 확인
   ```

일부러 실패도 해 보세요.

| 해 볼 것 | 결과 |
|---|---|
| 2번만 하고 1번을 빼기 | `Schema-validation: missing column [updated_at] in table [memo]` |
| 이미 적용된 V1 파일 내용을 수정 | `Validate failed: Migration checksum mismatch for migration version 1` |

## 문제 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| `docker compose` 명령이 없음 | 예전 Docker의 `docker-compose`(하이픈) | Docker Desktop을 최신으로 업데이트 (`docker compose`가 표준) |
| app이 `Waiting` 상태에서 멈춤 | MariaDB가 healthy가 되지 않음 | `docker compose logs mariadb`로 원인 확인 (비밀번호 누락 등) |
| `Unsupported Database: MariaDB` | `flyway-mysql` 의존성 누락 | `pom.xml` 확인 후 `docker compose up -d --build app` |
| 마이그레이션이 실행되지 않음 (로그에 Flyway가 없음) | `spring-boot-starter-flyway` 누락 (Spring Boot 4는 `flyway-core`만으로는 자동 실행 안 됨) | `pom.xml` 확인 |
| `Schema-validation: missing table [memo]` | 마이그레이션 파일 위치나 이름 오류 | `src/main/resources/db/migration/`, 밑줄 2개(`V1__`) 확인 |
| `Schema-validation: missing column` | Entity에 필드를 추가했지만 마이그레이션 없음 | 새 버전 파일(V3...)로 컬럼 추가 |
| `Migration checksum mismatch` | 이미 적용된 파일을 수정함 | 파일을 원래대로 되돌리고 변경은 새 버전으로 (연습 중이라면 `docker compose down -v` 후 다시 시작) |
| `Found non-empty schema(s) ... but no schema history table` | 08-2처럼 JPA가 만든 테이블이 있는 DB에 Flyway를 처음 적용 | 이 예제는 새 볼륨을 쓰므로 정상적으로는 발생하지 않음, 기존 DB라면 `spring.flyway.baseline-on-migrate=true` 검토 |
| `.env`를 바꿨는데 계정, 비밀번호가 그대로 | 기존 볼륨으로 시작해 자동 초기화가 건너뛰어짐 | `docker compose down -v` 후 다시 `up` (데이터 삭제됨) |
| 비밀번호에 `$`가 있으면 값이 잘림 | Compose가 `$`를 변수로 해석 | `$` 대신 다른 문자를 쓰거나 `$$`로 입력 |
| 포트 사용 중 오류 | 8093이나 3307을 다른 프로그램이 사용 | `compose.yaml`의 `ports:` 앞 번호 변경 |

## 정리

```bash
docker compose down          # 컨테이너, 네트워크 삭제 (데이터는 남음)
docker compose down -v       # 볼륨까지 삭제
docker rmi boot-flyway-app   # 빌드한 앱 이미지 삭제
```

## 버전 참고

- Spring Boot **4.0.6** (08, 08-2와 같은 버전)
- Spring Boot 4부터 Flyway 자동 설정이 별도 모듈(`spring-boot-flyway`)로 분리되어 `spring-boot-starter-flyway`가 필요합니다.
- MariaDB 지원은 `flyway-mysql` 모듈에 들어 있습니다 (이름은 mysql이지만 MariaDB도 담당).
