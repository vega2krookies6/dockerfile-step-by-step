// 메모 1개
// - createdAt, updatedAt 은 Spring Boot 의 LocalDateTime 이라
//   "2026-10-22T02:56:00.123456" 처럼 시간대 없이 옴 → 브라우저 시간대로 그대로 표시
// - updatedAt 은 V3 마이그레이션으로 추가된 컬럼 (작성 시각과 다를 때만 표시)

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function MemoItem({ memo, onDelete, deleting }) {
  const edited = memo.updatedAt && memo.updatedAt !== memo.createdAt

  function handleDelete() {
    if (window.confirm(`#${memo.id} 메모를 삭제할까요?`)) {
      onDelete(memo.id)
    }
  }

  return (
    <li className="memo-item">
      <p className="memo-content">{memo.content}</p>
      <div className="memo-meta">
        <span className="memo-id">#{memo.id}</span>
        <time dateTime={memo.createdAt}>{formatDate(memo.createdAt)}</time>
        {edited && <span>(수정 {formatDate(memo.updatedAt)})</span>}
        <button type="button" className="delete" onClick={handleDelete} disabled={deleting}>
          {deleting ? '삭제 중…' : '삭제'}
        </button>
      </div>
    </li>
  )
}
