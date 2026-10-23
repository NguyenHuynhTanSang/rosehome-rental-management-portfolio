from collections import deque
from time import monotonic
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)

from sqlalchemy import (
    func,
    select,
)

from sqlalchemy.orm import Session

from backend.app.auth_dependencies import (
    get_current_user,
)

from backend.app.dependencies import (
    get_db,
)

from backend.app.models.user import (
    User,
)

from backend.app.schemas.auth import (
    LoginRequest,
    LoginResponse,
)

from backend.app.schemas.user import (
    UserResponse,
)

from backend.app.security import (
    create_access_token,
    hash_password,
    verify_password,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


# ==============================
# LOGIN RATE LIMIT
# ==============================

MAX_FAILED_ATTEMPTS = 5
ATTEMPT_WINDOW_SECONDS = 60
BLOCK_SECONDS = 5 * 60


_failed_attempts: dict[
    str,
    deque[float]
] = {}

_blocked_until: dict[
    str,
    float
] = {}


# Dùng để giữ thời gian xử lý tương đối giống nhau
# giữa email tồn tại và email không tồn tại.
#
# Đây không phải mật khẩu thật của tài khoản nào.
_DUMMY_PASSWORD_HASH = hash_password(
    "rosehome-invalid-login-placeholder"
)


def get_client_ip(
    request: Request,
) -> str:

    forwarded_for = request.headers.get(
        "x-forwarded-for"
    )

    if forwarded_for:

        return (
            forwarded_for
            .split(",")[0]
            .strip()
        )


    if request.client:

        return request.client.host


    return "unknown"


def get_rate_limit_key(
    request: Request,
    email: str,
) -> str:

    client_ip = get_client_ip(
        request
    )


    return (
        f"{client_ip}:{email}"
    )


def check_login_block(
    key: str,
) -> None:

    now = monotonic()


    blocked_until = _blocked_until.get(
        key
    )


    if (
        blocked_until is not None
        and blocked_until > now
    ):

        retry_after = max(
            1,
            int(
                blocked_until
                - now
            ),
        )


        raise HTTPException(
            status_code=
                status.HTTP_429_TOO_MANY_REQUESTS,

            detail=
                "Đăng nhập sai quá nhiều lần. "
                "Vui lòng thử lại sau vài phút.",

            headers={
                "Retry-After":
                    str(retry_after)
            },
        )


    if (
        blocked_until is not None
        and blocked_until <= now
    ):

        _blocked_until.pop(
            key,
            None,
        )

        _failed_attempts.pop(
            key,
            None,
        )


def record_failed_login(
    key: str,
) -> None:

    now = monotonic()


    attempts = _failed_attempts.setdefault(
        key,
        deque(),
    )


    while (
        attempts
        and now - attempts[0]
        > ATTEMPT_WINDOW_SECONDS
    ):

        attempts.popleft()


    attempts.append(
        now
    )


    if (
        len(attempts)
        >= MAX_FAILED_ATTEMPTS
    ):

        _blocked_until[key] = (
            now
            + BLOCK_SECONDS
        )


        attempts.clear()


def clear_failed_logins(
    key: str,
) -> None:

    _failed_attempts.pop(
        key,
        None,
    )

    _blocked_until.pop(
        key,
        None,
    )


# ==============================
# LOGIN
# ==============================

@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Login",
)
def login(
    request: Request,

    data: LoginRequest,

    db: Annotated[
        Session,
        Depends(get_db)
    ],
):

    email = (
        str(data.email)
        .strip()
        .lower()
    )


    rate_limit_key = (
        get_rate_limit_key(
            request,
            email,
        )
    )


    check_login_block(
        rate_limit_key
    )


    # ==============================
    # FIND USER
    # ==============================

    user = db.scalar(

        select(User).where(

            func.lower(
                User.email
            )
            == email

        )

    )


    # ==============================
    # PASSWORD CHECK
    #
    # Kể cả email không tồn tại
    # vẫn chạy verify_password.
    #
    # Mục đích:
    # giảm khả năng đo thời gian phản hồi
    # để đoán email có tồn tại hay không.
    # ==============================

    password_hash_to_check = (

        user.password_hash

        if user is not None

        else _DUMMY_PASSWORD_HASH

    )


    password_valid = verify_password(
        data.password,
        password_hash_to_check,
    )


    # ==============================
    # EMAIL / PASSWORD SAI
    # ==============================

    if (
        user is None
        or
        not password_valid
    ):

        record_failed_login(
            rate_limit_key
        )


        raise HTTPException(
            status_code=
                status.HTTP_401_UNAUTHORIZED,

            detail=
                "Email hoặc mật khẩu không đúng",

            headers={
                "WWW-Authenticate":
                    "Bearer"
            },
        )


    # ==============================
    # ACCOUNT BỊ KHÓA
    # ==============================

    if not user.is_active:

        raise HTTPException(
            status_code=
                status.HTTP_403_FORBIDDEN,

            detail=
                "Tài khoản đã bị vô hiệu hóa",
        )


    # ==============================
    # LOGIN THÀNH CÔNG
    # ==============================

    clear_failed_logins(
        rate_limit_key
    )


    # ==============================
    # JWT
    # ==============================

    access_token = (
        create_access_token(

            user_id=
                user.id,

            role=
                user.role,

            tenant_id=
                user.tenant_id,

        )
    )


    return {

        "access_token":
            access_token,

        "token_type":
            "bearer",

        "user":
            user,

    }


# ==============================
# CURRENT USER
# ==============================

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Current User",
)
def get_me(

    current_user: Annotated[
        User,
        Depends(get_current_user)
    ],

):

    return current_user