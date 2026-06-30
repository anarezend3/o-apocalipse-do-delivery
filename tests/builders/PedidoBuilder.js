const { Pedido } = require('../../src/domain/Pedido');
const { SolicitacaoCheckout } = require('../../src/domain/SolicitacaoCheckout');

class PedidoBuilder {

    constructor() {

        this.pedido = {
            clienteEmail: "joao@email.com",
            cartao: {
                numero: "4111111111111111",
                validade: "12/30",
                cvv: "123"
            },
            valor: 3500,
            status: "PENDENTE"
        };

    }

    comValor(valor) {

        this.pedido.valor = valor;
        return this;

    }

    comStatus(status) {

        this.pedido.status = status;
        return this;

    }

    comEmail(email) {

        this.pedido.clienteEmail = email;
        return this;

    }

    comCartao(cartao) {

        this.pedido.cartao = cartao;
        return this;

    }

    build() {

        const solicitacao = SolicitacaoCheckout.criar(this.pedido);
        const pedido = new Pedido(solicitacao);
        pedido.status = this.pedido.status;
        return pedido;

    }

}

module.exports = {
    PedidoBuilder
};
