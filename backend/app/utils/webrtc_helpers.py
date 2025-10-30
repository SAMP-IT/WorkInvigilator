from typing import Dict, Any, Optional
import json


def create_webrtc_offer_message(sdp: str, target_id: str) -> Dict[str, Any]:
    return {
        "type": "offer",
        "target_id": target_id,
        "data": {
            "sdp": sdp,
            "type": "offer"
        }
    }


def create_webrtc_answer_message(sdp: str, target_id: str) -> Dict[str, Any]:
    return {
        "type": "answer",
        "target_id": target_id,
        "data": {
            "sdp": sdp,
            "type": "answer"
        }
    }


def create_ice_candidate_message(
    candidate: str,
    target_id: str,
    sdp_mid: Optional[str] = None,
    sdp_m_line_index: Optional[int] = None
) -> Dict[str, Any]:
    return {
        "type": "ice-candidate",
        "target_id": target_id,
        "data": {
            "candidate": candidate,
            "sdpMid": sdp_mid,
            "sdpMLineIndex": sdp_m_line_index
        }
    }


def validate_webrtc_signal(message: Dict[str, Any]) -> bool:
    if "type" not in message:
        return False

    message_type = message.get("type")

    if message_type in ["offer", "answer"]:
        if "data" not in message or "sdp" not in message.get("data", {}):
            return False

    elif message_type == "ice-candidate":
        if "data" not in message or "candidate" not in message.get("data", {}):
            return False

    return True


def parse_webrtc_message(raw_message: str) -> Optional[Dict[str, Any]]:
    try:
        message = json.loads(raw_message)
        if validate_webrtc_signal(message):
            return message
        return None
    except json.JSONDecodeError:
        return None
