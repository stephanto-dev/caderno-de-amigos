# Modelo de dados: ritmo, tipo de contato e grupos

Responsável: Vinicius
Data: 2026-10-20
Status: Aceito

## Contexto

Precisamos definir como representar o ritmo de contato desejado, o tipo de cada contato e a organização de amigos em grupos.

## Decisão

### Ritmo

Dois campos no `Amigo`:
- `ritmo_quantidade`: inteiro positivo
- `ritmo_unidade`: `TextChoices` (dia, semana, mês, ano)

Guardados como o usuário escolheu. O service converte para dias só no momento do cálculo:
- dia = 1
- semana = 7
- mês = 30
- ano = 365

Guardar só em dias perderia a semântica "1 mês" na tela de edição.

### Tipo de contato

`TextChoices` fixo: `mensagem`, `ligacao`, `encontro`.

### Grupo

Model próprio `Grupo` com `name`, `cor`, `owner`. Ligado ao `Amigo` por `ManyToManyField` opcional (`blank=True`).

Escolha do Vinicius: amigos podem estar em múltiplos grupos (ex: "família" e "faculdade").

### Cor do grupo

`Grupo.cor` é `TextChoices` com 5 tokens da paleta: `familia`, `faculdade`, `trabalho`, `vizinhanca`, `neutro`. Sem hex livre, pois só essas cores têm contraste AA conferido.

A API devolve os grupos de cada amigo em ordem alfabética. O post-it usa a cor do primeiro grupo e mostra todos como etiquetas. Amigo sem grupo usa o post-it neutro.

## Consequências

- Service converte ritmo para dias apenas no cálculo
- Tela de edição preserva a unidade original ("1 mês", não "30 dias")
- Um amigo pode ter 0, 1 ou N grupos
- Cores limitadas garantem acessibilidade AA
- Ordenação alfabética de grupos é determinística
