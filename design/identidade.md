# Identidade visual — "Caderno físico"

_CRM de amigos (nome provisório). Versão 2, 16/10/2026, Designer._

> **Decisão:** a direção **"Caderno físico"** foi aprovada pelo Vinicius em **16/10/2026** e **substitui a direção A "Caderno"** (v1). A paleta, os papéis de cor e as regras de contraste da A continuam valendo; muda a linguagem (o app inteiro é um caderno sobre a mesa). Referência: `caderno-full.html` / `caderno-full-v2.png`.

## Conceito
O app é um caderno espiral aberto sobre uma mesa de madeira. A folha é pautada, tem margem vermelha, e cada amigo ocupa algumas linhas: o nome em Fraunces, a última nota escrita "à mão" em azul caneta (Caveat), e um carimbo terracota **registrar**. As seções são abas de divisória coladas na borda do caderno. Post-it e polaroid aparecem só como enfeite, num canto fixo. Os formulários (novo amigo, editar amigo, grupos) são escritos direto na pauta: o rótulo vem "à mão" em Caveat, o campo é o traço da linha e o valor digitado fica em Inter, porque escrever num campo tem que ser claro e não "fofinho". O sheet, os modais e a capa de entrada continuam em Inter, em cartões de papel com borda de tinta (exceção aprovada em 29/10/2026; ver regra 6). O tom continua sem culpa: nada de "atrasado", nada de vermelho de alerta e nenhum placar.

## Regras de implementação (aprovadas)
1. **Só CSS:** pauta (gradiente repetido), margem (pseudo-elemento), espiral (gradiente repetido) e mesa (cor sólida). Nenhuma imagem de textura. Os utilitários são `.paper-lined`, `.margin-line`, `.spiral-v`, `.spiral-h`, `.nota`, `.marca`, `.carimbo`, `.aba`, `.papel`, `.campo`, `.postit`, `.polaroid` e `.reserva-canto`, em `tokens.css` e no plugin do `tailwind.config.js`.
2. **Ritmo vertical de 32px com um token só (`--linha`).** Todo line-height de página é 32. Margens e alturas verticais são múltiplas de 32. A pauta é deslocada por `--pauta-offset: -5px` para o texto "sentar" na linha.
3. **Decorativos em canto fixo e sem sobrepor texto:** o post-it (só quando há aniversário) e a polaroid (no perfil) ficam no canto superior direito do cabeçalho, e o cabeçalho reserva o espaço com `.reserva-canto` (112px; 96px abaixo de 1024px). Isso corrige a polaroid que encostava em "Lembrar" na referência. Os dois usam `aria-hidden`; a informação do aniversário também existe em texto para leitores de tela.
4. **Abas = links comuns** (`router-link`): na borda direita a partir de 1024px e penduradas embaixo no celular. A aba ativa fica terracota com texto branco e `aria-current`.
5. **Duas páginas só a partir de 1280px** (breakpoint `livro`). Abaixo disso, uma página só, e o perfil desliza por cima.
6. **A Caveat entra só em notas, carimbos e rótulos de aba**, e, por exceção aprovada pelo Vinicius em 29/10/2026 (spec 3.13, "Formulários na pauta"), também **nos rótulos de campo e no carimbo "Salvar amigo"** dos formulários na pauta (os campos são só os do CRM-16: Nome, Falar a cada = número + unidade, Grupos). Os controles e o valor digitado continuam em Inter: valor digitado e número (≥16px), unidades do ritmo, chips/adesivos, links, "Cancelar edição" e mensagens de erro. O sheet, os modais e a capa `/entrar` usam Inter, sobre papel (`#E8DCC8`) com borda de tinta.
7. **A mesa é sólida (`#7A5A3E`)**, com sombra na página. Sem textura.

## Paleta e papéis
| Token | Hex | Papel |
|---|---|---|
| `primaria-600` | `#B04A32` | Botão primário, carimbo, aba ativa |
| `primaria-700` / `-800` | `#963D29` / `#7C3221` | Hover / pressed; texto em chips |
| `primaria-100` / `-50` | `#F1D6CC` / `#F8ECE6` | Chip selecionado, aba "bom falar" inativa / hover do carimbo |
| `folha` (neutro-50) | `#FBF6EE` | Folha pautada, fundo de campo |
| `papel` (neutro-200) | `#E8DCC8` | Superfície de formulário, sheet e modal |
| `tinta` (neutro-900) | `#2B2420` | Texto e borda de componentes de papel |
| neutros 100–800 | `#F4ECDF` `#D6C7AF` `#B3A38C` `#7A6B59` `#6B5E50` `#4F443A` `#3A312B` | Mesmos papéis da v1 (400 só decorativo; 500 placeholder; 600 texto secundário) |
| **`caneta`** | `#1F3A6B` | Notas manuscritas (Caveat) |
| **`marca-texto`** / `-50` | `#F6D98A` / `#FBEDC4` | Grifo `.marca`, post-it, aba "amigos" / item selecionado |
| **`pauta`** | `#C9D6E3` | Linhas da folha (decorativa); fundo da aba "?" |
| **`margem`** | `#D9837A` | Margem vermelha (decorativa) |
| **`mesa`** | `#7A5A3E` | Fundo atrás do caderno |
| `aba-verde` | `#B9CBB0` | Aba "+ novo" |
| sucesso / aviso / erro / foco | `#5E7A55` / `#8A5A12` / `#9B3B36` / `#2F6185` | Como na v1. O erro só aparece em formulários |

### Contraste WCAG (calculado por `contraste.py`)
Texto ≥ 4,5:1; UI e foco ≥ 3:1; pauta e margem são decorativas (sem mínimo, mas medidas). Todos os pares em uso passam.

| Frente | Fundo | Uso | Razão | AA |
|---|---|---|---|---|
| tinta #2B2420 | fundo #FBF6EE | texto | 14.19:1 | ✅ |
| tinta #2B2420 | branco #FFFFFF | texto | 15.26:1 | ✅ |
| tinta #2B2420 | papel #E8DCC8 | texto | 11.27:1 | ✅ |
| n700 #4F443A | fundo #FBF6EE | texto secundário | 8.79:1 | ✅ |
| n600 #6B5E50 | fundo #FBF6EE | texto secundário | 5.84:1 | ✅ |
| n600 #6B5E50 | branco #FFFFFF | texto secundário | 6.28:1 | ✅ |
| n600 #6B5E50 | n100 #F4ECDF | texto secundário | 5.36:1 | ✅ |
| n500 #7A6B59 | fundo #FBF6EE | texto terciário/placeholder | 4.79:1 | ✅ |
| branco #FFFFFF | p600 #B04A32 | botão primário | 5.42:1 | ✅ |
| branco #FFFFFF | p700 #963D29 | hover | 7.01:1 | ✅ |
| branco #FFFFFF | p800 #7C3221 | pressed | 8.99:1 | ✅ |
| p600 #B04A32 | fundo #FBF6EE | link/ícone primário | 5.04:1 | ✅ |
| p600 #B04A32 | branco #FFFFFF | link | 5.42:1 | ✅ |
| p700 #963D29 | p50 #F8ECE6 | texto em chip primário | 6.05:1 | ✅ |
| p800 #7C3221 | p100 #F1D6CC | texto em chip selecionado | 6.52:1 | ✅ |
| branco #FFFFFF | suc #5E7A55 | botão/selo sucesso | 4.78:1 | ✅ |
| suc700 #4A6343 | suc50 #EAF0E5 | texto sucesso suave | 5.73:1 | ✅ |
| suc700 #4A6343 | fundo #FBF6EE | texto sucesso | 6.18:1 | ✅ |
| suc #5E7A55 | fundo #FBF6EE | ícone sucesso (UI ≥3:1) | 4.45:1 | ✅ |
| avi #8A5A12 | avi50 #F7EBD3 | aviso suave | 5.01:1 | ✅ |
| avi #8A5A12 | fundo #FBF6EE | aviso texto | 5.50:1 | ✅ |
| err #9B3B36 | err50 #F6E3DF | erro suave | 5.52:1 | ✅ |
| err #9B3B36 | branco #FFFFFF | erro em campo | 6.83:1 | ✅ |
| err #9B3B36 | fundo #FBF6EE | erro texto | 6.35:1 | ✅ |
| foco #2F6185 | fundo #FBF6EE | anel de foco (UI ≥3:1) | 6.16:1 | ✅ |
| foco #2F6185 | branco #FFFFFF | anel de foco (UI ≥3:1) | 6.63:1 | ✅ |
| n500 #7A6B59 | branco #FFFFFF | borda de campo (UI ≥3:1) | 5.15:1 | ✅ |
| caneta #1F3A6B | fundo #FBF6EE | nota manuscrita (Caveat 22) | 10.41:1 | ✅ |
| caneta #1F3A6B | marca50 #FBEDC4 | nota em item selecionado | 9.60:1 | ✅ |
| caneta #1F3A6B | marca #F6D98A | nota com marca-texto | 8.11:1 | ✅ |
| caneta #1F3A6B | papel #E8DCC8 | nota sobre papel | 8.26:1 | ✅ |
| tinta #2B2420 | marca #F6D98A | texto em marca-texto / post-it / aba amigos | 11.05:1 | ✅ |
| tinta #2B2420 | marca50 #FBEDC4 | nome em item selecionado | 13.09:1 | ✅ |
| n600 #6B5E50 | marca50 #FBEDC4 | metadado em item selecionado | 5.39:1 | ✅ |
| p700 #963D29 | marca50 #FBEDC4 | carimbo em item selecionado | 6.01:1 | ✅ |
| n600 #6B5E50 | papel #E8DCC8 | texto secundário no sheet (papel) | 4.64:1 | ✅ |
| p700 #963D29 | papel #E8DCC8 | carimbo/link sobre papel | 5.17:1 | ✅ |
| tinta #2B2420 | abaverde #B9CBB0 | rótulo aba + novo | 8.89:1 | ✅ |
| tinta #2B2420 | pauta #C9D6E3 | rótulo aba ? | 10.33:1 | ✅ |
| tinta #2B2420 | p100 #F1D6CC | rótulo aba bom falar (inativa) | 11.07:1 | ✅ |
| branco #FFFFFF | p600 #B04A32 | rótulo aba ativa | 5.42:1 | ✅ |
| tinta #2B2420 | fundo #FBF6EE | borda tinta de campo (UI ≥3:1) | 14.19:1 | ✅ |
| mesa #7A5A3E | fundo #FBF6EE | borda da página contra a mesa (UI ≥3:1) | 5.81:1 | ✅ |
| branco #FFFFFF | mesa #7A5A3E | texto claro sobre a mesa | 6.25:1 | ✅ |
| pauta #C9D6E3 | fundo #FBF6EE | pauta (decorativa, sem mínimo; UI) | 1.37:1 | — decorativa |
| margem #D9837A | fundo #FBF6EE | margem (decorativa, sem mínimo; UI) | 2.61:1 | — decorativa |

A Caveat só é usada a partir de 20px (notas com 22px), e a caneta sobre a folha dá 10,41:1, folga suficiente para uma fonte manuscrita.

## Tipografia
- **Fraunces 600:** títulos de página (28px no celular / 30px), nomes (19px) e seções (19px).
- **Inter 400/500/600:** metadados (12–14px), valor digitado e placeholder (16px), opções, adesivos, links, mensagens de erro, botões, sheet, modais e os rótulos da capa `/entrar`.
- **Caveat 500/700:** notas (22px, `caneta`), carimbos (21px/700), rótulos de aba (20px/700) e, nos formulários na pauta, rótulos de campo (22px/700, `caneta`; sem dica entre parênteses: o "(opcional)" de "Grupos (opcional)" é parte do rótulo) e o carimbo "Salvar amigo" (26px/700, `folha` sobre `primaria`, 5,04:1). Nada além disso.
- Todo tamanho usa line-height de 32px na página. Dentro de papel (sheet, modal, capa), vale o grid de 8px.

## Espaço, raios e sombras
- **Vertical na página:** só `--linha` (32) e múltiplos (`l1`…`l6` no Tailwind). Blocos de formulário na pauta ocupam 2 linhas (rótulo 32 + campo 32 = 64; com erro, 3 linhas); o campo é o traço da linha e tem 48px de alvo, pegando 16px da linha de cima. Dentro de papel (capa, sheet), o bloco continua com 3 linhas (rótulo 32 + campo 48 + respiro 16 = 96).
- **Horizontal:** grid de 8px. Margem vermelha a 36px (celular) ou 56px (≥1024); o texto começa 16–24px depois dela.
- **Raios:** 6px (carimbo, campo), 10px (página, papel), pill (botões, chips), 8px na ponta da aba, 4px nos adesivos de grupo dos formulários na pauta.
- **Sombras:** página `0 18px 32px rgba(0,0,0,.35)`; papel, post-it e polaroid `2px 4px 8px rgba(43,36,32,.2)`; dobra central `inset ±18px 0 24px -14px rgba(0,0,0,.18)`.

## Ícones
Lucide, traço 1,75, 18px na folha e 16px dentro do carimbo. Os ícones substituem os emojis da referência (☕💬📞🎂): `coffee`, `message-circle`, `phone`, `cake`, `pen-line`, `user-plus`.

## Marca
`icon.svg` (caderno aberto, dois pontos) e `logo.svg` (wordmark "caderno de amigos" em curvas) continuam válidos; combinam com a nova direção.

## O que fazemos
- Escrevemos as notas "à mão" e deixamos o resto legível em Inter.
- Mantemos tudo na pauta: se um texto sai da linha, o layout está errado.
- Deixamos um carimbo por pessoa como ação e um primário por formulário.
- Usamos post-it só com aniversário de verdade.
- Usamos abas como navegação real, com link e foco visível.

## O que não fazemos
- Não usamos imagens de papel, madeira ou espiral, nem texturas e ruído.
- Não usamos Caveat no valor digitado, em placeholder, opções, adesivos, links, mensagens de erro, botões secundários, modais ou metadados. Nos formulários, a Caveat fica só nos rótulos e no carimbo "Salvar amigo".
- Não deixamos decorativo sobre texto e não usamos decorativo clicável.
- Não usamos "atrasado", contadores de dias, vermelho de alerta ou placar.
- Não usamos alturas "quebradas" na página (ex.: 20px de margem entre itens).
