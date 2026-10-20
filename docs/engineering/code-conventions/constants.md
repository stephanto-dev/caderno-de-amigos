# Constantes

Constantes dão nome a valores que representam uma regra, um contrato externo ou uma configuração fixa. Elas não devem esconder uma decisão que deveria estar em um serviço ou em um modelo.

## Padrão

- Use `UPPER_SNAKE_CASE`.
- Use tipos explícitos quando isso melhorar a leitura, como `MESSAGE_LIMIT: int = 200`.
- Use uma constante privada, com prefixo `_`, quando ela só fizer parte da implementação daquele módulo.
- Use uma constante de classe quando o valor pertence ao comportamento daquela classe, como `InvoiceService.PAYMENT_GRACE_PERIOD_DAYS`. Em serviços, esse é o lugar padrão.
- Use uma constante de módulo quando vários objetos do módulo compartilham o valor, como `SYNC_LOCK_TIMEOUT`.
- Configurações operacionais e segredos ficam em settings ou variáveis de ambiente. Não transforme segredo em constante no código.
- Rotas, endpoints e URLs usados num único lugar ficam dentro do método. Não promova esses valores para constantes globais ou de classe sem reutilização real.

## Estruturas constantes

- Use `frozenset` para conjuntos que não devem mudar, como tipos elegíveis ou origens permitidas.
- Use `tuple` para sequências fixas.
- Use `dict` somente quando a tabela não precisar ser alterada. Se a tabela representar um conjunto finito de estados do domínio, prefira um `Enum`.
- Use `Enum`, `StrEnum` ou `TextChoices` para valores persistidos ou estados com significado de negócio. Não espalhe strings literais como `"OPEN"`, `"CLOSED"` e `"PAID"`.

## Evite magic numbers e strings

Antes:

```python
Friend.objects.create(name=name, contact_frequency_days=30)
```

Depois:

```python
DEFAULT_CONTACT_FREQUENCY_DAYS = 30

Friend.objects.create(name=name, contact_frequency_days=DEFAULT_CONTACT_FREQUENCY_DAYS)
```

O nome precisa explicar a função do valor. Não crie uma constante para um literal usado uma única vez e que já seja autoexplicativo.
