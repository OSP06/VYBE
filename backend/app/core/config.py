from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?ssl=require"
    OPENAI_API_KEY: str = ""
    GOOGLE_PLACES_API_KEY: str = ""
    SECRET_KEY: str = "change-me-in-production"
    SENTRY_DSN: str = ""
    # Comma-separated list of allowed CORS origins. Use "*" for dev.
    ALLOWED_ORIGINS: str = "*"

    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")


settings = Settings()
