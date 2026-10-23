import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  FileImage,
  Landmark,
  Paperclip,
  ReceiptText,
  RefreshCw,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";

import {
  apiPost,
  apiPostFormData,
} from "../api/api";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import type {
  Payment,
  PaymentCreate,
  ManualPaymentMethod,
} from "../types/payment";


// =========================================================
// TYPES
// =========================================================

type AddPaymentModalProps = {
  open: boolean;

  invoiceId: number;

  remainingAmount: number;

  onClose: () => void;

  onCreated: (
    payment: Payment
  ) => void;
};


// =========================================================
// CONFIG
// =========================================================

const MAX_RECEIPT_SIZE =
  5 * 1024 * 1024;


const ALLOWED_RECEIPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];


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


function formatFileSize(
  bytes: number
) {

  if (
    bytes < 1024
  ) {
    return `${bytes} B`;
  }


  if (
    bytes
    <
    1024 * 1024
  ) {

    return (
      `${(
        bytes / 1024
      ).toFixed(1)} KB`
    );

  }


  return (
    `${(
      bytes
      /
      (
        1024 * 1024
      )
    ).toFixed(1)} MB`
  );

}


function getPaymentMethodText(
  method:
    ManualPaymentMethod
) {

  if (
    method
    === "BANK_TRANSFER"
  ) {
    return "Chuyển khoản";
  }


  if (
    method
    === "CASH"
  ) {
    return "Tiền mặt";
  }


  return "Khác";

}


// =========================================================
// ADD PAYMENT MODAL
// =========================================================

function AddPaymentModal({
  open,
  invoiceId,
  remainingAmount,
  onClose,
  onCreated,
}: AddPaymentModalProps) {

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );


  const [
    amount,
    setAmount,
  ] = useState("");


  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState<ManualPaymentMethod>(
    "BANK_TRANSFER"
  );


  const [
    transactionReference,
    setTransactionReference,
  ] = useState("");


  const [
    receiptFile,
    setReceiptFile,
  ] = useState<File | null>(
    null
  );


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
  // OPEN / RESET
  // =========================================================

  useEffect(
    () => {

      if (
        !open
      ) {
        return;
      }


      setAmount(
        String(
          remainingAmount
        )
      );


      setPaymentMethod(
        "BANK_TRANSFER"
      );


      setTransactionReference("");

      setReceiptFile(
        null
      );

      setNote("");

      setError("");


      if (
        fileInputRef.current
      ) {

        fileInputRef.current.value =
          "";

      }

    },
    [
      open,
      remainingAmount,
    ]
  );


  // =========================================================
  // ESC
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


  const validAmount =
    amount.trim() !== ""
    &&
    !Number.isNaN(
      numericAmount
    )
    &&
    numericAmount > 0;


  const afterPaymentRemaining =
    validAmount

      ? Math.max(
          0,
          remainingAmount
          -
          numericAmount
        )

      : remainingAmount;


  // =========================================================
  // RESET FORM
  // =========================================================

  function resetForm() {

    setAmount("");

    setPaymentMethod(
      "BANK_TRANSFER"
    );

    setTransactionReference("");

    setReceiptFile(
      null
    );

    setNote("");

    setError("");


    if (
      fileInputRef.current
    ) {

      fileInputRef.current.value =
        "";

    }

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
  // REMOVE RECEIPT
  // =========================================================

  function handleRemoveReceipt() {

    setReceiptFile(
      null
    );


    if (
      fileInputRef.current
    ) {

      fileInputRef.current.value =
        "";

    }

  }


  // =========================================================
  // RECEIPT
  // =========================================================

  function handleReceiptChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {

    setError("");


    const file =
      event.target.files?.[0];


    if (
      !file
    ) {

      setReceiptFile(
        null
      );

      return;

    }


    if (
      !ALLOWED_RECEIPT_TYPES.includes(
        file.type
      )
    ) {

      setReceiptFile(
        null
      );


      event.target.value =
        "";


      setError(
        "Chứng từ chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP."
      );


      return;

    }


    if (
      file.size
      >
      MAX_RECEIPT_SIZE
    ) {

      setReceiptFile(
        null
      );


      event.target.value =
        "";


      setError(
        "Ảnh chứng từ không được lớn hơn 5 MB."
      );


      return;

    }


    setReceiptFile(
      file
    );

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


    if (
      submittedAmount
      >
      remainingAmount
    ) {

      setError(
        "Số tiền thanh toán không được lớn hơn số tiền còn lại."
      );


      return;

    }


    const data:
      PaymentCreate = {

      amount:
        submittedAmount,

      payment_method:
        paymentMethod,

      transaction_reference:
        paymentMethod
        === "BANK_TRANSFER"
        &&
        transactionReference.trim()

          ? transactionReference.trim()

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


      // =====================================================
      // 1. CREATE PAYMENT
      // =====================================================

      const newPayment =
        await apiPost<
          Payment,
          PaymentCreate
        >(
          `/invoices/${invoiceId}/payments`,
          data
        );


      let finalPayment =
        newPayment;


      // =====================================================
      // 2. UPLOAD RECEIPT
      // =====================================================

      if (
        receiptFile
      ) {

        const formData =
          new FormData();


        formData.append(
          "file",
          receiptFile
        );


        try {

          finalPayment =
            await apiPostFormData<
              Payment
            >(
              `/invoices/${invoiceId}/payments/${newPayment.id}/receipt`,
              formData
            );


        } catch (
          receiptError
        ) {

          console.error(
            receiptError
          );


          /*
            Payment đã được tạo thành công.
            Phải cập nhật giao diện ngay
            để tránh người dùng ghi nhận
            lại cùng khoản tiền lần thứ hai.
          */

          onCreated(
            newPayment
          );


          resetForm();

          onClose();


          window.alert(
            "Thanh toán đã được ghi nhận thành công, "
            +
            "nhưng tải ảnh chứng từ thất bại.\n\n"
            +
            "KHÔNG ghi nhận lại khoản thanh toán này "
            +
            "để tránh bị trùng tiền."
          );


          return;

        }

      }


      // =====================================================
      // 3. COMPLETE
      // =====================================================

      onCreated(
        finalPayment
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
          "Không thể ghi nhận thanh toán."
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
            max-w-xl
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

                  <CircleDollarSign
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
                    Rosehome Payment
                  </div>


                  <h2
                    className="
                      mt-1
                      text-xl
                      font-semibold
                    "
                  >
                    Ghi nhận thanh toán
                  </h2>


                  <p
                    className="
                      mt-1
                      text-sm
                      leading-5
                      text-slate-300
                    "
                  >
                    Xác nhận khoản tiền khách đã thanh toán cho hóa đơn.
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
                space-y-5
                overflow-y-auto
                px-5
                py-5
                sm:px-6
              "
            >

              {/* =============================================
                  REMAINING
              ============================================= */}

              <div
                className="
                  grid
                  grid-cols-1
                  gap-3
                  sm:grid-cols-2
                "
              >

                <div
                  className="
                    rounded-xl
                    border
                    border-red-200
                    bg-red-50
                    px-4
                    py-4
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      gap-2
                      text-xs
                      font-medium
                      text-red-600
                    "
                  >

                    <WalletCards
                      size={15}
                    />

                    Còn phải thanh toán

                  </div>


                  <strong
                    className="
                      mt-2
                      block
                      text-xl
                      text-red-700
                    "
                  >
                    {formatMoney(
                      remainingAmount
                    )}
                  </strong>

                </div>


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
                      items-center
                      gap-2
                      text-xs
                      font-medium
                      text-[#8a6726]
                    "
                  >

                    <CheckCircle2
                      size={15}
                    />

                    Còn lại sau lần này

                  </div>


                  <strong
                    className={
                      afterPaymentRemaining > 0

                        ? `
                          mt-2
                          block
                          text-xl
                          text-[#172033]
                        `

                        : `
                          mt-2
                          block
                          text-xl
                          text-emerald-700
                        `
                    }
                  >
                    {formatMoney(
                      afterPaymentRemaining
                    )}
                  </strong>

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
                  Số tiền thanh toán
                  <span
                    className=
                      "ml-1 text-[#e44763]"
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
                    max={
                      remainingAmount
                    }
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
                    placeholder="Ví dụ: 3756000"
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


                {amount !== "" && (

                  <p
                    className="
                      mt-1.5
                      text-xs
                      text-slate-500
                    "
                  >
                    Giá trị:{" "}

                    <strong
                      className=
                        "text-[#172033]"
                    >
                      {formatMoney(
                        Number(
                          amount
                        )
                        ||
                        0
                      )}
                    </strong>
                  </p>

                )}

              </div>


              {/* =============================================
                  METHOD
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
                  Phương thức thanh toán
                  <span
                    className=
                      "ml-1 text-[#e44763]"
                  >
                    *
                  </span>
                </label>


                <select
                  value={
                    paymentMethod
                  }
                  onChange={
                    (
                      event
                    ) => {

                      const value =
                        event.target.value;


                      if (
                        value === "CASH"
                        ||
                        value === "BANK_TRANSFER"
                        ||
                        value === "OTHER"
                      ) {

                        setPaymentMethod(
                          value
                        );


                        if (
                          value
                          !== "BANK_TRANSFER"
                        ) {

                          setTransactionReference(
                            ""
                          );

                        }

                      }

                    }
                  }
                  className="
                    h-11
                    w-full
                    rounded-xl
                    border
                    border-[#ddd9cf]
                    bg-white
                    px-3
                    text-sm
                    text-[#172033]
                    outline-none
                    transition
                    focus:border-[#d6a64c]
                  "
                >

                  <option value="BANK_TRANSFER">
                    Chuyển khoản
                  </option>

                  <option value="CASH">
                    Tiền mặt
                  </option>

                  <option value="OTHER">
                    Khác
                  </option>

                </select>


                <div
                  className="
                    mt-2
                    flex
                    items-center
                    gap-2
                    text-xs
                    text-slate-500
                  "
                >

                  {paymentMethod === "BANK_TRANSFER" ? (

                    <Landmark
                      size={14}
                    />

                  ) : paymentMethod === "CASH" ? (

                    <Banknote
                      size={14}
                    />

                  ) : (

                    <ReceiptText
                      size={14}
                    />

                  )}


                  {getPaymentMethodText(
                    paymentMethod
                  )}

                </div>

              </div>


              {/* =============================================
                  TRANSACTION REFERENCE
              ============================================= */}

              {paymentMethod
                === "BANK_TRANSFER"
                &&
                (

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
                      Mã giao dịch
                    </label>


                    <Input
                      type="text"
                      maxLength={
                        100
                      }
                      value={
                        transactionReference
                      }
                      onChange={
                        (
                          event
                        ) =>
                          setTransactionReference(
                            event.target.value
                          )
                      }
                      placeholder="Ví dụ: FT260826123456"
                      className="
                        h-11
                        rounded-xl
                        border-[#ddd9cf]
                      "
                    />


                    <p
                      className="
                        mt-1.5
                        text-xs
                        leading-5
                        text-slate-500
                      "
                    >
                      Không bắt buộc. Có thể nhập mã giao dịch từ ứng dụng ngân hàng.
                    </p>

                  </div>

                )}


              {/* =============================================
                  RECEIPT
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
                  Chứng từ / Bill
                </label>


                {!receiptFile ? (

                  <label
                    className="
                      flex
                      cursor-pointer
                      flex-col
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-dashed
                      border-[#d8c79f]
                      bg-[#fffdf9]
                      px-5
                      py-6
                      text-center
                      transition
                      hover:border-[#d6a64c]
                      hover:bg-[#fffaf1]
                    "
                  >

                    <div
                      className="
                        flex
                        h-10
                        w-10
                        items-center
                        justify-center
                        rounded-xl
                        bg-[#f5eddc]
                        text-[#9a762f]
                      "
                    >

                      <FileImage
                        size={19}
                      />

                    </div>


                    <strong
                      className="
                        mt-3
                        text-sm
                        text-[#172033]
                      "
                    >
                      Chọn ảnh chứng từ
                    </strong>


                    <span
                      className="
                        mt-1
                        text-xs
                        text-slate-500
                      "
                    >
                      JPG, PNG hoặc WEBP • tối đa 5 MB
                    </span>


                    <input
                      ref={
                        fileInputRef
                      }
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={
                        handleReceiptChange
                      }
                      className="hidden"
                    />

                  </label>

                ) : (

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
                        justify-between
                        gap-3
                      "
                    >

                      <div
                        className="
                          flex
                          min-w-0
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

                          <Paperclip
                            size={18}
                          />

                        </div>


                        <div
                          className=
                            "min-w-0"
                        >

                          <strong
                            className="
                              block
                              truncate
                              text-sm
                              text-[#172033]
                            "
                            title={
                              receiptFile.name
                            }
                          >
                            {receiptFile.name}
                          </strong>


                          <span
                            className="
                              mt-1
                              block
                              text-xs
                              text-slate-500
                            "
                          >
                            {formatFileSize(
                              receiptFile.size
                            )}
                          </span>

                        </div>

                      </div>


                      <button
                        type="button"
                        onClick={
                          handleRemoveReceipt
                        }
                        className="
                          inline-flex
                          h-8
                          w-8
                          shrink-0
                          items-center
                          justify-center
                          rounded-lg
                          border
                          border-red-200
                          bg-white
                          text-red-600
                          transition
                          hover:bg-red-50
                        "
                        aria-label=
                          "Bỏ ảnh chứng từ"
                      >

                        <Trash2
                          size={14}
                        />

                      </button>

                    </div>

                  </div>

                )}

              </div>


              {/* =============================================
                  NOTE
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
                  Ghi chú
                </label>


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
                  rows={3}
                  placeholder="Ví dụ: Khách đã chuyển đủ tiền tháng 8"
                  className="
                    min-h-24
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
                  ||
                  remainingAmount <= 0
                }
                className="
                  h-10
                  rounded-xl
                  bg-[#e44763]
                  px-5
                  text-white
                  hover:bg-[#cf3852]
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
                  ? "Đang ghi nhận..."
                  : "Xác nhận thanh toán"}

              </Button>

            </div>

          </form>

        </div>

      </div>

    </div>

  );

}


export default AddPaymentModal;