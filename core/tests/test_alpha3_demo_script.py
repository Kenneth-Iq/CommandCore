from contextlib import redirect_stdout
from importlib.util import module_from_spec, spec_from_file_location
from io import StringIO
from pathlib import Path


def load_demo_module():
    script_path = Path(__file__).resolve().parents[1] / "scripts" / "demo_alpha3_kernel.py"
    spec = spec_from_file_location("demo_alpha3_kernel", script_path)
    module = module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_demo_alpha3_kernel_run_demo_builds_expected_state():
    module = load_demo_module()

    demo = module.run_demo()

    assert demo["orchestration"].status == "allowed_with_warnings"
    assert demo["dashboard_summary"]["mission_dashboard"]["mission_counts"]["completed"] == 1
    assert demo["dashboard_summary"]["executive_dashboard"]["objective_counts"] == {
        "total": 1,
        "with_missions": 1,
        "with_outcomes": 1,
    }
    assert demo["readiness_summary"]["status"] == "ready"
    assert demo["readiness_summary"]["summary_counts"]["workspace_count"] == 1


def test_demo_alpha3_kernel_main_prints_dashboard_and_readiness_summary():
    module = load_demo_module()
    buffer = StringIO()

    with redirect_stdout(buffer):
        exit_code = module.main()

    output = buffer.getvalue()
    assert exit_code == 0
    assert "CommandCore Alpha-3 Kernel Demo" in output
    assert "Dashboard Summary" in output
    assert "Health and Readiness Summary" in output
    assert '"status": "ready"' in output
