// 간단한 Java 웹 서버 (외부 라이브러리 없이 JDK 기본 기능만 사용)
// - /       : 인사 메시지 반환
// - /health : 상태 확인용 경로 (헬스체크에 활용)

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

public class Main {
    public static void main(String[] args) throws IOException {
        // 포트 설정
        // - 환경 변수 PORT가 있으면 그 값을, 없으면 8080 사용
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));

        // 서버 생성
        // - 0.0.0.0(모든 주소)에서 접속을 받으므로 컨테이너 밖에서도 접속 가능
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);

        // 경로별 응답 등록
        server.createContext("/", exchange -> respond(exchange, "Hello from Java 17 in Docker!"));
        server.createContext("/health", exchange -> respond(exchange, "OK"));

        // 서버 시작
        // - 출력 내용은 docker logs 명령으로 확인 가능
        server.start();
        System.out.println("Server started on port " + port);
    }

    // 텍스트 응답을 보내는 공통 함수
    // - UTF-8로 인코딩해 한글도 깨지지 않도록 처리
    private static void respond(HttpExchange exchange, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=UTF-8");
        exchange.sendResponseHeaders(200, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }
}