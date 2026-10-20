// React 앱 시작점
// - index.html의 #root 요소에 App 컴포넌트를 렌더링
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)