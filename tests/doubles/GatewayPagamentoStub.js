class GatewayPagamentoStub {
  constructor() {
    this.cenario = 'APROVADO';
    this.chamadas = 0;
  }

  setCenario(cenario) {
    this.cenario = cenario;
  }

  async cobrar(valor, cartao) {
    this.chamadas++;

    if (this.cenario === 'APROVADO') {
      return { status: 'APROVADO' };
    }

    if (this.cenario === 'RECUSADO') {
      return { status: 'RECUSADO' };
    }

    if (this.cenario === 'FALHA_TOTAL') {
      throw new Error('gateway fora');
    }

    if (this.cenario === 'FALHA_DEPOIS_APROVA') {
      if (this.chamadas === 1) throw new Error('erro temporário');
      return { status: 'APROVADO' };
    }

    if (this.cenario === 'TIMEOUT') {
      return new Promise(() => {});
    }

    throw new Error('cenário não definido');
  }
}

module.exports = { GatewayPagamentoStub };
