const { setWorldConstructor } = require('@cucumber/cucumber');

class CheckoutWorld {

    constructor() {

        this.gateway = {};

        this.emailMock = {
            enviarConfirmacao: jest.fn()
        };

        this.repository = {
            salvar: jest.fn()
        };

    }

}

setWorldConstructor(CheckoutWorld);