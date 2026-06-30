Feature: Checkout e liquidação de pedidos
  Como cliente da EntregasJá
  Quero realizar pagamentos via checkout
  Para concluir minhas compras com segurança e resiliência

  Background:
    Given um sistema de checkout disponível

  Scenario: Pagamento aprovado com sucesso
    Given um pedido válido com valor maior que zero
    And um cartão válido
    When o cliente realiza o checkout
    And o gateway responde "APROVADO"
    Then o pedido deve ter status "PROCESSADO"
    And um email de confirmação deve ser enviado
    And o sistema deve retornar sucesso "200"

  Scenario: Pagamento recusado pelo gateway
    Given um pedido válido com valor maior que zero
    And um cartão válido
    When o cliente realiza o checkout
    And o gateway responde "RECUSADO"
    Then o pedido deve ter status "FALHOU"
    And nenhum email deve ser enviado
    And o sistema deve retornar erro "500"

  Scenario: Retry com sucesso após falha temporária
    Given um pedido válido
    And o gateway falha na primeira tentativa e aprova na segunda
    When o cliente realiza o checkout
    Then o sistema deve tentar novamente automaticamente
    And o pedido deve ter status "PROCESSADO"
    And um email deve ser enviado

  Scenario: Falha total do gateway (circuit breaker)
    Given um pedido válido
    And o gateway falha em todas as tentativas
    When o cliente realiza o checkout
    Then o sistema deve acionar fallback
    And o pedido deve ter status "ERRO_GATEWAY"
    And o sistema deve retornar erro "500"

  Scenario: Payload inválido
    Given um pedido sem email ou valor inválido
    When o cliente realiza o checkout
    Then o sistema deve retornar erro "400"
    And o gateway não deve ser chamado

    Scenario: Timeout no gateway de pagamento

  Given um pedido válido

  And o gateway demora mais que o tempo permitido

  When o cliente realiza o checkout

  Then o sistema deve retornar erro 500

  And nenhum email deve ser enviado



Scenario: Erro de infraestrutura

  Given um pedido válido

  And o gateway está indisponível

  When o cliente realiza o checkout

  Then o sistema deve retornar erro 500

  And nenhum email deve ser enviado