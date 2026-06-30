const { ResultadoPagamento } = require('./ResultadoPagamentos');
const { StatusPedido } = require('../domain/StatusPedido');

class PagamentoAprovado extends ResultadoPagamento {

    atualizarPedido(pedido) {

        pedido.status = StatusPedido.PROCESSADO;

    }

    deveEnviarEmailConfirmacao() {
        return true;
    }

    paraRespostaHttp(pedido) {

        return {
            httpStatus: 200,
            pedido
        };

    }

}

module.exports = {
    PagamentoAprovado
};