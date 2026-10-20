# Quadro simplificado com janela fixa de 7 dias

Responsável: Vinicius
Data: 2026-10-20
Status: Aceito

## Contexto

A versão inicial da régua do Quadro usava `min(7, ceil(f/4))` para calcular a janela da coluna "Essa semana". Também havia arrastar e soltar (SortableJS) para registrar contato.

## Problema

A janela dinâmica adiciona complexidade sem valor proporcional. A biblioteca de drag-and-drop adiciona dependência e código para manter.

## Decisão

**Janela fixa de 7 dias** para a coluna "Essa semana", independente do ritmo.

**Sem arrastar e soltar**. O contato é registrado por um **botão "Falei agora"** em cada amigo, mesmo nome da coluna.

PM e Designer concordaram que a janela dinâmica não agregava valor suficiente para justificar a complexidade.

## Consequências

- Lógica do Quadro mais direta: coluna "Essa semana" sempre considera últimos 7 dias
- Sem dependência de biblioteca de drag-and-drop
- UX mais explícita: botão "Falei agora" deixa claro a ação
- Menos código para testar e manter
- Alinhamento com a régua de simplicidade do projeto
