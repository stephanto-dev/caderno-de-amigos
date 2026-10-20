# Datas em UTC com TIME_ZONE de São Paulo

Responsável: Vinicius
Data: 2026-10-20
Status: Aceito

## Contexto

Contatos registram o momento da interação. Precisamos decidir como armazenar e interpretar datas considerando fuso horário, horário de verão e a regra de "dias locais" para o Quadro.

## Decisão

`Contato` usa **`DateTimeField`** (vira `timestamptz` no Postgres) com:
- `USE_TZ = True`
- `TIME_ZONE = "America/Sao_Paulo"`

O service converte o instante do contato para data local (`timezone.localdate`) e compara com o "hoje" de São Paulo para calcular a coluna. O frontend só formata para exibir.

### Por que UTC + TIME_ZONE

- **UTC é absoluto**: sem ambiguidade, não quebra com horário de verão ou mudança de servidor
- **Regra conta em dias locais**: contato às 23h30 de terça em São Paulo conta como terça, não quarta
- **`DateTimeField` preserva ordem**: dois contatos no mesmo dia mantêm ordem cronológica

### Alternativas descartadas

- Guardar em horário local: ambíguo em horário de verão
- `DateField` apenas: perde ordem de contatos no mesmo dia

## Consequências

- Banco armazena timestamps UTC
- Service usa `timezone.localdate()` para converter para dia de São Paulo
- Teste obrigatório: contato às 23h30 BRT (02h30 UTC do dia seguinte) cai no dia local correto
- Frontend recebe ISO 8601 e formata com biblioteca de data local
