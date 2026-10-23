import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  FileText,
  IdCard,
  Mail,
  Phone,
  RefreshCw,
  UserRound,
  X,
} from "lucide-react";

import {
  apiPost,
} from "../api/api";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import type {
  Tenant,
  TenantCreate,
} from "../types/tenant";


// =========================================================
// TYPES
// =========================================================

type AddTenantModalProps = {
  open: boolean;

  onClose: () => void;

  onCreated: (
    tenant: Tenant
  ) => void;
};


// =========================================================
// ADD TENANT MODAL
// =========================================================

function AddTenantModal({
  open,
  onClose,
  onCreated,
}: AddTenantModalProps) {

  const [
    fullName,
    setFullName,
  ] = useState("");


  const [
    phone,
    setPhone,
  ] = useState("");


  const [
    email,
    setEmail,
  ] = useState("");


  const [
    citizenId,
    setCitizenId,
  ] = useState("");


  const [
    note,
    setNote,
  ] = useState("");


  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  // =========================================================
  // RESET WHEN OPEN
  // =========================================================

  useEffect(
    () => {

      if (
        !open
      ) {
        return;
      }


      setFullName("");

      setPhone("");

      setEmail("");

      setCitizenId("");

      setNote("");

      setError("");

    },
    [
      open,
    ]
  );


  // =========================================================
  // ESC TO CLOSE
  // =========================================================

  useEffect(
    () => {

      if (
        !open
      ) {
        return;
      }


      function handleKeyDown(
        event:
          KeyboardEvent
      ) {

        if (
          event.key
          === "Escape"
          &&
          !submitting
        ) {

          onClose();

        }

      }


      window.addEventListener(
        "keydown",
        handleKeyDown
      );


      return () => {

        window.removeEventListener(
          "keydown",
          handleKeyDown
        );

      };

    },
    [
      open,
      submitting,
      onClose,
    ]
  );


  // =========================================================
  // CLOSED
  // =========================================================

  if (
    !open
  ) {
    return null;
  }


  // =========================================================
  // RESET FORM
  // =========================================================

  function resetForm() {

    setFullName("");

    setPhone("");

    setEmail("");

    setCitizenId("");

    setNote("");

    setError("");

  }


  // =========================================================
  // CLOSE
  // =========================================================

  function handleClose() {

    if (
      submitting
    ) {
      return;
    }


    resetForm();

    onClose();

  }


  // =========================================================
  // SUBMIT
  // =========================================================

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    setError("");


    const cleanFullName =
      fullName.trim();


    if (
      !cleanFullName
    ) {

      setError(
        "Vui lòng nhập họ tên khách thuê."
      );

      return;

    }


    const data:
      TenantCreate = {

      full_name:
        cleanFullName,

      phone:
        phone.trim()

          ? phone.trim()

          : null,

      email:
        email.trim()

          ? email.trim()

          : null,

      citizen_id:
        citizenId.trim()

          ? citizenId.trim()

          : null,

      note:
        note.trim()

          ? note.trim()

          : null,

    };


    try {

      setSubmitting(
        true
      );


      const newTenant =
        await apiPost<
          Tenant,
          TenantCreate
        >(
          "/tenants",
          data
        );


      onCreated(
        newTenant
      );


      resetForm();

      onClose();


    } catch (err) {

      console.error(
        err
      );


      if (
        err instanceof Error
      ) {

        setError(
          err.message
        );

      } else {

        setError(
          "Không thể thêm khách thuê."
        );

      }


    } finally {

      setSubmitting(
        false
      );

    }

  }


  // =========================================================
  // UI
  // =========================================================

  return (

    <div
      className="
        fixed
        inset-0
        z-[100]
        overflow-y-auto
        bg-[#0b1625]/60
        p-4
        backdrop-blur-[2px]
      "
      onMouseDown={
        handleClose
      }
    >

      <div
        className="
          flex
          min-h-full
          items-center
          justify-center
        "
      >

        <div
          className="
            w-full
            max-w-2xl
            overflow-hidden
            rounded-2xl
            border
            border-[#e9e2d8]
            bg-white
            shadow-[0_24px_80px_rgba(18,32,51,0.28)]
          "
          onMouseDown={
            (
              event
            ) =>
              event.stopPropagation()
          }
        >

          {/* =================================================
              HEADER
          ================================================= */}

          <div
            className="
              relative
              overflow-hidden
              border-b
              border-[#26384f]
              bg-[#122033]
              px-5
              py-5
              text-white
              sm:px-6
            "
          >

            <div
              className="
                absolute
                -right-12
                -top-16
                h-44
                w-44
                rounded-full
                bg-[#e44763]/10
                blur-3xl
              "
            />


            <div
              className="
                relative
                z-10
                flex
                items-start
                justify-between
                gap-4
              "
            >

              <div
                className="
                  flex
                  items-start
                  gap-3
                "
              >

                <div
                  className="
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-[#d6a64c]/30
                    bg-[#d6a64c]/10
                    text-[#efd38f]
                  "
                >

                  <UserRound
                    size={21}
                  />

                </div>


                <div>

                  <div
                    className="
                      text-[11px]
                      font-semibold
                      uppercase
                      tracking-[0.18em]
                      text-[#d6a64c]
                    "
                  >
                    Rosehome Tenant
                  </div>


                  <h2
                    className="
                      mt-1
                      text-xl
                      font-semibold
                    "
                  >
                    Thêm khách thuê
                  </h2>


                  <p
                    className="
                      mt-1
                      text-sm
                      leading-5
                      text-slate-300
                    "
                  >
                    Lưu thông tin khách thuê trước khi tạo hợp đồng.
                  </p>

                </div>

              </div>


              <button
                type="button"
                onClick={
                  handleClose
                }
                disabled={
                  submitting
                }
                aria-label="Đóng"
                className="
                  inline-flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-white/10
                  bg-white/5
                  text-slate-300
                  transition
                  hover:bg-white/10
                  hover:text-white
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >

                <X
                  size={18}
                />

              </button>

            </div>

          </div>


          {/* =================================================
              FORM
          ================================================= */}

          <form
            onSubmit={
              handleSubmit
            }
          >

            <div
              className="
                max-h-[calc(100vh-180px)]
                space-y-6
                overflow-y-auto
                px-5
                py-5
                sm:px-6
              "
            >

              {/* =============================================
                  BASIC INFO
              ============================================= */}

              <section>

                <div
                  className="
                    flex
                    items-start
                    gap-3
                  "
                >

                  <div
                    className="
                      flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-lg
                      bg-[#eef1f5]
                      text-[#20334d]
                    "
                  >

                    <UserRound
                      size={17}
                    />

                  </div>


                  <div>

                    <h3
                      className="
                        text-sm
                        font-semibold
                        text-[#172033]
                      "
                    >
                      Thông tin khách thuê
                    </h3>


                    <p
                      className="
                        mt-0.5
                        text-xs
                        leading-5
                        text-slate-500
                      "
                    >
                      Nhập thông tin nhận diện và liên hệ của khách.
                    </p>

                  </div>

                </div>


                {/* FULL NAME */}

                <div
                  className="mt-4"
                >

                  <label
                    className="
                      mb-1.5
                      block
                      text-sm
                      font-semibold
                      text-[#172033]
                    "
                  >
                    Họ và tên

                    <span
                      className="
                        ml-1
                        text-[#e44763]
                      "
                    >
                      *
                    </span>

                  </label>


                  <div
                    className="relative"
                  >

                    <UserRound
                      size={17}
                      className="
                        pointer-events-none
                        absolute
                        left-3
                        top-1/2
                        -translate-y-1/2
                        text-slate-400
                      "
                    />


                    <Input
                      type="text"
                      value={
                        fullName
                      }
                      onChange={
                        (
                          event
                        ) =>
                          setFullName(
                            event.target.value
                          )
                      }
                      placeholder="Ví dụ: Nguyễn Văn A"
                      autoComplete="name"
                      className="
                        h-11
                        rounded-xl
                        border-[#ddd9cf]
                        pl-10
                      "
                    />

                  </div>

                </div>


                {/* PHONE + CITIZEN ID */}

                <div
                  className="
                    mt-4
                    grid
                    grid-cols-1
                    gap-4
                    md:grid-cols-2
                  "
                >

                  <div>

                    <label
                      className="
                        mb-1.5
                        block
                        text-sm
                        font-semibold
                        text-[#172033]
                      "
                    >
                      Số điện thoại
                    </label>


                    <div
                      className="relative"
                    >

                      <Phone
                        size={17}
                        className="
                          pointer-events-none
                          absolute
                          left-3
                          top-1/2
                          -translate-y-1/2
                          text-slate-400
                        "
                      />


                      <Input
                        type="tel"
                        value={
                          phone
                        }
                        onChange={
                          (
                            event
                          ) =>
                            setPhone(
                              event.target.value
                            )
                        }
                        placeholder="Số điện thoại (chưa cấu hình trong bản demo)"
                        autoComplete="tel"
                        className="
                          h-11
                          rounded-xl
                          border-[#ddd9cf]
                          pl-10
                        "
                      />

                    </div>

                  </div>


                  <div>

                    <label
                      className="
                        mb-1.5
                        block
                        text-sm
                        font-semibold
                        text-[#172033]
                      "
                    >
                      CCCD
                    </label>


                    <div
                      className="relative"
                    >

                      <IdCard
                        size={17}
                        className="
                          pointer-events-none
                          absolute
                          left-3
                          top-1/2
                          -translate-y-1/2
                          text-slate-400
                        "
                      />


                      <Input
                        type="text"
                        value={
                          citizenId
                        }
                        onChange={
                          (
                            event
                          ) =>
                            setCitizenId(
                              event.target.value
                            )
                        }
                        placeholder="012345678901"
                        inputMode="numeric"
                        className="
                          h-11
                          rounded-xl
                          border-[#ddd9cf]
                          pl-10
                        "
                      />

                    </div>

                  </div>

                </div>


                {/* EMAIL */}

                <div
                  className="mt-4"
                >

                  <label
                    className="
                      mb-1.5
                      block
                      text-sm
                      font-semibold
                      text-[#172033]
                    "
                  >
                    Email
                  </label>


                  <div
                    className="relative"
                  >

                    <Mail
                      size={17}
                      className="
                        pointer-events-none
                        absolute
                        left-3
                        top-1/2
                        -translate-y-1/2
                        text-slate-400
                      "
                    />


                    <Input
                      type="email"
                      value={
                        email
                      }
                      onChange={
                        (
                          event
                        ) =>
                          setEmail(
                            event.target.value
                          )
                      }
                      placeholder="tenant@example.com"
                      autoComplete="email"
                      className="
                        h-11
                        rounded-xl
                        border-[#ddd9cf]
                        pl-10
                      "
                    />

                  </div>

                </div>

              </section>


              <div
                className="
                  border-t
                  border-[#eeeae2]
                "
              />


              {/* =============================================
                  NOTE
              ============================================= */}

              <section>

                <div
                  className="
                    flex
                    items-start
                    gap-3
                  "
                >

                  <div
                    className="
                      flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-lg
                      bg-[#eef1f5]
                      text-[#20334d]
                    "
                  >

                    <FileText
                      size={17}
                    />

                  </div>


                  <div>

                    <h3
                      className="
                        text-sm
                        font-semibold
                        text-[#172033]
                      "
                    >
                      Ghi chú
                    </h3>


                    <p
                      className="
                        mt-0.5
                        text-xs
                        leading-5
                        text-slate-500
                      "
                    >
                      Thông tin bổ sung giúp quản lý khách thuê dễ hơn.
                    </p>

                  </div>

                </div>


                <div
                  className="mt-4"
                >

                  <textarea
                    value={
                      note
                    }
                    onChange={
                      (
                        event
                      ) =>
                        setNote(
                          event.target.value
                        )
                    }
                    rows={4}
                    placeholder="Ví dụ: Khách thuê làm việc giờ hành chính..."
                    className="
                      min-h-28
                      w-full
                      resize-y
                      rounded-xl
                      border
                      border-[#ddd9cf]
                      bg-white
                      px-3
                      py-3
                      text-sm
                      text-[#172033]
                      outline-none
                      transition
                      placeholder:text-slate-400
                      focus:border-[#d6a64c]
                    "
                  />

                </div>

              </section>


              {/* =============================================
                  PREVIEW
              ============================================= */}

              {fullName.trim() && (

                <div
                  className="
                    rounded-xl
                    border
                    border-[#ead9b7]
                    bg-[#fffaf0]
                    px-4
                    py-4
                  "
                >

                  <div
                    className="
                      flex
                      items-start
                      gap-3
                    "
                  >

                    <div
                      className="
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-[#f5eddc]
                        text-[#9a762f]
                      "
                    >

                      <UserRound
                        size={18}
                      />

                    </div>


                    <div
                      className="min-w-0"
                    >

                      <div
                        className="
                          text-xs
                          font-medium
                          text-[#8a6726]
                        "
                      >
                        Khách thuê mới
                      </div>


                      <strong
                        className="
                          mt-1
                          block
                          truncate
                          text-sm
                          text-[#172033]
                        "
                      >
                        {fullName.trim()}
                      </strong>


                      {(phone.trim()
                        ||
                        email.trim())
                        &&
                        (

                          <div
                            className="
                              mt-1
                              text-xs
                              text-slate-500
                            "
                          >

                            {phone.trim()
                              ||
                              "Chưa có SĐT"}

                            {email.trim()
                              ? ` • ${email.trim()}`
                              : ""}

                          </div>

                        )}

                    </div>

                  </div>

                </div>

              )}


              {/* =============================================
                  ERROR
              ============================================= */}

              {error && (

                <div
                  className="
                    flex
                    items-start
                    gap-2
                    rounded-xl
                    border
                    border-red-200
                    bg-red-50
                    px-4
                    py-3
                    text-sm
                    leading-5
                    text-red-700
                  "
                >

                  <AlertCircle
                    size={17}
                    className="
                      mt-0.5
                      shrink-0
                    "
                  />

                  {error}

                </div>

              )}

            </div>


            {/* =================================================
                ACTIONS
            ================================================= */}

            <div
              className="
                flex
                flex-col-reverse
                gap-2
                border-t
                border-[#eeeae2]
                bg-[#fcfbf8]
                px-5
                py-4
                sm:flex-row
                sm:items-center
                sm:justify-between
                sm:px-6
              "
            >

              <Button
                type="button"
                variant="outline"
                onClick={
                  handleClose
                }
                disabled={
                  submitting
                }
                className="
                  h-10
                  rounded-xl
                  border-[#ddd8ce]
                "
              >
                Hủy
              </Button>


              <Button
                type="submit"
                disabled={
                  submitting
                }
                className="
                  h-10
                  rounded-xl
                  bg-[#d6a64c]
                  px-5
                  text-[#172033]
                  hover:bg-[#e0b85f]
                "
              >

                {submitting ? (

                  <RefreshCw
                    className=
                      "animate-spin"
                  />

                ) : (

                  <CheckCircle2 />

                )}


                {submitting
                  ? "Đang lưu..."
                  : "Lưu khách thuê"}

              </Button>

            </div>

          </form>

        </div>

      </div>

    </div>

  );

}


export default AddTenantModal;