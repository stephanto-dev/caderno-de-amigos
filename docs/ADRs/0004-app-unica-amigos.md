# App Django única `amigos` para Friend e Contact

Responsável: Vinicius
Data: 2026-10-20
Status: Aceito

## Contexto

O sistema tem dois modelos principais: `Amigo` (pessoa com ritmo de contato) e `Contato` (registro de interação). Precisamos decidir se criamos uma ou duas apps Django.

## Decisão

**Uma app Django `amigos`** em `src/apps/amigos/` contendo:
- `models/amigo.py` e `models/contato.py` (um arquivo por model)
- Services em `services/` (ex: `RegistrarContatoService`, cálculo da coluna do Quadro)
- Views e serializers finos, delegando lógica para services

### Por que uma app em vez de duas

- Contato não existe sem Amigo (`on_delete=CASCADE`)
- As regras usam os dois modelos juntos
- Separar em duas apps criaria importação cruzada
- Separa-se quando as partes mudam de forma independente, não é o caso aqui

## Consequências

- Importações simples dentro da mesma app
- Services concentram a lógica de negócio
- Views apenas orquestram (instantiate service, call, serialize result)
- Se no futuro surgir outro domínio independente, cria-se nova app
