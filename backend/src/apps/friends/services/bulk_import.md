# Importação de amigos em lote — CRM-30

`FriendBulkImportService.import_friends_for_owner` recebe a lista inteira já
validada por `FriendBulkImportSerializer`. O serializer reaproveita nome,
telefone e aniversário do cadastro. Ritmo e grupos enviados pelo cliente não
participam do contrato: o servidor define um mês e nenhum grupo.

O serviço mantém a primeira entrada de cada telefone normalizado. Sem telefone,
as entradas continuam distintas, inclusive na reimportação. `bulk_create` usa
`ignore_conflicts=True`: a constraint de telefone por dono ignora tanto amigos
existentes quanto um telefone gravado simultaneamente por outra requisição.
Nenhum amigo existente é alterado.

Os telefones são inseridos em ordem consistente para evitar deadlock entre
importações sobrepostas em ordens de entrada diferentes. A ordem da resposta
continua relacionada à entrada por `index`, começando em zero.

Não se pode contar objetos retornados por `bulk_create` como criações quando
conflitos são ignorados. Cada tentativa recebe UUID antes da inserção; uma
consulta posterior confirma quais desses IDs existem. Os telefones dos
ignorados são consultados somente no escopo do dono. A representação dos
criados reaproveita `FriendsService` com consultas coletivas, incluindo grupos
e dados do Quadro, sem chamar o cadastro individual para cada amigo.

Toda a escrita e as consultas para construir o resultado ficam em uma transação.
Campos inválidos rejeitam a lista antes da escrita; falhas do banco ou da
construção do resultado desfazem as inserções. Se uma exclusão concorrente
impedir identificar um telefone ignorado, o lote falha em vez de inventar um
resultado confirmado.

Limites: 1 a 5.000 entradas; corpo JSON de até 8 MiB. O limite comporta 5.000
nomes válidos de 100 caracteres mesmo com escapes Unicode. A view acessa
`request.body` antes do parser JSON para aplicar a checagem de tamanho do Django;
o parser do DRF, sozinho, lê diretamente o stream. Um proxy colocado na frente
do Django também precisa aceitar o tamanho do contrato.

O teste público do endpoint cobre autenticação, isolamento, normalização,
campos inválidos, rollback, repetição interna, reimportação, concorrência e
contagem de consultas. Uma resposta perdida na rede permanece incerta para o
cliente: sem telefone, repetir manualmente pode criar outro amigo. Não há
retentativa automática nem chave de idempotência neste escopo.
