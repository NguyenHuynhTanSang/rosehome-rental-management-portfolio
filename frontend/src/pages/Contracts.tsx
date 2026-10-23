import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router";

import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  FileText,
  Filter,
  History,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import {
  apiDelete,
  apiGet,
} from "../api/api";

import AddContractModal
  from "../components/AddContractModal";

import EditContractModal
  from "../components/EditContractModal";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  Input,
} from "@/components/ui/input";

import type {
  Contract,
} from "../types/contract";

import type {
  Room,
} from "../types/room";

import type {
  Tenant,
} from "../types/tenant";


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


  const parts =
    value.split("-");


  if (
    parts.length
    !== 3
  ) {
    return value;
  }


  return (
    `${parts[2]}/${parts[1]}/${parts[0]}`
  );

}


function getDaysUntil(
  endDate: string | null
) {

  if (!endDate) {
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
      `${endDate}T00:00:00`
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


function getExpiryText(
  endDate: string | null
) {

  const days =
    getDaysUntil(
      endDate
    );


  if (
    days === null
  ) {
    return "Không thời hạn";
  }


  if (
    days < 0
  ) {
    return (
      `Quá hạn ${Math.abs(days)} ngày`
    );
  }


  if (
    days === 0
  ) {
    return "Hết hạn hôm nay";
  }


  if (
    days === 1
  ) {
    return "Còn 1 ngày";
  }


  return `Còn ${days} ngày`;

}


function getExpiryTone(
  endDate: string | null
) {

  const days =
    getDaysUntil(
      endDate
    );


  if (
    days === null
  ) {
    return "neutral";
  }


  if (
    days < 0
    ||
    days <= 3
  ) {
    return "danger";
  }


  if (
    days <= 30
  ) {
    return "warning";
  }


  return "success";

}


// =========================================================
// CONTRACTS
// =========================================================

function Contracts() {

  const [
    contracts,
    setContracts,
  ] = useState<Contract[]>([]);


  const [
    rooms,
    setRooms,
  ] = useState<Room[]>([]);


  const [
    tenants,
    setTenants,
  ] = useState<Tenant[]>([]);


  const [
    search,
    setSearch,
  ] = useState("");


  const [
    statusFilter,
    setStatusFilter,
  ] = useState("ALL");


  const [
    floorFilter,
    setFloorFilter,
  ] = useState("ALL");


  const [
    expiryFilter,
    setExpiryFilter,
  ] = useState("ALL");


  const [
    sortBy,
    setSortBy,
  ] = useState("ID_ASC");


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState("");


  const [
    showAddModal,
    setShowAddModal,
  ] = useState(false);


  const [
    editingContractId,
    setEditingContractId,
  ] = useState<
    number | null
  >(null);


  // =========================================================
  // LOAD DATA
  // =========================================================

  async function loadData() {

    try {

      setLoading(
        true
      );

      setError("");


      const [
        contractData,
        roomData,
        tenantData,
      ] =
        await Promise.all([

          apiGet<Contract[]>(
            "/contracts"
          ),

          apiGet<Room[]>(
            "/rooms"
          ),

          apiGet<Tenant[]>(
            "/tenants"
          ),

        ]);


      setContracts(
        contractData
      );


      setRooms(
        roomData
      );


      setTenants(
        tenantData
      );


    } catch (err) {

      console.error(
        err
      );


      setError(
        "Không thể tải danh sách hợp đồng."
      );


    } finally {

      setLoading(
        false
      );

    }

  }


  useEffect(
    () => {

      loadData();

    },
    []
  );


  // =========================================================
  // MAP
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


  const tenantMap =
    useMemo(
      () =>

        new Map(
          tenants.map(
            (
              tenant
            ) => [
              tenant.id,
              tenant,
            ]
          )
        ),

      [
        tenants,
      ]
    );


  const floorOptions =
    useMemo(
      () => {

        const values =
          new Set<number>();


        rooms.forEach(
          (
            room
          ) => {

            if (
              room.floor !== null
              &&
              room.floor !== undefined
            ) {

              values.add(
                room.floor
              );

            }

          }
        );


        return Array.from(
          values
        ).sort(
          (
            a,
            b
          ) =>
            a - b
        );

      },
      [
        rooms,
      ]
    );


  // =========================================================
  // CREATED
  // =========================================================

  function handleContractCreated(
    newContract: Contract
  ) {

    setContracts(
      (
        current
      ) => [
        newContract,
        ...current,
      ]
    );


    setRooms(
      (
        currentRooms
      ) =>

        currentRooms.map(
          (
            room
          ) =>
            room.id
            === newContract.room_id

              ? {
                  ...room,
                  status:
                    "OCCUPIED",
                }

              : room
        )
    );

  }


  // =========================================================
  // UPDATE / DELETE
  // =========================================================

  async function handleContractUpdated(
    _updatedContract: Contract
  ) {

    setEditingContractId(
      null
    );


    await loadData();

  }


  async function handleDeleteContract(
    contract: Contract
  ) {

    const confirmed =
      window.confirm(
        `Bạn có chắc muốn xóa hợp đồng #${contract.id}?\n\n`
        +
        "Chỉ nên dùng Xóa khi hợp đồng ACTIVE được tạo nhầm và chưa có giao dịch tiền cọc. "
        +
        "Hợp đồng đã kết thúc phải được giữ làm lịch sử."
      );


    if (
      !confirmed
    ) {
      return;
    }


    try {

      await apiDelete<{
        message: string;
        contract_id: number;
      }>(
        `/contracts/${contract.id}`
      );


      await loadData();


    } catch (err) {

      if (
        err instanceof Error
      ) {

        window.alert(
          err.message
        );

      } else {

        window.alert(
          "Không thể xóa hợp đồng."
        );

      }

    }

  }


  // =========================================================
  // FILTER
  // =========================================================

  const filteredContracts =
    useMemo(
      () => {

        const keyword =
          search
            .trim()
            .toLowerCase();


        const result =
          contracts.filter(
            (
              contract
            ) => {

              const room =
                roomMap.get(
                  contract.room_id
                );


              const tenant =
                tenantMap.get(
                  contract.tenant_id
                );


              const roomCode =
                room?.room_code
                ?? "";


              const tenantName =
                tenant?.full_name
                ?? "";


              const matchesSearch =
                keyword === ""
                ||
                String(
                  contract.id
                ).includes(
                  keyword
                )
                ||
                roomCode
                  .toLowerCase()
                  .includes(
                    keyword
                  )
                ||
                tenantName
                  .toLowerCase()
                  .includes(
                    keyword
                  );


              const matchesStatus =
                statusFilter
                === "ALL"
                ||
                contract.status
                === statusFilter;


              const matchesFloor =
                floorFilter
                === "ALL"
                ||
                (
                  room?.floor !== null
                  &&
                  room?.floor !== undefined
                  &&
                  String(
                    room.floor
                  )
                  ===
                  floorFilter
                );


              const daysUntil =
                getDaysUntil(
                  contract.end_date
                );


              let matchesExpiry =
                true;


              if (
                expiryFilter
                === "NO_END_DATE"
              ) {

                matchesExpiry =
                  contract.end_date
                  === null;

              } else if (
                expiryFilter
                === "OVERDUE"
              ) {

                matchesExpiry =
                  contract.status
                  === "ACTIVE"
                  &&
                  daysUntil !== null
                  &&
                  daysUntil < 0;

              } else if (
                expiryFilter
                === "7_DAYS"
              ) {

                matchesExpiry =
                  contract.status
                  === "ACTIVE"
                  &&
                  daysUntil !== null
                  &&
                  daysUntil >= 0
                  &&
                  daysUntil <= 7;

              } else if (
                expiryFilter
                === "30_DAYS"
              ) {

                matchesExpiry =
                  contract.status
                  === "ACTIVE"
                  &&
                  daysUntil !== null
                  &&
                  daysUntil >= 0
                  &&
                  daysUntil <= 30;

              }


              return (
                matchesSearch
                &&
                matchesStatus
                &&
                matchesFloor
                &&
                matchesExpiry
              );

            }
          );


        return [
          ...result,
        ].sort(
          (
            a,
            b
          ) => {

            if (
              sortBy
              === "END_ASC"
            ) {

              const daysA =
                getDaysUntil(
                  a.end_date
                );


              const daysB =
                getDaysUntil(
                  b.end_date
                );


              if (
                daysA === null
                &&
                daysB === null
              ) {
                return 0;
              }


              if (
                daysA === null
              ) {
                return 1;
              }


              if (
                daysB === null
              ) {
                return -1;
              }


              return (
                daysA
                -
                daysB
              );

            }


            if (
              sortBy
              === "ROOM_ASC"
            ) {

              const roomA =
                roomMap.get(
                  a.room_id
                )
                ?.room_code
                ?? "";


              const roomB =
                roomMap.get(
                  b.room_id
                )
                ?.room_code
                ?? "";


              return roomA.localeCompare(
                roomB
              );

            }


            return (
              a.id
              -
              b.id
            );

          }
        );

      },
      [
        contracts,
        search,
        statusFilter,
        floorFilter,
        expiryFilter,
        sortBy,
        roomMap,
        tenantMap,
      ]
    );


  function handleResetFilters() {

    setSearch("");

    setStatusFilter(
      "ALL"
    );

    setFloorFilter(
      "ALL"
    );

    setExpiryFilter(
      "ALL"
    );

    setSortBy(
      "ID_ASC"
    );

  }


  // =========================================================
  // SUMMARY
  // =========================================================

  const activeCount =
    contracts.filter(
      (
        contract
      ) =>
        contract.status
        === "ACTIVE"
    ).length;


  const endedCount =
    contracts.length
    -
    activeCount;


  const expiring30Count =
    contracts.filter(
      (
        contract
      ) => {

        const days =
          getDaysUntil(
            contract.end_date
          );


        return (
          contract.status
          === "ACTIVE"
          &&
          days !== null
          &&
          days >= 0
          &&
          days <= 30
        );

      }
    ).length;


  const expiring7Count =
    contracts.filter(
      (
        contract
      ) => {

        const days =
          getDaysUntil(
            contract.end_date
          );


        return (
          contract.status
          === "ACTIVE"
          &&
          days !== null
          &&
          days >= 0
          &&
          days <= 7
        );

      }
    ).length;


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
          pb-4
          md:hidden
        "
      >

        {/* MOBILE HEADER */}

        <section
          className="
            rounded-2xl
            border
            border-[#e9e2d8]
            bg-white
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
                  text-xs
                  font-semibold
                  uppercase
                  tracking-[0.16em]
                  text-[#d6a64c]
                "
              >
                Rosehome
              </div>


              <h1
                className="
                  mt-1
                  text-2xl
                  font-bold
                  tracking-tight
                  text-[#172033]
                "
              >
                Hợp đồng
              </h1>


              <p
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                {contracts.length} hợp đồng đang quản lý
              </p>

            </div>


            <div
              className="
                flex
                items-center
                gap-2
              "
            >

              <button
                type="button"
                disabled={
                  loading
                }
                onClick={
                  loadData
                }
                aria-label="Tải lại"
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-[#ddd8ce]
                  bg-white
                  text-[#172033]
                  disabled:opacity-50
                "
              >

                <RefreshCw
                  size={18}
                  className={
                    loading
                      ? "animate-spin"
                      : ""
                  }
                />

              </button>


              <button
                type="button"
                onClick={
                  () =>
                    setShowAddModal(
                      true
                    )
                }
                className="
                  flex
                  h-11
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-[#d6a64c]
                  px-3.5
                  text-sm
                  font-semibold
                  text-[#172033]
                  active:bg-[#c99a43]
                "
              >

                <Plus
                  size={17}
                />

                Tạo mới

              </button>

            </div>

          </div>

        </section>


        {/* MOBILE SUMMARY */}

        <section
          className="
            overflow-hidden
            rounded-2xl
            bg-[#122033]
            p-4
            text-white
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

              <div
                className="
                  text-xs
                  text-slate-400
                "
              >
                Hợp đồng đang hoạt động
              </div>


              <div
                className="
                  mt-1
                  text-3xl
                  font-bold
                  tracking-tight
                "
              >
                {activeCount}
              </div>

            </div>


            <div
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-xl
                bg-white/10
                text-[#d6a64c]
              "
            >

              <FileText
                size={21}
              />

            </div>

          </div>


          <div
            className="
              mt-4
              grid
              grid-cols-3
              divide-x
              divide-white/10
              border-t
              border-white/10
              pt-4
            "
          >

            <button
              type="button"
              onClick={
                () =>
                  setStatusFilter(
                    "ALL"
                  )
              }
              className="
                text-left
              "
            >
              <div
                className="
                  text-lg
                  font-semibold
                "
              >
                {contracts.length}
              </div>

              <div
                className="
                  mt-0.5
                  text-[11px]
                  text-slate-400
                "
              >
                Tổng
              </div>
            </button>


            <button
              type="button"
              onClick={
                () => {

                  setStatusFilter(
                    "ACTIVE"
                  );

                  setExpiryFilter(
                    "30_DAYS"
                  );

                }
              }
              className="
                px-3
                text-left
              "
            >
              <div
                className={
                  expiring30Count > 0
                    ? "text-lg font-semibold text-amber-300"
                    : "text-lg font-semibold"
                }
              >
                {expiring30Count}
              </div>

              <div
                className="
                  mt-0.5
                  text-[11px]
                  text-slate-400
                "
              >
                ≤ 30 ngày
              </div>
            </button>


            <button
              type="button"
              onClick={
                () => {

                  setStatusFilter(
                    "ACTIVE"
                  );

                  setExpiryFilter(
                    "7_DAYS"
                  );

                }
              }
              className="
                pl-3
                text-left
              "
            >
              <div
                className={
                  expiring7Count > 0
                    ? "text-lg font-semibold text-red-300"
                    : "text-lg font-semibold"
                }
              >
                {expiring7Count}
              </div>

              <div
                className="
                  mt-0.5
                  text-[11px]
                  text-slate-400
                "
              >
                ≤ 7 ngày
              </div>
            </button>

          </div>

        </section>


        {/* MOBILE SEARCH */}

        <div
          className="
            relative
          "
        >

          <Search
            size={18}
            className="
              absolute
              left-3.5
              top-1/2
              -translate-y-1/2
              text-slate-400
            "
          />


          <Input
            type="text"
            value={
              search
            }
            onChange={
              (
                event
              ) =>
                setSearch(
                  event.target.value
                )
            }
            placeholder="Tìm HĐ, phòng, khách thuê..."
            className="
              h-12
              rounded-2xl
              border-[#ddd9cf]
              bg-white
              pl-10
              text-base
            "
          />

        </div>


        {/* MOBILE STATUS CHIPS */}

        <div
          className="
            flex
            gap-2
            overflow-x-auto
            pb-1
          "
        >

          <MobileContractFilterChip
            active={
              statusFilter
              === "ALL"
            }
            onClick={
              () =>
                setStatusFilter(
                  "ALL"
                )
            }
          >
            Tất cả
          </MobileContractFilterChip>


          <MobileContractFilterChip
            active={
              statusFilter
              === "ACTIVE"
            }
            onClick={
              () =>
                setStatusFilter(
                  "ACTIVE"
                )
            }
          >
            Đang hoạt động
          </MobileContractFilterChip>


          <MobileContractFilterChip
            active={
              statusFilter
              === "ENDED"
            }
            onClick={
              () =>
                setStatusFilter(
                  "ENDED"
                )
            }
          >
            Đã kết thúc
          </MobileContractFilterChip>

        </div>


        {/* MOBILE FILTERS */}

        <div
          className="
            grid
            grid-cols-2
            gap-2
          "
        >

          <select
            value={
              floorFilter
            }
            onChange={
              (
                event
              ) =>
                setFloorFilter(
                  event.target.value
                )
            }
            className="
              h-11
              min-w-0
              rounded-xl
              border
              border-[#ddd9cf]
              bg-white
              px-3
              text-sm
              text-[#172033]
              outline-none
            "
          >

            <option value="ALL">
              Tất cả tầng
            </option>


            {floorOptions.map(
              (
                floor
              ) => (

                <option
                  key={
                    floor
                  }
                  value={
                    String(
                      floor
                    )
                  }
                >
                  {floor === 0
                    ? "Tầng trệt"
                    : `Tầng ${floor}`}
                </option>

              )
            )}

          </select>


          <select
            value={
              expiryFilter
            }
            onChange={
              (
                event
              ) =>
                setExpiryFilter(
                  event.target.value
                )
            }
            className="
              h-11
              min-w-0
              rounded-xl
              border
              border-[#ddd9cf]
              bg-white
              px-3
              text-sm
              text-[#172033]
              outline-none
            "
          >

            <option value="ALL">
              Tất cả thời hạn
            </option>

            <option value="30_DAYS">
              Hết hạn ≤ 30 ngày
            </option>

            <option value="7_DAYS">
              Hết hạn ≤ 7 ngày
            </option>

            <option value="OVERDUE">
              Đã quá hạn
            </option>

            <option value="NO_END_DATE">
              Không ngày kết thúc
            </option>

          </select>


          <select
            value={
              sortBy
            }
            onChange={
              (
                event
              ) =>
                setSortBy(
                  event.target.value
                )
            }
            className="
              col-span-2
              h-11
              min-w-0
              rounded-xl
              border
              border-[#ddd9cf]
              bg-white
              px-3
              text-sm
              text-[#172033]
              outline-none
            "
          >

            <option value="ID_ASC">
              Theo mã HĐ
            </option>

            <option value="END_ASC">
              Hết hạn gần nhất
            </option>

            <option value="ROOM_ASC">
              Theo phòng
            </option>

          </select>

        </div>


        {(search
          ||
          statusFilter !== "ALL"
          ||
          floorFilter !== "ALL"
          ||
          expiryFilter !== "ALL"
          ||
          sortBy !== "ID_ASC") && (

          <button
            type="button"
            onClick={
              handleResetFilters
            }
            className="
              inline-flex
              h-10
              items-center
              justify-center
              self-start
              rounded-xl
              border
              border-[#ddd8ce]
              bg-white
              px-3
              text-xs
              font-semibold
              text-slate-600
            "
          >
            Đặt lại bộ lọc
          </button>

        )}


        {/* MOBILE MESSAGES */}

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
              px-3
              py-3
              text-sm
              text-red-700
            "
          >

            <AlertTriangle
              size={17}
              className="mt-0.5 shrink-0"
            />

            {error}

          </div>

        )}


        {/* MOBILE LIST */}

        <div
          className="
            flex
            items-center
            justify-between
            gap-3
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
              Danh sách hợp đồng
            </div>


            <div
              className="
                mt-0.5
                text-xs
                text-slate-500
              "
            >
              {filteredContracts.length} kết quả
            </div>

          </div>

        </div>


        {loading ? (

          <div
            className="
              flex
              min-h-40
              items-center
              justify-center
              gap-2
              rounded-2xl
              border
              border-[#e9e2d8]
              bg-white
              text-sm
              text-slate-500
            "
          >

            <RefreshCw
              size={17}
              className="animate-spin"
            />

            Đang tải hợp đồng...

          </div>

        ) : filteredContracts.length === 0 ? (

          <div
            className="
              flex
              min-h-48
              flex-col
              items-center
              justify-center
              rounded-2xl
              border
              border-[#e9e2d8]
              bg-white
              px-5
              text-center
            "
          >

            <div
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-xl
                bg-[#f5eddc]
                text-[#9a762f]
              "
            >
              <Search
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
              Không tìm thấy hợp đồng
            </strong>


            <p
              className="
                mt-1
                text-xs
                text-slate-500
              "
            >
              Hãy thử thay đổi từ khóa hoặc bộ lọc.
            </p>

          </div>

        ) : (

          <div
            className="
              space-y-3
            "
          >

            {filteredContracts.map(
              (
                contract
              ) => {

                const room =
                  roomMap.get(
                    contract.room_id
                  );


                const tenant =
                  tenantMap.get(
                    contract.tenant_id
                  );


                return (

                  <MobileContractCard
                    key={
                      contract.id
                    }
                    contract={
                      contract
                    }
                    room={
                      room
                    }
                    tenant={
                      tenant
                    }
                    onEdit={
                      () =>
                        setEditingContractId(
                          contract.id
                        )
                    }
                    onDelete={
                      () =>
                        handleDeleteContract(
                          contract
                        )
                    }
                  />

                );

              }
            )}

          </div>

        )}

      </div>


      {/* =====================================================
          DESKTOP - GIỮ NGUYÊN
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

              <FileText
                size={16}
              />

              Rosehome Contracts

            </div>


            <h1
              className="
                text-2xl
                font-semibold
                tracking-tight
                md:text-3xl
              "
            >
              Hợp đồng
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
              Quản lý hợp đồng thuê,
              thời hạn, khách thuê
              và phòng đang sử dụng.
            </p>

          </div>


          <Button
            type="button"
            onClick={
              () =>
                setShowAddModal(
                  true
                )
            }
            className="
              border
              border-[#d6a64c]
              bg-[#d6a64c]
              text-[#172033]
              hover:bg-[#e0b85f]
            "
          >

            <Plus />

            Tạo hợp đồng

          </Button>

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
          xl:grid-cols-5
        "
      >

        <ContractSummaryCard
          title="Tổng hợp đồng"
          value={
            String(
              contracts.length
            )
          }
          subtitle=
            "Toàn bộ hợp đồng"
          icon={
            FileText
          }
        />


        <ContractSummaryCard
          title="Đang hoạt động"
          value={
            String(
              activeCount
            )
          }
          subtitle=
            "Hợp đồng đang thuê"
          icon={
            CheckCircle2
          }
          accent="rose"
        />


        <ContractSummaryCard
          title="Đã kết thúc"
          value={
            String(
              endedCount
            )
          }
          subtitle=
            "Hợp đồng lưu lịch sử"
          icon={
            History
          }
        />


        <ContractSummaryCard
          title="Hết hạn ≤ 30 ngày"
          value={
            String(
              expiring30Count
            )
          }
          subtitle=
            "Cần theo dõi"
          icon={
            CalendarClock
          }
          accent="gold"
          warning={
            expiring30Count > 0
          }
        />


        <ContractSummaryCard
          title="Hết hạn ≤ 7 ngày"
          value={
            String(
              expiring7Count
            )
          }
          subtitle=
            "Cần xử lý sớm"
          icon={
            AlertTriangle
          }
          danger={
            expiring7Count > 0
          }
        />

      </div>


      {/* =====================================================
          FILTER
      ===================================================== */}

      <Card
        className="
          rounded-2xl
          border-[#e9e2d8]
          shadow-sm
        "
      >

        <CardContent
          className="
            p-5
            md:p-6
          "
        >

          <div
            className="
              grid
              grid-cols-1
              gap-3
              xl:grid-cols-[minmax(260px,1fr)_170px_150px_190px_180px_auto_auto]
            "
          >

            <div
              className="
                relative
              "
            >

              <Search
                size={18}
                className="
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
                  search
                }
                onChange={
                  (
                    event
                  ) =>
                    setSearch(
                      event.target.value
                    )
                }
                placeholder=
                  "Tìm mã HĐ, phòng hoặc khách thuê..."
                className="
                  h-11
                  rounded-xl
                  border-[#ddd9cf]
                  bg-white
                  pl-10
                "
              />

            </div>


            <div
              className="relative"
            >

              <Filter
                size={16}
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
                  statusFilter
                }
                onChange={
                  (
                    event
                  ) =>
                    setStatusFilter(
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
                  pl-9
                  pr-3
                  text-sm
                  outline-none
                  focus:border-[#d6a64c]
                "
              >

                <option value="ALL">
                  Tất cả trạng thái
                </option>

                <option value="ACTIVE">
                  Đang hoạt động
                </option>

                <option value="ENDED">
                  Đã kết thúc
                </option>

              </select>

            </div>


            <select
              value={
                floorFilter
              }
              onChange={
                (
                  event
                ) =>
                  setFloorFilter(
                    event.target.value
                  )
              }
              className="
                h-11
                rounded-xl
                border
                border-[#ddd9cf]
                bg-white
                px-3
                text-sm
                outline-none
                focus:border-[#d6a64c]
              "
            >

              <option value="ALL">
                Tất cả tầng
              </option>


              {floorOptions.map(
                (
                  floor
                ) => (

                  <option
                    key={
                      floor
                    }
                    value={
                      String(
                        floor
                      )
                    }
                  >
                    {floor === 0
                      ? "Tầng trệt"
                      : `Tầng ${floor}`}
                  </option>

                )
              )}

            </select>


            <select
              value={
                expiryFilter
              }
              onChange={
                (
                  event
                ) =>
                  setExpiryFilter(
                    event.target.value
                  )
              }
              className="
                h-11
                rounded-xl
                border
                border-[#ddd9cf]
                bg-white
                px-3
                text-sm
                outline-none
                focus:border-[#d6a64c]
              "
            >

              <option value="ALL">
                Tất cả thời hạn
              </option>

              <option value="30_DAYS">
                Sắp hết trong 30 ngày
              </option>

              <option value="7_DAYS">
                Sắp hết trong 7 ngày
              </option>

              <option value="OVERDUE">
                Đã quá hạn
              </option>

              <option value="NO_END_DATE">
                Không có ngày kết thúc
              </option>

            </select>


            <select
              value={
                sortBy
              }
              onChange={
                (
                  event
                ) =>
                  setSortBy(
                    event.target.value
                  )
              }
              className="
                h-11
                rounded-xl
                border
                border-[#ddd9cf]
                bg-white
                px-3
                text-sm
                outline-none
                focus:border-[#d6a64c]
              "
            >

              <option value="ID_ASC">
                Mã hợp đồng
              </option>

              <option value="END_ASC">
                Hết hạn gần nhất
              </option>

              <option value="ROOM_ASC">
                Theo phòng
              </option>

            </select>


            <Button
              type="button"
              variant="outline"
              disabled={
                loading
              }
              onClick={
                loadData
              }
              className="
                h-11
                rounded-xl
                border-[#ddd9cf]
              "
            >

              <RefreshCw
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

              Tải lại

            </Button>


            <Button
              type="button"
              variant="outline"
              onClick={
                handleResetFilters
              }
              className="
                h-11
                rounded-xl
                border-[#ddd9cf]
              "
            >
              Đặt lại
            </Button>

          </div>


          <div
            className="
              mt-4
              flex
              items-center
              justify-between
              border-t
              border-[#eeeae2]
              pt-4
              text-sm
              text-slate-500
            "
          >

            <span>
              Kết quả tìm kiếm
            </span>


            <strong
              className=
                "text-[#172033]"
            >
              {filteredContracts.length}
              {" / "}
              {contracts.length}
            </strong>

          </div>

        </CardContent>

      </Card>


      {/* =====================================================
          CONTENT
      ===================================================== */}

      {loading ? (

        <Card
          className="
            rounded-2xl
            border-[#e9e2d8]
          "
        >

          <CardContent
            className="
              flex
              min-h-52
              items-center
              justify-center
              gap-3
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

          </CardContent>

        </Card>

      ) : error ? (

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
            {error}
          </CardContent>

        </Card>

      ) : filteredContracts.length === 0 ? (

        <Card
          className="
            rounded-2xl
            border-[#e9e2d8]
          "
        >

          <CardContent
            className="
              flex
              min-h-52
              flex-col
              items-center
              justify-center
              gap-3
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
              <Search
                size={21}
              />
            </div>


            <strong
              className=
                "text-[#172033]"
            >
              Không tìm thấy hợp đồng
            </strong>


            <p
              className="
                text-sm
                text-slate-500
              "
            >
              Hãy thử thay đổi từ khóa
              hoặc bộ lọc.
            </p>


            <Button
              type="button"
              variant="outline"
              onClick={
                handleResetFilters
              }
            >
              Đặt lại bộ lọc
            </Button>

          </CardContent>

        </Card>

      ) : (

        <div
          className="
            grid
            grid-cols-1
            gap-4
            lg:grid-cols-2
            2xl:grid-cols-3
          "
        >

          {filteredContracts.map(
            (
              contract
            ) => {

              const room =
                roomMap.get(
                  contract.room_id
                );


              const tenant =
                tenantMap.get(
                  contract.tenant_id
                );


              return (

                <ContractCard
                  key={
                    contract.id
                  }
                  contract={
                    contract
                  }
                  room={
                    room
                  }
                  tenant={
                    tenant
                  }
                  onEdit={
                    () =>
                      setEditingContractId(
                        contract.id
                      )
                  }
                  onDelete={
                    () =>
                      handleDeleteContract(
                        contract
                      )
                  }
                />

              );

            }
          )}

        </div>

      )}



        </div>

      </div>


      {/* =====================================================
          MODALS - DÙNG CHUNG MOBILE + DESKTOP
      ===================================================== */}

      <AddContractModal
        open={
          showAddModal
        }
        rooms={
          rooms
        }
        tenants={
          tenants
        }
        contracts={
          contracts
        }
        initialRoomId={
          null
        }
        onClose={
          () =>
            setShowAddModal(
              false
            )
        }
        onCreated={
          handleContractCreated
        }
      />


      <EditContractModal
        open={
          editingContractId
          !== null
        }
        contractId={
          editingContractId
        }
        rooms={
          rooms
        }
        tenants={
          tenants
        }
        onClose={
          () =>
            setEditingContractId(
              null
            )
        }
        onUpdated={
          handleContractUpdated
        }
      />

    </>

  );

}


// =========================================================
// MOBILE CONTRACT CARD
// =========================================================

function MobileContractCard({
  contract,
  room,
  tenant,
  onEdit,
  onDelete,
}: {
  contract: Contract;
  room?: Room;
  tenant?: Tenant;
  onEdit: () => void;
  onDelete: () => void;
}) {

  const isActive =
    contract.status
    === "ACTIVE";


  const expiryTone =
    getExpiryTone(
      contract.end_date
    );


  return (

    <article
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
          isActive
            ? "h-1 bg-[#e44763]"
            : "h-1 bg-slate-400"
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

          <div
            className="
              flex
              min-w-0
              items-center
              gap-3
            "
          >

            <div
              className={
                isActive

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

                  : `
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-slate-100
                    text-slate-500
                  `
              }
            >

              <FileText
                size={20}
              />

            </div>


            <div
              className="
                min-w-0
              "
            >

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


              <h2
                className="
                  mt-1
                  truncate
                  text-lg
                  font-bold
                  text-[#172033]
                "
              >
                {room?.room_code
                  ?? `Phòng #${contract.room_id}`}
              </h2>

            </div>

          </div>


          <span
            className={
              isActive

                ? `
                  shrink-0
                  rounded-full
                  bg-[#fcecef]
                  px-2.5
                  py-1
                  text-[11px]
                  font-semibold
                  text-[#b92f49]
                `

                : `
                  shrink-0
                  rounded-full
                  bg-slate-100
                  px-2.5
                  py-1
                  text-[11px]
                  font-semibold
                  text-slate-600
                `
            }
          >
            {isActive
              ? "Đang thuê"
              : "Đã kết thúc"}
          </span>

        </div>


        <div
          className="
            mt-4
            flex
            items-center
            gap-2
            text-sm
            text-slate-600
          "
        >

          <UserRound
            size={16}
            className="shrink-0 text-slate-400"
          />

          <span
            className="
              truncate
              font-medium
              text-[#172033]
            "
          >
            {tenant?.full_name
              ?? `Khách #${contract.tenant_id}`}
          </span>

        </div>


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
              rounded-xl
              bg-[#fcfbf8]
              px-3
              py-3
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

            <div
              className="
                mt-1
                text-sm
                font-semibold
                text-[#172033]
              "
            >
              {formatDate(
                contract.start_date
              )}
            </div>
          </div>


          <div
            className="
              rounded-xl
              bg-[#fcfbf8]
              px-3
              py-3
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

            <div
              className="
                mt-1
                text-sm
                font-semibold
                text-[#172033]
              "
            >
              {formatDate(
                contract.end_date
              )}
            </div>
          </div>

        </div>


        {isActive && (

          <div
            className="
              mt-3
              flex
              items-center
              justify-between
              gap-3
            "
          >

            <span
              className="
                text-xs
                text-slate-500
              "
            >
              Thời hạn
            </span>


            <span
              className={
                expiryTone === "danger"

                  ? `
                    rounded-full
                    bg-red-50
                    px-2.5
                    py-1
                    text-[11px]
                    font-semibold
                    text-red-700
                  `

                  : expiryTone === "warning"

                    ? `
                      rounded-full
                      bg-amber-50
                      px-2.5
                      py-1
                      text-[11px]
                      font-semibold
                      text-amber-700
                    `

                    : expiryTone === "success"

                      ? `
                        rounded-full
                        bg-emerald-50
                        px-2.5
                        py-1
                        text-[11px]
                        font-semibold
                        text-emerald-700
                      `

                      : `
                        rounded-full
                        bg-slate-50
                        px-2.5
                        py-1
                        text-[11px]
                        font-semibold
                        text-slate-600
                      `
              }
            >
              {getExpiryText(
                contract.end_date
              )}
            </span>

          </div>

        )}


        <div
          className="
            mt-4
            rounded-2xl
            bg-[#fffaf0]
            px-4
            py-3
          "
        >

          <div
            className="
              flex
              items-center
              justify-between
              gap-3
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
                text-base
                text-[#172033]
              "
            >
              {formatMoney(
                contract.monthly_rent
              )}
            </strong>
          </div>


          <div
            className="
              mt-2
              flex
              items-center
              justify-between
              gap-3
              border-t
              border-[#ead9b7]
              pt-2
            "
          >
            <span
              className="
                text-xs
                text-[#8a6726]
              "
            >
              Cọc yêu cầu
            </span>

            <strong
              className="
                text-sm
                text-[#172033]
              "
            >
              {formatMoney(
                contract.deposit_required
              )}
            </strong>
          </div>

        </div>


        <div
          className="
            mt-4
            grid
            grid-cols-[1fr_auto]
            gap-2
          "
        >

          <Link
            to={
              `/contracts/${contract.id}`
            }
            className="
              inline-flex
              h-11
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-[#122033]
              px-4
              text-sm
              font-semibold
              text-white
              active:bg-[#20334d]
            "
          >

            Chi tiết

            <ArrowUpRight
              size={16}
            />

          </Link>


          <button
            type="button"
            onClick={
              onEdit
            }
            aria-label="Sửa hợp đồng"
            className="
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-xl
              border
              border-[#ddd8ce]
              bg-white
              text-[#172033]
              active:bg-slate-50
            "
          >

            <Pencil
              size={17}
            />

          </button>

        </div>


        <div
          className="
            mt-2
            grid
            grid-cols-2
            gap-2
          "
        >

          <Link
            to={
              `/rooms/${contract.room_id}`
            }
            className="
              inline-flex
              min-h-10
              items-center
              justify-center
              gap-1.5
              rounded-xl
              border
              border-[#ddd8ce]
              bg-white
              px-3
              text-xs
              font-semibold
              text-[#172033]
            "
          >
            <Building2
              size={14}
            />
            Phòng
          </Link>


          <Link
            to={
              `/tenants/${contract.tenant_id}`
            }
            className="
              inline-flex
              min-h-10
              items-center
              justify-center
              gap-1.5
              rounded-xl
              border
              border-[#efced4]
              bg-[#fcecef]
              px-3
              text-xs
              font-semibold
              text-[#b92f49]
            "
          >
            <UserRound
              size={14}
            />
            Khách thuê
          </Link>

        </div>


        {isActive && (

          <button
            type="button"
            onClick={
              onDelete
            }
            className="
              mt-2
              inline-flex
              min-h-10
              w-full
              items-center
              justify-center
              gap-1.5
              rounded-xl
              border
              border-red-200
              bg-red-50
              px-3
              text-xs
              font-semibold
              text-red-600
            "
          >

            <Trash2
              size={14}
            />

            Xóa hợp đồng tạo nhầm

          </button>

        )}

      </div>

    </article>

  );

}


// =========================================================
// MOBILE FILTER CHIP
// =========================================================

function MobileContractFilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {

  return (

    <button
      type="button"
      onClick={
        onClick
      }
      className={
        active

          ? `
            shrink-0
            rounded-full
            bg-[#122033]
            px-3.5
            py-2
            text-xs
            font-semibold
            text-white
          `

          : `
            shrink-0
            rounded-full
            border
            border-[#ddd8ce]
            bg-white
            px-3.5
            py-2
            text-xs
            font-semibold
            text-slate-600
          `
      }
    >
      {children}
    </button>

  );

}


// =========================================================
// CONTRACT CARD
// =========================================================

function ContractCard({
  contract,
  room,
  tenant,
  onEdit,
  onDelete,
}: {
  contract: Contract;
  room?: Room;
  tenant?: Tenant;
  onEdit: () => void;
  onDelete: () => void;
}) {

  const isActive =
    contract.status
    === "ACTIVE";


  const expiryTone =
    getExpiryTone(
      contract.end_date
    );


  return (

    <Card
      className="
        group
        overflow-hidden
        rounded-2xl
        border-[#e9e2d8]
        shadow-sm
        transition
        hover:-translate-y-0.5
        hover:border-[#d8c79f]
        hover:shadow-md
      "
    >

      <div
        className={
          isActive
            ? "h-1 bg-[#e44763]"
            : "h-1 bg-[#d6a64c]"
        }
      />


      <CardContent
        className="p-0"
      >

        {/* HEADER */}

        <div
          className="
            flex
            items-start
            justify-between
            gap-4
            border-b
            border-[#f0ece5]
            px-5
            py-5
          "
        >

          <div
            className="
              flex
              min-w-0
              items-center
              gap-3
            "
          >

            <div
              className={
                isActive

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

                  : `
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
              }
            >

              <FileText
                size={20}
              />

            </div>


            <div>

              <div
                className="
                  text-[11px]
                  font-semibold
                  uppercase
                  tracking-[0.15em]
                  text-slate-400
                "
              >
                Hợp đồng
              </div>


              <h2
                className="
                  mt-1
                  text-xl
                  font-semibold
                  text-[#172033]
                "
              >
                #{contract.id}
              </h2>

            </div>

          </div>


          <Badge
            variant="outline"
            className={
              isActive

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
            {isActive
              ? "Đang hoạt động"
              : "Đã kết thúc"}
          </Badge>

        </div>


        {/* BODY */}

        <div
          className="
            space-y-1
            px-5
            py-4
          "
        >

          <ContractInfoRow
            label="Phòng"
            value={
              room?.room_code
              ??
              `#${contract.room_id}`
            }
          />


          <ContractInfoRow
            label="Khách thuê"
            value={
              tenant?.full_name
              ??
              `#${contract.tenant_id}`
            }
          />


          <ContractInfoRow
            label="Bắt đầu"
            value={
              formatDate(
                contract.start_date
              )
            }
          />


          <ContractInfoRow
            label="Kết thúc"
            value={
              formatDate(
                contract.end_date
              )
            }
          />


          {isActive && (

            <div
              className="
                flex
                items-center
                justify-between
                gap-4
                border-b
                border-[#f0ece5]
                py-2.5
              "
            >

              <span
                className="
                  text-sm
                  text-slate-500
                "
              >
                Thời hạn
              </span>


              <span
                className={
                  expiryTone
                  === "danger"

                    ? `
                      rounded-full
                      bg-red-50
                      px-2.5
                      py-1
                      text-xs
                      font-semibold
                      text-red-700
                    `

                    : expiryTone
                      === "warning"

                      ? `
                        rounded-full
                        bg-amber-50
                        px-2.5
                        py-1
                        text-xs
                        font-semibold
                        text-amber-700
                      `

                      : expiryTone
                        === "success"

                        ? `
                          rounded-full
                          bg-emerald-50
                          px-2.5
                          py-1
                          text-xs
                          font-semibold
                          text-emerald-700
                        `

                        : `
                          rounded-full
                          bg-slate-50
                          px-2.5
                          py-1
                          text-xs
                          font-semibold
                          text-slate-600
                        `
                }
              >
                {getExpiryText(
                  contract.end_date
                )}
              </span>

            </div>

          )}


          <ContractInfoRow
            label="Tiền thuê"
            value={
              formatMoney(
                contract.monthly_rent
              )
            }
          />


          <ContractInfoRow
            label="Cọc yêu cầu"
            value={
              formatMoney(
                contract.deposit_required
              )
            }
          />


          <ContractInfoRow
            label="Số người ở"
            value={
              String(
                contract.occupant_count
              )
            }
          />

        </div>


        {/* ACTIONS */}

        <div
          className="
            grid
            grid-cols-2
            gap-2
            border-t
            border-[#eeeae2]
            bg-[#fcfbf8]
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

            <ArrowUpRight
              size={14}
            />

            Chi tiết

          </Link>


          <button
            type="button"
            onClick={
              onEdit
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

            <Pencil
              size={14}
            />

            Sửa

          </button>


          <Link
            to={
              `/rooms/${contract.room_id}`
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

            Phòng

          </Link>


          <Link
            to={
              `/tenants/${contract.tenant_id}`
            }
            className="
              inline-flex
              h-9
              items-center
              justify-center
              gap-1.5
              rounded-lg
              border
              border-[#efced4]
              bg-[#fcecef]
              px-3
              text-xs
              font-semibold
              text-[#b92f49]
              transition
              hover:border-[#e44763]
            "
          >

            <UserRound
              size={14}
            />

            Khách

          </Link>


          {isActive && (

            <button
              type="button"
              onClick={
                onDelete
              }
              className="
                col-span-2
                inline-flex
                h-9
                items-center
                justify-center
                gap-1.5
                rounded-lg
                border
                border-red-200
                bg-white
                px-3
                text-xs
                font-semibold
                text-red-600
                transition
                hover:bg-red-50
              "
            >

              <Trash2
                size={14}
              />

              Xóa hợp đồng tạo nhầm

            </button>

          )}

        </div>

      </CardContent>

    </Card>

  );

}


// =========================================================
// SUMMARY CARD
// =========================================================

function ContractSummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
  warning = false,
  danger = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  accent?:
    | "rose"
    | "gold";
  warning?: boolean;
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
                  text-2xl
                  font-semibold
                  text-red-600
                `

                : warning

                  ? `
                    mt-2
                    text-2xl
                    font-semibold
                    text-amber-600
                  `

                  : `
                    mt-2
                    text-2xl
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

              : warning

                ? `
                  flex
                  h-11
                  w-11
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-amber-50
                  text-amber-600
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
// INFO ROW
// =========================================================

function ContractInfoRow({
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
          max-w-[60%]
          truncate
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


export default Contracts;