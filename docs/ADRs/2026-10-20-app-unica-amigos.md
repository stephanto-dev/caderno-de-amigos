# App Django única `amigos` para Amigo e Contato

Responsável: Vinicius
Data: 2026-10-20
Status: Aceito

## Contexto

O sistema tem dois modelos principais: `Amigo` (pessoa com ritmo de contato) e `Contato` (registro de interação).

## Problema

Separar em duas apps Django criaria importação cruzada, pois Contato depende de Amigo e as regras de negócio (calcular coluna do Quadro, registrar contato) usam os dois modelos juntos.

## Decisão

**Uma app Django `amigos`** em `src/apps/amigos/` contendo:
- `models/amigo.py` e `models/contato.py` (um arquivo por model)
- Services em `services/` (ex: `RegistrarContatoService`, cálculo da coluna do Quadro)
- Views e serializers finos, delegando lógica para services

Contato não existe sem Amigo (`on_delete=CASCADE`). Separa-se quando as partes mudam de forma independente, não é o caso aqui.

## Consequências

- Importações simples dentro da mesma app
- Services concentram a lógica de negócio
- Views apenas orquestram (instantiate service, call, serialize result)
- Se no futuro surgir outro domínio independente, cria-se nova app
