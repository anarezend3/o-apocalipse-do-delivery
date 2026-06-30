const { DadosInvalidosError } = require('./erros/DadosInvalidosError');

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

/**
 * SolicitacaoCheckout - Parameter Object (refatoração "Introduce Parameter Object").
 *
 * No código legado, a rota HTTP recebia e repassava três parâmetros soltos
 * (clienteEmail, valor, cartao) e cada camada precisava validar/checar os
 * três de forma redundante (`if (!clienteEmail || !valor || !cartao)`).
 *
 * Esta classe agrupa os três dados em um único objeto coeso, responsável
 * por garantir (RN01) que só existem instâncias válidas em todo o sistema
 * — ou seja, é impossível construir uma SolicitacaoCheckout inválida sem
 * passar pelo factory `criar`, que lança DadosInvalidosError.
 */
class SolicitacaoCheckout {
  constructor(clienteEmail, valor, cartao) {
    this.clienteEmail = clienteEmail;
    this.valor = valor;
    this.cartao = cartao;
  }

  /**
   * Factory method: única porta de entrada para criar uma SolicitacaoCheckout
   * a partir de um payload bruto (ex: req.body). Garante o RN01.
   */
  static criar(payload = {}) {
    const motivos = SolicitacaoCheckout._validar(payload || {});

    if (motivos.length > 0) {
      throw new DadosInvalidosError(motivos);
    }

    const { clienteEmail, valor, cartao } = payload;
    return new SolicitacaoCheckout(clienteEmail, valor, cartao);
  }

  static _validar({ clienteEmail, valor, cartao }) {
    const motivos = [];

    if (!SolicitacaoCheckout._emailValido(clienteEmail)) {
      motivos.push('clienteEmail ausente ou em formato inválido');
    }

    if (!SolicitacaoCheckout._valorValido(valor)) {
      motivos.push('valor deve ser numérico e maior que zero');
    }

    if (!SolicitacaoCheckout._cartaoValido(cartao)) {
      motivos.push('cartao ausente ou incompleto (numero, validade e cvv são obrigatórios)');
    }

    return motivos;
  }

  static _emailValido(clienteEmail) {
    return typeof clienteEmail === 'string' && REGEX_EMAIL.test(clienteEmail);
  }

  static _valorValido(valor) {
    return typeof valor === 'number' && Number.isFinite(valor) && valor > 0;
  }

  static _cartaoValido(cartao) {
    return Boolean(cartao && cartao.numero && cartao.validade && cartao.cvv);
  }
}

module.exports = { SolicitacaoCheckout };