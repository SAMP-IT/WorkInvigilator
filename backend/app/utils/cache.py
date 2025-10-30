from functools import wraps
from typing import Optional, Callable, Any
import json
import hashlib
from datetime import timedelta

from app.db.redis import get_redis


def generate_cache_key(prefix: str, *args, **kwargs) -> str:
    key_parts = [prefix]

    for arg in args:
        if isinstance(arg, (str, int, float, bool)):
            key_parts.append(str(arg))
        else:
            key_parts.append(hashlib.md5(str(arg).encode()).hexdigest())

    for k, v in sorted(kwargs.items()):
        key_parts.append(f"{k}:{v}")

    return ":".join(key_parts)


def cache_result(prefix: str, ttl: int = 300):
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            cache_key = generate_cache_key(prefix, *args, **kwargs)

            redis = await get_redis()
            cached_value = await redis.get(cache_key)

            if cached_value:
                try:
                    return json.loads(cached_value)
                except json.JSONDecodeError:
                    pass

            result = await func(*args, **kwargs)

            if result is not None:
                try:
                    await redis.setex(cache_key, ttl, json.dumps(result))
                except (TypeError, ValueError):
                    pass

            return result

        return wrapper
    return decorator


async def invalidate_cache(prefix: str, *args, **kwargs):
    cache_key = generate_cache_key(prefix, *args, **kwargs)
    redis = await get_redis()
    await redis.delete(cache_key)


async def invalidate_cache_pattern(pattern: str):
    redis = await get_redis()
    keys = await redis.keys(pattern)
    if keys:
        await redis.delete(*keys)


async def cache_set(key: str, value: Any, ttl: int = 300):
    redis = await get_redis()
    try:
        await redis.setex(key, ttl, json.dumps(value))
    except (TypeError, ValueError):
        await redis.setex(key, ttl, str(value))


async def cache_get(key: str) -> Optional[Any]:
    redis = await get_redis()
    cached_value = await redis.get(key)

    if cached_value:
        try:
            return json.loads(cached_value)
        except json.JSONDecodeError:
            return cached_value

    return None


async def cache_delete(key: str):
    redis = await get_redis()
    await redis.delete(key)


async def cache_exists(key: str) -> bool:
    redis = await get_redis()
    return await redis.exists(key) > 0
