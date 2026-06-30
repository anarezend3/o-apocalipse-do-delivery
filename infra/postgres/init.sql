CREATE TABLE IF NOT EXISTS pedidos (
  id BIGSERIAL PRIMARY KEY,
  cliente_email VARCHAR(320) NOT NULL,
  valor NUMERIC(12, 2) NOT NULL CHECK (valor > 0),
  cartao_final VARCHAR(4) NOT NULL,
  status VARCHAR(32) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS configuracoes (
  chave VARCHAR(100) PRIMARY KEY,
  valor JSONB NOT NULL,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO configuracoes (chave, valor)
VALUES ('checkout', '{"pagamentosAtivos": true, "versao": 1}')
ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor;

CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
