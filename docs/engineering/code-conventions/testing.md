# Testes

Focamos em testes unitários da lógica de negócio principal. Testes de models usam o Postgres do projeto para verificar constraints, relações e migrations. Não mantemos suíte automatizada que dependa de APIs externas reais; esses testes o desenvolvedor faz manualmente. Crie só testes úteis: cada teste protege um comportamento que alguém poderia quebrar.

## Ferramentas e organização

- `pytest` com `pytest-django`. `faker` e `freezegun` quando precisar.
- Arquivos `test_*.py`, sempre em `src/apps/<app>/tests/`. Teste não fica junto do código-fonte.
- Fixtures do app em `src/apps/<app>/tests/conftest.py`; fixtures globais em `src/apps/conftest.py`.

## Execução

- Ao iterar, rode só o app: `uv run pytest src/apps/<app>/tests -x -q`. A suíte inteira (`-n auto -x -q`) só quando estiver pronto para publicar.
- Mudança só de documentação não precisa rodar o banco. Valide os links e a consistência.

## Estilo

- **Agrupe os casos de um mesmo assunto numa classe `Test*`**, com cada comportamento num método `test_*`. A classe é só um agrupador: sem estado compartilhado entre métodos e sem `setUp`; os dados vêm de fixtures.
- `@pytest.mark.django_db` em todo teste que acessa o banco (na classe ou no método).
- Nome do método: `test_<o_que>_<condição>_<comportamento_esperado>`.
- Separe as etapas com os comentários `# Arrange`, `# Act` e `# Assert`.
- Imports sempre no topo do arquivo. Nada de `import` dentro de método, helper ou corpo de classe de teste.
- Um caso por método. `pytest.mark.parametrize` serve para variações de entrada da mesma regra, mas o resultado esperado **não** entra como parâmetro: escreva o valor esperado em cada teste. A exceção é teste de parser, em que entrada → saída é o próprio contrato.

```python
@pytest.mark.django_db
class TestRecordContact:
    def test_record_contact_when_friend_has_no_prior_contact_sets_last_contact_at(
        self, create_friend: Callable[..., Friend]
    ) -> None:
        # Arrange
        friend = create_friend()
        owner = friend.owner

        # Act
        recorded_contact = ContactsService(owner).record_contact(
            friend_id=friend.id,
            kind=Contact.Kind.MESSAGE,
            note="",
        )

        # Assert
        assert recorded_contact.board_friend.last_contact is not None
        assert recorded_contact.contact_id > 0
```

## O que testar

- Sempre pelo contrato público do serviço ou do client. Não chame helper privado direto nem substitua o helper para esconder a regra que está sendo testada: um teste assim passa na suíte sem simular o comportamento completo.
- Verifique resultados observáveis: o retorno, a mudança de estado e as chamadas relevantes a dependências. Não afirme a sequência de detalhes internos que não fazem parte do contrato.
- Não exagere em asserts. Afirme só o necessário para validar a lógica central.
- Cubra a regra principal, a ausência esperada e as falhas que mudam a decisão. Em reprocessamentos, cubra duplicação e resultados parciais.

## Mocks e fixtures

- Toda API externa é simulada. No teste de serviço, substitua o client inteiro. No teste de client, simule o transporte HTTP com `httpx.MockTransport` e verifique payload, resposta e erro pela interface pública.
- Use fixtures, `monkeypatch` e `patch` para deixar os testes simples.
- O `@patch` aponta para o módulo onde o nome é **usado**, não onde é definido.
- Factory fixtures retornam uma função que cria o objeto, nunca a instância pronta:

```python
@pytest.fixture
def create_friend() -> Callable[..., Friend]:
    def _create_friend(**overrides: object) -> Friend:
        return Friend.objects.create(**{"name": "Ana", **overrides})

    return _create_friend
```

- Dado de teste fica nos testes e nas fixtures, nunca em código de produção.
