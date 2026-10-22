// 메모 앱 화면
// - 메모 목록 상태(memos)를 여기서 관리하고, 하위 컴포넌트에는 함수만 내려줌
// - 저장/삭제 후 목록 전체를 다시 받지 않고 상태만 고침 (요청 1번으로 끝남)
import { useEffect, useState } from 'react'
import { createMemo, deleteMemo, fetchMemos, toErrorMessage } from './api/memoApi'
import HealthBadge from './components/HealthBadge'
import MemoForm from './components/MemoForm'
import MemoList from './components/MemoList'

export default function App() {
  const [memos, setMemos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  // 목록 불러오기
  async function loadMemos() {
    setLoading(true)
    setError('')
    try {
      setMemos(await fetchMemos())
    } catch (e) {
      setError(toErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  // 처음 화면이 뜰 때 한 번 불러오기
  // - loading 의 처음 값이 true 라서 여기서는 결과만 반영
  // - ignore: 응답 전에 화면이 사라지면(StrictMode 재실행 등) 결과를 버림
  useEffect(() => {
    let ignore = false
    fetchMemos()
      .then((data) => {
        if (!ignore) setMemos(data)
      })
      .catch((e) => {
        if (!ignore) setError(toErrorMessage(e))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [])

  // 저장: 성공하면 true 를 돌려줘서 입력창을 비우게 함
  async function handleCreate(content) {
    setError('')
    try {
      const saved = await createMemo(content)
      setMemos((prev) => [...prev, saved])
      return true
    } catch (e) {
      setError(toErrorMessage(e))
      return false
    }
  }

  // 삭제: 404(이미 지워짐)여도 화면에서는 없애기
  async function handleDelete(id) {
    setError('')
    setDeletingId(id)
    try {
      await deleteMemo(id)
      setMemos((prev) => prev.filter((memo) => memo.id !== id))
    } catch (e) {
      if (e.response?.status === 404) {
        setMemos((prev) => prev.filter((memo) => memo.id !== id))
      } else {
        setError(toErrorMessage(e))
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <h1>메모</h1>
          <p className="subtitle">Spring Boot + Flyway + MariaDB</p>
        </div>
        <HealthBadge />
      </header>

      <MemoForm onSubmit={handleCreate} />

      {error && (
        <div className="error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={loadMemos}>
            다시 시도
          </button>
        </div>
      )}

      <section>
        <div className="list-header">
          <h2>
            전체 <span className="count">{memos.length}</span>
          </h2>
          <button type="button" className="ghost" onClick={loadMemos} disabled={loading}>
            새로고침
          </button>
        </div>
        <MemoList memos={memos} loading={loading} onDelete={handleDelete} deletingId={deletingId} />
      </section>
    </main>
  )
}
