# Routes

## Auth
POST /api/auth/register
POST /api/auth/login

## Users
GET /api/users/me
PUT /api/users/me

## Barbearias
GET /api/barbearias
POST /api/barbearias
GET /api/barbearias/:id
PUT /api/barbearias/:id
DELETE /api/barbearias/:id

## Serviços
GET /api/barbearias/:barbeariaId/servicos
POST /api/barbearias/:barbeariaId/servicos
PUT /api/servicos/:id
DELETE /api/servicos/:id

## Agendamentos
GET /api/agendamentos
POST /api/agendamentos
PUT /api/agendamentos/:id
DELETE /api/agendamentos/:id
