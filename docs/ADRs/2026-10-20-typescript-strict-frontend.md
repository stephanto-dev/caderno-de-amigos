# TypeScript strict no frontend

Responsável: Vinicius
Data: 2026-10-20
Status: Aceito

## Contexto

O frontend é Vue 3. JavaScript permite desenvolvimento rápido, mas erros de tipo só aparecem em runtime.

## Problema

Sem checagem de tipos, erros comuns (propriedade indefinida, tipo errado em função) só aparecem ao rodar o código, dificultando refatoração e manutenção.

## Decisão

**Vue 3 com TypeScript desde o primeiro commit**, com `strict: true` no `tsconfig.json` e checagem de tipos (`vue-tsc`) no CI.

Mesma filosofia de rigor que `mypy` no backend Django.

## Consequências

- Todo código Vue é `.ts` ou `.vue` com `<script setup lang="ts">`
- CI roda `vue-tsc --noEmit` e falha em erro de tipo
- Biblioteca de componentes precisa ter tipagens (Tailwind UI é compatível)
- Curva de aprendizado um pouco maior, mas erros detectados antes de runtime
- Refatoração mais segura
