const { CheckoutService } = require('../../../src/services/CheckoutService');
const { PagamentoAprovado } = require('../../../src/resultados/PagamentoAprovado');
const { PagamentoRecusado } = require('../../../src/resultados/PagamentoRecusado');
const { PagamentoComErroInfraestrutura } = require('../../../src/resultados/PagamentoComErroInfraestrutura');
const { PedidoBuilder } = require('../../builders/PedidoBuilder');

describe('CheckoutService', () => {
  let pedido;
  let gatewayClient;
  let repository;
  let filaEmail;

  beforeEach(() => {
    pedido = new PedidoBuilder().build();
    gatewayClient = { cobrar: jest.fn() };
    repository = {
      salvar: jest.fn(async (item) => {
        item.id = 10;
        return item;
      }),
    };
    filaEmail = { publicar: jest.fn().mockResolvedValue(1) };
  });

  test('aprova, persiste e publica email sem aguardar a entrega', async () => {
    gatewayClient.cobrar.mockResolvedValue(new PagamentoAprovado());
    const service = new CheckoutService(gatewayClient, repository, filaEmail);

    const resposta = await service.processar(pedido);

    expect(resposta.httpStatus).toBe(200);
    expect(pedido.status).toBe('PROCESSADO');
    expect(repository.salvar).toHaveBeenCalledWith(pedido);
    expect(filaEmail.publicar).toHaveBeenCalledWith(expect.objectContaining({
      pedidoId: 10,
      destinatario: 'joao@email.com',
    }));
  });

  test('recusa com 402, persiste e não publica email', async () => {
    gatewayClient.cobrar.mockResolvedValue(new PagamentoRecusado('Saldo insuficiente'));
    const service = new CheckoutService(gatewayClient, repository, filaEmail);

    const resposta = await service.processar(pedido);

    expect(resposta).toEqual({ httpStatus: 402, erro: 'Saldo insuficiente' });
    expect(pedido.status).toBe('FALHOU');
    expect(repository.salvar).toHaveBeenCalledTimes(1);
    expect(filaEmail.publicar).not.toHaveBeenCalled();
  });

  test('persiste ERRO_GATEWAY quando o cliente resiliente retorna fallback', async () => {
    gatewayClient.cobrar.mockResolvedValue(new PagamentoComErroInfraestrutura('timeout'));
    const service = new CheckoutService(gatewayClient, repository, filaEmail);

    const resposta = await service.processar(pedido);

    expect(resposta.httpStatus).toBe(500);
    expect(resposta.erro).toBe('timeout');
    expect(pedido.status).toBe('ERRO_GATEWAY');
    expect(filaEmail.publicar).not.toHaveBeenCalled();
  });

  test('converte exceção inesperada do gateway em falha controlada', async () => {
    gatewayClient.cobrar.mockRejectedValue(new Error('rede'));
    const service = new CheckoutService(gatewayClient, repository, filaEmail);

    const resposta = await service.processar(pedido);

    expect(resposta.httpStatus).toBe(500);
    expect(pedido.status).toBe('ERRO_GATEWAY');
  });

  test('falha na fila não refaz cobrança nem altera pagamento aprovado', async () => {
    gatewayClient.cobrar.mockResolvedValue(new PagamentoAprovado());
    filaEmail.publicar.mockRejectedValue(new Error('redis'));
    const service = new CheckoutService(gatewayClient, repository, filaEmail);

    const resposta = await service.processar(pedido);
    await Promise.resolve();

    expect(resposta.httpStatus).toBe(200);
    expect(gatewayClient.cobrar).toHaveBeenCalledTimes(1);
  });

  test('consulta configuração antes de cobrar', async () => {
    const ordem = [];
    const configuracaoCache = { obter: jest.fn(async () => ordem.push('config')) };
    gatewayClient.cobrar.mockImplementation(async () => {
      ordem.push('gateway');
      return new PagamentoAprovado();
    });
    const service = new CheckoutService(
      gatewayClient,
      repository,
      filaEmail,
      configuracaoCache,
    );

    await service.processar(pedido);
    expect(ordem).toEqual(['config', 'gateway']);
  });

  test('resultados de falha declaram explicitamente que não enviam email', () => {
    expect(new PagamentoRecusado('x').deveEnviarEmailConfirmacao()).toBe(false);
    expect(new PagamentoComErroInfraestrutura('x').deveEnviarEmailConfirmacao()).toBe(false);
  });
});
