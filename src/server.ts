import express, { Request, Response } from 'express';

const app = express();

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Servidor funcionando com TypeScript!');
});

app.listen(3000, () => {
  console.log('🚀 Servidor rodando na porta 3000');
});
