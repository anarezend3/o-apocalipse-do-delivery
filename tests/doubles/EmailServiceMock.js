class EmailServiceMock {
  constructor() {
    this.enviado = false;
    this.destinatario = null;
    this.mensagens = [];
  }

  publicar(mensagem) {
    this.enviado = true;
    this.destinatario = mensagem.destinatario;
    this.mensagem = mensagem;
    this.mensagens.push(mensagem);
    return Promise.resolve(1);
  }
}

module.exports = { EmailServiceMock };
