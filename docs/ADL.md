# Architectural Decision Log

Uma linha por decisão, da mais antiga para a mais nova. O detalhe fica no ADR em `docs/ADRs/`.

- 2026-10-16: `0013-sem-email-lembretes-mvp.md` — Sem email ou lembretes automáticos no MVP
- 2026-10-20: `0015-regua-simplicidade.md` — Régua de simplicidade como princípio do projeto
- 2026-10-20: `0014-quadro-simplificado-janela-fixa.md` — Quadro com janela fixa de 7 dias, sem drag-and-drop
- 2026-10-20: `0001-servico-unico-docker.md` — Serviço único no deploy com Dockerfile multi-stage
- 2026-10-20: `0002-autenticacao-sessao-csrf.md` — Autenticação por sessão Django com CSRF
- 2026-10-20: `0003-typescript-strict-frontend.md` — TypeScript strict no frontend Vue
- 2026-10-20: `0004-app-unica-amigos.md` — App Django única `amigos` para Friend e Contact
- 2026-10-20: `0005-coluna-quadro-calculada.md` — Coluna do Quadro calculada no backend, último contato derivado
- 2026-10-20: `0006-datas-utc-timezone-sao-paulo.md` — Datas em UTC com TIME_ZONE de São Paulo
- 2026-10-20: `0007-modelo-dados-ritmo-tipo-grupos.md` — Modelo de dados: ritmo, tipo de contato e grupos
- 2026-10-20: `0008-sem-cache-fila-worker-mvp.md` — Sem Redis, RabbitMQ ou Celery no MVP
- 2026-10-20: `0009-criacao-grupos-mvp.md` — Criação de grupos inline no cadastro de amigo
- 2026-10-20: `0010-contrato-api-mvp.md` — Contrato da API REST do MVP
- 2026-10-20: `0011-estrategia-testes-tdd.md` — Estratégia de testes com TDD obrigatório
- 2026-10-20: `0012-backup-postgres-coolify.md` — Backup automático do Postgres via Coolify
