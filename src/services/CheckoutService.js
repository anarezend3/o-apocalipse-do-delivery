const { PagamentoAprovado } = require('../resultados/PagamentoAprovado');
const { PagamentoRecusado } = require('../resultados/PagamentoRecusado');
const { PagamentoComErroInfraestrutura } = require('../resultados/PagamentoComErroInfraestrutura');

class CheckoutService {

    constructor(gatewayPagamento, pedidoRepository, emailService) {
        this.gatewayPagamento = gatewayPagamento;
        this.pedidoRepository = pedidoRepository;
        this.emailService = emailService;
    }

    async processar(pedido) {

        let resultado;

        try {

            const resposta = await this.gatewayPagamento.cobrar(
                pedido.valor,
                pedido.cartao
            );

            resultado = this.criarResultado(resposta);

        } catch (erro) {

            resultado = new PagamentoComErroInfraestrutura(
                erro.message
            );

        }

        return this.finalizarPedido(
            pedido,
            resultado
        );
    }

    criarResultado(resposta) {

        if (resposta.status === 'APROVADO') {
            return new PagamentoAprovado();
        }

        return new PagamentoRecusado(
            resposta.motivo || "Pagamento recusado"
        );

    }

    async finalizarPedido(pedido, resultado) {

        resultado.atualizarPedido(pedido);

        await this.pedidoRepository.salvar(pedido);

        if (resultado.deveEnviarEmailConfirmacao()) {

            await this.emailService.enviarConfirmacao(
                pedido.clienteEmail,
                "Pagamento Aprovado"
            );

        }

        return resultado.paraRespostaHttp(pedido);

    }

}

module.exports = {
    CheckoutService
};