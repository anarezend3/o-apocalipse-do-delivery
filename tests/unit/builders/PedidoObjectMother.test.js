const { PedidoObjectMother } = require('../../builders/PedidoObjectMother');

describe('PedidoObjectMother', () => {

    test('pedido válido', () => {

        const pedido =
            PedidoObjectMother.pedidoValido();

        expect(pedido.valor).toBeGreaterThan(0);

    });

    test('pedido sem itens', () => {

        const pedido =
            PedidoObjectMother.pedidoSemItens();

        expect(pedido.itens.length).toBe(0);

    });

});