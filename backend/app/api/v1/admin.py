"""
Admin endpoints for triggering background workers.

Secured by a shared secret (ADMIN_SECRET env var).
Usage:
  curl -X POST "https://api.vybe.app/api/v1/admin/freshness" \
       -H "X-Admin-Secret: <secret>"
"""
import asyncio
import os

from fastapi import APIRouter, Header, HTTPException

router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "")


def _auth(secret: str | None):
    if not ADMIN_SECRET:
        raise HTTPException(status_code=503, detail="Admin secret not configured")
    if secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.post("/workers/freshness")
async def run_freshness(x_admin_secret: str | None = Header(default=None)):
    """Re-fetch business_status + rating for all active places from Google."""
    _auth(x_admin_secret)
    from app.workers.freshness_worker import run
    asyncio.create_task(run())
    return {"status": "freshness worker started"}


@router.post("/workers/feedback-correction")
async def run_feedback_correction(x_admin_secret: str | None = Header(default=None)):
    """Apply aggregate vibe_feedback signal to permanently adjust vibe_vectors."""
    _auth(x_admin_secret)
    from app.workers.feedback_correction import run
    asyncio.create_task(run())
    return {"status": "feedback correction worker started"}
