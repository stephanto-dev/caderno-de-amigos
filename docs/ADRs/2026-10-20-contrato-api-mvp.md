# Contrato da API do MVP

Responsável: Vinicius
Data: 2026-10-20
Status: Aceito

**Atualização 2026-10-21**: Traduzido para inglês (nomes de rotas, campos e valores) e movida edição/exclusão de grupos para dentro do MVP.

## Contexto

Definição dos endpoints da API REST do Django REST Framework que o frontend Vue consome.

## Problema

Sem contrato claro, frontend e backend evoluem de forma descoordenada, gerando retrabalho e bugs de integração.

## Decisão

### Autenticação (sessão)

- `POST /api/login/` — cria sessão
  - Corpo: `{"username": "...", "password": "..."}`
  - Resposta: `{"authenticated": true, "user": "username"}`
- `POST /api/logout/` — invalida sessão
- `GET /api/me/` — verifica se está logado, devolve `csrftoken`
  - Resposta: `{"authenticated": true|false, "user": "username"|null}`

### Amigos

- `GET /api/friends/` — lista com `column` calculada, último contato, última nota, grupos em ordem alfabética
  - Campos: `id`, `name`, `cadence_amount`, `cadence_unit`, `column`, `last_contact_at`, `last_note`, `groups`
- `POST /api/friends/` — cria amigo
  - Corpo: `{"name": "...", "cadence_amount": N, "cadence_unit": "day|week|month|year", "groups": [ids]}`
- `GET /api/friends/{id}/` — detalhe de um amigo
- `PATCH /api/friends/{id}/` — edita amigo
- `DELETE /api/friends/{id}/` — remove amigo

### Contatos (nested routes)

- `POST /api/friends/{id}/contacts/` — registra contato, devolve `201` com amigo atualizado
  - Corpo: `{"kind": "message|call|meeting", "date": "ISO 8601", "note": "..."}`
  - Resposta: amigo com `last_contact_at` e `last_note` atualizados
- `DELETE /api/friends/{id}/contacts/{contact_id}/` — desfaz contato recente, devolve `204`

A view sempre confere que o amigo pertence ao usuário (`owner`).

### Grupos

- `GET /api/groups/` — lista grupos do usuário
  - Campos: `id`, `name`, `color`, `friends_count`
- `POST /api/groups/` — cria grupo
  - Corpo: `{"name": "...", "color": "family|college|work|neighborhood|neutral"}`
- `PATCH /api/groups/{id}/` — edita grupo (nome e/ou cor)
- `DELETE /api/groups/{id}/` — remove grupo (apenas desvincula amigos, nunca exclui amigos)

Nome de grupo é **único por owner**, case-insensitively ("Família" e "família" são o mesmo nome).

Edição e exclusão são feitas **a partir dos chips de grupo no formulário do amigo**, sem tela dedicada.

### Quadro

Sem endpoint próprio. O Vue agrupa a lista de amigos pelo campo `column` retornado em `GET /api/friends/`.

Colunas possíveis: `just_talked`, `on_track`, `this_week`, `overdue`.

### Fora do MVP

- Listar ou editar contatos (nenhuma tela mostra histórico completo)
- Telefone (decisão de produto, não existe no modelo)

## Consequências

- API RESTful simples, fácil de documentar
- `column` calculada no backend evita duplicação de regra
- Nested routes deixam claro que contato pertence a amigo
- DELETE de contato permite "desfazer" um clique errado
- Último contato derivado atualiza automaticamente após DELETE
- Grupos podem ser editados e excluídos pelo usuário (edição de grupo integrada ao formulário de amigo)
- Frontend e backend podem evoluir com contrato estável
