// 요청을 처리하는 컨트롤러
// - @RestController: 반환값을 JSON으로 자동 변환해 응답
//
//   GET    /             : 앱 안내 (DB 사용 안 함)
//   GET    /memos        : 메모 전체 조회   → SELECT
//   GET    /memos/{id}   : 메모 1개 조회    → SELECT ... WHERE id = ?
//   POST   /memos        : 메모 저장        → INSERT   (요청 본문: {"content": "..."})
//   DELETE /memos/{id}   : 메모 삭제        → DELETE   (행 삭제는 DELETE 권한이라 DROP 회수와 무관)
package com.example.demo;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class MemoController {

    private final MemoRepository memoRepository;

    // 생성자 주입: Spring이 MemoRepository 구현체를 자동으로 넣어 줌
    public MemoController(MemoRepository memoRepository) {
        this.memoRepository = memoRepository;
    }

    // 요청 본문 형식 ({"content": "..."})
    public record MemoRequest(String content) {
    }

    // 기본 경로: 앱 안내
    @GetMapping("/")
    public Map<String, String> home() {
        return Map.of(
                "message", "Spring Boot + Flyway + MariaDB (Docker Compose)",
                "memos", "GET /memos, POST /memos, DELETE /memos/{id}",
                "health", "/actuator/health");
    }

    // 메모 전체 조회
    @GetMapping("/memos")
    public List<Memo> findAll() {
        return memoRepository.findAll();
    }

    // 메모 1개 조회 (없으면 404)
    @GetMapping("/memos/{id}")
    public Memo findOne(@PathVariable Long id) {
        return memoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "memo not found: " + id));
    }

    // 메모 저장 (성공 시 201 Created)
    @PostMapping("/memos")
    @ResponseStatus(HttpStatus.CREATED)
    public Memo create(@RequestBody MemoRequest request) {
        if (request == null || request.content() == null || request.content().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "content is required");
        }
        return memoRepository.save(new Memo(request.content()));
    }

    // 메모 삭제 (성공 시 204 No Content, 없으면 404)
    @DeleteMapping("/memos/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!memoRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "memo not found: " + id);
        }
        memoRepository.deleteById(id);
    }
}
