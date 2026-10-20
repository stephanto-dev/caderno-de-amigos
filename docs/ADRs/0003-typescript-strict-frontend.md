# TypeScript strict no frontend

Responsável: Vinicius
Data: 2026-10-20
Status: Aceito

## Contexto

O frontend é Vue 3. Precisamos decidir se usamos JavaScript ou TypeScript, e qual nível de rigor.

## Decisão

**Vue 3 com TypeScript desde o primeiro commit**, com `strict: true` no `tsconfig.json` e checagem de tipos (`vue-tsc`) no CI.

### Por que TypeScript strict

Erros de tipo aparecem antes de rodar o código, mesmo rigor que `mypy --strict` dá ao backend Django. O Vinicius já usa TypeScript, então é consistente com sua prática.

## Consequências

- Todo código Vue é `.ts` ou `.vue` com `<script setup lang="ts">`
- CI roda `vue-tsc --noEmit` e falha em erro de tipo
- Biblioteca de componentes precisa ter tipagens (Tailwind UI é compatível)
- Curva de aprendizado um pouco maior, mas erros detectados antes
