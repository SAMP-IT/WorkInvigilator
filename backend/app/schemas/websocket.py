from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID


class WebRTCSignal(BaseModel):
    type: str
    data: Dict[str, Any]
    target_id: Optional[str] = None
    room_id: Optional[str] = None


class WebRTCOffer(BaseModel):
    sdp: str
    type: str = "offer"


class WebRTCAnswer(BaseModel):
    sdp: str
    type: str = "answer"


class WebRTCIceCandidate(BaseModel):
    candidate: str
    sdpMid: Optional[str] = None
    sdpMLineIndex: Optional[int] = None


class LiveStreamRequest(BaseModel):
    user_id: UUID
    stream_type: str = "screen"


class LiveStreamResponse(BaseModel):
    success: bool
    room_id: str
    message: str


class ActiveStreamInfo(BaseModel):
    user_id: UUID
    user_name: str
    room_id: str
    stream_type: str
    started_at: datetime
    viewer_count: int


class ActiveStreamsResponse(BaseModel):
    total: int
    streams: List[ActiveStreamInfo]
