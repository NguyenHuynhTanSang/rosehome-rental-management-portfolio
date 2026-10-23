import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BadgeDollarSign,
  Building2,
  CalendarClock,
  CircleDollarSign,
  FileText,
  House,
  ReceiptText,
  ShieldCheck,
  UserRound,
  Users,
  WalletCards,
  type LucideIcon
} from "lucide-react";

import {
  apiGet,
  apiGetOptional,
} from "../api/api";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type {
  Room,
} from "../types/room";

import type {
  Contract,
} from "../types/contract";

import type {
  Tenant,
} from "../types/tenant";

import type {
  DepositSummary,
} from "../types/deposit";

import type {
  DebtReport,
  DebtReportItem,
} from "../types/report";


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


function formatDate(
  value: string | null
) {

  if (!value) {
    return "-";
  }


  const date =
    new Date(
      `${value}T00:00:00`
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }


  return date.toLocaleDateString(
    "vi-VN"
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
    return "Chưa xác định";
  }


  if (
    floor === 0
  ) {
    return "Tầng trệt";
  }


  return `Tầng ${floor}`;

}


function getDaysUntil(
  value: string | null
) {

  if (!value) {
    return null;
  }


  const today =
    new Date();


  today.setHours(
    0,
    0,
    0,
    0
  );


  const target =
    new Date(
      `${value}T00:00:00`
    );


  if (
    Number.isNaN(
      target.getTime()
    )
  ) {
    return null;
  }


  return Math.ceil(
    (
      target.getTime()
      -
      today.getTime()
    )
    /
    (
      1000
      *
      60
      *
      60
      *
      24
    )
  );

}


// =========================================================
// ROOM DETAILS
// =========================================================

function RoomDetails() {

  const {
    roomId,
  } = useParams();


  const [
    room,
    setRoom,
  ] = useState<
    Room | null
  >(null);


  const [
    contract,
    setContract,
  ] = useState<
    Contract | null
  >(null);


  const [
    tenant,
    setTenant,
  ] = useState<
    Tenant | null
  >(null);


  const [
    deposit,
    setDeposit,
  ] = useState<
    DepositSummary | null
  >(null);


  const [
    debts,
    setDebts,
  ] = useState<
    DebtReportItem[]
  >([]);


  const [
    loading,
    setLoading,
  ] = useState(
    true
  );


  const [
    error,
    setError,
  ] = useState("");


  // =========================================================
  // LOAD ROOM DETAILS
  // =========================================================

  useEffect(
    () => {

      async function loadRoomDetails() {

        if (!roomId) {

          setError(
            "Room ID không hợp lệ."
          );

          setLoading(
            false
          );

          return;

        }


        try {

          setLoading(
            true
          );

          setError("");

          setTenant(
            null
          );

          setContract(
            null
          );

          setDeposit(
            null
          );

          setDebts(
            []
          );


          // =================================================
          // ROOM
          // =================================================

          const roomData =
            await apiGet<Room>(
              `/rooms/${roomId}`
            );


          setRoom(
            roomData
          );


          // =================================================
          // ACTIVE CONTRACT
          // =================================================

          const contractData =
            await apiGetOptional<Contract>(
              `/contracts/room/${roomId}/active`
            );


          setContract(
            contractData
          );


          // =================================================
          // TENANT + DEPOSIT
          // =================================================

          if (
            contractData
          ) {

            const [
              tenantData,
              depositData,
            ] =
              await Promise.all([

                apiGet<Tenant>(
                  `/tenants/${contractData.tenant_id}`
                ),

                apiGet<DepositSummary>(
                  `/contracts/${contractData.id}/deposit-summary`
                ),

              ]);


            setTenant(
              tenantData
            );


            setDeposit(
              depositData
            );

          }


          // =================================================
          // DEBT
          // =================================================

          const debtData =
            await apiGet<DebtReport>(
              "/reports/debts"
            );


          const roomDebts =
            debtData.items.filter(
              (
                item:
                  DebtReportItem
              ) =>
                item.room_id
                ===
                Number(
                  roomId
                )
            );


          setDebts(
            roomDebts
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
              "Không thể tải chi tiết phòng."
            );

          }


        } finally {

          setLoading(
            false
          );

        }

      }


      loadRoomDetails();

    },
    [
      roomId,
    ]
  );


  // =========================================================
  // LOADING
  // =========================================================

  if (
    loading
  ) {

    return (

      <div
        className="
          flex
          min-h-[320px]
          items-center
          justify-center
        "
      >

        <div
          className="
            text-center
          "
        >

          <div
            className="
              mx-auto
              mb-3
              flex
              h-11
              w-11
              animate-pulse
              items-center
              justify-center
              rounded-xl
              bg-[#f5eddc]
              text-[#9a762f]
            "
          >

            <House
              size={20}
            />

          </div>


          <div
            className="
              text-sm
              text-slate-500
            "
          >
            Đang tải chi tiết phòng...
          </div>

        </div>

      </div>

    );

  }


  // =========================================================
  // ERROR
  // =========================================================

  if (
    error
    ||
    !room
  ) {

    return (

      <div
        className="
          space-y-5
        "
      >

        <Link
          to="/rooms"
          className="
            inline-flex
            items-center
            gap-2
            text-sm
            font-medium
            text-slate-600
            transition
            hover:text-[#122033]
          "
        >

          <ArrowLeft
            size={16}
          />

          Quay lại danh sách phòng

        </Link>


        <Card
          className="
            rounded-2xl
            border-red-200
            bg-red-50
          "
        >

          <CardContent
            className="
              flex
              min-h-40
              items-center
              justify-center
              text-sm
              text-red-700
            "
          >

            {error
              ||
              "Không tìm thấy phòng."}

          </CardContent>

        </Card>

      </div>

    );

  }


  // =========================================================
  // CALCULATED
  // =========================================================

  const isOccupied =
    room.status
    === "OCCUPIED";


  const totalDebt =
    debts.reduce(
      (
        total,
        item
      ) =>
        total
        +
        item.remaining_amount,

      0
    );


  const expiryDays =
    contract

      ? getDaysUntil(
          contract.end_date
        )

      : null;


  const shouldShowExpiryWarning =
    contract !== null
    &&
    expiryDays !== null
    &&
    expiryDays >= 0
    &&
    expiryDays <= 30;



  // =========================================================
  // UI
  // =========================================================

  return (

    <>


      {/* =====================================================
          MOBILE
      ===================================================== */}

      <div
        className="
          md:hidden
          space-y-4
          pb-2
        "
      >

        {/* ==========================
            BACK
        ========================== */}

        <Link
          to="/rooms"
          className="
            inline-flex
            min-h-10
            items-center
            gap-2
            text-sm
            font-semibold
            text-slate-500
          "
        >

          <ArrowLeft
            size={17}
          />

          Danh sách phòng

        </Link>


        {/* ==========================
            ROOM HERO
        ========================== */}

        <section
          className="
            overflow-hidden
            rounded-3xl
            bg-[#122033]
            text-white
          "
        >

          <div
            className={
              isOccupied

                ? "h-1 bg-[#e44763]"

                : "h-1 bg-[#d6a64c]"
            }
          />


          <div
            className="p-5"
          >

            <div
              className="
                flex
                items-start
                justify-between
                gap-4
              "
            >

              <div
                className="min-w-0"
              >

                <div
                  className="
                    text-xs
                    font-semibold
                    uppercase
                    tracking-[0.16em]
                    text-[#d6a64c]
                  "
                >
                  Chi tiết phòng
                </div>


                <h1
                  className="
                    mt-1
                    truncate
                    text-3xl
                    font-bold
                    tracking-tight
                  "
                >
                  {room.room_code}
                </h1>


                <div
                  className="
                    mt-2
                    flex
                    flex-wrap
                    items-center
                    gap-2
                  "
                >

                  <span
                    className="
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-full
                      bg-white/10
                      px-2.5
                      py-1
                      text-xs
                      text-slate-200
                    "
                  >

                    <House
                      size={13}
                    />

                    {formatFloor(
                      room.floor
                    )}

                  </span>


                  {contract && (

                    <span
                      className="
                        inline-flex
                        items-center
                        gap-1.5
                        rounded-full
                        bg-white/10
                        px-2.5
                        py-1
                        text-xs
                        text-slate-200
                      "
                    >

                      <FileText
                        size={13}
                      />

                      HĐ #{contract.id}

                    </span>

                  )}

                </div>

              </div>


              <span
                className={
                  isOccupied

                    ? `
                      inline-flex
                      shrink-0
                      items-center
                      rounded-full
                      bg-[#e44763]/15
                      px-2.5
                      py-1.5
                      text-[11px]
                      font-semibold
                      text-[#ffb7c4]
                    `

                    : `
                      inline-flex
                      shrink-0
                      items-center
                      rounded-full
                      bg-[#d6a64c]/15
                      px-2.5
                      py-1.5
                      text-[11px]
                      font-semibold
                      text-[#efd38f]
                    `
                }
              >

                <span
                  className={
                    isOccupied

                      ? "mr-1.5 h-1.5 w-1.5 rounded-full bg-[#e44763]"

                      : "mr-1.5 h-1.5 w-1.5 rounded-full bg-[#d6a64c]"
                  }
                />

                {isOccupied
                  ? "Đang thuê"
                  : "Trống"}

              </span>

            </div>


            {room.description && (

              <p
                className="
                  mt-4
                  line-clamp-2
                  text-sm
                  leading-6
                  text-slate-300
                "
              >
                {room.description}
              </p>

            )}

          </div>

        </section>


        {/* ==========================
            EXPIRY WARNING
        ========================== */}

        {shouldShowExpiryWarning
          &&
          contract
          &&
          expiryDays !== null
          &&
          (

            <Link
              to={
                `/contracts/${contract.id}`
              }
              className={
                expiryDays <= 7

                  ? `
                    flex
                    items-center
                    gap-3
                    rounded-2xl
                    border
                    border-red-200
                    bg-red-50
                    p-4
                  `

                  : `
                    flex
                    items-center
                    gap-3
                    rounded-2xl
                    border
                    border-amber-200
                    bg-amber-50
                    p-4
                  `
              }
            >

              <div
                className={
                  expiryDays <= 7

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
                      bg-amber-100
                      text-amber-700
                    `
                }
              >

                <AlertTriangle
                  size={18}
                />

              </div>


              <div
                className="
                  min-w-0
                  flex-1
                "
              >

                <div
                  className={
                    expiryDays <= 7

                      ? "text-sm font-semibold text-red-700"

                      : "text-sm font-semibold text-amber-800"
                  }
                >
                  Hợp đồng sắp hết hạn
                </div>


                <div
                  className="
                    mt-1
                    text-xs
                    text-slate-600
                  "
                >
                  {expiryDays === 0
                    ? "Hết hạn hôm nay"
                    : `Còn ${expiryDays} ngày`}
                  {" • "}
                  {formatDate(
                    contract.end_date
                  )}
                </div>

              </div>


              <ArrowUpRight
                size={16}
                className="shrink-0"
              />

            </Link>

          )}


        {/* ==========================
            IMPORTANT STATS
        ========================== */}

        <section>

          <h2
            className="
              mb-3
              text-base
              font-bold
              text-[#172033]
            "
          >
            Tổng quan
          </h2>


          <div
            className="
              grid
              grid-cols-2
              gap-3
            "
          >

            <div
              className="
                rounded-2xl
                border
                border-[#ebe6dd]
                bg-white
                p-4
              "
            >

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-xl
                  bg-[#f5eddc]
                  text-[#9a762f]
                "
              >

                <CircleDollarSign
                  size={18}
                />

              </div>


              <div
                className="
                  mt-3
                  truncate
                  text-lg
                  font-bold
                  text-[#172033]
                "
              >
                {contract
                  ? formatMoney(
                      contract.monthly_rent
                    )
                  : "-"}
              </div>


              <div
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                Tiền thuê
              </div>

            </div>


            <div
              className="
                rounded-2xl
                border
                border-[#ebe6dd]
                bg-white
                p-4
              "
            >

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-xl
                  bg-[#fcecef]
                  text-[#b92f49]
                "
              >

                <BadgeDollarSign
                  size={18}
                />

              </div>


              <div
                className="
                  mt-3
                  truncate
                  text-lg
                  font-bold
                  text-[#172033]
                "
              >
                {deposit
                  ? formatMoney(
                      deposit.current_balance
                    )
                  : "-"}
              </div>


              <div
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                Cọc đang giữ
              </div>

            </div>


            <div
              className="
                rounded-2xl
                border
                border-[#ebe6dd]
                bg-white
                p-4
              "
            >

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-xl
                  bg-[#eef1f5]
                  text-[#20334d]
                "
              >

                <Users
                  size={18}
                />

              </div>


              <div
                className="
                  mt-3
                  text-lg
                  font-bold
                  text-[#172033]
                "
              >
                {contract
                  ? contract.occupant_count
                  : "-"}
              </div>


              <div
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                Người đang ở
              </div>

            </div>


            <div
              className={
                totalDebt > 0

                  ? `
                    rounded-2xl
                    border
                    border-red-200
                    bg-red-50
                    p-4
                  `

                  : `
                    rounded-2xl
                    border
                    border-[#ebe6dd]
                    bg-white
                    p-4
                  `
              }
            >

              <div
                className={
                  totalDebt > 0

                    ? `
                      flex
                      h-9
                      w-9
                      items-center
                      justify-center
                      rounded-xl
                      bg-red-100
                      text-red-600
                    `

                    : `
                      flex
                      h-9
                      w-9
                      items-center
                      justify-center
                      rounded-xl
                      bg-emerald-50
                      text-emerald-600
                    `
                }
              >

                <WalletCards
                  size={18}
                />

              </div>


              <div
                className={
                  totalDebt > 0

                    ? `
                      mt-3
                      truncate
                      text-lg
                      font-bold
                      text-red-600
                    `

                    : `
                      mt-3
                      truncate
                      text-lg
                      font-bold
                      text-[#172033]
                    `
                }
              >
                {formatMoney(
                  totalDebt
                )}
              </div>


              <div
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                Công nợ
              </div>

            </div>

          </div>

        </section>


        {/* ==========================
            TENANT
        ========================== */}

        <section>

          <div
            className="
              mb-3
              flex
              items-center
              justify-between
              gap-3
            "
          >

            <h2
              className="
                text-base
                font-bold
                text-[#172033]
              "
            >
              Khách thuê
            </h2>


            {tenant && (

              <Link
                to={
                  `/tenants/${tenant.id}`
                }
                className="
                  text-xs
                  font-semibold
                  text-[#b7862e]
                "
              >
                Xem hồ sơ
              </Link>

            )}

          </div>


          {tenant ? (

            <Link
              to={
                `/tenants/${tenant.id}`
              }
              className="
                block
                rounded-2xl
                border
                border-[#ebe6dd]
                bg-white
                p-4
              "
            >

              <div
                className="
                  flex
                  items-center
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
                    bg-[#fcecef]
                    text-[#b92f49]
                  "
                >

                  <UserRound
                    size={20}
                  />

                </div>


                <div
                  className="
                    min-w-0
                    flex-1
                  "
                >

                  <div
                    className="
                      truncate
                      text-base
                      font-bold
                      text-[#172033]
                    "
                  >
                    {tenant.full_name}
                  </div>


                  <div
                    className="
                      mt-1
                      truncate
                      text-xs
                      text-slate-500
                    "
                  >
                    {tenant.phone
                      ?? "Chưa có số điện thoại"}
                  </div>

                </div>


                <ArrowUpRight
                  size={17}
                  className="
                    shrink-0
                    text-slate-400
                  "
                />

              </div>


              {(tenant.email
                ||
                tenant.citizen_id) && (

                <div
                  className="
                    mt-4
                    grid
                    grid-cols-1
                    gap-2
                    border-t
                    border-[#f0ece5]
                    pt-3
                    text-xs
                    text-slate-500
                  "
                >

                  {tenant.email && (
                    <div className="truncate">
                      Email: {tenant.email}
                    </div>
                  )}


                  {tenant.citizen_id && (
                    <div className="truncate">
                      CCCD: {tenant.citizen_id}
                    </div>
                  )}

                </div>

              )}

            </Link>

          ) : (

            <div
              className="
                rounded-2xl
                border
                border-[#ebe6dd]
                bg-white
                p-5
                text-center
              "
            >

              <UserRound
                size={22}
                className="
                  mx-auto
                  text-slate-400
                "
              />


              <div
                className="
                  mt-2
                  text-sm
                  font-semibold
                  text-[#172033]
                "
              >
                Chưa có khách thuê
              </div>


              <div
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                Phòng hiện đang trống.
              </div>

            </div>

          )}

        </section>


        {/* ==========================
            CONTRACT
        ========================== */}

        <section>

          <div
            className="
              mb-3
              flex
              items-center
              justify-between
              gap-3
            "
          >

            <h2
              className="
                text-base
                font-bold
                text-[#172033]
              "
            >
              Hợp đồng hiện tại
            </h2>


            {contract && (

              <Link
                to={
                  `/contracts/${contract.id}`
                }
                className="
                  text-xs
                  font-semibold
                  text-[#b7862e]
                "
              >
                Chi tiết
              </Link>

            )}

          </div>


          {contract ? (

            <div
              className="
                rounded-2xl
                border
                border-[#ebe6dd]
                bg-white
                px-4
                py-1
              "
            >

              <DetailRow
                label="Mã hợp đồng"
                value={
                  `#${contract.id}`
                }
              />


              <DetailRow
                label="Bắt đầu"
                value={
                  formatDate(
                    contract.start_date
                  )
                }
              />


              <DetailRow
                label="Kết thúc"
                value={
                  formatDate(
                    contract.end_date
                  )
                }
              />


              <DetailRow
                label="Tiền thuê"
                value={
                  formatMoney(
                    contract.monthly_rent
                  )
                }
              />


              <Link
                to={
                  `/contracts/${contract.id}`
                }
                className="
                  mb-4
                  mt-3
                  inline-flex
                  h-11
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-[#122033]
                  px-4
                  text-sm
                  font-semibold
                  text-white
                "
              >

                Xem hợp đồng

                <ArrowUpRight
                  size={16}
                />

              </Link>

            </div>

          ) : (

            <div
              className="
                rounded-2xl
                border
                border-[#ebe6dd]
                bg-white
                p-5
                text-center
              "
            >

              <FileText
                size={22}
                className="
                  mx-auto
                  text-slate-400
                "
              />


              <div
                className="
                  mt-2
                  text-sm
                  font-semibold
                  text-[#172033]
                "
              >
                Chưa có hợp đồng
              </div>


              <div
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                Phòng chưa có hợp đồng đang hoạt động.
              </div>

            </div>

          )}

        </section>


        {/* ==========================
            DEPOSIT
        ========================== */}

        {deposit && (

          <section>

            <h2
              className="
                mb-3
                text-base
                font-bold
                text-[#172033]
              "
            >
              Tiền cọc
            </h2>


            <div
              className="
                rounded-2xl
                border
                border-[#ebe6dd]
                bg-white
                px-4
                py-1
              "
            >

              <DetailRow
                label="Cọc yêu cầu"
                value={
                  formatMoney(
                    deposit.required_amount
                  )
                }
              />


              <DetailRow
                label="Đã thu"
                value={
                  formatMoney(
                    deposit.total_collected
                  )
                }
              />


              <DetailRow
                label="Đã hoàn"
                value={
                  formatMoney(
                    deposit.total_refunded
                  )
                }
              />


              <DetailRow
                label="Khấu trừ"
                value={
                  formatMoney(
                    deposit.total_deducted
                  )
                }
              />


              <div
                className="
                  my-3
                  flex
                  items-center
                  justify-between
                  gap-3
                  rounded-xl
                  bg-[#fffaf0]
                  px-3
                  py-3
                "
              >

                <span
                  className="
                    text-sm
                    font-semibold
                    text-[#8a6726]
                  "
                >
                  Đang giữ
                </span>


                <strong
                  className="
                    text-base
                    text-[#172033]
                  "
                >
                  {formatMoney(
                    deposit.current_balance
                  )}
                </strong>

              </div>

            </div>

          </section>

        )}


        {/* ==========================
            DEBT
        ========================== */}

        {debts.length > 0 && (

          <section>

            <div
              className="
                mb-3
                flex
                items-center
                justify-between
                gap-3
              "
            >

              <h2
                className="
                  text-base
                  font-bold
                  text-[#172033]
                "
              >
                Công nợ
              </h2>


              <Link
                to="/debts"
                className="
                  text-xs
                  font-semibold
                  text-[#b7862e]
                "
              >
                Xem tất cả
              </Link>

            </div>


            <div
              className="
                overflow-hidden
                rounded-2xl
                border
                border-red-200
                bg-white
              "
            >

              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                  bg-red-50
                  px-4
                  py-3
                "
              >

                <span
                  className="
                    text-sm
                    font-semibold
                    text-red-700
                  "
                >
                  Tổng còn nợ
                </span>


                <strong
                  className="
                    text-base
                    text-red-700
                  "
                >
                  {formatMoney(
                    totalDebt
                  )}
                </strong>

              </div>


              {debts
                .slice(
                  0,
                  3
                )
                .map(
                  (
                    debt
                  ) => (

                    <Link
                      key={
                        debt.invoice_id
                      }
                      to={
                        `/invoices/${debt.invoice_id}`
                      }
                      className="
                        flex
                        min-h-[68px]
                        items-center
                        justify-between
                        gap-3
                        border-t
                        border-[#f0ece5]
                        px-4
                        py-3
                      "
                    >

                      <div>

                        <div
                          className="
                            text-sm
                            font-semibold
                            text-[#172033]
                          "
                        >
                          Hóa đơn {debt.month}/{debt.year}
                        </div>


                        <div
                          className="
                            mt-0.5
                            text-xs
                            text-slate-500
                          "
                        >
                          #{debt.invoice_id}
                        </div>

                      </div>


                      <div
                        className="
                          shrink-0
                          text-right
                        "
                      >

                        <div
                          className="
                            text-[10px]
                            text-slate-500
                          "
                        >
                          Còn nợ
                        </div>


                        <strong
                          className="
                            mt-0.5
                            block
                            text-sm
                            text-red-600
                          "
                        >
                          {formatMoney(
                            debt.remaining_amount
                          )}
                        </strong>

                      </div>

                    </Link>

                  )
                )}

            </div>

          </section>

        )}


        {/* ==========================
            QUICK ACTIONS
        ========================== */}

        <section>

          <h2
            className="
              mb-3
              text-base
              font-bold
              text-[#172033]
            "
          >
            Truy cập nhanh
          </h2>


          <div
            className="
              grid
              grid-cols-2
              gap-3
            "
          >

            <RoomQuickAction
              to="/meter-readings"
              label="Chỉ số điện"
              icon={
                CalendarClock
              }
            />


            <RoomQuickAction
              to="/invoices"
              label="Hóa đơn"
              icon={
                ReceiptText
              }
            />


            <RoomQuickAction
              to="/payments"
              label="Giao dịch"
              icon={
                CircleDollarSign
              }
            />


            <RoomQuickAction
              to="/debts"
              label="Công nợ"
              icon={
                WalletCards
              }
            />

          </div>

        </section>

      </div>


      {/* =====================================================
          DESKTOP
      ===================================================== */}

      <div
        className="
          hidden
          md:block
        "
      >

        <div
          className="
            space-y-6
            pb-10
          "
        >

      {/* =====================================================
          BACK
      ===================================================== */}

      <Link
        to="/rooms"
        className="
          inline-flex
          items-center
          gap-2
          text-sm
          font-medium
          text-slate-500
          transition
          hover:text-[#122033]
        "
      >

        <ArrowLeft
          size={16}
        />

        Quay lại danh sách phòng

      </Link>


      {/* =====================================================
          HERO
      ===================================================== */}

      <section
        className="
          relative
          overflow-hidden
          rounded-2xl
          border
          border-[#26384f]
          bg-[#122033]
          px-6
          py-6
          text-white
          shadow-[0_18px_50px_rgba(15,31,51,0.14)]
          md:px-8
        "
      >

        <div
          className="
            absolute
            -right-14
            -top-20
            h-56
            w-56
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
            flex-col
            gap-5
            md:flex-row
            md:items-center
            md:justify-between
          "
        >

          <div>

            <div
              className="
                mb-2
                flex
                items-center
                gap-2
                text-xs
                font-semibold
                uppercase
                tracking-[0.22em]
                text-[#d6a64c]
              "
            >

              <Building2
                size={16}
              />

              Chi tiết phòng

            </div>


            <h1
              className="
                text-3xl
                font-semibold
                tracking-tight
                md:text-4xl
              "
            >
              {room.room_code}
            </h1>


            <p
              className="
                mt-2
                max-w-2xl
                text-sm
                leading-6
                text-slate-300
              "
            >

              {room.description
                ??
                "Chưa có mô tả cho phòng này."}

            </p>


            <div
              className="
                mt-4
                flex
                flex-wrap
                gap-2
              "
            >

              <Badge
                variant="outline"
                className="
                  border-white/15
                  bg-white/5
                  text-slate-200
                "
              >

                <House />

                {formatFloor(
                  room.floor
                )}

              </Badge>


              {contract && (

                <Badge
                  variant="outline"
                  className="
                    border-[#d6a64c]/40
                    bg-[#d6a64c]/10
                    text-[#efd38f]
                  "
                >

                  <FileText />

                  HĐ #{contract.id}

                </Badge>

              )}

            </div>

          </div>


          <div>

            <span
              className={
                isOccupied

                  ? `
                    inline-flex
                    items-center
                    rounded-full
                    border
                    border-[#e44763]/40
                    bg-[#e44763]/15
                    px-4
                    py-2
                    text-sm
                    font-semibold
                    text-[#ffb7c4]
                  `

                  : `
                    inline-flex
                    items-center
                    rounded-full
                    border
                    border-[#d6a64c]/40
                    bg-[#d6a64c]/15
                    px-4
                    py-2
                    text-sm
                    font-semibold
                    text-[#efd38f]
                  `
              }
            >

              <span
                className={
                  isOccupied

                    ? `
                      mr-2
                      h-2
                      w-2
                      rounded-full
                      bg-[#e44763]
                    `

                    : `
                      mr-2
                      h-2
                      w-2
                      rounded-full
                      bg-[#d6a64c]
                    `
                }
              />

              {isOccupied
                ? "Đang thuê"
                : "Phòng trống"}

            </span>

          </div>

        </div>

      </section>


      {/* =====================================================
          CONTRACT EXPIRY
      ===================================================== */}

      {shouldShowExpiryWarning
        &&
        contract
        &&
        expiryDays !== null
        &&
        (

          <Link
            to={
              `/contracts/${contract.id}`
            }
            className={
              expiryDays <= 7

                ? `
                  flex
                  flex-col
                  gap-4
                  rounded-2xl
                  border
                  border-red-200
                  bg-red-50
                  px-5
                  py-4
                  transition
                  hover:border-red-300
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                `

                : `
                  flex
                  flex-col
                  gap-4
                  rounded-2xl
                  border
                  border-amber-200
                  bg-amber-50
                  px-5
                  py-4
                  transition
                  hover:border-amber-300
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                `
            }
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
                  expiryDays <= 7

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
                      bg-amber-100
                      text-amber-700
                    `
                }
              >

                <AlertTriangle
                  size={19}
                />

              </div>


              <div>

                <strong
                  className={
                    expiryDays <= 7

                      ? "text-sm text-red-700"

                      : "text-sm text-amber-800"
                  }
                >
                  Hợp đồng sắp hết hạn
                </strong>


                <p
                  className="
                    mt-1
                    text-sm
                    leading-5
                    text-slate-600
                  "
                >
                  Hợp đồng #{contract.id}
                  {" sẽ hết hạn vào "}
                  {formatDate(
                    contract.end_date
                  )}
                  .
                </p>

              </div>

            </div>


            <div
              className="
                flex
                items-center
                gap-2
              "
            >

              <strong
                className={
                  expiryDays <= 7

                    ? `
                      whitespace-nowrap
                      text-sm
                      text-red-700
                    `

                    : `
                      whitespace-nowrap
                      text-sm
                      text-amber-700
                    `
                }
              >

                {expiryDays === 0
                  ? "Hết hạn hôm nay"
                  : `Còn ${expiryDays} ngày`}

              </strong>


              <ArrowUpRight
                size={16}
              />

            </div>

          </Link>

        )}


      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <div
        className="
          grid
          grid-cols-1
          gap-4
          sm:grid-cols-2
          xl:grid-cols-4
        "
      >

        <RoomDetailStat
          title="Vị trí"
          value={
            formatFloor(
              room.floor
            )
          }
          subtitle="Vị trí của phòng"
          icon={
            Building2
          }
        />


        <RoomDetailStat
          title="Tiền thuê"
          value={
            contract
              ? formatMoney(
                  contract.monthly_rent
                )
              : "-"
          }
          subtitle={
            contract
              ? "Theo hợp đồng hiện tại"
              : "Chưa có hợp đồng"
          }
          icon={
            CircleDollarSign
          }
          accent="gold"
        />


        <RoomDetailStat
          title="Cọc đang giữ"
          value={
            deposit
              ? formatMoney(
                  deposit.current_balance
                )
              : "-"
          }
          subtitle="Số dư tiền cọc hiện tại"
          icon={
            BadgeDollarSign
          }
          accent="rose"
        />


        <RoomDetailStat
          title="Công nợ"
          value={
            formatMoney(
              totalDebt
            )
          }
          subtitle={
            debts.length > 0
              ? `${debts.length} hóa đơn còn nợ`
              : "Không có công nợ"
          }
          icon={
            WalletCards
          }
          danger={
            totalDebt > 0
          }
        />

      </div>


      {/* =====================================================
          DETAILS GRID
      ===================================================== */}

      <div
        className="
          grid
          grid-cols-1
          gap-5
          xl:grid-cols-2
        "
      >

        {/* ===================================================
            TENANT
        =================================================== */}

        <Card
          className="
            rounded-2xl
            border-[#e9e2d8]
            shadow-sm
          "
        >

          <CardHeader
            className="
              border-b
              border-[#eeeae2]
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

              <div>

                <CardTitle
                  className="
                    flex
                    items-center
                    gap-2
                    text-base
                  "
                >

                  <UserRound
                    size={18}
                    className=
                      "text-[#e44763]"
                  />

                  Khách thuê

                </CardTitle>


                <CardDescription
                  className="mt-1"
                >
                  Thông tin người thuê hiện tại.
                </CardDescription>

              </div>


              {tenant && (

                <Badge
                  variant="outline"
                  className="
                    border-[#efced4]
                    bg-[#fcecef]
                    text-[#b92f49]
                  "
                >
                  Đang thuê
                </Badge>

              )}

            </div>

          </CardHeader>


          <CardContent
            className="
              p-5
            "
          >

            {tenant ? (

              <>

                <div
                  className="
                    space-y-1
                  "
                >

                  <DetailRow
                    label="Họ tên"
                    value={
                      tenant.full_name
                    }
                  />


                  <DetailRow
                    label="Điện thoại"
                    value={
                      tenant.phone
                      ?? "-"
                    }
                  />


                  <DetailRow
                    label="Email"
                    value={
                      tenant.email
                      ?? "-"
                    }
                  />


                  <DetailRow
                    label="CCCD"
                    value={
                      tenant.citizen_id
                      ?? "-"
                    }
                  />

                </div>


                <Link
                  to={
                    `/tenants/${tenant.id}`
                  }
                  className="
                    mt-5
                    inline-flex
                    h-10
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    border
                    border-[#efced4]
                    bg-[#fcecef]
                    px-4
                    text-sm
                    font-semibold
                    text-[#b92f49]
                    transition
                    hover:border-[#e44763]
                    hover:bg-[#f9dde3]
                  "
                >

                  <UserRound
                    size={16}
                  />

                  Xem hồ sơ khách thuê

                  <ArrowUpRight
                    size={15}
                  />

                </Link>

              </>

            ) : (

              <EmptyPanel
                icon={
                  Users
                }
                title="Chưa có khách thuê"
                description=
                  "Phòng hiện không có khách thuê đang hoạt động."
              />

            )}

          </CardContent>

        </Card>


        {/* ===================================================
            CONTRACT
        =================================================== */}

        <Card
          className="
            rounded-2xl
            border-[#e9e2d8]
            shadow-sm
          "
        >

          <CardHeader
            className="
              border-b
              border-[#eeeae2]
            "
          >

            <CardTitle
              className="
                flex
                items-center
                gap-2
                text-base
              "
            >

              <FileText
                size={18}
                className=
                  "text-[#d6a64c]"
              />

              Hợp đồng

            </CardTitle>


            <CardDescription>
              Hợp đồng đang hoạt động của phòng.
            </CardDescription>

          </CardHeader>


          <CardContent
            className="p-5"
          >

            {contract ? (

              <>

                <div
                  className="space-y-1"
                >

                  <DetailRow
                    label="Mã hợp đồng"
                    value={
                      `#${contract.id}`
                    }
                  />


                  <DetailRow
                    label="Ngày bắt đầu"
                    value={
                      formatDate(
                        contract.start_date
                      )
                    }
                  />


                  <DetailRow
                    label="Ngày kết thúc"
                    value={
                      formatDate(
                        contract.end_date
                      )
                    }
                  />


                  <DetailRow
                    label="Số người ở"
                    value={
                      String(
                        contract.occupant_count
                      )
                    }
                  />


                  <DetailRow
                    label="Tiền thuê"
                    value={
                      formatMoney(
                        contract.monthly_rent
                      )
                    }
                  />


                  <DetailRow
                    label="Cọc yêu cầu"
                    value={
                      formatMoney(
                        contract.deposit_required
                      )
                    }
                  />

                </div>


                <Link
                  to={
                    `/contracts/${contract.id}`
                  }
                  className="
                    mt-5
                    inline-flex
                    h-10
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-[#122033]
                    px-4
                    text-sm
                    font-semibold
                    text-white
                    transition
                    hover:bg-[#20334d]
                  "
                >

                  <FileText
                    size={16}
                  />

                  Xem chi tiết hợp đồng

                  <ArrowUpRight
                    size={15}
                  />

                </Link>

              </>

            ) : (

              <EmptyPanel
                icon={
                  FileText
                }
                title="Chưa có hợp đồng"
                description=
                  "Phòng hiện chưa có hợp đồng đang hoạt động."
              />

            )}

          </CardContent>

        </Card>


        {/* ===================================================
            DEPOSIT
        =================================================== */}

        <Card
          className="
            rounded-2xl
            border-[#e9e2d8]
            shadow-sm
          "
        >

          <CardHeader
            className="
              border-b
              border-[#eeeae2]
            "
          >

            <CardTitle
              className="
                flex
                items-center
                gap-2
                text-base
              "
            >

              <ShieldCheck
                size={18}
                className=
                  "text-[#d6a64c]"
              />

              Tiền cọc

            </CardTitle>


            <CardDescription>
              Theo dõi tiền cọc của hợp đồng.
            </CardDescription>

          </CardHeader>


          <CardContent
            className="p-5"
          >

            {deposit ? (

              <div
                className="
                  space-y-1
                "
              >

                <DetailRow
                  label="Cọc yêu cầu"
                  value={
                    formatMoney(
                      deposit.required_amount
                    )
                  }
                />


                <DetailRow
                  label="Đã thu"
                  value={
                    formatMoney(
                      deposit.total_collected
                    )
                  }
                />


                <DetailRow
                  label="Đã hoàn"
                  value={
                    formatMoney(
                      deposit.total_refunded
                    )
                  }
                />


                <DetailRow
                  label="Đã khấu trừ"
                  value={
                    formatMoney(
                      deposit.total_deducted
                    )
                  }
                />


                <div
                  className="
                    mt-4
                    flex
                    items-center
                    justify-between
                    gap-4
                    rounded-xl
                    border
                    border-[#ead9b7]
                    bg-[#fffaf0]
                    px-4
                    py-4
                  "
                >

                  <span
                    className="
                      text-sm
                      font-medium
                      text-[#8a6726]
                    "
                  >
                    Đang giữ
                  </span>


                  <strong
                    className="
                      text-lg
                      text-[#172033]
                    "
                  >
                    {formatMoney(
                      deposit.current_balance
                    )}
                  </strong>

                </div>

              </div>

            ) : (

              <EmptyPanel
                icon={
                  BadgeDollarSign
                }
                title="Chưa có dữ liệu cọc"
                description=
                  "Tiền cọc sẽ xuất hiện khi phòng có hợp đồng."
              />

            )}

          </CardContent>

        </Card>


        {/* ===================================================
            DEBT
        =================================================== */}

        <Card
          className="
            rounded-2xl
            border-[#e9e2d8]
            shadow-sm
          "
        >

          <CardHeader
            className="
              border-b
              border-[#eeeae2]
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

              <div>

                <CardTitle
                  className="
                    flex
                    items-center
                    gap-2
                    text-base
                  "
                >

                  <ReceiptText
                    size={18}
                    className={
                      totalDebt > 0

                        ? "text-red-500"

                        : "text-emerald-600"
                    }
                  />

                  Công nợ

                </CardTitle>


                <CardDescription>
                  Các hóa đơn còn số tiền chưa thanh toán.
                </CardDescription>

              </div>


              <Badge
                variant="outline"
                className={
                  totalDebt > 0

                    ? `
                      border-red-200
                      bg-red-50
                      text-red-700
                    `

                    : `
                      border-emerald-200
                      bg-emerald-50
                      text-emerald-700
                    `
                }
              >

                {debts.length}

              </Badge>

            </div>

          </CardHeader>


          <CardContent
            className="p-5"
          >

            {debts.length === 0 ? (

              <EmptyPanel
                icon={
                  ShieldCheck
                }
                title="Không có công nợ"
                description=
                  "Phòng hiện không có hóa đơn chưa thanh toán đủ."
                success
              />

            ) : (

              <>

                <div
                  className="
                    mb-4
                    flex
                    items-center
                    justify-between
                    gap-4
                    rounded-xl
                    border
                    border-red-200
                    bg-red-50
                    px-4
                    py-4
                  "
                >

                  <span
                    className="
                      text-sm
                      font-medium
                      text-red-700
                    "
                  >
                    Tổng còn nợ
                  </span>


                  <strong
                    className="
                      text-lg
                      text-red-700
                    "
                  >
                    {formatMoney(
                      totalDebt
                    )}
                  </strong>

                </div>


                <div
                  className="
                    space-y-2
                  "
                >

                  {debts.map(
                    (
                      debt
                    ) => (

                      <Link
                        key={
                          debt.invoice_id
                        }
                        to={
                          `/invoices/${debt.invoice_id}`
                        }
                        className="
                          flex
                          items-center
                          justify-between
                          gap-4
                          rounded-xl
                          border
                          border-[#eee9df]
                          px-4
                          py-3
                          transition
                          hover:border-[#d6a64c]
                          hover:bg-[#fffdf8]
                        "
                      >

                        <div>

                          <strong
                            className="
                              text-sm
                              font-semibold
                              text-[#172033]
                            "
                          >
                            Hóa đơn{" "}
                            {debt.month}/{debt.year}
                          </strong>


                          <div
                            className="
                              mt-1
                              text-xs
                              text-slate-500
                            "
                          >
                            #{debt.invoice_id}
                          </div>

                        </div>


                        <div
                          className="
                            text-right
                          "
                        >

                          <div
                            className="
                              text-xs
                              text-slate-500
                            "
                          >
                            Còn nợ
                          </div>


                          <strong
                            className="
                              mt-1
                              block
                              text-sm
                              text-red-600
                            "
                          >
                            {formatMoney(
                              debt.remaining_amount
                            )}
                          </strong>

                        </div>

                      </Link>

                    )
                  )}

                </div>


                <Link
                  to="/debts"
                  className="
                    mt-5
                    inline-flex
                    h-10
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    border
                    border-[#ddd8ce]
                    bg-white
                    px-4
                    text-sm
                    font-semibold
                    text-[#172033]
                    transition
                    hover:border-[#d6a64c]
                    hover:bg-[#fffaf1]
                    hover:text-[#8a6726]
                  "
                >

                  <WalletCards
                    size={16}
                  />

                  Xem toàn bộ công nợ

                  <ArrowUpRight
                    size={15}
                  />

                </Link>

              </>

            )}

          </CardContent>

        </Card>

      </div>


      {/* =====================================================
          QUICK ACTIONS
      ===================================================== */}

      <Card
        className="
          rounded-2xl
          border-[#e9e2d8]
          shadow-sm
        "
      >

        <CardHeader>

          <CardTitle
            className="text-base"
          >
            Truy cập nhanh
          </CardTitle>


          <CardDescription>
            Các chức năng liên quan đến phòng {room.room_code}.
          </CardDescription>

        </CardHeader>


        <CardContent
          className="
            grid
            grid-cols-2
            gap-3
            md:grid-cols-4
          "
        >

          <RoomQuickAction
            to="/meter-readings"
            label="Chỉ số điện"
            icon={
              CalendarClock
            }
          />


          <RoomQuickAction
            to="/invoices"
            label="Hóa đơn"
            icon={
              ReceiptText
            }
          />


          <RoomQuickAction
            to="/payments"
            label="Giao dịch"
            icon={
              CircleDollarSign
            }
          />


          <RoomQuickAction
            to="/debts"
            label="Công nợ"
            icon={
              WalletCards
            }
          />

        </CardContent>

      </Card>


        </div>

      </div>

    </>

  );

}




// =========================================================
// STAT CARD
// =========================================================

function RoomDetailStat({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
  danger = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  accent?:
    | "rose"
    | "gold";
  danger?: boolean;
}) {

  return (

    <Card
      className="
        rounded-2xl
        border-[#e9e2d8]
        shadow-sm
      "
    >

      <CardContent
        className="
          flex
          items-center
          justify-between
          gap-4
          p-5
        "
      >

        <div
          className="min-w-0"
        >

          <div
            className="
              text-sm
              text-slate-500
            "
          >
            {title}
          </div>


          <div
            className={
              danger

                ? `
                  mt-2
                  truncate
                  text-xl
                  font-semibold
                  text-red-600
                `

                : `
                  mt-2
                  truncate
                  text-xl
                  font-semibold
                  text-[#172033]
                `
            }
          >
            {value}
          </div>


          <div
            className="
              mt-2
              truncate
              text-xs
              text-slate-500
            "
          >
            {subtitle}
          </div>

        </div>


        <div
          className={

            danger

              ? `
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-red-50
                text-red-600
              `

              : accent
                === "rose"

                ? `
                  flex
                  h-11
                  w-11
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-[#fcecef]
                  text-[#b92f49]
                `

                : accent
                  === "gold"

                  ? `
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#f5eddc]
                    text-[#9a762f]
                  `

                  : `
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#eef1f5]
                    text-[#20334d]
                  `
          }
        >

          <Icon
            size={21}
          />

        </div>

      </CardContent>

    </Card>

  );

}


// =========================================================
// DETAIL ROW
// =========================================================

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {

  return (

    <div
      className="
        flex
        items-center
        justify-between
        gap-4
        border-b
        border-[#f0ece5]
        px-1
        py-3
        last:border-0
      "
    >

      <span
        className="
          text-sm
          text-slate-500
        "
      >
        {label}
      </span>


      <strong
        className="
          max-w-[65%]
          break-words
          text-right
          text-sm
          font-semibold
          text-[#172033]
        "
      >
        {value}
      </strong>

    </div>

  );

}


// =========================================================
// EMPTY PANEL
// =========================================================

function EmptyPanel({
  icon: Icon,
  title,
  description,
  success = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  success?: boolean;
}) {

  return (

    <div
      className="
        flex
        min-h-48
        flex-col
        items-center
        justify-center
        px-5
        text-center
      "
    >

      <div
        className={
          success

            ? `
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-xl
              bg-emerald-50
              text-emerald-600
            `

            : `
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-xl
              bg-[#f5eddc]
              text-[#9a762f]
            `
        }
      >

        <Icon
          size={21}
        />

      </div>


      <strong
        className="
          mt-4
          text-sm
          text-[#172033]
        "
      >
        {title}
      </strong>


      <p
        className="
          mt-1
          max-w-xs
          text-sm
          leading-5
          text-slate-500
        "
      >
        {description}
      </p>

    </div>

  );

}


// =========================================================
// QUICK ACTION
// =========================================================

function RoomQuickAction({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
}) {

  return (

    <Link
      to={
        to
      }
      className="
        flex
        min-h-24
        flex-col
        justify-between
        rounded-xl
        border
        border-[#ebe6dd]
        bg-white
        p-4
        transition
        hover:-translate-y-0.5
        hover:border-[#d6a64c]
        hover:bg-[#fffdf8]
        hover:shadow-sm
      "
    >

      <div
        className="
          flex
          h-9
          w-9
          items-center
          justify-center
          rounded-lg
          bg-[#122033]
          text-[#d6a64c]
        "
      >

        <Icon
          size={17}
        />

      </div>


      <span
        className="
          mt-4
          text-sm
          font-medium
          text-[#172033]
        "
      >
        {label}
      </span>

    </Link>

  );

}


export default RoomDetails;
