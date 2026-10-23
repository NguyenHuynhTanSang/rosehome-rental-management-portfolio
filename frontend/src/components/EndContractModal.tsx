import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  FileText,
  RefreshCw,
  ShieldAlert,
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
  Contract,
  ContractEndRequest,
} from "../types/contract";


// =========================================================
// TYPES
// =========================================================

type EndContractModalProps = {
  open: boolean;

  contract: Contract;

  depositBalance: number;

  onClose: () => void;

  onEnded: (
    contract: Contract
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
// END CONTRACT MODAL
// =========================================================

function EndContractModal({
  open,
  contract,
  depositBalance,
  onClose,
  onEnded,
}: EndContractModalProps) {

  const [
    endDate,
    setEndDate,
  ] = useState("");


  const [
    moveOutElectricReading,
    setMoveOutElectricReading,
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
  // DEPOSIT
  // =========================================================

  const hasDeposit =
    depositBalance !== 0;


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


      setEndDate("");

      setMoveOutElectricReading("");

      setError("");

    },
    [
      open,
      contract.id,
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
  // CLOSE
  // =========================================================

  function handleClose() {

    if (
      submitting
    ) {
      return;
    }


    setEndDate("");

    setMoveOutElectricReading("");

    setError("");

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


    // =======================================================
    // DEPOSIT MUST BE SETTLED
    // =======================================================

    if (
      hasDeposit
    ) {

      setError(
        "Tiền cọc vẫn chưa được xử lý hết. "
        +
        "Vui lòng hoàn cọc hoặc khấu trừ trước."
      );


      return;

    }


    // =======================================================
    // END DATE VALIDATION
    // =======================================================

    if (
      endDate
      &&
      endDate < contract.start_date
    ) {

      setError(
        "Ngày kết thúc không được nhỏ hơn ngày bắt đầu hợp đồng."
      );


      return;

    }


    const hasMoveInElectricReading =
      contract.move_in_electric_reading !== null
      &&
      contract.move_in_electric_reading !== undefined;


    if (
      hasMoveInElectricReading
      &&
      moveOutElectricReading === ""
    ) {

      setError(
        "Vui lòng nhập chỉ số điện lúc trả phòng."
      );

      return;

    }


    const moveOutReading =
      moveOutElectricReading === ""
        ? null
        : Number(
            moveOutElectricReading
          );


    if (
      moveOutReading !== null
      &&
      (
        Number.isNaN(
          moveOutReading
        )
        ||
        !Number.isInteger(
          moveOutReading
        )
        ||
        moveOutReading < 0
      )
    ) {

      setError(
        "Chỉ số điện lúc trả phòng không hợp lệ."
      );

      return;

    }


    if (
      moveOutReading !== null
      &&
      hasMoveInElectricReading
      &&
      moveOutReading
      <
      Number(
        contract.move_in_electric_reading
      )
    ) {

      setError(
        `Chỉ số điện lúc trả phòng không được nhỏ hơn chỉ số nhận phòng (${contract.move_in_electric_reading}).`
      );

      return;

    }


    const data:
      ContractEndRequest = {

      end_date:
        endDate
          ? endDate
          : null,

      move_out_electric_reading:
        moveOutReading,

      allow_unsettled_deposit:
        false,

    };


    try {

      setSubmitting(
        true
      );


      const endedContract =
        await apiPost<
          Contract,
          ContractEndRequest
        >(
          `/contracts/${contract.id}/end`,
          data
        );


      onEnded(
        endedContract
      );


      setEndDate("");

      setMoveOutElectricReading("");

      setError("");

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
          "Không thể kết thúc hợp đồng."
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
                bg-red-500/10
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
                    border-red-300/20
                    bg-red-400/10
                    text-red-200
                  "
                >

                  <FileText
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
                    Rosehome Checkout
                  </div>


                  <h2
                    className="
                      mt-1
                      text-xl
                      font-semibold
                    "
                  >
                    Kết thúc hợp đồng
                  </h2>


                  <p
                    className="
                      mt-1
                      text-sm
                      text-slate-300
                    "
                  >
                    Hợp đồng #{contract.id}
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
                  CHECKOUT WARNING
              ============================================= */}

              <div
                className="
                  rounded-xl
                  border
                  border-amber-200
                  bg-amber-50
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

                  <ShieldAlert
                    size={20}
                    className="
                      mt-0.5
                      shrink-0
                      text-amber-700
                    "
                  />


                  <div>

                    <strong
                      className="
                        text-sm
                        text-amber-900
                      "
                    >
                      Xác nhận khách đã trả phòng?
                    </strong>


                    <p
                      className="
                        mt-1
                        text-sm
                        leading-5
                        text-amber-800
                      "
                    >
                      Sau khi kết thúc hợp đồng,
                      phòng sẽ chuyển về trạng thái trống
                      và có thể được sử dụng để tạo hợp đồng mới.
                    </p>

                  </div>

                </div>

              </div>


              {/* =============================================
                  CONTRACT INFO
              ============================================= */}

              <div
                className="
                  grid
                  grid-cols-2
                  gap-3
                "
              >

                <div
                  className="
                    rounded-xl
                    border
                    border-[#e9e2d8]
                    bg-[#fcfbf8]
                    px-4
                    py-3
                  "
                >

                  <div
                    className="
                      text-xs
                      text-slate-500
                    "
                  >
                    Hợp đồng
                  </div>


                  <strong
                    className="
                      mt-1
                      block
                      text-sm
                      text-[#172033]
                    "
                  >
                    #{contract.id}
                  </strong>

                </div>


                <div
                  className="
                    rounded-xl
                    border
                    border-[#e9e2d8]
                    bg-[#fcfbf8]
                    px-4
                    py-3
                  "
                >

                  <div
                    className="
                      text-xs
                      text-slate-500
                    "
                  >
                    Ngày bắt đầu
                  </div>


                  <strong
                    className="
                      mt-1
                      block
                      text-sm
                      text-[#172033]
                    "
                  >
                    {contract.start_date}
                  </strong>

                </div>

              </div>


              {/* =============================================
                  DEPOSIT
              ============================================= */}

              <div
                className={
                  hasDeposit

                    ? `
                      rounded-xl
                      border
                      border-red-200
                      bg-red-50
                      px-4
                      py-4
                    `

                    : `
                      rounded-xl
                      border
                      border-emerald-200
                      bg-emerald-50
                      px-4
                      py-4
                    `
                }
              >

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-4
                  "
                >

                  <div>

                    <div
                      className={
                        hasDeposit
                          ? "flex items-center gap-2 text-xs font-medium text-red-700"
                          : "flex items-center gap-2 text-xs font-medium text-emerald-700"
                      }
                    >

                      <WalletCards
                        size={15}
                      />

                      Cọc đang giữ

                    </div>


                    <strong
                      className={
                        hasDeposit

                          ? "mt-2 block text-xl text-red-700"

                          : "mt-2 block text-xl text-emerald-700"
                      }
                    >
                      {formatMoney(
                        depositBalance
                      )}
                    </strong>

                  </div>


                  <div
                    className={
                      hasDeposit

                        ? `
                          flex
                          h-10
                          w-10
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          bg-red-100
                          text-red-600
                        `

                        : `
                          flex
                          h-10
                          w-10
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          bg-emerald-100
                          text-emerald-600
                        `
                    }
                  >

                    {hasDeposit ? (

                      <AlertCircle
                        size={19}
                      />

                    ) : (

                      <CheckCircle2
                        size={19}
                      />

                    )}

                  </div>

                </div>

              </div>


              {/* =============================================
                  DEPOSIT BLOCK
              ============================================= */}

              {hasDeposit && (

                <div
                  className="
                    flex
                    items-start
                    gap-3
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
                    size={18}
                    className=
                      "mt-0.5 shrink-0"
                  />


                  <div>

                    <strong>
                      Chưa thể kết thúc hợp đồng
                    </strong>


                    <p
                      className="mt-1"
                    >
                      Vẫn còn tiền cọc đang giữ.
                      Hãy đóng cửa sổ này và thực hiện
                      <strong> Hoàn cọc </strong>
                      hoặc
                      <strong> Khấu trừ </strong>
                      trước khi checkout.
                    </p>

                  </div>

                </div>

              )}


              {/* =============================================
                  DEPOSIT OK
              ============================================= */}

              {!hasDeposit && (

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

                  <CheckCircle2
                    size={18}
                    className=
                      "mt-0.5 shrink-0"
                  />


                  <div>

                    <strong>
                      Tiền cọc đã được xử lý
                    </strong>


                    <p
                      className="mt-1"
                    >
                      Hợp đồng đủ điều kiện để thực hiện checkout.
                    </p>

                  </div>

                </div>

              )}


              {/* =============================================
                  END DATE
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
                  Ngày kết thúc
                </label>


                <div
                  className="relative"
                >

                  <CalendarDays
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
                    type="date"
                    min={
                      contract.start_date
                    }
                    value={
                      endDate
                    }
                    onChange={
                      (
                        event
                      ) =>
                        setEndDate(
                          event.target.value
                        )
                    }
                    className="
                      h-11
                      rounded-xl
                      border-[#ddd9cf]
                      pl-10
                    "
                  />

                </div>


                <p
                  className="
                    mt-1.5
                    text-xs
                    leading-5
                    text-slate-500
                  "
                >
                  Có thể để trống nếu backend tự sử dụng ngày kết thúc hiện tại.
                </p>

              </div>


              {/* =============================================
                  ELECTRIC CHECKOUT
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
                  Chỉ số điện lúc trả phòng

                  {contract.move_in_electric_reading !== null
                    &&
                    contract.move_in_electric_reading !== undefined
                    &&
                    (
                      <span
                        className="
                          ml-1
                          text-[#e44763]
                        "
                      >
                        *
                      </span>
                    )}

                </label>


                <Input
                  type="number"
                  min={
                    contract.move_in_electric_reading
                    ??
                    0
                  }
                  step="1"
                  inputMode="numeric"
                  value={
                    moveOutElectricReading
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setMoveOutElectricReading(
                        event.target.value
                      )
                  }
                  placeholder="Ví dụ: 4120"
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
                  {contract.move_in_electric_reading !== null
                    &&
                    contract.move_in_electric_reading !== undefined
                    ? `Chỉ số khi nhận phòng: ${contract.move_in_electric_reading}.`
                    : "Hợp đồng cũ chưa có mốc điện nhận phòng; có thể để trống."}
                </p>

              </div>


              {/* =============================================
                  FINAL INFO
              ============================================= */}

              {!hasDeposit && (

                <div
                  className="
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
                  Sau khi xác nhận, hợp đồng sẽ chuyển sang trạng thái
                  <strong> đã kết thúc </strong>
                  và phòng sẽ được giải phóng.
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
                  ||
                  hasDeposit
                }
                className="
                  h-10
                  rounded-xl
                  bg-red-600
                  px-5
                  text-white
                  hover:bg-red-700
                  disabled:bg-slate-300
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
                  ? "Đang xử lý..."
                  : "Kết thúc hợp đồng"}

              </Button>

            </div>

          </form>

        </div>

      </div>

    </div>

  );

}


export default EndContractModal;