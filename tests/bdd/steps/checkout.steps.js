const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

const { CheckoutService } = require('../../../src/services/CheckoutService');
const { PedidoBuilder } = require('../../builders/PedidoBuilder');
const { GatewayPagamentoStub } = require('../../doubles/GatewayPagamentoStub');
const { EmailServiceMock } = require('../../doubles/EmailServiceMock');
const { PedidoRepositoryMock } = require('../../doubles/PedidoRepositoryMock');
const { CircuitBreaker } = require('../../../src/infra/CircuitBreaker');

let service;
let resultado;
let gateway;
let emailMock;
let repo;

Given('um sistema de checkout disponível', function () {
  gateway = new GatewayPagamentoStub();
  emailMock = new EmailServiceMock();
  repo = new PedidoRepositoryMock();

  const circuitBreaker = new CircuitBreaker();

  service = new CheckoutService(gateway, repo, emailMock, circuitBreaker);
});

Given('um pedido válido com valor maior que zero', function () {
  this.pedido = PedidoBuilder.umPedidoValido().build();
});

Given('um cartão válido', function () {
  this.pedido.cartao = { numero: '1234', validade: '12/30', cvv: '123' };
});

Given('um pedido sem email ou valor inválido', function () {
  this.pedido = PedidoBuilder.umPedidoInvalido().build();
});

Given('o gateway falha na primeira tentativa e aprova na segunda', function () {
  gateway.setCenario('FALHA_DEPOIS_APROVA');
});

Given('o gateway falha em todas as tentativas', function () {
  gateway.setCenario('FALHA_TOTAL');
});

When('o cliente realiza o checkout', async function () {
  resultado = await service.processar(this.pedido);
});

When('o gateway responde {string}', function (status) {
  gateway.setCenario(status);
});

Then('o pedido deve ter status {string}', function (status) {
  assert.strictEqual(this.pedido.status, status);
});

Then('um email de confirmação deve ser enviado', function () {
  assert.strictEqual(emailMock.enviado, true);
});

Then('nenhum email deve ser enviado', function () {
  assert.strictEqual(emailMock.enviado, false);
});

Then('o sistema deve retornar sucesso {string}', function (code) {
  assert.ok(resultado !== null);
});

Then('o sistema deve retornar erro {string}', function () {
  assert.ok(resultado === null);
});

Then('o gateway não deve ser chamado', function () {
  assert.strictEqual(gateway.chamadas, 0);
});

Given('o gateway demora mais que o tempo permitido', function () {

    this.gateway.cobrar = jest.fn().mockRejectedValue(
        new Error('Timeout')
    );

});

Then('o sistema deve retornar erro 500', function () {

    expect(this.resultado.httpStatus).toBe(500);

});

Given('o gateway está indisponível', function () {

    this.gateway.cobrar = jest.fn().mockRejectedValue(
        new Error('Gateway indisponível')
    );

});

Then('nenhum email deve ser enviado', function () {

    expect(
        this.emailMock.enviarConfirmacao
    ).not.toHaveBeenCalled();

});