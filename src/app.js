const express = require('express');
const { SolicitacaoCheckout } = require('./domain/SolicitacaoCheckout');
const { Pedido } = require('./domain/Pedido');
const { DadosInvalidosError } = require('./domain/erros/DadosInvalidosErro');

function createApp({
  checkoutService,
  configuracaoCache,
  metricas,
  circuitBreaker,
  ambiente = process.env.NODE_ENV,
}) {
  const app = express();
  app.use(express.json({ limit: '32kb' }));

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.post('/api/v1/checkout', async (req, res) => {
    try {
      const solicitacao = SolicitacaoCheckout.criar(req.body);
      const pedido = new Pedido(solicitacao);
      const resultado = await checkoutService.processar(pedido);

      if (resultado.httpStatus === 200) {
        return res.status(200).json({
          mensagem: 'Pedido finalizado com sucesso!',
          pedido: resultado.pedido,
        });
      }

      return res.status(resultado.httpStatus).json({
        erro: resultado.erro || 'Não foi possível processar seu pagamento. Tente mais tarde.',
        pedidoStatus: pedido.status,
      });
    } catch (erro) {
      if (erro instanceof DadosInvalidosError) {
        return res.status(400).json({ erro: erro.message, motivos: erro.motivos });
      }

      return res.status(500).json({
        erro: 'Falha interna controlada. Tente mais tarde.',
      });
    }
  });

  app.post('/api/v1/cache/flush', async (req, res) => {
    if (!['test', 'homologacao'].includes(ambiente)) {
      return res.status(404).json({ erro: 'Rota indisponível neste ambiente' });
    }

    await configuracaoCache.limpar();
    return res.json({ status: 'cache_invalidated' });
  });

  app.get('/internal/metrics', (req, res) => {
    res.json(metricas.snapshot(circuitBreaker));
  });

  return app;
}

module.exports = { createApp };
