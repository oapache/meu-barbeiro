const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('cadastro com termos LGPD', () => {
  it('exige aceite explicito e mostra links para os documentos legais', () => {
    const page = read('frontend/src/app/cadastro/page.tsx');

    expect(page).toContain('termsAccepted');
    expect(page).toContain('/termos-de-uso');
    expect(page).toContain('/politica-de-privacidade');
    expect(page).toContain('Li e aceito');
  });

  it('publica paginas de Termos de Uso e Politica de Privacidade', () => {
    const termos = read('frontend/src/app/termos-de-uso/page.tsx');
    const privacidade = read('frontend/src/app/politica-de-privacidade/page.tsx');

    expect(termos).toContain('Termos de Uso');
    expect(termos).toContain('O Corte Certo');
    expect(privacidade).toContain('Política de Privacidade');
    expect(privacidade).toContain('LGPD');
  });
});
