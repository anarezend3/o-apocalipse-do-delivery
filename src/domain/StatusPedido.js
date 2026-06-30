/**
 * Enumeração (objeto congelado) com os estados possíveis de um Pedido.
 *
 * Elimina o "Magic String Smell" do código legado, onde strings como
 * 'PROCESSADO' e 'FALHOU' apareciam espalhadas e duplicadas pelo serviço.
 */
const StatusPedido = Object.freeze({
  PENDENTE: 'PENDENTE',
  PROCESSADO: 'PROCESSADO',
  FALHOU: 'FALHOU',
  ERRO_GATEWAY: 'ERRO_GATEWAY',
});

module.exports = { StatusPedido };