const http = require('http');

const options = {
  host: 'localhost',
  port: process.env.PORT || 3000,
  path: '/health',
  timeout: 2000
};

console.log('Starting health check...'); // 시작 로그

const request = http.request(options, (res) => {
  const statusCode = res.statusCode;
  const message = `Health check PASSED with status: ${statusCode}`;
  
  // 표준 출력으로 로그 남기기 (docker inspect에서 확인 가능)
  console.log(message);
  
  // 표준 에러로도 출력 (더 눈에 띔)
  console.error('HEALTHCHECK:', message);
  
  process.exit(statusCode === 200 ? 0 : 1);
});

request.on('error', (err) => {
  const errorMessage = `Health check FAILED: ${err.message}`;
  console.error('HEALTHCHECK ERROR:', errorMessage);
  process.exit(1);
});

// 요청 타임아웃 설정
request.setTimeout(2000, () => {
  console.error('HEALTHCHECK TIMEOUT: Request timed out');
  request.destroy();
  process.exit(1);
});

request.end();