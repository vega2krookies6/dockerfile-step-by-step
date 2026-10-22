// 메모 입력 폼
// - content 는 DB 컬럼 VARCHAR(500) 이므로 500자까지만 입력 가능
// - 빈 내용은 서버도 400 으로 거절하지만, 보내기 전에 막음
import { useState } from 'react'

const MAX_LENGTH = 500

export default function MemoForm({ onSubmit, disabled }) {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  const trimmed = content.trim()

  async function handleSubmit(event) {
    event.preventDefault()
    if (!trimmed || saving) return

    setSaving(true)
    const ok = await onSubmit(trimmed)
    setSaving(false)
    if (ok) setContent('') // 저장에 성공했을 때만 입력창 비우기
  }

  // Ctrl+Enter (Mac: Cmd+Enter) 로 바로 저장
  function handleKeyDown(event) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      handleSubmit(event)
    }
  }

  return (
    <form className="memo-form" onSubmit={handleSubmit}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={MAX_LENGTH}
        rows={3}
        placeholder="메모를 입력하세요 (Ctrl+Enter 로 저장)"
        aria-label="메모 내용"
      />
      <div className="form-footer">
        <span className="counter">
          {content.length} / {MAX_LENGTH}
        </span>
        <button type="submit" disabled={!trimmed || saving || disabled}>
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </form>
  )
}
