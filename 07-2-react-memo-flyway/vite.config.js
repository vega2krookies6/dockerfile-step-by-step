// Vite 설정
// - 개발 서버(npm run dev)에서 /api, /actuator 요청을 Spring Boot 로 그대로 전달 (프록시)
//   브라우저 → http://localhost:5173/api/memos → (Vite) → http://localhost:8080/api/memos
// - 브라우저 입장에서는 같은 주소(5173)로 요청하므로 CORS 설정이 필요 없음
// - 백엔드 주소는 .env.development 의 VITE_API_TARGET 으로 바꿀 수 있음
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_API_TARGET || 'http://localhost:8080'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        // [변경] rewrite 삭제: 백엔드 경로도 /api/memos 이므로 그대로 전달
        '/api': {
          target,
          changeOrigin: true,
        },
        // [추가] 상태 배지용 (/actuator/health 는 /api 아래가 아님)
        '/actuator': {
          target,
          changeOrigin: true,
        },
      },
    },
  }
})