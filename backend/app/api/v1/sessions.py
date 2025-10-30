from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from app.db.session import get_db
from app.models.user import Profile
from app.models.session import RecordingSession
from app.schemas.session import SessionCreate, SessionEnd, SessionResponse, SessionStartResponse, SessionEndResponse
from app.core.dependencies import get_current_user
from app.core.exceptions import BadRequestException, NotFoundException

router = APIRouter()


@router.post("/start", response_model=SessionStartResponse)
async def start_session(
    request: SessionCreate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(RecordingSession).where(
            and_(
                RecordingSession.user_id == current_user.id,
                RecordingSession.organization_id == current_user.organization_id,
                RecordingSession.is_active == True
            )
        )
    )
    active_session = result.scalar_one_or_none()

    if active_session:
        raise BadRequestException(detail="An active session already exists. Please end it before starting a new one.")

    new_session = RecordingSession(
        id=uuid4(),
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        session_start_time=request.session_start_time,
        is_active=True
    )

    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)

    return SessionStartResponse(
        success=True,
        session_id=new_session.id,
        message="Session started successfully"
    )


@router.post("/end", response_model=SessionEndResponse)
async def end_session(
    request: SessionEnd,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(RecordingSession).where(
            and_(
                RecordingSession.user_id == current_user.id,
                RecordingSession.organization_id == current_user.organization_id,
                RecordingSession.is_active == True
            )
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        raise NotFoundException(detail="No active session found")

    session.session_end_time = request.session_end_time
    session.is_active = False

    duration_seconds = int((request.session_end_time - session.session_start_time).total_seconds())
    session.total_duration_seconds = duration_seconds

    await db.commit()

    return SessionEndResponse(
        success=True,
        session_id=session.id,
        duration_seconds=duration_seconds,
        message="Session ended successfully"
    )


@router.get("/active", response_model=Optional[SessionResponse])
async def get_active_session(
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(RecordingSession).where(
            and_(
                RecordingSession.user_id == current_user.id,
                RecordingSession.organization_id == current_user.organization_id,
                RecordingSession.is_active == True
            )
        )
    )
    session = result.scalar_one_or_none()

    return session


@router.get("/history", response_model=List[SessionResponse])
async def get_session_history(
    limit: int = 50,
    offset: int = 0,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(RecordingSession).where(
            and_(
                RecordingSession.user_id == current_user.id,
                RecordingSession.organization_id == current_user.organization_id
            )
        ).order_by(RecordingSession.session_start_time.desc()).limit(limit).offset(offset)
    )
    sessions = result.scalars().all()

    return sessions
