# Engineering styleguide

Este é o índice dos padrões de engenharia do projeto, para desenvolvedores, agentes de implementação e revisores. O objetivo é reduzir decisões repetidas sem transformar preferência em arquitetura desnecessária.

## Como usar

1. Escolha os tópicos que a mudança toca, na lista abaixo.
2. Use este guia para convenções e os documentos de fluxo (ao lado dos serviços) para regras de negócio.
3. Confirme o contrato de um sistema externo antes de alterá-lo.
4. Se duas regras se contradizem de um jeito que muda comportamento ou convenção, exponha o ponto e alinhe com o responsável.

As regras valem para código novo e para os trechos alterados. Elas não pedem reescrita de módulos que a mudança não toca. Código legado fora do padrão é contexto, não aprovação: ele não revoga a regra, e um exemplo isolado não cria regra. Não crie camadas, helpers ou documentos só para preencher uma estrutura.

## Convenções de código

- [Estilo geral](code-conventions/code-style.md)
- [Nomenclatura](code-conventions/naming.md)
- [Constantes](code-conventions/constants.md)
- [Tipagem](code-conventions/typing.md)
- [Documentação e comentários](code-conventions/documentation.md)
- [Logging](code-conventions/logging.md)
- [Testes](code-conventions/testing.md)
- [Models Django](code-conventions/django-models.md)
- [Django Admin](code-conventions/admin.md)

## Arquitetura

- [Estrutura do projeto](architecture/project-structure.md)
- [Serviços](architecture/services.md)
- [API HTTP (Django REST Framework)](architecture/api.md)
- [Migrations](architecture/migrations.md)

## Ferramentas

- [Tooling: uv, ruff, mypy, pre-commit](tooling.md)

## Manutenção

Cada convenção mora numa página só. Quando ela mudar, atualize essa página. O `AGENTS.md` e os arquivos de regras de review (`BUGBOT.md` e afins) apontam para ela, sem manter cópias que divergem com o tempo. Contratos especiais de um sistema externo ficam junto do client ou do fluxo que depende deles.
