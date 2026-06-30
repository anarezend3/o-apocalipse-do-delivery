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

## Baseline Black Friday — smoke

Perfil executado: ramp-up de 2 s, steady de 3 s, ramp-down de 2 s e pico de 5 VUs.

| Indicador | Resultado |
| --- | ---: |
| Requisições | 3.774 |
| Throughput | 539,20 req/s |
| p95 | 10,91 ms |
| Máximo | 30,70 ms |
| Erros inesperados | 0% |
| Checks aprovados | 100% |

O perfil curto é uma validação técnica do script. O teste oficial permite aumentar duração e VUs por variáveis de ambiente.

## Gateway lento — Toxiproxy

Tóxico aplicado: `latency`, downstream, 5000 ms. Perfil de fumaça: 5 VUs durante 5 s.

| Indicador | Resultado |
| --- | ---: |
| Iterações | 2.627 |
| p95 | 4,80 ms |
| Máximo | 2,57 s |
| Respostas controladas | 100% |
| Falhas não controladas | 0% |

As primeiras chamadas consumiram o orçamento de até 2,5 s. Em seguida, o Circuit Breaker abriu e passou a rejeitar rapidamente, razão pela qual o p95 global ficou baixo. O k6 registra HTTP `500` como `http_req_failed`, mas o indicador específico `falhas_nao_controladas` distingue corretamente o fallback esperado de uma queda do processo.

## Thundering Herd — Redis indisponível

Perfil executado: flush real do cache, proxy Redis desabilitado e 100 VUs simultâneos, uma iteração por VU.

| Indicador | Resultado |
| --- | ---: |
| Requisições de checkout | 100 |
| p95 | 443,18 ms |
| Máximo | 445,45 ms |
| Checks aprovados | 100% |
| Cache fallback | 100 |
| Consultas de configuração ao PostgreSQL | 1 |

O `last known good`, o single-flight e o timeout de operações Redis impediram uma consulta ao banco por requisição. O proxy foi restaurado automaticamente ao final.

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

## Limite da evidência

O script oficial está configurado para 10.000 VUs simultâneos, mas essa volumetria não foi executada nesta estação. Sua execução exige dimensionamento de CPU, memória, limites de sockets e, preferencialmente, geradores k6 distribuídos. O trabalho não atribui resultados não medidos a esse perfil.
