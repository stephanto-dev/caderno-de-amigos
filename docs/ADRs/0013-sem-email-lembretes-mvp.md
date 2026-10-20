# Sem email ou lembretes automáticos no MVP

Responsável: Vinicius
Data: 2026-10-16
Status: Aceito

## Contexto

Um CRM de amigos poderia enviar lembretes automáticos quando está próximo o momento de falar com alguém.

## Decisão

**No MVP não tem email**, Resend, nem job agendado. A lista "bom falar com" (coluna "Essa semana" do Quadro) é calculada na hora em que o app abre, junto com a última nota de cada pessoa.

### Por que não

Complicaria o MVP com:
- Serviço de email (Resend ou outro)
- Worker para envio (Celery)
- Job agendado
- Gestão de preferências de notificação

### Risco

Sem lembretes, o uso depende do usuário lembrar de abrir o app. Se isso não funcionar após 2 semanas de uso, avaliar:
- Notificação push no celular (PWA)
- Email como fallback

## Consequências

- Arquitetura mais simples no MVP
- Usuário precisa abrir o app por conta própria
- Feedback real sobre necessidade de lembretes
- Fácil adicionar depois se validado como necessário
