import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  AlertCircle,
  CircleDollarSign,
  MinusCircle,
  Plus,
  ReceiptText,
  RefreshCw,
  Tag,
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
  Invoice,
  InvoiceItemCreate,
} from "../types/invoice";


// =========================================================
// TYPES
// =========================================================

type AddInvoiceItemModalProps = {
  open: boolean;

  invoiceId: number;

  onClose: () => void;

  onUpdated: (
    invoice: Invoice
  ) => void;
};


// =========================================================
// HELPERS
// =========================================================

function formatMoney(
  value: number
) {

  return (
    new Intl.NumberFormat(
      "vi-VN"
    ).format(value)
    +
    " đ"
  );

}


// =========================================================
// ADD INVOICE ITEM MODAL
// =========================================================

function AddInvoiceItemModal({
  open,
  invoiceId,
  onClose,
  onUpdated,
}: AddInvoiceItemModalProps) {

  const [
    itemType,
    setItemType,
  ] = useState<
    "OTHER"
    |
    "DISCOUNT"
  >(
    "OTHER"
  );


  const [
    description,
    setDescription,
  ] = useState("");


  const [
    amount,
    setAmount,
  ] = useState("");


  const [
    submitting,
    setSubmitting,
  ] = useState(
    false
  );


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


      setItemType(
        "OTHER"
      );

      setDescription("");

      setAmount("");

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


  if (
    !open
  ) {
    return null;
  }


  // =========================================================
  // CALCULATED
  // =========================================================

  const numericAmount =
    Number(
      amount
    );


  const amountPreview =
    amount.trim() !== ""
    &&
    !Number.isNaN(
      numericAmount
    )

      ? numericAmount

      : 0;


  // =========================================================
  // RESET FORM
  // =========================================================

  function resetForm() {

    setItemType(
      "OTHER"
    );

    setDescription("");

    setAmount("");

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


    const cleanDescription =
      description.trim();


    if (
      !cleanDescription
    ) {

      setError(
        "Vui lòng nhập mô tả."
      );

      return;

    }


    const submittedAmount =
      Number(
        amount
      );


    if (
      amount.trim() === ""
      ||
      Number.isNaN(
        submittedAmount
      )
      ||
      submittedAmount <= 0
    ) {

      setError(
        "Số tiền phải lớn hơn 0."
      );

      return;

    }


    const data:
      InvoiceItemCreate = {

      item_type:
        itemType,

      description:
        cleanDescription,

      amount:
        submittedAmount,

    };


    try {

      setSubmitting(
        true
      );


      const updatedInvoice =
        await apiPost<
          Invoice,
          InvoiceItemCreate
        >(
          `/invoices/${invoiceId}/items`,
          data
        );


      onUpdated(
        updatedInvoice
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
          "Không thể thêm khoản phí."
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
            max-w-lg
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
                h-40
                w-40
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

                  <ReceiptText
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
                    Rosehome Billing
                  </div>


                  <h2
                    className="
                      mt-1
                      text-xl
                      font-semibold
                    "
                  >
                    Thêm khoản hóa đơn
                  </h2>


                  <p
                    className="
                      mt-1
                      text-sm
                      leading-5
                      text-slate-300
                    "
                  >
                    Thêm phụ phí hoặc giảm trừ cho hóa đơn nháp.
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
                space-y-5
                px-5
                py-5
                sm:px-6
              "
            >

              {/* =============================================
                  TYPE
              ============================================= */}

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
                  Loại khoản

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
                  className="
                    grid
                    grid-cols-2
                    gap-3
                  "
                >

                  <button
                    type="button"
                    onClick={
                      () =>
                        setItemType(
                          "OTHER"
                        )
                    }
                    className={
                      itemType === "OTHER"

                        ? `
                          flex
                          min-h-20
                          flex-col
                          items-start
                          justify-center
                          rounded-xl
                          border
                          border-[#d6a64c]
                          bg-[#fffaf0]
                          px-4
                          text-left
                          transition
                        `

                        : `
                          flex
                          min-h-20
                          flex-col
                          items-start
                          justify-center
                          rounded-xl
                          border
                          border-[#ddd9cf]
                          bg-white
                          px-4
                          text-left
                          transition
                          hover:border-[#d6a64c]
                          hover:bg-[#fffdf9]
                        `
                    }
                  >

                    <div
                      className="
                        flex
                        items-center
                        gap-2
                      "
                    >

                      <Plus
                        size={17}
                        className=
                          "text-[#9a762f]"
                      />


                      <strong
                        className="
                          text-sm
                          text-[#172033]
                        "
                      >
                        Phụ phí
                      </strong>

                    </div>


                    <span
                      className="
                        mt-1
                        text-xs
                        text-slate-500
                      "
                    >
                      Cộng thêm vào hóa đơn
                    </span>

                  </button>


                  <button
                    type="button"
                    onClick={
                      () =>
                        setItemType(
                          "DISCOUNT"
                        )
                    }
                    className={
                      itemType
                      === "DISCOUNT"

                        ? `
                          flex
                          min-h-20
                          flex-col
                          items-start
                          justify-center
                          rounded-xl
                          border
                          border-[#e44763]
                          bg-[#fcecef]
                          px-4
                          text-left
                          transition
                        `

                        : `
                          flex
                          min-h-20
                          flex-col
                          items-start
                          justify-center
                          rounded-xl
                          border
                          border-[#ddd9cf]
                          bg-white
                          px-4
                          text-left
                          transition
                          hover:border-[#e44763]
                          hover:bg-[#fff8fa]
                        `
                    }
                  >

                    <div
                      className="
                        flex
                        items-center
                        gap-2
                      "
                    >

                      <MinusCircle
                        size={17}
                        className=
                          "text-[#b92f49]"
                      />


                      <strong
                        className="
                          text-sm
                          text-[#172033]
                        "
                      >
                        Giảm trừ
                      </strong>

                    </div>


                    <span
                      className="
                        mt-1
                        text-xs
                        text-slate-500
                      "
                    >
                      Trừ khỏi tổng hóa đơn
                    </span>

                  </button>

                </div>

              </div>


              {/* =============================================
                  DESCRIPTION
              ============================================= */}

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
                  Mô tả

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
                  className="
                    relative
                  "
                >

                  <Tag
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
                      description
                    }
                    onChange={
                      (
                        event
                      ) =>
                        setDescription(
                          event.target.value
                        )
                    }
                    placeholder={
                      itemType === "OTHER"
                        ? "Ví dụ: Phí vệ sinh"
                        : "Ví dụ: Giảm giá tháng này"
                    }
                    className="
                      h-11
                      rounded-xl
                      border-[#ddd9cf]
                      pl-10
                    "
                  />

                </div>

              </div>


              {/* =============================================
                  AMOUNT
              ============================================= */}

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
                  Số tiền

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
                  className="
                    relative
                  "
                >

                  <CircleDollarSign
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
                    type="number"
                    min="1"
                    value={
                      amount
                    }
                    onChange={
                      (
                        event
                      ) =>
                        setAmount(
                          event.target.value
                        )
                    }
                    placeholder="Ví dụ: 200000"
                    className="
                      h-11
                      rounded-xl
                      border-[#ddd9cf]
                      pl-10
                      pr-14
                    "
                  />


                  <span
                    className="
                      pointer-events-none
                      absolute
                      right-3
                      top-1/2
                      -translate-y-1/2
                      text-xs
                      font-medium
                      text-slate-400
                    "
                  >
                    VND
                  </span>

                </div>


                {amount.trim() !== "" && (

                  <div
                    className="
                      mt-2
                      flex
                      items-center
                      justify-between
                      gap-3
                      rounded-lg
                      bg-[#f8f7f4]
                      px-3
                      py-2
                      text-xs
                    "
                  >

                    <span
                      className=
                        "text-slate-500"
                    >
                      Giá trị khoản
                    </span>


                    <strong
                      className={
                        itemType
                        === "DISCOUNT"

                          ? "text-[#b92f49]"

                          : "text-[#172033]"
                      }
                    >

                      {itemType
                      === "DISCOUNT"
                        ? "- "
                        : "+ "}

                      {formatMoney(
                        amountPreview
                      )}

                    </strong>

                  </div>

                )}

              </div>


              {/* =============================================
                  DISCOUNT INFO
              ============================================= */}

              {itemType
                === "DISCOUNT"
                &&
                (

                  <div
                    className="
                      flex
                      items-start
                      gap-3
                      rounded-xl
                      border
                      border-[#efced4]
                      bg-[#fcecef]
                      px-4
                      py-3
                      text-sm
                      leading-5
                      text-[#9f2940]
                    "
                  >

                    <MinusCircle
                      size={17}
                      className=
                        "mt-0.5 shrink-0"
                    />


                    <span>
                      Nhập số tiền dương. Hệ thống sẽ tự chuyển khoản này thành giảm trừ và trừ khỏi tổng hóa đơn.
                    </span>

                  </div>

                )}


              {/* =============================================
                  OTHER INFO
              ============================================= */}

              {itemType
                === "OTHER"
                &&
                (

                  <div
                    className="
                      flex
                      items-start
                      gap-3
                      rounded-xl
                      border
                      border-[#ead9b7]
                      bg-[#fffaf0]
                      px-4
                      py-3
                      text-sm
                      leading-5
                      text-[#8a6726]
                    "
                  >

                    <ReceiptText
                      size={17}
                      className=
                        "mt-0.5 shrink-0"
                    />


                    <span>
                      Khoản phụ phí sẽ được cộng trực tiếp vào tổng giá trị hóa đơn.
                    </span>

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
                    className=
                      "mt-0.5 shrink-0"
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
                className={
                  itemType === "DISCOUNT"

                    ? `
                      h-10
                      rounded-xl
                      bg-[#e44763]
                      px-5
                      text-white
                      hover:bg-[#cf3852]
                    `

                    : `
                      h-10
                      rounded-xl
                      bg-[#d6a64c]
                      px-5
                      text-[#172033]
                      hover:bg-[#e0b85f]
                    `
                }
              >

                {submitting ? (

                  <RefreshCw
                    className=
                      "animate-spin"
                  />

                ) : itemType
                  === "DISCOUNT" ? (

                    <MinusCircle />

                  ) : (

                    <Plus />

                  )}


                {submitting
                  ? "Đang lưu..."
                  : itemType === "DISCOUNT"
                    ? "Thêm giảm trừ"
                    : "Thêm phụ phí"}

              </Button>

            </div>

          </form>

        </div>

      </div>

    </div>

  );

}


export default AddInvoiceItemModal;