# Nomenclatura

Escolha nomes que expressem o domínio e o efeito da operação. O nome deve permitir que alguém entenda a intenção sem abrir a implementação.

## Idioma do código

**Todo o código, banco de dados e API são escritos em inglês.** Nomes de apps, models, campos, métodos, variáveis, constantes, enums, valores armazenados no banco, URLs, rotas, campos JSON da API, docstrings, comentários e nomes de testes devem estar em inglês. Apenas texto visível ao usuário final (labels de UI e mensagens de erro) permanece em português.

Exemplos de código em inglês:
- Apps: `friends`, `accounts` (não `amigos`, `contas`)
- Models: `Friend`, `Contact`, `Group` (não `Amigo`, `Contato`, `Grupo`)
- Campos: `name`, `cadence_amount`, `cadence_unit` (não `nome`, `ritmo_quantidade`, `ritmo_unidade`)
- Valores de enum armazenados: `"day"`, `"week"`, `"month"` (não `"dia"`, `"semana"`, `"mes"`)
- Campos JSON: `{"name": "Ana", "cadence_amount": 2}` (não `{"nome": "Ana", "ritmo_quantidade": 2}`)

Texto que permanece em português:
- Labels de verbose_name e help_text nos models (mostrados no admin)
- Mensagens de erro retornadas ao usuário via API
- Labels de choice (display): `"day", "Dia"` — o valor armazenado é inglês, o label é português

## Arquivos e módulos

- Use `snake_case` em arquivos e pacotes.
- Mantenha os diretórios de camada no plural: `models/`, `services/`,`, `interfaces/`, `admin/` e `tests/`.
- Um arquivo por classe principal, com o nome dela em `snake_case`: `InvoiceService` fica em `services/invoice.py`.
- Nomeie tasks pelo efeito observável, como `send_invoice.py` e `sync_customers.py`.

## Classes

- Use `PascalCase`.
- Serviços terminam em `Service`: `InvoiceService`, `CustomerSyncService`.
- Clients de APIs externas terminam em `Client`: `ExampleClient`.
- Exceções terminam em `Exception` e herdam da exceção base do client ou do domínio: `StripeClientException` → `StripeCustomerNotFoundException`.

## Métodos e funções

- Comece com um verbo: `create_invoice_for_customer`, `send_reminder`, `transfer_ownership`.
- Use `is_`, `has_`, `can_`, `should_` e `needs_` para resultados booleanos.
- Use `get_` para buscar dados, `create_` para criar, `update_` para atualizar, `sync_` para sincronizar, `build_` para montar um objeto e `format_` para transformar em texto. Não use `fetch_`, `maybe_` e sinônimos.
- O nome diz o que retorna e para quem quando houver mais de um consumidor: `format_summary_for_customer`, `format_summary_for_team`.
- Use `_` no início para helpers privados. Um helper privado não é um contrato para outros módulos.
- Evite nomes genéricos como `do`, `handle`, `handle_data`, `process_data`, `run_logic`, `helper`, `util` e `manager`.
- `run` só é aceitável para o ponto de entrada de uma orquestração (a classe base de um processador ou de uma integração) e para um serviço de passo único, como um ETL.

## Variáveis e argumentos

### Entidades do domínio

Uma variável que guarda uma entidade do domínio tem o nome da entidade: `invoice`, `customer`, `order` (ou `_invoice` em helpers privados). Não use `obj`, `item`, `data`, `record` e outros nomes genéricos.

### Lógica de negócio densa

Em serviços com várias etapas, reprocessamento ou estado intermediário, nomeie pelo que o valor **representa no domínio**, não pelo passo do algoritmo, mesmo que isso deixe o nome mais longo. Quem lê a variável sem ver o corpo da função deve saber o que é aquele valor e em que contexto ele vale.

**Domínio antes de mecanismo.** Prefira vocabulário do negócio (`invoice`, `billing_window`, `search_filters`) em vez de jargão de implementação (`reconcile`, `target`, `process`).

**Contexto explícito.** Se o mesmo conceito aparece em contextos diferentes no mesmo fluxo, o nome deixa claro qual:

| Evitar | Preferir |
| --- | --- |
| `invoices` | `overdue_invoices_for_customer` |
| `previous` | `last_paid_invoice_datetime` |
| `filters` | `search_filters_after_relaxation` |

**Vocabulário consistente.** Variáveis que participam da mesma cadeia de cálculo compartilham termos e sufixos, o que deixa o fluxo legível de cima a baixo:

```python
search_filters                      # filtros originais
search_filters_after_relaxation     # depois de relaxar preço ou região
products_matching_category          # resultado da busca por categoria
products_still_within_budget        # depois de filtrar pelo preço máximo
```

**Nomeie pelo uso, não pela fórmula.** Se a variável existe para alimentar um `min()`, um `if` ou um loop, nomeie pelo papel na decisão:

```python
# Ruim: "previous" e "window_open" escondem o significado
previous = self._get_last_paid_invoice_datetime(customer)
window_open = now - previous >= self.BILLING_WINDOW

# Bom: escopo e papel na regra de negócio explícitos
last_paid_invoice_datetime = self._get_last_paid_invoice_datetime(customer)
is_outside_billing_window = (
    last_paid_invoice_datetime is None
    or now - last_paid_invoice_datetime >= self.BILLING_WINDOW
)
```

**Palavras a evitar como âncora de nome:** `target`, `previous`, `desired`, `new` e verbos de algoritmo (`reconcile`, `process`, `handle`). Costumam esconder o significado real. Verbos de algoritmo ficam nos métodos; em variáveis, use o conceito de domínio.

Se você precisa de um comentário para explicar o que a variável representa, o nome não está claro o suficiente. Renomeie.
