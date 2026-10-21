// 메모 Repository (DB 조회/저장 담당)
// - 인터페이스만 선언하면 Spring Data JPA가 구현을 자동으로 만들어 줌
// - findAll(), findById(), save(), deleteById() 등을 SQL 없이 바로 사용 가능
package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MemoRepository extends JpaRepository<Memo, Long> {
}
