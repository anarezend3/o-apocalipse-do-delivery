class PedidoRepositoryPostgres {
  constructor(pool) {
    this.pool = pool;
  }

  async salvar(pedido) {
    const { rows } = await this.pool.query(
      `INSERT INTO pedidos (cliente_email, valor, cartao_final, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        pedido.clienteEmail,
        pedido.valor,
        String(pedido.cartao.numero).slice(-4),
        pedido.status,
      ],
    );
    pedido.id = rows[0].id;
    return pedido;
  }
}

module.exports = { PedidoRepositoryPostgres };
