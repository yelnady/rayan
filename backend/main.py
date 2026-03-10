# Entry point for uvicorn: `uvicorn main:app --reload` or `python main.py`
from app.main import app  # noqa: F401

if __name__ == "__main__":
    import uvicorn
    from app.config import settings
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=settings.debug)
