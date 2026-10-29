# Como contribuir

Issues e pull requests de pessoas externas são bem-vindos. Este é um projeto
de aprendizado, mantido no tempo disponível, sem prazo garantido de resposta.
As contribuições são recebidas sob a [mesma licença MIT do projeto](LICENSE).

## Antes de começar

- Consulte o [README](README.md) para instalar e rodar o projeto.
- Siga o [código de conduta](CODE_OF_CONDUCT.md).
- Para bugs, informe como reproduzir, o resultado esperado e o que aconteceu.
  Use somente dados fictícios em exemplos, logs e capturas de tela.
- Para mudanças grandes, abra uma issue antes de implementar para alinhar o
  escopo. Para vulnerabilidades, use o [canal privado](SECURITY.md).

## Preparando um pull request

1. Faça um fork e crie uma branch a partir da `main`. Use `feat/<slug>`,
   `fix/<slug>`, `docs/<slug>` ou `refactor/<slug>`.
2. Mantenha a mudança pequena e siga os [guias de engenharia](docs/engineering/README.md).
   O código é escrito em inglês; documentação e conversas podem ser em português.
3. Inclua testes para comportamentos novos ou correções. Execute as
   [verificações do README](README.md#testes-e-verificações) aplicáveis à mudança.
   Mudanças apenas de documentação precisam ter comandos e links conferidos.
4. Atualize a documentação do comportamento alterado. Avise se houver migrations
   e use dados fictícios nas capturas de tela de alterações visuais.
5. Use Conventional Commits, como `fix: corrige registro de contato`. Escopos
   opcionais devem ser nomes de apps existentes, como `friends` e `accounts`.
6. Abra o PR contra `main`, vincule a issue quando houver, explique o que mudou
   e informe as verificações executadas e seus resultados. Explique eventuais
   diferenças em uma seção **Desvios da issue**. Aguarde o CI e a revisão.

Não inclua `.env`, credenciais, dados reais de amigos, dumps de banco ou backups.
O `.gitignore` evita inclusões acidentais, mas não remove arquivos já rastreados
nem dados do histórico. Revise o diff antes de enviar.
