// api/server.ts
import express from 'express';
import serverless from 'serverless-http';

const app = express();

app.get('/', (req, res) => {
  res.send('Servidor Express rodando na Vercel!');
});

export default serverless(app);
