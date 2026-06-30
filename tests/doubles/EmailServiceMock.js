class EmailServiceMock {
  constructor() {
    this.enviado = false;
    this.destinatario = null;
  }

  async enviarConfirmacao(email, mensagem) {
    this.enviado = true;
    this.destinatario = email;
    this.mensagem = mensagem;
  }
}

module.exports = { EmailServiceMock };