# Criação de grupos inline no cadastro de amigo

Responsável: Vinicius
Data: 2026-10-20
Status: Aceito

**Atualização 2026-10-21**: Traduzido para inglês (rotas e campos) e movida edição/exclusão de grupos para dentro do MVP.

## Contexto

O sistema tem grupos (`Group`) para organizar amigos. Precisamos definir o fluxo de criação, edição e exclusão de grupos.

## Problema

Uma tela dedicada de gestão de grupos no MVP adicionaria complexidade e telas adicionais sem valor claro no início.

## Decisão

No MVP, **um grupo só nasce pelo chip "+ novo grupo"** na tela de cadastro/edição de amigo. O usuário informa nome e escolhe uma das 5 cores, e o grupo já vem marcado para esse amigo.

Edição e exclusão de grupos também ocorrem **a partir dos chips de grupo no formulário do amigo**, sem tela dedicada.

### API

- `GET /api/groups/` — lista grupos do usuário (inclui `friends_count`)
- `POST /api/groups/` — cria novo grupo (name + color)
- `PATCH /api/groups/{id}/` — edita grupo (nome e/ou cor)
- `DELETE /api/groups/{id}/` — remove grupo (apenas desvincula amigos, nunca exclui amigos)
- Restrição única: `(owner, name)` case-insensitively

Nome de grupo é **único por owner, case-insensitively** ("Família" e "família" são o mesmo nome).

## Consequências

- Fluxo simplificado: cria, edita e exclui grupos no momento que precisa
- Sem tela dedicada de gestão de grupos no MVP
- Grupos órfãos (sem amigos) podem existir, mas não há fluxo para listá-los
- Exclusão de grupo apenas desvincula amigos; amigo sem grupos aparece com post-it neutro
- Alinhamento com a régua de simplicidade
