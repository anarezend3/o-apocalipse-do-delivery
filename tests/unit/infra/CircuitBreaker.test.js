const { CircuitBreaker } = require('../../../src/infra/CircuitBreaker');

describe('CircuitBreaker', () => {

    test('inicia fechado', () => {

        const cb = new CircuitBreaker();

        expect(cb.estaAberto()).toBe(false);

    });

    test('abre quando a taxa de falhas ultrapassa 50%', () => {

        const cb = new CircuitBreaker();

        for (let i = 0; i < 4; i++) cb.registrarSucesso();
        for (let i = 0; i < 6; i++) cb.registrarFalha();

        expect(cb.estaAberto()).toBe(true);

    });

    test('permanece fechado quando a taxa é igual a 50%', () => {

        const cb = new CircuitBreaker();

        for (let i = 0; i < 5; i++) cb.registrarSucesso();
        for (let i = 0; i < 5; i++) cb.registrarFalha();

        expect(cb.estaAberto()).toBe(false);

    });

});