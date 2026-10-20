# Estrutura do projeto

O projeto é um **monolito Django** dividido em apps, cada app dono de um domínio. A API HTTP usa **Django REST Framework** ([API HTTP](api.md)), sobre Postgres.

```
src/
  manage.py
  caderno/              # infraestrutura compartilhada, sem regra de negócio
    settings.py
    env_vars.py         # settings tipados com pydantic-settings
    logging/
    admin/              # mixins compartilhados do admin
    urls.py
  apps/
    conftest.py         # fixtures globais
    <dominio>/
      models/
      services/
      interfaces/       # classes base e contratos do domínio
      admin/
      views/
      serializers/
      tests/
        conftest.py
```

## Camadas

| Camada | Faz | Não faz |
| --- | --- | --- |
| `views/`, `serializers/` | Valida a entrada com DRF e chama um serviço ([API HTTP](api.md)). | Regra de negócio. |
| `services/` | Toda a regra de negócio ([Serviços](services.md)). | Falar HTTP direto com sistema externo. |
| `models/` | Schema, validação local (`clean()`). | Orquestrar outros models ou sistemas. |
| `admin/` | Telas do time interno ([Django Admin](../code-conventions/admin.md)). | Regra de negócio. |

## Fronteiras entre apps

- Um app de domínio não importa de outro app de domínio. Código usado por dois ou mais domínios vai para um serviço neutro (num app neutro ou em `src/caderno/`).
- Apps de borda, que orquestram vários domínios, podem importar dos apps de domínio. O contrário não.
- Infraestrutura (logging, settings) fica em `src/caderno/` e não conhece nenhum domínio.

## Settings

- Variáveis de ambiente são lidas por uma classe `BaseSettings` do pydantic-settings em `env_vars.py`, com tipos (`SecretStr`, `PostgresDsn`, `AnyHttpUrl`) e validadores.
- O ambiente é um `StrEnum` (`TEST`, `LOCAL`, `STAGING`, `PRODUCTION`).
- `.env` vem de `.env.example`; `.env.local` sobrescreve localmente (com `override=True`) e não vai para o git.
- Ao criar um worktree na mão, copie o `.env` e o `.env.local` da origem, sem exibir nem versionar os segredos.
