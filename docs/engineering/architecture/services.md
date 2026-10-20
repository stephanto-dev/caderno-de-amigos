# Serviços

Um serviço representa um caso de uso de um domínio. Exemplos: decidir se um contato está atrasado, computar a coluna do quadro para um amigo, atualizar a data do último contato. Os serviços concentram toda a lógica de negócio e são consumidos por views, admin e outros serviços.

## Padrão

- Sempre OOP. Todo serviço é uma classe terminada em `Service`, em `services/` do app dono.
- Use o ORM direto quando ele resolve o caso de uso. Não crie uma camada de repositories sem necessidade real.
- Dê nomes de método que expressem a operação: `compute_board_column`, `record_contact`, `update_last_contact_date`.
- Mantenha poucos métodos públicos. Helpers internos começam com `_`.
- Exponha **um único método público por caso de uso autocontido**: o ponto de entrada. Quem usa o serviço chama só esse método, e todo o resto (buscar os registros, iterar, aplicar a regra, persistir) acontece dentro dele, em helpers privados. Métodos públicos separados para "listar candidatos" e "processar um candidato" acoplam a orquestração ao consumidor: cada view teria que repetir a ordem certa das chamadas.

```python
# Ruim: o consumidor orquestra
service = BoardService(user_id)
for friend in service.get_friends_to_check():
    service.update_board_column(friend)

# Bom: o consumidor só delega
BoardService(user_id).update_board_columns_for_all_friends()
```

- O nome do ponto de entrada diz o caso de uso (`update_board_columns_for_all_friends`), não um genérico como `main`, `execute` ou `handle`.
- Prefira manter lógica simples no método consumidor quando ela é usada uma única vez. Extraia um helper privado quando ele for reutilizado, encapsular uma regra de negócio relevante ou melhorar substancialmente a legibilidade. Não crie helpers antecipando reutilização.
- Constantes do serviço são variáveis de classe.

```python
class BoardService:
    CONTACT_NOW_THRESHOLD_DAYS = 3

    def __init__(self, user_id: int) -> None:
        self.user_id = user_id

    def update_board_columns_for_all_friends(self) -> None:
        for friend in self._get_friends():
            friend.board_column = self._compute_board_column(friend)
            friend.save()

    def _get_friends(self) -> QuerySet[Friend]:
        ...

    def _compute_board_column(self, friend: Friend) -> str:
        ...
```

## Evite abstrações especulativas (YAGNI)

- Não mantenha protocolo e classe abstrata duplicados para o mesmo contrato. Escolha uma forma tipada e use o tipo concreto enquanto houver uma única implementação.
- Interface, adaptador, factory ou parâmetro que só tem uma implementação ou só assume um valor sai do código.
- Funções de conveniência não usadas e código morto saem no próprio PR.
- Não generalize um caso de uso que hoje só tem um tipo de objeto.

## Quando há várias implementações de verdade

Quando um contrato tem várias implementações reais (ex.: diferentes estratégias de agrupamento), a classe base fica em `interfaces/` e concentra o que é comum. Uma implementação não reescreve uma lógica que a base já oferece; se reescrever, o review reprova.
