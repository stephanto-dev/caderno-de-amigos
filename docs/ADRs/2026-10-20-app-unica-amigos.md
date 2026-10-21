# App Django única `friends` para Friend e Contact

Responsável: Vinicius
Data: 2026-10-20
Status: Aceito

**Atualização 2026-10-21**: Traduzido para inglês (nomes de apps, models e services).

## Contexto

O sistema tem dois modelos principais: `Friend` (pessoa com ritmo de contato) e `Contact` (registro de interação).

## Problema

Separar em duas apps Django criaria importação cruzada, pois Contact depende de Friend e as regras de negócio (calcular coluna do Quadro, registrar contato) usam os dois modelos juntos.

## Decisão

**Uma app Django `friends`** em `backend/src/apps/friends/` contendo:
- `models/friend.py` e `models/contact.py` (um arquivo por model)
- Services em `services/` (ex: `ContactsService` planejado para `record_contact` e `undo_contact`, cálculo da coluna do Quadro via `BoardService`)
- Views e serializers finos, delegando lógica para services

Contact não existe sem Friend (`on_delete=CASCADE`). Separa-se quando as partes mudam de forma independente, não é o caso aqui.

## Consequências

- Importações simples dentro da mesma app
- Services concentram a lógica de negócio
- Views apenas orquestram (instantiate service, call, serialize result)
- Se no futuro surgir outro domínio independente, cria-se nova app
