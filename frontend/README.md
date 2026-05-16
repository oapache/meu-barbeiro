# Frontend - O Corte Certo

## Setup
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## API
Por padrão o frontend usa:

```env
NEXT_PUBLIC_API_URL=https://api.ocortecerto.com/api
```

Use `NEXT_PUBLIC_BOT_API_URL` se o ChatBot ficar em outro host público. Se ficar vazio, as telas do ChatBot usam a mesma API base, então o proxy de produção precisa encaminhar `/api/chatbot/*` para o serviço `bot`.

## PWA
O app funciona como PWA - pode ser instalado no celular!

## Estrutura
- /src/app - Páginas Next.js App Router
- /src/components - Componentes React
- /src/services - Serviços de API
- /public - Arquivos estáticos

## Pages
- / - Home (landing)
- /login - Login
- /cadastro - Cadastro
- /barbearia - Dashboard da barbearia
