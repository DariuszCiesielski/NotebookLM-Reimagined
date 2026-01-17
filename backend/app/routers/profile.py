from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from app.services.auth import get_current_user
from app.services.supabase_client import get_supabase_client

router = APIRouter(prefix="/profile", tags=["profile"])


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class ProfileResponse(BaseModel):
    id: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    email: str
    created_at: Optional[str]
    updated_at: Optional[str]


@router.get("", response_model=ProfileResponse)
async def get_profile(user: dict = Depends(get_current_user)):
    """Get current user's profile."""
    supabase = get_supabase_client()

    # Try to get existing profile
    result = (
        supabase.table("profiles")
        .select("*")
        .eq("id", user["id"])
        .single()
        .execute()
    )

    if not result.data:
        # Create profile if it doesn't exist
        email = user.get("email", "")
        name = email.split("@")[0] if email else "User"

        insert_result = (
            supabase.table("profiles")
            .insert({
                "id": user["id"],
                "name": name,  # Database column is 'name', not 'display_name'
                "email": email,
            })
            .execute()
        )

        if insert_result.data:
            profile = insert_result.data[0]
        else:
            raise HTTPException(status_code=500, detail="Failed to create profile")
    else:
        profile = result.data

    return ProfileResponse(
        id=profile["id"],
        display_name=profile.get("name"),  # Map 'name' to 'display_name' in response
        avatar_url=profile.get("avatar_url"),
        email=profile.get("email") or user.get("email", ""),
        created_at=profile.get("created_at"),
        updated_at=profile.get("updated_at"),
    )


@router.patch("", response_model=ProfileResponse)
async def update_profile(
    update: ProfileUpdate,
    user: dict = Depends(get_current_user),
):
    """Update current user's profile."""
    supabase = get_supabase_client()

    update_data = {}
    if update.display_name is not None:
        update_data["name"] = update.display_name  # Map to 'name' column
    if update.avatar_url is not None:
        update_data["avatar_url"] = update.avatar_url

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_data["updated_at"] = "now()"

    result = (
        supabase.table("profiles")
        .update(update_data)
        .eq("id", user["id"])
        .execute()
    )

    if not result.data:
        # Profile might not exist, create it
        email = user.get("email", "")
        insert_data = {
            "id": user["id"],
            "name": update.display_name or email.split("@")[0],
            "avatar_url": update.avatar_url,
            "email": email,
        }
        result = (
            supabase.table("profiles")
            .insert(insert_data)
            .execute()
        )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update profile")

    profile = result.data[0]

    return ProfileResponse(
        id=profile["id"],
        display_name=profile.get("name"),  # Map 'name' to 'display_name' in response
        avatar_url=profile.get("avatar_url"),
        email=profile.get("email") or user.get("email", ""),
        created_at=profile.get("created_at"),
        updated_at=profile.get("updated_at"),
    )
