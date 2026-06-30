class PedidoRepositoryMock {
  constructor() {
    this.salvos = [];
  }

  async salvar(pedido) {
    this.salvos.push(pedido);
    return pedido;
  }
}

module.exports = { PedidoRepositoryMock };