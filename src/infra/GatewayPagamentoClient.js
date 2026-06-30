const { PagamentoAprovado } = require('../resultados/PagamentoAprovado');
const { PagamentoRecusado } = require('../resultados/PagamentoRecusado');
const { PagamentoComErroDeInfraestrutura } = require('../resultados/PagamentoComErroDeInfraestrutura');

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

    this.timeoutMs = opcoes.timeoutMs ?? 2000; // RN04
    this.maxRetentativas = opcoes.maxRetentativas ?? 3; // RN05 (tentativas ADICIONAIS à 1ª chamada)
    this.intervaloBackoffMs = opcoes.intervaloBackoffMs ?? 500; // RN06
    this._aguardar = opcoes.aguardar ?? aguardarPadrao;
  }

  /** @param {import('../domain/Pedido').Pedido} pedido */
  async cobrar(pedido) {
    if (this.circuitBreaker.estaAberto()) {
      return new PagamentoComErroDeInfraestrutura('circuit_breaker_aberto');
    }

    let ultimaFalha = null;
    const totalDeChamadas = this.maxRetentativas + 1;

    for (let tentativa = 1; tentativa <= totalDeChamadas; tentativa++) {
      try {
        const respostaBruta = await this._chamarComTimeout(pedido);
        this.circuitBreaker.registrarSucesso();
        return this._interpretar(respostaBruta);
      } catch (erro) {
        ultimaFalha = erro;
        this.circuitBreaker.registrarFalha();

        const haveraNovaTentativa = tentativa < totalDeChamadas;
        if (haveraNovaTentativa) {
          await this._aguardar(this.intervaloBackoffMs);
        }
      }
    }

    return new PagamentoComErroDeInfraestrutura(ultimaFalha ? ultimaFalha.message : 'falha_desconhecida');
  }

  _chamarComTimeout(pedido) {
    const chamadaAoGateway = this.gatewayPagamento.cobrar(pedido.valor, pedido.cartao);

    return new Promise((resolve, reject) => {
      const idDoTimeout = setTimeout(() => reject(new TimeoutGatewayError(this.timeoutMs)), this.timeoutMs);

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