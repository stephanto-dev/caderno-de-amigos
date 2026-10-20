# Caderno de amigos

CRM pessoal para lembrar de falar com os amigos. Projeto de estudo de Django.

## Desenvolvimento

Copie `.env.example` para `.env` antes de iniciar. Esse arquivo contém apenas
valores de desenvolvimento e não entra no Git. O backend também aceita
`.env.local` para sobrescrever valores só na máquina local.

Com Docker disponível, `docker compose up --build` sobe o PostgreSQL e o Django em
`http://localhost:8000`. Para desenvolver a interface, rode `npm ci` e `npm run dev`
em `frontend/`; o Vite abre em `http://localhost:5173` e repassa `/api` ao Django.

O backend usa Python 3.11+ e `uv`. Em `backend/`, rode `uv sync` para instalar as
dependências, `uv run pytest src` para os testes e `uv run python src/manage.py check`
para verificar a configuração. O teste do backend requer o PostgreSQL do Compose.

Em produção, configure `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `POSTGRES_DB`,
`POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_HOST`. A imagem Docker serve o
frontend compilado junto com o Django; o PostgreSQL continua separado.

## Documentação

- [Arquitetura do sistema](docs/arquitetura.md)
- [ADRs (Architecture Decision Records)](docs/ADL.md)
- [Guias de engenharia](docs/engineering/README.md)
