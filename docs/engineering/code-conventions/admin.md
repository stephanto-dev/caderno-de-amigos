# Django Admin

O admin é a ferramenta do time interno para configurar e investigar o sistema. Antes de criar ou mexer numa tela, confira onde ela deve ficar e quais peças compartilhadas já existem.

## Onde fica o admin de um model

- O admin fica no app dono do model.
- Um inline exibido na tela de outro app também fica no app dono do model, e a tela que o usa importa de lá.
- Apps de borda (os que orquestram vários domínios) importam dos admins dos apps de domínio, nunca o contrário. Quando essa direção impede seguir a regra, o inline fica junto da única tela que o usa, e a exceção é listada aqui.

## A pasta `admin/`

Todo app com admin usa a pasta `admin/`, como faz com `models/`. Não existe `admin.py`, nem para um app com uma tela só.

```
apps/billing/admin/
  __init__.py      # importa todos os módulos e reexporta com __all__
  invoice.py       # InvoiceAdmin
  payment.py       # PaymentAdmin
  filters.py
  forms.py
  inlines.py
```

- **Um arquivo por tela registrada**, com o nome do model em `snake_case`. O arquivo da tela tem só o admin dela.
- **O resto vai sempre para o arquivo do seu tipo**, mesmo quando só uma tela usa:

| Arquivo | O que guarda |
| --- | --- |
| `inlines.py` | Inlines, inclusive os exibidos na tela de outro app. |
| `forms.py` | Forms. |
| `formsets.py` | Formsets dos inlines. |
| `mixins.py` | Mixins usados pelas telas ou pelos inlines do app. |
| `filters.py` | Filtros da lista. |
| `resources.py` | Resources e widgets do import-export. |
| `base.py` | Classes de admin herdadas por várias telas, sem registro próprio. |
| `fieldsets.py` | Fieldsets usados por mais de um arquivo. |

- Constantes, protocolos e funções privadas ficam no arquivo de quem os usa.
- O `__init__.py` importa cada módulo com import relativo e reexporta os nomes em `__all__`.
- ⚠️ Um módulo que o `__init__.py` não importa **não registra a tela**. O admin some sem dar erro. Vale ter um teste que falha nesse caso e quando um app volta a ter `admin.py`.

## Registro

Registre sempre com `@admin.register(Model)`, junto da classe. Nada de `admin.site.register` no fim do arquivo. A exceção é desregistrar o admin de uma biblioteca para trocar por outro.

## Peças compartilhadas

Ficam em `src/<projeto>/admin/`. O projeto segue OOP, então são mixins, não funções soltas. O conjunto inicial que vale ter:

| Peça | Para quê |
| --- | --- |
| `ReadOnlyAdminMixin` | Tela que só mostra registros: não adiciona, não edita, não apaga. |
| `ReadOnlyInlineMixin` | Inline que só lista, sem linhas vazias para preencher. |
| `HiddenFromSidebarMixin` | Tela fora da barra lateral, aberta a partir de outra tela. |
| `AdminDisplayMixin` | JSON formatado, texto truncado, link externo. |

Antes de escrever um `has_*_permission` que devolve `False`, um JSON formatado ou um "mostrar os primeiros N caracteres", use a peça que já existe.

```python
@admin.register(AuditEvent)
class AuditEventAdmin(ReadOnlyAdminMixin, admin.ModelAdmin):
    ...
```

- Campo que aponta para um model com muitas linhas usa autocomplete (`autocomplete_fields`), não select comum.

## Textos e idioma

- O admin aparece em português para o time; a API continua em inglês.
- Todo texto que o time vê é em português: `verbose_name`, `help_text`, rótulos, títulos de blocos, descrições de ações e mensagens.
- Código, logs e docstrings continuam em inglês.

## Ações


## Testes

- Teste a tela pelo que ela mostra ou faz: abra a página com o client do Django, ou chame o método público do admin. Não teste o mixin isolado.
- Ao mover ou dividir um admin, compare a lista de telas registradas antes e depois:

```bash
uv run python src/manage.py shell -c "from django.contrib import admin; print(sorted((m._meta.label, type(a).__name__) for m, a in admin.site._registry.items()))"
```
