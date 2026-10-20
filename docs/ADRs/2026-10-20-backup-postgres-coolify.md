# Backup automático do Postgres via Coolify

Responsável: Vinicius
Data: 2026-10-20
Status: Aceito

## Contexto

Os dados do CRM (notas sobre amigos) são privados. O código é open source, mas os dados não.

## Problema

Um backup que fica só no mesmo servidor some junto com ele em caso de falha de hardware, ransomware ou erro humano.

## Decisão

Usar **backup agendado do próprio Coolify** (`pg_dump`):
- Uma vez por dia
- Guarda os últimos 7 backups
- Cópia enviada para armazenamento compatível com S3 fora do servidor

Armazenamento escolhido: **Cloudflare R2** (plano grátis), configurado uma vez no Coolify sem código.

### Verificação

Fazer uma **restauração de teste** antes de considerar o backup pronto. Conferir que o dump restaura corretamente em ambiente local.

## Consequências

- Configuração única no Coolify (sem código no projeto)
- Backups diários automáticos
- 7 dias de retenção
- Dados privados ficam seguros fora do servidor de produção
- Necessário testar restauração periodicamente
- Recuperação de desastre viável
