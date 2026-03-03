from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Google Cloud
    google_cloud_project: str = "rayan-memory"
    google_application_credentials: str = ""

    # Firebase (for token verification)
    firebase_project_id: str = "rayan-memory"

    # Vertex AI Vector Search
    vertex_ai_index_endpoint: str = ""
    vertex_ai_deployed_index_id: str = "artifact-embeddings"

    # Cloud Storage
    media_bucket: str = ""

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

    # CORS — accepts comma-separated string or JSON array
    cors_origins: list[str] | str = ["http://localhost:5173", "http://localhost:3000"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: object) -> object:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v


settings = Settings()
