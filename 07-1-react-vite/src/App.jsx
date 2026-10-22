// 간단한 카운터 컴포넌트
// - useState로 상태를 관리하고 버튼 클릭 시 화면이 갱신됨
import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <main style={{ fontFamily: 'sans-serif', textAlign: 'center', marginTop: '80px' }}>
      <h1>React + Vite in Docker</h1>
      <p>Nginx 컨테이너에서 실행 중인 React 앱입니다.</p>
      <button onClick={() => setCount(count + 1)} style={{ fontSize: '18px', padding: '8px 20px' }}>
        클릭 횟수: {count}
      </button>
    </main>
  )
}