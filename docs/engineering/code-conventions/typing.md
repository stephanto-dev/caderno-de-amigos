# Tipagem

O código de produção é tipado de ponta a ponta. A configuração do mypy ([Tooling](../tooling.md)) exige definições tipadas, verifica corpos não tipados e rejeita retorno implícito de `Any`.

## Regras

- Tipe todos os argumentos e o retorno de funções, métodos, tasks e callbacks. Use `-> None` quando não houver retorno.
- Use a sintaxe moderna do Python 3.11+: `list[str]`, `dict[str, object]` e `str | None`. Nada de `List`, `Dict`, `Optional` ou `Union`.
- Seja o mais específico possível. Prefira `list[str]` a `list` e `dict[str, object]` a `dict`.
- Um helper privado que recebe uma variável já tipada pelo método que o chama usa o mesmo tipo, nunca `Any`.
- Evite `Any`. Use `TypedDict` ou um `BaseModel` para dicionários estruturados que cruzam uma fronteira interna.
- Use `Enum` ou `Literal` para conjuntos finitos de valores.
- Use `cast` apenas quando uma garantia foi estabelecida por runtime ou pela API. `cast` não valida dados.
- Não use `# type: ignore`. Corrija o tipo, refine a API ou encapsule a incompatibilidade em um ponto pequeno e documentado. Nos testes é tolerado, com um comentário justificando.

## Serialização e grupos de valores

- Prefira modelos pydantic `BaseModel` a dataclasses.
- A exceção são as respostas de APIs externas: dentro do client, elas são `TypedDict` em `types.py`.
- Valores que andam juntos viram uma classe com campos nomeados, nunca uma tupla posicional.

## Retornos

O tipo de retorno reflete o comportamento real:

- use `Model | None` quando a ausência for esperada;
- não alargue o retorno sem necessidade. Se uma função sempre retorna `list[int]`, não tipe como `list[int] | None`.

## Django e fronteiras externas

- Carregue as relações usadas pelo caso de uso com `select_related` e `prefetch_related`.
- Não espalhe o `Any` de `response.json()` pelos serviços. O client devolve a resposta tipada e o serviço opera com objetos do domínio ou tipos internos.
- Relações reversas ganham type hint explícito no model, como `invoices: Manager["Invoice"]` ([Models Django](django-models.md)).
