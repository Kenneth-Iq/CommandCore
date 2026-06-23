"""Agent registry for the first CommandCore AI Workforce implementation.

This module provides the first in-memory implementation of the CommandCore AI
Workforce registry described by the locked domain and architecture documents.
It is intentionally process-local and implementation-neutral: no database,
API surface, external services, or runtime integrations.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from commandcore_core.contracts import Agent, AgentRuntimeStatus, Status


class DuplicateAgentIdError(ValueError):
    """Raised when attempting to register an agent with an existing ID."""


class AgentNotFoundError(KeyError):
    """Raised when an agent ID does not exist in the registry."""


@dataclass(slots=True)
class AgentRegistry:
    """In-memory registry for canonical Agent contracts.

    This is the first implementation of the CommandCore AI Workforce registry.
    It owns only in-memory registration and lookup behavior for `Agent`
    contracts and deliberately avoids persistence, service exposure, or runtime
    orchestration concerns.
    """

    _agents: dict[str, Agent] = field(default_factory=dict)

    def register_agent(self, agent: Agent) -> Agent:
        """Register an agent by its canonical ID.

        Raises:
            DuplicateAgentIdError: If the agent ID is already present.
        """

        if agent.id in self._agents:
            raise DuplicateAgentIdError(f"Agent ID already registered: {agent.id}")

        self._agents[agent.id] = agent
        return agent

    def get_agent(self, agent_id: str) -> Agent:
        """Return an agent by ID.

        Raises:
            AgentNotFoundError: If the agent ID is unknown.
        """

        try:
            return self._agents[agent_id]
        except KeyError as exc:
            raise AgentNotFoundError(f"Agent ID not found: {agent_id}") from exc

    def list_agents(self) -> list[Agent]:
        """Return all registered agents in insertion order."""

        return list(self._agents.values())

    def find_by_name(self, name: str) -> list[Agent]:
        """Return all agents with a case-insensitive exact name match."""

        normalized = name.strip().casefold()
        return [
            agent
            for agent in self._agents.values()
            if agent.name.casefold() == normalized
        ]

    def find_by_status(self, status: Status) -> list[Agent]:
        """Return all agents matching the given general status."""

        return [agent for agent in self._agents.values() if agent.status == status]

    def find_by_runtime_status(
        self, runtime_status: AgentRuntimeStatus
    ) -> list[Agent]:
        """Return all agents matching the given runtime status."""

        return [
            agent
            for agent in self._agents.values()
            if agent.runtime_status == runtime_status
        ]

    def find_by_capability(self, capability_id: str) -> list[Agent]:
        """Return all agents that advertise the given capability ID."""

        return [
            agent
            for agent in self._agents.values()
            if capability_id in agent.capability_ids
        ]

    def add_capability(self, agent_id: str, capability_id: str) -> Agent:
        """Attach a capability ID to an agent if it is not already present."""

        agent = self.get_agent(agent_id)
        if capability_id in agent.capability_ids:
            return agent

        updated = agent.model_copy(
            update={"capability_ids": [*agent.capability_ids, capability_id]}
        )
        self._agents[agent_id] = updated
        return updated

    def remove_capability(self, agent_id: str, capability_id: str) -> Agent:
        """Remove a capability ID from an agent if it is present."""

        agent = self.get_agent(agent_id)
        if capability_id not in agent.capability_ids:
            return agent

        updated = agent.model_copy(
            update={
                "capability_ids": [
                    existing
                    for existing in agent.capability_ids
                    if existing != capability_id
                ]
            }
        )
        self._agents[agent_id] = updated
        return updated
