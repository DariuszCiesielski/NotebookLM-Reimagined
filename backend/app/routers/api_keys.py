from fastapi import APIRouter, HTTPException, Depends
from typing import List
from uuid import UUID
from datetime import datetime, timezone, timedelta

from app.models.schemas import (
    ApiKeyCreate,
    ApiKeyResponse,
    ApiKeyUpdate,
    ApiKeyUsageStats,
    ApiResponse,
)
from app.services.auth import get_current_user, generate_api_key, require_jwt_auth
from app.services.supabase_client import get_supabase_client

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


@router.post("", response_model=ApiResponse)
async def create_api_key(
    key_data: ApiKeyCreate,
    user: dict = Depends(require_jwt_auth()),
):
    """
    Create a new API key.

    IMPORTANT: The full API key is only returned once during creation.
    Store it securely - it cannot be retrieved later.

    Requires JWT authentication (not API key).
    """
    supabase = get_supabase_client()

    # Generate the key
    full_key, key_prefix, key_hash = generate_api_key()

    # Create record
    data = {
        "user_id": user["id"],
        "name": key_data.name,
        "key_prefix": key_prefix,
        "key_hash": key_hash,
        "scopes": key_data.scopes,
        "rate_limit_rpm": key_data.rate_limit_rpm,
        "rate_limit_rpd": key_data.rate_limit_rpd,
        "expires_at": key_data.expires_at.isoformat() if key_data.expires_at else None,
        "description": key_data.description,
        "allowed_ips": key_data.allowed_ips,
    }

    result = supabase.table("api_keys").insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create API key")

    # Return with the full key (only time it's shown)
    response_data = result.data[0]
    response_data["key"] = full_key

    return ApiResponse(data=response_data)


@router.get("", response_model=ApiResponse)
async def list_api_keys(
    user: dict = Depends(require_jwt_auth()),
):
    """List all API keys for the current user.

    Requires JWT authentication (not API key).
    """
    supabase = get_supabase_client()

    result = (
        supabase.table("api_keys")
        .select("*")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )

    return ApiResponse(data=result.data)


@router.get("/{key_id}", response_model=ApiResponse)
async def get_api_key(
    key_id: UUID,
    user: dict = Depends(require_jwt_auth()),
):
    """Get a specific API key's details.

    Requires JWT authentication (not API key).
    """
    supabase = get_supabase_client()

    result = (
        supabase.table("api_keys")
        .select("*")
        .eq("id", str(key_id))
        .eq("user_id", user["id"])
        .execute()
    )

    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="API key not found")

    return ApiResponse(data=result.data[0])


@router.patch("/{key_id}", response_model=ApiResponse)
async def update_api_key(
    key_id: UUID,
    update_data: ApiKeyUpdate,
    user: dict = Depends(require_jwt_auth()),
):
    """Update an API key's settings.

    Requires JWT authentication (not API key).
    """
    supabase = get_supabase_client()

    # Build update dict
    update_dict = {}
    if update_data.name is not None:
        update_dict["name"] = update_data.name
    if update_data.scopes is not None:
        update_dict["scopes"] = update_data.scopes
    if update_data.rate_limit_rpm is not None:
        update_dict["rate_limit_rpm"] = update_data.rate_limit_rpm
    if update_data.rate_limit_rpd is not None:
        update_dict["rate_limit_rpd"] = update_data.rate_limit_rpd
    if update_data.is_active is not None:
        update_dict["is_active"] = update_data.is_active
    if update_data.expires_at is not None:
        update_dict["expires_at"] = update_data.expires_at.isoformat()
    if update_data.description is not None:
        update_dict["description"] = update_data.description
    if update_data.allowed_ips is not None:
        update_dict["allowed_ips"] = update_data.allowed_ips

    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = (
        supabase.table("api_keys")
        .update(update_dict)
        .eq("id", str(key_id))
        .eq("user_id", user["id"])
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="API key not found")

    return ApiResponse(data=result.data[0])


@router.delete("/{key_id}", response_model=ApiResponse)
async def revoke_api_key(
    key_id: UUID,
    user: dict = Depends(require_jwt_auth()),
):
    """Revoke (delete) an API key.

    Requires JWT authentication (not API key).
    """
    supabase = get_supabase_client()

    result = (
        supabase.table("api_keys")
        .delete()
        .eq("id", str(key_id))
        .eq("user_id", user["id"])
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="API key not found")

    return ApiResponse(data={"deleted": True, "id": str(key_id)})


@router.get("/{key_id}/usage", response_model=ApiResponse)
async def get_api_key_usage(
    key_id: UUID,
    user: dict = Depends(require_jwt_auth()),
):
    """Get usage statistics for an API key.

    Requires JWT authentication (not API key).
    """
    supabase = get_supabase_client()

    # Get key details
    key_result = (
        supabase.table("api_keys")
        .select("*")
        .eq("id", str(key_id))
        .eq("user_id", user["id"])
        .execute()
    )

    if not key_result.data or len(key_result.data) == 0:
        raise HTTPException(status_code=404, detail="API key not found")

    key_data = key_result.data[0]

    # Get today's request count from usage logs
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_result = (
        supabase.table("api_key_usage_logs")
        .select("id", count="exact")
        .eq("api_key_id", str(key_id))
        .gte("created_at", today_start.isoformat())
        .execute()
    )

    usage_stats = {
        "total_requests": key_data["total_requests"],
        "total_tokens_in": key_data["total_tokens_in"],
        "total_tokens_out": key_data["total_tokens_out"],
        "total_cost_usd": float(key_data["total_cost_usd"]) if key_data["total_cost_usd"] else 0.0,
        "requests_today": today_result.count or 0,
        "rate_limit_rpm": key_data["rate_limit_rpm"],
        "rate_limit_rpd": key_data["rate_limit_rpd"],
        "last_used_at": key_data["last_used_at"],
    }

    return ApiResponse(data=usage_stats)


@router.post("/{key_id}/rotate", response_model=ApiResponse)
async def rotate_api_key(
    key_id: UUID,
    user: dict = Depends(require_jwt_auth()),
):
    """
    Rotate an API key (generate new key, invalidate old one).

    Returns the new key - store it securely!

    Requires JWT authentication (not API key).
    """
    supabase = get_supabase_client()

    # Verify key exists
    existing = (
        supabase.table("api_keys")
        .select("*")
        .eq("id", str(key_id))
        .eq("user_id", user["id"])
        .execute()
    )

    if not existing.data or len(existing.data) == 0:
        raise HTTPException(status_code=404, detail="API key not found")

    # Generate new key
    full_key, key_prefix, key_hash = generate_api_key()

    # Update with new key hash
    result = (
        supabase.table("api_keys")
        .update({
            "key_prefix": key_prefix,
            "key_hash": key_hash,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", str(key_id))
        .eq("user_id", user["id"])
        .execute()
    )

    response_data = result.data[0]
    response_data["key"] = full_key

    return ApiResponse(data=response_data)
