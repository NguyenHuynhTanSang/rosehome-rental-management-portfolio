import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Layers3,
  RefreshCw,
  Settings2,
  Waves,
  X,
  Zap,
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
  Room,
  RoomCreate,
} from "../types/room";


// =========================================================
// TYPES
// =========================================================

type Props = {
  open: boolean;

  onClose: () => void;

  onCreated: (
    room: Room
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
// ADD ROOM MODAL
// =========================================================

function AddRoomModal({
  open,
  onClose,
  onCreated,
}: Props) {

  const [
    roomCode,
    setRoomCode,
  ] = useState("");


  const [
    floor,
    setFloor,
  ] = useState("");


  const [
    description,
    setDescription,
  ] = useState("");


  const [
    electricityRate,
    setElectricityRate,
  ] = useState(
    "4000"
  );


  const [
    waterFee,
    setWaterFee,
  ] = useState(
    "300000"
  );


  const [
    managementFee,
    setManagementFee,
  ] = useState(
    "250000"
  );


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


      setRoomCode("");

      setFloor("");

      setDescription("");

      setElectricityRate(
        "4000"
      );

      setWaterFee(
        "300000"
      );

      setManagementFee(
        "250000"
      );

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
  // PREVIEW VALUES
  // =========================================================

  const electricityValue =
    Number(
      electricityRate
    );


  const waterValue =
    Number(
      waterFee
    );


  const managementValue =
    Number(
      managementFee
    );


  // =========================================================
  // RESET FORM
  // =========================================================

  function resetForm() {

    setRoomCode("");

    setFloor("");

    setDescription("");

    setElectricityRate(
      "4000"
    );

    setWaterFee(
      "300000"
    );

    setManagementFee(
      "250000"
    );

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


    if (
      !roomCode.trim()
    ) {

      setError(
        "Vui lòng nhập mã phòng."
      );

      return;

    }


    const electricity =
      Number(
        electricityRate
      );


    const water =
      Number(
        waterFee
      );


    const management =
      Number(
        managementFee
      );


    if (
      electricityRate.trim()
      === ""
      ||
      Number.isNaN(
        electricity
      )
      ||
      electricity < 0
    ) {

      setError(
        "Giá điện không hợp lệ."
      );

      return;

    }


    if (
      waterFee.trim()
      === ""
      ||
      Number.isNaN(
        water
      )
      ||
      water < 0
    ) {

      setError(
        "Tiền nước không hợp lệ."
      );

      return;

    }


    if (
      managementFee.trim()
      === ""
      ||
      Number.isNaN(
        management
      )
      ||
      management < 0
    ) {

      setError(
        "Phí quản lý không hợp lệ."
      );

      return;

    }


    const data:
      RoomCreate = {

      room_code:
        roomCode
          .trim()
          .toUpperCase(),

      floor:
        floor === ""

          ? null

          : Number(
              floor
            ),

      description:
        description.trim()
        === ""

          ? null

          : description.trim(),

      electricity_rate:
        electricity,

      water_fee:
        water,

      management_fee:
        management,

    };


    try {

      setSubmitting(
        true
      );


      const newRoom =
        await apiPost<
          Room,
          RoomCreate
        >(
          "/rooms",
          data
        );


      onCreated(
        newRoom
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
          "Không thể tạo phòng."
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

                  <Building2
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
                    Rosehome Property
                  </div>


                  <h2
                    className="
                      mt-1
                      text-xl
                      font-semibold
                    "
                  >
                    Thêm phòng mới
                  </h2>


                  <p
                    className="
                      mt-1
                      text-sm
                      leading-5
                      text-slate-300
                    "
                  >
                    Nhập thông tin phòng và cấu hình các mức phí mặc định.
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

                <RoomFormSectionTitle
                  icon={
                    Building2
                  }
                  title="Thông tin phòng"
                  description="Thiết lập mã phòng, tầng và mô tả."
                />


                <div
                  className="
                    mt-4
                    grid
                    grid-cols-1
                    gap-4
                    md:grid-cols-2
                  "
                >

                  {/* ROOM CODE */}

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
                      Mã phòng

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

                      <Building2
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
                        value={
                          roomCode
                        }
                        onChange={
                          (
                            event
                          ) =>
                            setRoomCode(
                              event.target.value
                            )
                        }
                        placeholder="Ví dụ: P01"
                        className="
                          h-11
                          rounded-xl
                          border-[#ddd9cf]
                          pl-10
                        "
                      />

                    </div>


                    {roomCode.trim() && (

                      <p
                        className="
                          mt-1.5
                          text-xs
                          text-slate-500
                        "
                      >
                        Mã sẽ được lưu thành{" "}

                        <strong
                          className=
                            "text-[#172033]"
                        >
                          {roomCode
                            .trim()
                            .toUpperCase()}
                        </strong>
                      </p>

                    )}

                  </div>


                  {/* FLOOR */}

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
                      Tầng
                    </label>


                    <div
                      className="relative"
                    >

                      <Layers3
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


                      <select
                        value={
                          floor
                        }
                        onChange={
                          (
                            event
                          ) =>
                            setFloor(
                              event.target.value
                            )
                        }
                        className="
                          h-11
                          w-full
                          rounded-xl
                          border
                          border-[#ddd9cf]
                          bg-white
                          pl-10
                          pr-3
                          text-sm
                          text-[#172033]
                          outline-none
                          transition
                          focus:border-[#d6a64c]
                        "
                      >

                        <option value="">
                          Chọn tầng
                        </option>

                        <option value="0">
                          Tầng trệt
                        </option>

                        <option value="1">
                          Tầng 1
                        </option>

                        <option value="2">
                          Tầng 2
                        </option>

                        <option value="3">
                          Tầng 3
                        </option>

                        <option value="4">
                          Tầng 4
                        </option>

                        <option value="5">
                          Tầng 5
                        </option>

                        <option value="6">
                          Tầng 6
                        </option>

                        <option value="7">
                          Tầng 7
                        </option>

                        <option value="8">
                          Tầng 8
                        </option>

                        <option value="9">
                          Tầng 9
                        </option>

                        <option value="10">
                          Tầng 10
                        </option>

                      </select>

                    </div>

                  </div>

                </div>


                {/* DESCRIPTION */}

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
                    Mô tả
                  </label>


                  <div
                    className="relative"
                  >

                    <FileText
                      size={17}
                      className="
                        pointer-events-none
                        absolute
                        left-3
                        top-3.5
                        text-slate-400
                      "
                    />


                    <textarea
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
                      rows={3}
                      placeholder="Ví dụ: Phòng phía trước, có ban công..."
                      className="
                        min-h-24
                        w-full
                        resize-y
                        rounded-xl
                        border
                        border-[#ddd9cf]
                        bg-white
                        py-3
                        pl-10
                        pr-3
                        text-sm
                        text-[#172033]
                        outline-none
                        transition
                        placeholder:text-slate-400
                        focus:border-[#d6a64c]
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
                  DEFAULT FEES
              ============================================= */}

              <section>

                <RoomFormSectionTitle
                  icon={
                    Settings2
                  }
                  title="Phí mặc định"
                  description="Các mức phí này sẽ được sử dụng khi tính hóa đơn của phòng."
                />


                <div
                  className="
                    mt-4
                    grid
                    grid-cols-1
                    gap-4
                    md:grid-cols-3
                  "
                >

                  {/* ELECTRICITY */}

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
                      Giá điện / kWh
                    </label>


                    <div
                      className="relative"
                    >

                      <Zap
                        size={17}
                        className="
                          pointer-events-none
                          absolute
                          left-3
                          top-1/2
                          -translate-y-1/2
                          text-amber-500
                        "
                      />


                      <Input
                        type="number"
                        min="0"
                        value={
                          electricityRate
                        }
                        onChange={
                          (
                            event
                          ) =>
                            setElectricityRate(
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

                  </div>


                  {/* WATER */}

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
                      Tiền nước
                    </label>


                    <div
                      className="relative"
                    >

                      <Waves
                        size={17}
                        className="
                          pointer-events-none
                          absolute
                          left-3
                          top-1/2
                          -translate-y-1/2
                          text-sky-500
                        "
                      />


                      <Input
                        type="number"
                        min="0"
                        value={
                          waterFee
                        }
                        onChange={
                          (
                            event
                          ) =>
                            setWaterFee(
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

                  </div>


                  {/* MANAGEMENT */}

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
                      Phí quản lý
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
                          text-[#b92f49]
                        "
                      />


                      <Input
                        type="number"
                        min="0"
                        value={
                          managementFee
                        }
                        onChange={
                          (
                            event
                          ) =>
                            setManagementFee(
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

                  </div>

                </div>


                {/* FEE PREVIEW */}

                <div
                  className="
                    mt-4
                    grid
                    grid-cols-1
                    gap-3
                    sm:grid-cols-3
                  "
                >

                  <FeePreviewCard
                    icon={
                      Zap
                    }
                    label="Điện"
                    value={
                      `${formatMoney(
                        Number.isNaN(
                          electricityValue
                        )
                          ? 0
                          : electricityValue
                      )} / kWh`
                    }
                  />


                  <FeePreviewCard
                    icon={
                      Waves
                    }
                    label="Nước"
                    value={
                      formatMoney(
                        Number.isNaN(
                          waterValue
                        )
                          ? 0
                          : waterValue
                      )
                    }
                  />


                  <FeePreviewCard
                    icon={
                      Settings2
                    }
                    label="Quản lý"
                    value={
                      formatMoney(
                        Number.isNaN(
                          managementValue
                        )
                          ? 0
                          : managementValue
                      )
                    }
                  />

                </div>

              </section>


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
                  : "Lưu phòng"}

              </Button>

            </div>

          </form>

        </div>

      </div>

    </div>

  );

}


// =========================================================
// SECTION TITLE
// =========================================================

function RoomFormSectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon:
    typeof Building2;
  title: string;
  description: string;
}) {

  return (

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

        <Icon
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
          {title}
        </h3>


        <p
          className="
            mt-0.5
            text-xs
            leading-5
            text-slate-500
          "
        >
          {description}
        </p>

      </div>

    </div>

  );

}


// =========================================================
// FEE PREVIEW
// =========================================================

function FeePreviewCard({
  icon: Icon,
  label,
  value,
}: {
  icon:
    typeof Zap;
  label: string;
  value: string;
}) {

  return (

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
          flex
          items-center
          gap-2
          text-xs
          text-slate-500
        "
      >

        <Icon
          size={14}
        />

        {label}

      </div>


      <strong
        className="
          mt-1.5
          block
          text-sm
          text-[#172033]
        "
      >
        {value}
      </strong>

    </div>

  );

}


export default AddRoomModal;