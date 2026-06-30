/**
 * Erro de domínio lançado quando o payload recebido pela rota de checkout
 * não atende às regras de negócio RN01 (validação de entrada).
 *
 * Carregar a lista de `motivos` permite que a camada HTTP (server.js)
 * monte uma resposta 400 detalhada, sem precisar conhecer as regras de
 * validação em si (Separation of Concerns).
 */
class DadosInvalidosError extends Error {
  constructor(motivos = []) {
    super(`Dados inválidos para checkout: ${motivos.join('; ')}`);
    this.name = 'DadosInvalidosError';
    this.motivos = motivos;
  }
}

module.exports = { DadosInvalidosError };