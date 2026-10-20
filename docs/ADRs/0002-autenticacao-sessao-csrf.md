# Autenticação por sessão Django com CSRF

Responsável: Vinicius
Data: 2026-10-20
Status: Aceito

## Contexto

O projeto é uma SPA Vue servida pela mesma origem que a API Django. Precisamos definir como autenticar as requisições para `/api`.

## Decisão

Usar **SessionAuthentication** do Django REST Framework com proteção CSRF nativa do Django.

O Vue faz login em `POST /api/login/` e recebe um cookie de sessão. Em cada requisição que altera dados, envia o token CSRF (do cookie `csrftoken` no header `X-CSRFToken`).

### Por que sessão em vez de JWT

- **Same-origin**: Frontend e API no mesmo endereço, cookie funciona naturalmente
- **Segurança**: Nada exposto no `localStorage`, logout é imediato
- **Simplicidade**: Sem token de renovação para gerenciar
- **Independência**: A sessão não depende do Django Admin

### Alternativa descartada

**JWT com djangorestframework-simplejwt** só se justifica para apps mobile, múltiplos domínios ou integração com outros sistemas. Better Auth é biblioteca TypeScript/Node, não serve para backend Django.

## Consequências

- Login via `POST /api/login/`
- Logout via `POST /api/logout/`
- Endpoint `GET /api/me/` para verificar autenticação e obter token CSRF
- Todas as requisições POST/PATCH/DELETE precisam incluir `X-CSRFToken`
- No futuro, JWT pode ser adicionado em paralelo se necessário
