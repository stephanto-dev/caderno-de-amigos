# Caderno de amigos

CRM pessoal para lembrar de falar com os amigos. Projeto de estudo de Django.

## Desenvolvimento

Copie `.env.example` para `.env` antes de iniciar. Esse arquivo contém apenas
valores de desenvolvimento e não entra no Git. O backend também aceita
`.env.local` para sobrescrever valores só na máquina local.

Com Docker disponível, rode `docker compose up --build` uma vez para subir o
PostgreSQL, o Django (`http://localhost:8000`) e o Vite (`http://localhost:5173`).
Durante o desenvolvimento, abra o app em `http://localhost:5173`: mudanças em
Vue e CSS aparecem ao salvar, e o Vite repassa `/api` ao Django. Mudanças em
Python também são recarregadas pelo Django. Não é preciso reconstruir a imagem
ao salvar código; reconstrua quando mudar dependências ou o Dockerfile.

As portas do PostgreSQL, Django e Vite são publicadas somente em `127.0.0.1`.
O acesso por `localhost` continua funcionando; outros computadores da rede
não devem acessar esses serviços pelo IP da máquina. Essa configuração depende
do comportamento de publicação do Docker: use Docker Engine 28 ou mais recente,
pois versões anteriores têm uma [falha conhecida no isolamento de portas locais](https://docs.docker.com/engine/network/port-publishing/).
Depois de atualizar um checkout já em execução, aplique os novos bindings com
`docker compose up -d --force-recreate`. Esse comando recria os containers e
interrompe brevemente conexões existentes, mantendo os volumes de dados.

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
