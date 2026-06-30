const { setWorldConstructor } = require('@cucumber/cucumber');

class CheckoutWorld {
  constructor() {
    this.resultado = null;
    this.erroValidacao = null;
  }
}

setWorldConstructor(CheckoutWorld);
