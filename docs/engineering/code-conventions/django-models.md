# Models Django

## Onde ficam

- Na pasta `models/` do app dono do domínio, um arquivo por model com o nome em `snake_case`. O `__init__.py` reexporta os models.

## Ordem dos campos

1. `id = models.AutoField(primary_key=True)`, sempre primeiro.
2. ForeignKeys.
3. Campos de status e de escolha.
4. Campos de conteúdo.
5. `created_at` e `updated_at`, por último.

## Escolhas e textos

- Campo de escolha usa uma inner class `TextChoices` (ex.: `Status(models.TextChoices)`) com labels em português.
- Todo campo tem `verbose_name` e `help_text` em português.
- A inner class `Meta` tem `indexes`, `constraints`, `verbose_name` e `verbose_name_plural`, mesmo que as listas fiquem vazias.

## Tipagem

- Manager customizado herda de `models.Manager[T]` com `Generic[T]`.
- Relação reversa ganha type hint explícito: `invoices: Manager["Invoice"]`.

## Comportamento

- Validação de regra de negócio no nível do model fica em `clean()`.
- Override de `save()` que precisa do valor antigo busca com `type(self).objects.filter(pk=self.pk).first()`.
- Regra de negócio que envolve outros models ou sistemas externos fica no serviço, não no model ([Serviços](../architecture/services.md)).
- Se um model só pode ser persistido por um serviço (ex.: mensagens só pelo serviço de conversa), escreva isso na docstring do model e no review. Criar fora dele reprova o PR.

## Exemplo

```python
class Invoice(models.Model):
    class Status(models.TextChoices):
        OPEN = "OPEN", "Aberta"
        PAID = "PAID", "Paga"

    id = models.AutoField(primary_key=True)
    customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.CASCADE,
        related_name="invoices",
        verbose_name="Cliente",
        help_text="Cliente cobrado por esta fatura.",
    )
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.OPEN,
        verbose_name="Status",
        help_text="Situação atual do pagamento.",
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Valor",
        help_text="Valor total em reais.",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criada em", help_text="Data de criação.")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizada em", help_text="Data da última alteração.")

    class Meta:
        indexes = [models.Index(fields=["customer", "status"])]
        constraints: list[models.BaseConstraint] = []
        verbose_name = "Fatura"
        verbose_name_plural = "Faturas"
```
