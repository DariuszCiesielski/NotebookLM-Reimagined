import httpx
import asyncio
from typing import Dict, Any, Optional
from app.config import get_settings

settings = get_settings()

# AtlasCloud API configuration
ATLASCLOUD_BASE_URL = "https://api.atlascloud.ai"
MODEL_ID = "alibaba/wan-2.5/text-to-video-fast"

# Pricing: approximately $0.02 per second of video
# 5 second video = ~$0.10, 10 second video = ~$0.20
VIDEO_COST_PER_SECOND = 0.02


class AtlasCloudVideoService:
    def __init__(self):
        self.api_key = settings.atlascloud_api_key
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

    async def generate_video(
        self,
        prompt: str,
        duration: int = 5,
        size: str = "1280*720",
        negative_prompt: Optional[str] = None,
        enable_prompt_expansion: bool = True,
        seed: int = -1,
    ) -> Dict[str, Any]:
        """
        Generate a video using AtlasCloud Wan 2.5.

        Args:
            prompt: The video generation prompt
            duration: Video duration (5 or 10 seconds)
            size: Video size ("1280*720", "720*1280", "1920*1080", "1080*1920")
            negative_prompt: Things to avoid in the video
            enable_prompt_expansion: Let the model enhance the prompt
            seed: Random seed (-1 for random)

        Returns:
            Dict with request_id for polling
        """
        if not self.api_key:
            raise Exception("AtlasCloud API key not configured")

        # Ensure duration is valid
        duration = 5 if duration not in [5, 10] else duration

        payload = {
            "model": MODEL_ID,
            "prompt": prompt,
            "size": size,
            "duration": duration,
            "enable_prompt_expansion": enable_prompt_expansion,
            "seed": seed,
        }

        if negative_prompt:
            payload["negative_prompt"] = negative_prompt

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{ATLASCLOUD_BASE_URL}/api/v1/model/generateVideo",
                headers=self.headers,
                json=payload
            )

            if response.status_code != 200:
                raise Exception(f"AtlasCloud API error: {response.status_code} - {response.text}")

            result = response.json()

            # Extract request ID from response
            request_id = result.get("data", {}).get("id")
            if not request_id:
                raise Exception(f"No request ID in response: {result}")

            return {
                "request_id": request_id,
                "status": "processing",
                "estimated_cost_usd": duration * VIDEO_COST_PER_SECOND,
            }

    async def check_status(self, request_id: str) -> Dict[str, Any]:
        """
        Check the status of a video generation request.

        Returns:
            Dict with status, and outputs when completed
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{ATLASCLOUD_BASE_URL}/api/v1/model/result/{request_id}",
                headers=self.headers
            )

            if response.status_code != 200:
                raise Exception(f"AtlasCloud status check error: {response.status_code}")

            result = response.json()
            data = result.get("data", {})

            return {
                "status": data.get("status", "unknown"),
                "outputs": data.get("outputs", []),
                "has_nsfw_contents": data.get("has_nsfw_contents", []),
                "error": data.get("error"),
            }

    async def wait_for_completion(
        self,
        request_id: str,
        max_wait_seconds: int = 300,
        poll_interval: float = 3.0,
        progress_callback=None
    ) -> Dict[str, Any]:
        """
        Poll until video generation is complete.

        Args:
            request_id: The request ID from generate_video
            max_wait_seconds: Maximum time to wait
            poll_interval: Seconds between status checks
            progress_callback: Optional callback(progress_percent) for updates

        Returns:
            Dict with video_url when completed
        """
        elapsed = 0

        while elapsed < max_wait_seconds:
            status_result = await self.check_status(request_id)
            status = status_result.get("status", "unknown")

            # Calculate approximate progress
            progress = min(90, int((elapsed / max_wait_seconds) * 90) + 10)
            if progress_callback:
                await progress_callback(progress)

            if status in ["completed", "succeeded"]:
                outputs = status_result.get("outputs", [])
                if outputs:
                    # Extract video URL from outputs
                    video_url = outputs[0] if isinstance(outputs[0], str) else outputs[0].get("url")
                    return {
                        "status": "completed",
                        "video_url": video_url,
                        "outputs": outputs,
                    }
                raise Exception("Video completed but no output URL found")

            if status == "failed":
                error = status_result.get("error", "Unknown error")
                raise Exception(f"Video generation failed: {error}")

            await asyncio.sleep(poll_interval)
            elapsed += poll_interval

        raise Exception(f"Video generation timed out after {max_wait_seconds} seconds")

    async def generate_and_wait(
        self,
        prompt: str,
        duration: int = 5,
        size: str = "1280*720",
        negative_prompt: Optional[str] = None,
        enable_prompt_expansion: bool = True,
        progress_callback=None,
    ) -> Dict[str, Any]:
        """
        Generate video and wait for completion.

        Convenience method that combines generate_video and wait_for_completion.
        """
        # Start generation
        gen_result = await self.generate_video(
            prompt=prompt,
            duration=duration,
            size=size,
            negative_prompt=negative_prompt,
            enable_prompt_expansion=enable_prompt_expansion,
        )

        request_id = gen_result["request_id"]
        estimated_cost = gen_result["estimated_cost_usd"]

        # Wait for completion
        completion_result = await self.wait_for_completion(
            request_id=request_id,
            progress_callback=progress_callback,
        )

        return {
            "video_url": completion_result["video_url"],
            "status": "completed",
            "cost_usd": estimated_cost,
            "duration_seconds": duration,
        }


# Singleton instance
atlascloud_video_service = AtlasCloudVideoService()
