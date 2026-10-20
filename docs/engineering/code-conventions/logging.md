# Logging

Usamos `structlog`, nunca o `logging` da stdlib diretamente.

```python
import structlog

logger = structlog.stdlib.get_logger(__name__)
```

## Regras

- Um `logger` por módulo, no topo, com `__name__`.
- Toda mensagem de log é em inglês e começa com letra minúscula.
- A mensagem é uma string fixa que descreve o evento. **Nunca use f-string**: os valores vão como kwargs, com nomes de campo iguais aos do código (`customer_id`, `status_code`). Assim a mensagem fica estável e dá para filtrar no dashboard.

```python
# Ruim
logger.info(f"invoice {invoice.id} sent")

# Bom
logger.info("invoice sent", invoice_id=invoice.id)
```

- Nunca logue credenciais, tokens ou dados sensíveis.
- Não use `print()`.

## Níveis

| Nível | Quando |
| --- | --- |
| `logger.info` | Evento normal que ajuda a reconstruir o fluxo. |
| `logger.warning` | Estado inconsistente que o código já trata, mas que alguém deveria saber. |
| `logger.exception` | Qualquer exceção capturada. Inclui o traceback. |
| `logger.debug` | Detalhe útil só localmente. |

Não use `logger.error()` para exceções: ele não carrega o traceback e não aparece no rastreamento de erros. Use `logger.exception()` dentro do `except`.

## Contexto de request

O `request_id` entra no contexto do structlog (com `django-structlog`). Para mostrá-lo ao time, por exemplo numa mensagem do admin:

```python
logger_context = structlog.contextvars.get_merged_contextvars(logger)
request_id = logger_context.get("request_id", "—")
```

## Registro de execução para o suporte

Quando o time de suporte precisa entender o que aconteceu com uma automação sem abrir os logs da aplicação, o projeto pode ter um registro de execução no banco, visível no admin:

- `Execution`: uma tentativa de processamento, com `status` (`RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`), `started_at` e `ended_at`.
- `ExecutionLog`: uma etapa dessa execução, com `level` (`INFO`, `ERROR`) e `message`.
- `ExecutionContext`: o context manager que cria a `Execution` ao entrar e marca `COMPLETED` ao sair. Quando algo quebra, marca `FAILED`, registra o erro e relança a exceção.

```python
with ExecutionContext(source_event) as ctx:
    ctx.log("sync started")
    ...
    ctx.log("customer not found in provider", customer_id=customer_id)
```

- `ctx.log()` grava o `ExecutionLog` **e** emite o mesmo evento no structlog. Não duplique a mensagem no `logger`.
- Use `ctx.log()` para o que o suporte precisa ler: início da operação, decisão tomada, configuração ausente, resultado e motivo da falha.
- Use o `logger` para detalhes técnicos que não precisam ficar no histórico.
- `ERROR` só quando a falha afeta o resultado da automação.

Crie esse registro só quando houver um time que precise dele. Até lá, o `structlog` basta.
