from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.firebase import init_firebase
from app.routers import health


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_firebase(settings.firebase_project_id)
    yield


app = FastAPI(
    title="Rayan Memory Palace",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
