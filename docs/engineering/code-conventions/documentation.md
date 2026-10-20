# Documentação e comentários

Esta é a regra geral para docstrings, comentários e documentos de serviço. Os outros documentos não precisam repeti-la.

## Docstrings

- Use docstrings no estilo Google.
- A docstring é proporcional à função. Um helper pequeno e objetivo não precisa de `Args`, `Returns` e exemplos. Um método grande, difícil de ler ou contra-intuitivo pode usar exemplos para facilitar a leitura.
- Documente classes e funções públicas quando o contrato não for óbvio.
- Documente métodos complexos com os dados relevantes de entrada, retorno, exceções e efeitos colaterais.
- Um conceito de um sistema externo (um status de um ERP, um campo de uma API) ganha uma docstring explicando o que ele é.

## Comentários

Comente o motivo de uma decisão quando o código não puder expressá-lo sozinho. Se uma regra exigir muitos comentários para ser entendida, extraia um método ou dê um nome melhor ao valor.

Uma descoberta sobre uma API externa (limite, regra, bug, resposta estranha) vira comentário ao lado do código que depende dela. É o único lugar onde quem mexer ali vai ler.

### Evite estes tipos de comentário

**Óbvios**

```python
counter = 0  # Initialize counter to zero
```

**Redundantes**

```python
def get_user_name(user: User) -> str:
    return user.name  # Return the user's name
```

**Desatualizados**

```python
# Calculate tax at 5% rate
tax = price * 0.08
```

### Escreva estes tipos de comentário

**Lógica de negócio complexa**

```python
# Progressive brackets: 10% up to 10k, 20% above
def calculate_tax(income: Decimal) -> Decimal:
    return calculate_progressive_tax(income, [0.10, 0.20], [10_000])
```

**Algoritmos não óbvios**

```python
# dict.fromkeys removes duplicates while preserving order
unique_items = list(dict.fromkeys(items))
```

**Comportamentos contra-intuitivos**

```python
def get_filters(filters_str: str) -> str:
    # The provider sometimes sends an extra `}` at the end
    return filters_str.split("}")[0]
```

## Documento de serviço

Um serviço com fluxo longo, vários estados ou várias integrações ganha um Markdown ao lado dele, em `services/`, com o nome do serviço em `UPPER_SNAKE_CASE` (ex.: `services/INVOICE_FINALIZER.md`). Ele explica o fluxo para quem nunca leu o código:

```markdown
# INVOICE_FINALIZER

## Objetivo de negócio
O que o serviço garante, em resultados de negócio.

## Quando é acionado
Os gatilhos, com exemplos.

## Entidades e atores envolvidos
Models e sistemas externos, uma linha cada.

## Fluxo
Os passos em ordem, com os ramos e o que acontece em cada um.

## Casos de borda
O que acontece quando algo falha ou chega fora de ordem.
```

Atualize o documento no mesmo PR que muda o fluxo.

## ADRs

Uma decisão de arquitetura grande vira um ADR em `docs/ADRs/`, a partir do [modelo](../../ADRs/TEMPLATE.md), e ganha uma linha em `docs/ADL.md`.
