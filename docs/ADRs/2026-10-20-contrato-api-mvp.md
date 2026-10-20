# Contrato da API do MVP

Responsável: Vinicius
Data: 2026-10-20
Status: Aceito

## Contexto

Definição dos endpoints da API REST do Django REST Framework que o frontend Vue consome.

## Problema

Sem contrato claro, frontend e backend evoluem de forma descoordenada, gerando retrabalho e bugs de integração.

## Decisão

### Autenticação (sessão)

- `POST /api/login/` — cria sessão
- `POST /api/logout/` — invalida sessão
- `GET /api/me/` — verifica se está logado, devolve `csrftoken`

### Amigos

- `GET /api/amigos/` — lista com `coluna` calculada, último contato, última nota, grupos em ordem alfabética
- `POST /api/amigos/` — cria amigo
- `GET /api/amigos/{id}/` — detalhe de um amigo
- `PATCH /api/amigos/{id}/` — edita amigo
- `DELETE /api/amigos/{id}/` — remove amigo

### Contatos (nested routes)

- `POST /api/amigos/{id}/contatos/` — registra contato (corpo: tipo, nota), devolve amigo atualizado
- `DELETE /api/amigos/{id}/contatos/{contato_id}/` — desfaz contato recente

A view sempre confere que o amigo pertence ao usuário (`owner`).

### Grupos

- `GET /api/grupos/` — lista grupos do usuário
- `POST /api/grupos/` — cria grupo

### Quadro

Sem endpoint próprio. O Vue agrupa a lista de amigos pelo campo `coluna` retornado em `GET /api/amigos/`.

### Fora do MVP

- Listar ou editar contatos (nenhuma tela mostra histórico completo)
- Telefone (decisão de produto, não existe no modelo)
- Editar/apagar grupos

## Consequências

- API RESTful simples, fácil de documentar
- `coluna` calculada no backend evita duplicação de regra
- Nested routes deixam claro que contato pertence a amigo
- DELETE de contato permite "desfazer" um clique errado
- Último contato derivado atualiza automaticamente após DELETE
- Frontend e backend podem evoluir com contrato estável
