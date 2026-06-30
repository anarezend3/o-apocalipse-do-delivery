/**
 * ResultadoPagamento - classe-base do hierarquia que substitui a cadeia
 * `if (aprovado) {...} else {...} catch (e) {...}` do CheckoutService legado
 * (refatoração "Replace Conditional with Polymorphism").
 *
 * Cada subclasse concentra, em um único lugar, as três decisões que antes
 * estavam espalhadas e duplicadas pelo método `processar`:
 *   1) Para qual status o pedido deve transicionar;
 *   2) Se o e-mail de confirmação deve ou não ser disparado;
 *   3) Qual resposta HTTP deve ser devolvida ao cliente.
 */
class ResultadoPagamento {
  /** @param {import('../domain/Pedido').Pedido} pedido */
  atualizarPedido(pedido) { // eslint-disable-line no-unused-vars
    throw new Error('atualizarPedido deve ser implementado pela subclasse de ResultadoPagamento');
  }

  deveEnviarEmailConfirmacao() {
    throw new Error('deveEnviarEmailConfirmacao deve ser implementado pela subclasse de ResultadoPagamento');
  }

  /** @param {import('../domain/Pedido').Pedido} pedido */
  paraRespostaHttp(pedido) { // eslint-disable-line no-unused-vars
    throw new Error('paraRespostaHttp deve ser implementado pela subclasse de ResultadoPagamento');
  }
}

module.exports = { ResultadoPagamento };