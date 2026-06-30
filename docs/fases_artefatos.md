# O Apocalipse do Delivery

## Fase 1: Análise Estrutural, Complexidade e Métricas de Estimativa

### Mapeamento de Fluxo:

O Grafo de Fluxo de Controle representa os principais caminhos de execução do método de processamento de pedidos.

![Grafo de Fluxo de Controle](../docs/imagens/grafo-atualizado.png)

O fluxo inicia no nó 1, passa pela chamada ao gateway de pagamento no nó 2 e segue para a verificação de aprovação no nó 3. A partir desse ponto, existem três caminhos principais:

1. Pagamento aprovado.
2. Pagamento recusado.
3. Erro ou exceção durante a cobrança.

#### Nós do Grafo

| Nó  | Descrição                                          |
| --- | -------------------------------------------------- |
| 1   | Início do processamento                            |
| 2   | Chamada ao método cobrar() do gateway de pagamento |
| 3   | Verificação se o pagamento foi aprovado            |
| 4   | Salvar pedido e enviar e-mail                      |
| 5   | Fluxo de pagamento recusado                        |
| 6   | Tratamento de erro no bloco catch                  |
| FIM | Encerramento do processamento                      |

#### Caminhos Independentes

| Caminho             | Descrição                          |
| ------------------- | ---------------------------------- |
| 1 → 2 → 3 → 4 → FIM | Pagamento aprovado                 |
| 1 → 2 → 3 → 5 → FIM | Pagamento recusado                 |
| 1 → 2 → 6 → FIM     | Erro ou exceção durante a cobrança |

Esses três caminhos representam os cenários mínimos que precisam ser cobertos por testes para exercitar todos os fluxos principais do método.

### Complexidade Ciclomática

Cálculo da complexidade ciclomática:

V(G) = P + 1
V(G) = 2 + 1 = 3

V(G) = E - N + 2C
V(G) = 8 - 7 + 2(1) = 3

### Métricas e Estimativas de Teste

#### Objetivo

Esta seção apresenta uma estimativa do esforço necessário para testar a funcionalidade de **Processamento de Pedidos e Checkout** da plataforma EntregasJá.

A estimativa considera os principais riscos do sistema: falha no gateway de pagamento, falha no cache, erro de persistência, envio incorreto de e-mail e degradação de desempenho durante alta carga.

#### Base da Estimativa

A análise estrutural do método principal de checkout indicou uma **Complexidade Ciclomática V(G) = 3**.

Isso significa que existem, no mínimo, **três caminhos independentes** que precisam ser cobertos por testes:

| Caminho             | Cenário                    | Resultado esperado                              |
| ------------------- | -------------------------- | ----------------------------------------------- |
| 1 → 2 → 3 → 4 → FIM | Pagamento aprovado         | Pedido salvo como processado e e-mail enviado   |
| 1 → 2 → 3 → 5 → FIM | Pagamento recusado         | Pedido marcado como falhou e e-mail não enviado |
| 1 → 2 → 6 → FIM     | Erro ou exceção no gateway | Erro tratado de forma controlada                |

Esses caminhos representam a base mínima da suíte de testes.

#### Técnica Utilizada

Foi utilizada uma técnica baseada em **Pontos de Caso de Teste**, adaptada ao contexto do trabalho.

Cada cenário recebeu um peso conforme sua complexidade:

| Classificação |     Peso | Critério                                                        |
| ------------- | -------: | --------------------------------------------------------------- |
| Simples       |  1 ponto | Fluxo direto, baixa dependência externa                         |
| Médio         | 2 pontos | Uso de mocks, stubs, persistência ou validação de comportamento |
| Complexo      | 3 pontos | Falhas externas, timeout, mutação, performance ou caos          |

A fórmula usada foi:

```text
Esforço estimado = Pontos de Caso de Teste × 2 horas/homem
```

#### Casos de Teste Planejados

| ID   | Cenário                                         | Tipo                | Complexidade | Pontos |
| ---- | ----------------------------------------------- | ------------------- | ------------ | -----: |
| CT01 | Pagamento aprovado                              | Unitário/Integração | Médio        |      2 |
| CT02 | Pagamento recusado                              | Unitário/Integração | Médio        |      2 |
| CT03 | Erro no gateway                                 | Unitário/Integração | Complexo     |      3 |
| CT04 | Timeout do gateway                              | Integração          | Complexo     |      3 |
| CT05 | E-mail enviado apenas em caso de sucesso        | Mock                | Médio        |      2 |
| CT06 | Persistência correta do pedido                  | Integração          | Médio        |      2 |
| CT07 | Cenários BDD em Gherkin                         | BDD                 | Médio        |      2 |
| CT08 | Teste de mutação com Stryker.js                 | Mutação             | Complexo     |      3 |
| CT09 | Ajustes para matar mutantes sobreviventes       | Mutação             | Complexo     |      3 |
| CT10 | Teste de carga com ramp-up, steady e ramp-down  | Performance         | Complexo     |      3 |
| CT11 | Teste de estresse na volumetria de Black Friday | Performance         | Complexo     |      3 |
| CT12 | Gateway lento com 5000ms de latência            | Caos                | Complexo     |      3 |
| CT13 | Queda ou flush do cache durante carga máxima    | Caos                | Complexo     |      3 |
| CT14 | Degradação graciosa e cálculo de MTTR           | SRE                 | Complexo     |      3 |

**Total:** 37 pontos de caso de teste.

#### Estimativa de Esforço

Considerando o fator de **2 horas/homem por ponto**, temos:

```text
37 pontos × 2 horas = 74 horas/homem
```

Portanto, o esforço total estimado para testar a funcionalidade é de aproximadamente:

```text
74 horas/homem
```

#### Distribuição do Esforço

| Atividade                                       | Esforço estimado |
| ----------------------------------------------- | ---------------: |
| Análise do código legado e grafo de fluxo       |               4h |
| Cálculo da complexidade ciclomática             |               1h |
| Planejamento dos casos de teste                 |               3h |
| Escrita dos cenários BDD                        |               4h |
| Testes unitários e de integração                |              14h |
| Implementação de mocks, stubs e builders        |               5h |
| Refatoração do CheckoutService                  |               8h |
| Teste de mutação com Stryker.js                 |               9h |
| Testes de carga e estresse                      |               8h |
| Injeção de falhas com Toxiproxy                 |               8h |
| Análise de métricas, MTTR e degradação graciosa |               5h |
| Relatório e preparação do vídeo                 |               5h |
| **Total**                                       |          **74h** |

#### Recursos Necessários

| Recurso          | Finalidade                                                |
| ---------------- | --------------------------------------------------------- |
| Node.js e npm    | Execução do microsserviço e gerenciamento de dependências |
| Jest             | Testes unitários e de integração                          |
| Gherkin/Cucumber | Especificação BDD dos cenários                            |
| Stryker.js       | Teste de mutação                                          |
| k6 ou Autocannon | Testes de carga e estresse                                |
| Toxiproxy        | Injeção de falhas de rede                                 |
| Docker           | Execução de serviços auxiliares                           |
| Banco relacional | Persistência dos pedidos                                  |
| Cache            | Simulação do cenário de Thundering Herd                   |
| GitHub           | Versionamento e entrega do trabalho                       |

#### Dimensionamento da Equipe

Considerando os seis integrantes do grupo e 74 horas/homem, a divisão uniforme representa aproximadamente 12,3 horas por integrante. Com disponibilidade acadêmica de 6 horas por dia, a duração teórica é de dois dias úteis, além da janela reservada para execução dos testes de carga em host dimensionado.

| Frente | Pessoas | Horas/homem |
| --- | ---: | ---: |
| Análise, documentação e BDD | 2 | 16h |
| Código, testes e mutação | 2 | 36h |
| Infraestrutura, desempenho e caos | 2 | 22h |
| **Total** | **6** | **74h** |

#### Indicadores Esperados

| Indicador                       | Meta                           |
| ------------------------------- | ------------------------------ |
| Caminhos independentes cobertos | 100%                           |
| Mutation Score                  | ≥ 80% (90% classificado alto)  |
| Latência p95                    | < 5 segundos                   |
| Taxa de erro                    | < 5%                           |
| E-mail de confirmação           | Apenas em pagamento aprovado   |
| Falha no gateway                | Tratada sem derrubar o sistema |
| Falha no cache                  | Degradação graciosa            |
| MTTR                            | Medido após a falha            |

#### Conclusão

A estimativa indica que a funcionalidade de Checkout exige aproximadamente **74 horas/homem** para ser testada de forma completa.

Embora a complexidade ciclomática indique apenas três caminhos mínimos, o contexto do trabalho exige testes adicionais de resiliência, mutação, desempenho e caos, pois o sistema depende de componentes externos críticos, como gateway de pagamento, cache e banco de dados.

## Fase 2: Redesenho com TDD, BDD e Padrões de Projeto

### Refatorações Aplicadas

#### Extract Method

O método processar() do CheckoutService foi dividido em:

- criarResultado()
- finalizarPedido()

---

#### Introduce Parameter Object

Foi criada a classe SolicitacaoCheckout para encapsular parâmetros relacionados ao checkout.

#### Replace Conditional with Polymorphism

Os blocos if/else foram substituídos pelas classes:

- PagamentoAprovado
- PagamentoRecusado
- PagamentoComErroInfraestrutura

Cada classe implementa seu próprio comportamento.

#### Test Smells Eliminados

##### Obscure Setup

Resolvido utilizando:

- PedidoBuilder
- PedidoObjectMother

Os testes passaram a criar objetos de forma reutilizável e legível.

## Fase 3: Teste de Mutação

Foi utilizado o Stryker.js com Jest runner e análise de cobertura `perTest`.

Configuração:

- Mutation Score mínimo (`break`): 80%;
- classificação alta: 90%;
- relatórios: terminal e HTML;
- escopo: domínio, resultados de pagamento, CheckoutService, Circuit Breaker, cliente resiliente e cache anti-manada.

Na primeira execução foram encontrados testes insuficientes e o score foi de 71,29%. O ciclo de melhoria acrescentou casos para operadores condicionais, limites de timeout, quantidade de tentativas, backoff, jitter, janela deslizante, transições do Circuit Breaker, validações e coordenação do cache.

Resultado final medido:

| Métrica | Resultado |
| --- | ---: |
| Mutation Score | **87,04%** |
| Mutantes gerados | 325 |
| Mutantes mortos | 279 |
| Timeouts | 3 |
| Sobreviventes | 33 |
| Sem cobertura | 9 |

O resultado supera a meta obrigatória de 80%. O relatório navegável é gerado em `reports/mutation/mutation.html`.

### Justificativa de Mutantes Equivalentes

Parte dos mutantes sobreviventes é composta por **mutantes equivalentes**: alterações que produzem um programa sintaticamente diferente, porém semanticamente idêntico ao original. Por definição, nenhum teste consegue matá-los, pois não existe entrada capaz de gerar saída observável distinta. Eles não indicam falha na suíte e são descontados na análise de eficácia. Os principais grupos identificados:

1. **Jitter aleatório no backoff** (`GatewayPagamentoClient._calcularBackoff` e `ConfiguracaoCheckoutCache._carregarProtegido`). Mutações nos limites do jitter, como trocar `Math.floor(this._aleatorio() * (this.jitterMs + 1))` por `* this.jitterMs`, apenas alteram o valor máximo de uma espera aleatória. O comportamento observável (o pagamento é processado, o retry acontece dentro do orçamento) é o mesmo, e o tempo exato de espera não é asserido porque o relógio e o aleatório são injetados de forma determinística. São equivalentes do ponto de vista funcional.

2. **Mutação aritmética no expoente do backoff exponencial**. Variações como `2 ** (tentativa - 1)` para `2 ** (tentativa + 1)` mudam apenas a magnitude da espera entre tentativas. Como a política de retry é validada pelo número de tentativas e pelo respeito ao orçamento global (`orcamentoTotalMs`), e não pelo valor absoluto do atraso, essas mutações não produzem diferença observável dentro dos cenários testados.

3. **Mutações em valores de timeout/TTL que não cruzam um limite de decisão**. Por exemplo, alterar `operacaoTimeoutMs = 200` para um valor próximo, ou o `ttlSegundos`, não muda o resultado dos testes porque os doubles respondem de forma imediata ou explicitamente lenta; o valor exato do prazo é irrelevante desde que permaneça do mesmo lado da fronteira de decisão.

4. **Reordenação/curto-circuito em condições booleanas já cobertas por outro ramo**. Alguns mutantes em condições compostas (como `tentativa < totalDeChamadas && this._agora() + backoff < prazo`) sobrevivem porque o segundo termo já é garantido pelo controle de orçamento exercido em outro ponto do laço, tornando o mutante logicamente equivalente no conjunto de estados alcançáveis.

Os demais sobreviventes não equivalentes (operadores condicionais e remoção de comandos em ramos efetivamente alcançáveis) foram atacados no segundo ciclo de testes, elevando o score de 71,29% para 87,04%, acima da meta. Os equivalentes remanescentes justificam por que o score não atinge 100% sem que isso represente fragilidade da suíte.

## Fase 4: Engenharia do Caos e Testes de Desempenho (SRE)

O ambiente de homologação é definido por Docker Compose e contém Node.js/Express, worker de e-mail, PostgreSQL, Redis, gateway HTTP simulado, Toxiproxy e k6.

### Mecanismos de resiliência

- orçamento total de checkout de 2500 ms;
- até três retries adicionais enquanto houver orçamento;
- backoff exponencial com jitter;
- Circuit Breaker com janela deslizante;
- cache read-through com lock Redis e single-flight local;
- `last known good` e timeout de 200 ms nas operações Redis;
- fila assíncrona de e-mail com três tentativas e DLQ.

### SLI/SLO

| Cenário | Critério |
| --- | --- |
| Operação normal | p95 < 2500 ms |
| Operação normal | erros inesperados < 5% |
| Caos | resposta controlada em menos de 5000 ms |
| Caos | processo permanece disponível |
| Thundering Herd | banco não recebe uma consulta por requisição |

### Experimentos

1. `black-friday.js`: ramp-up, steady e ramp-down.
2. `gateway-lento.js`: 5000 ms de latência downstream pelo Toxiproxy.
3. `thundering-herd.js`: flush, indisponibilidade do proxy Redis e perfil oficial de 10.000 VUs simultâneos.

As execuções de fumaça confirmaram p95 de 10,91 ms no baseline, máximo de 2,57 s no gateway lento e p95 de 443,18 ms na manada de 100 VUs. Durante a queda do Redis houve 100 fallbacks e somente uma consulta de configuração ao PostgreSQL.

Os comandos, resultados completos, limitações e distinção entre perfil configurado e perfil efetivamente executado estão em `README.md` e `docs/evidencias.md`.
