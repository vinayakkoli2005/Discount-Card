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
