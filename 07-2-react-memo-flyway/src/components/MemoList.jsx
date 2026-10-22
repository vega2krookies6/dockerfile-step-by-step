// 메모 목록
// - 서버(findAll)는 id 오름차순으로 주므로 화면에서는 최신 메모가 위로 오도록 뒤집음
import MemoItem from './MemoItem'

export default function MemoList({ memos, loading, onDelete, deletingId }) {
  if (loading) {
    return <p className="empty">불러오는 중…</p>
  }
  if (memos.length === 0) {
    return <p className="empty">메모가 없습니다. 첫 메모를 남겨 보세요.</p>
  }

  const sorted = [...memos].sort((a, b) => b.id - a.id)

  return (
    <ul className="memo-list">
      {sorted.map((memo) => (
        <MemoItem
          key={memo.id}
          memo={memo}
          onDelete={onDelete}
          deleting={deletingId === memo.id}
        />
      ))}
    </ul>
  )
}
