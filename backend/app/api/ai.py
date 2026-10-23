from collections import deque
from datetime import (
    datetime,
    timezone,
)
from threading import Lock
from time import monotonic
from typing import (
    Annotated,
)

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
    status,
)

from openai import (
    APIConnectionError,
    APIStatusError,
    AuthenticationError,
    RateLimitError,
)

from sqlalchemy import (
    select,
)

from sqlalchemy.orm import (
    Session,
)

from backend.app.auth_dependencies import (
    require_admin,
)

from backend.app.dependencies import (
    get_db,
)

from backend.app.models.ai_conversation import (
    AIConversation,
)

from backend.app.models.ai_message import (
    AIMessage,
)

from backend.app.models.user import (
    User,
)

from backend.app.schemas.ai import (
    AIChatRequest,
    AIChatResponse,
    AIConversationCreate,
    AIConversationDetail,
    AIConversationSummary,
    AIMessageResponse,
)

from backend.app.services.ai_assistant import (
    run_ai_assistant,
)


# =========================================================
# CONFIG
# =========================================================

MAX_HISTORY_MESSAGES = 20

AI_RATE_LIMIT_REQUESTS = 10
AI_RATE_LIMIT_WINDOW_SECONDS = 60

# Nếu key không hoạt động trong thời gian này
# thì có thể xóa khỏi bộ nhớ rate-limit.
AI_RATE_LIMIT_STALE_SECONDS = 10 * 60


# =========================================================
# IN-MEMORY AI RATE LIMIT
#
# Phù hợp với Rosehome hiện tại:
# - quy mô nhỏ
# - một backend instance / ít worker
#
# Nếu sau này chạy nhiều instance/worker,
# nên chuyển rate limit sang Redis.
# =========================================================

_ai_rate_limit_store: dict[
    str,
    deque[float],
] = {}

_ai_rate_limit_last_seen: dict[
    str,
    float,
] = {}

_ai_rate_limit_lock = Lock()


# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    prefix="/ai",
    tags=[
        "Rosehome AI"
    ],
)


# =========================================================
# HELPERS
# =========================================================

def build_conversation_title(
    message: str,
) -> str:

    clean_message = (
        " ".join(
            message
            .strip()
            .split()
        )
    )


    if not clean_message:

        return "Cuộc trò chuyện mới"


    max_length = 60


    if len(clean_message) <= max_length:

        return clean_message


    return (
        clean_message[:max_length]
        .rstrip()
        + "..."
    )


def get_owned_conversation(
    db: Session,
    conversation_id: int,
    user_id: int,
) -> AIConversation:

    conversation = db.scalar(

        select(
            AIConversation
        )

        .where(
            AIConversation.id
            == conversation_id,

            AIConversation.user_id
            == user_id,
        )

    )


    if conversation is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Không tìm thấy cuộc trò chuyện.",
        )


    return conversation


def build_message_response(
    message: AIMessage,
) -> AIMessageResponse:

    return AIMessageResponse(
        id=message.id,
        role=message.role,
        content=message.content,
        tools_used=(
            message.tools_used
            or []
        ),
        model=message.model,
        created_at=message.created_at,
    )


# =========================================================
# CLIENT IP
# =========================================================

def get_client_ip(
    request: Request,
) -> str:

    """
    Lấy IP từ kết nối mà FastAPI nhìn thấy.

    Không tin trực tiếp X-Forwarded-For ở đây
    để tránh client tự giả mạo header.
    """

    if request.client is None:

        return "unknown"


    return (
        request.client.host
        or "unknown"
    )


# =========================================================
# RATE LIMIT CLEANUP
# =========================================================

def cleanup_ai_rate_limit_store(
    now: float,
) -> None:

    stale_keys = [

        key

        for key, last_seen
        in _ai_rate_limit_last_seen.items()

        if (
            now
            -
            last_seen
        )
        >
        AI_RATE_LIMIT_STALE_SECONDS

    ]


    for key in stale_keys:

        _ai_rate_limit_store.pop(
            key,
            None,
        )

        _ai_rate_limit_last_seen.pop(
            key,
            None,
        )


# =========================================================
# AI RATE LIMIT
# =========================================================

def enforce_ai_rate_limit(
    request: Request,
    user: User,
) -> None:

    now = monotonic()

    client_ip = (
        get_client_ip(
            request
        )
    )


    rate_key = (
        f"user:{user.id}"
        f"|ip:{client_ip}"
    )


    with _ai_rate_limit_lock:

        cleanup_ai_rate_limit_store(
            now
        )


        timestamps = (
            _ai_rate_limit_store
            .setdefault(
                rate_key,
                deque(),
            )
        )


        window_start = (
            now
            -
            AI_RATE_LIMIT_WINDOW_SECONDS
        )


        while (
            timestamps
            and
            timestamps[0]
            <= window_start
        ):

            timestamps.popleft()


        if (
            len(timestamps)
            >= AI_RATE_LIMIT_REQUESTS
        ):

            oldest_request = (
                timestamps[0]
            )


            retry_after = max(
                1,
                int(
                    AI_RATE_LIMIT_WINDOW_SECONDS
                    -
                    (
                        now
                        -
                        oldest_request
                    )
                )
                + 1,
            )


            _ai_rate_limit_last_seen[
                rate_key
            ] = now


            raise HTTPException(
                status_code=
                    status.HTTP_429_TOO_MANY_REQUESTS,

                detail=
                    (
                        "Bạn đang gửi yêu cầu AI "
                        "quá nhanh. "
                        "Vui lòng thử lại sau."
                    ),

                headers={
                    "Retry-After":
                        str(
                            retry_after
                        )
                },
            )


        timestamps.append(
            now
        )


        _ai_rate_limit_last_seen[
            rate_key
        ] = now


# =========================================================
# LIST CONVERSATIONS
# =========================================================

@router.get(
    "/conversations",
    response_model=list[AIConversationSummary],
    summary="List Rosehome AI Conversations",
)
def list_conversations(

    db: Annotated[
        Session,
        Depends(get_db),
    ],

    current_user: Annotated[
        User,
        Depends(require_admin),
    ],

):

    conversations = list(

        db.scalars(

            select(
                AIConversation
            )

            .where(
                AIConversation.user_id
                == current_user.id
            )

            .order_by(
                AIConversation.updated_at.desc(),
                AIConversation.id.desc(),
            )

            .limit(100)

        ).all()

    )


    return [

        AIConversationSummary(
            id=conversation.id,
            title=conversation.title,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
        )

        for conversation
        in conversations

    ]


# =========================================================
# CREATE EMPTY CONVERSATION
# =========================================================

@router.post(
    "/conversations",
    response_model=AIConversationSummary,
    status_code=status.HTTP_201_CREATED,
    summary="Create Rosehome AI Conversation",
)
def create_conversation(

    request: AIConversationCreate,

    db: Annotated[
        Session,
        Depends(get_db),
    ],

    current_user: Annotated[
        User,
        Depends(require_admin),
    ],

):

    title = (
        request.title.strip()
        if request.title
        and request.title.strip()
        else "Cuộc trò chuyện mới"
    )


    conversation = AIConversation(
        user_id=current_user.id,
        title=title,
    )


    try:

        db.add(
            conversation
        )

        db.commit()

        db.refresh(
            conversation
        )


        return AIConversationSummary(
            id=conversation.id,
            title=conversation.title,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
        )


    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_500_INTERNAL_SERVER_ERROR,

            detail=
                "Không thể tạo cuộc trò chuyện AI.",
        ) from exc


# =========================================================
# GET CONVERSATION
# =========================================================

@router.get(
    "/conversations/{conversation_id}",
    response_model=AIConversationDetail,
    summary="Get Rosehome AI Conversation",
)
def get_conversation(

    conversation_id: int,

    db: Annotated[
        Session,
        Depends(get_db),
    ],

    current_user: Annotated[
        User,
        Depends(require_admin),
    ],

):

    conversation = get_owned_conversation(
        db=db,
        conversation_id=conversation_id,
        user_id=current_user.id,
    )


    messages = list(

        db.scalars(

            select(
                AIMessage
            )

            .where(
                AIMessage.conversation_id
                == conversation.id
            )

            .order_by(
                AIMessage.id
            )

        ).all()

    )


    return AIConversationDetail(
        id=conversation.id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        messages=[
            build_message_response(
                message
            )
            for message
            in messages
        ],
    )


# =========================================================
# DELETE CONVERSATION
# =========================================================

@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Rosehome AI Conversation",
)
def delete_conversation(

    conversation_id: int,

    db: Annotated[
        Session,
        Depends(get_db),
    ],

    current_user: Annotated[
        User,
        Depends(require_admin),
    ],

):

    conversation = get_owned_conversation(
        db=db,
        conversation_id=conversation_id,
        user_id=current_user.id,
    )


    try:

        db.delete(
            conversation
        )

        db.commit()


        return Response(
            status_code=
                status.HTTP_204_NO_CONTENT
        )


    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_500_INTERNAL_SERVER_ERROR,

            detail=
                "Không thể xóa cuộc trò chuyện AI.",
        ) from exc


# =========================================================
# CHAT
# =========================================================

@router.post(
    "/chat",
    response_model=AIChatResponse,
    summary="Chat With Rosehome AI",
)
def chat_with_ai(

    request: AIChatRequest,

    http_request: Request,

    db: Annotated[
        Session,
        Depends(get_db),
    ],

    current_user: Annotated[
        User,
        Depends(require_admin),
    ],

):

    try:

        # =================================================
        # LOCAL RATE LIMIT
        # =================================================

        enforce_ai_rate_limit(
            request=
                http_request,

            user=
                current_user,
        )


        clean_message = (
            request.message.strip()
        )


        if not clean_message:

            raise ValueError(
                "Câu hỏi không được để trống."
            )


        conversation: AIConversation | None = None

        history: list[
            dict[str, str]
        ] = []


        # =================================================
        # EXISTING CONVERSATION
        # =================================================

        if request.conversation_id is not None:

            conversation = get_owned_conversation(
                db=db,
                conversation_id=request.conversation_id,
                user_id=current_user.id,
            )


            recent_messages = list(

                db.scalars(

                    select(
                        AIMessage
                    )

                    .where(
                        AIMessage.conversation_id
                        == conversation.id
                    )

                    .order_by(
                        AIMessage.id.desc()
                    )

                    .limit(
                        MAX_HISTORY_MESSAGES
                    )

                ).all()

            )


            recent_messages.reverse()


            for previous_message in recent_messages:

                role = (
                    previous_message.role
                    .strip()
                    .upper()
                )


                if role == "USER":

                    api_role = "user"

                elif role == "ASSISTANT":

                    api_role = "assistant"

                else:

                    continue


                history.append(
                    {
                        "role":
                            api_role,

                        "content":
                            previous_message.content,
                    }
                )


        # =================================================
        # CALL GROQ
        # =================================================

        result = run_ai_assistant(
            db=db,
            message=clean_message,
            history=history,
        )


        # =================================================
        # CREATE CONVERSATION AFTER AI SUCCEEDS
        # =================================================

        if conversation is None:

            conversation = AIConversation(
                user_id=current_user.id,
                title=build_conversation_title(
                    clean_message
                ),
            )


            db.add(
                conversation
            )

            # Lấy ID nhưng chưa commit.
            db.flush()


        # =================================================
        # SAVE USER MESSAGE
        # =================================================

        user_message = AIMessage(
            conversation_id=conversation.id,
            role="USER",
            content=clean_message,
            tools_used=None,
            model=None,
        )


        # =================================================
        # SAVE ASSISTANT MESSAGE
        # =================================================

        assistant_message = AIMessage(
            conversation_id=conversation.id,
            role="ASSISTANT",
            content=result["answer"],
            tools_used=(
                result.get(
                    "tools_used"
                )
                or []
            ),
            model=result.get(
                "model"
            ),
        )


        db.add_all(
            [
                user_message,
                assistant_message,
            ]
        )


        conversation.updated_at = (
            datetime.now(
                timezone.utc
            )
        )


        db.commit()


        return AIChatResponse(
            answer=result["answer"],
            conversation_id=conversation.id,
            tools_used=(
                result.get(
                    "tools_used"
                )
                or []
            ),
            model=result.get(
                "model"
            ),
        )


    # =====================================================
    # INVALID USER INPUT
    # =====================================================

    except ValueError as exc:

        db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                str(
                    exc
                ),
        ) from exc


    # =====================================================
    # INVALID / MISSING GROQ API KEY
    # =====================================================

    except AuthenticationError as exc:

        db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_503_SERVICE_UNAVAILABLE,

            detail=
                (
                    "Rosehome AI chưa thể xác thực "
                    "với dịch vụ AI."
                ),
        ) from exc


    # =====================================================
    # GROQ RATE LIMIT / QUOTA
    # =====================================================

    except RateLimitError as exc:

        db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_503_SERVICE_UNAVAILABLE,

            detail=
                (
                    "Rosehome AI tạm thời không thể "
                    "xử lý yêu cầu do giới hạn dịch vụ. "
                    "Vui lòng thử lại sau."
                ),
        ) from exc


    # =====================================================
    # CONNECTION ERROR
    # =====================================================

    except APIConnectionError as exc:

        db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_503_SERVICE_UNAVAILABLE,

            detail=
                (
                    "Không thể kết nối đến dịch vụ AI. "
                    "Vui lòng thử lại sau."
                ),
        ) from exc


    # =====================================================
    # GROQ API ERROR
    # =====================================================

    except APIStatusError as exc:

        db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_502_BAD_GATEWAY,

            detail=
                (
                    "Dịch vụ AI trả về lỗi. "
                    "Vui lòng thử lại sau."
                ),
        ) from exc


    # =====================================================
    # LOCAL CONFIG / AI ASSISTANT ERROR
    # =====================================================

    except RuntimeError as exc:

        db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_503_SERVICE_UNAVAILABLE,

            detail=
                str(
                    exc
                ),
        ) from exc


    # =====================================================
    # FASTAPI / OWNERSHIP / LOCAL 429 ERRORS
    # =====================================================

    except HTTPException:

        db.rollback()

        raise


    # =====================================================
    # UNKNOWN ERROR
    # =====================================================

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_500_INTERNAL_SERVER_ERROR,

            detail=
                (
                    "Rosehome AI gặp lỗi "
                    "khi xử lý yêu cầu."
                ),
        ) from exc
