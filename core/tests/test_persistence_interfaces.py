from dataclasses import dataclass
from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.persistence import InMemoryRepository, Repository, StorageProvider, UnitOfWork


@dataclass(slots=True)
class SampleEntity:
    id: str
    name: str


class ConcreteStorageProvider(StorageProvider):
    def __init__(self) -> None:
        self.connected = False
        self.cleared = False

    def connect(self) -> None:
        self.connected = True

    def disconnect(self) -> None:
        self.connected = False

    def is_connected(self) -> bool:
        return self.connected

    def clear(self) -> None:
        self.cleared = True


class ConcreteUnitOfWork(UnitOfWork):
    def __init__(self) -> None:
        self.entered = False
        self.committed = False
        self.rolled_back = False

    def __enter__(self) -> "ConcreteUnitOfWork":
        self.entered = True
        return self

    def __exit__(self, exc_type: object, exc: object, tb: object) -> None:
        if exc is not None:
            self.rollback()

    def commit(self) -> None:
        self.committed = True

    def rollback(self) -> None:
        self.rolled_back = True


def test_repository_storage_provider_and_unit_of_work_are_abstract():
    with pytest.raises(TypeError):
        Repository()

    with pytest.raises(TypeError):
        StorageProvider()

    with pytest.raises(TypeError):
        UnitOfWork()


def test_in_memory_repository_supports_add_get_list_exists_remove_and_clear():
    repository = InMemoryRepository[SampleEntity]()
    first = SampleEntity(id="ent-1", name="First")
    second = SampleEntity(id="ent-2", name="Second")

    repository.add(first)
    repository.add(second)

    assert repository.get("ent-1") == first
    assert repository.list() == [first, second]
    assert repository.exists("ent-2") is True
    assert repository.remove("ent-1") == first
    assert repository.exists("ent-1") is False

    repository.clear()
    assert repository.list() == []


def test_in_memory_repository_rejects_duplicate_ids_and_missing_entities():
    repository = InMemoryRepository[SampleEntity]()
    entity = SampleEntity(id="ent-1", name="First")
    repository.add(entity)

    with pytest.raises(ValueError):
        repository.add(entity)

    with pytest.raises(KeyError):
        repository.get("missing")

    with pytest.raises(KeyError):
        repository.remove("missing")


def test_concrete_storage_provider_and_unit_of_work_can_be_implemented():
    storage = ConcreteStorageProvider()
    assert storage.is_connected() is False

    storage.connect()
    assert storage.is_connected() is True
    storage.clear()
    assert storage.cleared is True
    storage.disconnect()
    assert storage.is_connected() is False

    unit_of_work = ConcreteUnitOfWork()
    with unit_of_work as active_uow:
        assert active_uow.entered is True
        active_uow.commit()

    assert unit_of_work.committed is True
    assert unit_of_work.rolled_back is False


def test_unit_of_work_rollback_can_be_triggered_on_exception():
    unit_of_work = ConcreteUnitOfWork()

    with pytest.raises(RuntimeError):
        with unit_of_work:
            raise RuntimeError("boom")

    assert unit_of_work.rolled_back is True
