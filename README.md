# O Apocalipse do Delivery

Microsserviço de checkout resiliente desenvolvido para demonstrar análise estrutural, TDD/BDD, teste de mutação, desempenho e engenharia do caos.

## Integrantes

- Ana Luiza Rezende
- Giovanna Ferreira dos Santos de Almeida
- Gustavo Costa Gabrich
- Isaac Portela da Silva
- Miguel Amaral Lessa Xavier
- Pedro Henrique Morais Marques

## Arquitetura

O endpoint `POST /api/v1/checkout` valida o payload, consulta configuração com cache read-through, processa o pagamento por um cliente protegido por timeout/retry/Circuit Breaker, persiste o pedido no PostgreSQL e publica a confirmação em uma fila Redis consumida por um worker.

Contratos HTTP:

- `200`: pagamento aprovado;
- `400`: payload inválido;
- `402`: pagamento recusado;
- `500`: falha controlada de infraestrutura.

O ambiente Docker contém aplicação, worker, PostgreSQL, Redis, gateway HTTP simulado, Toxiproxy e k6. As conexões da aplicação com gateway e Redis passam pelo Toxiproxy.

## Requisitos

- Node.js 22 ou superior;
- npm;
- Docker Desktop com Docker Compose;
- PowerShell para os scripts de caos.

## Testes locais

```powershell
npm install
npm test
npm run bdd
npm run test:coverage
npm run test:mutation
```

O Stryker exige Mutation Score mínimo de 80% e gera `reports/mutation/mutation.html`.

## Ambiente de homologação

```powershell
docker compose up -d --build
docker compose ps
```

Smoke test:

```powershell
$body = @{
  clienteEmail = 'cliente@entregasja.com'
  valor = 25
  cartao = @{ numero = '4111111111111111'; validade = '12/30'; cvv = '123' }
} | ConvertTo-Json

Invoke-RestMethod http://localhost:3000/api/v1/checkout `
  -Method Post -ContentType 'application/json' -Body $body
```

Cartões terminados em `0002` são recusados e cartões terminados em `0005` simulam HTTP 500 no gateway.

## Desempenho e caos

Baseline Black Friday:

```powershell
docker compose --profile load run --rm k6 run `
  --summary-export /reports/black-friday.json /scripts/black-friday.js
```

Gateway com 5000 ms de latência:

```powershell
.\scripts\chaos\gateway-lento.ps1
```

Thundering Herd oficial com 10.000 VUs:

```powershell
.\scripts\chaos\thundering-herd.ps1
```

Os scripts restauram os proxies no bloco `finally`. Resultados reais das execuções estão em [docs/evidencias.md](docs/evidencias.md).

## Endpoints operacionais

- `GET /health`: liveness da aplicação;
- `GET /internal/metrics`: cache hit/miss/fallback, consultas de configuração e estado do Circuit Breaker;
- `POST /api/v1/cache/flush`: disponível apenas em `test` e `homologacao`.

Para encerrar:

```powershell
docker compose down
```
