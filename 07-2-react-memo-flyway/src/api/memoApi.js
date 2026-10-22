// 08-3 Spring Boot 메모 API 호출 모음 (axios + async/await)
//
//   GET    /api/memos        : 메모 전체 조회
//   POST   /api/memos        : 메모 저장   (본문: {"content": "..."}, 성공 201)
//   DELETE /api/memos/{id}   : 메모 삭제   (성공 204, 없으면 404)
//   GET    /actuator/health  : 앱 + DB 상태
//
// - 개발: Vite 프록시, 배포: nginx 가 경로 그대로 Spring Boot 로 전달
import axios from 'axios'

// 메모 API 용 (baseURL /api 는 그대로)
const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' },
})

export async function fetchMemos() {
  const response = await api.get('/memos')
  return response.data
}

export async function createMemo(content) {
  const response = await api.post('/memos', { content })
  return response.data
}

export async function deleteMemo(id) {
  await api.delete(`/memos/${id}`)
}

// [변경] 앱 상태 조회: /api 아래가 아니므로 api 인스턴스 대신 axios 로 직접 호출
// - DB가 끊기면 503 + {"status":"DOWN"} 이 오므로 503 도 정상 응답처럼 받음
export async function fetchHealth() {
  const response = await axios.get('/actuator/health', {
    timeout: 5000,
    validateStatus: (status) => status === 200 || status === 503,
  })
  return response.data
}

// 오류를 화면에 보여줄 문장으로 바꾸기 (변경 없음)
export function toErrorMessage(error) {
  if (error.response) {
    const { status, data } = error.response
    if (status === 502 || status === 504) {
      return '백엔드에 연결할 수 없습니다. Spring Boot 앱이 실행 중인지 확인하세요.'
    }
    return data?.message || `요청 실패 (HTTP ${status})`
  }
  if (error.code === 'ECONNABORTED') {
    return '응답 시간이 초과되었습니다.'
  }
  return '백엔드에 연결할 수 없습니다. Spring Boot 앱이 실행 중인지 확인하세요.'
}