# React_Flyway_GitActions

메모 API 백엔드([SpringBoot_Flyway_GitActions](https://github.com/vega2krookies5/SpringBoot_Flyway_GitActions))를 사용하는 **React(Vite) 클라이언트**입니다.

| 저장소 | 역할 |
|---|---|
| [SpringBoot_Flyway_GitActions](https://github.com/vega2krookies5/SpringBoot_Flyway_GitActions) | 메모 REST API (`/api/memos`) + MariaDB + Flyway |
| **React_Flyway_GitActions** (이 저장소) | 메모 화면, `/api` 요청을 백엔드로 전달 |

## 화면 기능

| 기능 | 호출하는 백엔드 API |
|---|---|
| 메모 목록 (최신순) | `GET /api/memos` |
| 메모 저장 (500자 제한, Ctrl+Enter) | `POST /api/memos` |
| 메모 삭제 (확인 후) | `DELETE /api/memos/{id}` |
| 앱 / DB 상태 배지 (10초마다 확인) | `GET /actuator/health` |

작성 시각과 다를 때는 백엔드 V3 마이그레이션으로 추가된 `updatedAt`(수정 시각)도 표시합니다.

## 파일 구성

```
React_Flyway_GitActions/
├── .env.development              # 개발 서버가 연결할 백엔드 주소
├── vite.config.js                # 개발용 프록시 (/api, /actuator → 백엔드)
├── index.html
├── src/
│   ├── main.jsx
│   ├── App.jsx                   # 메모 상태 관리 (목록, 저장, 삭제)
│   ├── index.css                 # 밝은/어두운 테마
│   ├── api/
│   │   └── memoApi.js            # axios 호출 모음 (async/await)
│   └── components/
│       ├── HealthBadge.jsx       # 앱/DB 상태
│       ├── MemoForm.jsx          # 입력 폼
│       ├── MemoList.jsx          # 목록
│       └── MemoItem.jsx          # 메모 1개
├── Dockerfile                    # Node 빌드 → nginx 실행
├── nginx/default.conf.template   # 정적 파일 + /api, /actuator 를 백엔드로 전달
└── .github/workflows/docker.yml  # GitHub Actions (빌드 + Docker Hub push)
```

* * *

## 핵심 개념: CORS 없이 연결하기 (프록시)

백엔드에는 CORS 설정이 없습니다. 브라우저가 `localhost:5173`(React)에서 `localhost:8080`(Spring Boot)으로 바로 요청하면 **출처(origin)가 달라서 차단**됩니다.

그래서 React는 항상 **자기 주소**의 `/api`, `/actuator`로만 요청하고, 중간에서 백엔드로 전달합니다. 이때 **경로는 바꾸지 않고 그대로** 전달합니다 (백엔드 경로도 `/api/memos`).

```
[개발]  브라우저 → localhost:5173/api/memos → (Vite 프록시) → localhost:8080/api/memos
[배포]  브라우저 → localhost:3000/api/memos → (nginx)       → app:8080/api/memos
```

| 구분 | 전달하는 쪽 | 설정 파일 | 백엔드 주소 |
|---|---|---|---|
| 개발 (`npm run dev`) | Vite 개발 서버 | `vite.config.js` | `.env.development`의 `VITE_API_TARGET` |
| 배포 (Docker) | nginx | `nginx/default.conf.template` | 환경 변수 `BACKEND_URL` (기본 `http://app:8080`) |

| 요청 경로 | 용도 | 전달 |
|---|---|---|
| `/api/...` | 메모 API | 경로 그대로 백엔드로 |
| `/actuator/...` | 상태 배지 (`/actuator/health`) | 경로 그대로 백엔드로 |
| 그 밖의 경로 | React 화면 | 개발: Vite, 배포: nginx가 `index.html` 제공 |

브라우저 입장에서는 같은 출처이므로 백엔드에 CORS 설정이 필요 없습니다. 백엔드 8080으로 가는 요청은 Vite나 nginx가 서버에서 보내는 것이라 CORS 검사 대상이 아닙니다.

> nginx의 `proxy_pass ${BACKEND_URL};`처럼 **끝에 `/`가 없으면** 요청 경로를 그대로 전달합니다. `proxy_pass ${BACKEND_URL}/;`처럼 `/`를 붙이면 `/api/`가 잘려서 백엔드에 `/memos`로 도착하고 404가 납니다.

* * *

## 실행 방법 1: 개발 서버

```bash
# 0. 백엔드 먼저 실행 (SpringBoot_Flyway_GitActions 폴더에서)
docker compose up -d --build
curl http://localhost:8080/api/memos      # 응답이 오는지 확인

# 1. 클라이언트 실행 (이 저장소 폴더에서)
npm install
npm run dev
```

브라우저에서 http://localhost:5173 을 엽니다.

> 백엔드 `compose.yaml`의 app 포트는 `"8080:8080"`입니다. 포트를 `"8093:8080"`처럼 바꿨다면 `.env.development`의 `VITE_API_TARGET`도 같은 포트로 바꾸고 `npm run dev`를 다시 실행하세요.

## 실행 방법 2: Docker로 빌드 & 실행 (compose 없이)

클라우드에 올릴 이미지와 **똑같은 이미지**를 로컬에서 만들어 백엔드와 테스트하는 방법입니다. 백엔드는 백엔드 저장소의 compose로 실행 중이어야 합니다.

```bash
# 0. 백엔드 실행 (SpringBoot_Flyway_GitActions 폴더에서)
docker compose up -d --build
docker compose ps                      # app 이 Up (healthy) 인지 확인
docker network ls                      # boot-flyway_default 네트워크 확인

# 1. 프론트엔드 이미지 빌드 (이 저장소 폴더에서)
#    Docker Hub 에 올릴 이름과 같게 붙여 두면 나중에 그대로 push 가능
docker build -t hubusername/boot-flyway-web:latest .

# 2. 실행: 백엔드 compose 네트워크에 연결
docker run -d --name boot-flyway-web \
  --network boot-flyway_default \
  -e BACKEND_URL=http://app:8080 \
  -p 3000:80 \
  hubusername/boot-flyway-web:latest

# 3. 확인
docker logs boot-flyway-web            # nginx 오류가 없는지
curl http://localhost:3000/api/memos   # nginx → app 으로 전달되는지
```

브라우저에서 http://localhost:3000 을 엽니다.

PowerShell에서는 줄 끝의 `\` 대신 백틱(`` ` ``)을 쓰거나 한 줄로 입력합니다.
```powershell
docker run -d --name boot-flyway-web --network boot-flyway_default -e BACKEND_URL=http://app:8080 -p 3000:80 아이디/boot-flyway-web:latest
```

### 왜 `--network boot-flyway_default`가 필요한가

| 옵션 | 의미 |
|---|---|
| `--network boot-flyway_default` | 백엔드 compose가 만든 네트워크에 참여 (`name: boot-flyway` + `_default`) |
| `-e BACKEND_URL=http://app:8080` | 같은 네트워크 안에서는 **서비스 이름 `app`**으로 백엔드에 접속 |

네트워크를 지정하지 않으면 web 컨테이너는 `app`이라는 이름을 찾지 못합니다. 이때 nginx가 **시작하자마자 종료**되고, `docker logs`에 `host not found in upstream "app"`가 나옵니다.

> **다른 방법:** 네트워크 대신 내 PC의 8080 포트를 거쳐 접속할 수도 있습니다. Docker Desktop(Windows, Mac)에서는 `-e BACKEND_URL=http://host.docker.internal:8080`을 쓰고 `--network`는 뺍니다. Linux에서는 `--add-host=host.docker.internal:host-gateway`를 함께 넣어야 합니다.

### 코드를 고친 뒤 다시 실행

```bash
docker rm -f boot-flyway-web                    # 기존 컨테이너 삭제
docker build -t 아이디/boot-flyway-web:latest .  # 다시 빌드
docker run -d --name boot-flyway-web --network boot-flyway_default -e BACKEND_URL=http://app:8080 -p 3000:80 아이디/boot-flyway-web:latest
```

### 클라우드에 올리기

로컬에서 확인한 이미지를 그대로 Docker Hub에 올리는 방법은 두 가지입니다.

| 방법 | 명령 |
|---|---|
| GitHub Actions (권장) | main에 push하면 `docker.yml`이 빌드 후 `:v1`, `:latest` push |
| 직접 push | `docker login` 후 `docker push 아이디/boot-flyway-web:latest` |

> 직접 push할 때 Mac(Apple Silicon)에서 빌드한 이미지는 ARM용이라 x86 클라우드 서버에서 `exec format error`가 납니다. 이때는 `docker buildx build --platform linux/amd64 -t 아이디/boot-flyway-web:latest --push .`로 빌드하거나 GitHub Actions를 쓰세요. Windows(x86)에서 빌드한 이미지는 그대로 사용할 수 있습니다.

### 정리

```bash
docker rm -f boot-flyway-web              # 프론트엔드 컨테이너 삭제
# 백엔드는 SpringBoot_Flyway_GitActions 폴더에서 docker compose down
```

> 백엔드를 `docker compose down`하면 `boot-flyway_default` 네트워크가 삭제됩니다. web 컨테이너가 아직 연결되어 있으면 네트워크 삭제가 실패하니, **web을 먼저 삭제**하세요.

## 실행 방법 3: Docker Compose로 함께 실행

백엔드 저장소의 `compose.yaml` `services:` 아래에 `web` 서비스를 추가합니다.

```yaml
  # --------------------------------------------------------
  # React 클라이언트 (nginx)
  # --------------------------------------------------------
  web:
    # 방법 A: Docker Hub 이미지 사용 (권장, GitHub Actions 가 올린 이미지)
    image: 아이디/boot-flyway-web:latest

    # 방법 B: 소스로 빌드 (두 저장소를 같은 상위 폴더에 clone 했을 때)
    #   작업폴더/
    #   ├── SpringBoot_Flyway_GitActions/   ← compose.yaml 위치
    #   └── React_Flyway_GitActions/
    # build: ../React_Flyway_GitActions
    # image: boot-flyway-web

    environment:
      BACKEND_URL: http://app:8080   # 같은 compose 네트워크의 서비스 이름
    ports:
      - "3000:80"
    depends_on:
      - app
    restart: unless-stopped
```

```bash
# 백엔드 저장소 폴더에서
docker compose up -d --build
```

브라우저에서 http://localhost:3000 을 엽니다.

| 컨테이너 | 내 PC 포트 | 역할 |
|---|---|---|
| web | 3000 | React 화면 + `/api`, `/actuator` 전달 |
| app | 8080 | Spring Boot API |
| mariadb | 3307 | DB (Flyway가 테이블 관리) |

nginx가 `app:8080`으로 전달하므로, 화면만 쓴다면 app의 `ports:`는 없어도 됩니다.

## GitHub Actions

`.github/workflows/docker.yml`은 백엔드 저장소의 `maven.yml`과 같은 구조입니다.

| 이벤트 | 하는 일 |
|---|---|
| main 대상 Pull Request | `npm ci && npm run build`로 빌드만 확인 |
| main에 push | Docker Hub에 `아이디/boot-flyway-web:v1`, `:latest` push |

처음 한 번 저장소 **Settings > Secrets and variables > Actions**에 등록합니다.

| 이름 | 값 |
|---|---|
| `DOCKER_USERNAME` | Docker Hub 아이디 |
| `DOCKER_PASSWORD` | Docker Hub **Access Token** (Read & Write) |

> 백엔드(`boot-flyway-app`)와 프론트엔드(`boot-flyway-web`)는 **Docker Hub 저장소를 따로** 씁니다. 저장소는 이미지 종류, 태그는 버전을 구분합니다.

## 상태 배지를 빼고 싶다면

`/actuator`는 운영용 경로라 실제 서비스에서는 외부에 열지 않는 경우가 많습니다. 배지는 학습용이므로 아래를 지우면 `/actuator`를 노출하지 않는 구성이 됩니다 (메모 기능에는 영향 없음).

1. `App.jsx`: `import HealthBadge ...` 줄과 `<HealthBadge />`
2. `src/components/HealthBadge.jsx`
3. `src/api/memoApi.js`: `fetchHealth()`
4. `vite.config.js`: `'/actuator'` 프록시
5. `nginx/default.conf.template`: `location /actuator/` 블록

## 문제 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| "백엔드에 연결할 수 없습니다" | 백엔드가 꺼져 있거나 포트가 다름 | `curl http://localhost:8080/api/memos` 확인, `.env.development` 포트 확인 |
| 메모 목록이 `요청 실패 (HTTP 404)` | 백엔드가 예전 버전(`/memos`)이거나, 프록시가 `/api`를 잘라서 전달 | 백엔드가 `/api/memos`인지 확인, `vite.config.js`에 `rewrite`가 없는지, nginx `proxy_pass` 끝에 `/`가 없는지 확인 |
| 배포 후 404 (개발에서는 정상) | 백엔드, 프론트엔드 이미지 버전이 서로 다름 | 두 이미지를 함께 새로 받기: `docker compose pull && docker compose up -d` |
| 상태 배지가 `DB DOWN` | MariaDB 연결 끊김 | 백엔드 저장소 폴더에서 `docker compose logs mariadb` |
| 상태 배지만 `앱 연결 안 됨` (메모는 정상) | `/actuator` 프록시 누락 | `vite.config.js`, nginx의 `/actuator` 설정 확인 |
| 브라우저 콘솔에 CORS 오류 | axios 주소에 `http://localhost:8080`을 직접 씀 | `baseURL`은 `/api` 그대로 두기 |
| Docker로 실행 시 502 Bad Gateway | nginx가 app에 연결하지 못함 (app이 시작 중이거나 꺼짐) | 백엔드 폴더에서 `docker compose ps`, `docker compose logs app` 확인 |
| `docker run` 직후 web 컨테이너가 종료됨 | `host not found in upstream "app"`: 백엔드 네트워크에 연결되지 않음 | `--network boot-flyway_default` 추가, 백엔드가 실행 중인지 확인 |
| `network boot-flyway_default not found` | 백엔드 compose가 실행되지 않음, 또는 `name:`이 다름 | 백엔드 먼저 `docker compose up -d`, `docker network ls`로 이름 확인 |
| `Conflict. The container name "/boot-flyway-web" is already in use` | 같은 이름의 컨테이너가 남아 있음 | `docker rm -f boot-flyway-web` 후 다시 실행 |
| 코드를 고쳤는데 화면이 그대로 | 예전 이미지로 실행 중이거나 브라우저 캐시 | 다시 `docker build` 후 컨테이너 재생성, 브라우저 강력 새로고침(Ctrl+Shift+R) |
| `.env.development`를 바꿨는데 그대로 | Vite는 시작할 때만 읽음 | `npm run dev` 다시 실행 |
| 저장 시 "요청 실패 (HTTP 400)" | 빈 내용 | 내용을 입력 (서버도 빈 값은 거절) |

## 버전 참고

- React 19, Vite 8, axios 1
- Node 22 (Dockerfile, GitHub Actions)
