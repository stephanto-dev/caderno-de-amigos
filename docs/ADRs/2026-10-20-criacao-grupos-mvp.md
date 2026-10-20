# Criação de grupos inline no cadastro de amigo

Responsável: Vinicius
Data: 2026-10-20
Status: Aceito

## Contexto

O sistema tem grupos (`Grupo`) para organizar amigos. Precisamos definir o fluxo de criação, edição e exclusão de grupos.

## Problema

Uma tela dedicada de gestão de grupos no MVP adicionaria complexidade e telas adicionais sem valor claro no início.

## Decisão

No MVP, **um grupo só nasce pelo chip "+ novo grupo"** na tela de cadastro/edição de amigo. O usuário informa nome e escolhe uma das 5 cores, e o grupo já vem marcado para esse amigo.

### API

- `GET /api/grupos/` — lista grupos do usuário
- `POST /api/grupos/` — cria novo grupo (nome + cor)
- Restrição única: `(owner, nome)`

Editar ou apagar grupo **fica para depois do MVP**.

## Consequências

- Fluxo simplificado: cria grupo no momento que precisa
- Sem tela dedicada de gestão de grupos no MVP
- Grupos órfãos (sem amigos) podem existir, mas não há fluxo para listá-los
- Futura edição/exclusão de grupos precisa considerar amigos associados
- Alinhamento com a régua de simplicidade
