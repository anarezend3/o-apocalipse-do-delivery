const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');
const { CheckoutService } = require('../../../src/services/CheckoutService');
const { GatewayPagamentoClient } = require('../../../src/infra/GatewayPagamentoClient');
const { CircuitBreaker } = require('../../../src/infra/CircuitBreaker');
const { PedidoBuilder } = require('../../builders/PedidoBuilder');
const { GatewayPagamentoStub } = require('../../doubles/GatewayPagamentoStub');
const { EmailServiceMock } = require('../../doubles/EmailServiceMock');
const { PedidoRepositoryMock } = require('../../doubles/PedidoRepositorioMock');
const { SolicitacaoCheckout } = require('../../../src/domain/SolicitacaoCheckout');

Given('um sistema de checkout disponível', function () {
  this.gateway = new GatewayPagamentoStub();
  this.filaEmail = new EmailServiceMock();
  this.repository = new PedidoRepositoryMock();
  this.client = new GatewayPagamentoClient(this.gateway, new CircuitBreaker(), {
    timeoutMs: 20,
    orcamentoTotalMs: 100,
    intervaloBackoffMs: 0,
    jitterMs: 0,
  });
  this.service = new CheckoutService(this.client, this.repository, this.filaEmail);
});

Given('um pedido válido', function () {
  this.pedido = new PedidoBuilder().build();
});

Given('um pedido válido com valor maior que zero', function () {
  this.pedido = new PedidoBuilder().build();
});

Given('um cartão válido', function () {
  assert.ok(this.pedido.cartao.numero);
});

Given('um pedido sem email ou valor inválido', function () {
  this.payload = { clienteEmail: '', valor: 0, cartao: {} };
});

Given('o gateway responderá {string}', function (status) {
  this.gateway.setCenario(status);
});

Given('o gateway falha na primeira tentativa e aprova na segunda', function () {
  this.gateway.setCenario('FALHA_DEPOIS_APROVA');
});

Given('o gateway falha em todas as tentativas', function () {
  this.gateway.setCenario('FALHA_TOTAL');
});

Given('o gateway demora mais que o tempo permitido', function () {
  this.gateway.setCenario('TIMEOUT');
});

Given('o gateway está indisponível', function () {
  this.gateway.setCenario('FALHA_TOTAL');
});

When('o cliente realiza o checkout', async function () {
  if (this.payload) {
    try {
      SolicitacaoCheckout.criar(this.payload);
    } catch (erro) {
      this.erroValidacao = erro;
    }
    return;
  }
  this.resultado = await this.service.processar(this.pedido);
});

Then('o pedido deve ter status {string}', function (status) {
  assert.equal(this.pedido.status, status);
});

Then('um email de confirmação deve ser enviado', function () {
  assert.equal(this.filaEmail.enviado, true);
});

Then('um email deve ser enviado', function () {
  assert.equal(this.filaEmail.enviado, true);
});

Then('nenhum email deve ser enviado', function () {
  assert.equal(this.filaEmail.enviado, false);
});

Then('o sistema deve retornar sucesso {string}', function (codigo) {
  assert.equal(this.resultado.httpStatus, Number(codigo));
});

Then('o sistema deve retornar erro {string}', function (codigo) {
  if (this.erroValidacao) {
    assert.equal(Number(codigo), 400);
  } else {
    assert.equal(this.resultado.httpStatus, Number(codigo));
  }
});

Then('o sistema deve tentar novamente automaticamente', function () {
  assert.equal(this.gateway.chamadas, 2);
});

Then('o sistema deve acionar fallback', function () {
  assert.equal(this.resultado.httpStatus, 500);
});

Then('o gateway não deve ser chamado', function () {
  assert.equal(this.gateway.chamadas, 0);
});
