const { PagamentoComErroInfraestrutura } = require('../resultados/PagamentoComErroInfraestrutura');

class CheckoutService {

    constructor(gatewayPagamentoClient, pedidoRepository, filaEmail, configuracaoCache = null) {
        this.gatewayPagamentoClient = gatewayPagamentoClient;
        this.pedidoRepository = pedidoRepository;
        this.filaEmail = filaEmail;
        this.configuracaoCache = configuracaoCache;
    }

    async processar(pedido) {

        let resultado;

        try {

            if (this.configuracaoCache) {
                await this.configuracaoCache.obter();
            }

            resultado = await this.gatewayPagamentoClient.cobrar(pedido);

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

    async finalizarPedido(pedido, resultado) {

        resultado.atualizarPedido(pedido);

        await this.pedidoRepository.salvar(pedido);

        if (resultado.deveEnviarEmailConfirmacao() && this.filaEmail) {
            Promise.resolve(this.filaEmail.publicar({
                pedidoId: pedido.id,
                destinatario: pedido.clienteEmail,
                mensagem: "Pagamento Aprovado"
            })).catch(() => {
                // O pagamento já foi persistido. O worker/DLQ trata falhas da notificação.
            });
        }

        return resultado.paraRespostaHttp(pedido);

    }

}

module.exports = {
    CheckoutService
};
