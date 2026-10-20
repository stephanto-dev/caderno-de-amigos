# Sem Redis, RabbitMQ ou Celery no MVP

Responsável: Vinicius
Data: 2026-10-20
Status: Aceito

## Contexto

Projetos Django comumente usam Redis para cache, RabbitMQ ou Redis para filas, e Celery para workers de segundo plano. Precisamos decidir se incluímos essas ferramentas no MVP.

## Decisão

**O MVP não tem cache, fila nem worker**. Apenas Django e Postgres.

### Por que não

- Um usuário apenas
- Poucos dados
- Nenhuma tarefa em segundo plano no MVP (sem email, sem jobs agendados)
- Cada peça adicional é um serviço para configurar, monitorar e manter

### Futuro (notificações, fora do MVP)

Se surgirem notificações, começar com um comando Django (`manage.py enviar_lembretes`) agendado como tarefa no Coolify.

Celery com Redis só entra se:
- Surgirem muitas tarefas em segundo plano
- For necessário retry automático
- Volume de jobs justificar gestão de filas

## Consequências

- Arquitetura simples: Django + Postgres
- Menos overhead operacional no MVP
- Fácil adicionar depois se necessário
- Sem job agendado, então sem envio automático de lembretes (decisão de produto aceita)
