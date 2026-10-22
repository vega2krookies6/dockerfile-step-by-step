// 앱 + DB 상태 표시 (/actuator/health)
// - status: 앱 전체 상태 (UP / DOWN)
// - components.db.status: MariaDB 연결 상태 (show-details=always 설정 덕분에 보임)
import { useEffect, useState } from 'react'
import { fetchHealth } from '../api/memoApi'

export default function HealthBadge() {
  const [health, setHealth] = useState(null) // null = 확인 중
  const [unreachable, setUnreachable] = useState(false)

  useEffect(() => {
    let ignore = false

    function check() {
      fetchHealth()
        .then((data) => {
          if (ignore) return
          setHealth(data)
          setUnreachable(false)
        })
        .catch(() => {
          if (ignore) return
          setHealth(null)
          setUnreachable(true)
        })
    }

    check()
    // 10초마다 다시 확인
    const timer = setInterval(check, 10000)
    return () => {
      ignore = true
      clearInterval(timer)
    }
  }, [])

  if (unreachable) {
    return <span className="badge badge-down">앱 연결 안 됨</span>
  }
  if (!health) {
    return <span className="badge">확인 중…</span>
  }

  const appUp = health.status === 'UP'
  const dbStatus = health.components?.db?.status

  return (
    <span className="badges">
      <span className={`badge ${appUp ? 'badge-up' : 'badge-down'}`}>앱 {health.status}</span>
      {dbStatus && (
        <span className={`badge ${dbStatus === 'UP' ? 'badge-up' : 'badge-down'}`}>DB {dbStatus}</span>
      )}
    </span>
  )
}
