# Spec de UI para o Tech Lead — "Caderno físico" (v2)

_Substitui a spec v1 (direção A). Referências: `tokens.css`, `tailwind.config.js` (plugin com os utilitários), `prototipo/index.html` (`?tela=inicio|amigos|perfil|cadastro|registrar|vazio|atalhos|config`), `direcoes/grupos-chips.html` (`?estado=normal|editando|form-editar|confirmar-apagar|erro-nome`), `direcoes/auth-capa.html` (`?modo=entrar|criar` & `?estado=normal|erro|carregando`), `direcoes/quadro.html`, `direcoes/cabecalho-folha.html` (3.12), prints em `prints/` (incl. `desktop-auth-*`, `mobile-auth-*`, `auth-capa-estados.png`, `desktop-quadro.png`, `mobile-quadro.png`, `cabecalho-folha.png`, `forms-pauta-*.png`), `direcoes/forms-pauta.html` (3.13). Ref visual do carimbo escolar: `ref-folha-data.png`._

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
| 2 fontes | 3 fontes: a Caveat entra **só** em notas, carimbos, rótulos de aba e, desde 29/10/2026, nos rótulos de campo e no carimbo "Salvar amigo" (3.13) |
| Formulários em cartão `.papel` (3.5) | **Formulários na pauta (3.13, CRM-22, 29/10/2026):** mesmos campos do CRM-16; o campo é o traço da pauta, o rótulo vai em Caveat, o valor em Inter 16, "Falar a cada [ 2 ] semanas" vira uma frase, os chips de grupo viram adesivos e o "Salvar amigo" vira carimbo |

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
- **Formulário sobre papel:** o bloco inteiro ocupa linhas inteiras (rótulo 32 + campo 48 + 16 = `h-l3`). Dentro do papel vale o grid de 8px, porque não há pauta visível. **Exceção desde 29/10/2026:** os formulários de 3.13 não usam papel e ficam direto na pauta (bloco = 2 linhas, sem grid de 8px).
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

> **Fora do escopo de 3.14 (29/10/2026):** a feature de aniversário não tem lista de próximos. Este post-it de "próximos 7 dias" não entra com ela; fica para um card futuro.

### 3.3 Linha da lista de amigos
`h-l2` (2 linhas): nome Fraunces 19 com truncamento / "último contato: …" Inter 14 `neutro-600` com truncamento, mais chevron. Hover `marca-texto-50/60`; selecionado como no 3.1. Busca: `.campo` com ícone, bloco `h-l2`. Busca vazia: `.nota` "ninguém com "xyz" por aqui." + carimbo "adicionar xyz".

### 3.4 Perfil
- Cabeçalho com `.reserva-canto` + `.polaroid.fita` (96px; 76px abaixo de 1024): nome Fraunces 28/30, "da faculdade · a cada 3 semanas" Inter 14, "🎂(cake) 12/mar · curte <marca>escalada</marca>…" Inter 14 e carimbo "registrar contato" (+ `kbd R` no desktop). São 4 linhas; a polaroid cabe nelas e **termina antes de "Histórico"** (`mt-l1`).
- Histórico: `li` flex, com data em Inter 14/600 `primaria-700` (72px fixos, com ícone do tipo) + `.nota` (pode ter várias linhas, sempre de 32). Sem nota: Inter 14 itálico.
- "Lembrar": `.nota` livre, editável inline.
- Campos vazios aparecem como convite em Inter ("+ adicionar aniversário"), nunca como "—".

### 3.5 Cadastro rápido (papel + Inter)
> **Visual substituído por 3.13 "Formulários na pauta" (CRM-22, 29/10/2026).** Os campos que valem são os do `FriendForm.vue` do CRM-16 (lista 1:1 em 3.13): Nome, Falar a cada (número + unidade), Grupos. Aniversário, "Mais detalhes" e os demais campos da v1 abaixo **não existem no app** e não fazem parte do CRM-22. As regras de grupos e o fluxo de salvar abaixo continuam valendo. O que muda é o visual: sai o `.papel`, sai o `.campo` de 48px com borda, os chips viram adesivos e o primário vira carimbo. Na dúvida sobre aparência, vale 3.13.

- Na folha: "✕ Cancelar" (L1), título (L2), subtítulo (L3…), `mt-l1` e o form `.papel` (fundo papel, borda 2px tinta, raio 10).
- `.campo`: 48px, fundo folha, borda 1,5px tinta, placeholder `neutro-500`. Foco: anel. Erro: `aria-invalid="true"`, borda `erro` e mensagem Inter 14 `erro` ligada por `aria-describedby`. Desabilitado: .45.
- Ritmo: quantidade inteira positiva (mínimo 1) e unidade em radiogroup de chips (dia, semana, mês ou ano), para aceitar todos os intervalos do contrato da API. Chips pill com borda tinta; selecionado `primaria-100` + borda primária + `primaria-800`, em linha única com **rolagem horizontal** no celular. Padrão: 1 mês.
- **Grupos (sempre visíveis no formulário, opcionais, seleção múltipla; decisão de 29/10/2026):** rótulo "Grupos" e, ao lado, o link "editar" (Inter 14, `neutro-700`; em modo editar vira "pronto"). Chips toggle (`button` com `aria-pressed`, h-10, pill) quebram linha e mostram os grupos do usuário em ordem alfabética, mais o chip "+ novo grupo". Chip desligado: fundo folha, borda 1,5px tinta, texto `tinta`, sem ícone de categoria. Chip ligado: fundo da cor do grupo, borda 2px tinta e ícone `check` para indicar seleção (o estado nunca depende só da cor). "+ novo grupo" abre, no mesmo bloco, um `.campo` de nome e as 5 cores em radiogroup (**swatch + label de cor escrito** — ver tabela abaixo; token interno ≠ label). O grupo criado ali já vem marcado para esse amigo. Nenhum grupo existente vem marcado no cadastro novo, e o cadastro rápido continua só com o nome: quem não seleciona nenhum grupo salva o amigo sem grupo. O bloco não fica dentro de "Mais detalhes". Detalhes do model em 7.7. Protótipo dos estados: `direcoes/grupos-chips.html`; print: `prints/grupos-chips-estados.png`.

  **Labels de cor na UI (27/10/2026):** o token interno (API/banco) **não** é o texto exibido. SPA e admin mostram **nome de cor + swatch** (sempre os dois; nunca só a cor). Badges e opções de cor não usam ícones de categoria (decisão de 29/10/2026).

  | token PT (spec / API) | enum EN | label UI | fundo (token já existente) |
  |---|---|---|---|
  | `familia` | `family` | **Pêssego** | `primaria-100` `#F1D6CC` |
  | `faculdade` | `college` | **Amarelo** | `marca-texto` `#F6D98A` |
  | `trabalho` | `work` | **Azul** | `pauta` `#C9D6E3` |
  | `vizinhanca` | `neighborhood` | **Verde** | `aba-verde` `#B9CBB0` |
  | `neutro` | `neutral` | **Creme** | `papel` `#E8DCC8` |

  - **Modo editar (MVP, decisão 21/10 e 26/10/2026):** não há tela de gerenciar grupos. Editar e apagar vivem nos chips do cadastro (e do perfil, quando o mesmo bloco de grupos existir). Ao tocar "editar": os chips **param de ligar/desligar** e passam a abrir o formulário de edição (`aria-label="Editar grupo {nome}"`, sem `aria-pressed`). O link vira "pronto" e sai do modo editar (fecha formulário/confirmação se estiverem abertos).
  - **Formulário de editar grupo:** toque no chip (em modo editar) abre, no mesmo bloco, o mesmo formulário do "+ novo grupo" já preenchido (nome + 5 cores radiogroup com labels Pêssego/Amarelo/Azul/Verde/Creme), com botões "salvar" (primário) e "apagar grupo" (texto/erro, não primário). Salvar chama `PATCH` (7.7). Nome repetido (case-insensitive, entre os grupos do mesmo `owner`, excluindo o próprio): `aria-invalid` no campo e mensagem "Você já tem um grupo com esse nome."
  - **Apagar grupo:** "apagar grupo" troca o formulário por confirmação inline. Com `total_amigos` > 0: "Apagar '{nome}'? {N} amigos saem desse grupo, mas continuam no seu caderno." Com 0: "Apagar '{nome}'? Nenhum amigo está nesse grupo." Botões: "apagar grupo" (vermelho/`erro`, confirma) e "cancelar" (secundário; volta ao formulário ou fecha). Confirmar chama `DELETE` (7.7) → 204: só desfaz a relação N:N; **nunca apaga amigo**. Critérios de aceite: editar nome/cor atualiza todos os post-its daquele grupo; quem fica sem nenhum grupo vira post-it neutro com a etiqueta "sem grupo".
  - **Estados do bloco (ver `prints/grupos-chips-estados.png`):** **normal** (chips toggle + "editar") · **editando** (chips abrem edição, link "pronto") · **form editar** (form preenchido + salvar/apagar) · **confirmar apagar** (texto + apagar/cancelar) · **erro de nome** (campo inválido + mensagem).
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
Na folha: `.cabecalho-folha` (3.12), título e, depois de `mt-l2`, duas `.nota` ("Seu caderno está em branco." / "Comece por alguém de quem você sente falta."), Inter "Só o nome já basta." e o carimbo "adicionar primeiro amigo". No livro aberto, a página direita fica em branco quando nenhum perfil está aberto (decisão de 29/10/2026). Não há ilustração (a página em branco já é a ilustração).

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

### 3.13 Formulários na pauta (CRM-22, aprovado 29/10/2026, corrigido no mesmo dia)
_Direção A "Escrever na pauta", escolhida pelo Vinicius em 29/10/2026, com a exceção à regra 6 da identidade aprovada (rótulos de campo e o carimbo "Salvar amigo" em Caveat). É o card **CRM-22**, feito em cima do **CRM-16** (origin/main `e3d5642`, PR #24). O CRM-16 continua como está._

_Protótipo: `direcoes/forms-pauta.html`. Ele copia o DOM do CRM-16 (classes, ids, `name`, textos) e muda só o CSS._
- `?estado=normal|foco|preenchido|erro-nome|erro-numero|erro-unidade|erro-geral|salvando`
- `?tela=novo|editar`
- `?grupos=normal|editar|form|novo|apagar`
- `?fonte=200` simula a fonte do navegador em 200%.
- `?qa=1` confere o grid e os alvos e imprime "TUDO OK".

_Prints: `prints/forms-pauta-desktop.png`, `prints/forms-pauta-mobile.png`, `prints/forms-pauta-estados.png`. O estudo das 3 direções fica como histórico em `direcoes/forms-caderno.html`. Ele mostra campos que não existem no app; não usar como referência de campos._

**Escopo: 1:1 com o FriendForm.vue do CRM-16, nenhum campo novo**

O CRM-22 só muda o visual. A tabela abaixo é a lista completa de campos do form do CRM-22. Não tem aniversário (ele entra depois, como feature própria, em **3.14**), "Mais detalhes", "Como se conheceram", nota, placeholder nem máscara.

| Campo na tela | Elemento real (CRM-16) | Chave da API / `error_field` | Mensagem (`id`) |
|---|---|---|---|
| **Nome** | `label[for=friend-name]` + `input#friend-name.field[name=name]` (`required`, `maxlength=100`, `autocomplete=off`) | `name` | `p#friend-name-error.field-error` |
| **Falar a cada** (número) | `label[for=friend-cadence-amount]` + `input#friend-cadence-amount.field[name=cadence_amount]` (`type=number`, `min=1`, `step=1`, `required`, padrão **1**) | `cadence_amount` | `p#friend-cadence_amount-error.field-error` |
| **Unidade do ritmo** | `fieldset.cadence-units` + `legend` "Unidade do ritmo" + 4 `input[type=radio][name=cadence_unit]` (Dias/Semanas/Meses/Anos; `day`/`week`/`month`/`year`; padrão **Meses**) | `cadence_unit` | `p#friend-cadence_unit-error.field-error`, dentro do fieldset |
| **Grupos (opcional)** | `div.friend-groups` > `GroupPicker` (`legend.group-heading`, `button.edit-groups`, `button.group-chip[aria-pressed]`, `button.group-action[name=new-group]`, editor de grupo) | `groups` | `p#friend-groups-error.field-error` |
| Erro geral | `form > p.field-error[role=alert]` (sem `id`) | qualquer outro campo ou falha de rede | "Não foi possível salvar o amigo. Seus dados continuam aqui. Tente novamente." |
| Ações | `button.save-friend[type=submit]` "Salvar amigo" / "Salvando…" · `button.cancel-edit[name=cancel-friend-edit]` "Cancelar edição" (só ao editar) | — | — |

Textos de volta do form, iguais ao código:
- Novo amigo: `NewFriendView` mostra o link "Cancelar" (`.cancel-link`), o título "Novo amigo" e a ajuda "Só o nome já basta. O resto pode vir depois." (`.new-friend-help`).
- Editar: `FriendDetailView` com `is_editing` mostra "Voltar" (`.back-link`) e o nome do amigo como título.

Mudanças permitidas no template (opcionais, sem campo, prop ou chamada nova):
- **[T1]** `inputmode="numeric"` no `input[name=cadence_amount]`, para o teclado numérico no celular.
- **[T2]** Singular/plural nas unidades, só se for trivial: se `cadence_amount === 1`, mostrar Dia/Semana/Mês/Ano. São os mesmos `value`, só muda o texto. Sem [T2], ficam os rótulos de hoje.

Todo o resto é CSS nos `<style scoped>` do FriendForm.vue e do GroupPicker.vue, mais a regra de topo das views. O GroupBadge é estilizado com `:deep(.group-badge)`. Não mudam: endpoints, payload, validação (`required`/`min` nativos antes da API), mensagens, foco no nome ao montar (`onMounted`), regras de grupos (3.5 e 7.7: `aria-pressed`, modo editar, editor, apagar, labels de cor) e o fluxo de salvar.

**Onde se aplica**
| Tela | Como fica |
|---|---|
| Novo amigo (`/amigos/novo`, `NewFriendView`) | Form inteiro na pauta, como no protótipo |
| Editar amigo (`/amigos/:id` com `is_editing`, `FriendDetailView`) | O mesmo FriendForm, preenchido, com "Cancelar edição" ao lado do carimbo (`?tela=editar`) |
| Grupos (`GroupPicker`, dentro do form) | Chips viram **adesivos**. Modo editar, editor de grupo e confirmação de apagar seguem a mesma pauta |
| Config (`/config`, 3.7.1) | Não tem campo no MVP; o "Sair" não muda. Se entrar algum campo, segue esta anatomia |
| **Fora:** capa `/entrar` (3.8), sheet de registro (3.6), modais | Continuam como estão. Mudar exige decisão nova |

**Anatomia (pauta de 32px; tudo em rem)**
```
linha 1 │ Novo amigo                                 ← h1 (view)
linha 2 │ Só o nome já basta. O resto pode vir…      ← .new-friend-help
linha 3 │                                            ← margem do form (L)
linha 4 │ Nome                                       ← <label>, Caveat 22/700 pen-ink
linha 5 │ Marina Costa                               ← <input>, Inter 16 ink
        │ ────────────────────────────────           ← o campo É o traço (neutral-500 1,5px)
linha 6 │                                            ← margem do .friend-field (L)
linha 7 │ Falar a cada  [ 2 ]  dias (semanas) meses anos   ← frase: rótulo + número + unidades
        │               ‾‾‾‾‾                        ← número sublinhado, 4rem
linha 8 │                                            ← linha em branco (.friend-groups margin-top)
linha 9 │ Grupos (opcional)                 editar   ← legend.group-heading
linha 10│ [✓ Faculdade] [Família] [Trabalho] …      ← adesivos, 2 linhas por fileira
        │ [Salvar amigo]  Cancelar edição            ← carimbo + link
```
- **Celular (360/390):** "Falar a cada [ 2 ]" fica numa linha e as unidades descem para a linha de baixo. Em 200%, número e unidades quebram linha quantas vezes precisar, sem rolagem horizontal.
- **Desktop:** a frase inteira cabe numa linha.
- **Erro:** a mensagem entra na linha de baixo do campo e o bloco cresce 1 linha por linha de texto.
- **Rótulo:** `label`/`legend` de verdade, nunca placeholder. Não há placeholder nem dica entre parênteses. "(opcional)" já faz parte do texto "Grupos (opcional)" do GroupPicker.
- **Campo de texto:** `input` nativo sem borda e sem fundo. O traço é um `linear-gradient` de 1,5px `neutral-500` em cima da linha da pauta. O valor é **sempre Inter 16px** (evita o zoom do iOS). O alvo tem 3rem (48px) e pega 1rem emprestado da linha do rótulo (`margin-top:-1rem; padding-top:1rem`).
- **"Falar a cada" como frase:**
  - O `.friend-field` do número vira `flex` (rótulo + número). O `fieldset.cadence-units` fica ao lado, porque o `.friend-fields` também vira `flex-wrap`.
  - **Número:** `width:4rem`, centralizado, `tabular-nums`, sem setinhas (o CRM-16 já tira), sublinhado como os outros campos, Inter 16. O alvo de 48px pega 1rem da linha de cima, que está em branco (margem do Nome).
  - **Unidades:** 4 radios nativos escondidos, mas focáveis (as setas funcionam). O texto é Inter 16 em minúsculas (`text-transform`). A marcada fica com peso 600 e um **círculo à mão** de 2px `pen-ink` (`border-radius` irregular + `rotate(-2deg)`). Cada opção tem 48px de alvo, que desce 1rem para a linha em branco de baixo, e largura mínima de 44px.
  - O `legend` "Unidade do ritmo" continua no DOM e é lido pelo leitor de tela, mas fica escondido visualmente (`sr-only`). O rótulo visível da frase é "Falar a cada".
- **Grupos como adesivos:**
  - **Desligado:** `aria-pressed=false`, fundo `sheet`, borda 1,5px **tracejada** `neutral-500`.
  - **Ligado:** `aria-pressed=true`, fundo da cor do grupo, borda 2px `ink`, `shadow-paper` e o `svg.selected-check` à esquerda (o estado nunca depende só da cor).
  - 44px de altura, levemente tortos (−1,5° / 1° / −0,5°, em ciclo).
  - **Modo editar:** o botão perde `aria-pressed`, como no CRM-16. O adesivo fica reto, com a cor do grupo, borda 2px tracejada `pen-ink` e nome sublinhado, e o link vira "pronto".
  - "+ novo grupo": tracejado, reto, `neutral-700`.
  - Editor de grupo: o campo segue a mesma anatomia. As cores continuam pills de 44px com radio nativo e label Pêssego/Amarelo/Azul/Verde/Creme. As ações são pills de 44px.
- **"Salvar amigo" = carimbo:** `button.save-friend`, Caveat 26/700 `sheet` sobre `primary`, `radius-sm`, `rotate(-2deg)`, moldura interna (anel `primary` de 3px + filete `sheet` 80%), 48px. Hover `primary-hover`, active `primary-pressed` + `scale(.97)`, foco `--focus-ring`. Fica uma linha em branco acima.
- **"Cancelar edição":** link Inter 15/500 `neutral-700` sublinhado, 48px de alvo, ao lado do carimbo. Quebra para a linha de baixo se não couber.

**Estados (ver `prints/forms-pauta-estados.png`, 10 painéis em 390px)**
| Estado | Visual | Atributos (já existem no CRM-16) |
|---|---|---|
| Normal (recém-montado) | Traço `neutral-500` 1,5px. Número = 1, "meses" circulado, nenhum grupo marcado. O Nome já está com foco (`onMounted`) | — |
| Foco (texto e número) | **Faixa de marca-texto** (`highlight-50`, 27px sobre a linha) + traço `focus` 3px. Radios, adesivos, links e carimbo: `--focus-ring` | `:focus` / `:focus-visible` |
| Preenchido | Valor Inter 16 `ink` sobre o traço; unidade circulada; adesivos ligados | — |
| Erro: nome / número | Traço `error` 2,5px (3px com foco, sobre a faixa) + mensagem Inter 14 `error` com "!" desenhado em CSS, na linha de baixo | `aria-invalid="true"` + `aria-describedby` só enquanto `error_field` aponta para o campo |
| Erro: unidade | Traço `error` sob as 4 opções + mensagem dentro do `fieldset.cadence-units` | `aria-invalid` + `aria-describedby` no fieldset |
| Erro: grupos / geral | Mensagem embaixo do GroupPicker (`#friend-groups-error`) ou antes do carimbo (erro geral), na largura toda | `role="alert"` |
| Salvando | `fieldset.friend-fields` com `disabled` nativo a .45; carimbo a .6 com o texto "Salvando…" e `cursor:wait`; "Cancelar edição" a .45. Sem spinner | `aria-busy` no form, `disabled` no fieldset e nos botões |
| Grupos: modo editar | Adesivos retos tracejados em `pen-ink`; tocar abre o editor; o link vira "pronto" | `aria-pressed` some (CRM-16) |
| Editar amigo | Form preenchido + "Cancelar edição" | `v-if="friend"` |

Sobre os erros:
- **Um erro de campo por vez.** `error_field` é uma string só, então o app nunca mostra erro no nome e no número ao mesmo tempo. Os painéis 3 e 4 mostram cada um separado.
- **Validação nativa primeiro.** `required` e `min=1` fazem o navegador barrar o envio antes da API. A mensagem da API (`{mensagem} Revise os dados e tente novamente.`) aparece quando o servidor recusa. Exemplo: um nome só com espaços, que o `trim()` deixa vazio.

**Medidas e tokens (grid de 32px; tudo em rem para crescer com a fonte do navegador)**
| Peça | Medida | Token |
|---|---|---|
| Linha | `--notebook-line: 2rem` (32px) | `--notebook-line` |
| Bloco de campo | 2 linhas (rótulo + traço) + 1 linha de margem; com erro, +1 linha por linha de texto | — |
| Rótulo | Caveat 1.375rem/700, line-height = linha | `--font-handwriting`, `--pen-ink` |
| Campo de texto | altura 3rem, `margin-top:-1rem`, `padding-top:1rem`; traço a `.3125rem` do fim | `--neutral-500` |
| Foco do campo | faixa 1.6875rem + traço 3px a `.25rem` do fim | `--highlight-50`, `--focus` |
| Erro do campo | traço 2,5px (3px com foco) | `--error` |
| Número | `width:4rem` (com o mesmo traço); `column-gap:.75rem` entre rótulo, número e unidades | — |
| Unidade (radio) | alvo 3rem × ≥2.75rem: texto na linha + 1rem embaixo; `column-gap:.25rem`, `row-gap:1rem`; círculo com `inset:-.0625rem -.5rem 0` | `--pen-ink` |
| Mensagem de erro | Inter .875rem, line-height = linha; "!" em círculo de 1rem | `--error`, `--sheet` |
| Adesivos | 2.75rem, contêiner com `padding:.625rem 0` e `gap:1.25rem .5rem` → cada fileira = 2 linhas | `--shadow-paper`, `--group-color` |
| Link "editar"/"pronto", "Cancelar", "Voltar" | 2.75rem de altura, `margin-top:-.75rem`, ≥2.75rem de largura | `--neutral-700` |
| Ações | `margin-top: L + 1rem`; carimbo e "Cancelar edição" com 3rem; `column-gap:1rem`, quebram linha | `--primary`, `--primary-hover`, `--primary-pressed`, `--focus-ring` |

**Contraste (WCAG AA, calculado a partir dos hex de `tokens.css`)**
| Frente | Fundo | Uso | Razão | Mínimo |
|---|---|---|---|---|
| `ink` #2B2420 | `sheet` #FBF6EE | valor digitado, unidades | 14,19:1 | 4,5 |
| `ink` | `highlight-50` #FBEDC4 | valor com foco | 13,09:1 | 4,5 |
| `pen-ink` #1F3A6B | `sheet` | rótulo Caveat 22/700, círculo da unidade (UI) | 10,41:1 | 4,5 / 3 |
| `neutral-600` #6B5E50 | `sheet` | "Só o nome já basta…" | 5,84:1 | 4,5 |
| `neutral-500` #7A6B59 | `sheet` | traço do campo, adesivo desligado (UI) | 4,79:1 | 3 |
| `focus` #2F6185 | `sheet` / `highlight-50` | traço de foco, anel (UI) | 6,16 / 5,68:1 | 3 |
| `error` #9B3B36 | `sheet` / `highlight-50` | mensagem Inter 14 / traço de erro com foco | 6,35 / 5,86:1 | 4,5 / 3 |
| `sheet` | `primary` #B04A32 | carimbo "Salvar amigo" Caveat 26/700 | 5,04:1 | 4,5 |
| `ink` | Amarelo / Pêssego / Azul / Verde / Creme | adesivo ligado | 11,05 / 11,07 / 10,33 / 8,89 / 11,27:1 | 4,5 |
| `neutral-700` #4F443A | `sheet` | "editar", "Cancelar", "Cancelar edição", "Voltar" | 8,79:1 | 4,5 |
| `primary-800` #7C3221 | `sheet` | "Salvar grupo" / "Criar grupo" do editor | 8,36:1 | 4,5 |
| `primary` | `primary-50` | borda da cor escolhida (UI) | 4,68:1 | 3 |

Os estados desabilitados (.45/.6) ficam fora do mínimo, como o WCAG 1.4.3 permite para componentes inativos.

**HTML de referência = template do CRM-16 (sem mudança, só os comentários [T1]/[T2])**
```html
<form class="friend-form paper-surface" :aria-busy="is_saving" @submit.prevent="send_friend_for_form">
  <fieldset class="friend-fields" :disabled="is_saving">
    <legend class="sr-only">Dados do amigo</legend>
    <div class="friend-field">
      <label for="friend-name">Nome</label>
      <input id="friend-name" class="field" name="name" required maxlength="100" autocomplete="off" …>
      <p v-if="error_field === 'name'" id="friend-name-error" class="field-error" role="alert">…</p>
    </div>
    <div class="friend-field">
      <label for="friend-cadence-amount">Falar a cada</label>
      <!-- [T1] opcional: + inputmode="numeric" -->
      <input id="friend-cadence-amount" class="field" name="cadence_amount" type="number" min="1" step="1" required …>
      <p v-if="error_field === 'cadence_amount'" id="friend-cadence_amount-error" class="field-error" role="alert">…</p>
    </div>
    <fieldset class="cadence-units" …>
      <legend>Unidade do ritmo</legend>
      <div class="cadence-choices">
        <label v-for="unit in CADENCE_UNITS" class="cadence-choice">
          <input v-model="cadence_unit" type="radio" name="cadence_unit" :value="unit.value">
          <span>{{ unit.label }}</span>  <!-- [T2] opcional: singular quando cadence_amount === 1 -->
        </label>
      </div>
      <p v-if="error_field === 'cadence_unit'" id="friend-cadence_unit-error" class="field-error" role="alert">…</p>
    </fieldset>
    <div class="friend-groups" …><GroupPicker … /><p v-if="error_field === 'groups'" id="friend-groups-error" class="field-error" role="alert">…</p></div>
  </fieldset>
  <p v-if="…erro geral…" class="field-error" role="alert">…</p>
  <button class="save-friend" type="submit" :disabled="is_saving || is_group_saving">{{ is_saving ? 'Salvando…' : 'Salvar amigo' }}</button>
  <button v-if="friend" type="button" name="cancel-friend-edit" class="cancel-edit" …>Cancelar edição</button>
</form>
```

**CSS de referência** (tokens de `frontend/src/styles/tokens.css`; o bloco completo, inclusive o GroupPicker, está no protótipo, nos comentários "FriendForm.vue (scoped)" e "GroupPicker.vue (scoped)")
```css
/* FriendForm.vue <style scoped> */
.friend-form{margin-top:var(--notebook-line);padding:0;background:none;border:0;box-shadow:none;display:flex;flex-wrap:wrap;align-items:flex-start;column-gap:1rem}
.friend-fields,.cadence-units{min-width:0;margin:0;padding:0;border:0}
.friend-fields{flex:1 1 100%;display:flex;flex-wrap:wrap;align-items:flex-start;column-gap:1.5rem}
.friend-field{flex:1 1 100%;min-width:0;margin:0 0 var(--notebook-line)}
.friend-field>label{display:block;font:700 1.375rem/var(--notebook-line) var(--font-handwriting);color:var(--pen-ink)}
.field{position:relative;z-index:1;display:block;width:100%;height:3rem;margin-top:-1rem;padding:1rem .25rem 0;border:0;border-radius:0;appearance:none;
  font:400 1rem/var(--notebook-line) var(--font-ui);color:var(--ink);
  background:linear-gradient(var(--neutral-500),var(--neutral-500)) no-repeat 0 calc(100% - .3125rem)/100% 1.5px}
.field:focus{outline:none;background:linear-gradient(var(--focus),var(--focus)) no-repeat 0 calc(100% - .25rem)/100% 3px,
  linear-gradient(var(--highlight-50),var(--highlight-50)) no-repeat 0 calc(100% - .3125rem)/100% 1.6875rem}
.field[aria-invalid="true"]{background:linear-gradient(var(--error),var(--error)) no-repeat 0 calc(100% - .25rem)/100% 2.5px}
.field[aria-invalid="true"]:focus{background:linear-gradient(var(--error),var(--error)) no-repeat 0 calc(100% - .25rem)/100% 3px,
  linear-gradient(var(--highlight-50),var(--highlight-50)) no-repeat 0 calc(100% - .3125rem)/100% 1.6875rem}
/* "Falar a cada [ 2 ] semanas" */
.friend-field:has(>[name="cadence_amount"]){flex:0 1 auto;display:flex;flex-wrap:wrap;align-items:flex-start;column-gap:.75rem;margin-bottom:0}
.friend-field>[name="cadence_amount"]{flex:none;width:4rem;text-align:center;font-variant-numeric:tabular-nums}
.friend-field:has(>[name="cadence_amount"])>.field-error{flex:1 1 100%}
.cadence-units{position:relative;flex:0 1 auto}
.cadence-units>legend{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.cadence-choices{display:flex;flex-wrap:wrap;width:fit-content;max-width:100%;column-gap:.25rem;row-gap:1rem;margin:0 0 -1rem;padding:0;overflow:visible}
.cadence-choice{position:relative;flex:none;display:flex;justify-content:center;min-width:2.75rem;height:3rem;padding:0 .5rem 1rem;cursor:pointer}
.cadence-choice input{position:absolute;width:1px;height:1px;margin:0;opacity:0}
.cadence-choice span{position:relative;display:flex;align-items:center;height:var(--notebook-line);padding:0;border:0;background:none;
  font:400 1rem/var(--notebook-line) var(--font-ui);color:var(--ink);text-transform:lowercase;white-space:nowrap}
.cadence-choice input:checked+span{background:none;color:var(--ink);font-weight:600}
.cadence-choice input:checked+span::before{content:"";position:absolute;inset:-.0625rem -.5rem 0;border:2px solid var(--pen-ink);
  border-radius:50% 46% 52% 44%/60% 50% 55% 45%;transform:rotate(-2deg)}
.cadence-choice input:focus-visible+span{box-shadow:var(--focus-ring);border-radius:4px}
.cadence-units[aria-invalid="true"] .cadence-choices{background:linear-gradient(var(--error),var(--error)) no-repeat 0 calc(100% - 1.25rem)/100% 2.5px}
/* mensagens */
.field-error{display:flex;gap:.375rem;margin:0;font:400 .875rem/var(--notebook-line) var(--font-ui);color:var(--error);pointer-events:none}
.field-error::before{content:"!";flex:none;display:grid;place-items:center;width:1rem;height:1rem;margin-top:.5rem;border-radius:50%;
  background:var(--error);color:var(--sheet);font:700 .6875rem/1 var(--font-ui)}
.friend-form>.field-error{flex:1 1 100%;margin-top:var(--notebook-line)}
.friend-groups{flex:1 1 100%;min-width:0;margin-top:var(--notebook-line)}
/* ações */
.save-friend{display:inline-flex;align-items:center;justify-content:center;width:auto;max-width:100%;min-height:3rem;margin:calc(var(--notebook-line) + 1rem) 0 0;
  padding:.5rem 1.375rem;border:0;border-radius:var(--radius-sm);background:var(--primary);color:var(--sheet);
  font:700 1.625rem/var(--notebook-line) var(--font-handwriting);transform:rotate(-2deg);
  box-shadow:inset 0 0 0 3px var(--primary),inset 0 0 0 4.5px rgba(251,246,238,.8)}
.save-friend:hover{background:var(--primary-hover)}            /* repetir o anel interno com a cor do fundo */
.save-friend:active{background:var(--primary-pressed);transform:rotate(-2deg) scale(.97)}
.save-friend:focus-visible{box-shadow:inset 0 0 0 3px var(--primary),inset 0 0 0 4.5px rgba(251,246,238,.8),var(--focus-ring)}
.cancel-edit{display:inline-flex;align-items:center;min-height:3rem;margin:calc(var(--notebook-line) + 1rem) 0 0;padding:.5rem 0;border:0;background:transparent;
  font:500 .9375rem/var(--notebook-line) var(--font-ui);color:var(--neutral-700);text-decoration:underline;text-underline-offset:3px}
.friend-fields:disabled,.cancel-edit:disabled{opacity:.45}
.save-friend:disabled{opacity:.6;cursor:wait}

/* GroupPicker.vue <style scoped> (resumo; GroupBadge via :deep) */
.group-heading{display:flex;justify-content:space-between;width:100%;font:700 1.375rem/var(--notebook-line) var(--font-handwriting);color:var(--pen-ink)}
.edit-groups{height:2.75rem;margin-top:-.75rem;padding:.75rem .25rem 0;font:500 .875rem/var(--notebook-line) var(--font-ui);color:var(--neutral-700);text-decoration:underline}
.group-chips{display:flex;flex-wrap:wrap;gap:1.25rem .5rem;padding:.625rem 0}
.group-chip{transform:rotate(var(--tilt,0deg))}
.group-chip:nth-child(3n+1){--tilt:-1.5deg}.group-chip:nth-child(3n+2){--tilt:1deg}.group-chip:nth-child(3n){--tilt:-.5deg}
.group-chip :deep(.group-badge){height:2.75rem;padding:0 .875rem;border:1.5px dashed var(--neutral-500);border-radius:4px;background:var(--sheet)}
.group-chip[aria-pressed="true"] :deep(.group-badge){padding-left:2rem;border:2px solid var(--ink);background:var(--group-color);box-shadow:var(--shadow-paper)}
.group-chip:not([aria-pressed]){transform:none}
.group-chip:not([aria-pressed]) :deep(.group-badge){border:2px dashed var(--pen-ink);background:var(--group-color);text-decoration:underline}
```
Nas views, `.cancel-link` e `.back-link` passam a ter `height:2.75rem; margin-top:-.75rem; min-width:2.75rem`. Assim ficam com 44px de alvo e o texto continua sentado na linha.

**Critérios de aceite (PM)**
1. **Mesmos campos:** o form tem exatamente Nome, Falar a cada (número + unidade), Grupos e as ações do CRM-16. Payload e endpoints iguais. Nenhum campo, prop ou request novo.
2. **Legível no celular:** em 360 e 390px, valor, número e unidades em Inter 16px e rótulos em Caveat 22px. Nada cortado, sem rolagem horizontal, todo alvo ≥44px.
3. **"Falar a cada" como frase:** "Falar a cada [ 2 ] semanas" se lê numa linha no desktop. No celular, as unidades descem uma linha. O número aceita só inteiros ≥1 (`min=1` nativo) e a unidade marcada tem o círculo à mão.
4. **Rótulo real:** `label for` no nome e no número; `fieldset` + `legend` "Unidade do ritmo" nas unidades (legend só escondida visualmente).
5. **Foco visível:** faixa de marca-texto + traço `focus` 3px nos campos e `--focus-ring` nas unidades, adesivos, links e carimbo. Ordem de Tab = ordem visual. O nome recebe foco ao abrir, como hoje.
6. **Erro:** cada erro da API aparece no campo certo (nome, número, unidade, grupos) ou como erro geral, com `aria-invalid`/`aria-describedby` só enquanto a mensagem existe. Os textos são os de hoje.
7. **Ritmo:** com a pauta ligada, todo rótulo, valor, unidade, mensagem e adesivo cai numa linha da pauta, inclusive com erro, no modo editar grupos e com o editor de grupo aberto (`?qa=1`).
8. **Fonte em 200%:** tudo em rem, a pauta cresce junto e as linhas continuam alinhadas. Unidades, adesivos e ações quebram linha em vez de cortar (`?fonte=200`).
9. **Salvar não fica mais lento:** nenhuma fonte, imagem ou lib nova. A Caveat já carrega para notas e abas. O carimbo é só CSS.

**Não fazer**
- Campo novo de qualquer tipo: aniversário, "Mais detalhes", "Como se conheceram", nota, apelido, telefone. Isso exige card de produto e API, e não é do CRM-22. (O aniversário ganhou card próprio: ver 3.14.)
- Placeholder no lugar de rótulo, ou dica entre parênteses inventada.
- Trocar o `input type=number` por select ou chips de valores fixos. O ritmo é **personalizado** (quantidade + unidade).
- Caveat no valor digitado, nas unidades, nos adesivos, nos links, no "Cancelar edição" ou nas mensagens. Ela só entra nos rótulos e no carimbo.
- Spinner ou ícone novo no "Salvando…". O CRM-16 só troca o texto.
- Mostrar dois erros de campo ao mesmo tempo. O app tem um `error_field` só.
- Caixinhas por letra, cartão de papel ou ficha por cima da pauta (direções B e C, não escolhidas). Imagem de textura, fonte, token ou lib nova. Mudar a capa `/entrar`.

> **Fora do CRM-22:** o aniversário entrou como feature própria em **3.14** (29/10/2026), com a mesma anatomia e a máscara dd/mm local.

### 3.14 Aniversário (feature própria, aprovada 29/10/2026; card CRM-23, separado do CRM-22)
_Escopo fechado pelo PM: campo opcional "Aniversário (dia/mês)" no Novo e no Editar amigo, sem ano, e o selo "Aniversário hoje" no post-it do Quadro no dia do aniversário (America/Sao_Paulo). **Fora do escopo:** ano, idade, notificação, lista de próximos aniversários, ordenar ou filtrar por aniversário. O post-it decorativo de 3.2 e o `cake` de "próximos 7 dias" de 7.3 continuam fora (ver as notas lá)._

_Protótipos: `direcoes/forms-aniversario.html` (cópia de `forms-pauta.html` com o campo; `?aniv=vazio|foco|preenchido|erro`, `?tela=editar`, `?fonte=200`, `?qa=1`) e `direcoes/quadro-aniversario.html` (cópia de `quadro.html` com uma aniversariante, "Maria Eduarda Albuquerque", 4 grupos e "+2"; `?niver=todos` liga o selo em todos os post-its para testar o layout; `?fonte=200`). `forms-pauta.html` e `quadro.html` não mudam._

_Prints: `prints/aniversario-form-mobile.png`, `prints/aniversario-form-desktop.png`, `prints/aniversario-form-estados.png` (vazio, foco, preenchido, erro 31/04), `prints/aniversario-selo-quadro.png` (desktop 1280 e celular 390)._

**Contrato (Tech Lead, 29/10/2026)**
- A API recebe e devolve `birthday` como `"dd/mm"` ou `null` em `POST`/`PATCH`/`GET` de amigos (para limpar, o front manda `birthday: null`; CRM-24). No banco, dia e mês vão juntos ou ficam os dois vazios.
- A API valida a data. Data que não existe (31/04, 00/05, 13/13) volta 400 no formato drf-standardized-errors, com `field` = `birthday` e o `detail` "Essa data não existe. Ex.: 12/03.". 29/02 é válido.
- **O selo é calculado no backend**, na data de hoje em America/Sao_Paulo; num ano não bissexto, quem faz 29/02 recebe o selo em 28/02. O serializer devolve um booleano somente leitura, a **flag de aniversário hoje vinda da API**, e o front só lê essa flag. **O front não calcula datas** e não valida dia/mês no cliente. O campo se chama **`is_birthday_today`** (Tech Lead, CRM-24).

**Campo no formulário (anatomia)**
- Posição: depois de "Falar a cada" e antes de Grupos, em `.friend-field`, igual ao Nome (3.13): rótulo Caveat numa linha, traço na linha de baixo, controle de `3rem` com `margin-top:-1rem`, 1 linha de pauta (`--notebook-line`) acima do campo.
- Rótulo: `label[for=friend-birthday]` "Aniversário (dia/mês, opcional)" (decisão do PM, 29/10/2026).
- Input: `input#friend-birthday.field[name=birthday]`, `type=text`, `inputmode=numeric`, `maxlength=5`, `placeholder="dd/mm"`, `autocomplete=off`. Largura 6rem, Inter 16 com `tabular-nums`. O placeholder usa `neutral-600` (5,84:1 na folha) e não substitui o rótulo.
- Máscara dd/mm, local e síncrona (o teclado numérico do iOS não tem "/"): só aceita dígitos, no máximo 4; ao digitar o 2º dígito a barra entra sozinha; ao apagar, a barra sai junto. Colar "1203" vira "12/03". Ela não valida a data.
- "apagar": `button[type=button].clear-birthday` com `aria-label="Apagar aniversário"`, na mesma linha do traço. Inter 14/500 `neutral-700`, sublinhado, alvo de 3rem × 2,75rem ou mais. Só aparece quando há valor. Ao clicar, ele limpa o campo e o erro e devolve o foco ao input. Apagar o texto à mão tem o mesmo efeito.
- Salvar: campo vazio manda `birthday: null` (CRM-24; no Editar, isso apaga o aniversário salvo). Campo preenchido manda o texto como está (`"12/03"`).
- Erro: `p#friend-birthday-error.field-error` (`role=alert`) logo abaixo, com `aria-invalid="true"` e `aria-describedby="friend-birthday-error"` no input só enquanto a mensagem existe, igual aos outros campos de 3.13. **Sem o sufixo** " Revise os dados e tente novamente." (decisão do PM, 29/10/2026): a mensagem é só o `detail` da API. Os outros erros do form não mudam. Continua um erro de campo por vez.
- Entrada incompleta ("1/", "12/3", "1203" sem completar): **decisão do PM (29/10/2026)**, recebe o mesmo erro "Essa data não existe. Ex.: 12/03.". Quem valida é a API: o front manda o texto como está e mostra o `detail` de `field` = `birthday`.

**Estados (ver `prints/aniversario-form-estados.png`)**

| Estado | Como fica |
|---|---|
| Vazio | Traço `neutral-500` com o placeholder "dd/mm" em `neutral-600`; sem "apagar". |
| Foco | Faixa de marca-texto + traço `focus` de 3px (igual a 3.13); a máscara já pôs a barra ("12/"); o "apagar" aparece. |
| Preenchido | "12/03" em Inter 16 `pen-ink` + "apagar". No Editar, o valor vem do `GET` e aparece assim. |
| Erro: data que não existe | Traço `error` + mensagem "Essa data não existe. Ex.: 12/03." (sem sufixo) numa linha de pauta; nada é salvo. Vale também para entrada incompleta. |
| Salvando | `fieldset` desabilitado, como o resto do form. |

**Selo "Aniversário hoje" no post-it (Quadro)**
- Só aparece quando a flag vinda da API é verdadeira; nos outros dias, nada muda no post-it.
- Visual: um adesivo de papel carimbado, só em CSS. Fundo `folha`, borda 1,5px `primaria-800`, raio 4, `sombra-papel`, giro de −2,5° e uma fita adesiva de sombra (`rgba(43,36,32,.08)`), como a faixa do post-it. Texto Inter 12/600 `primaria-800` (8,36:1 na folha) e ícone Lucide `cake` de 14px (ISC, livre) com `aria-hidden`.
- Posição: `position:absolute`, preso ao canto inferior direito do post-it (`right:-.25rem`, `top:calc(100% - .375rem)`), pendurado no vão de 1 linha que separa os post-its. Ele não ocupa altura no fluxo: o post-it segue com 6 linhas e não perde nome, etiquetas, "+N", tempo, nota nem o botão.
- Post-it estreito (container query, largura até `8.25rem`: 4 colunas em 1024 e 2 colunas em 360): o ícone sai e o padding diminui, para o texto caber numa linha. Com a fonte em 200%, o texto quebra em 2 linhas e cabe no vão, que também dobra. `pointer-events:none`, para não roubar clique do "falei agora".
- O texto está sempre escrito, então a cor não informa nada sozinha. Leitor de tela: `p.pi-selo#selo-{id}` e `li[aria-labelledby="pi-{id} selo-{id}"]`, lido como "Maria Eduarda Albuquerque, Aniversário hoje". Com `forced-colors`, a borda usa `CanvasText`.

```html
<!-- formulário -->
<div class="friend-field">
  <label for="friend-birthday">Aniversário (dia/mês, opcional)</label>
  <input id="friend-birthday" class="field" name="birthday" type="text" inputmode="numeric"
         maxlength="5" placeholder="dd/mm" autocomplete="off">
  <button type="button" class="clear-birthday" aria-label="Apagar aniversário" hidden>apagar</button>
  <!-- com erro: <p id="friend-birthday-error" class="field-error" role="alert">…</p> -->
</div>
<!-- post-it -->
<li class="pi g-familia" aria-labelledby="pi-12 selo-12">
  <h3 class="pi-nome" id="pi-12"><a href="#/amigos/12">Maria Eduarda Albuquerque</a></h3>
  …
  <p class="pi-selo" id="selo-12"><i data-lucide="cake" aria-hidden="true"></i><span>Aniversário hoje</span></p>
</li>
```

```css
/* formulário (FriendForm.vue, scoped) */
.friend-field:has(>[name="birthday"]){display:flex;flex-wrap:wrap;align-items:flex-start;column-gap:1rem;margin:var(--notebook-line) 0 0}
.friend-field:has(>[name="birthday"])>label,.friend-field:has(>[name="birthday"])>.field-error{flex:1 1 100%}
.friend-field>[name="birthday"]{flex:none;width:6rem;font-variant-numeric:tabular-nums;letter-spacing:.04em}
.friend-form .field::placeholder{color:var(--neutral-600);opacity:1}
.clear-birthday{flex:none;min-width:2.75rem;height:3rem;margin:-1rem 0 0;padding:1rem .25rem 0;border:0;background:none;cursor:pointer;
 font:500 .875rem/var(--notebook-line) var(--font-ui);color:var(--neutral-700);text-decoration:underline;text-underline-offset:3px}
.clear-birthday[hidden]{display:none}
/* post-it (PostitAmigo.vue) */
.pi{container-type:inline-size}
.pi-selo{position:absolute;right:-.25rem;top:calc(100% - .375rem);z-index:2;max-width:calc(100% + .5rem);box-sizing:border-box;margin:0;
 display:flex;align-items:center;gap:3px;padding:2px 6px 2px 5px;background:var(--folha);color:#7C3221;border:1.5px solid #7C3221;border-radius:4px;
 box-shadow:var(--sombra-papel);transform:rotate(-2.5deg);font:600 .75rem/1rem Inter,system-ui,sans-serif;pointer-events:none}
.pi-selo svg{width:14px;height:14px;flex:none}
.pi-selo::before{content:"";position:absolute;inset:-4px auto auto 50%;width:18px;height:7px;margin-left:-9px;background:rgba(43,36,32,.08);transform:rotate(4deg)}
@container (max-width:8.25rem){.pi-selo{padding:2px 5px}.pi-selo svg{display:none}}
@media (forced-colors:active){.pi-selo{border-color:CanvasText}}
```

**Microcopy:** rótulo "Aniversário (dia/mês, opcional)" · placeholder "dd/mm" · link "apagar" (`aria-label` "Apagar aniversário") · erro "Essa data não existe. Ex.: 12/03." (sem sufixo; o mesmo para data inexistente e entrada incompleta) · selo "Aniversário hoje".

**Critérios de aceite**
1. Salvar sem aniversário continua funcionando.
2. Um dd/mm válido salva e reaparece no Editar.
3. 31/04 mostra "Essa data não existe. Ex.: 12/03." e não salva.
4. 29/02 é aceito; em ano não bissexto, o selo aparece em 28/02.
5. O selo aparece só no dia.
6. Dá pra apagar o aniversário no Editar.

**Conferido nos protótipos:** `?qa=1` imprime "TUDO OK", sem rolagem horizontal, em 360, 390 e 1280, com e sem `?fonte=200`, nos 4 estados e no Editar. No quadro, com `?niver=todos`, o selo cabe numa linha em 360, 390, 1024 e 1280, não cobre o carimbo "falei agora" nem o post-it de baixo, e com 200% fica em 2 linhas dentro do vão.

**Em aberto (TL/PM):** nada. O nome da flag (`is_birthday_today`) e o `null` para limpar foram fechados pelo Tech Lead no CRM-24.

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
bom falar · quadro · amigos · + novo · config · Configurações · Sair · Entrar · Criar conta · Já tenho conta · E-mail · Senha · Repetir senha · Entrando… · Criando… · E-mail ou senha incorretos. · Este e-mail já tem conta. · As senhas não são iguais. · A senha precisa ter pelo menos 8 caracteres. · Caderno de amigos · seu ritmo com as pessoas que importam · Grupos · editar · pronto · + novo grupo · salvar · apagar grupo · cancelar · Você já tem um grupo com esse nome. · Apagar '{nome}'? {N} amigos saem desse grupo, mas continuam no seu caderno. · Apagar '{nome}'? Nenhum amigo está nesse grupo. · registrar · registrar contato · Falei com {nome} · Mensagem / Ligação / Encontro · Nota rápida (opcional) · Registrar · Novo amigo · Só o nome já basta. O resto pode vir depois. · Falar a cada · Salvar amigo · Os outros estão em dia. · Seu caderno está em branco.
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
**`QuadroView`** (`/quadro`): `.cabecalho-folha` (3.12) no topo da `.folha` + título "Quadro" e uma explicação de 2–3 linhas + legenda de grupos + 4 `QuadroColuna`. A data longa em Inter ("sábado, 17 de outubro") **sai**; o carimbo D…S + `DD/MM/AAAA` a substitui. A **legenda lista os grupos do usuário** (`GET /grupos/`), em ordem alfabética, cada um como etiqueta com nome e cor; "sem grupo" entra no fim se algum amigo não tiver grupo. Na legenda, a etiqueta tem 24px de altura e ocupa uma linha da pauta (margem de 4px acima e abaixo). Abaixo de 1024px, a legenda vem sem a frase de introdução.

**`QuadroColuna`**: `section` com `aria-labelledby`, título Fraunces 19/600 (1 linha) + descrição Inter 12 `neutro-600` (1 linha) + `ul` de post-its. O cabeçalho ocupa 2 linhas.

**`PostitAmigo`** (`li`), papel com grid de 8px por dentro e as bordas na pauta:
- Altura de **6 linhas (192px)** em todas as larguras (antes eram 5 a partir de 1024px; a linha a mais é para as etiquetas de grupo), com `row-gap` de 1 linha.
- Conteúdo: nome em Fraunces 19/600 com truncamento (link para `/amigos/:id`; o `cake` de "próximos 7 dias" saiu do escopo em 29/10/2026, ver 3.14) · **selo "Aniversário hoje"** só no dia, pendurado no canto inferior direito, fora do fluxo (3.14) · **etiquetas de grupo** (ver abaixo) · tempo em Inter 12/500 `neutro-700`, numa linha própria · nota em Caveat 21/24 `caneta`, até 2 linhas (`line-clamp`); quando as etiquetas ocupam 2 linhas, a nota cai para 1 linha, para o post-it manter a altura fixa. Sem nota: Inter 12 itálico, "sem nota ainda" · botão **"falei agora"**.
- Botão: `button` de **44px** de altura com o `.carimbo` de 28px dentro, em **`primaria-800`** (texto e borda), porque a `primaria` base não passa AA sobre as cores de post-it. Ícone `pen-line` só a partir de 1024px. O botão aparece em **todos** os post-its e em todas as larguras, inclusive em "Falei agora", onde serve para registrar mais um contato no mesmo dia.
- **Hover e foco do botão (pedido adicional de 27/10/2026):** preenchimento em traços irregulares, como canetinha, usando a terracota `primaria` com 38% de opacidade atrás do texto; durante hover e foco, o texto mantém a cor original `primaria-800`, conforme escolha do responsável. O preenchimento aparece da esquerda para a direita; com movimento reduzido, aparece sem animação. Substitui o fundo liso do hover do protótipo.
- Giro só em CSS: `--r` alternando −1,5° / 1° / 2° / −1° por `nth-child(4n+…)`. Hover e foco: 0°. Com `prefers-reduced-motion`, sem transição.

**Cor = primeiro grupo, mas nunca sozinha.** Um amigo pode estar em 0, 1 ou vários grupos (7.7), e a API devolve os grupos de cada amigo em ordem alfabética pelo nome.
- **Cor do post-it:** a cor do **primeiro** grupo da lista (ordem alfabética). Sem grupo: post-it `neutro` (`papel`) com a etiqueta "sem grupo".
- **Etiquetas:** o post-it mostra **todos** os grupos como etiquetas pequenas: nome e cor, 18px de altura, Inter 12/500 `neutro-700`, raio 4, padding 0 6px, fundo da cor do grupo e contorno interno de 1px `tinta` a 32% (para a etiqueta continuar visível quando tem a mesma cor do post-it). O nome está sempre escrito, então a cor nunca informa nada sozinha. Um nome longo trunca dentro da etiqueta, com reticências.
- **Quebra e "+N":** as etiquetas quebram linha (`flex-wrap`, `gap` de 4px) e ocupam no máximo 2 linhas (40px). Se não couberem, mostram as que cabem e, no fim, uma etiqueta "+N" (fundo folha, Inter 12/600) com `role="img"`, `aria-label="e mais N grupos: {nomes}"` e `title` com os mesmos nomes. Antes das etiquetas, um `sr-only` "Grupos:". A conta é feita no front, medindo a altura da caixa (no Vue, com `ResizeObserver`), porque depende da largura da coluna e da fonte.
- **Badges sem ícones de categoria (decisão de 29/10/2026):** mostram nome e cor. Os grupos têm nome livre, então casa, diploma, maleta e localização podem sugerir uma categoria que não corresponde ao grupo. O nome escrito identifica o grupo sem depender da cor. O check dos chips selecionados permanece como indicador de seleção.
- **Cores (todas já existem nos tokens, nenhuma nova):** `familia` → label UI **Pêssego** (`primaria-100`) · `faculdade` → **Amarelo** (`marca-texto`) · `trabalho` → **Azul** (`pauta`) · `vizinhanca` → **Verde** (`aba-verde`) · `neutro` → **Creme** (`papel`). Token interno ≠ label (tabela em 3.5). Os grupos são ilimitados, mas há só 5 cores, e vários grupos podem usar a mesma cor. A regra antiga ("máximo de 5 grupos; acima disso, o resto vai para 'sem grupo'") saiu.

### 7.4 Layout por largura
- **≥1280 (livro aberto):** um único scroller ocupa as duas páginas. Grid `1fr 1fr 112px 1fr 1fr` (a coluna de 112px é a espiral e a margem da página direita): "Faz um tempinho" e "Essa semana" ficam à esquerda; "Em dia" e "Falei agora", à direita. A dobra central (`inset` / gradiente) e as duas margens são decorativas e não rolam.
- **1024–1279:** uma página, 4 colunas iguais e abas à direita.
- **<1024 (celular): lista agrupada**, sem colunas com rolagem horizontal. Cada coluna vira uma seção vertical com post-its em grade de 2. "Faz um tempinho" e "Essa semana" vêm abertas. "Em dia" e "Falei agora" começam recolhidas, com um resumo ("Bruno Lima, Vó Teresa e mais 1 · mostrar", botão de 2 linhas = 64px, `aria-expanded`).
  - **Por quê:** (1) rolagem horizontal com encaixe esconde 3 de 4 colunas e ninguém descobre "Em dia"; (2) gesto horizontal compete com o "voltar" do sistema; (3) a folha do caderno já rola na vertical em todas as telas; (4) o que importa no celular é "com quem falar", e as duas primeiras seções respondem isso de cara.
- Abas no celular com **5 itens** ("bom falar", "quadro", "amigos", "+ novo", "config"): padding horizontal de 8px, `gap` de 4px e `left` de 12px, para caber em 390px. Altura **44px** no celular (ativa 48), para seguir a regra de alvo mínimo. Ver 3.7.
- O post-it de aniversário decorativo (3.2) **não** aparece no quadro, para não ser confundido com um amigo. No dia do aniversário, o post-it da pessoa ganha o selo "Aniversário hoje" (3.14).

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
- **Colunas: sem migração.** O status é calculado. Recomendação: uma função só (`status_contato(amigo, hoje)`) no backend, exposta como campo somente leitura no serializer de amigos (`SerializerMethodField`), que alimenta também a lista "Bom falar com". Alternativa: um `computed` no front, mas aí a lógica fica em dois lugares. O `GET /amigos/` precisa trazer `ultimo_contato`, `frequencia_dias`, `ultima_nota`, `birthday` ("dd/mm" ou `null`) e `is_birthday_today` (3.14, calculada no backend em America/Sao_Paulo).
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
10. **Formulários na pauta** (3.13, CRM-22, 29/10/2026): direção A "Escrever na pauta", escolhida pelo Vinicius para novo amigo, editar amigo, grupos e config (se ganhar campos); a capa `/entrar` fica fora. **Só visual, 1:1 com os campos do `FriendForm.vue` do CRM-16** (Nome, Falar a cada = número + unidade, Grupos; nenhum campo novo). Exceção à regra 6 da identidade aprovada: rótulos de campo e o carimbo "Salvar amigo" em Caveat; valor digitado e controles em Inter. Card CRM-22 em cima do CRM-16, que continua como está.
11. **Aniversário** (3.14, CRM-23, 29/10/2026): campo opcional "Aniversário (dia/mês)" no Novo/Editar (`birthday` = "dd/mm" ou `null`, limpar = `null`; dia e mês juntos ou nenhum) e selo "Aniversário hoje" no post-it só no dia. O selo é calculado no **backend** (America/Sao_Paulo; 29/02 vira 28/02 em ano não bissexto) e o front só lê a flag de aniversário hoje vinda da API (`is_birthday_today`), sem calcular datas. Decisões do PM: rótulo "(dia/mês, opcional)", erro sem sufixo e entrada incompleta com o mesmo erro, validada pela API. O selo é um adesivo carimbado em Inter 12/600 `primaria-800`, pendurado fora do fluxo no canto inferior direito, para não mudar a altura de 6 linhas do post-it. Sem ano, idade, notificação, lista de próximos, ordenar ou filtrar.

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

O pior caso é 5,51:1 (etiqueta ou post-it `vizinhanca`), acima de 4,5:1. Descartado para a etiqueta: `neutro-600` (4,25 no azul, 3,66 no verde). O contorno de 1px da etiqueta é só um reforço visual e não carrega informação, porque o nome vem escrito.
