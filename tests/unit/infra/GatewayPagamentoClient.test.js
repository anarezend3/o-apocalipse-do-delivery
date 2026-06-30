const { GatewayPagamentoClient } = require('../../../src/infra/GatewayPagamentoClient');
const { CircuitBreaker } = require('../../../src/infra/CircuitBreaker');
const { PedidoBuilder } = require('../../builders/PedidoBuilder');

describe('GatewayPagamentoClient', () => {
  test('interpreta aprovação e recusa', async () => {
    const gateway = { cobrar: jest.fn().mockResolvedValueOnce({ status: 'APROVADO' }) };
    const client = new GatewayPagamentoClient(gateway, new CircuitBreaker());

    const aprovado = await client.cobrar(new PedidoBuilder().build());
    gateway.cobrar.mockResolvedValueOnce({ status: 'RECUSADO', motivo: 'limite' });
    const recusado = await client.cobrar(new PedidoBuilder().build());

    expect(aprovado.paraRespostaHttp({}).httpStatus).toBe(200);
    expect(recusado.paraRespostaHttp().httpStatus).toBe(402);
    expect(recusado.motivo).toBe('limite');
  });

  test('repete com backoff exponencial e recupera na segunda chamada', async () => {
    let agora = 0;
    const esperas = [];
    const gateway = {
      cobrar: jest.fn()
        .mockRejectedValueOnce(new Error('temporário'))
        .mockResolvedValueOnce({ status: 'APROVADO' }),
    };
    const client = new GatewayPagamentoClient(gateway, new CircuitBreaker(), {
      timeoutMs: 100,
      orcamentoTotalMs: 500,
      intervaloBackoffMs: 25,
      jitterMs: 0,
      agora: () => agora,
      aguardar: async (ms) => {
        esperas.push(ms);
        agora += ms;
      },
    });

    const resultado = await client.cobrar(new PedidoBuilder().build());

    expect(resultado.paraRespostaHttp({}).httpStatus).toBe(200);
    expect(gateway.cobrar).toHaveBeenCalledTimes(2);
    expect(esperas).toEqual([25]);
  });

  test('usa backoff exponencial e jitter nas tentativas sucessivas', async () => {
    let agora = 0;
    const esperas = [];
    const gateway = {
      cobrar: jest.fn()
        .mockRejectedValueOnce(new Error('um'))
        .mockRejectedValueOnce(new Error('dois'))
        .mockResolvedValueOnce({ status: 'APROVADO' }),
    };
    const client = new GatewayPagamentoClient(gateway, new CircuitBreaker(), {
      timeoutMs: 100,
      orcamentoTotalMs: 1000,
      intervaloBackoffMs: 20,
      jitterMs: 10,
      aleatorio: () => 0.5,
      agora: () => agora,
      aguardar: async (ms) => {
        esperas.push(ms);
        agora += ms;
      },
    });

    await client.cobrar(new PedidoBuilder().build());
    expect(esperas).toEqual([25, 45]);
  });

  test('respeita máximo de quatro chamadas e retorna fallback', async () => {
    const gateway = { cobrar: jest.fn().mockRejectedValue(new Error('fora')) };
    const client = new GatewayPagamentoClient(gateway, new CircuitBreaker(), {
      orcamentoTotalMs: 1000,
      intervaloBackoffMs: 0,
      jitterMs: 0,
      aguardar: async () => {},
    });

    const resultado = await client.cobrar(new PedidoBuilder().build());

    expect(gateway.cobrar).toHaveBeenCalledTimes(4);
    expect(resultado.paraRespostaHttp().httpStatus).toBe(500);
  });

  test('interrompe chamada pendente no timeout', async () => {
    const gateway = { cobrar: jest.fn(() => new Promise(() => {})) };
    const client = new GatewayPagamentoClient(gateway, new CircuitBreaker(), {
      timeoutMs: 5,
      orcamentoTotalMs: 10,
      maxRetentativas: 0,
    });

    const resultado = await client.cobrar(new PedidoBuilder().build());

    expect(resultado.erro).toBe('Timeout: gateway de pagamento não respondeu em 5ms');
    expect(gateway.cobrar).toHaveBeenCalledTimes(1);
  });

  test('não inicia chamada quando o orçamento total é zero', async () => {
    const gateway = { cobrar: jest.fn() };
    const client = new GatewayPagamentoClient(gateway, new CircuitBreaker(), {
      orcamentoTotalMs: 0,
    });
    const resultado = await client.cobrar(new PedidoBuilder().build());
    expect(gateway.cobrar).not.toHaveBeenCalled();
    expect(resultado.erro).toBe('orcamento_de_tempo_esgotado');
  });

  test('expõe os valores padrão da política resiliente', () => {
    const client = new GatewayPagamentoClient({ cobrar: jest.fn() }, new CircuitBreaker());
    expect(client.timeoutMs).toBe(2000);
    expect(client.orcamentoTotalMs).toBe(2500);
    expect(client.maxRetentativas).toBe(3);
    expect(client.intervaloBackoffMs).toBe(100);
    expect(client.jitterMs).toBe(100);
  });

  test('não chama a rede quando o circuit breaker está aberto', async () => {
    const circuitBreaker = new CircuitBreaker({ limiteAmostras: 1 });
    circuitBreaker.registrarFalha();
    const gateway = { cobrar: jest.fn() };
    const client = new GatewayPagamentoClient(gateway, circuitBreaker);

    const resultado = await client.cobrar(new PedidoBuilder().build());

    expect(resultado.erro).toBe('circuit_breaker_aberto');
    expect(gateway.cobrar).not.toHaveBeenCalled();
  });
});
