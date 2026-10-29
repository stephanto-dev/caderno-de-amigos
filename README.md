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

O backend usa Python 3.11+ e `uv`. Em `backend/`, rode `uv sync` para instalar as
dependências, `uv run pytest src` para os testes e `uv run python src/manage.py check`
para verificar a configuração. O teste do backend requer o PostgreSQL do Compose.

Em produção, configure `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `POSTGRES_DB`,
`POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_HOST`. A imagem Docker serve o
frontend compilado junto com o Django; o PostgreSQL continua separado.

## Limites de requisições

Login e cadastro têm, cada um, limite de 5 tentativas por minuto por IP, mesmo
quando a sessão muda. Amigos, grupos e contatos compartilham o limite de
60 requisições por minuto por usuário autenticado.

`DJANGO_TRUSTED_PROXY_COUNT=0` usa o IP da conexão e ignora `X-Forwarded-For`.
Na hospedagem, ajuste esse valor à quantidade de proxies confiáveis na frente
do Django somente depois de verificar a cadeia. Eles precisam remover ou
normalizar cabeçalhos enviados pelo cliente, e o backend não pode aceitar
conexões públicas que contornem esses proxies. Por exemplo, use `1` quando
existir um único proxy confiável que acrescente o IP real ao final do cabeçalho.
Não presuma que Cloudflare junto com outro proxy terá essa mesma configuração.

Sem esse ajuste, usuários atrás de um proxy compartilham o contador pelo IP
dele. Pessoas na mesma rede também podem compartilhar um IP e o mesmo limite.
Os contadores atuais ficam na memória de cada processo e somem ao reiniciar.
Antes de usar vários workers ou réplicas, será preciso compartilhar os
contadores. O throttle do DRF não garante proteção contra força bruta ou
ataques de volume; regras na borda, como no Cloudflare, complementam esses
limites e precisam ser configuradas e verificadas na hospedagem.

## Documentação

- [Arquitetura do sistema](docs/arquitetura.md)
- [ADRs (Architecture Decision Records)](docs/ADL.md)
- [Guias de engenharia](docs/engineering/README.md)
