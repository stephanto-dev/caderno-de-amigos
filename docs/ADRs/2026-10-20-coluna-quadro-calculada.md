# Coluna do Quadro calculada no backend, último contato derivado

Responsável: Vinicius
Data: 2026-10-20
Status: Aceito

## Contexto

O Quadro mostra amigos em 4 colunas conforme o tempo desde o último contato: "Falei agora", "Faz um tempinho", "Essa semana", "Em dia". Cada amigo tem um ritmo de contato desejado.

## Problema

Guardar a coluna no banco fica obsoleto com a passagem do tempo, exigindo tarefa diária para atualizar. Guardar `ultimo_contato` cria duas fontes de verdade (ficaria dessincrono ao apagar um contato). Calcular no frontend duplica a regra e dificulta testes.

## Decisão

A coluna de cada amigo **não é guardada no banco**. Um service Django (`QuadroService`) calcula a coluna na leitura e a API devolve o campo pronto (`coluna: "essa_semana"`). O Vue apenas desenha.

O model `Amigo` **não tem campo `ultimo_contato`**. A data vem do `Contato` mais recente com:

```python
annotate(ultimo=Max("contatos__data"))
```

Índice em `(amigo, data)` na tabela `Contato` garante performance.

## Consequências

- Service `QuadroService` concentra a lógica das colunas
- Testes cobrem todos os casos de ritmo, incluindo transição "Falei agora" → "Essa semana" para ritmos de até 9 dias
- Query única com `annotate` e `Max` evita N+1
- Sem jobs agendados no MVP
- Regra testável e reutilizável se surgir outro cliente
- Nenhuma tarefa de manutenção para manter dados sincronizados
