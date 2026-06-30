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

    test('passa para meio-aberto após o tempo de reset e fecha com sucesso', () => {
        let agora = 0;
        const cb = new CircuitBreaker({
            limiteAmostras: 1,
            tempoResetMs: 100,
            agora: () => agora
        });
        cb.registrarFalha();
        expect(cb.estaAberto()).toBe(true);

        agora = 100;
        expect(cb.estaAberto()).toBe(false);
        expect(cb.estado()).toBe('MEIO_ABERTO');

        cb.registrarSucesso();
        expect(cb.estado()).toBe('FECHADO');
    });

    test('mantém somente a janela deslizante configurada', () => {
        const cb = new CircuitBreaker({ limiteAmostras: 2 });
        cb.registrarFalha();
        cb.registrarSucesso();
        expect(cb.estado()).toBe('FECHADO');
        cb.registrarFalha();
        expect(cb.estado()).toBe('FECHADO');
        cb.registrarFalha();
        expect(cb.estado()).toBe('ABERTO');
    });

    test('reabre quando a tentativa em meio-aberto falha', () => {
        let agora = 0;
        const cb = new CircuitBreaker({
            limiteAmostras: 1,
            tempoResetMs: 100,
            agora: () => agora
        });
        cb.registrarFalha();
        agora = 100;
        cb.estaAberto();
        cb.registrarFalha();
        expect(cb.estado()).toBe('ABERTO');
    });

});
