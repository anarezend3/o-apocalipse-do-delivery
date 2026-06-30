const { StatusPedido } = require('./StatusPedido');

/**
 * Entidade de domínio Pedido.
 *
 * É sempre construída a partir de uma SolicitacaoCheckout já validada,
 * nasce no estado PENDENTE e só transiciona de estado através do método
 * `marcarComo`, chamado pelos objetos ResultadoPagamento (ver
 * src/resultados/*). Isso mantém a regra "quem sabe processar o resultado
 * do gateway, sabe também qual o novo status do pedido" em um único lugar.
 */
class Pedido {
  constructor(solicitacaoCheckout) {
    this.clienteEmail = solicitacaoCheckout.clienteEmail;
    this.valor = solicitacaoCheckout.valor;
    this.cartao = solicitacaoCheckout.cartao;
    this.status = StatusPedido.PENDENTE;
  }

  marcarComo(status) {
    this.status = status;
  }
}

module.exports = { Pedido };