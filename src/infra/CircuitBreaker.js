const ESTADO = Object.freeze({
  FECHADO: 'FECHADO',
  ABERTO: 'ABERTO',
  MEIO_ABERTO: 'MEIO_ABERTO',
});

/**
 * CircuitBreaker - implementação enxuta do padrão Circuit Breaker (RN07).
 *
 * Mantém uma janela deslizante das últimas `limiteAmostras` chamadas ao
 * gateway. Se a taxa de falhas dentro dessa janela ultrapassar
 * `limiteTaxaFalha` (50% por padrão), o disjuntor abre e passa a recusar
 * chamadas imediatamente (sem nem tentar a rede) até `tempoResetMs`
 * decorrer, quando entra em estado MEIO_ABERTO para uma nova tentativa
 * de teste.
 *
 * Recebe um relógio injetável (`agora`) para permitir testes determinísticos
 * com Jest fake timers, evitando testes lentos ou "flaky".
 */
class CircuitBreaker {
  constructor({ limiteAmostras = 10, limiteTaxaFalha = 0.5, tempoResetMs = 5000, agora = () => Date.now() } = {}) {
    this.limiteAmostras = limiteAmostras;
    this.limiteTaxaFalha = limiteTaxaFalha;
    this.tempoResetMs = tempoResetMs;
    this._agora = agora;

    this._estado = ESTADO.FECHADO;
    this._amostras = [];
    this._abertoDesde = null;
  }

  estaAberto() {
    if (this._estado !== ESTADO.ABERTO) {
      return false;
    }

    const tempoDecorrido = this._agora() - this._abertoDesde;
    if (tempoDecorrido >= this.tempoResetMs) {
      this._estado = ESTADO.MEIO_ABERTO;
      return false;
    }

    return true;
  }

  registrarSucesso() {
    this._registrarAmostra(true);

    if (this._estado === ESTADO.MEIO_ABERTO) {
      this._fechar();
    }
  }

  registrarFalha() {
    this._registrarAmostra(false);

    if (this._estado === ESTADO.MEIO_ABERTO) {
      this._abrir();
      return;
    }

    if (this._janelaCompleta() && this._taxaDeFalhaAtual() > this.limiteTaxaFalha) {
      this._abrir();
    }
  }

  estado() {
    return this._estado;
  }

  _registrarAmostra(sucesso) {
    this._amostras.push(sucesso);
    if (this._amostras.length > this.limiteAmostras) {
      this._amostras.shift();
    }
  }

  _janelaCompleta() {
    return this._amostras.length >= this.limiteAmostras;
  }

  _taxaDeFalhaAtual() {
    const falhas = this._amostras.filter((amostra) => !amostra).length;
    return falhas / this._amostras.length;
  }

  _abrir() {
    this._estado = ESTADO.ABERTO;
    this._abertoDesde = this._agora();
  }

  _fechar() {
    this._estado = ESTADO.FECHADO;
    this._amostras = [];
    this._abertoDesde = null;
  }
}

module.exports = { CircuitBreaker, ESTADO };