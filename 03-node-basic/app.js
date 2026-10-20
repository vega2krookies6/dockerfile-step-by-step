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
        </ul>
      </body>
    </html>
  `);
});

app.get('/hello', (req, res) => {
  res.json({ message: 'Hello from Docker Container!' });
});

app.get('/info', (req, res) => {
  res.json({
    nodeVersion: process.version,
    platform: process.platform,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});