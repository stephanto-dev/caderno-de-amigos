# Tooling

| Ferramenta | Para quê |
| --- | --- |
| `uv` | Dependências e execução (`uv sync`, `uv run ...`). Versões fixadas no `pyproject.toml`. |
| `ruff` | Lint e formatação (`ruff check --fix`, `ruff format`). |
| `mypy` | Tipagem estrita. |
| `pre-commit` | Roda tudo antes do commit. |
| `pytest` | Testes ([Testes](code-conventions/testing.md)). |
| Docker Compose | Postgres local, compartilhado. |

## `pyproject.toml`

```toml
[dependency-groups]
dev = ["rich", "watchdog"]
typecheck = ["mypy[faster-cache]", "django-types", "djangorestframework-types"]
lint = ["ruff"]
tests = ["faker", "freezegun", "pytest", "pytest-django", "pytest-xdist", "pytest-cov"]

[tool.uv]
package = false
default-groups = ["dev", "lint", "typecheck", "tests"]

[tool.ruff]
target-version = "py311"

[tool.ruff.lint]
select = [
    "E",    # pycodestyle errors
    "W",    # pycodestyle warnings
    "F",    # pyflakes
    "I",    # isort
    "C",    # flake8-comprehensions
    "B",    # flake8-bugbear
    "Q",    # flake8-quotes
    "DJ",   # flake8-django
    "UP",   # pyupgrade
    "D",    # pydocstyle
    "T201", # no print statements
]
ignore = ["D100", "D104", "D401", "E501", "C901", "D1", "D203", "D213"]

[tool.ruff.lint.per-file-ignores]
"__init__.py" = ["F401"]

[tool.mypy]
explicit_package_bases = true
packages = "src"
namespace_packages = true
mypy_path = ["src"]
ignore_missing_imports = true
exclude = ["manage.py", "/migrations/*"]
plugins = ["pydantic.mypy"]
enable_error_code = ["possibly-undefined"]
disallow_untyped_defs = true
disallow_incomplete_defs = true
no_implicit_optional = true
check_untyped_defs = true
warn_return_any = true
show_error_codes = true

[tool.pytest.ini_options]
DJANGO_SETTINGS_MODULE = "caderno.settings"
python_files = ["test_*.py"]

[tool.coverage.run]
omit = ["*/migrations/*", "*/tests/*", "*/__init__.py", "src/manage.py"]
```

## `.pre-commit-config.yaml`

```yaml
repos:
  - repo: local
    hooks:
      - id: mypy
        name: mypy
        entry: uv run --no-sync
        language: system
        pass_filenames: false
        types: [python]
        args: [mypy, --config-file, pyproject.toml, "src"]
      - id: django-check-untracked-migrations
        name: django-check-untracked-migrations
        entry: uv run --no-sync
        language: system
        pass_filenames: false
        types: [python]
        args: [python, src/manage.py, makemigrations, --check]
      - id: ruff
        name: ruff
        entry: uv run --no-sync
        language: system
        pass_filenames: false
        types: [python]
        args: [ruff, check, "src", --fix]
      - id: ruff-format
        name: ruff-format
        entry: uv run --no-sync
        language: system
        pass_filenames: false
        types: [python]
        args: [ruff, format, "src"]
```

## CI

O CI repete o pre-commit (lint, tipagem, migrations) e roda `uv run pytest src`. PR só vai para review com tudo verde.
