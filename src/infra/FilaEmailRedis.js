class FilaEmailRedis {
  constructor(redis, { fila = 'fila:email', dlq = 'fila:email:dlq' } = {}) {
    this.redis = redis;
    this.fila = fila;
    this.dlq = dlq;
  }

  publicar(mensagem) {
    return this.redis.lPush(this.fila, JSON.stringify({
      ...mensagem,
      tentativas: mensagem.tentativas || 0,
      criadoEm: new Date().toISOString(),
    }));
  }
}

module.exports = { FilaEmailRedis };
