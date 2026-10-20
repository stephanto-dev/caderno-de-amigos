# Datas em UTC com TIME_ZONE de São Paulo

Responsável: Vinicius
Data: 2026-10-20
Status: Aceito

## Contexto

Contatos registram o momento da interação. A regra de negócio conta dias locais (um contato às 23h30 de terça em São Paulo deve contar como terça, não quarta).

## Problema

Guardar no horário local de São Paulo é ambíguo em horário de verão. Usar apenas `DateField` perde a ordem de dois contatos no mesmo dia. Ignorar o fuso horário pode colocar um contato no dia errado se o servidor estiver em outro fuso.

## Decisão

`Contato` usa **`DateTimeField`** (vira `timestamptz` no Postgres) com:
- `USE_TZ = True`
- `TIME_ZONE = "America/Sao_Paulo"`

O service converte o instante do contato para data local (`timezone.localdate`) e compara com o "hoje" de São Paulo para calcular a coluna. O frontend só formata para exibir.

## Consequências

- Banco armazena timestamps UTC (instante absoluto, sem ambiguidade)
- Service usa `timezone.localdate()` para converter para dia de São Paulo
- **Teste obrigatório**: contato às 23h30 BRT (02h30 UTC do dia seguinte) cai no dia local correto
- Frontend recebe ISO 8601 e formata com biblioteca de data local
- Não quebra com horário de verão, servidor em outro fuso ou viagem
- Ordem de contatos no mesmo dia preservada
