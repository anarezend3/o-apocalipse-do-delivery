const { createClient } = require('redis');

const FILA = 'fila:email';
const DLQ = 'fila:email:dlq';
const MAX_TENTATIVAS = 3;

async function enviarEmail(mensagem) {
  if (process.env.SIMULAR_FALHA_EMAIL === 'true') {
    throw new Error('smtp_indisponivel');
  }
  console.log(`email_enviado destinatario=${mensagem.destinatario} pedido=${mensagem.pedidoId}`);
}

async function iniciarWorker() {
  const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  redis.on('error', (erro) => console.error('redis_worker_error', erro.message));
  await redis.connect();

  while (redis.isOpen) {
    let item;
    try {
      item = await redis.brPop(FILA, 1);
    } catch (erro) {
      console.error('fila_email_indisponivel', erro.message);
      await new Promise((resolve) => setTimeout(resolve, 500));
      continue;
    }
    if (!item) continue;

    const mensagem = JSON.parse(item.element);
    try {
      await enviarEmail(mensagem);
    } catch (erro) {
      const atualizada = { ...mensagem, tentativas: mensagem.tentativas + 1, erro: erro.message };
      if (atualizada.tentativas >= MAX_TENTATIVAS) {
        await redis.lPush(DLQ, JSON.stringify(atualizada));
      } else {
        await redis.lPush(FILA, JSON.stringify(atualizada));
      }
    }
  }
}

iniciarWorker().catch((erro) => {
  console.error('worker_fatal', erro);
  process.exitCode = 1;
});
