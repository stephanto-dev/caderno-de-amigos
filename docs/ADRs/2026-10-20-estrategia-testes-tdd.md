# Estratégia de testes com TDD obrigatório

Responsável: Vinicius
Data: 2026-10-20
Status: Aceito

## Contexto

Precisamos definir a abordagem de testes para backend Django e frontend Vue.

## Problema

Sem testes, refatoração é arriscada e bugs aparecem em produção. Testes escritos depois do código tendem a ser superficiais e não guiam o design.

## Decisão

**TDD é obrigatório**: o teste é escrito antes do código.

### Backend

`pytest` + `pytest-django`, com datas congeladas por `time-machine`.

**Testes unitários de services:**
- `QuadroService`: regra das colunas para cada ritmo, incluindo caso de até 9 dias
- Teste de fuso: contato às 23:30 BRT conta no dia local correto

**Testes de API:**
- Cliente de teste do Django com banco real (sem mock)
- Cobrem `POST` e `DELETE` de contato
- Após `DELETE`, amigo volta à coluna anterior
- Tentar acessar amigo de outro `owner` retorna 404

### Frontend

`Vitest` + Vue Test Utils, com API em mock.

Testes conferem:
- Quadro coloca cada amigo na coluna que a API mandou (tela não calcula regra)
- Botão "desfazer" funciona

### CI

- Ambas suítes rodam no CI
- `vue-tsc` para checagem de tipos TypeScript
- `ruff` e `mypy` no backend

### Fora do MVP

Teste ponta a ponta com navegador (Playwright/Cypress).

## Consequências

- Testes guiam o design das funções (feedback rápido, interfaces mínimas)
- Refatoração segura
- Cobertura alta desde o início
- CI falha rápido em regressões
- Tempo inicial maior, mas menos bugs em produção
- Cultura de qualidade desde o primeiro commit
