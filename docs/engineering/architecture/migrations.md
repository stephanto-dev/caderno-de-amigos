# Migrations

## Migrations seguras

- Migrations são reversíveis sempre que possível.
- Em `RunPython`, use os modelos históricos com `apps.get_model(...)`. Não importe models nem serviços atuais: a migration precisa continuar rodando quando eles mudarem.
- Defaults simples e transformações pequenas e determinísticas podem ficar na migration. O que chama API ou percorre muito histórico roda fora do deploy.
- Schema e dados andam separados. Preencher histórico com regra de negócio deve ser feito fora da migration.
- Renomear campo usa `RenameField`. Uma migration que apaga a coluna e cria outra perde dados.
- Avalie o tamanho da tabela e os locks antes de uma mudança custosa. Ao trocar um índice, crie o novo antes de apagar o antigo.
- Avise no PR toda migration que apaga dados em produção.
- Migration em tabela muito grande é aplicada em horário de baixo tráfego. Liste essas tabelas aqui e marque o PR quando tocar nelas.

<!-- Tabelas grandes deste projeto:
- `<app>_<model>`: motivo
-->

## Checagem

O pre-commit e o CI rodam `python src/manage.py makemigrations --check`. Mudança de model sem migration não passa.
