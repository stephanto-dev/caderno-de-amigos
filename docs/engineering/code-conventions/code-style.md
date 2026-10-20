# Estilo geral

## Idioma

- Todo o código é em inglês: nomes, docstrings e logs. A única exceção é uma API externa que exija outro idioma.
- Texto que o usuário ou o time interno lê fica em português: mensagens, `verbose_name`, `help_text`, textos do admin, prompts.

## Imports

- Imports absolutos: `from apps.friends.models import Friend`, nunca `from ..models import Friend`. A exceção é o `__init__.py` de um pacote que reexporta os próprios módulos.
- Imports no topo do arquivo, agrupados em stdlib, third-party e local, nessa ordem (o `ruff` com `I` ordena).
- Import dentro de função só para quebrar um import circular, com um comentário dizendo qual.

## Proibidos

- `print()`. Use o logger ([Logging](logging.md)). O `ruff` com `T201` bloqueia.
- `# type: ignore` ([Tipagem](typing.md)).
- Segredo no código. Segredos vêm de variáveis de ambiente, lidas pelo settings.
- Template Jinja sem `undefined=StrictUndefined`. Sem isso, uma variável faltando vira texto vazio em silêncio.

## Performance básica

- Nada de query dentro de loop. Busque tudo antes, com `select_related` e `prefetch_related`.
- Operações em massa usam `bulk_create` e `bulk_update`.
- Use `.only()`, `.values()` ou `.values_list()` quando não precisar do model inteiro.
- `@cached_property` para propriedade calculada cara e usada mais de uma vez.

## Processos com muitos registros

Serviço que percorre muitos registros trabalha em chunks, para limitar a memória:

- Busque só os IDs com `.values_list("id", flat=True)` e processe em lotes de tamanho fixo (constante de classe).
- **Não use `.iterator()`** do Django: ele mantém a conexão com o banco aberta durante todo o loop.
- Logue o progresso por lote.

## Cache

- A chave de cache inclui os IDs que a tornam única. Chaves globais ficam num `StrEnum` (ex.: `GlobalCacheKeys`) no pacote do projeto.
- Todo valor em cache tem expiração ou invalidação explícita.
