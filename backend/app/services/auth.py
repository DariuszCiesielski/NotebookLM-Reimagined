from fastapi import HTTPException, Depends, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader
from typing import Optional, Tuple
from jose import jwt, JWTError
import hashlib
import secrets
from datetime import datetime, timezone
from collections import defaultdict
import time

from app.config import get_settings
from app.services.supabase_client import get_supabase_client

settings = get_settings()
security = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

# Simple in-memory rate limiter (for production, use Redis)
rate_limit_store: dict = defaultdict(lambda: {"minute": {}, "day": {}})


def generate_api_key() -> Tuple[str, str, str]:
    """Generate a new API key.

    Returns:
        Tuple of (full_key, key_prefix, key_hash)
    """
    # Generate 32 random bytes = 64 hex characters
    random_part = secrets.token_hex(32)
    full_key = f"nb_live_{random_part}"
    key_prefix = f"nb_live_{random_part[:8]}..."
    key_hash = hashlib.sha256(full_key.encode()).hexdigest()

    return full_key, key_prefix, key_hash


def hash_api_key(key: str) -> str:
    """Hash an API key for comparison."""
    return hashlib.sha256(key.encode()).hexdigest()


def check_rate_limit(api_key_id: str, rpm_limit: int, rpd_limit: int) -> bool:
    """Check if the API key is within rate limits.

    Returns True if allowed, raises HTTPException if rate limited.
    """
    now = time.time()
    minute_key = int(now // 60)
    day_key = int(now // 86400)

    store = rate_limit_store[api_key_id]

    # Clean old entries
    store["minute"] = {k: v for k, v in store["minute"].items() if k >= minute_key - 1}
    store["day"] = {k: v for k, v in store["day"].items() if k >= day_key - 1}

    # Check minute limit
    minute_count = store["minute"].get(minute_key, 0)
    if minute_count >= rpm_limit:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: {rpm_limit} requests per minute",
            headers={"Retry-After": str(60 - int(now % 60))}
        )

    # Check day limit
    day_count = store["day"].get(day_key, 0)
    if day_count >= rpd_limit:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: {rpd_limit} requests per day",
            headers={"Retry-After": str(86400 - int(now % 86400))}
        )

    # Increment counters
    store["minute"][minute_key] = minute_count + 1
    store["day"][day_key] = day_count + 1

    return True


async def validate_api_key(api_key: str, request: Request) -> Optional[dict]:
    """Validate an API key and return user info if valid."""
    if not api_key or not api_key.startswith("nb_live_"):
        return None

    supabase = get_supabase_client()
    key_hash = hash_api_key(api_key)

    # Look up API key by hash
    result = supabase.table("api_keys").select("*").eq("key_hash", key_hash).execute()

    if not result.data or len(result.data) == 0:
        return None

    api_key_record = result.data[0]

    # Check if active
    if not api_key_record["is_active"]:
        raise HTTPException(status_code=401, detail="API key is disabled")

    # Check expiration
    if api_key_record["expires_at"]:
        expires_str = api_key_record["expires_at"]
        if isinstance(expires_str, str):
            expires = datetime.fromisoformat(expires_str.replace("Z", "+00:00"))
        else:
            expires = expires_str
        if expires < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="API key has expired")

    # Check IP allowlist
    if api_key_record["allowed_ips"]:
        client_ip = request.client.host if request.client else None
        if client_ip and client_ip not in api_key_record["allowed_ips"]:
            raise HTTPException(status_code=403, detail="IP address not allowed")

    # Check rate limits
    check_rate_limit(
        api_key_record["id"],
        api_key_record["rate_limit_rpm"],
        api_key_record["rate_limit_rpd"]
    )

    # Update last used and increment request count
    supabase.table("api_keys").update({
        "last_used_at": datetime.now(timezone.utc).isoformat(),
        "total_requests": api_key_record["total_requests"] + 1
    }).eq("id", api_key_record["id"]).execute()

    # Store api_key_id in request state for usage logging
    request.state.api_key_id = api_key_record["id"]

    return {
        "id": api_key_record["user_id"],
        "email": None,  # API keys don't have email context
        "token": None,
        "api_key_id": api_key_record["id"],
        "api_key_scopes": api_key_record["scopes"],
        "auth_method": "api_key"
    }


async def validate_jwt(token: str) -> Optional[dict]:
    """Validate a JWT token and return user info."""
    try:
        payload = jwt.decode(
            token,
            key="",  # Key not needed when verify_signature is False
            options={
                "verify_signature": False,
                "verify_aud": False,
            },
            algorithms=["HS256", "ES256", "RS256"],
        )

        user_id = payload.get("sub")
        email = payload.get("email")

        if not user_id:
            return None

        return {
            "id": user_id,
            "email": email,
            "token": token,
            "api_key_id": None,
            "api_key_scopes": ["*"],
            "auth_method": "jwt"
        }
    except JWTError:
        return None
    except Exception:
        return None


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_api_key: Optional[str] = Depends(api_key_header),
) -> dict:
    """
    Validate authentication via either JWT or API key.

    Priority:
    1. X-API-Key header (API key auth)
    2. Authorization: Bearer (JWT auth)
    """
    # Try API key first
    if x_api_key:
        user = await validate_api_key(x_api_key, request)
        if user:
            return user
        raise HTTPException(status_code=401, detail="Invalid API key")

    # Fall back to JWT
    if credentials:
        user = await validate_jwt(credentials.credentials)
        if user:
            return user
        raise HTTPException(status_code=401, detail="Invalid token")

    raise HTTPException(status_code=401, detail="Authentication required. Provide either X-API-Key header or Authorization: Bearer token")


async def get_optional_user(
    request: Request,
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> Optional[dict]:
    """Get user if authenticated, None otherwise."""
    # Try API key
    if x_api_key:
        try:
            return await validate_api_key(x_api_key, request)
        except HTTPException:
            return None

    # Try JWT
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")
        return await validate_jwt(token)

    return None


def require_scope(required_scope: str):
    """Dependency to check if the user has the required scope."""
    async def check_scope(user: dict = Depends(get_current_user)):
        scopes = user.get("api_key_scopes", ["*"])

        # Wildcard allows all
        if "*" in scopes:
            return user

        # Read scope allows all read operations
        if required_scope == "read" and "read" in scopes:
            return user

        # Check specific scope
        if required_scope not in scopes:
            raise HTTPException(
                status_code=403,
                detail=f"API key lacks required scope: {required_scope}"
            )

        return user

    return check_scope


def require_jwt_auth():
    """Dependency that requires JWT authentication (not API key).

    Use this for sensitive operations like managing API keys.
    """
    async def check_jwt(user: dict = Depends(get_current_user)):
        if user.get("auth_method") == "api_key":
            raise HTTPException(
                status_code=403,
                detail="This operation requires JWT authentication, not API key"
            )
        return user

    return check_jwt
