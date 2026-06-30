class PedidoBuilder {

    constructor() {

        this.pedido = {
            id: 1,
            clienteNome: "João",
            clienteEmail: "joao@email.com",
            cartao: {
                numero: "4111111111111111",
                validade: "12/30",
                cvv: "123"
            },
            itens: [
                {
                    produto: "Notebook",
                    quantidade: 1,
                    preco: 3500
                }
            ],
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

    semItens() {

        this.pedido.itens = [];
        return this;

    }

    comCartao(cartao) {

        this.pedido.cartao = cartao;
        return this;

    }

    build() {

        return {
            ...this.pedido
        };

    }

}

module.exports = {
    PedidoBuilder
};