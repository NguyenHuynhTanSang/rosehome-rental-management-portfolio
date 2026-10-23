from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
)

from sqlalchemy import (
    select,
)

from sqlalchemy.orm import (
    Session,
)

from backend.app.dependencies import (
    get_db,
)

from backend.app.models.website_faq import (
    WebsiteFaq,
)

from backend.app.schemas.website_faq import (
    PublicWebsiteFaqResponse,
)


router = APIRouter(
    prefix="/public/faqs",
    tags=[
        "Public Website FAQs"
    ],
)


@router.get(
    "",
    response_model=
        list[PublicWebsiteFaqResponse],
    summary=
        "List Public Website FAQs",
)
def list_public_website_faqs(
    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    faqs = db.scalars(
        select(
            WebsiteFaq
        )
        .where(
            WebsiteFaq.is_visible.is_(
                True
            )
        )
        .order_by(
            WebsiteFaq.sort_order,
            WebsiteFaq.id,
        )
    ).all()


    return [
        PublicWebsiteFaqResponse(
            id=
                faq.id,

            question=
                faq.question,

            answer=
                faq.answer,
        )
        for faq in faqs
    ]