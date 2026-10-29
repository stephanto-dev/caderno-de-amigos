# Segurança

## Como reportar uma vulnerabilidade

Envie um e-mail para [v.stephanto@gmail.com](mailto:v.stephanto@gmail.com) com
o assunto `Segurança — Caderno de amigos`. Não abra issues ou PRs públicos
com detalhes de exploração, credenciais ou dados de usuários.

Inclua, se possível:

- O commit ou versão afetada e o ambiente em que o problema apareceu.
- Uma descrição do impacto e passos para reproduzir usando dados fictícios.
- Uma demonstração mínima, sem acessar ou alterar dados de outras pessoas.

Remova senhas, cookies, tokens e dados pessoais dos anexos. Não envie dumps
reais do banco. Se encontrou uma credencial exposta, informe o local, sem
repetir o valor, e revogue ou troque a credencial caso ela pertença a você.

O mantenedor avaliará o relato e combinará a correção e a divulgação com quem
reportou. Aguarde esse alinhamento antes de publicar detalhes de exploração.
Este é um projeto mantido no tempo disponível; não há prazo garantido de
resposta ou programa de recompensa.

## Versões e instalações

As correções são destinadas à branch `main`; não há manutenção de versões
antigas. Quem hospeda uma cópia precisa acompanhar as alterações e aplicá-las.

O Compose e as credenciais do `.env.example` são apenas para desenvolvimento
local. Antes de hospedar, siga as [orientações de produção](README.md#produção),
configure HTTPS, credenciais exclusivas, acesso ao admin e backups privados.
Publicar o código não torna públicos os dados de amigos e contatos.
