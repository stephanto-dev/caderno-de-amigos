# Tooling

As dependências e configurações Python ficam em
[`backend/pyproject.toml`](../../backend/pyproject.toml), com versões travadas em
`backend/uv.lock`. O frontend usa
[`frontend/package.json`](../../frontend/package.json) e `frontend/package-lock.json`.

| Ferramenta | Para quê |
| --- | --- |
| `uv` | Instala e executa o backend e suas ferramentas (`uv sync --frozen`, `uv run ...`). |
| Ruff | Lint e formatação Python. |
| mypy | Verifica tipagem Python com o plugin do Django. |
| pytest + pytest-django | Testa o backend com PostgreSQL. |
| vue-tsc | Verifica os tipos do frontend Vue e TypeScript. |
| Vitest | Testa o frontend. |
| Vite | Serve o frontend em desenvolvimento e gera o build de produção. |
| Docker Compose | Inicia PostgreSQL, Django e Vite no ambiente local. |

## Desenvolvimento local

Siga os comandos e pré-requisitos do [README](../../README.md#desenvolvimento).
Comandos Python rodam em `backend/`; comandos npm rodam em `frontend/`.
O banco do Compose usa a porta `5433` na máquina e `5432` entre containers.

O grupo `dev` do backend reúne as ferramentas de lint, tipagem e testes.
Não há configuração de pre-commit ou pytest-xdist no repositório; execute as
verificações do README antes de enviar um PR.

## CI

O workflow [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) roda em
pull requests e em pushes para `main`, com três jobs:

- Backend: dependências travadas, Ruff, mypy, verificação de migrations e pytest
  com PostgreSQL 16.
- Frontend: `npm ci`, `npm run typecheck` e `npm test`, com Node.js 22.
- Docker: construção da imagem, que também compila o frontend com Vite.

As verificações precisam passar antes de solicitar revisão.
