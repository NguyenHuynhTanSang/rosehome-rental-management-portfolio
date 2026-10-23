import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";

import {
  apiPost,
} from "../api/api";

import AddRoomModal
  from "./AddRoomModal";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import type {
  Contract,
  ContractCreate,
} from "../types/contract";

import type {
  Room,
} from "../types/room";

import type {
  Tenant,
} from "../types/tenant";


// =========================================================
// TYPES
// =========================================================

type AddContractModalProps = {
  open: boolean;

  rooms: Room[];
  tenants: Tenant[];
  contracts?: Contract[];

  initialRoomId?: number | null;
  initialTenantId?: number | null;

  onRoomCreated?: (
    room: Room
  ) => void;

  onClose: () => void;

  onCreated: (
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


function formatFloor(
  floor:
    number
    |
    null
    |
    undefined
) {

  if (
    floor === null
    ||
    floor === undefined
  ) {
    return "Chưa có tầng";
  }


  if (
    floor === 0
  ) {
    return "Tầng trệt";
  }


  return `Tầng ${floor}`;

}


// =========================================================
// ADD CONTRACT MODAL
// =========================================================

function AddContractModal({
  open,
  rooms,
  tenants,
  contracts = [],
  initialRoomId = null,
  initialTenantId = null,
  onRoomCreated,
  onClose,
  onCreated,
}: AddContractModalProps) {

  const [
    roomId,
    setRoomId,
  ] = useState("");


  const [
    tenantId,
    setTenantId,
  ] = useState("");


  const [
    startDate,
    setStartDate,
  ] = useState("");


  const [
    endDate,
    setEndDate,
  ] = useState("");


  const [
    moveInElectricReading,
    setMoveInElectricReading,
  ] = useState("");


  const [
    monthlyRent,
    setMonthlyRent,
  ] = useState("");


  const [
    depositRequired,
    setDepositRequired,
  ] = useState("");


  const [
    occupantCount,
    setOccupantCount,
  ] = useState("1");


  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    showAddRoomModal,
    setShowAddRoomModal,
  ] = useState(false);


  // =========================================================
  // VACANT ROOMS
  // =========================================================

  const vacantRooms =
    useMemo(
      () =>

        rooms
          .filter(
            (
              room
            ) =>
              room.status
              === "VACANT"
          )
          .sort(
            (
              a,
              b
            ) =>
              a.room_code.localeCompare(
                b.room_code
              )
          ),

      [
        rooms,
      ]
    );


  // =========================================================
  // ELIGIBLE TENANTS
  // =========================================================

  const eligibleTenants =
    useMemo(
      () => {

        const activeTenantIds =
          new Set(
            contracts
              .filter(
                (
                  contract
                ) =>
                  contract.status
                  === "ACTIVE"
              )
              .map(
                (
                  contract
                ) =>
                  contract.tenant_id
              )
          );


        return tenants
          .filter(
            (
              tenant
            ) =>
              !activeTenantIds.has(
                tenant.id
              )
          )
          .sort(
            (
              a,
              b
            ) =>
              a.full_name.localeCompare(
                b.full_name,
                "vi"
              )
          );

      },
      [
        tenants,
        contracts,
      ]
    );


  // =========================================================
  // SELECTED ROOM
  // =========================================================

  const selectedRoom =
    useMemo(
      () => {

        if (
          !roomId
        ) {
          return undefined;
        }


        return rooms.find(
          (
            room
          ) =>
            room.id
            === Number(
              roomId
            )
        );

      },
      [
        rooms,
        roomId,
      ]
    );


  // =========================================================
  // SELECTED TENANT
  // =========================================================

  const selectedTenant =
    useMemo(
      () => {

        if (
          !tenantId
        ) {
          return undefined;
        }


        return tenants.find(
          (
            tenant
          ) =>
            tenant.id
            === Number(
              tenantId
            )
        );

      },
      [
        tenants,
        tenantId,
      ]
    );


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


      if (
        initialRoomId !== null
        &&
        initialRoomId !== undefined
      ) {

        setRoomId(
          String(
            initialRoomId
          )
        );

      } else {

        setRoomId("");

      }


      if (
        initialTenantId !== null
        &&
        initialTenantId !== undefined
      ) {

        setTenantId(
          String(
            initialTenantId
          )
        );

      } else {

        setTenantId("");

      }

      setStartDate("");

      setEndDate("");

      setMoveInElectricReading("");

      setMonthlyRent("");

      setDepositRequired("");

      setOccupantCount("1");

      setError("");

      setShowAddRoomModal(
        false
      );

    },
    [
      open,
      initialRoomId,
      initialTenantId,
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
          showAddRoomModal
        ) {
          return;
        }


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
      showAddRoomModal,
      onClose,
    ]
  );


  if (
    !open
  ) {
    return null;
  }


  // =========================================================
  // MONEY PREVIEW
  // =========================================================

  const monthlyRentNumber =
    Number(
      monthlyRent
    );


  const depositNumber =
    Number(
      depositRequired
    );


  // =========================================================
  // RESET FORM
  // =========================================================

  function resetForm() {

    setRoomId("");

    setTenantId("");

    setStartDate("");

    setEndDate("");

    setMoveInElectricReading("");

    setMonthlyRent("");

    setDepositRequired("");

    setOccupantCount("1");

    setError("");

  }


  // =========================================================
  // CLOSE
  // =========================================================

  function handleClose() {

    if (
      showAddRoomModal
    ) {

      setShowAddRoomModal(
        false
      );

      return;

    }


    if (
      submitting
    ) {
      return;
    }


    resetForm();

    onClose();

  }


  // =========================================================
  // ROOM CREATED INSIDE CONTRACT FLOW
  // =========================================================

  function handleRoomCreated(
    newRoom: Room
  ) {

    onRoomCreated?.(
      newRoom
    );


    setRoomId(
      String(
        newRoom.id
      )
    );


    setShowAddRoomModal(
      false
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


    if (
      !roomId
    ) {

      setError(
        "Vui lòng chọn phòng."
      );

      return;

    }


    if (
      !tenantId
    ) {

      setError(
        "Vui lòng chọn khách thuê."
      );

      return;

    }


    if (
      !startDate
    ) {

      setError(
        "Vui lòng nhập ngày bắt đầu."
      );

      return;

    }


    if (
      endDate
      &&
      endDate < startDate
    ) {

      setError(
        "Ngày kết thúc không được nhỏ hơn ngày bắt đầu."
      );

      return;

    }


    if (
      moveInElectricReading === ""
    ) {

      setError(
        "Vui lòng nhập chỉ số điện lúc nhận phòng."
      );

      return;

    }


    if (
      !monthlyRent
    ) {

      setError(
        "Vui lòng nhập tiền thuê."
      );

      return;

    }


    if (
      !depositRequired
    ) {

      setError(
        "Vui lòng nhập tiền cọc."
      );

      return;

    }


    const moveInReading =
      Number(
        moveInElectricReading
      );


    const rent =
      Number(
        monthlyRent
      );


    const deposit =
      Number(
        depositRequired
      );


    const occupants =
      Number(
        occupantCount
      );


    if (
      Number.isNaN(
        moveInReading
      )
      ||
      !Number.isInteger(
        moveInReading
      )
      ||
      moveInReading < 0
    ) {

      setError(
        "Chỉ số điện lúc nhận phòng không hợp lệ."
      );

      return;

    }


    if (
      Number.isNaN(
        rent
      )
      ||
      rent < 0
    ) {

      setError(
        "Tiền thuê không hợp lệ."
      );

      return;

    }


    if (
      Number.isNaN(
        deposit
      )
      ||
      deposit < 0
    ) {

      setError(
        "Tiền cọc không hợp lệ."
      );

      return;

    }


    if (
      Number.isNaN(
        occupants
      )
      ||
      occupants < 1
    ) {

      setError(
        "Số người ở phải từ 1 trở lên."
      );

      return;

    }


    const data:
      ContractCreate = {

      room_id:
        Number(
          roomId
        ),

      tenant_id:
        Number(
          tenantId
        ),

      start_date:
        startDate,

      end_date:
        endDate
        ||
        null,

      move_in_electric_reading:
        moveInReading,

      monthly_rent:
        rent,

      deposit_required:
        deposit,

      occupant_count:
        occupants,

    };


    try {

      setSubmitting(
        true
      );


      const newContract =
        await apiPost<
          Contract,
          ContractCreate
        >(
          "/contracts",
          data
        );


      onCreated(
        newContract
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
          "Không thể tạo hợp đồng."
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
                    Rosehome Contract
                  </div>


                  <h2
                    className="
                      mt-1
                      text-xl
                      font-semibold
                    "
                  >
                    Tạo hợp đồng
                  </h2>


                  <p
                    className="
                      mt-1
                      text-sm
                      leading-5
                      text-slate-300
                    "
                  >
                    Gắn khách thuê vào một phòng trống và thiết lập điều khoản thuê.
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
                  ROOM + TENANT
              ============================================= */}

              <section>

                <ContractFormTitle
                  icon={
                    Building2
                  }
                  title="Phòng & khách thuê"
                  description="Chọn phòng trống và khách sẽ đứng tên hợp đồng."
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

                  {/* ROOM */}

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
                      Phòng

                      <span
                        className="
                          ml-1
                          text-[#e44763]
                        "
                      >
                        *
                      </span>

                    </label>


                    <select
                      value={
                        roomId
                      }
                      disabled={
                        initialRoomId !== null
                        &&
                        initialRoomId !== undefined
                      }
                      onChange={
                        (
                          event
                        ) =>
                          setRoomId(
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
                        px-3
                        text-sm
                        text-[#172033]
                        outline-none
                        transition
                        focus:border-[#d6a64c]
                        disabled:cursor-not-allowed
                        disabled:bg-slate-50
                        disabled:text-slate-500
                      "
                    >

                      <option value="">
                        Chọn phòng
                      </option>


                      {vacantRooms.map(
                        (
                          room
                        ) => (

                          <option
                            key={
                              room.id
                            }
                            value={
                              room.id
                            }
                          >
                            {room.room_code}
                            {" - "}
                            {formatFloor(
                              room.floor
                            )}
                          </option>

                        )
                      )}

                    </select>


                    {initialRoomId !== null
                      &&
                      initialRoomId !== undefined
                      &&
                      (

                        <p
                          className="
                            mt-1.5
                            text-xs
                            text-slate-500
                          "
                        >
                          Phòng đã được chọn từ màn hình quản lý phòng.
                        </p>

                      )}


                    {(initialRoomId === null
                      ||
                      initialRoomId === undefined)
                      &&
                      onRoomCreated
                      &&
                      (

                        <button
                          type="button"
                          onClick={
                            () =>
                              setShowAddRoomModal(
                                true
                              )
                          }
                          className="
                            mt-2
                            inline-flex
                            items-center
                            gap-1.5
                            text-xs
                            font-semibold
                            text-[#9a762f]
                            transition
                            hover:text-[#7d5f25]
                          "
                        >
                          <Building2
                            size={14}
                          />

                          Không thấy phòng phù hợp? Tạo phòng mới
                        </button>

                      )}

                  </div>


                  {/* TENANT */}

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
                      Khách thuê

                      <span
                        className="
                          ml-1
                          text-[#e44763]
                        "
                      >
                        *
                      </span>

                    </label>


                    <select
                      value={
                        tenantId
                      }
                      disabled={
                        initialTenantId !== null
                        &&
                        initialTenantId !== undefined
                      }
                      onChange={
                        (
                          event
                        ) =>
                          setTenantId(
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
                        px-3
                        text-sm
                        text-[#172033]
                        outline-none
                        transition
                        focus:border-[#d6a64c]
                        disabled:cursor-not-allowed
                        disabled:bg-slate-50
                        disabled:text-slate-500
                      "
                    >

                      <option value="">
                        Chọn khách chưa thuê
                      </option>


                      {eligibleTenants.map(
                        (
                          tenant
                        ) => (

                          <option
                            key={
                              tenant.id
                            }
                            value={
                              tenant.id
                            }
                          >
                            {tenant.full_name}

                            {tenant.phone
                              ? ` - ${tenant.phone}`
                              : ""}
                          </option>

                        )
                      )}

                    </select>

                    {initialTenantId !== null
                      &&
                      initialTenantId !== undefined
                      ? (

                        <p
                          className="
                            mt-1.5
                            text-xs
                            text-slate-500
                          "
                        >
                          Khách thuê đã được chọn từ màn hình quản lý khách thuê.
                        </p>

                      )
                      : (

                        <p
                          className="
                            mt-1.5
                            text-xs
                            text-slate-500
                          "
                        >
                          Chỉ hiển thị khách chưa có hợp đồng đang hoạt động.
                        </p>

                      )}

                  </div>

                </div>


                {/* SELECTED PREVIEW */}

                {(selectedRoom
                  ||
                  selectedTenant)
                  &&
                  (

                    <div
                      className="
                        mt-4
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
                          border-[#ead9b7]
                          bg-[#fffaf0]
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
                            font-medium
                            text-[#8a6726]
                          "
                        >

                          <Building2
                            size={14}
                          />

                          Phòng được chọn

                        </div>


                        <strong
                          className="
                            mt-1
                            block
                            text-sm
                            text-[#172033]
                          "
                        >
                          {selectedRoom
                            ? `${selectedRoom.room_code} • ${formatFloor(
                                selectedRoom.floor
                              )}`
                            : "Chưa chọn"}
                        </strong>

                      </div>


                      <div
                        className="
                          rounded-xl
                          border
                          border-[#efced4]
                          bg-[#fcecef]
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
                            font-medium
                            text-[#b92f49]
                          "
                        >

                          <UserRound
                            size={14}
                          />

                          Khách đứng tên

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
                          {selectedTenant
                            ?.full_name
                            ??
                            "Chưa chọn"}
                        </strong>

                      </div>

                    </div>

                  )}

              </section>


              <div
                className="
                  border-t
                  border-[#eeeae2]
                "
              />


              {/* =============================================
                  DATE
              ============================================= */}

              <section>

                <ContractFormTitle
                  icon={
                    CalendarDays
                  }
                  title="Thời hạn hợp đồng"
                  description="Thiết lập ngày bắt đầu và ngày kết thúc nếu có."
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
                      Ngày bắt đầu

                      <span
                        className="
                          ml-1
                          text-[#e44763]
                        "
                      >
                        *
                      </span>

                    </label>


                    <Input
                      type="date"
                      value={
                        startDate
                      }
                      onChange={
                        (
                          event
                        ) =>
                          setStartDate(
                            event.target.value
                          )
                      }
                      className="
                        h-11
                        rounded-xl
                        border-[#ddd9cf]
                      "
                    />

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
                      Ngày kết thúc
                    </label>


                    <Input
                      type="date"
                      min={
                        startDate
                        ||
                        undefined
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
                      "
                    />


                    <p
                      className="
                        mt-1.5
                        text-xs
                        text-slate-500
                      "
                    >
                      Có thể để trống nếu chưa xác định thời hạn.
                    </p>

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
                  ELECTRIC HANDOVER
              ============================================= */}

              <section>

                <ContractFormTitle
                  icon={
                    FileText
                  }
                  title="Chỉ số điện nhận phòng"
                  description="Ghi lại chỉ số công tơ tại thời điểm bàn giao phòng cho khách mới."
                />


                <div
                  className="
                    mt-4
                    max-w-sm
                  "
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
                    Chỉ số điện lúc nhận phòng

                    <span
                      className="
                        ml-1
                        text-[#e44763]
                      "
                    >
                      *
                    </span>

                  </label>


                  <Input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={
                      moveInElectricReading
                    }
                    onChange={
                      (
                        event
                      ) =>
                        setMoveInElectricReading(
                          event.target.value
                        )
                    }
                    placeholder="Ví dụ: 3976"
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
                    Đây sẽ là mốc điện ban đầu của khách trong hợp đồng này.
                  </p>

                </div>

              </section>


              <div
                className="
                  border-t
                  border-[#eeeae2]
                "
              />


              {/* =============================================
                  MONEY
              ============================================= */}

              <section>

                <ContractFormTitle
                  icon={
                    WalletCards
                  }
                  title="Chi phí"
                  description="Thiết lập tiền thuê hàng tháng và mức cọc yêu cầu."
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

                  {/* RENT */}

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
                      Tiền thuê / tháng

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
                        min="0"
                        value={
                          monthlyRent
                        }
                        onChange={
                          (
                            event
                          ) =>
                            setMonthlyRent(
                              event.target.value
                            )
                        }
                        placeholder="Ví dụ: 6000000"
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


                    {monthlyRent !== "" && (

                      <p
                        className="
                          mt-1.5
                          text-xs
                          text-slate-500
                        "
                      >
                        {formatMoney(
                          Number.isNaN(
                            monthlyRentNumber
                          )
                            ? 0
                            : monthlyRentNumber
                        )}
                        {" / tháng"}
                      </p>

                    )}

                  </div>


                  {/* DEPOSIT */}

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
                      Tiền cọc yêu cầu

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

                      <ShieldCheck
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
                        min="0"
                        value={
                          depositRequired
                        }
                        onChange={
                          (
                            event
                          ) =>
                            setDepositRequired(
                              event.target.value
                            )
                        }
                        placeholder="Ví dụ: 12000000"
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


                    {depositRequired !== "" && (

                      <p
                        className="
                          mt-1.5
                          text-xs
                          text-slate-500
                        "
                      >
                        {formatMoney(
                          Number.isNaN(
                            depositNumber
                          )
                            ? 0
                            : depositNumber
                        )}
                      </p>

                    )}

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
                  OCCUPANTS
              ============================================= */}

              <section>

                <ContractFormTitle
                  icon={
                    Users
                  }
                  title="Số người ở"
                  description="Số người dự kiến lưu trú theo hợp đồng."
                />


                <div
                  className="
                    mt-4
                    max-w-xs
                  "
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
                    Số người

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

                    <Users
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
                        occupantCount
                      }
                      onChange={
                        (
                          event
                        ) =>
                          setOccupantCount(
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

              </section>


              {/* =============================================
                  WARNINGS
              ============================================= */}

              {vacantRooms.length === 0 && (

                <div
                  className="
                    flex
                    items-start
                    gap-2
                    rounded-xl
                    border
                    border-amber-200
                    bg-amber-50
                    px-4
                    py-3
                    text-sm
                    leading-5
                    text-amber-800
                  "
                >

                  <AlertCircle
                    size={17}
                    className=
                      "mt-0.5 shrink-0"
                  />

                  Hiện không có phòng trống để tạo hợp đồng.

                </div>

              )}


              {tenants.length === 0 && (

                <div
                  className="
                    flex
                    items-start
                    gap-2
                    rounded-xl
                    border
                    border-amber-200
                    bg-amber-50
                    px-4
                    py-3
                    text-sm
                    leading-5
                    text-amber-800
                  "
                >

                  <AlertCircle
                    size={17}
                    className=
                      "mt-0.5 shrink-0"
                  />

                  Chưa có khách thuê. Hãy thêm khách thuê trước khi tạo hợp đồng.

                </div>

              )}


              {tenants.length > 0
                &&
                eligibleTenants.length === 0
                &&
                (

                  <div
                    className="
                      flex
                      items-start
                      gap-2
                      rounded-xl
                      border
                      border-amber-200
                      bg-amber-50
                      px-4
                      py-3
                      text-sm
                      leading-5
                      text-amber-800
                    "
                  >

                    <AlertCircle
                      size={17}
                      className=
                        "mt-0.5 shrink-0"
                    />

                    Hiện không có khách chưa thuê để tạo hợp đồng mới.

                  </div>

                )}


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
                  vacantRooms.length === 0
                  ||
                  eligibleTenants.length === 0
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
                  ? "Đang tạo..."
                  : "Tạo hợp đồng"}

              </Button>

            </div>

          </form>

        </div>

      </div>


      <AddRoomModal
        open={
          showAddRoomModal
        }
        onClose={
          () =>
            setShowAddRoomModal(
              false
            )
        }
        onCreated={
          handleRoomCreated
        }
      />

    </div>

  );

}


// =========================================================
// SECTION TITLE
// =========================================================

function ContractFormTitle({
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


export default AddContractModal;