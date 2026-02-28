import time

CACHE = {}
CACHE_TTL = 60  # seconds

def get_cache(key: str):
    entry = CACHE.get(key)
    if not entry:
        return None

    data, timestamp = entry
    if time.time() - timestamp > CACHE_TTL:
        CACHE.pop(key, None)
        return None

    return data


def set_cache(key: str, data):
    CACHE[key] = (data, time.time())


def invalidate_cache(prefix: str | None = None):
    if prefix is None:
        CACHE.clear()
        return

    keys_to_delete = [key for key in CACHE.keys() if key.startswith(prefix)]
    for key in keys_to_delete:
        CACHE.pop(key, None)
