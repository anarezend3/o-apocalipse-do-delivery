const { ResultadoPagamento } = require('./ResultadoPagamentos');
const { StatusPedido } = require('../domain/StatusPedido');

class PagamentoComErroInfraestrutura extends ResultadoPagamento {

    constructor(erro) {

        super();

        this.erro = erro;

    }

    atualizarPedido(pedido) {

        pedido.marcarComo(StatusPedido.ERRO_GATEWAY);

    }

    deveEnviarEmailConfirmacao() {

        return false;

    }

    paraRespostaHttp() {

        return {

            httpStatus: 500,

            erro: this.erro

        };

    }

}

module.exports = {
    PagamentoComErroInfraestrutura
};
