from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore_core.contracts import (
    LifecycleState,
    Mission,
    MissionStatus,
    Ownership,
    OwnershipKind,
    PermissionLevel,
    Status,
    Task,
)
from commandcore_core.mission import (
    DuplicateMissionIdError,
    MissionEngine,
    MissionNotFoundError,
)


def make_ownership() -> Ownership:
    return Ownership(
        kind=OwnershipKind.DOMAIN,
        reference="commandcore.architecture",
        display_name="CommandCore Architecture",
    )


def make_mission(
    mission_id: str,
    *,
    title: str = "Prepare capability review",
    status: MissionStatus = MissionStatus.REQUESTED,
) -> Mission:
    return Mission(
        id=mission_id,
        title=title,
        status=status,
        ownership=make_ownership(),
        requested_by="jarvis",
        scope=["project:jarvis", "knowledge:innovation-lab"],
        capability_ids=["cap-github-review-workflow"],
        approval_required=True,
        required_output="Cited review summary",
    )


def make_task(task_id: str, *, objective: str = "Prepare review context") -> Task:
    return Task(
        id=task_id,
        objective=objective,
        status=MissionStatus.REQUESTED,
        ownership=make_ownership(),
        project_id="proj-jarvis",
        capability_id="cap-github-review-workflow",
        scope=["knowledge", "project-context"],
        constraints=["no-secret-access"],
        expected_output="Capability review packet",
    )


def test_create_and_get_mission():
    engine = MissionEngine()
    mission = make_mission("mission-1")

    engine.create_mission(mission)

    assert engine.get_mission("mission-1") == mission


def test_create_duplicate_mission_id_raises():
    engine = MissionEngine()
    mission = make_mission("mission-1")
    engine.create_mission(mission)

    with pytest.raises(DuplicateMissionIdError):
        engine.create_mission(mission)


def test_get_missing_mission_raises():
    engine = MissionEngine()

    with pytest.raises(MissionNotFoundError):
        engine.get_mission("missing-mission")


def test_list_missions_returns_registered_values():
    engine = MissionEngine()
    mission_a = make_mission("mission-1")
    mission_b = make_mission("mission-2", title="Prepare infrastructure review")
    engine.create_mission(mission_a)
    engine.create_mission(mission_b)

    assert engine.list_missions() == [mission_a, mission_b]


def test_update_status_updates_mission():
    engine = MissionEngine()
    mission = engine.create_mission(make_mission("mission-1"))

    updated = engine.update_status(mission.id, MissionStatus.ASSIGNED)

    assert updated.status == MissionStatus.ASSIGNED
    assert engine.get_mission(mission.id).status == MissionStatus.ASSIGNED


def test_assign_agent_updates_mission():
    engine = MissionEngine()
    mission = engine.create_mission(make_mission("mission-1"))

    updated = engine.assign_agent(mission.id, "agent-hermes")

    assert updated.assigned_agent_id == "agent-hermes"
    assert engine.get_mission(mission.id).assigned_agent_id == "agent-hermes"


def test_add_task_and_list_tasks():
    engine = MissionEngine()
    mission = engine.create_mission(make_mission("mission-1"))
    task_a = make_task("task-1")
    task_b = make_task("task-2", objective="Prepare cited summary")

    engine.add_task(mission.id, task_a)
    engine.add_task(mission.id, task_b)

    assert engine.list_tasks(mission.id) == [task_a, task_b]


def test_complete_mission_marks_completed():
    engine = MissionEngine()
    mission = engine.create_mission(make_mission("mission-1"))

    updated = engine.complete_mission(
        mission.id, result_summary="Capability review completed."
    )

    assert updated.status == MissionStatus.COMPLETED
    assert engine.get_mission(mission.id).status == MissionStatus.COMPLETED


def test_fail_mission_marks_failed():
    engine = MissionEngine()
    mission = engine.create_mission(make_mission("mission-1"))

    updated = engine.fail_mission(mission.id, reason="Missing approved context.")

    assert updated.status == MissionStatus.FAILED
    assert engine.get_mission(mission.id).status == MissionStatus.FAILED


def test_task_operations_raise_for_missing_mission():
    engine = MissionEngine()
    task = make_task("task-1")

    with pytest.raises(MissionNotFoundError):
        engine.add_task("missing-mission", task)

    with pytest.raises(MissionNotFoundError):
        engine.list_tasks("missing-mission")


def test_status_operations_raise_for_missing_mission():
    engine = MissionEngine()

    with pytest.raises(MissionNotFoundError):
        engine.update_status("missing-mission", MissionStatus.COMPLETED)

    with pytest.raises(MissionNotFoundError):
        engine.assign_agent("missing-mission", "agent-hermes")

    with pytest.raises(MissionNotFoundError):
        engine.complete_mission("missing-mission")

    with pytest.raises(MissionNotFoundError):
        engine.fail_mission("missing-mission", "Missing context.")
