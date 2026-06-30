const { SolicitacaoCheckout } = require('../../../src/domain/SolicitacaoCheckout');
const { DadosInvalidosError } = require('../../../src/domain/erros/DadosInvalidosErro');

const valido = {
  clienteEmail: 'cliente@entregasja.com',
  valor: 20,
  cartao: { numero: '4111111111111111', validade: '12/30', cvv: '123' },
};

describe('SolicitacaoCheckout', () => {
  test('aceita payload válido', () => {
    expect(SolicitacaoCheckout.criar(valido)).toMatchObject(valido);
  });

  test.each([
    [{ ...valido, clienteEmail: 'invalido' }, 'clienteEmail'],
    [{ ...valido, clienteEmail: 'prefixo cliente@entregasja.com' }, 'clienteEmail'],
    [{ ...valido, clienteEmail: 'cliente@entregasja.com sufixo' }, 'clienteEmail'],
    [{ ...valido, valor: 0 }, 'valor'],
    [{ ...valido, valor: Number.NaN }, 'valor'],
    [{ ...valido, valor: '20' }, 'valor'],
    [{ ...valido, cartao: null }, 'cartao'],
    [{ ...valido, cartao: { validade: '12/30', cvv: '123' } }, 'cartao'],
    [{ ...valido, cartao: { numero: '1', cvv: '123' } }, 'cartao'],
    [{ ...valido, cartao: { numero: '1', validade: '12/30' } }, 'cartao'],
  ])('rejeita payload inválido %#', (payload, motivo) => {
    expect(() => SolicitacaoCheckout.criar(payload)).toThrow(DadosInvalidosError);
    try {
      SolicitacaoCheckout.criar(payload);
    } catch (erro) {
      expect(erro.motivos.join(' ')).toContain(motivo);
    }
  });

  test('erro mantém nome, motivos e mensagem legível', () => {
    try {
      SolicitacaoCheckout.criar({});
    } catch (erro) {
      expect(erro.name).toBe('DadosInvalidosError');
      expect(erro.motivos).toHaveLength(3);
      expect(erro.message).toBe(
        'Dados inválidos para checkout: clienteEmail ausente ou em formato inválido; valor deve ser numérico e maior que zero; cartao ausente ou incompleto (numero, validade e cvv são obrigatórios)',
      );
    }
  });
});
