# API HTTP (Django REST Framework)

A API do projeto é feita com **Django REST Framework** (DRF). Erros saem padronizados pelo `drf-standardized-errors`.

## Configuração

```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "EXCEPTION_HANDLER": "drf_standardized_errors.handler.exception_handler",
}

# A API navegável só existe localmente
if settings.ENVIRONMENT in (Environment.STAGING, Environment.PRODUCTION):
    REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = ["rest_framework.renderers.JSONRenderer"]
else:
    REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ]

DRF_STANDARDIZED_ERRORS = {"ENABLE_IN_DEBUG_FOR_UNHANDLED_EXCEPTIONS": True}
```

- A autenticação padrão é **SessionAuthentication**, porque a SPA Vue é servida na mesma origem que a API Django (WhiteNoise). O cookie de sessão funciona sem configuração CORS, e o Django já protege contra CSRF. Veja [`docs/ADRs/2026-10-20-autenticacao-por-sessao.md`](../../ADRs/2026-10-20-autenticacao-por-sessao.md) para o contexto completo.
- O padrão é exigir autenticação. Um endpoint aberto (`AllowAny`) declara isso explicitamente.
- Limite de requisições por tipo de usuário fica em `DEFAULT_THROTTLE_RATES` e numa classe de throttle do app.
- Login e cadastro usam `AccountIPRateThrottle`, com contadores separados por endpoint e IP, inclusive depois de autenticar ou criar uma conta. Os demais endpoints de dados continuam usando `ScopedRateThrottle` por usuário.
- `NUM_PROXIES` vem de `DJANGO_TRUSTED_PROXY_COUNT` (inteiro não negativo, default `0`). O default ignora `X-Forwarded-For`; confiar nesse header exige conferir a cadeia de proxies e impedir acesso público direto ao backend. Veja as limitações operacionais no [README](../../../README.md#limites-de-requisições).

## Views

- Use as **views genéricas** do DRF: `APIView`, `GenericAPIView`, `CreateAPIView`, `ListAPIView`. Não usamos `ViewSet` nem `Router`; cada endpoint tem a sua view e a sua linha no `urls.py`.
- As views ficam em `views/` do app dono do endpoint, e os serializers em `serializers/`.
- **A view é fina**: autentica, valida a entrada com o serializer e chama o ponto de entrada de um serviço. Regra de negócio não fica na view ([Serviços](services.md)).
- Erro sai como exceção do DRF (`ValidationError`, `NotFound`, `PermissionDenied`), não como um `Response` montado na mão. Assim o `drf-standardized-errors` devolve todos no mesmo formato.
- Autenticação, permissão, throttle e o escopo que vários endpoints compartilham (ex.: "só os registros do usuário logado") ficam numa view base do app (`BaseAPIView`), herdada pelas outras.
- Ids que identificam o pedido (usuário, amigo) entram no contexto do log logo no começo da view, para todo log daquele request carregá-los.

```python
class RecordContactView(BaseAPIView):
    """Record a contact for an owned friend."""

    def post(self, request: Request, friend_id: int) -> Response:
        serializer = ContactWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        recorded_contact = ContactsService(self.get_owner()).record_contact(
            friend_id=friend_id,
            kind=cast(str, serializer.validated_data["kind"]),
            note=cast(str, serializer.validated_data.get("note", "")),
        )
        return Response(
            {
                **BoardFriendSerializer(recorded_contact.board_friend).data,
                "contact_id": str(recorded_contact.contact.id),
                "contact": ContactReadSerializer(recorded_contact.contact).data,
            },
            status=status.HTTP_201_CREATED,
        )
```

**URLs (app-level):**

```python
# apps/friends/urls.py
urlpatterns = [
    path("", FriendsListView.as_view(), name="list_friends"),
    path("<int:friend_id>/", FriendDetailView.as_view(), name="get_friend"),
    path("<int:friend_id>/contacts/", RecordContactView.as_view(), name="record_contact"),
    path("<int:friend_id>/contacts/<int:contact_id>/", UndoContactView.as_view(), name="undo_contact"),
]
```

## Serializers

- Entrada que não é um model inteiro usa `serializers.Serializer` com os campos declarados. `ModelSerializer` só quando a entrada ou a saída é de fato o model.
- Campo com valores fixos usa `ChoiceField` com o `TextChoices` do model ou do domínio, nunca strings soltas.
- Validação de formato fica no serializer (`validate_<campo>`, `validate`). Regra de negócio fica no serviço.
- Um campo opcional vindo de sistema externo que não pode derrubar a integração quando vem malformado (e-mail, telefone) usa um campo próprio que normaliza o valor, em vez de deixar o DRF responder 400.

## URLs

- Caminhos em kebab-case com barra no fim: `friends/<int:friend_id>/contacts/`.
- Todo `path()` tem `name` em `snake_case`.
- Cada app tem o seu `urls.py`, incluído no `urls.py` do projeto com um prefixo.

## Testes

- Teste o endpoint pelo `APIClient` do DRF: monte o request, chame a URL pelo `reverse(name)` e verifique o status e o corpo.
- Testes de API usam o cliente de teste com banco real, sem mock do serviço. Assim verificam juntos o contrato HTTP, o escopo dos dados e as consultas feitas pelo ORM.
