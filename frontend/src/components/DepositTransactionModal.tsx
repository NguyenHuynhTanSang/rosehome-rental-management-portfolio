import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  MinusCircle,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  WalletCards,
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
  DepositTransaction,
  DepositTransactionCreate,
  ManualDepositTransactionType,
} from "../types/deposit";


// =========================================================
// TYPES
// =========================================================

type DepositTransactionModalProps = {
  open: boolean;

  contractId: number;

  transactionType:
    ManualDepositTransactionType;

  currentBalance: number;

  onClose: () => void;

  onCreated: (
    transaction: DepositTransaction
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


function getTransactionTitle(
  transactionType:
    ManualDepositTransactionType
) {

  if (
    transactionType === "COLLECT"
  ) {
    return "Thu tiền cọc";
  }


  if (
    transactionType === "REFUND"
  ) {
    return "Hoàn tiền cọc";
  }


  return "Khấu trừ tiền cọc";

}


function getTransactionDescription(
  transactionType:
    ManualDepositTransactionType
) {

  if (
    transactionType === "COLLECT"
  ) {

    return (
      "Ghi nhận số tiền cọc thực tế đã nhận từ khách."
    );

  }


  if (
    transactionType === "REFUND"
  ) {

    return (
      "Ghi nhận số tiền cọc đã hoàn lại cho khách."
    );

  }


  return (
    "Khấu trừ tiền cọc do chi phí phát sinh hoặc hư hỏng."
  );

}


// =========================================================
// DEPOSIT TRANSACTION MODAL
// =========================================================

function DepositTransactionModal({
  open,
  contractId,
  transactionType,
  currentBalance,
  onClose,
  onCreated,
}: DepositTransactionModalProps) {

  const [
    amount,
    setAmount,
  ] = useState("");


  const [
    note,
    setNote,
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


      setAmount("");

      setNote("");

      setError("");

    },
    [
      open,
      transactionType,
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


  const previewBalance =
    transactionType === "COLLECT"

      ? currentBalance
        +
        (
          validAmount
            ? numericAmount
            : 0
        )

      : Math.max(
          0,
          currentBalance
          -
          (
            validAmount
              ? numericAmount
              : 0
          )
        );


  const isCollect =
    transactionType
    === "COLLECT";


  const isRefund =
    transactionType
    === "REFUND";


  const isDeduction =
    transactionType
    === "DEDUCTION";


  // =========================================================
  // RESET
  // =========================================================

  function resetForm() {

    setAmount("");

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
      (
        transactionType
        === "REFUND"
        ||
        transactionType
        === "DEDUCTION"
      )
      &&
      submittedAmount
      >
      currentBalance
    ) {

      setError(
        "Số tiền không được lớn hơn số cọc đang giữ."
      );


      return;

    }


    const data:
      DepositTransactionCreate = {

      transaction_type:
        transactionType,

      amount:
        submittedAmount,

      note:
        note.trim()

          ? note.trim()

          : null,

    };


    try {

      setSubmitting(
        true
      );


      const newTransaction =
        await apiPost<
          DepositTransaction,
          DepositTransactionCreate
        >(
          `/contracts/${contractId}/deposits`,
          data
        );


      onCreated(
        newTransaction
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
          "Không thể ghi nhận giao dịch."
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
                  className={
                    isCollect

                      ? `
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        border
                        border-emerald-300/20
                        bg-emerald-400/10
                        text-emerald-200
                      `

                      : isRefund

                        ? `
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
                        `

                        : `
                          flex
                          h-11
                          w-11
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          border
                          border-[#e44763]/30
                          bg-[#e44763]/10
                          text-[#ffb7c4]
                        `
                  }
                >

                  {isCollect ? (

                    <ShieldCheck
                      size={21}
                    />

                  ) : isRefund ? (

                    <RotateCcw
                      size={21}
                    />

                  ) : (

                    <MinusCircle
                      size={21}
                    />

                  )}

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
                    Rosehome Deposit
                  </div>


                  <h2
                    className="
                      mt-1
                      text-xl
                      font-semibold
                    "
                  >
                    {getTransactionTitle(
                      transactionType
                    )}
                  </h2>


                  <p
                    className="
                      mt-1
                      text-sm
                      leading-5
                      text-slate-300
                    "
                  >
                    {getTransactionDescription(
                      transactionType
                    )}
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
                  BALANCE
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
                    border-[#e9e2d8]
                    bg-[#fcfbf8]
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
                      text-slate-500
                    "
                  >

                    <WalletCards
                      size={15}
                    />

                    Cọc hiện tại

                  </div>


                  <strong
                    className="
                      mt-2
                      block
                      text-xl
                      text-[#172033]
                    "
                  >
                    {formatMoney(
                      currentBalance
                    )}
                  </strong>

                </div>


                <div
                  className={
                    previewBalance === 0
                    &&
                    !isCollect

                      ? `
                        rounded-xl
                        border
                        border-emerald-200
                        bg-emerald-50
                        px-4
                        py-4
                      `

                      : `
                        rounded-xl
                        border
                        border-[#ead9b7]
                        bg-[#fffaf0]
                        px-4
                        py-4
                      `
                  }
                >

                  <div
                    className={
                      previewBalance === 0
                      &&
                      !isCollect

                        ? `
                          flex
                          items-center
                          gap-2
                          text-xs
                          font-medium
                          text-emerald-700
                        `

                        : `
                          flex
                          items-center
                          gap-2
                          text-xs
                          font-medium
                          text-[#8a6726]
                        `
                    }
                  >

                    <CheckCircle2
                      size={15}
                    />

                    Cọc sau giao dịch

                  </div>


                  <strong
                    className={
                      previewBalance === 0
                      &&
                      !isCollect

                        ? `
                          mt-2
                          block
                          text-xl
                          text-emerald-700
                        `

                        : `
                          mt-2
                          block
                          text-xl
                          text-[#172033]
                        `
                    }
                  >
                    {formatMoney(
                      previewBalance
                    )}
                  </strong>

                </div>

              </div>


              {/* =============================================
                  TRANSACTION INFO
              ============================================= */}

              {isCollect && (

                <div
                  className="
                    flex
                    items-start
                    gap-3
                    rounded-xl
                    border
                    border-emerald-200
                    bg-emerald-50
                    px-4
                    py-3
                    text-sm
                    leading-5
                    text-emerald-700
                  "
                >

                  <ShieldCheck
                    size={18}
                    className=
                      "mt-0.5 shrink-0"
                  />

                  Khoản tiền này sẽ được cộng vào số cọc hiện đang giữ của hợp đồng.

                </div>

              )}


              {isRefund && (

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

                  <RotateCcw
                    size={18}
                    className=
                      "mt-0.5 shrink-0"
                  />

                  Khoản tiền này sẽ được trừ khỏi số cọc đang giữ và ghi nhận là tiền đã hoàn lại cho khách.

                </div>

              )}


              {isDeduction && (

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
                    size={18}
                    className=
                      "mt-0.5 shrink-0"
                  />

                  Khoản tiền này sẽ được trừ khỏi tiền cọc để xử lý chi phí phát sinh hoặc hư hỏng.

                </div>

              )}


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
                  className="relative"
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
                      transactionType
                      !== "COLLECT"

                        ? currentBalance

                        : undefined
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
                    placeholder="Ví dụ: 10000000"
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
                      Giá trị giao dịch
                    </span>


                    <strong
                      className={
                        isCollect

                          ? "text-emerald-700"

                          : isDeduction

                            ? "text-[#b92f49]"

                            : "text-[#8a6726]"
                      }
                    >

                      {isCollect
                        ? "+ "
                        : "- "}

                      {formatMoney(
                        validAmount
                          ? numericAmount
                          : 0
                      )}

                    </strong>

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
                  placeholder={
                    transactionType === "COLLECT"

                      ? "Ví dụ: Thu cọc khi nhận phòng"

                      : transactionType === "REFUND"

                        ? "Ví dụ: Hoàn cọc khi trả phòng"

                        : "Ví dụ: Khấu trừ chi phí sửa cửa"
                  }
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
                }
                className={
                  isCollect

                    ? `
                      h-10
                      rounded-xl
                      bg-emerald-600
                      px-5
                      text-white
                      hover:bg-emerald-700
                    `

                    : isRefund

                      ? `
                        h-10
                        rounded-xl
                        bg-[#d6a64c]
                        px-5
                        text-[#172033]
                        hover:bg-[#e0b85f]
                      `

                      : `
                        h-10
                        rounded-xl
                        bg-[#e44763]
                        px-5
                        text-white
                        hover:bg-[#cf3852]
                      `
                }
              >

                {submitting ? (

                  <RefreshCw
                    className=
                      "animate-spin"
                  />

                ) : isCollect ? (

                  <ShieldCheck />

                ) : isRefund ? (

                  <RotateCcw />

                ) : (

                  <MinusCircle />

                )}


                {submitting
                  ? "Đang lưu..."
                  : isCollect
                    ? "Xác nhận thu cọc"
                    : isRefund
                      ? "Xác nhận hoàn cọc"
                      : "Xác nhận khấu trừ"}

              </Button>

            </div>

          </form>

        </div>

      </div>

    </div>

  );

}


export default DepositTransactionModal;