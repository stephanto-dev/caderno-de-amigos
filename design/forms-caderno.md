# Formulários com cara de caderno: 3 direções (proposta)

> **Proposta, 29/10/2026. Ainda não aprovada.** Não altera `spec.md`, `identidade.md` nem os HTMLs aprovados. Protótipo: `direcoes/forms-caderno.html?direcao=a|b|c&estado=normal|foco|preenchido|erro|desabilitado&grupos=normal|editar|form` (`&qa=1` mostra a checagem do ritmo de 32px).
> Prints: `prints/forms-caderno-{a,b,c}-{desktop,mobile}.png`, `prints/forms-caderno-comparativo.png`, `prints/forms-caderno-estados.png` (direção A).

**Problema.** Hoje o cadastro é um cartão `.papel` (bege `#E8DCC8`, borda 2px tinta, raio 10) com `.campo` de 48px em Inter. Ele parece um formulário web genérico colado em cima da folha. As três direções abaixo usam **o mesmo HTML** (o form do 3.5/CRM-16): só o CSS muda, ativado pela classe `dir-a`, `dir-b` ou `dir-c` no `body`.

## Referências (links abertos em 29/10/2026; nada pago)

Todos os links foram testados. Os do CodePen dão 403 (Cloudflare) para curl e Chrome headless, mas abriram normalmente via fetch de navegador. Os do Dribbble dão 202 com título correto.

| # | Referência | O que levar |
|---|---|---|
| 1 | [CodePen: CSS Notebook Paper (designcouch)](https://codepen.io/designcouch/pen/bGvzKE) | Margem vermelha e pauta só com `linear-gradient`, sem imagem. É a base da nossa `.paper-lined`. |
| 2 | [CodePen: Index Card FX (jenanemone)](https://codepen.io/jenanemone/pen/MWQbPeR) | A ficha pautada feita em CSS: linha rosa/vermelha no topo e pauta azul. Ponto de partida da B. |
| 3 | [CodePen post: Creating Lined Paper (ceg9498)](https://codepen.io/ceg9498/post/creating-lined-paper) | Ensina a usar `background-position` para alinhar a 1ª linha da pauta ao texto. É o nosso `--pauta-offset`. |
| 4 | [CodePen: CSS-only letter-like form with inline fields (damianmuti)](https://codepen.io/damianmuti/pen/gWNpNN) | Carta com campos "preencha a lacuna" sobre a linha. Serviu de inspiração para a A, mas usa `contenteditable`: **é o antipadrão que o TL vetou**. Levamos só o visual. |
| 5 | [Gist: underline por caractere num único input (Ana Tudor / MichaelSRose)](https://gist.github.com/MichaelSRose/32239f982a2b9b6e304ffdf7c8f6270d) | Divisões por letra desenhadas no `background` de **um** input monoespaçado + `letter-spacing`. É a técnica do pente dd/mm da C. |
| 6 | [client-side-form.com: one-time-code inputs](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/one-time-code-inputs-keyboard-paste-and-autofill/) | Por que um input só, e não um por dígito: colar, autofill, leitor de tela e backspace funcionam sem gambiarra. |
| 7 | [GOV.UK Design System: Date input](https://design-system.service.gov.uk/components/date-input/) | Rótulo + dica de formato visível ("dia/mês") + erro específico ("Essa data não existe"), cara de formulário impresso que ainda é acessível. |
| 8 | [PaperCSS](https://www.getpapercss.com/) ([GitHub, ISC](https://github.com/papercss/papercss)) | Bordas "à mão" com `border-radius` assimétrico (ex.: `255px 15px 225px 15px/15px 225px 15px 255px`). Usamos essa técnica no círculo da opção marcada na A. Código ISC, livre. |
| 9 | [Rough Notation](https://roughnotation.com/) (MIT) | Grifo, círculo e sublinhado "à mão" para destacar seleção. Inspirou o círculo (A) e o grifo marca-texto (B). Não adicionamos a lib: fizemos em CSS. |
| 10 | [Wired Elements](https://wiredjs.com/) (MIT) | Controles desenhados à mão (checkbox, radio, input). Mostra o limite: fica bonito, mas o traço tremido em **todo** campo cansa. Por isso usamos "à mão" só na seleção. |
| 11 | [98.css](https://jdan.github.io/98.css/) (MIT) | Prova de que uma estética forte cabe em HTML nativo e semântico (`fieldset`, `label`, `input`) só com CSS. É o mesmo contrato que o TL pediu. |
| 12 | [Dribbble: notebook UI](https://dribbble.com/tags/notebook-ui) e [paper form](https://dribbble.com/tags/paper-form) | Painel de clima visual: fichas, fitas e carimbos. Também mostra o que evitar: textura em imagem e Caveat no valor digitado. |
| 13 | [Goodnotes](https://www.goodnotes.com/), [Notability](https://www.notability.com/), [Day One](https://dayoneapp.com/) | Apps reais em que a pauta é o próprio campo de escrita e o chrome de UI fica mínimo. Benchmark da A. |

## As três direções

### A · Escrever na pauta (recomendada)
**O que é.** Não tem cartão: o campo é a própria linha da folha. A pauta azul ganha um traço `neutro-500` de 1,5px no trecho onde se escreve. O rótulo vai em Caveat 22/700 `caneta`, na linha de cima, como uma anotação. O valor digitado é Inter 16 `tinta` e senta exatamente na pauta. "Falar a cada" mostra quatro palavras soltas, e a escolhida ganha um **círculo à mão** (borda assimétrica girada -3°). Os grupos viram **adesivos**: retângulo levemente girado e com sombra quando ligado, tracejado quando desligado. Salvar é um **carimbo** terracota em Caveat 26/700 com filete interno branco, girado -2°. No foco aparece uma faixa `marca-texto-50` (cor de marca-texto) e o traço vira 3px `foco`. No erro, o traço fica `erro` e a mensagem com ícone ocupa uma linha própria.
**Prós.** É a única direção que parece *escrever no caderno*, e não "um formulário em cima do caderno". É a mais leve, ocupa menos linhas, aproveita a folha que já existe e muda pouco CSS. **Contras.** Campo só com sublinhado é menos óbvio do que caixa. O carimbo em Caveat abre uma exceção na regra 6 da identidade (Caveat só em notas, carimbos e abas). Ele *é* um carimbo, mas precisa de aprovação. **Risco de usabilidade.** Descobrir o campo vazio é o ponto fraco do sublinhado. Mitigamos com rótulo sempre visível, traço com 4,79:1 (bem acima de 3:1), placeholder em `neutro-500` e foco muito marcado. Os adesivos girados ficam com rotação ≤1,5° para não parecer "torto/quebrado".

### B · Ficha pautada (index card)
**O que é.** Uma ficha branca **reta** (o conteúdo nunca gira, para o caret e a seleção ficarem nítidos). Atrás dela há uma ficha `neutro-100` girada 1,6° (a pilha) e, no topo, uma fita `marca-texto`. O nome vai na faixa de cabeçalho, acima da linha vermelha dupla (`margem`), em Inter 20/600. Os demais campos ficam nas linhas azuis, alinhadas às mesmas posições de 32px da folha. Rótulos em Caveat 20 `caneta` ficam à esquerda, na mesma linha (no celular, os longos sobem). Na opção escolhida, o texto é grifado com marca-texto e ganha ✓. Os grupos são etiquetas de arquivo (cantos de cima arredondados). O Salvar continua o pill atual, fora da ficha.
**Prós.** É um objeto reconhecível de cara (ficha de fichário) e combina com o conceito "caderno de amigos" (uma ficha por pessoa). O nome ganha destaque como título. A hierarquia fica clara. **Contras.** Ainda é "um cartão em cima da folha": troca o cartão bege por um branco. Isso resolve só parte da queixa. Fita e pilha são decorativas e somam ruído a uma tela que se usa muito. **Risco.** A ficha branca sobre a folha creme cria dois papéis na mesma tela. Com rótulo inline, o espaço do valor no celular fica estreito (~170px), e "3 meses" fica no limite da largura.

### C · Formulário escolar preenchível (ficha de matrícula)
**O que é.** Uma folha impressa branca com tabela de células de borda fina `tinta`, com cabeçalho "FICHA DE AMIGO · nº 042". Os rótulos ficam em versalete (Inter 11/600, caixa alta, `neutro-700`) no canto superior das células. "Falar a cada" e os grupos são **caixinhas ☐ marcadas com ✓ à mão** em Caveat `caneta`. O aniversário vem em **caixinhas por dígito** `[1][2]/[0][3]`. No foco, a célula inteira ganha contorno `foco` de 2,5px e fundo marca-texto-50. No erro, o contorno é `erro` e a mensagem fica dentro da célula. No desktop, ritmo e aniversário dividem uma linha da tabela.
**Prós.** É a mais original e a mais "papel brasileiro": lembra matrícula, ficha do posto e cadastro de biblioteca. O estado de cada campo fica muito legível, porque é a célula inteira que muda. **Contras.** É a mais pesada visualmente. Tem cara de burocracia, e "preencher ficha" é o oposto de "só o nome já basta". Também é a que mais muda o CSS e o layout (grid de 2 colunas no desktop e 2×2 no celular). **Risco.** Caixinha quadrada para escolha única (`radio`) é um falso sinal de múltipla escolha. Os grupos são múltiplos e o ritmo é único, mas os dois parecem iguais. O pente dd/mm depende de dígitos tabulares do Inter: se a fonte cair no fallback, as caixinhas desalinham do texto.

## Como cada direção cumpre a restrição do Tech Lead

Restrição: input/textarea/button **nativos**, `label` associado, foco visível, estados de erro, valor ≥16px no celular, só CSS sobre o form atual (CRM-16). Na C, **um** input para as caixinhas.

**Base comum (vale para A, B e C).** O HTML é **um só** e as direções trocam só de classe no `body`:
- Nome e "Como se conheceram": `<input type="text">` com `<label for>`. Aniversário: `<input inputmode="numeric" maxlength="5">` com `<label for>`. Nota: `<textarea>` com `<label for>`.
- "Falar a cada": `<fieldset>` + `<legend>` + 4 `<input type="radio" name="ritmo">` dentro de `<label>`. O radio fica visualmente oculto (`opacity:0`, 1px), mas continua **focável e navegável com as setas**. O desenho (círculo, grifo ou ☐✓) é um `span` irmão estilizado com `input:checked ~ span` e `input:focus-visible ~ span`.
- Grupos: os mesmos `<button type="button" aria-pressed>` do 3.5. O modo editar troca `aria-pressed` pelo `pencil` e "editar" por "pronto", e o formulário de grupo usa os mesmos `role="radio"` das 5 cores. Funciona igual nas 3 (`?grupos=editar` e `?grupos=form`).
- Salvar e Cancelar: `<button type="submit">` e `<button type="button">`. Desabilitado/salvando: `<fieldset disabled>` nativo envolvendo tudo, com `aria-busy` no Salvar.
- Erro: `aria-invalid="true"` + `<p id="…-erro">` ligado por `aria-describedby`, que **só existe enquanto há erro**. A mensagem tem ícone e texto, então o erro não depende só de cor.
- Sem `contenteditable` e sem `div` fingindo campo. Nenhuma imagem de textura: pauta, linha vermelha, fita, pilha, carimbo e pente são `linear-gradient` e `box-shadow`.
- Valor digitado: Inter **16px** no mínimo em todas (nome na B 20px, na C 18px; pente da C 18px). O iOS não dá zoom. Caveat **nunca** aparece no valor, só em rótulos, no carimbo e no "nº".
- Alvos: todo controle tem **48px** e pega 16px emprestados da linha em branco de cima (`margin-top:-16px`), então o texto senta na pauta sem quebrar o ritmo. Chips e cores têm 44px, em linhas de 64 (44 + 10 + 10) e 128px.
- Ritmo: com `?qa=1`, todos os blocos (campos, grupos, chips, ações) caem em múltiplos de 32 nas 3 direções, em 1280 e em 390.

**A.** O "campo-linha" é o próprio `<input>` com `border:0` e um `background-image` de 1,5px (o traço). Foco: `:focus-visible` troca o traço por 3px `foco` + faixa marca-texto-50 (o anel de 3:1 é o traço). Um `box-shadow` não funcionaria aqui, porque o input não tem caixa. O carimbo é o `<button type=submit>` com `transform:rotate(-2deg)`: o rótulo continua texto real, e o anel padrão `--anel-foco` aparece por fora.

**B.** A ficha é um `div.ficha-corpo` decorativo (fundo e pseudo-elementos `::before` e `::after` para pilha e fita, com `pointer-events:none`). Os campos dentro são os mesmos inputs da A. A ficha não gira (só a pilha de trás), então caret, seleção e o zoom de acessibilidade continuam retos.

**C.** As bordas de célula são `box-shadow inset` e `outline` (zero px de layout, para o ritmo não quebrar). O foco da célula usa `:focus-within` e o erro usa `:has([aria-invalid=true])`, enquanto o próprio input fica sem anel para não duplicar. **Caixinhas do aniversário = UM `<input>`**: Inter 18px com `font-variant-numeric: tabular-nums` (dígito = 0,6484em, medido no Chrome), `letter-spacing:.75em` e `padding-left:.375em`. As caixinhas são 11 camadas de `linear-gradient` no `background` do input, posicionadas em em (células de 1,3984em; barra 1,1105em). Medimos que `ch` **não** serve, porque 1ch = 0,6308em ≠ dígito tabular. Colar "12/03", autofill e leitor de tela funcionam como num input comum. Nos ☐✓, o ✓ é `::after` do `span.cx` irmão do radio, e o radio nativo continua por baixo.

**Ajuste que vale para qualquer direção (e para o form atual):** o teclado `inputmode="numeric"` do iOS **não tem "/"**. O protótipo tem uma máscara de 1 linha (só dígitos; a barra entra sozinha depois do 2º). Sem ela, quem digita "1203" no celular não consegue chegar em "12/03", e na C os dígitos sairiam das caixinhas. Sugiro ao TL incluir isso no CRM-16, independente da direção.

## Contraste medido (WCAG 2.x, `contraste-forms.py`)
Texto ≥4,5:1, UI (bordas, traços, foco) ≥3:1. Os estados desabilitados (opacidade .45) são isentos pela WCAG.

| Frente | Fundo | Uso | Direção | Razão | Mínimo | OK |
|---|---|---|---|---|---|---|
| tinta #2B2420 | folha #FBF6EE | valor digitado (Inter 16) | A | 14.19:1 | 4.5:1 | ✅ |
| tinta #2B2420 | branco #FFFFFF | valor digitado | B C | 15.26:1 | 4.5:1 | ✅ |
| tinta #2B2420 | marca50 #FBEDC4 | valor digitado com foco (faixa marca-texto-50) | A B C | 13.09:1 | 4.5:1 | ✅ |
| caneta #1F3A6B | folha #FBF6EE | rótulo Caveat 22/700 | A | 10.41:1 | 4.5:1 | ✅ |
| caneta #1F3A6B | branco #FFFFFF | rótulo Caveat 20/700 | B | 11.20:1 | 4.5:1 | ✅ |
| n700 #4F443A | branco #FFFFFF | rótulo versalete Inter 11/600 | C | 9.46:1 | 4.5:1 | ✅ |
| n700 #4F443A | marca50 #FBEDC4 | rótulo versalete na célula em foco | C | 8.11:1 | 4.5:1 | ✅ |
| n600 #6B5E50 | branco #FFFFFF | dica (dia/mês) / (opcional) | B C | 6.28:1 | 4.5:1 | ✅ |
| n600 #6B5E50 | folha #FBF6EE | dica (dia/mês) / (opcional) | A | 5.84:1 | 4.5:1 | ✅ |
| n600 #6B5E50 | n100 #F4ECDF | (opcional) no summary | C | 5.36:1 | 4.5:1 | ✅ |
| tinta #2B2420 | n100 #F4ECDF | summary / topo da ficha | C | 13.02:1 | 4.5:1 | ✅ |
| n500 #7A6B59 | folha #FBF6EE | placeholder | A | 4.79:1 | 4.5:1 | ✅ |
| n500 #7A6B59 | branco #FFFFFF | placeholder | B C | 5.15:1 | 4.5:1 | ✅ |
| n600 #6B5E50 | marca50 #FBEDC4 | placeholder com foco (escurece para n600) | A B C | 5.39:1 | 4.5:1 | ✅ |
| n500 #7A6B59 | folha #FBF6EE | traço do campo / linhas da nota / chip desligado tracejado (UI) | A | 4.79:1 | 3:1 | ✅ |
| n500 #7A6B59 | branco #FFFFFF | traço do campo / linhas da nota / chip desligado (UI) | B | 5.15:1 | 3:1 | ✅ |
| tinta #2B2420 | branco #FFFFFF | bordas das células, caixinhas ☐ e pente dd/mm (UI) | C | 15.26:1 | 3:1 | ✅ |
| foco #2F6185 | folha #FBF6EE | traço de foco 3px / anel (UI) | A | 6.16:1 | 3:1 | ✅ |
| foco #2F6185 | marca50 #FBEDC4 | traço de foco sobre a faixa (UI) | A B C | 5.68:1 | 3:1 | ✅ |
| foco #2F6185 | branco #FFFFFF | anel / contorno da célula em foco (UI) | B C | 6.63:1 | 3:1 | ✅ |
| erro #9B3B36 | folha #FBF6EE | mensagem de erro Inter 14 | A | 6.35:1 | 4.5:1 | ✅ |
| erro #9B3B36 | branco #FFFFFF | mensagem de erro Inter 14 | B C | 6.83:1 | 4.5:1 | ✅ |
| erro #9B3B36 | marca50 #FBEDC4 | traço/contorno de erro em foco (UI) | A B C | 5.86:1 | 3:1 | ✅ |
| erro #9B3B36 | branco #FFFFFF | traço/contorno de erro (UI) | B C | 6.83:1 | 3:1 | ✅ |
| caneta #1F3A6B | folha #FBF6EE | círculo à mão na opção (UI) | A | 10.41:1 | 3:1 | ✅ |
| caneta #1F3A6B | branco #FFFFFF | ✓ à mão nas caixinhas (UI) | C | 11.20:1 | 3:1 | ✅ |
| tinta #2B2420 | marca #F6D98A | opção grifada (texto 600) | B | 11.05:1 | 4.5:1 | ✅ |
| branco #FFFFFF | p600 #B04A32 | Salvar (carimbo Caveat 26/700 · pill Inter 16/600) | A B C | 5.42:1 | 4.5:1 | ✅ |
| tinta #2B2420 | marca #F6D98A | chip ligado Faculdade | A B | 11.05:1 | 4.5:1 | ✅ |
| tinta #2B2420 | p100 #F1D6CC | chip ligado Família | A B | 11.07:1 | 4.5:1 | ✅ |
| tinta #2B2420 | pauta #C9D6E3 | chip ligado Trabalho | A B | 10.33:1 | 4.5:1 | ✅ |
| tinta #2B2420 | abaverde #B9CBB0 | chip ligado Vizinhança | A B | 8.89:1 | 4.5:1 | ✅ |
| n700 #4F443A | folha #FBF6EE | link editar / Cancelar | A | 8.79:1 | 4.5:1 | ✅ |
| n700 #4F443A | branco #FFFFFF | link editar | B C | 9.46:1 | 4.5:1 | ✅ |
| pauta #C9D6E3 | branco #FFFFFF | pauta azul na ficha (decorativa) | B C | 1.48:1 | — | decorativa |
| margem #D9837A | branco #FFFFFF | linha vermelha da ficha (decorativa) | B | 2.81:1 | — | decorativa |

**Correção encontrada na autocrítica.** O placeholder `neutro-500` sobre a faixa de foco marca-texto-50 dava **4,42:1** (reprovava). Com foco, o placeholder agora escurece para `neutro-600`, o que dá 5,39:1. Nenhuma cor nova.

## Autocrítica (antes de entregar)
- *Parece caderno de verdade?* **A**: sim, é a única em que o form *é* a folha. **B**: parece um objeto de papelaria, mas ainda é um cartão sobre a página. **C**: parece papel impresso, mais repartição do que caderno pessoal.
- *O texto digitado fica legível?* Sim, nas 3: Inter 16–20 `tinta` (≥13:1), sem rotação e sem textura atrás.
- Corrigido durante a revisão: legenda do ritmo sobreposta às opções (B/C); "Como se conheceram" invadindo o valor na B (agora sobe para a linha de cima); cabeçalho da ficha da C quebrando no celular; borda externa da tabela da C coberta pelo fundo do summary (virou `outline`); última caixinha do pente sem borda direita; "3 meses" cortado na B no celular; placeholder no foco (contraste); teclado do iOS sem "/".
- Pendências conhecidas: na C, ☐ para escolha única continua sendo um falso sinal (dá para trocar por ◯ desenhado, se a C ganhar). Na A, o carimbo em Caveat precisa de uma exceção explícita na regra 6.

## Recomendação
**Direção A, "Escrever na pauta".** É a única que responde de fato à queixa: o formulário deixa de ser um cartão sobre a folha e vira escrita na própria pauta. Além disso, é a mais leve no celular, a que menos muda CSS no CRM-16 e passa em todos os contrastes. Da B e da C vale aproveitar, se quiser, o grifo marca-texto como alternativa ao círculo e as caixinhas dd/mm (só se a C for escolhida). A B fica como plano B, se o Vinicius sentir falta de um limite visual para o form.
