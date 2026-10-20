# docker 명령어 정리

[← 처음으로](../README.md) · [← Dockerfile 명령어 정리](./dockerfile-instructions.md)

이미지를 만들고(`docker build`), 컨테이너를 실행하고(`docker run`), 확인하고 정리하는 명령을 모았습니다.

## 이미지와 컨테이너의 관계

```
Dockerfile ──docker build──→ 이미지 ──docker run──→ 컨테이너
 (설계도)                     (틀, 읽기 전용)          (실행 중인 인스턴스)
                               │                        │
                       docker images              docker ps
                       docker rmi                 docker rm
```

- 이미지 하나로 컨테이너를 여러 개 만들 수 있습니다.
- 컨테이너가 사용 중인 이미지는 컨테이너를 먼저 지워야 삭제할 수 있습니다.

## 한눈에 보기

| 분류 | 명령 | 하는 일 |
|---|---|---|
| 이미지 | `docker build` | Dockerfile로 이미지 만들기 |
| | `docker images` | 이미지 목록 |
| | `docker rmi` | 이미지 삭제 |
| | `docker tag` | 이미지에 다른 이름(태그) 붙이기 |
| | `docker history` | 이미지가 만들어진 단계(layer)별 크기 |
| | `docker pull` / `docker push` | 레지스트리에서 받기 / 올리기 |
| 컨테이너 | `docker run` | 이미지로 컨테이너 만들고 실행 |
| | `docker ps` | 컨테이너 목록 |
| | `docker stop` / `start` / `restart` | 중지 / 다시 시작 / 재시작 |
| | `docker rm` | 컨테이너 삭제 |
| 확인 | `docker logs` | 메인 프로세스 출력 |
| | `docker exec` | 실행 중인 컨테이너 안에서 명령 실행 |
| | `docker inspect` | 상세 정보 (JSON) |
| | `docker stats` | CPU, 메모리 사용량 |
| | `docker port` | 포트 연결 상태 |
| | `docker cp` | 컨테이너와 내 PC 사이 파일 복사 |
| 네트워크 | `docker network create` / `ls` / `inspect` / `rm` | 컨테이너끼리 이름으로 통신할 네트워크 관리 (8-2) |
| 볼륨 | `docker volume ls` / `inspect` / `rm` | 컨테이너를 지워도 남는 데이터 저장소 관리 (8-2) |
| 정리 | `docker system df` | 디스크 사용량 |
| | `docker image prune` / `container prune` / `system prune` | 안 쓰는 것 일괄 삭제 |

---

## 이미지 명령

### docker build — 이미지 만들기

```bash
# 기본: 현재 폴더(.)의 Dockerfile로 빌드
docker build -t my-node-app .

# 버전 태그 붙이기 (태그를 생략하면 :latest)
docker build -t my-node-app:1.0 .

# 캐시 없이 처음부터 다시 빌드 (설치 단계가 꼬였을 때)
docker build --no-cache -t my-node-app .

# 다른 이름의 Dockerfile 사용
docker build -f Dockerfile.dev -t my-node-app:dev .

# 빌드 변수 전달 (Dockerfile의 ARG)
docker build --build-arg NODE_VERSION=24 -t my-node-app .
```

| 옵션 | 의미 |
|---|---|
| `-t 이름:태그` | 이미지 이름과 태그 지정 |
| `.` (마지막 인자) | 빌드 컨텍스트, Docker로 보낼 폴더 (`COPY`의 기준) |
| `--no-cache` | 캐시를 쓰지 않고 모든 단계 다시 실행 |
| `-f 파일` | `Dockerfile`이 아닌 다른 파일 사용 |
| `--build-arg 키=값` | `ARG` 값 전달 |
| `--progress=plain` | 빌드 로그를 줄여 쓰지 않고 전부 출력 (오류 원인 찾을 때) |

> 빌드는 반드시 **해당 단계 폴더 안에서** 실행합니다. 다른 폴더에서 빌드하면 그 폴더의 Dockerfile로 이미지가 만들어집니다 (3단계에서 Nginx 이미지가 만들어진 원인).

### docker images — 이미지 목록

```bash
docker images                    # 전체 목록
docker images my-node-app        # 특정 이름만
docker images -f dangling=true   # 이름 없는(<none>) 이미지만
```

```
REPOSITORY        TAG       IMAGE ID       CREATED          SIZE
my-node-app       latest    a1b2c3d4e5f6   10 minutes ago   180MB
langchain-uv-app  latest    f6e5d4c3b2a1   2 hours ago      310MB
<none>            <none>    0123456789ab   3 hours ago      305MB
```

> `<none>` 이미지는 같은 이름으로 다시 빌드하면서 이름을 빼앗긴 이전 이미지입니다. 쌓이면 `docker image prune`으로 정리합니다.

### docker rmi — 이미지 삭제

```bash
docker rmi my-node-app           # 이름으로 삭제 (:latest)
docker rmi my-node-app:1.0       # 특정 태그만 삭제
docker rmi a1b2c3d4e5f6          # IMAGE ID로 삭제 (앞 몇 글자만 써도 됨)
docker rmi -f my-node-app        # 강제 삭제
```

| 오류 메시지 | 원인 | 해결 |
|---|---|---|
| `image is being used by stopped container` | 종료된 컨테이너가 이 이미지를 참조 중 | `docker rm 컨테이너` 후 다시 삭제 |
| `image is being used by running container` | 실행 중인 컨테이너가 사용 중 | `docker rm -f 컨테이너` 후 다시 삭제 |
| `image is referenced in multiple repositories` | 같은 이미지에 태그가 여러 개 | 태그별로 지우거나 IMAGE ID로 `-f` 삭제 |

### docker tag — 이름 붙이기

이미지를 복사하지 않고 **같은 이미지에 이름만 하나 더** 붙입니다. 레지스트리에 올리기 전에 주로 씁니다.

```bash
docker tag my-node-app my-node-app:1.0
docker tag my-node-app 사용자이름/my-node-app:1.0    # Docker Hub에 올릴 이름
```

### docker history — 단계별 크기

```bash
docker history my-node-app
```

Dockerfile의 각 줄이 이미지 크기를 얼마나 차지하는지 보여줍니다. 이미지가 예상보다 클 때 원인 찾기에 좋습니다 (예: 강의 전체용 `pyproject.toml`로 PyTorch가 설치된 경우).

> ⚠️ `ENV`, `ARG`에 넣은 값도 여기에 그대로 보입니다. 비밀 값을 Dockerfile에 쓰면 안 되는 이유입니다.

### docker pull / push — 레지스트리

```bash
docker pull nginx:alpine                       # 미리 받아 두기 (build 시 자동으로 받기도 함)

docker login                                   # Docker Hub 로그인
docker tag my-node-app 사용자이름/my-node-app:1.0
docker push 사용자이름/my-node-app:1.0         # 업로드
```

---

## 컨테이너 명령

### docker run — 실행

```bash
# 기본 형태
docker run -d -p 내PC포트:컨테이너포트 --name 컨테이너이름 이미지이름

# 실습 예시
docker run -d -p 8087:80 --name my-web my-simple-website
docker run -d -p 8001:8000 --env-file .env --name my-langchain langchain-uv-app

# 확인용으로 잠깐 실행하고 끝나면 자동 삭제
docker run --rm my-node-app ls -la

# 쉘로 들어가서 이미지 내부 살펴보기
docker run -it --rm my-node-app sh

# ENTRYPOINT가 있는 이미지에 쉘로 들어가기 (8단계)
docker run -it --rm --entrypoint sh spring-boot-app
```

| 옵션 | 의미 |
|---|---|
| `-d` | 백그라운드 실행 (터미널을 점유하지 않음) |
| `-p 8087:80` | 내 PC 8087 → 컨테이너 80 연결 |
| `--name` | 컨테이너 이름 지정 (생략하면 무작위 이름) |
| `--env-file .env` | 파일의 값을 환경 변수로 전달 |
| `-e KEY=VALUE` | 환경 변수 1개 전달 |
| `--rm` | 컨테이너가 끝나면 자동 삭제 |
| `-it` | 터미널을 연결해 대화형으로 실행 |
| `--entrypoint` | Dockerfile의 `ENTRYPOINT` 대신 실행할 명령 |
| `--restart unless-stopped` | 오류로 종료되거나 PC가 재부팅되면 자동 재시작 |
| `-v 볼륨이름:컨테이너경로` | 이름 있는 볼륨 연결 (컨테이너를 지워도 데이터 유지) |
| `-v ./폴더:컨테이너경로` | 내 PC 폴더를 그대로 연결 (바인드 마운트) |
| `--network 네트워크이름` | 지정한 네트워크에 연결 (같은 네트워크끼리 이름으로 접속) |
| `-p 127.0.0.1:3306:3306` | 내 PC에서만 접속 가능하게 포트 연결 (다른 PC 차단) |
| `--health-cmd "명령"` | Dockerfile 없이 실행 시점에 HEALTHCHECK 지정 |

### docker ps — 목록

```bash
docker ps        # 실행 중인 컨테이너
docker ps -a     # 종료된 컨테이너까지 전부
docker ps -q     # ID만 출력 (다른 명령과 조합할 때)
```

| STATUS | 의미 |
|---|---|
| `Up 2 minutes` | 실행 중 |
| `Up 2 minutes (healthy)` | 실행 중 + 헬스체크 통과 |
| `Up 10 seconds (health: starting)` | 실행 중 + 첫 헬스체크 전 |
| `Exited (0) 5 seconds ago` | 정상 종료 (서버가 계속 실행되지 않음) |
| `Exited (1) 5 seconds ago` | 오류로 종료 → `docker logs` 확인 |

### docker stop / start / restart

```bash
docker stop my-web       # 중지 (컨테이너는 남아 있음)
docker start my-web      # 중지된 컨테이너 다시 시작 (설정 그대로)
docker restart my-web    # 중지 후 바로 시작
```

> `start`는 **기존 컨테이너**를 다시 켜는 것이라 이미지를 다시 빌드해도 반영되지 않습니다. 코드를 고쳤다면 `rm` 후 새로 `run` 해야 합니다.

### docker rm — 삭제

```bash
docker rm my-web         # 중지된 컨테이너 삭제
docker rm -f my-web      # 실행 중이어도 강제 삭제 (stop + rm)
```

> 같은 `--name`으로 다시 `run`하려면 기존 컨테이너를 먼저 지워야 합니다. 그래서 각 단계 `실행방법.txt` 첫 줄에 `docker rm -f`가 있습니다.

---

## 확인 명령

### docker logs — 출력 보기

```bash
docker logs my-rag              # 지금까지의 출력
docker logs -f my-rag           # 실시간으로 계속 보기 (Ctrl + C로 빠져나와도 컨테이너는 계속 실행)
docker logs --tail 50 my-rag    # 마지막 50줄만
docker logs -t my-rag           # 시각 표시
```

> `docker logs`는 **메인 프로세스(`CMD`/`ENTRYPOINT`)의 출력**만 보여줍니다. HEALTHCHECK 스크립트의 출력은 `docker inspect`로 봐야 합니다 (4단계).
> Python의 `print()`가 안 보이면 Dockerfile에 `ENV PYTHONUNBUFFERED=1`이 있는지 확인합니다 (10단계).

### docker exec — 컨테이너 안에서 명령 실행

```bash
docker exec -it node-app sh                 # 쉘로 들어가기 (exit로 나옴)
docker exec node-app ls -la                 # 명령 하나만 실행
docker exec node-app node healthcheck.js    # 헬스체크 스크립트 직접 실행 (4단계)
docker exec -it mariadb mariadb -uboot -p boot_db   # DB 컨테이너에서 SQL 접속 (8-2단계)

# 키가 전달되었는지 값을 출력하지 않고 확인 (9, 10단계)
docker exec my-rag python -c "import os; print('set' if os.getenv('UPSTAGE_API_KEY') else 'missing')"
```

> Alpine, slim 이미지에는 `bash`가 없는 경우가 많으므로 `sh`를 씁니다.

### docker inspect — 상세 정보

```bash
docker inspect node-app                                      # 전체 JSON

docker inspect --format='{{.State.Status}}' node-app         # running, exited
docker inspect --format='{{.State.Health.Status}}' node-app  # healthy, unhealthy
docker inspect --format='{{range .State.Health.Log}}{{println .Output}}{{end}}' node-app
docker inspect --format='{{json .Config.Cmd}}' my-node-app   # 이미지에 설정된 CMD
docker inspect --format='{{json .State}}' node-app           # State 부분만 보기
```

`--format`은 Go 템플릿 문법입니다. 맨 앞의 `.`이 컨테이너 정보 전체이고, `.State.Health.Status`는 JSON 안을 순서대로 따라 들어간 값입니다.

### docker stats / port / cp

```bash
docker stats                    # 실행 중인 컨테이너의 CPU, 메모리 실시간 표시 (Ctrl + C로 종료)
docker stats --no-stream        # 한 번만 출력

docker port my-web              # 80/tcp -> 0.0.0.0:8087

docker cp my-web:/usr/share/nginx/html/index.html .   # 컨테이너 → 내 PC
docker cp index.html my-web:/usr/share/nginx/html/    # 내 PC → 컨테이너 (재시작하면 사라짐)
```

---

## 네트워크와 볼륨 명령 (8-2단계)

컨테이너가 2개 이상이 되면 **서로 통신할 길(네트워크)**과 **지워지지 않는 저장소(볼륨)**가 필요합니다.

### 컨테이너 안의 localhost

컨테이너 안에서 `localhost`는 **그 컨테이너 자기 자신**입니다. 앱 컨테이너에서 `localhost:3306`으로 접속하면 DB에 닿지 않습니다.

| 앱 실행 위치 | DB 주소 |
|---|---|
| 내 PC에서 직접 실행 | `localhost:3306` (`-p`로 연결된 포트) |
| 컨테이너로 실행 | `mariadb:3306` (같은 네트워크의 **컨테이너 이름**) |

### docker network — 컨테이너끼리 연결

```bash
docker network create boot-net         # 네트워크 만들기
docker network ls                      # 목록 (bridge, host, none은 기본 제공)
docker network inspect boot-net        # 연결된 컨테이너 확인
docker network connect boot-net mariadb     # 이미 실행 중인 컨테이너를 네트워크에 연결
docker network rm boot-net             # 삭제 (연결된 컨테이너를 먼저 지워야 함)

# 두 컨테이너를 같은 네트워크로 실행
docker run -d --name mariadb  --network boot-net ... mariadb:10.11.18
docker run -d --name boot-app --network boot-net ... boot-mariadb-app
```

직접 만든 네트워크에서는 Docker가 **컨테이너 이름을 주소로** 바꿔 줍니다. 그래서 앱은 `mariadb`라는 이름만 알면 DB에 접속할 수 있습니다.
컨테이너끼리는 내부 포트(3306)로 바로 통신하므로 `-p` 없이도 연결됩니다. `-p`는 내 PC에서 접속할 때만 필요합니다.

### docker volume — 데이터 유지

```bash
docker volume ls                       # 볼륨 목록
docker volume inspect boot-mariadb-data
docker volume rm boot-mariadb-data     # 데이터 완전 삭제 (사용 중인 컨테이너를 먼저 지워야 함)
docker volume prune                    # 어떤 컨테이너도 쓰지 않는 볼륨 전부 삭제
```

| `-v` 형태 | 종류 | 예시 | 용도 |
|---|---|---|---|
| `이름:경로` | 이름 있는 볼륨 | `-v boot-mariadb-data:/var/lib/mysql` | DB 데이터처럼 Docker가 관리하는 저장소 |
| `./폴더:경로` | 바인드 마운트 | `-v ./db/init:/docker-entrypoint-initdb.d` | 내 PC의 파일을 컨테이너에 그대로 보여줄 때 |

> ⚠️ MariaDB, MySQL 이미지의 자동 초기화(환경 변수로 DB와 계정 생성, `/docker-entrypoint-initdb.d`의 SQL 실행)는 **볼륨이 비어 있을 때 한 번만** 동작합니다. `.env`나 SQL을 바꿨다면 볼륨을 지우고 다시 시작해야 적용됩니다.

> Git Bash에서 `-v ./db/init:/docker-entrypoint-initdb.d`처럼 `/`로 시작하는 컨테이너 경로를 쓰면 Windows 경로로 바뀌어 실패할 수 있습니다. PowerShell을 쓰거나 명령 앞에 `MSYS_NO_PATHCONV=1`을 붙입니다.

---

## 정리 명령

연습하다 보면 종료된 컨테이너와 `<none>` 이미지, 빌드 캐시가 쌓여 디스크를 많이 차지합니다.

```bash
docker system df                # 이미지, 컨테이너, 빌드 캐시가 차지하는 용량

docker container prune          # 종료된 컨테이너 전부 삭제
docker image prune              # 이름 없는(<none>) 이미지 삭제
docker image prune -a           # 컨테이너가 사용하지 않는 이미지 전부 삭제
docker builder prune            # 빌드 캐시 삭제
docker system prune             # 위의 것들(종료된 컨테이너, <none> 이미지, 네트워크, 캐시)을 한 번에
```

> ⚠️ `docker image prune -a`, `docker system prune -a`는 지금 실행 중이 아닌 이미지를 **모두** 지웁니다. 다음 빌드 때 베이스 이미지를 다시 내려받아야 하므로 시간이 걸립니다.

여러 개를 한 번에 지우고 싶을 때는 다른 명령과 조합합니다.

```bash
# 모든 컨테이너 강제 삭제 (Git Bash, PowerShell 모두 동작)
docker rm -f $(docker ps -aq)
```

---

## 단계별 실습 흐름 (코드를 고쳤을 때)

```bash
docker rm -f my-web                                   # 1. 기존 컨테이너 삭제
docker build -t my-simple-website .                   # 2. 이미지 다시 빌드
docker run -d -p 8087:80 --name my-web my-simple-website  # 3. 새 컨테이너 실행
docker ps                                             # 4. STATUS 확인
docker logs my-web                                    # 5. 오류 확인
```

---

## 문제 해결 빠른 참고

| 증상 | 흔한 원인 | 확인 방법 |
|---|---|---|
| `Exited (0)`, 로그 없음 | `CMD`가 없거나 앱이 서버를 띄우지 않고 끝남 | `docker inspect --format='{{json .Config.Cmd}}' 이미지` |
| `Exited (1)` | 앱 오류, 환경 변수(API 키) 누락 | `docker logs 컨테이너` |
| `Up`인데 접속 안 됨 | 앱이 `127.0.0.1`로 열림 (`0.0.0.0` 필요), 포트 불일치 | 앱 시작 로그의 주소 확인 |
| COMMAND가 예상과 다름 | 다른 폴더에서 빌드함 | 빌드한 폴더와 `Dockerfile` 첫 줄 확인 |
| 이름 충돌 오류 | 같은 이름의 컨테이너가 이미 있음 | `docker rm -f 컨테이너이름` |
| 포트 사용 중 오류 | 다른 컨테이너나 프로그램이 포트 사용 | `docker ps`, `netstat -ano \| findstr :포트` |
| 코드를 고쳤는데 반영 안 됨 | 다시 빌드하지 않음 | `docker build` 후 컨테이너 다시 실행 |
| 앱이 DB에 연결 못 함 (`Connection refused`) | 컨테이너 안에서 `localhost`로 접속, 또는 DB가 아직 준비 전 | `DB_HOST`가 DB 컨테이너 이름인지, DB가 `(healthy)`인지 확인 |
| `UnknownHostException: mariadb` | 두 컨테이너가 다른 네트워크에 있음 | 둘 다 `--network`가 같은지 `docker network inspect`로 확인 |
| `.env`를 바꿨는데 DB 계정, 비밀번호가 그대로 | 기존 볼륨으로 시작해 자동 초기화가 건너뛰어짐 | 볼륨 삭제 후 다시 시작 (데이터도 삭제됨) |
| 컨테이너를 지웠더니 DB 데이터가 사라짐 | 볼륨 없이 실행함 | `-v 볼륨이름:/var/lib/mysql`로 실행 |

---

[← 처음으로](../README.md) · [← Dockerfile 명령어 정리](./dockerfile-instructions.md)
