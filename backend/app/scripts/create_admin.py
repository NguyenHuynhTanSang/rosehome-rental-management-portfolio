from getpass import getpass

from sqlalchemy import select

from backend.app.database import SessionLocal
from backend.app.models.user import User
from backend.app.security import hash_password


def main():
    print("=== CREATE ADMIN ACCOUNT ===")

    email = input(
        "Email admin: "
    ).strip().lower()

    if not email:
        print("Email không được để trống.")
        return

    password = getpass(
        "Mật khẩu: "
    )

    confirm_password = getpass(
        "Nhập lại mật khẩu: "
    )

    if len(password) < 8:
        print(
            "Mật khẩu phải có ít nhất 8 ký tự."
        )
        return

    if password != confirm_password:
        print(
            "Hai mật khẩu không khớp."
        )
        return

    db = SessionLocal()

    try:
        existing_user = db.scalar(
            select(User).where(
                User.email == email
            )
        )

        if existing_user:
            print(
                "Email này đã tồn tại."
            )
            return

        admin = User(
            email=email,
            password_hash=hash_password(
                password
            ),
            role="ADMIN",
            is_active=True,
            tenant_id=None,
        )

        db.add(admin)

        db.commit()

        db.refresh(admin)

        print()
        print(
            "Tạo Admin thành công!"
        )
        print(
            f"ID: {admin.id}"
        )
        print(
            f"Email: {admin.email}"
        )
        print(
            f"Role: {admin.role}"
        )

    except Exception as exc:
        db.rollback()

        print(
            "Có lỗi khi tạo Admin:"
        )

        print(exc)

    finally:
        db.close()


if __name__ == "__main__":
    main()