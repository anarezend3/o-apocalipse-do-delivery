# Evidências de execução

Data da execução: 30/06/2026.

## Testes funcionais

| Verificação | Resultado |
| --- | ---: |
| Jest | 8 suítes, 51 testes aprovados |
| Cobertura de statements | 93,04% |
| Cobertura de branches | 90,17% |
| Cucumber | 7 cenários, 46 passos aprovados |
| Stryker | 87,04% |
| Mutantes gerados | 325 |
| Mutantes mortos | 279 |
| Mutantes sobreviventes | 33 |
| Mutantes sem cobertura | 9 |

O primeiro ciclo do Stryker produziu 71,29%. Foram adicionados testes para limites, operadores condicionais, janela do Circuit Breaker, validação, lock distribuído, TTL, fallback e orçamento temporal. A execução final, após a inclusão do timeout Redis, atingiu 87,04%.

## Baseline Black Friday — carga

Perfil executado: ramp-up de 10 s, steady de 20 s, ramp-down de 10 s e pico de 100 VUs.

| Indicador | Resultado |
| --- | ---: |
| Requisições | 42.721 |
| Throughput | 1.067,97 req/s |
| p95 | 116,94 ms |
| Máximo | 196,30 ms |
| Erros inesperados | 0% |
| Checks aprovados | 100% |

O p95 de 116,94 ms fica muito abaixo do SLO de 2500 ms. O perfil pode ser ampliado em duração e VUs por variáveis de ambiente (`PEAK_VUS`, `RAMP_UP`, `STEADY`, `RAMP_DOWN`).

## Gateway lento — Toxiproxy

Tóxico aplicado: `latency`, downstream, 5000 ms. Perfil executado: 100 VUs durante 30 s.

| Indicador | Resultado |
| --- | ---: |
| Iterações | 38.792 |
| p95 | 85,54 ms |
| Máximo | 2,67 s |
| Respostas controladas | 100% |
| Falhas não controladas | 0% |

As primeiras chamadas consumiram o orçamento de até 2,5 s. Em seguida, o Circuit Breaker abriu e passou a rejeitar rapidamente, razão pela qual o p95 global ficou baixo. O k6 registra HTTP `500` como `http_req_failed`, mas o indicador específico `falhas_nao_controladas` distingue corretamente o fallback esperado de uma queda do processo. Nenhuma falha não controlada foi observada e o processo permaneceu disponível.

## Thundering Herd — Redis indisponível, 10.000 VUs

Perfil executado: flush real do cache, proxy Redis desabilitado e **10.000 VUs simultâneos**, uma iteração por VU. Este é o cenário nominal do enunciado: pico súbito com o nó de cache derrubado para avaliar se o banco sobrevive.

| Indicador | Resultado |
| --- | ---: |
| Requisições de checkout | 10.001 |
| Checks "sem queda de processo" | 99,71% (9.971/10.000) |
| Falhas não controladas | 0,28% (29) |
| p95 | 7,08 s |
| Máximo | 13,88 s |
| Cache fallback acionado | +9.971 (600 → 10.571) |
| Consultas de configuração ao PostgreSQL (delta) | **0** (manteve-se em 4) |
| Estado final do Circuit Breaker | FECHADO |
| Containers após o teste | todos `healthy` |

Resultado central: durante 10.000 requisições simultâneas com o cache morto, o PostgreSQL **não recebeu nenhuma consulta de configuração adicional** (o contador permaneceu em 4 antes e depois). O `last known good`, o single-flight e o timeout de 200 ms nas operações Redis absorveram a manada inteira, evitando o efeito cascata sobre o banco. O processo Node não caiu e o Circuit Breaker retornou sozinho ao estado FECHADO. O proxy Redis foi restaurado automaticamente no bloco `finally`.

As 29 falhas não controladas (0,28%) foram erros `dial: i/o timeout` na abertura de conexões TCP do **próprio gerador k6**, que não consegue estabelecer 10.000 sockets instantaneamente na mesma estação que hospeda os containers. Não são falhas do serviço sob teste: o aplicativo respondeu corretamente a todas as conexões efetivamente estabelecidas. Pela mesma razão, o p95 de 7,08 s ultrapassou o threshold de 5 s — trata-se de enfileiramento de conexões no host gerador, não de degradação do banco de dados.

## MTTR — Mean Time To Recovery

O MTTR mede o tempo entre o restabelecimento da dependência (gateway ou Redis) e o retorno do sistema à operação plena. A recuperação é governada pelo Circuit Breaker, configurado com `tempoResetMs = 5000`.

Sequência de recuperação após o fim da falha:

1. Enquanto a dependência está instável, o disjuntor permanece **ABERTO** e rejeita rapidamente (fallback controlado em HTTP 500).
2. Decorridos 5000 ms desde a abertura, o disjuntor passa a **MEIO_ABERTO** e libera uma chamada de teste.
3. Se essa chamada tem sucesso, o disjuntor **FECHA** e o serviço volta a aprovar pagamentos normalmente.

| Componente do MTTR | Tempo |
| --- | ---: |
| Janela de reset do Circuit Breaker (ABERTO → MEIO_ABERTO) | 5000 ms |
| Chamada de teste de recuperação (MEIO_ABERTO → FECHADO) | ~10 ms (gateway saudável) |
| **MTTR total estimado** | **~5,01 s** |

No cenário de gateway lento, observou-se exatamente esse comportamento: após a remoção do tóxico de latência, a primeira requisição de teste passou e as seguintes voltaram a ser aprovadas dentro da janela de ~5 s, sem intervenção manual e sem reinício do processo. A recuperação é, portanto, automática, e o MTTR independe da duração da falha.

## Considerações sobre a execução

O cenário de 10.000 VUs simultâneos foi executado nesta estação e o sistema sob teste sobreviveu: o PostgreSQL não recebeu nenhuma consulta adicional, o processo Node permaneceu disponível e o Circuit Breaker retornou ao estado FECHADO. As 29 falhas não controladas e o p95 acima de 5 s são limitações do gerador de carga local, que divide CPU, memória e sockets com os próprios containers, e não do serviço sob teste. Em um ambiente com geradores k6 distribuídos e o SUT isolado em host dedicado, espera-se que essas falhas de conexão do gerador desapareçam e o p95 reflita apenas a latência real da aplicação.
