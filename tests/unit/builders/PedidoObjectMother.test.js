const { PedidoObjectMother } = require('../../builders/PedidoObjectMother');

describe('PedidoObjectMother', () => {

    test('pedido válido', () => {

        const pedido =
            PedidoObjectMother.pedidoValido();

        expect(pedido.valor).toBeGreaterThan(0);

    });

    test('pedido com valor alto', () => {
        expect(PedidoObjectMother.pedidoComValorAlto().valor).toBe(100000);
    });

});
