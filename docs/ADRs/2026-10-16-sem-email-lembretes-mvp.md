# Sem email ou lembretes automáticos no MVP

Responsável: Vinicius
Data: 2026-10-16
Status: Aceito

## Contexto

Um CRM de amigos poderia enviar lembretes automáticos quando está próximo o momento de falar com alguém.

## Problema

Email e jobs agendados complicam o MVP com serviço de email (Resend), worker (Celery), gestão de preferências de notificação, e aumentam o overhead operacional.

## Decisão

**No MVP não tem email**, Resend, nem job agendado. A lista "bom falar com" (coluna "Essa semana" do Quadro) é calculada na hora em que o app abre, junto com a última nota de cada pessoa.

## Consequências

- Arquitetura mais simples no MVP
- Usuário precisa abrir o app por conta própria
- **Risco**: sem lembretes, o uso depende do usuário lembrar de abrir o app. Se isso não funcionar após 2 semanas de uso, avaliar notificação push no celular (PWA) ou email como fallback
- Fácil adicionar depois se validado como necessário
