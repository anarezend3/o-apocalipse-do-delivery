const { ResultadoPagamento } = require('./ResultadoPagamentos');
const { StatusPedido } = require('../domain/StatusPedido');

class PagamentoRecusado extends ResultadoPagamento {

    constructor(motivo) {

        super();

        this.motivo = motivo;

    }

    atualizarPedido(pedido) {

        pedido.marcarComo(StatusPedido.FALHOU);

    }

    deveEnviarEmailConfirmacao() {

        return false;

    }

    paraRespostaHttp() {

        return {

            httpStatus: 402,

            erro: this.motivo

        };

    }

}

module.exports = {
    PagamentoRecusado
};
