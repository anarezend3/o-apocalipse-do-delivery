const { CheckoutService } = require('../../../src/services/CheckoutService');
const { PedidoBuilder } = require('../../builders/PedidoBuilder');

describe('CheckoutService', () => {

    let gatewayStub;
    let emailMock;
    let pedidoRepositoryMock;
    let service;
    let pedido;

    beforeEach(() => {

        pedido = new PedidoBuilder().build();

        gatewayStub = {
            cobrar: jest.fn()
        };

        emailMock = {
            enviarConfirmacao: jest.fn()
        };

        pedidoRepositoryMock = {
            salvar: jest.fn()
        };

        service = new CheckoutService(
            gatewayStub,
            pedidoRepositoryMock,
            emailMock
        );

    });

    test('deve aprovar um pagamento', async () => {

        gatewayStub.cobrar.mockResolvedValue({
            status: 'APROVADO'
        });

        const resposta = await service.processar(pedido);

        expect(resposta.httpStatus).toBe(200);

        expect(emailMock.enviarConfirmacao)
            .toHaveBeenCalledTimes(1);

        expect(pedidoRepositoryMock.salvar)
            .toHaveBeenCalledTimes(1);

    });

    test('não deve enviar email quando o cartão for recusado', async () => {

        gatewayStub.cobrar.mockResolvedValue({
            status: 'RECUSADO',
            motivo: 'Saldo insuficiente'
        });

        const resposta = await service.processar(pedido);

        expect(resposta.httpStatus).toBe(402);

        expect(emailMock.enviarConfirmacao)
            .not.toHaveBeenCalled();

    });

    test('deve retornar erro quando ocorrer falha de infraestrutura', async () => {

        gatewayStub.cobrar.mockRejectedValue(
            new Error('Gateway indisponível')
        );

        const resposta = await service.processar(pedido);

        expect(resposta.httpStatus).toBe(500);

        expect(emailMock.enviarConfirmacao)
            .not.toHaveBeenCalled();

    });

    test('deve salvar o pedido mesmo quando o pagamento falhar', async () => {

        gatewayStub.cobrar.mockResolvedValue({
            status: 'RECUSADO'
        });

        await service.processar(pedido);

        expect(pedidoRepositoryMock.salvar)
            .toHaveBeenCalledTimes(1);

    });

    test('deve chamar o gateway apenas uma vez', async () => {

        gatewayStub.cobrar.mockResolvedValue({
            status: 'APROVADO'
        });

        await service.processar(pedido);

        expect(gatewayStub.cobrar)
            .toHaveBeenCalledTimes(1);

    });

    test('deve retornar erro quando ocorrer timeout', async () => {

    gatewayStub.cobrar.mockRejectedValue(
        new Error('Timeout')
    );

    const resposta = await service.processar(pedido);

    expect(resposta.httpStatus).toBe(500);

    expect(emailMock.enviarConfirmacao)
        .not.toHaveBeenCalled();

});
test('deve tentar cobrar novamente quando ocorrer falha temporária', async () => {

    gatewayStub.cobrar
        .mockRejectedValueOnce(new Error('Erro temporário'))
        .mockResolvedValue({
            status: 'APROVADO'
        });

    await service.processar(pedido);

    expect(gatewayStub.cobrar)
        .toHaveBeenCalledTimes(1);

});

});