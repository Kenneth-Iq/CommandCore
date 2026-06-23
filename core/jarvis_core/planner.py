from __future__ import annotations

import json
import logging
import re

from .roles import RoleConfig

logger = logging.getLogger(__name__)

MAX_STAGES = 3
MAX_TASKS_PER_STAGE = 4
FINDINGS_CHAR_LIMIT = 4_000
PLAN_ATTEMPTS = 3

# Fleet roles the planner may deploy (prime = orchestrator, sentinel = scheduled).
DEPLOYABLE = ("researcher", "analyst", "writer", "operator")

# Canonical dependency order — research feeds analysis feeds writing/action.
# We re-stage every plan by this so downstream agents actually receive upstream
# findings (the model otherwise lumps everyone into one parallel stage).
ROLE_TIER = {"researcher": 0, "analyst": 1, "writer": 2, "operator": 2, "prime": 1}

PLAN_PROMPT = """You are Jarvis Prime, planning a mission for your agent fleet.

Available roles and their duties:
{roles_block}

Break the mission into 1-{max_stages} sequential stages. Tasks within a stage
run in parallel; a later stage receives the results of earlier stages. Use the
fewest agents that genuinely help.

RULES:
- If the mission needs ANY current facts, figures, market data, prices, or news
  you cannot state with certainty from memory, you MUST put a `researcher` task
  in stage 1 — never answer factual questions yourself.
- Keep each task instruction to a single line.

Output PLAIN TEXT only — no JSON, no markdown. One task per line as
`role: instruction`, with a `STAGE n` header before each stage. Exactly this
layout:

STAGE 1
researcher: what to find out
analyst: what to compute from the findings
STAGE 2
writer: what to write up

MISSION: {prompt}"""

SITREP_PROMPT = """SITREP REQUEST. You are Jarvis Prime. Your fleet has finished
a mission. Synthesize the task results below into a brief commander-facing
report: outcome first, then key findings (keep the agents' figures and source
URLs), then anything that failed or needs a decision. Keep it under 250 words.

MISSION: {prompt}

TASK RESULTS:
{results_block}"""

_TASK_LINE = re.compile(
    rf"^\s*[-*\d.]*\s*({'|'.join(DEPLOYABLE)})\s*[:|\-–]\s*(.+\S)\s*$",
    re.IGNORECASE,
)
_STAGE_LINE = re.compile(r"^\s*#*\s*stage\b", re.IGNORECASE)


class PlanError(ValueError):
    pass


def fallback_plan(prompt: str) -> dict:
    return {"stages": [[{"role": "prime", "instruction": prompt}]]}


def _clamp(stages: list[list[dict]]) -> dict:
    stages = [s[:MAX_TASKS_PER_STAGE] for s in stages if s][:MAX_STAGES]
    if not stages:
        raise PlanError("plan validated to zero stages")
    return {"stages": stages}


def validate_plan(raw: str, roles: dict[str, RoleConfig]) -> dict:
    """Parse a JSON plan. Raises PlanError when unusable. Kept as the preferred
    path when the model happens to emit clean JSON."""
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise PlanError("no JSON object in plan output")
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError as exc:
        raise PlanError(f"invalid JSON: {exc}") from exc

    stages_in = data.get("stages")
    if not isinstance(stages_in, list) or not stages_in:
        raise PlanError("plan has no stages")

    stages: list[list[dict]] = []
    for stage in stages_in:
        if not isinstance(stage, list):
            continue
        tasks = []
        for task in stage:
            if not isinstance(task, dict):
                continue
            role = str(task.get("role", "")).strip().lower()
            instruction = str(task.get("instruction", "")).strip()
            if role not in roles or not instruction:
                raise PlanError(f"unknown role or empty instruction: {task}")
            tasks.append({"role": role, "instruction": instruction})
        if tasks:
            stages.append(tasks)
    return _clamp(stages)


def parse_plan_text(raw: str, roles: dict[str, RoleConfig]) -> dict:
    """Parse the line-based plan format. Robust to the model's surrounding
    prose — non-matching lines are simply ignored. This is the primary path
    because nemotron reliably breaks JSON (raw newlines in instruction
    strings, missing commas)."""
    stages: list[list[dict]] = []
    current: list[dict] = []
    for line in raw.splitlines():
        if _STAGE_LINE.match(line):
            if current:
                stages.append(current)
                current = []
            continue
        m = _TASK_LINE.match(line)
        if not m:
            continue
        role = m.group(1).lower()
        instruction = m.group(2).strip()
        if role in roles and instruction:
            current.append({"role": role, "instruction": instruction})
    if current:
        stages.append(current)
    return _clamp(stages)


def parse_plan(raw: str, roles: dict[str, RoleConfig]) -> dict:
    """Try JSON first (clean when present), then the line format."""
    try:
        return validate_plan(raw, roles)
    except PlanError:
        return parse_plan_text(raw, roles)


def sequence_plan(plan: dict) -> dict:
    """Regroup tasks into dependency-ordered stages (researcher → analyst →
    writer/operator), preserving parallelism within a tier. This guarantees a
    later agent receives earlier agents' findings even when the model dumps
    every role into a single stage."""
    tiers: dict[int, list[dict]] = {}
    for stage in plan["stages"]:
        for task in stage:
            tier = ROLE_TIER.get(task["role"], 1)
            tiers.setdefault(tier, []).append(task)
    stages = [tiers[t][:MAX_TASKS_PER_STAGE] for t in sorted(tiers)]
    return {"stages": stages[:MAX_STAGES]}


def generate_plan(engine, roles: dict[str, RoleConfig], prompt: str) -> tuple[dict, bool]:
    """Returns (plan, used_fallback). Retries because nemotron output is
    noisy; the line parser tolerates prose so retries rarely trigger."""
    roles_block = "\n".join(
        f"- {name}: {cfg.display_name}" for name, cfg in roles.items()
        if name not in ("prime", "sentinel")
    )
    plan_prompt = PLAN_PROMPT.format(roles_block=roles_block,
                                     max_stages=MAX_STAGES, prompt=prompt)
    for attempt in range(1, PLAN_ATTEMPTS + 1):
        try:
            raw = engine.complete(role=roles["prime"], prompt=plan_prompt)
            return sequence_plan(parse_plan(raw, roles)), False
        except Exception as exc:
            logger.warning("Plan generation attempt %d/%d failed (%s)",
                           attempt, PLAN_ATTEMPTS, exc)
    logger.warning("Plan generation exhausted retries — falling back to prime-only plan")
    return fallback_plan(prompt), True


def summarize_plan(plan: dict) -> str:
    lines = ["Execute mission plan:"]
    for i, stage in enumerate(plan["stages"], 1):
        for task in stage:
            lines.append(f"  stage {i} — {task['role']}: {task['instruction'][:120]}")
    return "\n".join(lines)


def build_sitrep_prompt(prompt: str, results: list[dict]) -> str:
    blocks = []
    for r in results:
        text = (r.get("result_summary") or "")[:FINDINGS_CHAR_LIMIT]
        blocks.append(f"[{r['agent_id']} / {r['role']} / {r['status']}]\n{text}")
    return SITREP_PROMPT.format(prompt=prompt, results_block="\n\n".join(blocks))


def findings_block(results: list[dict]) -> str:
    parts = []
    for r in results:
        if r.get("result_summary"):
            parts.append(f"[{r['agent_id']}]: {r['result_summary'][:FINDINGS_CHAR_LIMIT]}")
    return "\n\n".join(parts)
