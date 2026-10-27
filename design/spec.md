# Spec de UI para o Tech Lead — "Caderno físico" (v2)

_Substitui a spec v1 (direção A). Referências: `tokens.css`, `tailwind.config.js` (plugin com os utilitários), `prototipo/index.html` (`?tela=inicio|amigos|perfil|cadastro|registrar|vazio|atalhos|config`), `direcoes/grupos-chips.html` (`?estado=normal|editando|form-editar|confirmar-apagar|erro-nome`), `direcoes/auth-capa.html` (`?modo=entrar|criar` & `?estado=normal|erro|carregando`), `direcoes/quadro.html`, `direcoes/cabecalho-folha.html` (3.12), prints em `prints/` (incl. `desktop-auth-*`, `mobile-auth-*`, `auth-capa-estados.png`, `desktop-quadro.png`, `mobile-quadro.png`, `cabecalho-folha.png`). Ref visual do carimbo escolar: `ref-folha-data.png`._

## 0. O que mudou em relação à v1 (resumo para o Tech Lead)
| Antes (v1) | Agora (v2) |
|---|---|
| Fundo creme, cartões brancos com borda | Mesa `#7A5A3E` sólida + página pautada (`.paper-lined`) com margem (`.margin-line`) e espiral (`.spiral-h` / `.spiral-v`), tudo em CSS |
| Sidebar (desktop) e tab bar com FAB (celular) | **Abas de divisória = `router-link`**: borda direita a partir de 1024px, penduradas embaixo no celular. O FAB sai; "+ novo" vira aba |
| Lista + detalhe a partir de 1024px | **Duas páginas só a partir de 1280px** (`screens.livro`). De 1024 a 1279px: uma página com abas à direita. Abaixo de 1280px, o perfil desliza por cima da página |
| Cartão com avatar e botão pill | Item de 3 linhas: nome (Fraunces) + metadados (Inter) · nota (Caveat, azul caneta) · carimbo "registrar" |
| Espaçamento 8/16/24 livre | **Ritmo vertical fixo: token único `--linha: 32px`**. Line-height e espaço vertical da página sempre em múltiplos de 32 (`mt-l1`, `h-l2`…) |
| Bottom sheet / painel lateral branco | Sheet (celular, até 1279px) ou painel sobre a página direita (livro aberto), em **papel com borda de tinta** e Inter. Componentes iguais aos da v1 |
| Sem decorativos | Post-it (só com aniversário) e polaroid (perfil) em canto fixo, com `aria-hidden`, e espaço reservado pelo cabeçalho |
| 2 fontes | 3 fontes: a Caveat entra **só** em notas, carimbos e rótulos de aba |

## 1. Estrutura e breakpoints
```
<body class="mesa">
  <div class="cena">                ← padding: 28/12/64 (celular), 48 (≥1024)
    <div class="livro">             ← relativo; ≥1280: flex, 1120px
      .spiral-h (topo, <1280)
      <section class="pagina pg-l margin-line"><div class="folha paper-lined"> listas/forms </div></section>
      .spiral-v (meio, ≥1280)
      <section class="pagina pg-r margin-line"> perfil </section>   ← <1280: absoluto por cima, translateX
      <nav class="abas"> router-link × 5 (+ "?" ≥1024): bom falar · quadro · amigos · + novo · config </nav>
      sheet/painel de registro
```
- A `.pagina` não rola; quem rola é a `.folha` (`overflow-y:auto`). A pauta usa `background-attachment: local` para rolar junto com o texto, e a margem (pseudo-elemento da `.pagina`) fica parada.
- Padding da folha: `32px 16px 64px 52px` no celular e `32px 40px 64px 80px` a partir de 1024. O topo e a base são sempre múltiplos de 32.
- Altura: a `.cena` usa `100dvh`, e a página ocupa o restante. A altura da página não precisa ser múltipla de 32, porque a pauta é infinita.
- Rotas: `/entrar` (capa, não autenticado; ver 3.8) · `/` · `/quadro` · `/amigos` · `/amigos/:id` · `/amigos/novo` · `/config` · `?registrar=1`. No livro aberto, `/amigos/:id` mostra a lista à esquerda e o perfil à direita; abaixo de 1280px, a mesma rota mostra só o perfil (página por cima, com "‹ Voltar").

## 2. Ritmo vertical (regra dura)
- Um token: `--linha` (CSS) / `L = 32` (Tailwind). A pauta, os line-heights (`fontSize` com `lineHeight: 32px` em todos os tamanhos) e o spacing `l1`–`l6` derivam dele.
- **Na folha:** proibido `py-2`, `mb-3`, `h-12` etc. em blocos de fluxo. Elementos menores que uma linha (carimbo de 28px, kbd, ícone) ficam *dentro* de uma linha de 32 (`vertical-align: middle`).
- **Formulário sobre papel:** o bloco inteiro ocupa linhas inteiras (rótulo 32 + campo 48 + 16 = `h-l3`). Dentro do papel vale o grid de 8px, porque não há pauta visível.
- Teste visual de QA: ligar `.paper-lined` e conferir que toda linha de texto da folha cai sobre uma linha da pauta, inclusive depois de rolar.

## 3. Componentes

Estados comuns: **foco** `box-shadow: var(--anel-foco)` (2px folha + 2px `#2F6185`); **desabilitado** opacidade .45 e sem hover; **carregando** spinner `loader-2` de 16px antes do texto, largura fixa e `aria-busy`.

### 3.1 Item "Bom falar com" (`li.card`, 3 linhas + 1 de respiro)
- L1: nome Fraunces 19/600 (link para o perfil; hover `primaria-700`) + `· tipo, tempo` em Inter 12 `neutro-600`, com truncamento na linha.
- L2: `.nota` com "→" e a última nota; grifo `.marca` opcional em uma palavra-chave. Limite de 1 linha no celular e 2 no livro (`line-clamp`); se cortar, a nota inteira fica no perfil.
- L3: `.carimbo` "✎ registrar" (Caveat 21/700, borda 2px primária, rotação −2°). Hover: fundo `primaria-50`, cor 700. Active: fundo `primaria-100`, `scale(.97)`. Foco: anel. Desabilitado: .45. Carregando: o ícone vira spinner. Alvo: 28px de altura dentro de 32, com 44px de largura mínima. Para o toque, estender a área com `::after` de `inset: -8px`.
- `mb-l1` entre itens.
- **Selecionado** (livro aberto, perfil exibido): faixa `marca-texto-50` via `::before` deslocada por `--pauta-offset`, para alinhar exatamente às linhas, mais `aria-current`.
- **Sem nota:** L2 em Inter 14 itálico `neutro-600`, "sem nota ainda. que tal perguntar como a pessoa está?".
- **Carregando:** 3 itens skeleton (barras `neutro-100` de 12px de altura centradas nas linhas L1 e L2), pulso de opacidade de 1,2s.
- **Erro:** em papel, `bg-erro-50` com borda `erro`, "Não conseguimos abrir seu caderno agora." + botão secundário "Tentar de novo".
- **Lista vazia com amigos:** `.nota` "Tudo em dia por aqui. Aproveite o dia."

### 3.2 Post-it de aniversário
`.postit.fita`, absoluto no canto superior direito do contêiner da tela (top = 1 linha + 4px, right 16, 96×64, rotação 3°). **Renderizar só se houver aniversário nos próximos 7 dias.** O cabeçalho da tela recebe `.reserva-canto` só nesse caso. Usa `aria-hidden`, e o mesmo conteúdo vai em `sr-only`. Abaixo de 1024px: 84px de largura e reserva de 96px. Vários aniversários: "niver da Marina e do Bruno".

### 3.3 Linha da lista de amigos
`h-l2` (2 linhas): nome Fraunces 19 com truncamento / "último contato: …" Inter 14 `neutro-600` com truncamento, mais chevron. Hover `marca-texto-50/60`; selecionado como no 3.1. Busca: `.campo` com ícone, bloco `h-l2`. Busca vazia: `.nota` "ninguém com "xyz" por aqui." + carimbo "adicionar xyz".

### 3.4 Perfil
- Cabeçalho com `.reserva-canto` + `.polaroid.fita` (96px; 76px abaixo de 1024): nome Fraunces 28/30, "da faculdade · a cada 3 semanas" Inter 14, "🎂(cake) 12/mar · curte <marca>escalada</marca>…" Inter 14 e carimbo "registrar contato" (+ `kbd R` no desktop). São 4 linhas; a polaroid cabe nelas e **termina antes de "Histórico"** (`mt-l1`).
- Histórico: `li` flex, com data em Inter 14/600 `primaria-700` (72px fixos, com ícone do tipo) + `.nota` (pode ter várias linhas, sempre de 32). Sem nota: Inter 14 itálico.
- "Lembrar": `.nota` livre, editável inline.
- Campos vazios aparecem como convite em Inter ("+ adicionar aniversário"), nunca como "—".

### 3.5 Cadastro rápido (papel + Inter)
- Na folha: "✕ Cancelar" (L1), título (L2), subtítulo (L3…), `mt-l1` e o form `.papel` (fundo papel, borda 2px tinta, raio 10).
- `.campo`: 48px, fundo folha, borda 1,5px tinta, placeholder `neutro-500`. Foco: anel. Erro: `aria-invalid="true"`, borda `erro` e mensagem Inter 14 `erro` ligada por `aria-describedby`. Desabilitado: .45.
- Ritmo: radiogroup de chips (h-10, pill, borda tinta; selecionado `primaria-100` + borda primária + `primaria-800`) em linha única com **rolagem horizontal** no celular. O próximo chip aparece cortado de propósito, para indicar que dá para rolar. Padrão: 1 mês.
- "Mais detalhes (opcional)": `details` com blocos `h-l3`.
- **Grupos (dentro de "Mais detalhes", opcional, seleção múltipla):** rótulo "Grupos" e, ao lado, o link "editar" (Inter 14, `neutro-700`; em modo editar vira "pronto"). Chips toggle (`button` com `aria-pressed`, h-10, pill) quebram linha e mostram os grupos do usuário em ordem alfabética, mais o chip "+ novo grupo". Chip desligado: fundo folha, borda 1,5px tinta, texto `tinta` e o ícone do token de cor do grupo. Chip ligado: fundo da cor do grupo, borda 2px tinta e ícone `check` no lugar do ícone (o estado nunca depende só da cor). "+ novo grupo" abre, no mesmo bloco, um `.campo` de nome e as 5 cores em radiogroup (**swatch + label de cor escrito** — ver tabela abaixo; token interno ≠ label). O grupo criado ali já vem marcado para esse amigo. Nenhum grupo existente vem marcado no cadastro novo, e o cadastro rápido continua só com o nome: quem não abre "Mais detalhes" salva o amigo sem grupo, como antes. Detalhes do model em 7.7. Protótipo dos estados: `direcoes/grupos-chips.html`; print: `prints/grupos-chips-estados.png`.

  **Labels de cor na UI (27/10/2026):** o token interno (API/banco) **não** é o texto exibido. SPA e admin mostram **nome de cor + swatch** (sempre os dois; nunca só a cor). Ícones por token (§7.3) permanecem.

  | token PT (spec / API) | enum EN | label UI | fundo (token já existente) |
  |---|---|---|---|
  | `familia` | `family` | **Pêssego** | `primaria-100` `#F1D6CC` |
  | `faculdade` | `college` | **Amarelo** | `marca-texto` `#F6D98A` |
  | `trabalho` | `work` | **Azul** | `pauta` `#C9D6E3` |
  | `vizinhanca` | `neighborhood` | **Verde** | `aba-verde` `#B9CBB0` |
  | `neutro` | `neutral` | **Creme** | `papel` `#E8DCC8` |

  - **Modo editar (MVP, decisão 21/10 e 26/10/2026):** não há tela de gerenciar grupos. Editar e apagar vivem nos chips do cadastro (e do perfil, quando o mesmo bloco de grupos existir). Ao tocar "editar": os chips ganham ícone `pencil` (16px) à direita do nome e **param de ligar/desligar** (`aria-pressed` fica só leitura visual; o toque abre o formulário). O link vira "pronto" e sai do modo editar (fecha formulário/confirmação se estiverem abertos).
  - **Formulário de editar grupo:** toque no chip (em modo editar) abre, no mesmo bloco, o mesmo formulário do "+ novo grupo" já preenchido (nome + 5 cores radiogroup com labels Pêssego/Amarelo/Azul/Verde/Creme), com botões "salvar" (primário) e "apagar grupo" (texto/erro, não primário). Salvar chama `PATCH` (7.7). Nome repetido (case-insensitive, entre os grupos do mesmo `owner`, excluindo o próprio): `aria-invalid` no campo e mensagem "Você já tem um grupo com esse nome."
  - **Apagar grupo:** "apagar grupo" troca o formulário por confirmação inline. Com `total_amigos` > 0: "Apagar '{nome}'? {N} amigos saem desse grupo, mas continuam no seu caderno." Com 0: "Apagar '{nome}'? Nenhum amigo está nesse grupo." Botões: "apagar grupo" (vermelho/`erro`, confirma) e "cancelar" (secundário; volta ao formulário ou fecha). Confirmar chama `DELETE` (7.7) → 204: só desfaz a relação N:N; **nunca apaga amigo**. Critérios de aceite: editar nome/cor atualiza todos os post-its daquele grupo; quem fica sem nenhum grupo vira post-it neutro com a etiqueta "sem grupo".
  - **Estados do bloco (ver `prints/grupos-chips-estados.png`):** **normal** (chips toggle + "editar") · **editando** (chips com `pencil`, link "pronto") · **form editar** (form preenchido + salvar/apagar) · **confirmar apagar** (texto + apagar/cancelar) · **erro de nome** (campo inválido + mensagem).
- Primário "Salvar amigo" (pill 48, `primaria` → hover 700 → active 800). Enter no nome salva. No desktop, N abre com foco no nome.

### 3.6 Registrar contato
- **Celular e até 1279px:** bottom sheet `.papel` (sem borda inferior, raio 16 no topo, máx. 560px), véu `tinta/45`, alça 40×4 `neutro-500`. Entrada 280ms `ease-saida`, saída 200ms.
- **Livro aberto (≥1280):** painel `.papel` posicionado sobre a página direita (inset 24px), véu só sobre essa página. Entra com opacidade + `translateX(24px→0)`. A lista da esquerda continua visível.
- Conteúdo em Inter: título "Falei com {nome}" 22/600 · fechar (44×44) · 3 opções (h-20, borda 1,5px tinta, fundo folha; selecionada com borda 2px primária, `primaria-50` e `primaria-800`) · "Nota rápida (opcional)" textarea `.campo` · dica "Ctrl + Enter registra · Esc fecha" (≥1024) · primário "Registrar".
- Foco automático na nota só a partir de 1024px. Foco preso, devolvido ao carimbo ao fechar. Esc, véu ou arrastar fecham; se houver nota digitada, perguntar "Descartar nota?".
- Erro: faixa `bg-erro-50` dentro do papel, "Não deu pra salvar. Sua nota continua aqui." Sucesso: o sheet fecha, toast "Contato registrado. Boa conversa!" com "Desfazer" e o item sai da lista (fade 240ms + colapso de altura **em múltiplos de 32**, ou seja, colapsa as 4 linhas).

### 3.7 Abas (`nav.abas` > `router-link.aba`)
- Rótulos Caveat 20/700, nesta ordem: "bom falar" (`primaria-100`, `/`) · "quadro" (`papel`, `/quadro`) · "amigos" (`marca-texto`, `/amigos`) · "+ novo" (`aba-verde`, `/amigos/novo`) · **"config"** (`margem` `#D9837A`, `/config`, decisão 26/10/2026) · "?" (`pauta`, só ≥1024, abre os atalhos). "config" fica **depois de "+ novo" e antes do "?"**.
- ≥1024: verticais (`writing-mode: vertical-rl`), 42×104 ("?": 56), raio `0 8px 8px 0`, saindo 42px da borda direita a partir de top 64. Celular: horizontais, **altura 44px** (alvo mínimo; ativa 48), raio `0 0 8px 8px`, fixas embaixo. Com 5 abas no celular ("bom falar", "quadro", "amigos", "+ novo", "config"): padding horizontal de 8px, `gap` de 4px e `left` de 12px, para caber em 390px (mesmo ajuste de densidade que o Quadro usou ao passar de 3 para 4).
- **Ativa** (`.router-link-exact-active` / `aria-current="page"`): fundo `primaria`, texto branco, 6px mais "para fora". Hover: `filter: brightness(.97)`. Foco: anel. No perfil, a ativa é a aba da lista de origem.

### 3.7.1 Configurações (`/config`, MVP mínimo — 26/10/2026)
Página simples na folha, sem tema nem notificações: título Fraunces "Configurações", o **e-mail da conta logada** em Inter 16 `neutro-700`, e o carimbo/botão **"Sair"** (logout; Caveat como os outros carimbos, ou botão secundário de 44px com texto "Sair" — o carimbo basta). Sem outros campos no MVP. Escopo: só identificar a conta e sair.

### 3.8 Auth — capa (`/entrar`, decisão 26/10/2026)
_Conta própria no MVP (produto.md, 26/10): self-signup na **capa do caderno**. UI de login/cadastro = caderno **fechado** (capa frontal), não a folha aberta das telas autenticadas. Ideia do Vinicius. Protótipo: `direcoes/auth-capa.html`. Prints: `prints/desktop-auth-entrar.png`, `prints/desktop-auth-criar.png`, `prints/mobile-auth-entrar.png`, `prints/mobile-auth-criar.png`, `prints/auth-capa-estados.png`._

**Conceito capa vs folha**
- **Não autenticado:** mesa + um **caderno fechado** (objeto físico, uma peça). Capa de cartolina na frente; **bloco de folhas** visível na borda direita (espessura); espiral metálica à esquerda passando por furos. **Sem** duas páginas abertas, **sem** dobra central, **sem** abas de divisória, **sem** pauta na capa.
- **Autenticado:** folha aberta (`.paper-lined` + margem + abas) como no resto do app. Sucesso de Entrar ou Criar conta navega para **`/quadro`** (não para uma home genérica; sem onboarding no MVP).

**Mesma tela, dois modos** (toggle por links/abas em Caveat, ou query `?modo=entrar|criar`):
| Modo | Campos | Primário | Link de troca |
|---|---|---|---|
| Entrar (`modo=entrar`, padrão) | e-mail, senha | "Entrar" | "Criar conta" |
| Criar conta (`modo=criar`) | e-mail, senha, repetir senha | "Criar conta" | "Já tenho conta" |

- Conta = e-mail. **Sem** nome de pessoa, **sem** OAuth, **sem** confirmar e-mail e **sem** recuperar senha no MVP (ficam pra depois).
- Rota: `/entrar`. Query opcional `?modo=entrar|criar` (default `entrar`). O protótipo também aceita `?estado=normal|erro|carregando` para QA (combinável com `modo`).

**Visual — caderno fechado de verdade (só CSS, sem textura bitmap, sem cor nova)**
_Feedback Vinicius 26/10: (1) 1ª versão = "cartão com espiral"; (2) cor peach/`primaria-100` feia; (3) etiqueta **não** pode ficar para fora da capa — foi erro._
- Fundo = mesa `#7A5A3E`. A capa **não** usa a cor da mesa.
- **Silhueta:** uma peça só, proporção de caderno universitário BR. **Altura da capa FIXA** — igual em Entrar e Criar conta e em todos os estados (`normal` / `erro` / `carregando`). Trocar de modo **não** redimensiona o caderno. O 3º campo e as mensagens de erro cabem dentro dessa altura (spacing compacto; scroll interno na etiqueta só se inevitável). Sombra forte sob o objeto.
- **Capa = cartolina kraft** `neutro-400` (`#B3A38C`), com gradiente leve `neutro-300` → `neutro-400` (caderno escolar/universitário BR). **Não** é folha pautada; **não** é peach/`primaria-100`. Borda escura fina; vinco leve perto da espiral. (Terracota `primaria-600` foi descartada: contraste baixo com a mesa.)
- **AA do título:** tinta `#2B2420` sobre kraft `#B3A38C` ≈ **6,2:1** (AA). Subtítulo Caveat `caneta` `#1F3A6B` sobre kraft ≈ **4,55:1** (AA).
- **Bloco de folhas (direita):** faixa estreita oposta à espiral (`folha` / `papel` / `neutro-300`) — espessura do caderno fechado.
- **Espiral (esquerda):** anéis metálicos que **passam por furos** na capa. CSS puro.
- **Título na capa** (Fraunces): "Caderno de amigos". Subtítulo Caveat `caneta`: "seu ritmo com as pessoas que importam".
- **Formulário = etiqueta `.papel` colada NA capa:** 100% **dentro** do retângulo da capa (padding interno generoso; `overflow:hidden` na capa). Sem rotação que cause overflow (rotação zerada na v3). Fita washi CSS (`.fita`, `marca-texto`) no topo, também dentro. Toggle Entrar | Criar conta (Caveat), campos Inter, botão primário pill terracota. **Nunca** a etiqueta invade a mesa nem ultrapassa a borda inferior/direita.
- Mobile: capa quase full-width com margem na mesa. Desktop: ~380×560 (largura×altura fixas). Mobile: altura fixa ~500–520.
- Contraste AA em todos os textos/botões (tokens já checados em `identidade.md`).

**Estados**
- **Normal:** campos vazios ou preenchíveis; primário habilitado quando o HTML `required` estiver satisfeito (validação de vazio fica no browser/`required`).
- **Erro inline** (mensagem Inter 14 `erro` + `aria-invalid` / `aria-describedby` no campo afetado):
  - Entrar: **"E-mail ou senha incorretos."** (credenciais inválidas — mensagem genérica, sem dizer qual campo).
  - Criar: **"Este e-mail já tem conta."** · **"As senhas não são iguais."** · **"A senha precisa ter pelo menos 8 caracteres."** (senha curta = menos de 8).
- **Carregando:** botão primário `disabled` + texto "Entrando…" / "Criando…", `aria-busy="true"` (spinner opcional `loader-2` 16px, largura fixa do botão).
- **Foco:** anel AA `var(--anel-foco)` em campos e botões/links.

**A11y**
- Um `<h1>` com o título do produto (ou "Entrar" / "Criar conta" se o título da capa for decorativo — preferir um `h1` visível no form).
- Toggle com `aria-current` no modo ativo (ou `role="tablist"` / `aria-selected` se usar abas).
- Erros ligados por `aria-describedby`; formulário com `novalidate` só se a validação custom substituir a nativa — no MVP, `required` + type=email bastam para vazio/formato.
- Alvos ≥ 44px no botão e nos links de troca.

**Microcopy (pt-BR)** — ver também §6: Entrar · Criar conta · Já tenho conta · E-mail · Senha · Repetir senha · Entrando… · Criando… · E-mail ou senha incorretos. · Este e-mail já tem conta. · As senhas não são iguais. · A senha precisa ter pelo menos 8 caracteres. · Caderno de amigos · seu ritmo com as pessoas que importam.

### 3.9 Estado vazio
Na folha: `.cabecalho-folha` (3.12), título e, depois de `mt-l2`, duas `.nota` ("Seu caderno está em branco." / "Comece por alguém de quem você sente falta."), Inter "Só o nome já basta." e o carimbo "adicionar primeiro amigo". No livro aberto, a página direita mostra a `.nota` "Esta página é de cada amigo.". Não há ilustração (a página em branco já é a ilustração).

### 3.10 Atalhos (modal)
`.papel` max-w 384, Inter, lista de pares com `kbd` (borda tinta). Abre com "?" (aba ou tecla); fecha com Esc ou clique fora.
| Tecla | Ação |
|---|---|
| N | Novo amigo |
| R | Registrar contato com a pessoa aberta |
| J / K | Próxima / anterior (a documentar no MVP; ausente no protótipo) |
| / | Buscar |
| 1 / 2 / 3 | Bom falar com / Quadro / Amigos |
| Ctrl/⌘ + Enter | Salvar formulário ou registro |
| Esc | Fechar |
| ? | Atalhos |
Ignorar atalhos de letra com foco em input ou textarea.

### 3.11 Toast
Pill `tinta` com texto branco, 48px, `check` `#B9CDB1`, `role="status"`, 2,4s, "Desfazer" quando couber. Fica fora da folha, sobre a mesa.

### 3.12 Cabeçalho de folha (`.cabecalho-folha`)
_Decisão de grupo (MVP, 27/10/2026): carimbo escolar de dia + data em **todas** as folhas autenticadas. Não reabrir. Protótipo: `direcoes/quadro.html`, `direcoes/grupos-chips.html`, `direcoes/cabecalho-folha.html`. Prints: `prints/desktop-quadro.png`, `prints/mobile-quadro.png`, `prints/cabecalho-folha.png`. Ref: `ref-folha-data.png`._

**Onde entra**
- Em **todas** as folhas autenticadas: `/` (bom falar), `/quadro`, `/amigos`, `/amigos/:id`, `/amigos/novo`, `/config` (e qualquer outra folha aberta autenticada).
- **Fora:** `/entrar` (capa fechada — não autenticado). O protótipo `direcoes/auth-capa.html` **não** recebe este bloco.

**O que é**
Um carimbo de caderno escolar BR no topo da `.folha`, **acima** do conteúdo (título, lista, form). **Não** substitui a pauta (`.paper-lined` continua no corpo).

| Lado | Conteúdo |
|---|---|
| Esquerda | 7 caixas com letras **D S T Q Q S S** (Domingo → Sábado) |
| Direita | Data **só leitura** `DD/MM/AAAA` = hoje em `America/Sao_Paulo` (cliente, 100% front; `Intl` / `Date` no fuso SP). Visual de carimbo / `__/__/__` preenchido — **nunca** `<input>` |

**Comportamento (fechado)**
- Sem editar a data. Sem filtrar por data. Sem navegar ao clicar (o bloco é informativo; `pointer-events: none` ou sem handlers).
- Dia da semana **em destaque** = hoje (caixa preenchida).
- Atualiza só porque o calendário do cliente mudou (meia-noite SP); sem backend.

**Destaque do dia atual**
- Uma das 7 caixas marcada: fundo `tinta` `#2B2420` + letra branca + borda 2px `tinta` (peso reforçado). Contraste AA (~15:1). **Não depender só de cor:** o preenchimento + peso da borda + `font-weight: 700` bastam sem cor (formas distintas da caixa vazia).
- As demais: fundo transparente, borda 1,5px `tinta`, letra `tinta`, Inter 600.
- Ordem fixa: Domingo→Sábado = **D S T Q Q S S** (índice 0 = domingo; terça = 2 → `T`).
- A11y: `aria-current="date"` na caixa de hoje; o grupo tem `aria-label` (ex. "Data de hoje"); `<time datetime="YYYY-MM-DD">` na data.

**Layout e ritmo**
- Altura: **1 linha de pauta** (`--linha` / 32px). No máximo 2 linhas se precisar de respiro (evitar). Padding horizontal alinhado ao da `.folha` existente (não inventar margem nova).
- Flex `space-between`; caixas ~22×22 dentro da linha; `gap` 4px entre caixas.
- A data fica alinhada à direita, sentada na mesma linha.

**Tipografia (motivada)**
- **Caixas D…S: Inter 600/700 ~11–12px.** Igual à ref impressa de caderno escolar BR (letras tipográficas limpas nas caixinhas), não manuscritas.
- **Data: Caveat 700 ~21px** (mesmo papel tipográfico dos `.carimbo` do app). É um carimbo preenchido, não um campo. Cor `tinta`. Sublinhado tracejado leve (`neutro-400`) sob a data lembra o `__/__/__` da ref.

**Implementação (front)**
```js
// fuso America/Sao_Paulo, só cliente
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year:'numeric', month:'2-digit', day:'2-digit' });
const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' }).format(new Date());
// map Sun→0 … Sat→6 → letras [D,S,T,Q,Q,S,S]
```
No protótipo HTML a terça (`T`) e `27/10/2026` podem estar hardcoded; o comentário no HTML documenta que em produção vêm de `Intl`/`Date` em SP.

**Não fazer**
- Input, datepicker, filtro, deep-link por data, backend de “hoje”.
- Aparecer na capa `/entrar`.
- Tokens, fontes ou cores novas.

## 4. Motion
| Elemento | Duração | Curva |
|---|---|---|
| Hover de carimbo, botão e aba | 120ms | `ease-saida` |
| Perfil deslizando por cima (<1280) | 280ms entra / 200ms sai | `ease-saida` / `ease-entrada`, `translateX(100%+24px → 0)` |
| Sheet (celular) | 280 / 200ms | `translateY(105% → 0)` |
| Painel (livro aberto) | 280ms | opacidade + `translateX(24px→0)` |
| Troca de perfil no livro aberto | 160ms | fade (como virar a página, sem 3D) |
| Item saindo após registro | 240ms | fade + altura → 0 (em linhas) |
| Chevron do details | 200ms | rotação 180° |
`prefers-reduced-motion`: durações zeradas (já está em `tokens.css`).

## 5. Acessibilidade
- Contraste AA em todos os pares (ver `identidade.md`; Caveat sempre ≥ 20px).
- Decorativos (`postit`, `polaroid`, espiral, margem, pauta) com `aria-hidden` / pseudo-elementos, sem conteúdo exclusivo.
- Abas em `<nav aria-label="Seções">` com `aria-current`. Sheet, painel e modal com `role="dialog" aria-modal`.
- Alvos: carimbo com área de toque estendida (≥ 44); abas de **44px** de altura no celular; demais ≥ 44.

## 6. Textos (pt-BR)
bom falar · quadro · amigos · + novo · config · Configurações · Sair · Entrar · Criar conta · Já tenho conta · E-mail · Senha · Repetir senha · Entrando… · Criando… · E-mail ou senha incorretos. · Este e-mail já tem conta. · As senhas não são iguais. · A senha precisa ter pelo menos 8 caracteres. · Caderno de amigos · seu ritmo com as pessoas que importam · Grupos · editar · pronto · + novo grupo · salvar · apagar grupo · cancelar · Você já tem um grupo com esse nome. · Apagar '{nome}'? {N} amigos saem desse grupo, mas continuam no seu caderno. · Apagar '{nome}'? Nenhum amigo está nesse grupo. · registrar · registrar contato · Falei com {nome} · Mensagem / Ligação / Encontro · Nota rápida (opcional) · Registrar · Novo amigo · Só o nome já basta. O resto pode vir depois. · Falar a cada · Mais detalhes (opcional) · Salvar amigo · Os outros estão em dia. · Seu caderno está em branco.
**Proibido:** atrasado, pendente, vencido, "há N dias sem falar".


## Zoom e fonte do navegador
`--linha` vale `2rem` (e não 32px) e o gradiente da pauta usa a mesma variável. Os tamanhos de texto estão em rem. Assim, quando a pessoa aumenta a fonte do navegador, a pauta cresce junto e o texto continua sentado na linha. Teste da issue 10: com a fonte em 200%, nenhuma linha de texto pode cruzar a pauta.

## 7. Visão Quadro (aprovada para o MVP)
_Status: **aprovada para o MVP** (Vinicius, 16/10/2026: "entra completo no MVP, com arrastar e grupos"); **simplificada em 20/10/2026: janela fixa de 7 dias e sem arrastar**; **grupos N:N em 20/10/2026** (um amigo pode estar em 0, 1 ou vários grupos); **editar/apagar grupos no MVP em 21/10 e 26/10/2026** (modo editar nos chips do cadastro, sem tela de gerenciar); **aba config no MVP em 26/10/2026** (e-mail + Sair); **conta própria / capa auth no MVP em 26/10/2026** (`/entrar`, ver 3.8); **cabeçalho de folha (dia + data carimbo) no MVP em 27/10/2026** (3.12; em todas as folhas autenticadas, não na capa). Protótipo: `direcoes/quadro.html` (`?estado=normal|vazio|coluna-vazia|carregando|erro|registrando`); chips: `direcoes/grupos-chips.html`; cabeçalho: `direcoes/cabecalho-folha.html`. Prints: `prints/desktop-quadro.png`, `prints/mobile-quadro.png`, `prints/quadro-estados.png`, `prints/grupos-chips-estados.png`, `prints/cabecalho-folha.png`. Contraste: resultado na seção 7.10 (script `contraste-quadro.py`, na cópia local do projeto). A direção "Caderno físico" não muda: nenhuma cor, fonte ou utilitário novo — o cabeçalho só reusa Inter, Caveat e `tinta`._

### 7.1 O que é
Uma aba nova, **"quadro"** (`router-link` para `/quadro`, fundo `papel`, entre "bom falar" e "amigos"), que mostra **todos** os amigos como post-its em 4 colunas sobre a própria folha pautada. Sem cortiça: cortiça pediria textura ou uma cor fora da paleta, e as duas coisas são proibidas pela identidade.

### 7.2 Colunas (calculadas, nunca salvas)
Para cada amigo: `d` = dias desde o último contato (datas no fuso do usuário), `f` = frequência em dias, `falta = f − d`. A ordem de avaliação importa:

| # | Coluna | Regra | Descrição (Inter 12) | Ordem dentro da coluna |
|---|---|---|---|---|
| 1 | **Falei agora** | `d ≤ 1` (hoje ou ontem) | falou hoje ou ontem | mais recente primeiro |
| 2 | **Faz um tempinho** | `falta ≤ 0`, ou nunca teve contato | o ritmo de cada um já chegou | `d/f` decrescente |
| 3 | **Essa semana** | `0 < falta ≤ 7` (janela fixa de 7 dias) | o ritmo chega nos próximos dias | `falta` crescente |
| 4 | **Em dia** | o resto | conversa recente, tudo certo | `falta` crescente |

- No quadro, da esquerda para a direita: Faz um tempinho → Essa semana → Em dia → Falei agora.
- "Faz um tempinho" tem **exatamente** as mesmas pessoas da lista "Bom falar com" (3.1). As duas telas precisam usar a mesma função. Troquei "Faz tempo" por "Faz um tempinho" para manter o tom sem culpa (6. Textos).
- "Essa semana" usa uma janela **fixa** de 7 dias, igual para todos os amigos (decisão de 20/10/2026, para deixar a regra simples). Efeito aceito: amigos com ritmo de até 7 dias vão de "Falei agora" direto para "Essa semana" e quase nunca aparecem em "Em dia". Pela conta, com ritmo de até 9 dias a pessoa já entra em "Essa semana" no dia 2 (exemplo: f=7 e d=2 dão falta = 5).
- Nada de contagem de dias. O post-it mostra só "3 semanas", como a lista atual.

### 7.3 Componentes
**`QuadroView`** (`/quadro`): `.cabecalho-folha` (3.12) no topo da `.folha` + título "Quadro" e uma explicação de 2–3 linhas + legenda de grupos + 4 `QuadroColuna`. A data longa em Inter ("sábado, 17 de outubro") **sai**; o carimbo D…S + `DD/MM/AAAA` a substitui. A **legenda lista os grupos do usuário** (`GET /grupos/`), em ordem alfabética, cada um como etiqueta com nome, ícone e cor; "sem grupo" entra no fim se algum amigo não tiver grupo. Na legenda, a etiqueta tem 24px de altura e ocupa uma linha da pauta (margem de 4px acima e abaixo). Abaixo de 1024px, a legenda vem sem a frase de introdução.

**`QuadroColuna`**: `section` com `aria-labelledby`, título Fraunces 19/600 (1 linha) + descrição Inter 12 `neutro-600` (1 linha) + `ul` de post-its. O cabeçalho ocupa 2 linhas.

**`PostitAmigo`** (`li`), papel com grid de 8px por dentro e as bordas na pauta:
- Altura de **6 linhas (192px)** em todas as larguras (antes eram 5 a partir de 1024px; a linha a mais é para as etiquetas de grupo), com `row-gap` de 1 linha.
- Conteúdo: nome em Fraunces 19/600 com truncamento (link para `/amigos/:id`; com `cake` se o aniversário for nos próximos 7 dias, mais `sr-only`) · **etiquetas de grupo** (ver abaixo) · tempo em Inter 12/500 `neutro-700`, numa linha própria · nota em Caveat 21/24 `caneta`, até 2 linhas (`line-clamp`); quando as etiquetas ocupam 2 linhas, a nota cai para 1 linha, para o post-it manter a altura fixa. Sem nota: Inter 12 itálico, "sem nota ainda" · botão **"falei agora"**.
- Botão: `button` de **44px** de altura com o `.carimbo` de 28px dentro, em **`primaria-800`** (texto e borda), porque a `primaria` base não passa AA sobre as cores de post-it. Ícone `pen-line` só a partir de 1024px. O botão aparece em **todos** os post-its e em todas as larguras, inclusive em "Falei agora", onde serve para registrar mais um contato no mesmo dia.
- **Hover e foco do botão (pedido adicional de 27/10/2026):** preenchimento em traços irregulares, como canetinha, usando a terracota `primaria` com 38% de opacidade atrás do texto; durante hover e foco, o texto mantém a cor original `primaria-800`, conforme escolha do responsável. O preenchimento aparece da esquerda para a direita; com movimento reduzido, aparece sem animação. Substitui o fundo liso do hover do protótipo.
- Giro só em CSS: `--r` alternando −1,5° / 1° / 2° / −1° por `nth-child(4n+…)`. Hover e foco: 0°. Com `prefers-reduced-motion`, sem transição.

**Cor = primeiro grupo, mas nunca sozinha.** Um amigo pode estar em 0, 1 ou vários grupos (7.7), e a API devolve os grupos de cada amigo em ordem alfabética pelo nome.
- **Cor do post-it:** a cor do **primeiro** grupo da lista (ordem alfabética). Sem grupo: post-it `neutro` (`papel`) com a etiqueta "sem grupo".
- **Etiquetas:** o post-it mostra **todos** os grupos como etiquetas pequenas: ícone + nome, 18px de altura, Inter 12/500 `neutro-700`, raio 4, padding 0 6px, fundo da cor do grupo e contorno interno de 1px `tinta` a 32% (para a etiqueta continuar visível quando tem a mesma cor do post-it). O nome está sempre escrito, então a cor nunca informa nada sozinha. Um nome longo trunca dentro da etiqueta, com reticências.
- **Quebra e "+N":** as etiquetas quebram linha (`flex-wrap`, `gap` de 4px) e ocupam no máximo 2 linhas (40px). Se não couberem, mostram as que cabem e, no fim, uma etiqueta "+N" (fundo folha, Inter 12/600) com `role="img"`, `aria-label="e mais N grupos: {nomes}"` e `title` com os mesmos nomes. Antes das etiquetas, um `sr-only` "Grupos:". A conta é feita no front, medindo a altura da caixa (no Vue, com `ResizeObserver`), porque depende da largura da coluna e da fonte.
- **Ícone por token de cor** (e não mais por grupo fixo): `familia` → `house`, `faculdade` → `graduation-cap`, `trabalho` → `briefcase`, `vizinhanca` → `map-pin`, `neutro` → `circle-dashed`. Escolhi o ícone por token, e não um `tag` genérico, porque ele repete a informação da cor numa forma que não depende de enxergar cor, e os ícones já existiam no desenho. Como os grupos têm nome livre, o ícone fala do **token** de cor, não do nome do grupo nem do label UI: um grupo "Escalada" com cor `vizinhanca` (label **Verde**) aparece com `map-pin`. No radiogroup/admin o texto é Pêssego/Amarelo/Azul/Verde/Creme (3.5), não Família/Faculdade/…
- **Cores (todas já existem nos tokens, nenhuma nova):** `familia` → label UI **Pêssego** (`primaria-100`) · `faculdade` → **Amarelo** (`marca-texto`) · `trabalho` → **Azul** (`pauta`) · `vizinhanca` → **Verde** (`aba-verde`) · `neutro` → **Creme** (`papel`). Token interno ≠ label (tabela em 3.5). Os grupos são ilimitados, mas há só 5 cores, e vários grupos podem usar a mesma cor. A regra antiga ("máximo de 5 grupos; acima disso, o resto vai para 'sem grupo'") saiu.

### 7.4 Layout por largura
- **≥1280 (livro aberto):** um único scroller ocupa as duas páginas. Grid `1fr 1fr 112px 1fr 1fr` (a coluna de 112px é a espiral e a margem da página direita): "Faz um tempinho" e "Essa semana" ficam à esquerda; "Em dia" e "Falei agora", à direita. A dobra central (`inset` / gradiente) e as duas margens são decorativas e não rolam.
- **1024–1279:** uma página, 4 colunas iguais e abas à direita.
- **<1024 (celular): lista agrupada**, sem colunas com rolagem horizontal. Cada coluna vira uma seção vertical com post-its em grade de 2. "Faz um tempinho" e "Essa semana" vêm abertas. "Em dia" e "Falei agora" começam recolhidas, com um resumo ("Bruno Lima, Vó Teresa e mais 1 · mostrar", botão de 2 linhas = 64px, `aria-expanded`).
  - **Por quê:** (1) rolagem horizontal com encaixe esconde 3 de 4 colunas e ninguém descobre "Em dia"; (2) gesto horizontal compete com o "voltar" do sistema; (3) a folha do caderno já rola na vertical em todas as telas; (4) o que importa no celular é "com quem falar", e as duas primeiras seções respondem isso de cara.
- Abas no celular com **5 itens** ("bom falar", "quadro", "amigos", "+ novo", "config"): padding horizontal de 8px, `gap` de 4px e `left` de 12px, para caber em 390px. Altura **44px** no celular (ativa 48), para seguir a regra de alvo mínimo. Ver 3.7.
- O post-it de aniversário decorativo (3.2) **não** aparece no quadro, para não ser confundido com um amigo. O aniversário vira o ícone `cake` no post-it da pessoa.

### 7.5 Interações
1. **Sem arrastar e soltar, em nenhuma largura.** A única ação do quadro é o botão **"falei agora"** (44px) de cada post-it, que abre o mesmo componente "Registrar contato" (3.6), com o tipo e a nota.
   - **Por que não dá pra mover um post-it de coluna:** as colunas não são um campo salvo, são o resultado de uma conta (último contato + ritmo). Mover alguém para trás seria apagar um contato que aconteceu, e reordenar dentro da coluna não teria onde ser salvo. O único fato novo que a pessoa pode informar é "falei com ela agora", e é isso que o botão faz.
2. **Ao tocar ou clicar no botão:** o post-it ganha contorno tracejado (`.registrando`) na coluna onde está, e o sheet 3.6 abre (painel sobre a página direita no livro aberto).
   - Registrar → POST → toast "Contato registrado. Boa conversa!" + "Desfazer" (3.11). As colunas são recalculadas, e o post-it passa para "Falei agora".
   - Fechar, Esc ou véu → nada muda: o post-it perde o contorno e nenhum contato é criado.
   - Erro → faixa `erro-50` no painel (3.6). O post-it continua com o contorno até a pessoa fechar ou registrar.
3. **Teclado e leitor de tela:** o botão é um `button` comum, com `aria-label="Falei agora com {nome}"`, e funciona igual em todas as larguras. Depois de registrar, anúncio em `aria-live="polite"`: "Contato registrado." O foco volta para o post-it, agora em "Falei agora".
4. Clicar no nome abre o perfil (`/amigos/:id`). O post-it em si não é link: o link fica só no nome, para não competir com o botão "falei agora" no mesmo cartão.
5. **Implementação em Vue:** as colunas são `computed` a partir de `ultimo_contato` e `frequencia_dias`. Depois do POST, basta atualizar o amigo no estado e o Vue redesenha o quadro. Nenhum elemento é movido à mão no DOM.

### 7.6 Estados (ver `prints/quadro-estados.png`)
| Estado | O que aparece |
|---|---|
| **Quadro vazio** (nenhum amigo) | `.nota` "Seu quadro está em branco." + carimbo "adicionar primeiro amigo". Texto reduzido a pedido do responsável em 27/10/2026. A partir de 1024px, as 4 colunas aparecem com um contorno tracejado de post-it (`neutro-400`) para explicar o formato. No celular, só o convite |
| **Coluna vazia** | `.nota` por coluna: "ninguém por aqui. aproveite o dia." (Faz um tempinho) · "nada chegando nos próximos dias." (Essa semana) · "ainda ninguém. um contato já muda isso." (Em dia) · "ninguém hoje ainda." (Falei agora). As notas valem para todas as larguras |
| **Carregando** | Descrição da coluna como barra skeleton + 2 post-its skeleton (`neutro-100`, 6 linhas) por coluna, com pulso de 1,2s |
| **Erro ao carregar** | Papel `erro-50` com borda `erro` ocupando a largura do quadro: "Não conseguimos abrir seu caderno agora." / "Verifique sua conexão e tente de novo." + botão secundário "Tentar de novo" (44px). Uma leitura com falha não confirma que os dados estão salvos |
| **Registrando / salvando / erro ao salvar** | Disparado pelo botão "falei agora" (ver 7.5.2): post-it com contorno tracejado e sheet 3.6 aberto. Durante o POST, o botão "Registrar" mostra spinner e `aria-busy` (3) |

### 7.7 Impacto na API (Django)
- **Botão "falei agora": nada novo.** É o mesmo `POST` de contato que o sheet 3.6 já usa (`{amigo, tipo, nota, data}`), sem campo novo. "Desfazer" usa o mesmo caminho do toast atual (DELETE do contato recém-criado), se ele já existir.
- **Colunas: sem migração.** O status é calculado. Recomendação: uma função só (`status_contato(amigo, hoje)`) no backend, exposta como campo somente leitura no serializer de amigos (`SerializerMethodField`), que alimenta também a lista "Bom falar com". Alternativa: um `computed` no front, mas aí a lógica fica em dois lugares. O `GET /amigos/` precisa trazer `ultimo_contato`, `frequencia_dias`, `ultima_nota` e `aniversario` (provavelmente já traz).
- **Grupos: model novo, N:N com `Amigo` (decisão de 20/10/2026).** Hoje o cadastro só tem "Como se conheceram" (texto livre), que continua como está e não serve para cor. Proposta:
  ```python
  class Grupo(models.Model):
      class Cor(models.TextChoices):
          # value = token PT; label = nome de cor na UI (admin/SPA). Ver tabela 3.5.
          FAMILIA = "familia", "Pêssego"       # EN: family
          FACULDADE = "faculdade", "Amarelo"   # EN: college
          TRABALHO = "trabalho", "Azul"        # EN: work
          VIZINHANCA = "vizinhanca", "Verde"   # EN: neighborhood
          NEUTRO = "neutro", "Creme"           # EN: neutral
      owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="grupos")
      nome = models.CharField(max_length=40)
      cor = models.CharField(max_length=12, choices=Cor.choices, default=Cor.NEUTRO)
      class Meta:
          ordering = [Lower("nome")]
          constraints = [models.UniqueConstraint(Lower("nome"), "owner", name="grupo_nome_unico_por_owner")]

  class Amigo(models.Model):
      ...
      grupos = models.ManyToManyField(Grupo, blank=True, related_name="amigos")
  ```
  - O grupo continua **opcional**: `blank=True`, e um amigo pode ter 0, 1 ou vários. Não há limite de grupos; a cor é só um destes 5 tokens, e grupos podem repetir cor. `neutro` é a cor `papel`, a mesma do antigo "sem grupo".
  - `owner` segue o padrão do projeto (todo model tem `owner`, decidido em 16/10): cada usuário vê e usa só os seus grupos.
  - **Serializer de amigos:** campo `grupos` com `[{id, nome, cor}]`, **sempre em ordem alfabética pelo nome** (sem diferenciar maiúsculas; usar a collation pt-BR do banco, para "Ágata" ficar junto de "A"). Para não fazer uma consulta por amigo: `prefetch_related(Prefetch("grupos", queryset=Grupo.objects.order_by(Lower("nome"), "id")))`. O front usa `grupos[0].cor` para o post-it e não reordena. Na escrita, `grupos` aceita uma lista de ids (`PrimaryKeyRelatedField(many=True)`), validando que os grupos são do mesmo `owner`.
  - **Endpoints de grupo (MVP completo — criar, listar, editar, apagar; decisão 21/10 e 26/10/2026):**
    - `GET /api/grupos/` — lista os grupos do `owner` (ordem alfabética). Cada item: `{id, nome, cor, total_amigos}` (`total_amigos` = contagem da relação N:N; alimenta a confirmação de apagar em 3.5).
    - `POST /api/grupos/` — `{nome, cor}`; cria o grupo do `owner`. Nome único por `owner`, case-insensitive (`UniqueConstraint(Lower("nome"), "owner")`). 400 se o nome já existir.
    - `PATCH /api/grupos/{id}/` — `{nome, cor}` (parcial ok). Atualiza nome/cor; o front reflete em todos os post-its daquele grupo. Nome único case-insensitive (excluindo o próprio id). Grupo de outro usuário → **404** (não 403).
    - `DELETE /api/grupos/{id}/` → **204**: só desfaz a relação N:N (os amigos continuam; quem ficar sem grupo vira post-it neutro). Nunca apaga `Amigo`. Grupo de outro usuário → **404**.
    - Sem tela de gerenciar grupos: criar/editar/apagar só pelos chips do cadastro (3.5). Campo do model é **`owner`** (não `dono`).
  - **Migração:** só cria as tabelas `Grupo` e `Amigo.grupos` (tabela intermediária automática). Não há dado antigo para migrar, porque o campo `grupo` único era só uma proposta.
  - **Sem grupos cadastrados,** todos os post-its ficam `neutro` com a etiqueta "sem grupo", e a legenda mostra só "sem grupo". O quadro funciona do mesmo jeito.
- Fuso: `d` precisa ser calculado na data local do usuário (America/Sao_Paulo); senão "hoje ou ontem" erra perto da meia-noite.

### 7.8 Biblioteca de arrastar
Sem biblioteca de arrastar: decisão de 20/10/2026, lógica simples. O quadro não usa SortableJS nem outra dependência nova.

### 7.9 Decisões
1. Entra **no MVP**, com grupos (decisão do Vinicius em 16/10/2026). Em 20/10/2026, o arrastar saiu: a única ação é o botão "falei agora".
2. Colunas e regras como em 7.2: "Faz um tempinho", "Falei agora" = hoje ou ontem, e "Essa semana" com janela fixa de 7 dias (20/10/2026).
3. O botão "falei agora" de cada post-it **abre o sheet 3.6**; fechar sem registrar não muda nada e não cria contato.
4. Grupos N:N e opcionais (7.7, decisão de 20/10/2026): nome livre e uma de 5 cores; o post-it usa a cor do primeiro grupo em ordem alfabética e mostra todos os grupos como etiquetas (até 2 linhas, depois "+N"). Sem grupo = post-it neutro com a etiqueta "sem grupo".
5. Celular: lista agrupada, com "Em dia" e "Falei agora" recolhidas (sem arrastar, como em todas as larguras).
6. Aba "quadro" (cor `papel`) e abas com 44px no celular.
7. Editar/apagar grupos no MVP via modo editar nos chips (3.5 / 7.7; 21/10 e 26/10/2026): sem tela de gerenciar; `PATCH`/`DELETE`/`total_amigos`; apagar nunca remove amigo.
8. Aba **"config"** (cor `margem`, `/config`) depois de "+ novo" e antes do "?" (26/10/2026): MVP = e-mail logado + Sair.
9. **Cabeçalho de folha** (3.12, 27/10/2026): D S T Q Q S S + data carimbo de hoje (SP) em todas as folhas autenticadas; não na capa `/entrar`; sem editar/filtrar.

### 7.10 Contraste dos post-its (WCAG AA, calculado por script)
Todos os pares **em uso** passam. Os que falharam foram trocados no desenho.

| Texto | família `#F1D6CC` | faculdade `#F6D98A` | trabalho `#C9D6E3` | vizinhança `#B9CBB0` | neutro (sem grupo) `#E8DCC8` |
|---|---|---|---|---|---|
| nome · tinta `#2B2420` | 11,07 ✅ | 11,05 ✅ | 10,33 ✅ | 8,89 ✅ | 11,27 ✅ |
| tempo · neutro-700 `#4F443A` | 6,86 ✅ | 6,85 ✅ | 6,40 ✅ | 5,51 ✅ | 6,98 ✅ |
| nota · caneta `#1F3A6B` | 8,12 ✅ | 8,11 ✅ | 7,58 ✅ | 6,52 ✅ | 8,26 ✅ |
| carimbo · primaria-800 `#7C3221` | 6,52 ✅ | 6,51 ✅ | 6,09 ✅ | 5,24 ✅ | 6,64 ✅ |
| anel de foco `#2F6185` (UI ≥3) | 4,81 ✅ | 4,80 ✅ | 4,48 ✅ | 3,86 ✅ | 4,89 ✅ |

Descartados: `primaria-600` no carimbo (3,16–4,00, falha em todas), `primaria-700` (4,08 no verde), `neutro-600` no metadado (4,25 no azul, 3,66 no verde). (O texto "registrado" saiu do protótipo em 20/10.)

**Etiquetas de grupo (20/10/2026).** O texto da etiqueta (neutro-700, Inter 12/500) foi medido sobre o fundo de cada etiqueta e sobre cada cor de post-it. Como a etiqueta é opaca e as duas listas de fundos são as mesmas 5 cores, a mesma tabela vale para "sobre a etiqueta" e "sobre o post-it". A coluna folha cobre o "+N" e a legenda; o chip do cadastro usa `tinta`.

| Texto | familia `#F1D6CC` | faculdade `#F6D98A` | trabalho `#C9D6E3` | vizinhanca `#B9CBB0` | neutro `#E8DCC8` | folha `#FBF6EE` |
|---|---|---|---|---|---|---|
| etiqueta e "+N" · neutro-700 `#4F443A` | 6,86 ✅ | 6,85 ✅ | 6,40 ✅ | 5,51 ✅ | 6,98 ✅ | 8,79 ✅ |
| chip do cadastro · tinta `#2B2420` | 11,07 ✅ | 11,05 ✅ | 10,33 ✅ | 8,89 ✅ | 11,27 ✅ | 14,19 ✅ |
| ícone da etiqueta · neutro-700 (UI ≥3) | 6,86 ✅ | 6,85 ✅ | 6,40 ✅ | 5,51 ✅ | 6,98 ✅ | 8,79 ✅ |

O pior caso é 5,51:1 (etiqueta ou post-it `vizinhanca`), acima de 4,5:1. Descartado para a etiqueta: `neutro-600` (4,25 no azul, 3,66 no verde). O contorno de 1px da etiqueta é só um reforço visual e não carrega informação, porque o nome vem escrito.
