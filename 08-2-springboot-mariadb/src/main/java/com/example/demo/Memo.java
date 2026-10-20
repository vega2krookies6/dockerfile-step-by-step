// 메모 Entity (DB의 memo 테이블과 1:1로 연결되는 자바 클래스)
// - spring.jpa.hibernate.ddl-auto=update 설정으로, 앱 시작 시 테이블이 없으면 자동 생성
// - 생성되는 테이블: memo (id BIGINT AUTO_INCREMENT, content VARCHAR(500), created_at DATETIME)
package com.example.demo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.LocalDateTime;

@Entity
public class Memo {

    // 기본 키, MariaDB의 AUTO_INCREMENT로 자동 증가
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 메모 내용 (비어 있을 수 없음, 최대 500자)
    @Column(nullable = false, length = 500)
    private String content;

    // 작성 시각 (저장 후 바뀌지 않음)
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // JPA가 DB에서 읽어 온 값을 채울 때 사용하는 기본 생성자 (직접 쓰지 않음)
    protected Memo() {
    }

    public Memo(String content) {
        this.content = content;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getContent() {
        return content;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
