from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Response,
    status,
)

from sqlalchemy import (
    func,
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

from backend.app.models.website_faq import (
    WebsiteFaq,
)

from backend.app.schemas.website_faq import (
    WebsiteFaqAdminResponse,
    WebsiteFaqCreate,
    WebsiteFaqUpdate,
)


router = APIRouter(
    prefix="/website-faqs",
    tags=[
        "Website FAQs"
    ],
    dependencies=[
        Depends(
            require_admin
        ),
    ],
)


# =========================================================
# HELPERS
# =========================================================

def clean_required_text(
    value: str,
    field_label: str,
) -> str:

    cleaned = (
        value.strip()
    )


    if not cleaned:

        raise HTTPException(
            status_code=
                status.HTTP_422_UNPROCESSABLE_ENTITY,

            detail=
                f"{field_label} không được để trống.",
        )


    return cleaned


def get_faq_or_404(
    faq_id: int,
    db: Session,
) -> WebsiteFaq:

    faq = db.get(
        WebsiteFaq,
        faq_id,
    )


    if faq is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Không tìm thấy FAQ.",
        )


    return faq


def build_admin_response(
    faq: WebsiteFaq,
) -> WebsiteFaqAdminResponse:

    return WebsiteFaqAdminResponse(
        id=
            faq.id,

        question=
            faq.question,

        answer=
            faq.answer,

        sort_order=
            faq.sort_order,

        is_visible=
            faq.is_visible,
    )


def normalize_sort_order(
    db: Session,
) -> None:

    faqs = db.scalars(
        select(
            WebsiteFaq
        )
        .order_by(
            WebsiteFaq.sort_order,
            WebsiteFaq.id,
        )
    ).all()


    for index, faq in enumerate(
        faqs
    ):

        faq.sort_order = (
            index
        )


# =========================================================
# GET ALL FAQs
# =========================================================

@router.get(
    "",
    response_model=
        list[WebsiteFaqAdminResponse],
    summary=
        "List Website FAQs",
)
def list_website_faqs(
    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    faqs = db.scalars(
        select(
            WebsiteFaq
        )
        .order_by(
            WebsiteFaq.sort_order,
            WebsiteFaq.id,
        )
    ).all()


    return [
        build_admin_response(
            faq
        )
        for faq in faqs
    ]


# =========================================================
# CREATE FAQ
# =========================================================

@router.post(
    "",
    response_model=
        WebsiteFaqAdminResponse,
    status_code=
        status.HTTP_201_CREATED,
    summary=
        "Create Website FAQ",
)
def create_website_faq(
    payload: WebsiteFaqCreate,

    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    question = (
        clean_required_text(
            payload.question,
            "Câu hỏi",
        )
    )


    answer = (
        clean_required_text(
            payload.answer,
            "Câu trả lời",
        )
    )


    max_sort_order = db.scalar(
        select(
            func.max(
                WebsiteFaq.sort_order
            )
        )
    )


    next_sort_order = (
        0
        if max_sort_order is None
        else max_sort_order + 1
    )


    faq = WebsiteFaq(
        question=
            question,

        answer=
            answer,

        sort_order=
            next_sort_order,

        is_visible=
            payload.is_visible,
    )


    db.add(
        faq
    )


    try:

        db.commit()

        db.refresh(
            faq
        )

    except Exception:

        db.rollback()

        raise


    return build_admin_response(
        faq
    )


# =========================================================
# UPDATE FAQ
# =========================================================

@router.put(
    "/{faq_id}",
    response_model=
        WebsiteFaqAdminResponse,
    summary=
        "Update Website FAQ",
)
def update_website_faq(
    faq_id: int,

    payload: WebsiteFaqUpdate,

    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    faq = (
        get_faq_or_404(
            faq_id,
            db,
        )
    )


    faq.question = (
        clean_required_text(
            payload.question,
            "Câu hỏi",
        )
    )


    faq.answer = (
        clean_required_text(
            payload.answer,
            "Câu trả lời",
        )
    )


    faq.is_visible = (
        payload.is_visible
    )


    try:

        db.commit()

        db.refresh(
            faq
        )

    except Exception:

        db.rollback()

        raise


    return build_admin_response(
        faq
    )


# =========================================================
# DELETE FAQ
# =========================================================

@router.delete(
    "/{faq_id}",
    status_code=
        status.HTTP_204_NO_CONTENT,
    summary=
        "Delete Website FAQ",
)
def delete_website_faq(
    faq_id: int,

    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    faq = (
        get_faq_or_404(
            faq_id,
            db,
        )
    )


    try:

        db.delete(
            faq
        )

        db.flush()


        # Sắp xếp lại thứ tự sau khi xóa.
        normalize_sort_order(
            db
        )


        db.commit()

    except Exception:

        db.rollback()

        raise


    return Response(
        status_code=
            status.HTTP_204_NO_CONTENT
    )