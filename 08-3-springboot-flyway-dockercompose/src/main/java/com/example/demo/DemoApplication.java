// Spring Boot 앱 시작점
// - @SpringBootApplication: 설정, 컴포넌트 스캔, 자동 구성을 한 번에 활성화
// - 같은 패키지(com.example.demo) 아래의 Entity, Repository, Controller를 자동으로 찾아 등록
package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}
