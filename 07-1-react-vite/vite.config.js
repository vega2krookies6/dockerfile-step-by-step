// Vite 설정 파일
// - React 플러그인을 등록해 JSX 변환과 빠른 새로고침(HMR) 지원
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})