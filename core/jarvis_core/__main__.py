from __future__ import annotations

import logging


def main() -> None:
    import uvicorn

    from .app import create_app
    from .config import Settings

    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(name)s %(levelname)s %(message)s")
    settings = Settings()
    uvicorn.run(create_app(settings), host=settings.host, port=settings.port)


if __name__ == "__main__":
    main()
