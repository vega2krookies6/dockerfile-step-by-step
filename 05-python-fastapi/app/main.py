from fastapi import FastAPI

# FastAPI 앱 생성
app = FastAPI(
    title="My FastAPI Docker App",
    description="A simple FastAPI app running in Docker",
    version="1.0.0"
)

# 기본 경로
@app.get("/")
def read_root():
    return {
        "message": "Hello from FastAPI in Docker! 🐳",
        "status": "success",
        "framework": "FastAPI"
    }

# 인사하는 경로
@app.get("/hello/{name}")
def say_hello(name: str):
    return {
        "message": f"Hello, {name}! 👋",
        "greeting": f"Welcome to our Dockerized FastAPI app, {name}!"
    }

# 건강 상태 확인
@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "fastapi-docker"}

# 서버 정보
@app.get("/info")
def server_info():
    import platform
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "server": "FastAPI with Docker"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)