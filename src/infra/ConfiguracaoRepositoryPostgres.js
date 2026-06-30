class ConfiguracaoRepositoryPostgres {
  constructor(pool, metricas) {
    this.pool = pool;
    this.metricas = metricas;
  }

  async obter() {
    this.metricas.consultasBanco += 1;
    const { rows } = await this.pool.query(
      'SELECT valor FROM configuracoes WHERE chave = $1',
      ['checkout'],
    );
    if (!rows[0]) throw new Error('configuracao_checkout_ausente');
    return rows[0].valor;
  }
}

module.exports = { ConfiguracaoRepositoryPostgres };
