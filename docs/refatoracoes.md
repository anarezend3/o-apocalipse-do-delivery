# Refatorações Aplicadas

## Extract Method

O método processar() do CheckoutService foi dividido em:

- criarResultado()
- finalizarPedido()

---

## Introduce Parameter Object

Foi criada a classe SolicitacaoCheckout para encapsular parâmetros relacionados ao checkout.

---

## Replace Conditional with Polymorphism

Os blocos if/else foram substituídos pelas classes:

- PagamentoAprovado
- PagamentoRecusado
- PagamentoComErroInfraestrutura

Cada classe implementa seu próprio comportamento.

---

## Test Smells Eliminados

### Obscure Setup

Resolvido utilizando:

- PedidoBuilder
- PedidoObjectMother

Os testes passaram a criar objetos de forma reutilizável e legível.