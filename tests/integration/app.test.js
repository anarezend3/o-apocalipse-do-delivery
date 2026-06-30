const request = require('supertest');
const { createApp } = require('../../src/app');
const { CheckoutService } = require('../../src/services/CheckoutService');
const { PagamentoAprovado } = require('../../src/resultados/PagamentoAprovado');
const { PagamentoRecusado } = require('../../src/resultados/PagamentoRecusado');
const { PagamentoComErroInfraestrutura } = require('../../src/resultados/PagamentoComErroInfraestrutura');
const { Metricas } = require('../../src/infra/Metricas');
const { CircuitBreaker } = require('../../src/infra/CircuitBreaker');

const payload = {
  clienteEmail: 'cliente@entregasja.com',
  valor: 99.9,
  cartao: { numero: '4111111111111111', validade: '12/30', cvv: '123' },
};

function montar(resultado, ambiente = 'test') {
  const gatewayClient = { cobrar: jest.fn().mockResolvedValue(resultado) };
  const repository = {
    salvar: jest.fn(async (pedido) => {
      pedido.id = 1;
      return pedido;
    }),
  };
  const filaEmail = { publicar: jest.fn().mockResolvedValue(1) };
  const configuracaoCache = {
    obter: jest.fn().mockResolvedValue({ pagamentosAtivos: true }),
    limpar: jest.fn().mockResolvedValue(),
  };
  const checkoutService = new CheckoutService(
    gatewayClient,
    repository,
    filaEmail,
    configuracaoCache,
  );
  const app = createApp({
    checkoutService,
    configuracaoCache,
    metricas: new Metricas(),
    circuitBreaker: new CircuitBreaker(),
    ambiente,
  });
  return { app, gatewayClient, repository, filaEmail, configuracaoCache };
}

describe('API de checkout', () => {
  test('retorna 200 para pagamento aprovado', async () => {
    const contexto = montar(new PagamentoAprovado());
    const resposta = await request(contexto.app).post('/api/v1/checkout').send(payload);

    expect(resposta.status).toBe(200);
    expect(resposta.body.pedido.status).toBe('PROCESSADO');
    expect(contexto.filaEmail.publicar).toHaveBeenCalledTimes(1);
  });

  test('retorna 402 para pagamento recusado', async () => {
    const contexto = montar(new PagamentoRecusado('recusado'));
    const resposta = await request(contexto.app).post('/api/v1/checkout').send(payload);

    expect(resposta.status).toBe(402);
    expect(resposta.body.pedidoStatus).toBe('FALHOU');
    expect(contexto.filaEmail.publicar).not.toHaveBeenCalled();
  });

  test('retorna 500 controlado para infraestrutura indisponível', async () => {
    const contexto = montar(new PagamentoComErroInfraestrutura('timeout'));
    const resposta = await request(contexto.app).post('/api/v1/checkout').send(payload);

    expect(resposta.status).toBe(500);
    expect(resposta.body.pedidoStatus).toBe('ERRO_GATEWAY');
  });

  test('retorna 400 e não acessa dependências para payload inválido', async () => {
    const contexto = montar(new PagamentoAprovado());
    const resposta = await request(contexto.app)
      .post('/api/v1/checkout')
      .send({ clienteEmail: 'x', valor: 0, cartao: {} });

    expect(resposta.status).toBe(400);
    expect(contexto.gatewayClient.cobrar).not.toHaveBeenCalled();
    expect(contexto.repository.salvar).not.toHaveBeenCalled();
  });

  test('flush funciona apenas em teste ou homologação', async () => {
    const homologacao = montar(new PagamentoAprovado(), 'homologacao');
    expect((await request(homologacao.app).post('/api/v1/cache/flush')).status).toBe(200);
    expect(homologacao.configuracaoCache.limpar).toHaveBeenCalled();

    const producao = montar(new PagamentoAprovado(), 'production');
    expect((await request(producao.app).post('/api/v1/cache/flush')).status).toBe(404);
  });
});
