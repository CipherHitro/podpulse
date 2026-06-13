from kubernetes import client, config

def init_kube():
    try:
        config.load_kube_config()
    except Exception as e:
        print("Warning: Failed to load kube config. Kubernetes API calls may fail:", e)

init_kube()

v1 = client.CoreV1Api()
custom_api = client.CustomObjectsApi()
