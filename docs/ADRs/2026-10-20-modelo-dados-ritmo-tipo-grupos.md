# Modelo de dados: ritmo, tipo de contato e grupos

Responsável: Vinicius
Data: 2026-10-20
Status: Aceito

**Atualização 2026-10-21**: Traduzido para inglês (nomes de campos, models e valores enum).

## Contexto

Precisamos definir como representar o ritmo de contato desejado, o tipo de cada contato e a organização de amigos em grupos.

## Problema

Ritmo só em dias perde semântica ("30 dias" não é "1 mês" na interface). Cor livre de grupo pode gerar problemas de contraste. Relacionamento 1:N ou N:N para grupos tem trade-offs.

## Decisão

### Ritmo

Dois campos no `Friend`:
- `cadence_amount`: inteiro positivo
- `cadence_unit`: `TextChoices` (day, week, month, year)

Guardados como o usuário escolheu. O service converte para dias só no momento do cálculo:
- day = 1
- week = 7
- month = 30
- year = 365

### Tipo de contato

`TextChoices` fixo: `message`, `call`, `meeting`.

### Grupo

Model próprio `Group` com `name`, `color`, `owner`. Ligado ao `Friend` por `ManyToManyField` opcional (`blank=True`).

Escolha do Vinicius: amigos podem estar em múltiplos grupos (ex: "família" e "faculdade").

### Cor do grupo

`Group.color` é `TextChoices` com 5 tokens da paleta: `family`, `college`, `work`, `neighborhood`, `neutral`. Sem hex livre, pois só essas cores têm contraste AA conferido.

A API devolve os grupos de cada amigo em ordem alfabética. O post-it usa a cor do primeiro grupo e mostra todos como etiquetas. Amigo sem grupo usa o post-it neutro.

## Consequências

- Service converte ritmo para dias apenas no cálculo
- Tela de edição preserva a unidade original ("1 mês", não "30 dias")
- Um amigo pode ter 0, 1 ou N grupos
- Cores limitadas garantem acessibilidade AA
- Ordenação alfabética de grupos é determinística
