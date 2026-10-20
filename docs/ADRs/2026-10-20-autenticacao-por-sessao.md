# Autenticar a SPA via sessão Django

Responsável: Vinicius
Data: 2026-10-20
Status: Proposto

## Contexto

O projeto é uma SPA Vue servida pela mesma origem que a API Django (WhiteNoise serve o frontend buildado). Precisamos definir como a SPA vai autenticar as requisições para `/api`.

## Problema

A escolha clássica é entre tokens (Token Authentication do DRF) ou sessões (Session Authentication). Tokens exigem armazenar credenciais no browser (localStorage ou cookies) e configurar CORS se a SPA estiver em outra origem.

## Decisão

Usar **SessionAuthentication** do Django REST Framework, não TokenAuthentication.

### Por que sessão em vez de token

- **Same-origin**: A SPA e a API estão na mesma origem, então o cookie de sessão funciona sem configuração extra de CORS.
- **Sem token no browser**: Não precisamos armazenar um token no `localStorage` (vulnerável a XSS) nem gerenciar refresh/revogação.
- **CSRF built-in**: Django já protege contra CSRF com o middleware padrão. A SPA só precisa ler o cookie `csrftoken` e enviar no header `X-CSRFToken`.
- **Simplicidade**: Um fluxo a menos para implementar e documentar.

## Consequências

- A SPA precisa fazer login via POST para um endpoint que cria a sessão (ex: `/api/auth/login/`).
- Toda requisição para `/api` precisa incluir o header `X-CSRFToken`.
- Logout é POST para `/api/auth/logout/` que invalida a sessão.
- Se no futuro precisarmos de uma API pública ou mobile, podemos adicionar TokenAuthentication em paralelo, restrita aos endpoints que precisam.
