import {
  useEffect,
  useMemo,
  useState,
 type ReactNode,
} from "react";

import {
  Link,
  useParams,
} from "react-router";

import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  FileClock,
  FileText,
  History,
  Mail,
  Phone,
  ShieldCheck,
  StickyNote,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import {
  apiGet,
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
  Tenant,
} from "../types/tenant";

import type {
  Contract,
} from "../types/contract";

import type {
  Room,
} from "../types/room";


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
      value.includes("T")
        ? value
        : `${value}T00:00:00`
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
    return "-";
  }


  if (
    floor === 0
  ) {
    return "Tầng trệt";
  }


  return `Tầng ${floor}`;

}


// =========================================================
// TENANT DETAILS
// =========================================================

function TenantDetails() {

  const {
    tenantId,
  } = useParams();


  const [
    tenant,
    setTenant,
  ] = useState<
    Tenant | null
  >(null);


  const [
    contracts,
    setContracts,
  ] = useState<
    Contract[]
  >([]);


  const [
    rooms,
    setRooms,
  ] = useState<
    Room[]
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
  // LOAD DATA
  // =========================================================

  useEffect(
    () => {

      async function loadTenantDetails() {

        if (
          !tenantId
        ) {

          setError(
            "Tenant ID không hợp lệ."
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


          const [
            tenantData,
            contractData,
            roomData,
          ] =
            await Promise.all([

              apiGet<Tenant>(
                `/tenants/${tenantId}`
              ),

              apiGet<Contract[]>(
                "/contracts"
              ),

              apiGet<Room[]>(
                "/rooms"
              ),

            ]);


          setTenant(
            tenantData
          );


          const tenantContracts =
            contractData.filter(
              (
                contract
              ) =>
                contract.tenant_id
                ===
                Number(
                  tenantId
                )
            );


          setContracts(
            tenantContracts
          );


          setRooms(
            roomData
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
              "Không thể tải chi tiết khách thuê."
            );

          }


        } finally {

          setLoading(
            false
          );

        }

      }


      loadTenantDetails();

    },
    [
      tenantId,
    ]
  );


  // =========================================================
  // ROOM MAP
  // =========================================================

  const roomMap =
    useMemo(
      () =>

        new Map(
          rooms.map(
            (
              room
            ) => [
              room.id,
              room,
            ]
          )
        ),

      [
        rooms,
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
              h-12
              w-12
              animate-pulse
              items-center
              justify-center
              rounded-xl
              bg-[#fcecef]
              text-[#b92f49]
            "
          >

            <UserRound
              size={21}
            />

          </div>


          <p
            className="
              text-sm
              text-slate-500
            "
          >
            Đang tải chi tiết khách thuê...
          </p>

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
    !tenant
  ) {

    return (

      <div
        className="
          space-y-5
        "
      >

        <Link
          to="/tenants"
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

          Quay lại danh sách khách thuê

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
              "Không tìm thấy khách thuê."}

          </CardContent>

        </Card>

      </div>

    );

  }


  // =========================================================
  // CALCULATED
  // =========================================================

  const activeContracts =
    contracts.filter(
      (
        contract
      ) =>
        contract.status
        === "ACTIVE"
    );


  const endedContracts =
    contracts.filter(
      (
        contract
      ) =>
        contract.status
        !== "ACTIVE"
    );


  const currentContract =
    activeContracts[0];


  const currentRoom =
    currentContract
      ? roomMap.get(
          currentContract.room_id
        )
      : undefined;


  const isRenting =
    activeContracts.length
    > 0;


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
          space-y-4
          pb-6
          md:hidden
        "
      >

        {/* BACK + STATUS */}

        <div
          className="
            flex
            items-center
            justify-between
            gap-3
          "
        >

          <Link
            to="/tenants"
            className="
              inline-flex
              h-10
              items-center
              gap-2
              rounded-xl
              border
              border-[#e9e2d8]
              bg-white
              px-3
              text-sm
              font-semibold
              text-[#172033]
            "
          >

            <ArrowLeft
              size={16}
            />

            Khách thuê

          </Link>


          <span
            className={
              isRenting

                ? `
                  inline-flex
                  items-center
                  rounded-full
                  bg-[#fcecef]
                  px-3
                  py-1.5
                  text-xs
                  font-semibold
                  text-[#b92f49]
                `

                : `
                  inline-flex
                  items-center
                  rounded-full
                  bg-[#fffaf0]
                  px-3
                  py-1.5
                  text-xs
                  font-semibold
                  text-[#8a6726]
                `
            }
          >

            <span
              className={
                isRenting

                  ? `
                    mr-1.5
                    h-1.5
                    w-1.5
                    rounded-full
                    bg-[#e44763]
                  `

                  : `
                    mr-1.5
                    h-1.5
                    w-1.5
                    rounded-full
                    bg-[#d6a64c]
                  `
              }
            />

            {isRenting
              ? "Đang thuê"
              : "Chưa thuê"}

          </span>

        </div>


        {/* PROFILE HERO */}

        <section
          className="
            relative
            overflow-hidden
            rounded-3xl
            bg-[#122033]
            p-5
            text-white
          "
        >

          <div
            className="
              absolute
              -right-12
              -top-14
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
                  h-12
                  w-12
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  bg-white/10
                  text-[#efd38f]
                "
              >

                <UserRound
                  size={22}
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
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-[0.14em]
                    text-[#d6a64c]
                  "
                >
                  Hồ sơ #{tenant.id}
                </div>


                <h1
                  className="
                    mt-1
                    break-words
                    text-xl
                    font-bold
                    tracking-tight
                  "
                >
                  {tenant.full_name}
                </h1>


                <div
                  className="
                    mt-2
                    text-sm
                    text-slate-300
                  "
                >
                  {currentRoom
                    ? `Phòng ${currentRoom.room_code} • ${formatFloor(currentRoom.floor)}`
                    : "Hiện chưa thuê phòng"}
                </div>

              </div>

            </div>


            {currentContract && (

              <div
                className="
                  mt-4
                  grid
                  grid-cols-2
                  gap-2
                "
              >

                <div
                  className="
                    rounded-2xl
                    bg-white/5
                    px-3
                    py-3
                  "
                >

                  <div
                    className="
                      text-[11px]
                      text-slate-400
                    "
                  >
                    Tiền thuê
                  </div>


                  <strong
                    className="
                      mt-1
                      block
                      text-sm
                      text-white
                    "
                  >
                    {formatMoney(
                      currentContract.monthly_rent
                    )}
                  </strong>

                </div>


                <div
                  className="
                    rounded-2xl
                    bg-white/5
                    px-3
                    py-3
                  "
                >

                  <div
                    className="
                      text-[11px]
                      text-slate-400
                    "
                  >
                    Hợp đồng
                  </div>


                  <strong
                    className="
                      mt-1
                      block
                      text-sm
                      text-white
                    "
                  >
                    #{currentContract.id}
                  </strong>

                </div>

              </div>

            )}

          </div>

        </section>


        {/* SUMMARY */}

        <div
          className="
            grid
            grid-cols-3
            gap-2
          "
        >

          <div
            className="
              rounded-2xl
              border
              border-[#e9e2d8]
              bg-white
              px-3
              py-3
              text-center
            "
          >

            <div
              className="
                text-xl
                font-bold
                text-[#172033]
              "
            >
              {contracts.length}
            </div>

            <div
              className="
                mt-1
                text-[11px]
                text-slate-500
              "
            >
              Hợp đồng
            </div>

          </div>


          <div
            className="
              rounded-2xl
              border
              border-[#efced4]
              bg-[#fff8fa]
              px-3
              py-3
              text-center
            "
          >

            <div
              className="
                text-xl
                font-bold
                text-[#b92f49]
              "
            >
              {activeContracts.length}
            </div>

            <div
              className="
                mt-1
                text-[11px]
                text-slate-500
              "
            >
              Hoạt động
            </div>

          </div>


          <div
            className="
              rounded-2xl
              border
              border-[#ead9b7]
              bg-[#fffaf0]
              px-3
              py-3
              text-center
            "
          >

            <div
              className="
                text-xl
                font-bold
                text-[#8a6726]
              "
            >
              {endedContracts.length}
            </div>

            <div
              className="
                mt-1
                text-[11px]
                text-slate-500
              "
            >
              Đã kết thúc
            </div>

          </div>

        </div>


        {/* CONTACT */}

        <section
          className="
            overflow-hidden
            rounded-2xl
            border
            border-[#e9e2d8]
            bg-white
          "
        >

          <div
            className="
              flex
              items-center
              gap-2
              border-b
              border-[#eeeae2]
              px-4
              py-3.5
            "
          >

            <UserRound
              size={17}
              className=
                "text-[#e44763]"
            />

            <h2
              className="
                text-sm
                font-bold
                text-[#172033]
              "
            >
              Thông tin khách thuê
            </h2>

          </div>


          <div
            className="
              px-4
              py-2
            "
          >

            <TenantDetailRow
              icon={
                Phone
              }
              label="Số điện thoại"
              value={
                tenant.phone
                ?? "-"
              }
            />


            <TenantDetailRow
              icon={
                Mail
              }
              label="Email"
              value={
                tenant.email
                ?? "-"
              }
            />


            <TenantDetailRow
              icon={
                ShieldCheck
              }
              label="CCCD"
              value={
                tenant.citizen_id
                ?? "-"
              }
            />

          </div>


          {tenant.note && (

            <div
              className="
                mx-4
                mb-4
                rounded-xl
                border
                border-[#eee9df]
                bg-[#fffdf9]
                px-3
                py-3
              "
            >

              <div
                className="
                  flex
                  items-center
                  gap-1.5
                  text-xs
                  font-semibold
                  text-slate-400
                "
              >

                <StickyNote
                  size={14}
                />

                Ghi chú

              </div>


              <p
                className="
                  mt-1.5
                  text-sm
                  leading-5
                  text-slate-600
                "
              >
                {tenant.note}
              </p>

            </div>

          )}

        </section>


        {/* CURRENT CONTRACT */}

        <section
          className="
            overflow-hidden
            rounded-2xl
            border
            border-[#e9e2d8]
            bg-white
          "
        >

          <div
            className="
              flex
              items-center
              justify-between
              gap-3
              border-b
              border-[#eeeae2]
              px-4
              py-3.5
            "
          >

            <div
              className="
                flex
                items-center
                gap-2
              "
            >

              <FileText
                size={17}
                className=
                  "text-[#d6a64c]"
              />

              <h2
                className="
                  text-sm
                  font-bold
                  text-[#172033]
                "
              >
                Hợp đồng hiện tại
              </h2>

            </div>


            {currentContract && (

              <Badge
                variant="outline"
                className="
                  border-[#efced4]
                  bg-[#fcecef]
                  text-[#b92f49]
                "
              >
                #{currentContract.id}
              </Badge>

            )}

          </div>


          {currentContract ? (

            <div
              className="
                p-4
              "
            >

              <div
                className="
                  mb-3
                  flex
                  items-center
                  justify-between
                  gap-3
                  rounded-xl
                  bg-[#fcfbf8]
                  px-3
                  py-3
                "
              >

                <div>

                  <div
                    className="
                      text-xs
                      text-slate-500
                    "
                  >
                    Phòng đang thuê
                  </div>


                  <strong
                    className="
                      mt-1
                      block
                      text-base
                      text-[#172033]
                    "
                  >
                    {currentRoom
                      ?.room_code
                      ??
                      `#${currentContract.room_id}`}
                  </strong>

                </div>


                {currentRoom && (

                  <span
                    className="
                      text-xs
                      font-medium
                      text-slate-500
                    "
                  >
                    {formatFloor(
                      currentRoom.floor
                    )}
                  </span>

                )}

              </div>


              <div
                className="
                  space-y-1
                "
              >

                <SimpleDetailRow
                  label="Bắt đầu"
                  value={
                    formatDate(
                      currentContract.start_date
                    )
                  }
                />


                <SimpleDetailRow
                  label="Kết thúc"
                  value={
                    formatDate(
                      currentContract.end_date
                    )
                  }
                />


                <SimpleDetailRow
                  label="Tiền thuê"
                  value={
                    formatMoney(
                      currentContract.monthly_rent
                    )
                  }
                />


                <SimpleDetailRow
                  label="Cọc yêu cầu"
                  value={
                    formatMoney(
                      currentContract.deposit_required
                    )
                  }
                />


                <SimpleDetailRow
                  label="Số người ở"
                  value={
                    String(
                      currentContract.occupant_count
                    )
                  }
                />

              </div>


              <div
                className="
                  mt-4
                  grid
                  grid-cols-2
                  gap-2
                "
              >

                {currentRoom ? (

                  <Link
                    to={
                      `/rooms/${currentRoom.id}`
                    }
                    className="
                      inline-flex
                      h-11
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      border
                      border-[#ddd8ce]
                      bg-white
                      px-3
                      text-sm
                      font-semibold
                      text-[#172033]
                    "
                  >

                    <Building2
                      size={16}
                    />

                    Xem phòng

                  </Link>

                ) : (

                  <div />

                )}


                <Link
                  to={
                    `/contracts/${currentContract.id}`
                  }
                  className="
                    inline-flex
                    h-11
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-[#122033]
                    px-3
                    text-sm
                    font-semibold
                    text-white
                  "
                >

                  Hợp đồng

                  <ArrowUpRight
                    size={15}
                  />

                </Link>

              </div>

            </div>

          ) : (

            <TenantEmptyState
              icon={
                FileClock
              }
              title="Chưa có hợp đồng hoạt động"
              description=
                "Khách hiện không thuê phòng nào."
            />

          )}

        </section>


        {/* CONTRACT HISTORY */}

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

            <div>

              <h2
                className="
                  text-sm
                  font-bold
                  text-[#172033]
                "
              >
                Lịch sử hợp đồng
              </h2>


              <p
                className="
                  mt-0.5
                  text-xs
                  text-slate-500
                "
              >
                {contracts.length} hợp đồng
              </p>

            </div>


            <History
              size={18}
              className=
                "text-[#d6a64c]"
            />

          </div>


          {contracts.length === 0 ? (

            <div
              className="
                rounded-2xl
                border
                border-[#e9e2d8]
                bg-white
              "
            >

              <TenantEmptyState
                icon={
                  FileText
                }
                title="Chưa có lịch sử hợp đồng"
                description=
                  "Khách thuê chưa từng có hợp đồng."
              />

            </div>

          ) : (

            <div
              className="
                space-y-3
              "
            >

              {contracts.map(
                (
                  contract
                ) => {

                  const room =
                    roomMap.get(
                      contract.room_id
                    );


                  const active =
                    contract.status
                    === "ACTIVE";


                  return (

                    <article
                      key={
                        contract.id
                      }
                      className="
                        overflow-hidden
                        rounded-2xl
                        border
                        border-[#e9e2d8]
                        bg-white
                      "
                    >

                      <div
                        className={
                          active
                            ? "h-1 bg-[#e44763]"
                            : "h-1 bg-slate-300"
                        }
                      />


                      <div
                        className="
                          p-4
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

                            <div
                              className="
                                text-[11px]
                                font-semibold
                                uppercase
                                tracking-[0.12em]
                                text-slate-400
                              "
                            >
                              Hợp đồng #{contract.id}
                            </div>


                            <div
                              className="
                                mt-1
                                text-base
                                font-bold
                                text-[#172033]
                              "
                            >
                              Phòng{" "}
                              {room
                                ?.room_code
                                ??
                                `#${contract.room_id}`}
                            </div>

                          </div>


                          <Badge
                            variant="outline"
                            className={
                              active

                                ? `
                                  border-[#efced4]
                                  bg-[#fcecef]
                                  text-[#b92f49]
                                `

                                : `
                                  border-[#ddd8ce]
                                  bg-slate-50
                                  text-slate-600
                                `
                            }
                          >
                            {active
                              ? "Đang thuê"
                              : "Đã kết thúc"}
                          </Badge>

                        </div>


                        <div
                          className="
                            mt-3
                            grid
                            grid-cols-2
                            gap-2
                          "
                        >

                          <div
                            className="
                              rounded-xl
                              bg-[#fcfbf8]
                              px-3
                              py-2.5
                            "
                          >

                            <div
                              className="
                                text-[11px]
                                text-slate-500
                              "
                            >
                              Bắt đầu
                            </div>

                            <strong
                              className="
                                mt-1
                                block
                                text-xs
                                text-[#172033]
                              "
                            >
                              {formatDate(
                                contract.start_date
                              )}
                            </strong>

                          </div>


                          <div
                            className="
                              rounded-xl
                              bg-[#fcfbf8]
                              px-3
                              py-2.5
                            "
                          >

                            <div
                              className="
                                text-[11px]
                                text-slate-500
                              "
                            >
                              Kết thúc
                            </div>

                            <strong
                              className="
                                mt-1
                                block
                                text-xs
                                text-[#172033]
                              "
                            >
                              {formatDate(
                                contract.end_date
                              )}
                            </strong>

                          </div>

                        </div>


                        <div
                          className="
                            mt-3
                            flex
                            items-center
                            justify-between
                            gap-3
                            rounded-xl
                            border
                            border-[#ead9b7]
                            bg-[#fffaf0]
                            px-3
                            py-3
                          "
                        >

                          <span
                            className="
                              text-xs
                              text-[#8a6726]
                            "
                          >
                            Tiền thuê
                          </span>


                          <strong
                            className="
                              text-sm
                              text-[#172033]
                            "
                          >
                            {formatMoney(
                              contract.monthly_rent
                            )}
                          </strong>

                        </div>


                        <Link
                          to={
                            `/contracts/${contract.id}`
                          }
                          className="
                            mt-3
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
                            text-sm
                            font-semibold
                            text-[#172033]
                          "
                        >
                          Xem chi tiết hợp đồng

                          <ArrowUpRight
                            size={14}
                          />
                        </Link>

                      </div>

                    </article>

                  );

                }
              )}

            </div>

          )}

        </section>

      </div>


      {/* =====================================================
          DESKTOP
      ===================================================== */}


    <div
      className="
        hidden
        space-y-6
        pb-10
        md:block
      "
    >

      {/* =====================================================
          BACK
      ===================================================== */}

      <Link
        to="/tenants"
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

        Quay lại danh sách khách thuê

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
            -right-16
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

              <UserRound
                size={16}
              />

              Chi tiết khách thuê

            </div>


            <h1
              className="
                text-2xl
                font-semibold
                tracking-tight
                md:text-3xl
              "
            >
              {tenant.full_name}
            </h1>


            <p
              className="
                mt-2
                text-sm
                text-slate-300
              "
            >
              Hồ sơ khách thuê #{tenant.id}
            </p>


            <div
              className="
                mt-4
                flex
                flex-wrap
                gap-2
              "
            >

              {currentRoom && (

                <Badge
                  variant="outline"
                  className="
                    border-white/15
                    bg-white/5
                    text-slate-200
                  "
                >

                  <Building2 />

                  Phòng {currentRoom.room_code}

                </Badge>

              )}


              {currentRoom && (

                <Badge
                  variant="outline"
                  className="
                    border-[#d6a64c]/40
                    bg-[#d6a64c]/10
                    text-[#efd38f]
                  "
                >

                  {formatFloor(
                    currentRoom.floor
                  )}

                </Badge>

              )}

            </div>

          </div>


          <span
            className={
              isRenting

                ? `
                  inline-flex
                  w-fit
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
                  w-fit
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
                isRenting

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

            {isRenting
              ? "Đang thuê"
              : "Chưa thuê phòng"}

          </span>

        </div>

      </section>


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

        <TenantDetailStat
          title="Tổng hợp đồng"
          value={
            String(
              contracts.length
            )
          }
          subtitle=
            "Toàn bộ lịch sử hợp đồng"
          icon={
            FileText
          }
        />


        <TenantDetailStat
          title="Đang hoạt động"
          value={
            String(
              activeContracts.length
            )
          }
          subtitle={
            isRenting
              ? "Đang thuê phòng"
              : "Không có hợp đồng"
          }
          icon={
            ShieldCheck
          }
          accent="rose"
        />


        <TenantDetailStat
          title="Đã kết thúc"
          value={
            String(
              endedContracts.length
            )
          }
          subtitle=
            "Hợp đồng trong lịch sử"
          icon={
            History
          }
          accent="gold"
        />


        <TenantDetailStat
          title="Phòng hiện tại"
          value={
            currentRoom
              ? currentRoom.room_code
              : "-"
          }
          subtitle={
            currentRoom
              ? formatFloor(
                  currentRoom.floor
                )
              : "Chưa thuê phòng"
          }
          icon={
            Building2
          }
        />

      </div>


      {/* =====================================================
          MAIN GRID
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
            TENANT INFORMATION
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

              <UserRound
                size={18}
                className=
                  "text-[#e44763]"
              />

              Thông tin khách thuê

            </CardTitle>


            <CardDescription>
              Thông tin liên hệ và định danh.
            </CardDescription>

          </CardHeader>


          <CardContent
            className="
              p-5
            "
          >

            <div
              className="
                space-y-1
              "
            >

              <TenantDetailRow
                icon={
                  UserRound
                }
                label="Họ và tên"
                value={
                  tenant.full_name
                }
              />


              <TenantDetailRow
                icon={
                  Phone
                }
                label="Số điện thoại"
                value={
                  tenant.phone
                  ?? "-"
                }
              />


              <TenantDetailRow
                icon={
                  Mail
                }
                label="Email"
                value={
                  tenant.email
                  ?? "-"
                }
              />


              <TenantDetailRow
                icon={
                  ShieldCheck
                }
                label="CCCD"
                value={
                  tenant.citizen_id
                  ?? "-"
                }
              />

            </div>


            <div
              className="
                mt-5
                rounded-xl
                border
                border-[#eee9df]
                bg-[#fffdf9]
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
                  text-slate-400
                "
              >

                <StickyNote
                  size={15}
                />

                Ghi chú

              </div>


              <p
                className="
                  mt-2
                  text-sm
                  leading-6
                  text-slate-600
                "
              >
                {tenant.note
                  ??
                  "Không có ghi chú."}
              </p>

            </div>

          </CardContent>

        </Card>


        {/* ===================================================
            ACTIVE CONTRACT
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

                  <FileText
                    size={18}
                    className=
                      "text-[#d6a64c]"
                  />

                  Hợp đồng đang hoạt động

                </CardTitle>


                <CardDescription>
                  Hợp đồng thuê hiện tại của khách.
                </CardDescription>

              </div>


              <Badge
                variant="outline"
                className="
                  border-[#efced4]
                  bg-[#fcecef]
                  text-[#b92f49]
                "
              >
                {activeContracts.length}
              </Badge>

            </div>

          </CardHeader>


          <CardContent
            className="
              p-5
            "
          >

            {activeContracts.length === 0 ? (

              <TenantEmptyState
                icon={
                  FileClock
                }
                title="Chưa có hợp đồng hoạt động"
                description=
                  "Khách hiện không thuê phòng nào."
              />

            ) : (

              <div
                className="
                  space-y-4
                "
              >

                {activeContracts.map(
                  (
                    contract
                  ) => {

                    const room =
                      roomMap.get(
                        contract.room_id
                      );


                    return (

                      <div
                        key={
                          contract.id
                        }
                        className="
                          overflow-hidden
                          rounded-xl
                          border
                          border-[#ebe5dc]
                          bg-white
                        "
                      >

                        <div
                          className="
                            flex
                            items-center
                            justify-between
                            gap-3
                            border-b
                            border-[#eeeae2]
                            bg-[#fcfbf8]
                            px-4
                            py-3
                          "
                        >

                          <div>

                            <div
                              className="
                                text-xs
                                font-semibold
                                uppercase
                                tracking-[0.12em]
                                text-slate-400
                              "
                            >
                              Hợp đồng #{contract.id}
                            </div>


                            <h3
                              className="
                                mt-1
                                font-semibold
                                text-[#172033]
                              "
                            >
                              Phòng{" "}
                              {room
                                ?.room_code
                                ??
                                `#${contract.room_id}`}
                            </h3>

                          </div>


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

                        </div>


                        <div
                          className="
                            space-y-1
                            px-4
                            py-3
                          "
                        >

                          <SimpleDetailRow
                            label="Bắt đầu"
                            value={
                              formatDate(
                                contract.start_date
                              )
                            }
                          />


                          <SimpleDetailRow
                            label="Kết thúc"
                            value={
                              formatDate(
                                contract.end_date
                              )
                            }
                          />


                          <SimpleDetailRow
                            label="Tiền thuê"
                            value={
                              formatMoney(
                                contract.monthly_rent
                              )
                            }
                          />


                          <SimpleDetailRow
                            label="Cọc yêu cầu"
                            value={
                              formatMoney(
                                contract.deposit_required
                              )
                            }
                          />


                          <SimpleDetailRow
                            label="Số người ở"
                            value={
                              String(
                                contract.occupant_count
                              )
                            }
                          />

                        </div>


                        <div
                          className="
                            grid
                            grid-cols-2
                            gap-2
                            border-t
                            border-[#eeeae2]
                            px-4
                            py-3
                          "
                        >

                          {room ? (

                            <Link
                              to={
                                `/rooms/${room.id}`
                              }
                              className="
                                inline-flex
                                h-9
                                items-center
                                justify-center
                                gap-1.5
                                rounded-lg
                                border
                                border-[#ddd8ce]
                                bg-white
                                px-3
                                text-xs
                                font-semibold
                                text-[#172033]
                                transition
                                hover:border-[#d6a64c]
                                hover:bg-[#fffaf1]
                              "
                            >

                              <Building2
                                size={14}
                              />

                              Xem phòng

                            </Link>

                          ) : (

                            <div />

                          )}


                          <Link
                            to={
                              `/contracts/${contract.id}`
                            }
                            className="
                              inline-flex
                              h-9
                              items-center
                              justify-center
                              gap-1.5
                              rounded-lg
                              bg-[#122033]
                              px-3
                              text-xs
                              font-semibold
                              text-white
                              transition
                              hover:bg-[#20334d]
                            "
                          >

                            Hợp đồng

                            <ArrowUpRight
                              size={14}
                            />

                          </Link>

                        </div>

                      </div>

                    );

                  }
                )}

              </div>

            )}

          </CardContent>

        </Card>

      </div>


      {/* =====================================================
          CONTRACT HISTORY
      ===================================================== */}

      <Card
        className="
          overflow-hidden
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
              gap-4
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

                <History
                  size={18}
                  className=
                    "text-[#d6a64c]"
                />

                Lịch sử hợp đồng

              </CardTitle>


              <CardDescription>
                Toàn bộ hợp đồng của khách thuê.
              </CardDescription>

            </div>


            <Badge
              variant="outline"
              className="
                border-[#e5dccb]
                bg-[#fffaf2]
                text-[#8a6726]
              "
            >
              {contracts.length} hợp đồng
            </Badge>

          </div>

        </CardHeader>


        <CardContent
          className="p-0"
        >

          {contracts.length === 0 ? (

            <TenantEmptyState
              icon={
                FileText
              }
              title="Chưa có lịch sử hợp đồng"
              description=
                "Khách thuê chưa từng có hợp đồng."
            />

          ) : (

            <div
              className="
                overflow-x-auto
              "
            >

              <table
                className="
                  w-full
                  min-w-[850px]
                  border-collapse
                  text-sm
                "
              >

                <thead
                  className="
                    bg-[#faf9f6]
                  "
                >

                  <tr
                    className="
                      border-b
                      border-[#eeeae2]
                    "
                  >

                    <TenantTableHead>
                      Mã HĐ
                    </TenantTableHead>

                    <TenantTableHead>
                      Phòng
                    </TenantTableHead>

                    <TenantTableHead>
                      Bắt đầu
                    </TenantTableHead>

                    <TenantTableHead>
                      Kết thúc
                    </TenantTableHead>

                    <TenantTableHead>
                      Tiền thuê
                    </TenantTableHead>

                    <TenantTableHead>
                      Trạng thái
                    </TenantTableHead>

                    <TenantTableHead>
                      Thao tác
                    </TenantTableHead>

                  </tr>

                </thead>


                <tbody>

                  {contracts.map(
                    (
                      contract
                    ) => {

                      const room =
                        roomMap.get(
                          contract.room_id
                        );


                      const active =
                        contract.status
                        === "ACTIVE";


                      return (

                        <tr
                          key={
                            contract.id
                          }
                          className="
                            border-b
                            border-[#f0ece5]
                            transition
                            last:border-0
                            hover:bg-[#fcfbf8]
                          "
                        >

                          <td
                            className="
                              px-5
                              py-4
                              font-semibold
                              text-[#172033]
                            "
                          >
                            #{contract.id}
                          </td>


                          <td
                            className="
                              px-5
                              py-4
                            "
                          >

                            {room ? (

                              <Link
                                to={
                                  `/rooms/${room.id}`
                                }
                                className="
                                  font-semibold
                                  text-[#172033]
                                  transition
                                  hover:text-[#b92f49]
                                "
                              >
                                {room.room_code}
                              </Link>

                            ) : (

                              `#${contract.room_id}`

                            )}

                          </td>


                          <td
                            className="
                              px-5
                              py-4
                              text-slate-600
                            "
                          >
                            {formatDate(
                              contract.start_date
                            )}
                          </td>


                          <td
                            className="
                              px-5
                              py-4
                              text-slate-600
                            "
                          >
                            {formatDate(
                              contract.end_date
                            )}
                          </td>


                          <td
                            className="
                              px-5
                              py-4
                              font-semibold
                              text-[#172033]
                            "
                          >
                            {formatMoney(
                              contract.monthly_rent
                            )}
                          </td>


                          <td
                            className="
                              px-5
                              py-4
                            "
                          >

                            <Badge
                              variant="outline"
                              className={
                                active

                                  ? `
                                    border-[#efced4]
                                    bg-[#fcecef]
                                    text-[#b92f49]
                                  `

                                  : `
                                    border-[#ddd8ce]
                                    bg-slate-50
                                    text-slate-600
                                  `
                              }
                            >

                              {active
                                ? "Đang thuê"
                                : "Đã kết thúc"}

                            </Badge>

                          </td>


                          <td
                            className="
                              px-5
                              py-4
                            "
                          >

                            <Link
                              to={
                                `/contracts/${contract.id}`
                              }
                              className="
                                inline-flex
                                h-8
                                items-center
                                justify-center
                                gap-1
                                rounded-lg
                                border
                                border-[#ddd8ce]
                                bg-white
                                px-3
                                text-xs
                                font-semibold
                                text-[#172033]
                                transition
                                hover:border-[#d6a64c]
                                hover:bg-[#fffaf1]
                              "
                            >

                              Chi tiết

                              <ArrowUpRight
                                size={13}
                              />

                            </Link>

                          </td>

                        </tr>

                      );

                    }
                  )}

                </tbody>

              </table>

            </div>

          )}

        </CardContent>

      </Card>

    </div>



    </>

  );

}


// =========================================================
// STAT CARD
// =========================================================

function TenantDetailStat({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  accent?:
    | "rose"
    | "gold";
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
            className="
              mt-2
              truncate
              text-2xl
              font-semibold
              text-[#172033]
            "
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
            accent
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
// TENANT DETAIL ROW
// =========================================================

function TenantDetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
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
        py-3
        last:border-0
      "
    >

      <div
        className="
          flex
          items-center
          gap-2.5
        "
      >

        <Icon
          size={16}
          className=
            "text-slate-400"
        />


        <span
          className="
            text-sm
            text-slate-500
          "
        >
          {label}
        </span>

      </div>


      <strong
        className="
          max-w-[60%]
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
// SIMPLE DETAIL ROW
// =========================================================

function SimpleDetailRow({
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
        py-2.5
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
// EMPTY STATE
// =========================================================

function TenantEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {

  return (

    <div
      className="
        flex
        min-h-44
        flex-col
        items-center
        justify-center
        px-5
        text-center
      "
    >

      <div
        className="
          flex
          h-12
          w-12
          items-center
          justify-center
          rounded-xl
          bg-[#f5eddc]
          text-[#9a762f]
        "
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
          max-w-sm
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
// TABLE HEAD
// =========================================================

function TenantTableHead({
  children,
}: {
  children: ReactNode;
}) {

  return (

    <th
      className="
        whitespace-nowrap
        px-5
        py-3
        text-left
        text-xs
        font-semibold
        uppercase
        tracking-[0.08em]
        text-slate-500
      "
    >
      {children}
    </th>

  );

}


export default TenantDetails