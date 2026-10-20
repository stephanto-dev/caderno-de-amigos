# Coluna do Quadro calculada no backend, último contato derivado

Responsável: Vinicius
Data: 2026-10-20
Status: Aceito

## Contexto

O Quadro mostra amigos em 4 colunas conforme o tempo desde o último contato: "Falei agora", "Faz um tempinho", "Essa semana", "Em dia". Cada amigo tem um ritmo de contato desejado.

## Decisão

A coluna de cada amigo **não é guardada no banco**. Um service Django (`QuadroService`) calcula a coluna na leitura e a API devolve o campo pronto (`coluna: "essa_semana"`). O Vue apenas desenha.

O model `Amigo` **não tem campo `ultimo_contato`**. A data vem do `Contato` mais recente com:

```python
annotate(ultimo=Max("contatos__data"))
```

Índice em `(amigo, data)` na tabela `Contato` garante performance.

### Por que calcular em vez de guardar

- **Coluna guardada fica obsoleta** com a passagem do tempo, exigiria tarefa diária
- **`ultimo_contato` guardado** ficaria dessincrono ao apagar um contato (duas fontes de verdade)
- **Regra no service é testável** com pytest, incluindo o caso de ritmo ≤9 dias que pula direto de "Falei agora" para "Essa semana"
- **Sem duplicação**: se surgir outro cliente, usa o mesmo cálculo

### Alternativas descartadas

- Calcular no frontend: duplica a regra, dificulta testes
- Desnormalizar `ultimo_contato`: só se justificaria por desempenho (não é o caso no MVP)

## Consequências

- Service `QuadroService` concentra a lógica das colunas
- Testes cobrem todos os casos de ritmo, incluindo transição "Falei agora" → "Essa semana" para ritmos de até 9 dias
- Query única com `annotate` e `Max` evita N+1
- Sem jobs agendados no MVP
