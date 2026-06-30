const { Pool } = require('pg');
const { createClient } = require('redis');
const { CheckoutService } = require('./services/CheckoutService');
const { CircuitBreaker } = require('./infra/CircuitBreaker');
const { GatewayPagamentoClient } = require('./infra/GatewayPagamentoClient');
const { GatewayHttp } = require('./infra/GatewayHttp');
const { PedidoRepositoryPostgres } = require('./infra/PedidoRepositoryPostgres');
const { ConfiguracaoRepositoryPostgres } = require('./infra/ConfiguracaoRepositoryPostgres');
const { ConfiguracaoCheckoutCache } = require('./infra/ConfiguracaoCheckoutCache');
const { FilaEmailRedis } = require('./infra/FilaEmailRedis');
const { Metricas } = require('./infra/Metricas');

async function criarDependencias() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/entregasja',
    max: Number(process.env.DB_POOL_MAX || 20),
  });

  const redis = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      connectTimeout: 1000,
      reconnectStrategy: (tentativas) => Math.min(tentativas * 100, 1000),
    },
  });
  redis.on('error', (erro) => console.error('redis_error', erro.message));
  await redis.connect();

  const metricas = new Metricas();
  const circuitBreaker = new CircuitBreaker({
    limiteAmostras: Number(process.env.CB_AMOSTRAS || 10),
    limiteTaxaFalha: Number(process.env.CB_TAXA_FALHA || 0.5),
    tempoResetMs: Number(process.env.CB_RESET_MS || 5000),
  });
  const gatewayHttp = new GatewayHttp({
    baseUrl: process.env.GATEWAY_URL || 'http://localhost:4000',
  });
  const gatewayClient = new GatewayPagamentoClient(gatewayHttp, circuitBreaker, {
    timeoutMs: Number(process.env.GATEWAY_TIMEOUT_MS || 2000),
    orcamentoTotalMs: Number(process.env.CHECKOUT_BUDGET_MS || 2500),
    maxRetentativas: Number(process.env.GATEWAY_RETRIES || 3),
    intervaloBackoffMs: Number(process.env.GATEWAY_BACKOFF_MS || 100),
    jitterMs: Number(process.env.GATEWAY_JITTER_MS || 100),
  });
  const configuracaoRepository = new ConfiguracaoRepositoryPostgres(pool, metricas);
  const configuracaoCache = new ConfiguracaoCheckoutCache({
    redis,
    repository: configuracaoRepository,
    metricas,
  });
  const pedidoRepository = new PedidoRepositoryPostgres(pool);
  const filaEmail = new FilaEmailRedis(redis);
  const checkoutService = new CheckoutService(
    gatewayClient,
    pedidoRepository,
    filaEmail,
    configuracaoCache,
  );

  return {
    pool,
    redis,
    metricas,
    circuitBreaker,
    configuracaoCache,
    checkoutService,
  };
}

module.exports = { criarDependencias };
