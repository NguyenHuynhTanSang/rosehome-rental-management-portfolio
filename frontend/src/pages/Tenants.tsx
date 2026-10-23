import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router";

import {
  ArrowUpRight,
  Building2,
  FileText,
  Filter,
  LayoutGrid,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  apiDelete,
  apiGet,
} from "../api/api";

import AddTenantModal
  from "../components/AddTenantModal";

import AddContractModal
  from "../components/AddContractModal";

import EditTenantModal
  from "../components/EditTenantModal";

import MobileTenantCard
  from "../components/mobile/MobileTenantCard";

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



const TENANT_DELETE_RETENTION_DAYS =
  30;

const DAY_IN_MS =
  24
  *
  60
  *
  60
  *
  1000;


type TenantDeleteState = {
  canDelete: boolean;
  mode:
    | "ACTIVE"
    | "WAITING"
    | "READY"
    | "NO_HISTORY"
    | "UNKNOWN";
  daysRemaining: number;
  eligibleDate: string | null;
  message: string;
};


function dateOnlyToUtcMs(
  value: string
) {

  const parts =
    value
      .split("-")
      .map(
        Number
      );


  if (
    parts.length !== 3
    ||
    parts.some(
      (
        part
      ) =>
        Number.isNaN(
          part
        )
    )
  ) {
    return null;
  }


  const [
    year,
    month,
    day,
  ] = parts;


  return Date.UTC(
    year,
    month - 1,
    day
  );

}


function getLocalTodayUtcMs() {

  const now =
    new Date();


  return Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

}


function utcMsToDateOnly(
  value: number
) {

  const date =
    new Date(
      value
    );


  const year =
    date.getUTCFullYear();

  const month =
    String(
      date.getUTCMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getUTCDate()
    ).padStart(
      2,
      "0"
    );


  return `${year}-${month}-${day}`;

}


function formatDateOnly(
  value: string
) {

  const timestamp =
    dateOnlyToUtcMs(
      value
    );


  if (
    timestamp === null
  ) {
    return value;
  }


  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      timeZone: "UTC",
    }
  ).format(
    new Date(
      timestamp
    )
  );

}


function getTenantDeleteState(
  tenantId: number,
  contracts: Contract[]
): TenantDeleteState {

  const tenantContracts =
    contracts.filter(
      (
        contract
      ) =>
        contract.tenant_id
        === tenantId
    );


  const activeContract =
    tenantContracts.find(
      (
        contract
      ) =>
        contract.status
        === "ACTIVE"
    );


  if (
    activeContract
  ) {

    return {
      canDelete: false,
      mode: "ACTIVE",
      daysRemaining: 0,
      eligibleDate: null,
      message:
        `Khách đang có hợp đồng ACTIVE #${activeContract.id}. Hãy kết thúc hợp đồng trước khi xóa.`,
    };

  }


  if (
    tenantContracts.length === 0
  ) {

    return {
      canDelete: true,
      mode: "NO_HISTORY",
      daysRemaining: 0,
      eligibleDate: null,
      message:
        "Khách chưa có lịch sử hợp đồng và có thể xóa.",
    };

  }


  const endedTimestamps =
    tenantContracts.map(
      (
        contract
      ) => {

        if (
          contract.status !== "ENDED"
          ||
          !contract.end_date
        ) {
          return null;
        }


        return dateOnlyToUtcMs(
          contract.end_date
        );

      }
    );


  if (
    endedTimestamps.some(
      (
        timestamp
      ) =>
        timestamp === null
    )
  ) {

    return {
      canDelete: false,
      mode: "UNKNOWN",
      daysRemaining: 0,
      eligibleDate: null,
      message:
        "Chưa xác định được ngày được phép xóa vì có lịch sử hợp đồng chưa có ngày kết thúc hợp lệ.",
    };

  }


  const latestEndTimestamp =
    Math.max(
      ...endedTimestamps
        .filter(
          (
            timestamp
          ): timestamp is number =>
            timestamp !== null
        )
    );


  const eligibleTimestamp =
    latestEndTimestamp
    +
    (
      TENANT_DELETE_RETENTION_DAYS
      *
      DAY_IN_MS
    );


  const todayTimestamp =
    getLocalTodayUtcMs();


  const eligibleDate =
    utcMsToDateOnly(
      eligibleTimestamp
    );


  if (
    todayTimestamp
    <
    eligibleTimestamp
  ) {

    const daysRemaining =
      Math.ceil(
        (
          eligibleTimestamp
          -
          todayTimestamp
        )
        /
        DAY_IN_MS
      );


    return {
      canDelete: false,
      mode: "WAITING",
      daysRemaining,
      eligibleDate,
      message:
        (
          `Dữ liệu khách được giữ ${TENANT_DELETE_RETENTION_DAYS} ngày sau lần trả phòng gần nhất. `
          +
          `Có thể xóa từ ${formatDateOnly(eligibleDate)} `
          +
          `(còn ${daysRemaining} ngày).`
        ),
    };

  }


  return {
    canDelete: true,
    mode: "READY",
    daysRemaining: 0,
    eligibleDate,
    message:
      `Đã đủ ${TENANT_DELETE_RETENTION_DAYS} ngày. Có thể xóa dữ liệu khách.`,
  };

}


// =========================================================
// TENANTS
// =========================================================

function Tenants() {

  const [
    tenants,
    setTenants,
  ] = useState<Tenant[]>([]);


  const [
    contracts,
    setContracts,
  ] = useState<Contract[]>([]);


  const [
    rooms,
    setRooms,
  ] = useState<Room[]>([]);


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
    sortBy,
    setSortBy,
  ] = useState("NAME_ASC");


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
    editingTenantId,
    setEditingTenantId,
  ] = useState<number | null>(
    null
  );


  const [
    createdTenant,
    setCreatedTenant,
  ] = useState<Tenant | null>(
    null
  );


  const [
    contractTenantId,
    setContractTenantId,
  ] = useState<number | null>(
    null
  );


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
        tenantData,
        contractData,
        roomData,
      ] =
        await Promise.all([

          apiGet<Tenant[]>(
            "/tenants"
          ),

          apiGet<Contract[]>(
            "/contracts"
          ),

          apiGet<Room[]>(
            "/rooms"
          ),

        ]);


      setTenants(
        tenantData
      );

      setContracts(
        contractData
      );

      setRooms(
        roomData
      );


    } catch (err) {

      console.error(
        err
      );

      setError(
        "Không thể tải danh sách khách thuê."
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
  // CREATED
  // =========================================================

  function handleTenantCreated(
    newTenant: Tenant
  ) {

    setTenants(
      (
        current
      ) => [
        ...current,
        newTenant,
      ]
    );


    setCreatedTenant(
      newTenant
    );

  }


  function handleRoomCreatedForContract(
    newRoom: Room
  ) {

    setRooms(
      (
        current
      ) => [
        newRoom,
        ...current,
      ]
    );

  }


  function handleContractCreated(
    newContract: Contract
  ) {

    setContracts(
      (
        current
      ) => [
        ...current,
        newContract,
      ]
    );


    setRooms(
      (
        current
      ) =>

        current.map(
          (
            room
          ) =>

            room.id
            === newContract.room_id

              ? {
                  ...room,
                  status: "OCCUPIED",
                }

              : room
        )
    );


    setContractTenantId(
      null
    );

  }


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
  // ACTIVE CONTRACT BY TENANT
  // =========================================================

  const activeContractMap =
    useMemo(
      () => {

        const map =
          new Map<
            number,
            Contract
          >();


        contracts.forEach(
          (
            contract
          ) => {

            if (
              contract.status
              === "ACTIVE"
            ) {

              map.set(
                contract.tenant_id,
                contract
              );

            }

          }
        );


        return map;

      },
      [
        contracts,
      ]
    );


  // =========================================================
  // FLOOR OPTIONS
  // =========================================================

  const floorOptions =
    useMemo(
      () => {

        const floors =
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

              floors.add(
                room.floor
              );

            }

          }
        );


        return Array.from(
          floors
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
  // FILTER
  // =========================================================

  const filteredTenants =
    useMemo(
      () => {

        const keyword =
          search
            .trim()
            .toLowerCase();


        const result =
          tenants.filter(
            (
              tenant
            ) => {

              const contract =
                activeContractMap.get(
                  tenant.id
                );


              const room =
                contract

                  ? roomMap.get(
                      contract.room_id
                    )

                  : undefined;


              const matchesSearch =
                keyword === ""
                ||
                tenant.full_name
                  .toLowerCase()
                  .includes(
                    keyword
                  )
                ||
                (
                  tenant.phone
                  ?? ""
                ).includes(
                  keyword
                )
                ||
                (
                  tenant.email
                  ?? ""
                )
                  .toLowerCase()
                  .includes(
                    keyword
                  )
                ||
                (
                  tenant.citizen_id
                  ?? ""
                ).includes(
                  keyword
                )
                ||
                (
                  room?.room_code
                  ?? ""
                )
                  .toLowerCase()
                  .includes(
                    keyword
                  )
                ||
                (
                  contract
                    ? String(
                        contract.id
                      )
                    : ""
                ).includes(
                  keyword
                );


              const matchesStatus =
                statusFilter
                === "ALL"
                ||
                (
                  statusFilter
                  === "RENTING"

                    ? Boolean(
                        contract
                      )

                    : !contract
                );


              const matchesFloor =
                floorFilter
                === "ALL"
                ||
                (
                  room
                  &&
                  room.floor
                  !== null
                  &&
                  String(
                    room.floor
                  )
                  === floorFilter
                );


              return (
                matchesSearch
                &&
                matchesStatus
                &&
                matchesFloor
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
              === "NAME_DESC"
            ) {

              return b.full_name
                .localeCompare(
                  a.full_name,
                  "vi"
                );

            }


            if (
              sortBy
              === "ROOM_ASC"
            ) {

              const contractA =
                activeContractMap.get(
                  a.id
                );


              const contractB =
                activeContractMap.get(
                  b.id
                );


              const roomA =
                contractA

                  ? roomMap.get(
                      contractA.room_id
                    )

                  : undefined;


              const roomB =
                contractB

                  ? roomMap.get(
                      contractB.room_id
                    )

                  : undefined;


              const roomCodeA =
                roomA?.room_code
                ?? "ZZZZZZ";


              const roomCodeB =
                roomB?.room_code
                ?? "ZZZZZZ";


              return roomCodeA
                .localeCompare(
                  roomCodeB
                );

            }


            return a.full_name
              .localeCompare(
                b.full_name,
                "vi"
              );

          }
        );

      },
      [
        tenants,
        search,
        statusFilter,
        floorFilter,
        sortBy,
        activeContractMap,
        roomMap,
      ]
    );


  // =========================================================
  // RESET FILTER
  // =========================================================

  function handleResetFilters() {

    setSearch("");

    setStatusFilter(
      "ALL"
    );

    setFloorFilter(
      "ALL"
    );

    setSortBy(
      "NAME_ASC"
    );

  }


  // =========================================================
  // SUMMARY
  // =========================================================

  const rentingTenantCount =
    useMemo(
      () =>

        tenants.filter(
          (
            tenant
          ) =>
            activeContractMap.has(
              tenant.id
            )
        ).length,

      [
        tenants,
        activeContractMap,
      ]
    );


  const inactiveTenantCount =
    tenants.length
    -
    rentingTenantCount;


  // =========================================================
  // UPDATE
  // =========================================================

  function handleTenantUpdated(
    updatedTenant: Tenant
  ) {

    setTenants(
      (
        current
      ) =>

        current.map(
          (
            tenant
          ) =>
            tenant.id
            === updatedTenant.id

              ? updatedTenant

              : tenant
        )
    );

  }


  // =========================================================
  // DELETE
  // =========================================================

  async function handleDeleteTenant(
    tenant: Tenant
  ) {

    const deleteState =
      getTenantDeleteState(
        tenant.id,
        contracts
      );


    if (
      !deleteState.canDelete
    ) {

      window.alert(
        deleteState.message
      );

      return;

    }


    const hasOldHistory =
      deleteState.mode
      === "READY";


    const confirmed =
      window.confirm(
        hasOldHistory

          ? (
              `Xóa vĩnh viễn dữ liệu khách "${tenant.full_name}"?\n\n`
              +
              "Khách đã đủ thời gian lưu 30 ngày. "
              +
              "Hệ thống sẽ xóa hồ sơ khách, hợp đồng cũ, "
              +
              "giao dịch cọc, thông báo và lịch sử người ở cùng liên quan.\n\n"
              +
              "Hóa đơn và thanh toán của phòng vẫn được giữ."
            )

          : (
              `Bạn có chắc muốn xóa khách "${tenant.full_name}"?\n\n`
              +
              "Khách chưa có lịch sử hợp đồng."
            )
      );


    if (
      !confirmed
    ) {
      return;
    }


    try {

      await apiDelete<{
        message: string;
        tenant_id: number;
        full_name: string;
      }>(
        `/tenants/${tenant.id}`
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
          "Không thể xóa khách thuê."
        );

      }

    }

  }


  return (

    <>

    {/* =====================================================
        MOBILE
    ===================================================== */}

    <div
      className="
        space-y-4
        pb-2
        md:hidden
      "
    >

      {/* ==========================
          HEADER
      ========================== */}

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
              font-medium
              uppercase
              tracking-[0.16em]
              text-[#9a762f]
            "
          >
            Rosehome
          </div>


          <h1
            className="
              mt-1
              text-xl
              font-bold
              tracking-tight
              text-[#172033]
            "
          >
            Khách thuê
          </h1>


          <div
            className="
              mt-1
              text-xs
              text-slate-500
            "
          >
            {tenants.length} hồ sơ khách
          </div>

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
            onClick={
              loadData
            }
            disabled={
              loading
            }
            aria-label="Tải lại danh sách khách thuê"
            className="
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-xl
              border
              border-[#ddd9cf]
              bg-white
              text-slate-600
              disabled:opacity-50
            "
          >

            <RefreshCw
              size={17}
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
              inline-flex
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
            "
          >

            <Plus
              size={17}
            />

            Thêm

          </button>

        </div>

      </div>


      {/* ==========================
          SUMMARY / STATUS FILTER
      ========================== */}

      <div
        className="
          grid
          grid-cols-3
          overflow-hidden
          rounded-2xl
          border
          border-[#ebe6dd]
          bg-white
        "
      >

        <MobileTenantSummaryButton
          label="Tất cả"
          value={
            tenants.length
          }
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
        />


        <MobileTenantSummaryButton
          label="Đang thuê"
          value={
            rentingTenantCount
          }
          active={
            statusFilter
            === "RENTING"
          }
          onClick={
            () =>
              setStatusFilter(
                "RENTING"
              )
          }
          tone="rose"
        />


        <MobileTenantSummaryButton
          label="Chưa thuê"
          value={
            inactiveTenantCount
          }
          active={
            statusFilter
            === "NOT_RENTING"
          }
          onClick={
            () =>
              setStatusFilter(
                "NOT_RENTING"
              )
          }
          tone="gold"
        />

      </div>


      {/* ==========================
          SEARCH
      ========================== */}

      <div
        className="
          relative
        "
      >

        <Search
          size={17}
          className="
            absolute
            left-3.5
            top-1/2
            -translate-y-1/2
            text-slate-400
          "
        />


        <input
          type="search"
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
          placeholder="Tìm tên, SĐT, CCCD, phòng..."
          className="
            h-11
            w-full
            rounded-2xl
            border
            border-[#ddd9cf]
            bg-white
            pl-10
            pr-4
            text-base
            text-[#172033]
            outline-none
            placeholder:text-slate-400
            focus:border-[#d6a64c]
            focus:ring-2
            focus:ring-[#d6a64c]/15
          "
        />

      </div>


      {/* ==========================
          FLOOR FILTER
      ========================== */}

      <div
        className="
          flex
          gap-2
          overflow-x-auto
          pb-1
        "
      >

        <MobileTenantFilterChip
          label="Tất cả tầng"
          active={
            floorFilter
            === "ALL"
          }
          onClick={
            () =>
              setFloorFilter(
                "ALL"
              )
          }
        />


        {floorOptions.map(
          (
            floor
          ) => (

            <MobileTenantFilterChip
              key={
                floor
              }
              label={
                formatFloor(
                  floor
                )
              }
              active={
                floorFilter
                === String(
                  floor
                )
              }
              onClick={
                () =>
                  setFloorFilter(
                    String(
                      floor
                    )
                  )
              }
            />

          )
        )}

      </div>


      {/* ==========================
          SORT
      ========================== */}

      <div
        className="
          flex
          items-center
          gap-2
        "
      >

        <div
          className="
            relative
            min-w-0
            flex-1
          "
        >

          <Filter
            size={15}
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
              h-10
              w-full
              rounded-xl
              border
              border-[#ddd9cf]
              bg-white
              pl-9
              pr-3
              text-sm
              text-[#172033]
              outline-none
            "
          >

            <option value="NAME_ASC">
              Tên A-Z
            </option>

            <option value="NAME_DESC">
              Tên Z-A
            </option>

            <option value="ROOM_ASC">
              Theo phòng
            </option>

          </select>

        </div>


        {(
          search
          ||
          statusFilter !== "ALL"
          ||
          floorFilter !== "ALL"
          ||
          sortBy !== "NAME_ASC"
        ) && (

          <button
            type="button"
            onClick={
              handleResetFilters
            }
            className="
              h-10
              shrink-0
              rounded-xl
              border
              border-[#ddd9cf]
              bg-white
              px-3
              text-xs
              font-semibold
              text-[#172033]
            "
          >
            Đặt lại
          </button>

        )}

      </div>


      {/* ==========================
          RESULT HEADER
      ========================== */}

      <div
        className="
          flex
          items-end
          justify-between
          gap-3
          pt-1
        "
      >

        <div>

          <h2
            className="
              text-base
              font-bold
              text-[#172033]
            "
          >
            Danh sách khách
          </h2>


          <div
            className="
              mt-0.5
              text-xs
              text-slate-500
            "
          >
            {filteredTenants.length}
            {" "}
            kết quả
          </div>

        </div>

      </div>


      {/* ==========================
          MOBILE CONTENT
      ========================== */}

      {loading ? (

        <div
          className="
            flex
            min-h-48
            items-center
            justify-center
            gap-2
            rounded-2xl
            border
            border-[#ebe6dd]
            bg-white
            text-sm
            text-slate-500
          "
        >

          <RefreshCw
            size={17}
            className=
              "animate-spin"
          />

          Đang tải khách thuê...

        </div>

      ) : error ? (

        <div
          className="
            rounded-2xl
            border
            border-red-200
            bg-red-50
            px-4
            py-4
            text-sm
            text-red-700
          "
        >
          {error}
        </div>

      ) : filteredTenants.length === 0 ? (

        <div
          className="
            rounded-2xl
            border
            border-[#ebe6dd]
            bg-white
            px-5
            py-9
            text-center
          "
        >

          <div
            className="
              mx-auto
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-2xl
              bg-[#f5eddc]
              text-[#9a762f]
            "
          >

            <Search
              size={21}
            />

          </div>


          <div
            className="
              mt-3
              text-sm
              font-semibold
              text-[#172033]
            "
          >
            Không tìm thấy khách thuê
          </div>


          <div
            className="
              mt-1
              text-xs
              leading-5
              text-slate-500
            "
          >
            Hãy thử thay đổi từ khóa hoặc bộ lọc.
          </div>


          <button
            type="button"
            onClick={
              handleResetFilters
            }
            className="
              mt-4
              min-h-10
              rounded-xl
              border
              border-[#ddd9cf]
              px-4
              text-sm
              font-semibold
              text-[#172033]
            "
          >
            Đặt lại bộ lọc
          </button>

        </div>

      ) : (

        <div
          className="
            space-y-3
          "
        >

          {filteredTenants.map(
            (
              tenant
            ) => {

              const contract =
                activeContractMap.get(
                  tenant.id
                );


              const room =
                contract

                  ? roomMap.get(
                      contract.room_id
                    )

                  : undefined;


              const deleteState =
                getTenantDeleteState(
                  tenant.id,
                  contracts
                );


              return (

                <div
                  key={
                    tenant.id
                  }
                  className="
                    space-y-2
                  "
                >

                  <MobileTenantCard
                    tenant={
                      tenant
                    }
                    contract={
                      contract
                    }
                    room={
                      room
                    }
                    onEdit={
                      () =>
                        setEditingTenantId(
                          tenant.id
                        )
                    }
                    onCreateContract={
                      () =>
                        setContractTenantId(
                          tenant.id
                        )
                    }
                    onDelete={
                      () =>
                        handleDeleteTenant(
                          tenant
                        )
                    }
                  />


                  {!contract
                    &&
                    deleteState.mode
                    === "WAITING"
                    && (

                      <div
                        className="
                          rounded-xl
                          border
                          border-amber-200
                          bg-amber-50
                          px-3.5
                          py-2.5
                          text-xs
                          leading-5
                          text-amber-800
                        "
                      >
                        Có thể xóa dữ liệu sau
                        {" "}
                        <strong>
                          {deleteState.daysRemaining} ngày
                        </strong>
                        {deleteState.eligibleDate
                          ? (
                              <>
                                {" "}
                                ({formatDateOnly(
                                  deleteState.eligibleDate
                                )})
                              </>
                            )
                          : null}
                        .
                      </div>

                    )}


                  {!contract
                    &&
                    deleteState.mode
                    === "READY"
                    && (

                      <div
                        className="
                          rounded-xl
                          border
                          border-emerald-200
                          bg-emerald-50
                          px-3.5
                          py-2.5
                          text-xs
                          font-medium
                          text-emerald-700
                        "
                      >
                        Đã đủ 30 ngày. Có thể xóa dữ liệu khách.
                      </div>

                    )}

                </div>

              );

            }
          )}

        </div>

      )}

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

              <Users
                size={16}
              />

              Rosehome Residents

            </div>


            <h1
              className="
                text-2xl
                font-semibold
                tracking-tight
                md:text-3xl
              "
            >
              Khách thuê
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
              Quản lý thông tin khách,
              phòng đang thuê và hợp đồng
              đang hoạt động.
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

            Thêm khách thuê

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
          xl:grid-cols-4
        "
      >

        <TenantSummaryCard
          title="Tổng khách thuê"
          value={
            String(
              tenants.length
            )
          }
          subtitle=
            "Toàn bộ hồ sơ khách"
          icon={
            Users
          }
        />


        <TenantSummaryCard
          title="Đang thuê phòng"
          value={
            String(
              rentingTenantCount
            )
          }
          subtitle=
            "Có hợp đồng đang hoạt động"
          icon={
            Building2
          }
          accent="rose"
        />


        <TenantSummaryCard
          title="Chưa thuê phòng"
          value={
            String(
              inactiveTenantCount
            )
          }
          subtitle=
            "Không có hợp đồng hoạt động"
          icon={
            UserRound
          }
          accent="gold"
        />


        <TenantSummaryCard
          title="Đang hiển thị"
          value={
            String(
              filteredTenants.length
            )
          }
          subtitle=
            "Theo bộ lọc hiện tại"
          icon={
            LayoutGrid
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
              xl:grid-cols-[minmax(280px,1fr)_190px_170px_170px_auto_auto]
            "
          >

            {/* SEARCH */}

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
                  "Tìm tên, SĐT, email, CCCD, phòng..."
                className="
                  h-11
                  rounded-xl
                  border-[#ddd9cf]
                  bg-white
                  pl-10
                "
              />

            </div>


            {/* STATUS */}

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

                <option value="RENTING">
                  Đang thuê
                </option>

                <option value="NOT_RENTING">
                  Chưa thuê phòng
                </option>

              </select>

            </div>


            {/* FLOOR */}

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
                    {formatFloor(
                      floor
                    )}
                  </option>

                )
              )}

            </select>


            {/* SORT */}

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

              <option value="NAME_ASC">
                Tên A-Z
              </option>

              <option value="NAME_DESC">
                Tên Z-A
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
              {filteredTenants.length}
              {" / "}
              {tenants.length}
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

            Đang tải khách thuê...

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

      ) : filteredTenants.length === 0 ? (

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
              Không tìm thấy khách thuê
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
            md:grid-cols-2
            2xl:grid-cols-3
          "
        >

          {filteredTenants.map(
            (
              tenant
            ) => {

              const contract =
                activeContractMap.get(
                  tenant.id
                );


              const room =
                contract

                  ? roomMap.get(
                      contract.room_id
                    )

                  : undefined;


              const deleteState =
                getTenantDeleteState(
                  tenant.id,
                  contracts
                );


              return (

                <TenantCard
                  key={
                    tenant.id
                  }
                  tenant={
                    tenant
                  }
                  contract={
                    contract
                  }
                  room={
                    room
                  }
                  deleteState={
                    deleteState
                  }
                  onEdit={
                    () =>
                      setEditingTenantId(
                        tenant.id
                      )
                  }
                  onCreateContract={
                    () =>
                      setContractTenantId(
                        tenant.id
                      )
                  }
                  onDelete={
                    () =>
                      handleDeleteTenant(
                        tenant
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
          MODALS
      ===================================================== */}

      <AddTenantModal
        open={
          showAddModal
        }
        onClose={
          () =>
            setShowAddModal(
              false
            )
        }
        onCreated={
          handleTenantCreated
        }
      />


      {createdTenant && (

        <div
          className="
            fixed
            inset-0
            z-[110]
            flex
            items-center
            justify-center
            bg-[#0b1625]/60
            p-4
            backdrop-blur-[2px]
          "
          role="dialog"
          aria-modal="true"
          aria-labelledby="tenant-created-title"
        >

          <div
            className="
              w-full
              max-w-md
              overflow-hidden
              rounded-2xl
              border
              border-[#e9e2d8]
              bg-white
              shadow-[0_24px_80px_rgba(18,32,51,0.28)]
            "
          >

            <div
              className="
                border-b
                border-[#eeeae2]
                bg-[#122033]
                px-5
                py-5
                text-white
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
                    bg-[#d6a64c]/15
                    text-[#efd38f]
                  "
                >

                  <UserRound
                    size={20}
                  />

                </div>


                <div
                  className="min-w-0"
                >

                  <div
                    className="
                      text-[11px]
                      font-semibold
                      uppercase
                      tracking-[0.16em]
                      text-[#d6a64c]
                    "
                  >
                    Đã thêm khách thuê
                  </div>


                  <h2
                    id="tenant-created-title"
                    className="
                      mt-1
                      truncate
                      text-lg
                      font-semibold
                    "
                  >
                    {createdTenant.full_name}
                  </h2>

                </div>

              </div>

            </div>


            <div
              className="
                space-y-4
                px-5
                py-5
              "
            >

              <p
                className="
                  text-sm
                  leading-6
                  text-slate-600
                "
              >
                Hồ sơ khách đã được lưu. Bạn có muốn tạo hợp đồng cho khách này ngay không?
              </p>


              <div
                className={
                  rooms.some(
                    (
                      room
                    ) =>
                      room.status
                      === "VACANT"
                  )

                    ? "rounded-xl border border-[#ead9b7] bg-[#fffaf0] px-4 py-3 text-sm text-[#8a6726]"

                    : "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                }
              >

                {rooms.some(
                  (
                    room
                  ) =>
                    room.status
                    === "VACANT"
                )

                  ? `Hiện có ${rooms.filter(
                      (
                        room
                      ) =>
                        room.status
                        === "VACANT"
                    ).length} phòng trống để chọn.`

                  : "Hiện chưa có phòng trống. Bạn vẫn có thể tiếp tục và tạo phòng mới trong bước hợp đồng."}

              </div>

            </div>


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
                sm:justify-end
              "
            >

              <Button
                type="button"
                variant="outline"
                onClick={
                  () =>
                    setCreatedTenant(
                      null
                    )
                }
                className="
                  h-10
                  rounded-xl
                  border-[#ddd8ce]
                "
              >
                Để sau
              </Button>


              <Button
                type="button"
                onClick={
                  () => {

                    setContractTenantId(
                      createdTenant.id
                    );

                    setCreatedTenant(
                      null
                    );

                  }
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

                <FileText />

                Tạo hợp đồng ngay

              </Button>

            </div>

          </div>

        </div>

      )}


      <AddContractModal
        open={
          contractTenantId
          !== null
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
        initialTenantId={
          contractTenantId
        }
        onRoomCreated={
          handleRoomCreatedForContract
        }
        onClose={
          () =>
            setContractTenantId(
              null
            )
        }
        onCreated={
          handleContractCreated
        }
      />


      <EditTenantModal
        open={
          editingTenantId
          !== null
        }
        tenantId={
          editingTenantId
        }
        onClose={
          () =>
            setEditingTenantId(
              null
            )
        }
        onUpdated={
          handleTenantUpdated
        }
      />


    </>

  );

}




// =========================================================
// MOBILE SUMMARY BUTTON
// =========================================================

function MobileTenantSummaryButton({
  label,
  value,
  active,
  onClick,
  tone,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
  tone?:
    | "rose"
    | "gold";
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
            min-h-20
            border-r
            border-[#ebe6dd]
            bg-[#122033]
            px-2
            py-3
            text-white
            last:border-r-0
          `

          : `
            min-h-20
            border-r
            border-[#ebe6dd]
            bg-white
            px-2
            py-3
            text-[#172033]
            last:border-r-0
          `
      }
    >

      <div
        className={
          active

            ? "text-xl font-bold"

            : tone === "rose"

              ? "text-xl font-bold text-[#b92f49]"

              : tone === "gold"

                ? "text-xl font-bold text-[#9a762f]"

                : "text-xl font-bold text-[#172033]"
        }
      >
        {value}
      </div>


      <div
        className={
          active

            ? `
              mt-1
              text-[10px]
              font-medium
              text-slate-300
            `

            : `
              mt-1
              text-[10px]
              font-medium
              text-slate-500
            `
        }
      >
        {label}
      </div>

    </button>

  );

}


// =========================================================
// MOBILE FILTER CHIP
// =========================================================

function MobileTenantFilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {

  return (

    <button
      type="button"
      onClick={
        onClick
      }
      aria-pressed={
        active
      }
      className={
        active

          ? `
            h-9
            shrink-0
            rounded-full
            bg-[#122033]
            px-4
            text-xs
            font-semibold
            text-white
          `

          : `
            h-9
            shrink-0
            rounded-full
            border
            border-[#ddd9cf]
            bg-white
            px-4
            text-xs
            font-medium
            text-slate-600
          `
      }
    >
      {label}
    </button>

  );

}

// =========================================================
// TENANT CARD
// =========================================================

function TenantCard({
  tenant,
  contract,
  room,
  deleteState,
  onEdit,
  onCreateContract,
  onDelete,
}: {
  tenant: Tenant;
  contract?: Contract;
  room?: Room;
  deleteState: TenantDeleteState;
  onEdit: () => void;
  onCreateContract: () => void;
  onDelete: () => void;
}) {

  const renting =
    Boolean(
      contract
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
          renting
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
                renting

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

              <UserRound
                size={20}
              />

            </div>


            <div
              className="min-w-0"
            >

              <div
                className="
                  text-[11px]
                  font-semibold
                  uppercase
                  tracking-[0.15em]
                  text-slate-400
                "
              >
                Khách thuê #{tenant.id}
              </div>


              <h2
                className="
                  mt-1
                  truncate
                  text-lg
                  font-semibold
                  text-[#172033]
                "
              >
                {tenant.full_name}
              </h2>

            </div>

          </div>


          <Badge
            variant="outline"
            className={
              renting

                ? `
                  border-[#efced4]
                  bg-[#fcecef]
                  text-[#b92f49]
                `

                : `
                  border-[#ead9b7]
                  bg-[#fffaf0]
                  text-[#8a6726]
                `
            }
          >

            {renting
              ? "Đang thuê"
              : "Chưa thuê"}

          </Badge>

        </div>


        {/* INFO */}

        <div
          className="
            space-y-1
            px-5
            py-4
          "
        >

          <TenantInfoRow
            label="Phòng hiện tại"
            value={
              room?.room_code
              ?? "-"
            }
          />


          <TenantInfoRow
            label="Tầng"
            value={
              room
                ? formatFloor(
                    room.floor
                  )
                : "-"
            }
          />


          <TenantInfoRow
            label="Hợp đồng"
            value={
              contract
                ? `#${contract.id}`
                : "-"
            }
          />


          <TenantInfoRow
            label="Điện thoại"
            value={
              tenant.phone
              ?? "-"
            }
          />


          <TenantInfoRow
            label="Email"
            value={
              tenant.email
              ?? "-"
            }
          />


          <TenantInfoRow
            label="CCCD"
            value={
              tenant.citizen_id
              ?? "-"
            }
          />


          {tenant.note && (

            <div
              className="
                mt-4
                rounded-xl
                border
                border-[#eee9df]
                bg-[#fffdf9]
                px-4
                py-3
              "
            >

              <div
                className="
                  text-xs
                  font-medium
                  text-slate-400
                "
              >
                Ghi chú
              </div>


              <p
                className="
                  mt-1
                  line-clamp-2
                  text-sm
                  leading-5
                  text-slate-600
                "
              >
                {tenant.note}
              </p>

            </div>

          )}

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
              `/tenants/${tenant.id}`
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


          {contract
            &&
            room
            ? (

              <>

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

                  Phòng

                </Link>


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

                  <FileText
                    size={14}
                  />

                  Hợp đồng

                </Link>

              </>

            ) : (

              <>

                <button
                  type="button"
                  onClick={
                    onCreateContract
                  }
                  className="
                    inline-flex
                    h-9
                    items-center
                    justify-center
                    gap-1.5
                    rounded-lg
                    border
                    border-[#ead9b7]
                    bg-[#fffaf0]
                    px-3
                    text-xs
                    font-semibold
                    text-[#8a6726]
                    transition
                    hover:border-[#d6a64c]
                    hover:bg-[#fff7e6]
                  "
                >

                  <FileText
                    size={14}
                  />

                  Tạo hợp đồng

                </button>


                <button
                  type="button"
                  onClick={
                    onDelete
                  }
                  disabled={
                    !deleteState.canDelete
                  }
                  title={
                    deleteState.message
                  }
                  className={
                    deleteState.canDelete

                      ? `
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
                        `

                      : `
                          inline-flex
                          h-9
                          cursor-not-allowed
                          items-center
                          justify-center
                          gap-1.5
                          rounded-lg
                          border
                          border-slate-200
                          bg-slate-50
                          px-3
                          text-xs
                          font-semibold
                          text-slate-400
                        `
                  }
                >

                  <Trash2
                    size={14}
                  />

                  {deleteState.mode
                    === "WAITING"

                      ? `Xóa sau ${deleteState.daysRemaining} ngày`

                      : deleteState.mode
                        === "READY"

                        ? "Xóa dữ liệu"

                        : deleteState.mode
                          === "NO_HISTORY"

                          ? "Xóa khách thuê"

                          : "Chưa thể xóa"}

                </button>

              </>

            )}

        </div>

      </CardContent>

    </Card>

  );

}


// =========================================================
// SUMMARY CARD
// =========================================================

function TenantSummaryCard({
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

        <div>

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

function TenantInfoRow({
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


export default Tenants;