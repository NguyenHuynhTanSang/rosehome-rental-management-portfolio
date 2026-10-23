from datetime import datetime

from pydantic import (
    BaseModel,
    Field,
)


# =========================================================
# TOOL
# =========================================================

class AIToolUsage(BaseModel):

    name: str

    description: str | None = None


# =========================================================
# CHAT
# =========================================================

class AIChatRequest(BaseModel):

    message: str = Field(
        ...,
        min_length=1,
        max_length=2000,
    )

    conversation_id: int | None = None


class AIChatResponse(BaseModel):

    answer: str

    conversation_id: int

    tools_used: list[AIToolUsage] = Field(
        default_factory=list
    )

    model: str | None = None


# =========================================================
# CONVERSATION
# =========================================================

class AIConversationCreate(BaseModel):

    title: str | None = Field(
        default=None,
        max_length=160,
    )


class AIConversationSummary(BaseModel):

    id: int

    title: str

    created_at: datetime

    updated_at: datetime


# =========================================================
# MESSAGE
# =========================================================

class AIMessageResponse(BaseModel):

    id: int

    role: str

    content: str

    tools_used: list[AIToolUsage] = Field(
        default_factory=list
    )

    model: str | None = None

    created_at: datetime


# =========================================================
# CONVERSATION DETAIL
# =========================================================

class AIConversationDetail(BaseModel):

    id: int

    title: str

    created_at: datetime

    updated_at: datetime

    messages: list[AIMessageResponse] = Field(
        default_factory=list
    )
