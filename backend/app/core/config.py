from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://vybe:vybe@localhost:5432/vybe"
    OPENAI_API_KEY: str = ""
    GOOGLE_PLACES_API_KEY: str = ""
    SECRET_KEY: str = "change-me-in-production"
    # Comma-separated list of allowed CORS origins. Use "*" for dev.
    ALLOWED_ORIGINS: str = "*"

    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")


settings = Settings()
