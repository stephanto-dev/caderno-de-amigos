# Repository Guidelines

## Project Overview

**Caderno de amigos** is a personal CRM for remembering to stay in touch with friends. It's a learning project — the owner's first Django project. The user registers friends, sets how often they want to talk to each one, logs contacts, and sees a board ('Quadro') with 4 computed columns: 'Falei agora', 'Faz um tempinho', 'Essa semana', 'Em dia'. Single user, no external APIs.

Stack: Python 3.11+, Django 5, Django REST Framework, Postgres (docker compose), `uv`, `ruff`, `mypy`, `pytest-django`. Frontend: Vue 3 + Vite + TypeScript + Tailwind, built and served by Django itself (WhiteNoise) on the same origin, routes `/api` and `/admin`.

## Glossary

We need to be on the same page with terminology. When communicating, use this language:

- **"Friend"** (Amigo): A person the user wants to stay in touch with. Stored in the `Amigo` model.
- **"Contact"** (Contato): A log entry recording that the user spoke with a friend. Stored in the `Contato` model.
- **"Contact rhythm"** (Ritmo): The desired contact interval for a friend, stored as a positive quantity and a unit (day, week, month, or year) on `Amigo`.
- **"Group"** (Grupo): An optional way to organize friends (e.g., "college friends", "family"). Stored in the `Grupo` model; an `Amigo` can belong to multiple groups.
- **"Board"** (Quadro): The main dashboard showing friends grouped by contact recency: 'Falei agora', 'Faz um tempinho', 'Essa semana', 'Em dia'.

Although the code is written in English, the user is Brazilian, so we use Portuguese when communicating with them.

## Learning workflow

This is the owner's first Django project. Treat every implementation task as a chance to teach, not just deliver code.

- Work in small, verifiable stages. Before changing code, show the existing pattern you found, explain the next stage in plain Portuguese, and introduce the Django concept involved.
- After each meaningful stage, show what changed and how you checked it. Explain why it works, then ask one focused question that helps the owner reason about the code or decide a real tradeoff. Wait for their answer before starting the next meaningful stage.
- Question assumptions in the request when they conflict with the code or Django's behavior. Explain the conflict and ask the owner to choose before implementing that part.
- Let the owner try a step when they want to. If they prefer you to write it, continue and explain the result; do not turn the task into mandatory homework.
- Keep small edits to one stage when splitting them further would add no learning value. Do not ask for approval on routine details already settled by the repository conventions.

## Code Style and Team Conventions

The code you generate needs to be compatible with the team's conventions, otherwise it will only slow us down and make it harder to maintain. We like ambitious ideas, simple systems, and software that feels obvious. Do not preserve complexity just because it already exists. Do not introduce machinery because it looks architecturally impressive. Understand the real constraint, then fight for the smallest model that makes the correct behavior unsurprising.

Channel both "measure twice, cut once" and "yagni". Fight scope creep. Try to honor the dev's intent in both a minimal and realistic fashion.

Follow clean code principles. **Write code that speaks for itself. Comment only when necessary to explain WHY, not WHAT.**

The complete style guide lives in [`docs/engineering`](docs/engineering/README.md). Read the relevant pages before big changes. Legacy code is context, not approval of a pattern: apply the rules to new or changed code, without refactoring outside the scope. The rules below are the ones most often broken:

- **Look before you write.** Before creating a class, enum, constant, helper or file, find where the repo already keeps things of the same kind and follow the majority. Reuse what exists instead of writing a parallel version.
- **Services hold the business logic.** Every service is a class. Views, serializers and admin only instantiate services and delegate ([Serviços](docs/engineering/architecture/services.md)).
- **Typed end to end.** No `Any` leaking from external APIs, no `# type: ignore` ([Tipagem](docs/engineering/code-conventions/typing.md)).
- **Names say what they return.** Functions start with a verb; booleans start with `is_`/`has_`/`can_`/`should_`/`needs_` ([Nomenclatura](docs/engineering/code-conventions/naming.md)).
- **No magic values.** Named constants or enums ([Constantes](docs/engineering/code-conventions/constants.md)).
- **No YAGNI abstractions.** No interface with a single implementation, no factory for one product, no flag that only ever takes one value. Dead code leaves in the same PR.
- **Shared code is neutral.** Code used by two or more domain apps lives in a neutral app or in the project package, never imported from one domain app into another ([Estrutura do projeto](docs/engineering/architecture/project-structure.md)).
- **External discoveries become comments.** A limit, quirk or bug found in an external API is documented next to the code that depends on it.

## Working on the codebase

Postgres runs in a container via `docker-compose.yml`. Single developer, so one shared database.

`uv run` runs in the project's Python environment, not inside a container. Versions and checks live in `pyproject.toml` and `.github/workflows/`.

```sh
uv sync
uv run ruff check src
uv run ruff format src --check
uv run mypy --config-file pyproject.toml src
```

## Documentation Guidelines

Always keep the code documentation up to date, but don't be bothersome. Update docstrings when behavior changes. Complex services get a Markdown doc next to them ([Documentação e comentários](docs/engineering/code-conventions/documentation.md)).

If you want to create an ADR to document a big change, ask the user before writing it. ADRs live in `docs/ADRs/` and are indexed in `docs/ADL.md`.

## Testing Guidelines

- Run all tests with `uv run pytest src`. Add `-n auto -x -q` for faster feedback (`pytest-xdist` parallelizes; `-x` stops at the first failure).
- While iterating, run tests scoped to the app you touched. Only run the entire suite when you're ready to publish.
- Group related cases in `Test*` classes, one behavior per `test_*` method. Test through public methods only. Mock every external API ([Testes](docs/engineering/code-conventions/testing.md)).

## Commit & Pull Request Guidelines

Follow Conventional Commits (`feat`, `fix`, `refactor`, `docs`, `test`, `chore`) with optional scopes restricted to existing app names. Branches follow `feat/<slug>`, `fix/<slug>`, `docs/<slug>` or `refactor/<slug>`.

Each PR should link the relevant task or issue, describe behavior changes, call out schema migrations, and include screenshots for admin-visible updates. If the PR deviates from the issue, explain it in a "Desvios da issue" section. Ensure CI prerequisites pass (lint, typecheck, migrations check, pytest) before requesting review.

## Branch Strategy

- All feature branches are based on `main` and PRs target `main`.
