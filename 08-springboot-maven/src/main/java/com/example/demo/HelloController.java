// 요청을 처리하는 컨트롤러
// - @RestController: 반환값을 그대로 응답 본문으로 보냄 (Map은 JSON으로 자동 변환)
package com.example.demo;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    // 기본 경로: 앱이 정상 실행되는지 확인
    @GetMapping("/")
    public String home() {
        return "Hello from Spring Boot in Docker!";
    }

    // 경로 변수 테스트: /hello/World → {"message": "Hello, World!"}
    @GetMapping("/hello/{name}")
    public Map<String, String> hello(@PathVariable String name) {
        return Map.of("message", "Hello, " + name + "!");
    }
}