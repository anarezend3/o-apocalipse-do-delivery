class GatewayHttp {
  constructor({ baseUrl, fetchImpl = global.fetch } = {}) {
    this.baseUrl = baseUrl;
    this.fetch = fetchImpl;
  }

  async cobrar(valor, cartao) {
    const resposta = await this.fetch(`${this.baseUrl}/cobrar`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ valor, cartao }),
    });

    if (!resposta.ok) {
      throw new Error(`gateway_http_${resposta.status}`);
    }

    return resposta.json();
  }
}

module.exports = { GatewayHttp };
