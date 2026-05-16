const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('separação entre API principal e serviço de bot', () => {
  it('mantém o backend principal sem runtime do chatbot do WhatsApp', () => {
    const index = read('backend/src/index.js');
    const backendPackage = JSON.parse(read('backend/package.json'));

    expect(index).not.toContain("require('./routes/admin')");
    expect(index).not.toContain("app.use('/api/chatbot'");
    expect(index).not.toContain("app.use('/api/admin'");
    expect(Object.keys(backendPackage.dependencies || {})).not.toContain('whatsapp-web.js');
    expect(Object.keys(backendPackage.dependencies || {})).not.toContain('qrcode');
  });

  it('expõe o chatbot em um serviço bot independente', () => {
    const botPackage = JSON.parse(read('bot/package.json'));
    const botIndex = read('bot/src/index.js');
    const dependencies = Object.keys(botPackage.dependencies || {});

    expect(dependencies).toContain('@whiskeysockets/baileys');
    expect(dependencies).toContain('bullmq');
    expect(dependencies).toContain('ioredis');
    expect(dependencies).toContain('qrcode');
    expect(dependencies).not.toContain('whatsapp-web.js');
    expect(dependencies).not.toContain('puppeteer');
    expect(botIndex).toContain("app.use('/api/chatbot'");
  });

  it('aponta o frontend para a API pública de produção por padrão', () => {
    const apiService = read('frontend/src/services/api.js');

    expect(apiService).toContain("https://api.ocortecerto.com/api");
    expect(apiService).toContain('NEXT_PUBLIC_BOT_API_URL');
  });
});
