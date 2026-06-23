from .base import Engine, EngineResult
from .mock import MockEngine


def make_engine(name: str, settings) -> Engine:
    if name == "mock":
        return MockEngine()
    if name == "hermes":
        from .hermes import HermesEngine  # lazy — requires hermes-agent installed
        return HermesEngine(settings)
    raise ValueError(f"Unknown engine: {name}")


__all__ = ["Engine", "EngineResult", "MockEngine", "make_engine"]
