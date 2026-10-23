import {
  useEffect,
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
  apiGet,
  apiPatch,
} from "../api/api";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import type {
  Contract,
  ContractUpdate,
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

type EditContractModalProps = {
  open: boolean;

  contractId:
    number | null;

  rooms: Room[];

  tenants: Tenant[];

  onClose: () => void;

  onUpdated: (
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
// EDIT CONTRACT MODAL
// =========================================================

function EditContractModal({
  open,
  contractId,
  rooms,
  tenants,
  onClose,
  onUpdated,
}: EditContractModalProps) {

  const [moveInElectricReading, setMoveInElectricReading] = useState("");

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
    contractStatus,
    setContractStatus,
  ] = useState("");


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  // =========================================================
  // LOAD CONTRACT
  // =========================================================

  useEffect(
    () => {

      if (
        !open
        ||
        contractId === null
      ) {
        return;
      }


      async function loadContract() {

        try {

          setLoading(
            true
          );

          setError("");


          const contract =
            await apiGet<Contract>(
              `/contracts/${contractId}`
            );


          setMoveInElectricReading(contract.move_in_electric_reading == null ? "" : String(contract.move_in_electric_reading));

          setRoomId(
            String(
              contract.room_id
            )
          );


          setTenantId(
            String(
              contract.tenant_id
            )
          );


          setStartDate(
            contract.start_date
          );


          setEndDate(
            contract.end_date
            ?? ""
          );


          setMonthlyRent(
            String(
              contract.monthly_rent
            )
          );


          setDepositRequired(
            String(
              contract.deposit_required
            )
          );


          setOccupantCount(
            String(
              contract.occupant_count
            )
          );


          setContractStatus(
            contract.status
          );


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
              "Không thể tải hợp đồng."
            );

          }


        } finally {

          setLoading(
            false
          );

        }

      }


      loadContract();

    },
    [
      open,
      contractId,
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
  // SELECTABLE ROOMS
  // =========================================================

  const currentRoomId =
    Number(
      roomId
    );


  const selectableRooms =
    rooms
      .filter(
        (
          room
        ) =>
          room.status
          === "VACANT"
          ||
          room.id
          === currentRoomId
      )
      .sort(
        (
          a,
          b
        ) =>
          a.room_code.localeCompare(
            b.room_code
          )
      );


  // =========================================================
  // SELECTED ROOM
  // =========================================================

  const selectedRoom =
    rooms.find(
      (
        room
      ) =>
        room.id
        === currentRoomId
    );


  // =========================================================
  // SELECTED TENANT
  // =========================================================

  const selectedTenant =
    tenants.find(
      (
        tenant
      ) =>
        tenant.id
        === Number(
          tenantId
        )
    );


  // =========================================================
  // MONEY PREVIEW
  // =========================================================

  const rentNumber =
    Number(
      monthlyRent
    );


  const depositNumber =
    Number(
      depositRequired
    );


  // =========================================================
  // CLOSE
  // =========================================================

  function handleClose() {

    if (
      submitting
    ) {
      return;
    }


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


    if (
      contractId === null
    ) {
      return;
    }


    setError("");


    if (
      !roomId
      ||
      !tenantId
      ||
      !startDate
    ) {

      setError(
        "Phòng, khách thuê và ngày bắt đầu là bắt buộc."
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
      monthlyRent.trim() === ""
      ||
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
      depositRequired.trim()
      === ""
      ||
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
      occupantCount.trim()
      === ""
      ||
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


    const baselineText = moveInElectricReading.trim();
    const baseline = Number(baselineText);
    if (baselineText !== "" && (!/^\d+$/.test(baselineText) || !Number.isSafeInteger(baseline) || baseline > 2147483647)) {
      setError("Chỉ số điện lúc nhận phòng phải là số nguyên không âm.");
      return;
    }

    const data:
      ContractUpdate = {

      ...(baselineText !== "" ? { move_in_electric_reading: baseline } : {}),

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


      const updatedContract =
        await apiPatch<
          Contract,
          ContractUpdate
        >(
          `/contracts/${contractId}`,
          data
        );


      onUpdated(
        updatedContract
      );


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
          "Không thể cập nhật hợp đồng."
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
                    Sửa hợp đồng
                  </h2>


                  <p
                    className="
                      mt-1
                      text-sm
                      leading-5
                      text-slate-300
                    "
                  >
                    Cập nhật phòng, khách thuê,
                    thời hạn và chi phí hợp đồng.
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
              LOADING
          ================================================= */}

          {loading ? (

            <div
              className="
                flex
                min-h-72
                items-center
                justify-center
                gap-3
                px-5
                py-8
                text-sm
                text-slate-500
              "
            >

              <RefreshCw
                size={18}
                className=
                  "animate-spin"
              />

              Đang tải hợp đồng...

            </div>

          ) : (

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

                {/* ===========================================
                    ENDED WARNING
                =========================================== */}

                {contractStatus
                  === "ENDED"
                  &&
                  (

                    <div
                      className="
                        flex
                        items-start
                        gap-3
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
                        size={18}
                        className=
                          "mt-0.5 shrink-0"
                      />


                      <div>

                        <strong>
                          Hợp đồng đã kết thúc
                        </strong>


                        <p
                          className="
                            mt-1
                          "
                        >
                          Bạn vẫn có thể sửa dữ liệu nếu nhập sai,
                          nhưng hợp đồng này được giữ lại làm lịch sử
                          và không thể xóa.
                        </p>

                      </div>

                    </div>

                  )}


                {/* ===========================================
                    ROOM + TENANT
                =========================================== */}

                <section>

                  <EditContractSectionTitle
                    icon={
                      Building2
                    }
                    title="Phòng & khách thuê"
                    description="Thay đổi phòng hoặc khách đứng tên hợp đồng."
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
                        "
                      >

                        <option value="">
                          Chọn phòng
                        </option>


                        {selectableRooms.map(
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
                        "
                      >

                        <option value="">
                          Chọn khách thuê
                        </option>


                        {tenants.map(
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

                    </div>

                  </div>


                  {/* PREVIEW */}

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

                        Phòng hiện chọn

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

                </section>


                <div
                  className="
                    border-t
                    border-[#eeeae2]
                  "
                />


                {/* ===========================================
                    DATE
                =========================================== */}

                <section>

                  <EditContractSectionTitle
                    icon={
                      CalendarDays
                    }
                    title="Thời hạn hợp đồng"
                    description="Chỉnh ngày bắt đầu và ngày kết thúc hợp đồng."
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
                        Có thể để trống nếu hợp đồng chưa xác định ngày kết thúc.
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


                <div>
                  <label htmlFor="edit-move-in-electric-reading" className="mb-2 block text-sm font-medium">Chỉ số điện lúc nhận phòng</label>
                  <Input id="edit-move-in-electric-reading" type="number" inputMode="numeric" min={0} max={2147483647} step={1}
                    value={moveInElectricReading} onChange={(event) => setMoveInElectricReading(event.target.value)}
                    className="h-11 rounded-xl border-[#ddd9cf]" />
                  <p className="mt-1.5 text-xs text-slate-500">Nhập theo biên bản bàn giao. Để trống sẽ giữ nguyên dữ liệu; không tự sửa meter hoặc hóa đơn đã có.</p>
                </div>

                {/* ===========================================
                    MONEY
                =========================================== */}

                <section>

                  <EditContractSectionTitle
                    icon={
                      WalletCards
                    }
                    title="Chi phí"
                    description="Cập nhật tiền thuê hàng tháng và mức tiền cọc."
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
                              rentNumber
                            )
                              ? 0
                              : rentNumber
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
                        Cọc yêu cầu

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


                {/* ===========================================
                    OCCUPANTS
                =========================================== */}

                <section>

                  <EditContractSectionTitle
                    icon={
                      Users
                    }
                    title="Số người ở"
                    description="Cập nhật số người đang lưu trú theo hợp đồng."
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
                      className="relative"
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


                {/* ===========================================
                    ERROR
                =========================================== */}

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


              {/* =============================================
                  ACTIONS
              ============================================= */}

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
                    : "Lưu thay đổi"}

                </Button>

              </div>

            </form>

          )}

        </div>

      </div>

    </div>

  );

}


// =========================================================
// SECTION TITLE
// =========================================================

function EditContractSectionTitle({
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


export default EditContractModal;