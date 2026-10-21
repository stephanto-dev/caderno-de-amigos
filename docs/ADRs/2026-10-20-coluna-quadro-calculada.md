# Coluna do Quadro calculada no backend, último contato derivado

Responsável: Vinicius
Data: 2026-10-20
Status: Aceito

**Atualização 2026-10-21**: Traduzido para inglês (nomes de services, campos e valores enum).

## Contexto

O Quadro mostra amigos em 4 colunas conforme o tempo desde o último contato: "Falei agora", "Faz um tempinho", "Essa semana", "Em dia". Cada amigo tem um ritmo de contato desejado.

## Problema

Guardar a coluna no banco fica obsoleto com a passagem do tempo, exigindo tarefa diária para atualizar. Guardar `last_contact_at` cria duas fontes de verdade (ficaria dessincrono ao apagar um contato). Calcular no frontend duplica a regra e dificulta testes.

## Decisão

A coluna de cada amigo **não é guardada no banco**. Um service Django (`BoardService`) calcula a coluna na leitura e a API devolve o campo pronto (`column: "this_week"`). O Vue apenas desenha.

O model `Friend` **não tem campo stored `last_contact_at`**. A data vem do `Contact` mais recente com:

```python
annotate(last_contact=Max("contacts__date"))
```

Índice em `(friend, date)` na tabela `Contact` garante performance.

## Consequências

- Service `BoardService` concentra a lógica das colunas
- Testes cobrem todos os casos de ritmo, incluindo transição "Falei agora" → "Essa semana" para ritmos de até 9 dias
- Query única com `annotate` e `Max` evita N+1
- Sem jobs agendados no MVP
- Regra testável e reutilizável se surgir outro cliente
- Nenhuma tarefa de manutenção para manter dados sincronizados
