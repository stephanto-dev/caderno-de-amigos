import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.amigos.models import Amigo, Contato, Grupo


@pytest.mark.django_db
class TestAmigo:
    def test_amigo_accepts_two_groups_and_contact_rhythm(self) -> None:
        # Arrange
        owner = get_user_model().objects.create_user(username="ana")
        familia = Grupo.objects.create(
            owner=owner, nome="Família", cor=Grupo.Cor.FAMILIA
        )
        faculdade = Grupo.objects.create(
            owner=owner, nome="Faculdade", cor=Grupo.Cor.FACULDADE
        )

        # Act
        amigo = Amigo.objects.create(
            owner=owner,
            nome="Bia",
            ritmo_quantidade=2,
            ritmo_unidade=Amigo.RitmoUnidade.SEMANA,
        )
        amigo.grupos.add(familia, faculdade)

        # Assert
        assert set(amigo.grupos.all()) == {familia, faculdade}
        assert amigo.ritmo_quantidade == 2
        assert amigo.ritmo_unidade == Amigo.RitmoUnidade.SEMANA

    def test_amigo_rejects_zero_contact_rhythm_on_full_clean(self) -> None:
        # Arrange
        owner = get_user_model().objects.create_user(username="ana")
        amigo = Amigo(
            owner=owner,
            nome="Bia",
            ritmo_quantidade=0,
            ritmo_unidade=Amigo.RitmoUnidade.DIA,
        )

        # Act / Assert
        with pytest.raises(ValidationError) as error:
            amigo.full_clean()
        assert "ritmo_quantidade" in error.value.message_dict


@pytest.mark.django_db
class TestGrupo:
    def test_grupo_rejects_duplicate_name_for_same_owner(self) -> None:
        # Arrange
        owner = get_user_model().objects.create_user(username="ana")
        Grupo.objects.create(owner=owner, nome="Família", cor=Grupo.Cor.FAMILIA)
        grupo = Grupo(owner=owner, nome="Família", cor=Grupo.Cor.NEUTRO)

        # Act / Assert
        with pytest.raises(ValidationError):
            grupo.full_clean()

    def test_grupo_accepts_same_name_for_another_owner(self) -> None:
        # Arrange
        first_owner = get_user_model().objects.create_user(username="ana")
        second_owner = get_user_model().objects.create_user(username="bia")
        Grupo.objects.create(owner=first_owner, nome="Família", cor=Grupo.Cor.FAMILIA)

        # Act
        grupo = Grupo.objects.create(
            owner=second_owner, nome="Família", cor=Grupo.Cor.FAMILIA
        )

        # Assert
        assert Grupo.objects.filter(nome="Família").count() == 2
        assert grupo.owner == second_owner


@pytest.mark.django_db
class TestContato:
    def test_contato_is_deleted_with_amigo(self) -> None:
        # Arrange
        owner = get_user_model().objects.create_user(username="ana")
        amigo = Amigo.objects.create(
            owner=owner,
            nome="Bia",
            ritmo_quantidade=1,
            ritmo_unidade=Amigo.RitmoUnidade.MES,
        )
        Contato.objects.create(amigo=amigo, tipo=Contato.Tipo.MENSAGEM)

        # Act
        amigo.delete()

        # Assert
        assert not Contato.objects.exists()

    def test_contato_default_date_is_timezone_aware_after_save(self) -> None:
        # Arrange
        owner = get_user_model().objects.create_user(username="ana")
        amigo = Amigo.objects.create(
            owner=owner,
            nome="Bia",
            ritmo_quantidade=1,
            ritmo_unidade=Amigo.RitmoUnidade.ANO,
        )

        # Act
        contato = Contato.objects.create(amigo=amigo, tipo=Contato.Tipo.LIGACAO)
        contato.refresh_from_db()

        # Assert
        assert timezone.is_aware(contato.data)
