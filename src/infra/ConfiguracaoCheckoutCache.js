const esperarPadrao = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class ConfiguracaoCheckoutCache {
  constructor({
    redis,
    repository,
    metricas,
    ttlSegundos = 30,
    lockTtlMs = 3000,
    operacaoTimeoutMs = 200,
    aguardar = esperarPadrao,
    aleatorio = Math.random,
  }) {
    this.redis = redis;
    this.repository = repository;
    this.metricas = metricas;
    this.ttlSegundos = ttlSegundos;
    this.lockTtlMs = lockTtlMs;
    this.operacaoTimeoutMs = operacaoTimeoutMs;
    this.aguardar = aguardar;
    this.aleatorio = aleatorio;
    this.ultimaConfiguracao = null;
    this.carregamentoEmAndamento = null;
    this.cacheKey = 'checkout:config:v1';
    this.lockKey = `${this.cacheKey}:lock`;
  }

  async obter() {
    if (this.carregamentoEmAndamento) return this.carregamentoEmAndamento;

    try {
      const valor = await this._redis(this.redis.get(this.cacheKey));
      if (valor) {
        this.metricas.cacheHit += 1;
        this.ultimaConfiguracao = JSON.parse(valor);
        return this.ultimaConfiguracao;
      }
      this.metricas.cacheMiss += 1;
    } catch (erro) {
      this.metricas.cacheFallback += 1;
      if (this.ultimaConfiguracao) return this.ultimaConfiguracao;
      return this.repository.obter();
    }

    this.carregamentoEmAndamento = this._carregarProtegido();
    try {
      return await this.carregamentoEmAndamento;
    } finally {
      this.carregamentoEmAndamento = null;
    }
  }

  async _carregarProtegido() {
    const token = `${process.pid}-${Date.now()}-${this.aleatorio()}`;
    let adquiriuLock = false;

    try {
      adquiriuLock = (await this._redis(this.redis.set(this.lockKey, token, {
        NX: true,
        PX: this.lockTtlMs,
      }))) === 'OK';
    } catch (erro) {
      return this._fallbackOuBanco();
    }

    try {
      if (!adquiriuLock) {
        for (let tentativa = 0; tentativa < 5; tentativa++) {
          await this.aguardar((25 * (2 ** tentativa)) + Math.floor(this.aleatorio() * 25));
          const valor = await this._redis(this.redis.get(this.cacheKey));
          if (valor) {
            this.metricas.cacheHit += 1;
            this.ultimaConfiguracao = JSON.parse(valor);
            return this.ultimaConfiguracao;
          }
        }
      }

      const configuracao = await this.repository.obter();
      this.ultimaConfiguracao = configuracao;
      try {
        await this._redis(this.redis.set(this.cacheKey, JSON.stringify(configuracao), {
          EX: this.ttlSegundos,
        }));
      } catch (erro) {
        this.metricas.cacheFallback += 1;
      }
      return configuracao;
    } finally {
      if (adquiriuLock) await this._liberarLock(token);
    }
  }

  async _fallbackOuBanco() {
    this.metricas.cacheFallback += 1;
    if (this.ultimaConfiguracao) return this.ultimaConfiguracao;

    return this.repository.obter();
  }

  async _liberarLock(token) {
    try {
      const atual = await this._redis(this.redis.get(this.lockKey));
      if (atual === token) await this._redis(this.redis.del(this.lockKey));
    } catch (erro) {
      // O TTL remove o lock mesmo se o Redis falhar durante a liberação.
    }
  }

  async limpar() {
    await this._redis(this.redis.del(this.cacheKey));
  }

  _redis(operacao) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('redis_timeout')),
        this.operacaoTimeoutMs,
      );
      Promise.resolve(operacao).then(
        (valor) => {
          clearTimeout(timeout);
          resolve(valor);
        },
        (erro) => {
          clearTimeout(timeout);
          reject(erro);
        },
      );
    });
  }
}

module.exports = { ConfiguracaoCheckoutCache };
