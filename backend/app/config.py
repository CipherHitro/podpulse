"""Application configuration using pydantic-settings."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables.

    Environment variable prefix (if any) can be set via model_config.
    """

    # Kubernetes configuration
    kube_config_file: str = ""
    include_system_namespaces: bool = False
    system_namespaces: set[str] = {"kube-system", "kubernetes-dashboard"}

    # Application
    app_title: str = "PodPulse API"
    cors_allow_origins: list[str] = ["*"]

    # Prometheus / Istio configuration
    prometheus_url: str = "http://localhost:9090"

    # Background tasks
    metrics_loop_interval: int = 15  # seconds
    max_events: int = 100
    max_metrics_history: int = 10

    # Server
    host: str = "127.0.0.1"
    port: int = 5050
    reload: bool = False

    model_config = {
        "env_prefix": "PODPULSE_",
        "case_sensitive": False,
        "extra": "ignore",
    }


settings = Settings()