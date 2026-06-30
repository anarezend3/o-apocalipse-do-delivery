class Metricas {
  constructor() {
    this.cacheHit = 0;
    this.cacheMiss = 0;
    this.cacheFallback = 0;
    this.consultasBanco = 0;
  }

  snapshot(circuitBreaker) {
    return {
      cache: {
        hit: this.cacheHit,
        miss: this.cacheMiss,
        fallback: this.cacheFallback,
      },
      banco: { consultasConfiguracao: this.consultasBanco },
      circuitBreaker: circuitBreaker.estado(),
    };
  }
}

module.exports = { Metricas };
