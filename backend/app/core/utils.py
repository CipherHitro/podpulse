"""Utility functions for parsing Kubernetes resource values and pod status."""


def parse_cpu(cpu_str):
    """Parse a Kubernetes CPU string into a float (cores)."""
    if not cpu_str:
        return None
    if cpu_str.endswith("n"):
        return float(cpu_str[:-1]) / 1_000_000_000.0
    if cpu_str.endswith("u"):
        return float(cpu_str[:-1]) / 1_000_000.0
    if cpu_str.endswith("m"):
        return float(cpu_str[:-1]) / 1_000.0
    try:
        return float(cpu_str)
    except (ValueError, TypeError):
        return None


def parse_memory(mem_str):
    """Parse a Kubernetes memory string into a float (MiB)."""
    if not mem_str:
        return None
    if mem_str.endswith("Ki"):
        return float(mem_str[:-2]) / 1024.0
    if mem_str.endswith("Mi"):
        return float(mem_str[:-2])
    if mem_str.endswith("Gi"):
        return float(mem_str[:-2]) * 1024.0
    try:
        return float(mem_str) / (1024.0 * 1024.0)
    except (ValueError, TypeError):
        return None


def get_pod_status_and_phase(pod):
    """Determine the overall status and phase of a pod based on its spec and container statuses.

    Returns:
        tuple[str, str, int]: (status, phase, restart_count)
            status can be "healthy", "warning", or "critical"
    """
    phase = pod.status.phase or "Unknown"
    if pod.metadata.deletion_timestamp:
        phase = "Terminating"

    status = "healthy"
    restarts = 0
    container_statuses = []
    if pod.status.container_statuses:
        container_statuses.extend(pod.status.container_statuses)
    if pod.status.init_container_statuses:
        container_statuses.extend(pod.status.init_container_statuses)

    for cs in container_statuses:
        restarts += cs.restart_count or 0
        if cs.state.waiting:
            reason = cs.state.waiting.reason
            if reason in [
                "CrashLoopBackOff",
                "ImagePullBackOff",
                "ErrImagePull",
                "CreateContainerConfigError",
                "CreateContainerError",
            ]:
                status = "critical"
        elif cs.state.terminated:
            if cs.state.terminated.exit_code != 0:
                status = "critical"

    if phase == "Failed":
        status = "critical"
    elif phase in ("Pending", "Terminating"):
        status = "warning"
    elif status == "healthy" and restarts > 0:
        status = "warning"

    return status, phase, restarts