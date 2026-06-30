const { PagamentoAprovado } = require('../resultados/PagamentoAprovado');
const { PagamentoRecusado } = require('../resultados/PagamentoRecusado');
const { PagamentoComErroInfraestrutura } = require('../resultados/PagamentoComErroInfraestrutura');

const STATUS_APROVADO = 'APROVADO';

class TimeoutGatewayError extends Error {
  constructor(timeoutMs) {
    super(`Timeout: gateway de pagamento não respondeu em ${timeoutMs}ms`);
    this.name = 'TimeoutGatewayError';
  }
}

const aguardarPadrao = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * GatewayPagamentoClient - decorator resiliente em torno do gateway de
 * pagamento bruto (`gatewayPagamento.cobrar`).
 *
 * Esta classe é o "Extract Method" do bloco try/catch monolítico do
 * CheckoutService legado: toda a complexidade de timeout (RN04), retry
 * com backoff (RN05/RN06) e circuit breaker (RN07) fica isolada aqui,
 * e o CheckoutService não precisa mais saber como o gateway é chamado —
 * apenas recebe de volta um ResultadoPagamento já interpretado.
 */
class GatewayPagamentoClient {
  constructor(gatewayPagamento, circuitBreaker, opcoes = {}) {
    this.gatewayPagamento = gatewayPagamento;
    this.circuitBreaker = circuitBreaker;

    this.timeoutMs = opcoes.timeoutMs ?? 2000;
    this.orcamentoTotalMs = opcoes.orcamentoTotalMs ?? 2500;
    this.maxRetentativas = opcoes.maxRetentativas ?? 3;
    this.intervaloBackoffMs = opcoes.intervaloBackoffMs ?? 100;
    this.jitterMs = opcoes.jitterMs ?? 100;
    this._aguardar = opcoes.aguardar ?? aguardarPadrao;
    this._agora = opcoes.agora ?? (() => Date.now());
    this._aleatorio = opcoes.aleatorio ?? Math.random;
  }

  /** @param {import('../domain/Pedido').Pedido} pedido */
  async cobrar(pedido) {
    if (this.circuitBreaker.estaAberto()) {
      return new PagamentoComErroInfraestrutura('circuit_breaker_aberto');
    }

    let ultimaFalha = null;
    const totalDeChamadas = this.maxRetentativas + 1;
    const prazo = this._agora() + this.orcamentoTotalMs;

    for (let tentativa = 1; tentativa <= totalDeChamadas; tentativa++) {
      const tempoRestante = prazo - this._agora();
      if (tempoRestante <= 0) break;

      try {
        const respostaBruta = await this._chamarComTimeout(
          pedido,
          Math.min(this.timeoutMs, tempoRestante),
        );
        this.circuitBreaker.registrarSucesso();
        return this._interpretar(respostaBruta);
      } catch (erro) {
        ultimaFalha = erro;
        this.circuitBreaker.registrarFalha();

        const backoff = this._calcularBackoff(tentativa);
        const haveraNovaTentativa =
          tentativa < totalDeChamadas &&
          this._agora() + backoff < prazo;

        if (haveraNovaTentativa) {
          await this._aguardar(backoff);
        }
      }
    }

    return new PagamentoComErroInfraestrutura(
      ultimaFalha ? ultimaFalha.message : 'orcamento_de_tempo_esgotado',
    );
  }

  _calcularBackoff(tentativa) {
    const exponencial = this.intervaloBackoffMs * (2 ** (tentativa - 1));
    return exponencial + Math.floor(this._aleatorio() * (this.jitterMs + 1));
  }

  _chamarComTimeout(pedido, timeoutMs) {
    const chamadaAoGateway = this.gatewayPagamento.cobrar(pedido.valor, pedido.cartao);

    return new Promise((resolve, reject) => {
      const idDoTimeout = setTimeout(() => reject(new TimeoutGatewayError(timeoutMs)), timeoutMs);

      chamadaAoGateway.then(
        (valor) => {
          clearTimeout(idDoTimeout);
          resolve(valor);
        },
        (erro) => {
          clearTimeout(idDoTimeout);
          reject(erro);
        },
      );
    });
  }

  _interpretar(respostaBruta) {
    if (respostaBruta && respostaBruta.status === STATUS_APROVADO) {
      return new PagamentoAprovado();
    }
    const motivo = (respostaBruta && (respostaBruta.motivo || respostaBruta.status)) || 'recusado';
    return new PagamentoRecusado(motivo);
  }
}

module.exports = { GatewayPagamentoClient, TimeoutGatewayError };
