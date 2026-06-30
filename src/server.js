const { createApp } = require('./app');
const { criarDependencias } = require('./bootstrap');

async function iniciar() {
  const dependencias = await criarDependencias();
  const app = createApp({
    ...dependencias,
    ambiente: process.env.NODE_ENV,
  });
  const porta = Number(process.env.PORT || 3000);
  const servidor = app.listen(porta, () => {
    console.log(`Servidor EntregasJa na porta ${porta}`);
  });

  const encerrar = async () => {
    servidor.close();
    await dependencias.redis.quit();
    await dependencias.pool.end();
  };
  process.once('SIGTERM', encerrar);
  process.once('SIGINT', encerrar);
}

iniciar().catch((erro) => {
  console.error('falha_ao_iniciar', erro);
  process.exitCode = 1;
});
