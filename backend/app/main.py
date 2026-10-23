import os

from backend.app.api.checkout_settlements import router as checkout_settlements_router

from backend.app.api.public_website_images import (
    router as public_website_images_router,
)

from backend.app.api.website_images import (
    router as website_images_router,
)

from backend.app.api.website_faqs import (
    router as website_faqs_router,
)

from backend.app.api.public_faqs import (
    router as public_faqs_router,
)

from backend.app.api.public_website_settings import (
    router as public_website_settings_router,
)

from backend.app.api.website_settings import (
    router as website_settings_router,
)

from backend.app.api.public_rooms import (
    router as public_rooms_router,
)

from backend.app.api.app_updates import (
    router as app_updates_router,
)

from pathlib import Path

from dotenv import load_dotenv

from fastapi import (
    Depends,
    FastAPI,
    Request,
    status,
)

from fastapi.middleware.cors import (
    CORSMiddleware,
)

from fastapi.responses import (
    JSONResponse,
)


from backend.app.auth_dependencies import (
    require_admin,
)


from backend.app.api.auth import (
    router as auth_router,
)

from backend.app.api.rooms import (
    router as rooms_router,
)

from backend.app.api.tenants import (
    router as tenants_router,
)

from backend.app.api.contracts import (
    router as contracts_router,
)

from backend.app.api.deposits import (
    router as deposits_router,
)

from backend.app.api.meter_readings import (
    router as meter_readings_router,
)

from backend.app.api.invoices import (
    router as invoices_router,
)

from backend.app.api.payments import (
    router as payments_router,
)

from backend.app.api.payment_history import (
    router as payment_history_router,
)

from backend.app.api.reports import (
    router as reports_router,
)

from backend.app.api.notifications import (
    router as notifications_router,
)

from backend.app.api.ai import (
    router as ai_router,
)

from backend.app.api.audit_logs import (
    router as audit_logs_router,
)


from backend.app.database import (
    test_database_connection,
)

from backend.app.openapi import (
    tags_metadata,
)


# =========================================================
# ENV
# =========================================================

ENV_PATH = (
    Path(__file__)
    .resolve()
    .parents[1]
    / ".env"
)

load_dotenv(
    ENV_PATH
)


# =========================================================
# ENVIRONMENT
# =========================================================

APP_ENV = (
    os.getenv(
        "APP_ENV",
        "development",
    )
    .strip()
    .lower()
)


IS_PRODUCTION = (
    APP_ENV
    == "production"
)


ENABLE_DOCS = (
    os.getenv(
        "ENABLE_DOCS",
        "false",
    )
    .strip()
    .lower()
    == "true"
)


# Production luôn tắt Swagger/OpenAPI.
#
# Kể cả vô tình:
#
# ENABLE_DOCS=true
#
# trên Render thì docs vẫn không được mở.
DOCS_ENABLED = (
    ENABLE_DOCS
    and
    not IS_PRODUCTION
)


# =========================================================
# FRONTEND ORIGIN
# =========================================================

# Portfolio default only; FRONTEND_ORIGIN can override this local origin.
DEFAULT_PRODUCTION_FRONTEND = ("http://localhost:5173")


PRODUCTION_FRONTEND_ORIGIN = (
    os.getenv(
        "FRONTEND_ORIGIN",
        DEFAULT_PRODUCTION_FRONTEND,
    )
    .strip()
    .rstrip("/")
)


# Capacitor Android mặc định chạy WebView
# với origin https://localhost.
#
# Origin này chỉ dùng để cho app Android
# gọi API production qua CORS.
CAPACITOR_ANDROID_ORIGIN = (
    "https://localhost"
)


if IS_PRODUCTION:

    ALLOWED_ORIGINS = [
        PRODUCTION_FRONTEND_ORIGIN,
        CAPACITOR_ANDROID_ORIGIN,
    ]

else:

    ALLOWED_ORIGINS = [

        # ==============================
        # LOCAL DEV
        # ==============================

        "http://localhost:5173",

        "http://127.0.0.1:5173",


        # ==============================
        # LOCAL PREVIEW
        # ==============================

        "http://localhost:4173",

        "http://127.0.0.1:4173",

        "http://localhost:5174",
        "http://127.0.0.1:5174",


        # ==============================
        # PRODUCTION FRONTEND
        #
        # Cho phép test local frontend
        # với backend production nếu cần.
        # ==============================

        PRODUCTION_FRONTEND_ORIGIN,


        # ==============================
        # CAPACITOR ANDROID
        # ==============================

        CAPACITOR_ANDROID_ORIGIN,

    ]


# Loại bỏ origin trùng nhau.
ALLOWED_ORIGINS = list(
    dict.fromkeys(
        ALLOWED_ORIGINS
    )
)


# =========================================================
# FASTAPI
# =========================================================

app = FastAPI(

    title=
        "Rental Management API",

    description=
        "API quản lý phòng trọ và căn hộ Rosehome",

    version=
        "1.2.0",

    openapi_tags=
        tags_metadata,

    docs_url=(
        "/docs"
        if DOCS_ENABLED
        else None
    ),

    redoc_url=(
        "/redoc"
        if DOCS_ENABLED
        else None
    ),

    openapi_url=(
        "/openapi.json"
        if DOCS_ENABLED
        else None
    ),

    swagger_ui_parameters={

        "docExpansion":
            "none",

        "filter":
            True,

        "displayRequestDuration":
            True,

    },

)


# =========================================================
# CORS
# =========================================================

app.add_middleware(

    CORSMiddleware,

    allow_origins=
        ALLOWED_ORIGINS,

    allow_credentials=
        True,

    allow_methods=[
        "*"
    ],

    allow_headers=[
        "*"
    ],

    # Cho frontend đọc Retry-After
    # khi login bị rate limit.
    expose_headers=[
        "Retry-After"
    ],

)


# =========================================================
# SECURITY HEADERS
# =========================================================

@app.middleware(
    "http"
)
async def add_security_headers(
    request: Request,
    call_next,
):

    response = await call_next(
        request
    )


    # =====================================================
    # PREVENT API RESPONSE CACHING
    # =====================================================

    response.headers[
        "Cache-Control"
    ] = (
        "no-store"
    )


    # =====================================================
    # MIME SNIFFING
    # =====================================================

    response.headers[
        "X-Content-Type-Options"
    ] = (
        "nosniff"
    )


    # =====================================================
    # CLICKJACKING
    # =====================================================

    response.headers[
        "X-Frame-Options"
    ] = (
        "DENY"
    )


    # =====================================================
    # REFERRER LEAKAGE
    # =====================================================

    response.headers[
        "Referrer-Policy"
    ] = (
        "no-referrer"
    )


    # =====================================================
    # DISABLE UNUSED BROWSER PERMISSIONS
    # =====================================================

    response.headers[
        "Permissions-Policy"
    ] = (
        "camera=(), "
        "microphone=(), "
        "geolocation=(), "
        "payment=(), "
        "usb=()"
    )


    # =====================================================
    # LEGACY CROSS-DOMAIN POLICY
    # =====================================================

    response.headers[
        "X-Permitted-Cross-Domain-Policies"
    ] = (
        "none"
    )


    # =====================================================
    # PRODUCTION ONLY
    # =====================================================

    if IS_PRODUCTION:

        # HTTPS only
        response.headers[
            "Strict-Transport-Security"
        ] = (
            "max-age=31536000; "
            "includeSubDomains"
        )


        # Backend chỉ trả API/JSON.
        # Không cho trình duyệt load script,
        # iframe, form... từ response backend.
        response.headers[
            "Content-Security-Policy"
        ] = (
            "default-src 'none'; "
            "base-uri 'none'; "
            "frame-ancestors 'none'; "
            "form-action 'none'"
        )


    return response


# =========================================================
# AUTH ROUTER
#
# /auth/login
# → public
#
# /auth/me
# → endpoint tự dùng get_current_user
# =========================================================

app.include_router(
    auth_router
)


# =========================================================
# PUBLIC WEBSITE / APP
# NO JWT REQUIRED
# =========================================================

app.include_router(
    public_rooms_router
)


app.include_router(
    public_website_settings_router
)


# Version metadata public.
#
# Endpoint download APK bên trong
# app_updates_router vẫn yêu cầu ADMIN JWT.
app.include_router(
    app_updates_router
)


# =========================================================
# ADMIN DEPENDENCY
# =========================================================

ADMIN_DEPENDENCIES = [

    Depends(
        require_admin
    )

]


# =========================================================
# ADMIN ROUTERS
# JWT + ADMIN REQUIRED
# =========================================================

app.include_router(

    website_settings_router,

    dependencies=
        ADMIN_DEPENDENCIES,

)

app.include_router(

    audit_logs_router,

    dependencies=
        ADMIN_DEPENDENCIES,

)


app.include_router(

    rooms_router,

    dependencies=
        ADMIN_DEPENDENCIES,

)


app.include_router(

    tenants_router,

    dependencies=
        ADMIN_DEPENDENCIES,

)


app.include_router(

    contracts_router,

    dependencies=
        ADMIN_DEPENDENCIES,

)


app.include_router(

    deposits_router,

    dependencies=
        ADMIN_DEPENDENCIES,

)


app.include_router(

    meter_readings_router,

    dependencies=
        ADMIN_DEPENDENCIES,

)


app.include_router(

    invoices_router,

    dependencies=
        ADMIN_DEPENDENCIES,

)


app.include_router(

    payments_router,

    dependencies=
        ADMIN_DEPENDENCIES,

)


app.include_router(

    payment_history_router,

    dependencies=
        ADMIN_DEPENDENCIES,

)


app.include_router(

    reports_router,

    dependencies=
        ADMIN_DEPENDENCIES,

)


app.include_router(

    notifications_router,

    dependencies=
        ADMIN_DEPENDENCIES,

)

app.include_router(
    website_images_router,
    dependencies=
        ADMIN_DEPENDENCIES,
)


# =========================================================
# ROSEHOME AI
# ADMIN ONLY
# =========================================================

app.include_router(

    ai_router,

    dependencies=
        ADMIN_DEPENDENCIES,

)

app.include_router(
    website_faqs_router,
    dependencies=
        ADMIN_DEPENDENCIES,
)

app.include_router(
    public_faqs_router
)

app.include_router(
    public_website_images_router
)


# =========================================================
# ROOT
# =========================================================

@app.get(
    "/",
    include_in_schema=False,
)
def root():

    # Không public version/build
    # của BACKEND để giảm fingerprinting.
    return {

        "status":
            "ok",

    }


# =========================================================
# DATABASE HEALTH
# =========================================================

@app.get(

    "/health/database",

    include_in_schema=False,

)
def database_health():

    try:

        test_database_connection()


        # Không trả tên DB/provider/
        # connection information.
        return {

            "status":
                "ok",

        }


    except Exception:

        # DB lỗi phải trả HTTP 503,
        # thay vì HTTP 200 + "disconnected".
        return JSONResponse(

            status_code=
                status.HTTP_503_SERVICE_UNAVAILABLE,

            content={

                "status":
                    "unavailable",

            },

        )
app.include_router(checkout_settlements_router)
