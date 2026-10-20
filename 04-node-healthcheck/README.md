# 04-node-healthcheck

Node.js(Express) 앱에 **HEALTHCHECK**를 추가해, Docker가 앱의 실제 동작 상태를 주기적으로 확인하도록 만드는 예제입니다.

## 이 예제의 목적

`docker ps`의 `Up`은 **프로세스가 살아 있다**는 뜻일 뿐, **앱이 정상적으로 응답한다**는 뜻은 아닙니다.
앱이 멈춰서 요청에 응답하지 못해도 프로세스만 살아 있으면 계속 `Up`으로 보입니다.

HEALTHCHECK를 설정하면 Docker가 일정 간격으로 앱에 직접 요청을 보내 확인하고, 그 결과를 상태로 표시합니다.

| 상태 | 의미 |
|---|---|
| `starting` | 컨테이너 시작 후 아직 첫 검사 전 |
| `healthy` | 검사 통과 (healthcheck.js가 종료 코드 0으로 끝남) |
| `unhealthy` | 검사 연속 실패 (기본 3번) |

```
CONTAINER ID   IMAGE         STATUS                    NAMES
f60635c3e435   my-node-app   Up 2 minutes (healthy)    node-app
```

> 일반 `docker run`은 unhealthy가 되어도 자동으로 재시작하지 않고 상태만 알려줍니다.
> 이 상태는 Docker Compose의 실행 순서 제어(`depends_on` + `condition: service_healthy`) 등에서 활용됩니다.

### 이전 단계(03-node-basic)와 달라진 점

| 항목 | 내용 |
|---|---|
| `LABEL` | 관리자, 버전 같은 메타정보를 이미지에 기록 |
| `npm install --omit=dev` | 운영에 필요 없는 개발용 패키지 제외 |
| `HEALTHCHECK` | 30초마다 앱 상태 검사 |
| `healthcheck.js` | 검사를 수행하는 스크립트 추가 |
| `.dockerignore` | 불필요한 파일이 이미지에 들어가지 않도록 제외 |

## 파일 구성

```
04-node-healthcheck/
├── Dockerfile        # 이미지 빌드 설정
├── .dockerignore     # 이미지에서 제외할 파일 목록
├── package.json      # 의존성(express) 정의
├── app.js            # Express 웹 서버 (/, /health 경로)
├── healthcheck.js    # HEALTHCHECK가 실행하는 검사 스크립트
└── 실행방법.txt      # 빌드, 실행, 확인 명령 모음
```

### app.js

Express로 만든 웹 서버입니다.

| 경로 | 동작 |
|---|---|
| `/` | 안내 HTML 페이지 표시 |
| `/health` | `{"status":"OK", ...}` JSON 반환, 호출될 때마다 로그 출력 |

> 첫 화면에 `/hello`, `/info` 링크가 있지만 실제 경로는 구현되어 있지 않아 "Cannot GET" 오류가 납니다.

### healthcheck.js

컨테이너 안에서 `http://localhost:3000/health`로 요청을 보내고, 결과에 따라 종료 코드를 반환합니다.

| 결과 | 종료 코드 | Docker 판정 |
|---|---|---|
| 응답 코드 200 | `0` | 성공 |
| 200 이외의 응답 | `1` | 실패 |
| 연결 오류 | `1` | 실패 |
| 2초 안에 응답 없음 | `1` | 실패 |

Docker는 **출력 메시지가 아니라 종료 코드**로 성공과 실패를 판단합니다.

### Dockerfile 핵심 부분

```dockerfile
# 30초마다 healthcheck.js를 실행, 3초 안에 끝나지 않으면 실패로 처리
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node healthcheck.js

# 메인 프로세스: 웹 서버 실행
CMD ["node", "app.js"]
```

| 옵션 | 의미 | 기본값 |
|---|---|---|
| `--interval` | 검사 간격 | 30s |
| `--timeout` | 검사 1회 제한 시간 | 30s |
| `--start-period` | 시작 직후 실패를 무시하는 유예 시간 | 0s |
| `--retries` | unhealthy로 판정할 연속 실패 횟수 | 3 |

## 동작 구조

```
컨테이너
├── node app.js           메인 프로세스 (계속 실행)
│     └── 출력 → docker logs
│
└── node healthcheck.js   30초마다 실행 후 바로 종료
      ├── localhost:3000/health 로 요청
      ├── 종료 코드 0 / 1 → healthy / unhealthy 판정
      └── 출력 → docker inspect (.State.Health.Log)
```

## 실행 방법

```bash
# (재실행 시) 기존 컨테이너 정리
docker rm -f node-app

# 이미지 빌드
docker build -t my-node-app .

# 컨테이너 실행
docker run -d -p 3000:3000 --name node-app my-node-app
```

브라우저에서 확인합니다.

- http://localhost:3000
- http://localhost:3000/health

## 상태 확인 방법

### 1. docker ps로 간단히 확인

```bash
docker ps
```

시작 직후에는 `(health: starting)`, 약 30초 뒤 첫 검사가 끝나면 `(healthy)`로 바뀝니다.

### 2. 상태값만 확인

```powershell
docker inspect --format="Health Status: {{.State.Health.Status}}" node-app
```

### 3. healthcheck.js의 출력 메시지 확인

```powershell
docker inspect --format='{{range .State.Health.Log}}{{println .Output}}{{end}}' node-app
```

출력 예시:

```
Starting health check...
Health check PASSED with status: 200
HEALTHCHECK: Health check PASSED with status: 200
```

같은 메시지가 두 번 보이는 이유는 `console.log`(표준 출력)와 `console.error`(표준 에러)로 각각 출력하고, Docker가 둘을 합쳐 저장하기 때문입니다.

### 4. 검사 시각, 종료 코드, 메시지 함께 확인

```powershell
docker inspect --format='{{range .State.Health.Log}}{{.Start}} | {{.ExitCode}} | {{println .Output}}{{end}}' node-app
```

### 5. 검사 스크립트 직접 실행

```bash
docker exec node-app node healthcheck.js
echo $?   # 0이면 성공 (PowerShell에서는 $LASTEXITCODE)
```

## logs와 inspect의 차이

| 명령 | 보여주는 내용 | 이 예제에서 볼 수 있는 것 |
|---|---|---|
| `docker logs` | 메인 프로세스(`node app.js`)의 출력 | `App listening on port 3000`<br>`Health check endpoint called at ...` |
| `docker inspect` | HEALTHCHECK 실행 결과 (최근 5회) | `Health check PASSED with status: 200` |

`healthcheck.js`는 메인 프로세스와 별개로 잠깐 실행되었다가 종료되는 프로세스라서, 그 출력은 `docker logs`에 나오지 않습니다.

다만 `app.js`의 `/health` 경로가 호출될 때마다 로그를 남기므로, `docker logs`에서도 **검사 요청이 앱까지 도달했는지**는 간접적으로 확인할 수 있습니다.

```bash
docker logs node-app
# App listening on port 3000
# Health check endpoint called at 2026-10-20T13:50:30.123Z
# Health check endpoint called at 2026-10-20T13:51:00.456Z
```

- **logs**: 검사 요청이 앱에 들어왔는가 (앱 쪽 기록)
- **inspect**: 검사 결과가 성공이었는가 (검사 스크립트 쪽 기록)

## 문제 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| `Exited (0)`, 로그 없음 | Dockerfile에 `CMD`가 빠져 베이스 이미지의 `node`(대화형 모드)만 실행됨 | Dockerfile 끝에 `CMD ["node", "app.js"]`가 있는지 확인 |
| STATUS에 health 표시가 없음 | Dockerfile에 `HEALTHCHECK`가 빠짐 | HEALTHCHECK 줄 확인 후 다시 빌드 |
| 계속 `unhealthy` | `/health` 경로 오류, 포트 불일치, healthcheck.js 누락 | inspect로 Output 메시지 확인 |
| COMMAND가 `/docker-entrypoint.…` | 다른 폴더(Nginx 예제)의 Dockerfile로 빌드됨 | 04 폴더에서 다시 빌드 |
| inspect 결과가 비어 있음 | 아직 첫 검사 전 | 30초 정도 기다린 뒤 다시 확인 |

이미지에 설정된 실행 명령은 다음으로 확인할 수 있습니다.

```bash
# ["node","app.js"]가 나와야 정상, ["node"]만 나오면 CMD 누락
docker inspect --format='{{json .Config.Cmd}}' my-node-app
```

## .dockerignore가 필요한 이유

`COPY . .` 단계에서 로컬의 `node_modules`가 복사되면, 컨테이너 안에서 `npm install --omit=dev`로 설치한 패키지를 덮어씁니다.
Windows에서 설치한 패키지는 Alpine 리눅스에서 동작하지 않을 수 있고, 제외했던 개발용 패키지도 다시 들어갑니다.

`healthcheck.js`는 HEALTHCHECK에서 실행해야 하므로 `.dockerignore`에 **넣으면 안 됩니다.**
