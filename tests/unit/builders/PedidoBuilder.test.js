const { PedidoBuilder } = require('../../builders/PedidoBuilder');

describe('PedidoBuilder', () => {

    test('deve criar pedido padrão', () => {

        const pedido = new PedidoBuilder().build();

        expect(pedido.valor).toBe(3500);

    });

    test('deve alterar valor', () => {

        const pedido = new PedidoBuilder()
            .comValor(150)
            .build();

        expect(pedido.valor).toBe(150);

    });

    test('deve remover itens', () => {

        const pedido = new PedidoBuilder()
            .semItens()
            .build();

        expect(pedido.itens.length).toBe(0);

    });

});