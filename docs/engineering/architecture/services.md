# Serviços

Um serviço representa um caso de uso de um domínio. Exemplos: decidir se um contato está atrasado, computar a coluna do quadro para um amigo, atualizar a data do último contato. Os serviços concentram toda a lógica de negócio e são consumidos por views, admin e outros serviços.

## Padrão

- Sempre OOP. Todo serviço é uma classe terminada em `Service`, em `services/` do app dono.
- Use o ORM direto quando ele resolve o caso de uso. Não crie uma camada de repositories sem necessidade real.
- Dê nomes de método que expressem a operação: `calculate_column`, `record_contact`, `list_friends`.
- Mantenha poucos métodos públicos. Helpers internos começam com `_`.
- Exponha **um único método público por caso de uso autocontido**: o ponto de entrada. Quem usa o serviço chama só esse método, e todo o resto (buscar os registros, iterar, aplicar a regra, persistir) acontece dentro dele, em helpers privados. Métodos públicos separados para "listar candidatos" e "processar um candidato" acoplam a orquestração ao consumidor: cada view teria que repetir a ordem certa das chamadas.

```python
# Ruim: o consumidor orquestra
service = BoardService()
for friend in service.get_friends_to_check():
    friend.column = service.calculate_column(friend, friend.last_contact)
    friend.save()

# Bom: o consumidor só delega
friends_service = FriendsService(friends_for_owner, owner)
board_friends = friends_service.list_friends()
```

- O nome do ponto de entrada diz o caso de uso (`list_friends`), não um genérico como `main`, `execute` ou `handle`.
- Prefira manter lógica simples no método consumidor quando ela é usada uma única vez. Extraia um helper privado quando ele for reutilizado, encapsular uma regra de negócio relevante ou melhorar substancialmente a legibilidade. Não crie helpers antecipando reutilização.
- Constantes do serviço são variáveis de classe.

```python
class BoardService:
    DAYS_JUST_TALKED = 1
    DAYS_THIS_WEEK = 7

    def calculate_column(
        self, friend: Friend, last_contact: datetime | None
    ) -> Column:
        if last_contact is None:
            return Column.OVERDUE

        days_since = self.get_days_since_contact(last_contact)
        if days_since <= self.DAYS_JUST_TALKED:
            return Column.JUST_TALKED

        cadence_in_days = self.get_cadence_in_days(friend)
        days_until = cadence_in_days - days_since
        if days_until <= 0:
            return Column.OVERDUE
        if days_until <= self.DAYS_THIS_WEEK:
            return Column.THIS_WEEK
        return Column.ON_TRACK
```
```

## Evite abstrações especulativas (YAGNI)

- Não mantenha protocolo e classe abstrata duplicados para o mesmo contrato. Escolha uma forma tipada e use o tipo concreto enquanto houver uma única implementação.
- Interface, adaptador, factory ou parâmetro que só tem uma implementação ou só assume um valor sai do código.
- Funções de conveniência não usadas e código morto saem no próprio PR.
- Não generalize um caso de uso que hoje só tem um tipo de objeto.

## Quando há várias implementações de verdade

Quando um contrato tem várias implementações reais (ex.: diferentes estratégias de agrupamento), a classe base fica em `interfaces/` e concentra o que é comum. Uma implementação não reescreve uma lógica que a base já oferece; se reescrever, o review reprova.
