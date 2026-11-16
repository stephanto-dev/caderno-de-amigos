# Leitura local da agenda — CRM-30

O contrato usado pela interface é `read_agenda_for_import(file, signal?)`, em
`agenda-worker.ts`. Ele valida tamanho e extensão antes de criar um Web Worker,
envia o `File` por structured clone e encerra o worker ao concluir, falhar ou
receber cancelamento. A tela deve cancelar a leitura ao sair e limpar o campo
de arquivo depois da leitura. Nenhum leitor faz upload ou consulta uma API.

## Dados e limites

- Aceita `.vcf` 2.1/3.0/4.0 e `.csv` do Google. MIME não decide o formato, pois
  arquivos exportados podem vir com tipo genérico ou vazio.
- Limites: 5 MiB e 5.000 registros, antes de descartar quem não tem nome ou
  juntar duplicados. O arquivo inteiro é rejeitado quando excede um limite.
- Só nome, telefones e aniversário sobrevivem à leitura. Foto, e-mail, empresa,
  endereço e outras propriedades não entram no resultado.
- Telefones usam a normalização de `phone.ts`. Números inválidos são ignorados;
  o contato pode entrar sem telefone. Primeiro prefere um celular rotulado no
  arquivo; depois, um identificado pelos metadados da biblioteca; por último,
  o primeiro número válido. As alternativas continuam disponíveis para edição.
- A Contact Picker API remove os rótulos dos telefones, então esse caminho
  depende da classificação do número. Isso não confirma que ele está ativo.
- O aniversário vira `dd/mm`. Ano e horário são descartados; o dia e o mês são
  validados como no formulário, incluindo 29/02. Datas inválidas ficam vazias.
- Sem nome, o contato é descartado e contado. Nome igual não é duplicação.
- Mesmo telefone escolhido e normalizado junta entradas do arquivo: mantém o
  primeiro nome/aniversário, reúne números alternativos e conta ocorrências em
  `source_count`. Sem telefone válido, cada contato continua separado.
- IDs identificam linhas apenas nesta leitura. Não são uma identidade durável
  para reconhecer alguém ao importar outro arquivo.

O leitor não consulta os amigos existentes. `agenda-import.ts` compara o telefone
atualmente escolhido com a listagem do usuário e refaz essa comparação quando
ele muda o número. Também impede escolher o mesmo telefone em duas linhas. O
banco continua sendo a proteção definitiva contra conflito.

## Tela e salvamento individual

`/amigos/importar` pertence à aba Amigos. Arquivos abrem uma lista com busca,
inicialmente desmarcada. `AgendaContactList` usa o virtualizador sobre a rolagem
da `.page-content`, mede alturas variáveis e mantém a seleção fora das linhas
renderizadas. As setas, Home e End percorrem os contatos disponíveis; `/` abre
a busca fora dos campos de edição.

O botão nativo depende de contexto seguro, janela principal e suporte real à
Contact Picker API, sem identificar o navegador pelo nome. A chamada solicita
somente `name` e `tel`, com seleção múltipla e ativação direta pelo clique.
Cancelamento não mostra erro. A seleção nativa vai direto aos cartões; amigos
já cadastrados são ignorados e contados separadamente na conclusão.

O formulário é o mesmo do cadastro e da edição. Recebe valores iniciais, emite
rascunho/estado de salvamento e continua centralizando o POST individual.
Rascunhos ficam em memória ao voltar à lista; amigos salvos ficam bloqueados.
Depois do primeiro salvamento, voltar mostra uma confirmação explicando que os
amigos já criados continuam no caderno. O estado da agenda é limpo ao sair da rota.

Desvios aprovados da issue: Pular preserva nome, telefone e aniversário editados,
mas salva com um mês e nenhum grupo; criar grupos continua disponível pelo
seletor existente. Ambos estão comentados junto ao código que aplica a regra.

Erros mantêm o cartão. Enquanto salva, ações repetidas e saída pela navegação
interna ficam bloqueadas. Falha de rede não dispara nova tentativa automática e
informa que o resultado não pôde ser confirmado. Sem telefone, repetir uma
tentativa cujo resultado se perdeu ainda pode criar outro amigo.

A segunda página do desktop reaproveita `NewFriendDraft` para o cartão atual e
mostra uma prévia da seleção. Após o teste físico no celular, as ações dos
cartões passaram a ficar no final do formulário, depois dos grupos, na rolagem
normal da folha. Isso substitui a decisão anterior de fixá-las no rodapé, que
cobria campos. Permitem quebra de linha em larguras pequenas.

Salvar os restantes abre uma confirmação com quantidade e regra de um mês/sem
grupo. Envia os dados pessoais de todos os rascunhos restantes, inclusive o
cartão atual, em um único POST para `/api/friends/bulk-import/`. O servidor
revalida e normaliza tudo antes de gravar. A resposta precisa classificar cada
posição exatamente uma vez; resultado incompleto não vira contagem de sucesso.
Criados atualizam a lista compartilhada; ignorados aparecem separadamente, com
links para os amigos existentes. Se houver erro, o cartão fica preenchido e a
mensagem recebe foco. Um erro de campo identifica a posição e o nome do cartão.

A pauta da importação repete um tile de 32px. O gradiente anterior, dimensionado
pela área inteira, se deformou no navegador com 5.000 linhas virtuais. Na lista
de seleção, as ações cobrem o respiro inferior da folha; o virtualizador reserva
esse espaço ao navegar por teclado.
A moldura externa usa `overflow: clip` na importação: com `hidden`, o navegador
também rolava a moldura ao focar um controle, deslocando a folha para fora da
tela. A rolagem continua na `.page-content`.

## Formatos

O vCard é percorrido preservando os bytes. Primeiro junta linhas dobradas e
continuações quoted-printable; depois decodifica os campos utilizados com o
charset declarado ou UTF-8. Isso evita perder acentos de exportações antigas.
`FN` é preferido; sem ele, `N` compõe o nome. Propriedades agrupadas (`item1.TEL`),
telefones `tel:`, TYPE=CELL e o formato 2.1 `TEL;CELL` são aceitos. Estrutura
truncada, versão não suportada e nome indecodificável rejeitam o arquivo inteiro.

O CSV usa PapaParse, sem converter texto em número. Aceita cabeçalhos atuais
(`First Name`, `Phone 1 - Label`) e antigos (`Name`, `Given Name`,
`Phone 1 - Type`), além dos equivalentes em português cobertos nos testes.
Nomes não são inventados a partir de e-mail ou empresa. Colunas desconhecidas
são ignoradas, mas linhas quebradas ou com colunas a mais/menos são rejeitadas.
Um CSV com apenas a coluna de nome é válido.

Referências: [campos do Google](https://support.google.com/contacts/answer/15147365?hl=en),
[vCard 3.0](https://www.rfc-editor.org/rfc/rfc2426.html),
[vCard 4.0](https://www.rfc-editor.org/rfc/rfc6350.html),
[PapaParse](https://www.papaparse.com/docs),
[Contact Picker](https://developer.chrome.com/docs/capabilities/web-apis/contact-picker?hl=en).

## Verificação

`agenda-file.test.ts` testa o contrato público com fixtures fictícias de formatos
de exportação e entradas inválidas. `agenda-worker.test.ts` verifica comunicação,
cancelamento e liberação do worker; `agenda.worker.test.ts` exercita a entrada de
mensagens e os leitores reais, incluindo falha de acesso sem expor dados do erro.
`ImportFriendsView.test.ts` exercita o fluxo pelos controles, com o virtualizador
real e worker/API simulados. `contact-picker.test.ts` verifica o contrato nativo.
As fixtures não são exportações reais de dispositivos. A aceitação final ainda
exige arquivos reais com contatos fictícios em iPhone e Android.
