const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send(`
    <html>
      <body style="font-family: Arial; padding: 20px;">
        <h1>🎉 Node.js Docker App!</h1>
        <p>Server is running on port ${port}</p>
        <p>Environment: ${process.env.NODE_ENV}</p>
        <ul>
          <li><a href="/hello">Say Hello</a></li>
          <li><a href="/info">Container Info</a></li>
          <li><a href="/health">Health Check</a></li>
        </ul>
      </body>
    </html>
  `);
});

// healthcheck.js에서 사용할 간단한 라우트
app.get('/health', (req, res) => {
  console.log('Health check endpoint called at', new Date().toISOString());
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'node-docker-app'
  });
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});