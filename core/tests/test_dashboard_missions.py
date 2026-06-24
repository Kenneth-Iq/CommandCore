from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.bootstrap import create_in_memory_kernel
from commandcore.contracts import Mission, MissionStatus, Ownership, OwnershipKind
from commandcore.dashboard import MissionDashboardService


def make_ownership() -> Ownership:
    return Ownership(
        kind=OwnershipKind.DOMAIN,
        reference="commandcore.architecture",
        display_name="CommandCore Architecture",
    )


def make_mission(mission_id: str, *, title: str) -> Mission:
    return Mission(
        id=mission_id,
        title=title,
        status=MissionStatus.REQUESTED,
        ownership=make_ownership(),
        requested_by="jarvis",
        scope=["project:proj-jarvis"],
        capability_ids=["cap-search"],
        approval_required=True,
        required_output="Cited review summary",
    )


def test_mission_dashboard_service_reports_counts_and_recent_activity():
    kernel = create_in_memory_kernel()
    active = kernel.mission_engine.create_mission(make_mission("mission-active", title="Prepare review"))
    completed = kernel.mission_engine.create_mission(
        make_mission("mission-completed", title="Ship executive summary")
    )
    failed = kernel.mission_engine.create_mission(
        make_mission("mission-failed", title="Validate rollout plan")
    )
    kernel.mission_engine.complete_mission(
        completed.id,
        result_summary="Executive summary delivered.",
    )
    kernel.mission_engine.fail_mission(
        failed.id,
        reason="Missing approved context.",
    )

    dashboard = MissionDashboardService(
        mission_engine=kernel.mission_engine,
        audit_trail=kernel.audit_trail,
    )

    counts = dashboard.mission_counts()
    throughput = dashboard.mission_throughput()
    recent_activity = dashboard.recent_mission_activity()

    assert counts == {"total": 3, "active": 1, "completed": 1, "failed": 1}
    assert [mission["mission_id"] for mission in dashboard.active_missions()] == [active.id]
    assert [mission["mission_id"] for mission in dashboard.completed_missions()] == [completed.id]
    assert [mission["mission_id"] for mission in dashboard.failed_missions()] == [failed.id]
    assert throughput == {
        "created": 3,
        "completed": 1,
        "failed": 1,
        "terminal": 2,
        "completion_rate": 0.5,
    }
    assert any(event["event_name"] == "MissionCompleted" for event in recent_activity)
    assert any(event["event_name"] == "MissionFailed" for event in recent_activity)

    built = dashboard.build_dashboard()
    assert built["mission_counts"] == counts
    assert built["mission_throughput"] == throughput
