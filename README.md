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

## Produção

Use a imagem Docker com Gunicorn. O Compose é exclusivo de desenvolvimento:
ele liga o modo de depuração e usa `runserver`. A imagem serve o frontend
compilado junto com o Django; o PostgreSQL continua separado.

Configure `DJANGO_DEBUG=0`, `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`,
`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_HOST`.
O modo de depuração fica desligado por padrão; só o ambiente local deve usar
`DJANGO_DEBUG=1`. Não reutilize o `.env.example` como configuração de produção.

O servidor recusa chaves com menos de 50 caracteres, menos de 5 caracteres
diferentes ou com prefixo `django-insecure-`. Também recusa a senha de banco
`caderno` e a ausência de domínios explícitos. `DJANGO_ALLOWED_HOSTS` não aceita `*` em
produção. Esses critérios para a chave são uma verificação mínima; gere uma
chave aleatória exclusiva com `python -c 'import secrets; print(secrets.token_urlsafe(64))'`
e guarde-a somente no ambiente da hospedagem. Defina uma senha exclusiva também
no PostgreSQL antes de iniciar o app.

Fora do modo local, o Django redireciona HTTP para HTTPS e marca os cookies de
sessão e CSRF como `Secure`. O cookie de sessão continua `HttpOnly`, e ambos
continuam com `SameSite=Lax`. O Vue precisa ler o cookie CSRF para montar o
cabeçalho das requisições; esse cookie permanece acessível ao JavaScript.

Configure o certificado e o acesso HTTPS na hospedagem antes de abrir o app.
Se um proxy termina o HTTPS e encaminha HTTP para o Django, ative
`DJANGO_TRUST_X_FORWARDED_PROTO=1` somente depois de verificar que esse proxy
sobrescreve `X-Forwarded-Proto` e que ninguém pode acessar o backend diretamente.
O default `0` ignora esse cabeçalho. Sem o ajuste em um proxy que encaminha
HTTP, haverá redirecionamentos repetidos; não desative as proteções para contornar isso.

Respostas HTTPS incluem HSTS por uma hora, apenas para o domínio acessado,
sem `includeSubDomains` nem `preload`. Não publique o app nesse domínio sem
HTTPS funcional, pois o navegador vai exigir HTTPS durante esse período.
Com as variáveis reais de produção, execute
`python src/manage.py check --deploy` em `backend/` antes do deploy. Os avisos
sobre `includeSubDomains` e `preload` ficam pendentes até confirmar HTTPS para
os demais subdomínios; não habilite essas opções só para remover os avisos.

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
