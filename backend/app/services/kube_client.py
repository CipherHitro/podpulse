"""Kubernetes client initialization (lazy, with error handling)."""

from typing import Optional

from kubernetes import client, config


class KubernetesClientProvider:
    """Provides initialized Kubernetes API clients."""

    def __init__(self):
        self._initialized = False
        self._v1: Optional[client.CoreV1Api] = None
        self._custom_api: Optional[client.CustomObjectsApi] = None

    def _ensure_initialized(self):
        if self._initialized:
            return
        try:
            config.load_kube_config()
        except Exception as e:
            print("Warning: Failed to load kube config. Kubernetes API calls may fail:", e)
        self._v1 = client.CoreV1Api()
        self._custom_api = client.CustomObjectsApi()
        self._initialized = True

    @property
    def v1(self) -> client.CoreV1Api:
        self._ensure_initialized()
        return self._v1

    @property
    def custom_api(self) -> client.CustomObjectsApi:
        self._ensure_initialized()
        return self._custom_api


# Singleton provider
_kube_provider = KubernetesClientProvider()

def get_kube_client() -> client.CoreV1Api:
    """Get the singleton CoreV1Api client."""
    return _kube_provider.v1


def get_custom_objects_api() -> client.CustomObjectsApi:
    """Get the singleton CustomObjectsApi client."""
    return _kube_provider.custom_api