const express = require('express');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.post('/cobrar', async (req, res) => {
  const final = String(req.body.cartao?.numero || '').slice(-4);
  if (final === '0002') {
    return res.json({ status: 'RECUSADO', motivo: 'Cartão recusado' });
  }
  if (final === '0005') {
    return res.status(500).json({ erro: 'Falha simulada' });
  }
  return res.json({ status: 'APROVADO' });
});

const porta = Number(process.env.PORT || 4000);
app.listen(porta, () => console.log(`Gateway mock na porta ${porta}`));
