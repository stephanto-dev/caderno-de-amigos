# Régua de simplicidade como princípio do projeto

Responsável: Vinicius
Data: 2026-10-20
Status: Aceito

## Contexto

Caderno de amigos é um projeto de aprendizado e CRM pessoal. Precisamos de um critério claro para decisões de escopo e arquitetura.

## Decisão

**Régua de simplicidade**: o sistema deve ser o mais simples possível, com lógica simples e sem funcionalidades complexas.

Toda issue passa por essa régua: **se dá para fazer com menos regra, menos estado ou menos biblioteca, faz assim**.

### Aplicações práticas

Esta régua já guiou:
- Janela fixa de 7 dias em vez de dinâmica (ADR 0014)
- Sem SortableJS (ADR 0014)
- Um serviço Docker em vez de dois (ADR 0001)
- Grupo como escolha simples em vez de hierarquia
- Sem Redis/Celery no MVP (ADR 0008)

## Consequências

- Decisões de escopo mais rápidas
- Código mais fácil de entender e manter
- Menos dependências externas
- Trade-off: menos features, mas sistema sustentável para um projeto pessoal de aprendizado
- Sempre questionar: "podemos fazer mais simples?"
