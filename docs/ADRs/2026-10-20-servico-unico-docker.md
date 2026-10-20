# Serviço único no deploy com Dockerfile multi-stage

Responsável: Vinicius
Data: 2026-10-20
Status: Aceito

## Contexto

A arquitetura inicial (16/10/2026) previa dois serviços separados no Coolify: um para o backend Django e outro para o frontend Vue.

## Problema

Dois serviços geram complexidade de deploy, configuração de CORS, gestão de cookies entre origens, e coordenação de deploys independentes.

## Decisão

Em produção, **uma imagem Docker única** serve tanto a API Django quanto os arquivos estáticos do Vue compilado.

O `Dockerfile` usa dois estágios:
1. **Build stage**: Node compila o Vue com Vite
2. **Runtime stage**: Python copia os arquivos compilados e serve via WhiteNoise

O Postgres continua como serviço separado no Coolify.

### Desenvolvimento local

`docker compose up` sobe Postgres e Django. O Vite roda o dev server com proxy de `/api` para o Django.

### Por que um serviço em vez de dois

- **Same-origin**: Cookie de sessão e CSRF funcionam sem configuração de CORS
- **Deploy único**: Uma imagem só, menos coordenação
- **SRP preservado**: O código continua separado (`backend/` e `frontend/`), a fronteira é a API JSON
- **Reversível**: Separar em dois serviços depois não exige reescrita de código

## Consequências

- WhiteNoise serve arquivos estáticos em produção
- Frontend e backend compartilham o mesmo domínio e porta
- O monorepo `backend/` + `frontend/` se mantém
- Necessário configurar proxy no Vite para desenvolvimento local
