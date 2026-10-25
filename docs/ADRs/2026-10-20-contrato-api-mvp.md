# Contrato da API do MVP

Responsável: Vinicius
Data: 2026-10-20
Status: Aceito

**Atualização 2026-10-21**: Traduzido para inglês (nomes de rotas, campos e valores) e movida edição/exclusão de grupos para dentro do MVP.

**Atualização 2026-10-25 (CRM-8)**: O POST de contato também retorna `contact_id` para permitir desfazer sem um endpoint de histórico.

**Atualização 2026-10-25 (CRM-10)**: Migrados os IDs de Friend, Group e Contact de AutoField para UUIDField. URLs e JSON usam UUIDs em formato string (ex: `/api/friends/381f7c9e-0201-4e5c-8ef8-92daa351609f/`). O `contact_id` retornado no POST também é UUID string.

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
- `GET /api/me/` — verifica se está logado, seta o cookie `csrftoken`
  - Resposta: `{"authenticated": true|false, "user": "username"|null}`

### Amigos

- `GET /api/friends/` — lista amigos do usuário, já ordenada pelo backend (colunas overdue, this_week, on_track, just_talked; dentro da coluna por urgência)
  - Campos: `id`, `name`, `cadence_amount` (≥1), `cadence_unit`, `column`, `last_contact_at`, `last_note`, `groups`
- `POST /api/friends/` — cria amigo, retorna `201` **(planejado em CRM-6)**
  - Corpo: `{"name": "...", "cadence_amount": N, "cadence_unit": "day|week|month|year", "groups": [ids]}`
  - `cadence_amount` deve ser ≥ 1
- `GET /api/friends/{id}/` — detalhe de um amigo
- `PATCH /api/friends/{id}/` — edita amigo **(planejado em CRM-6)**
- `DELETE /api/friends/{id}/` — remove amigo, retorna `204` **(planejado em CRM-6)**

### Contatos (nested routes)

- `POST /api/friends/{id}/contacts/` — registra contato, retorna `201` com amigo atualizado
  - Corpo: `{"kind": "message|call|meeting", "note": "..."}` (`note` é opcional; `date` é setado pelo servidor para o momento atual)
  - Resposta: amigo com `last_contact_at` e `last_note` atualizados, mais `contact_id` do novo contato
- `DELETE /api/friends/{id}/contacts/{contact_id}/` — desfaz contato (qualquer contato daquele amigo), retorna `204`

A view sempre confere que o amigo pertence ao usuário (`owner`).

### Grupos

- `GET /api/groups/` — lista grupos do usuário **(planejado em CRM-7)**
  - Campos: `id`, `name`, `color`, `friends_count`
- `POST /api/groups/` — cria grupo, retorna `201` **(planejado em CRM-7)**
  - Corpo: `{"name": "...", "color": "family|college|work|neighborhood|neutral"}`
  - Nome duplicado (sem diferenciar maiúsculas) retorna `400` (planejado em CRM-7)
- `PATCH /api/groups/{id}/` — edita grupo (nome e/ou cor) **(planejado em CRM-7)**
- `DELETE /api/groups/{id}/` — remove grupo (apenas desvincula amigos, nunca exclui amigos), retorna `204` **(planejado em CRM-7)**

Nome de grupo será **único por owner sem diferenciar maiúsculas** ("Família" e "família" serão o mesmo nome) — planejado em CRM-7.

Edição e exclusão são feitas **a partir dos chips de grupo no formulário do amigo**, sem tela dedicada.

### Quadro

Sem endpoint próprio. O backend já retorna amigos ordenados (primeiro por coluna: overdue, this_week, on_track, just_talked; depois por urgência dentro da coluna). O Vue apenas agrupa pelo campo `column`.

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
