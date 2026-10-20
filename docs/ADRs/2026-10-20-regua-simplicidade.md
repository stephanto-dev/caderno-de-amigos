# Régua de simplicidade como princípio do projeto

Responsável: Vinicius
Data: 2026-10-20
Status: Aceito

## Contexto

Caderno de amigos é um projeto de aprendizado e CRM pessoal. Projetos pessoais tendem a acumular complexidade desnecessária ao longo do tempo.

## Problema

Sem um critério claro para decisões de escopo e arquitetura, o projeto pode incorporar funcionalidades complexas que dificultam manutenção e aprendizado, contrariando o objetivo de ser simples.

## Decisão

**Régua de simplicidade**: o sistema deve ser o mais simples possível, com lógica simples e sem funcionalidades complexas.

Toda issue passa por essa régua: **se dá para fazer com menos regra, menos estado ou menos biblioteca, faz assim**.

## Consequências

- Decisões de escopo mais rápidas e objetivas
- Código mais fácil de entender e manter
- Menos dependências externas
- Sistema sustentável para um projeto pessoal de aprendizado
- Trade-off consciente: menos features, mas arquitetura enxuta
- Sempre questionar: "podemos fazer mais simples?"
- Aplicações práticas já realizadas: janela fixa de 7 dias, sem SortableJS, um serviço Docker, sem Redis/Celery no MVP
