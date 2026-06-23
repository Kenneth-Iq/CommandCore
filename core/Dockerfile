FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends git ripgrep curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY pyproject.toml ./
COPY jarvis_core ./jarvis_core
COPY agents ./agents
RUN pip install --no-cache-dir .

# Hermes engine — pinned to the commit validated against this codebase
# (matches the local reference checkout; bump deliberately).
ARG HERMES_REF=f3a4af9cf2a626cb3e055766cb1cff60168d295d
RUN pip install --no-cache-dir "git+https://github.com/nousresearch/hermes-agent.git@${HERMES_REF}"

ENV JARVIS_HOST=0.0.0.0 \
    JARVIS_PORT=8765 \
    JARVIS_SANDBOX=/data/sandbox \
    JARVIS_ROLES=/app/agents/roles.yaml \
    JARVIS_SCHEDULES=/app/agents/schedules.yaml \
    JARVIS_ENGINE=hermes

VOLUME /data
EXPOSE 8765

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s \
    CMD curl -fsS http://localhost:8765/health || exit 1

CMD ["jarvis-core"]
