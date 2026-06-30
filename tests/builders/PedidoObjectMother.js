const { PedidoBuilder } = require('../builders/PedidoBuilder');

class PedidoObjectMother {

    static pedidoValido() {

        return new PedidoBuilder().build();

    }

    static pedidoComValorAlto() {

        return new PedidoBuilder()
            .comValor(100000)
            .build();

    }

    static pedidoComEmailInvalido() {

        return new PedidoBuilder()
            .comEmail("teste")
            .build();

    }

}

module.exports = {
    PedidoObjectMother
};
