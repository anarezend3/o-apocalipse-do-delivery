const { PedidoBuilder } = require('../../builders/PedidoBuilder');

describe('PedidoBuilder', () => {

    test('deve criar pedido padrão', () => {

        const pedido = new PedidoBuilder().build();

        expect(pedido.valor).toBe(3500);
        expect(pedido.status).toBe('PENDENTE');

    });

    test('deve alterar valor', () => {

        const pedido = new PedidoBuilder()
            .comValor(150)
            .build();

        expect(pedido.valor).toBe(150);

    });

    test('deve alterar email', () => {
        const pedido = new PedidoBuilder().comEmail('novo@email.com').build();
        expect(pedido.clienteEmail).toBe('novo@email.com');
    });

});
