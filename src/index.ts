import express, { Request, Response } from 'express';

const app = express();

app.get('/', (req: Request, res: Response) => {
  res.send('Servidor Express + TypeScript funcionando!');
});

app.get('/hello', (req: Request, res: Response) => {
  res.send('Hello world!');
});

export default app;
