from typing import Annotated

from fastapi import (
    Depends,
    HTTPException,
    status,
)

from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)

from jwt.exceptions import InvalidTokenError

from sqlalchemy.orm import Session

from backend.app.dependencies import get_db
from backend.app.models.user import User
from backend.app.security import decode_access_token


# ==============================
# BEARER TOKEN
# ==============================

bearer_scheme = HTTPBearer(
    auto_error=False
)


# ==============================
# CURRENT USER
# ==============================

def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
    db: Annotated[
        Session,
        Depends(get_db),
    ],
) -> User:

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể xác thực tài khoản",
        headers={
            "WWW-Authenticate": "Bearer"
        },
    )


    # Không có token
    if credentials is None:
        raise credentials_exception


    # Không phải Bearer token
    if credentials.scheme.lower() != "bearer":
        raise credentials_exception


    # ==============================
    # DECODE JWT
    # ==============================

    try:

        payload = decode_access_token(
            credentials.credentials
        )

        subject = payload.get(
            "sub"
        )

        if subject is None:
            raise credentials_exception

        user_id = int(
            subject
        )

    except (
        InvalidTokenError,
        ValueError,
        TypeError,
    ):
        raise credentials_exception


    # ==============================
    # LOAD USER
    # ==============================

    user = db.get(
        User,
        user_id
    )


    if user is None:
        raise credentials_exception


    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị vô hiệu hóa",
        )


    return user


# ==============================
# ADMIN ONLY
# ==============================

def require_admin(
    current_user: Annotated[
        User,
        Depends(get_current_user),
    ],
) -> User:

    if current_user.role != "ADMIN":

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền Admin",
        )


    return current_user


# ==============================
# TENANT ONLY
# ==============================

def require_tenant(
    current_user: Annotated[
        User,
        Depends(get_current_user),
    ],
) -> User:

    if current_user.role != "TENANT":

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ tài khoản người thuê mới được truy cập",
        )


    if current_user.tenant_id is None:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản chưa được liên kết với người thuê",
        )


    return current_user