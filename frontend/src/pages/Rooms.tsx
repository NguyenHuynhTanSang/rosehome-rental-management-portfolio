import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Building2,
  DoorOpen,
  Filter,
  Layers3,
  LayoutGrid,
  Plus,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";

import {
  apiGet,
} from "../api/api";

import AddRoomModal
  from "../components/AddRoomModal";

import EditRoomModal
  from "../components/EditRoomModal";

import AddContractModal
  from "../components/AddContractModal";

import RoomCard
  from "../components/RoomCard";

import MobileRoomCard
  from "../components/mobile/MobileRoomCard";

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
  Room,
} from "../types/room";

import type {
  Contract,
} from "../types/contract";

import type {
  Tenant,
} from "../types/tenant";


function Rooms() {

  const [
    rooms,
    setRooms,
  ] = useState<Room[]>(
    []
  );


  const [
    contracts,
    setContracts,
  ] = useState<Contract[]>(
    []
  );


  const [
    tenants,
    setTenants,
  ] = useState<Tenant[]>(
    []
  );


  const [
    search,
    setSearch,
  ] = useState("");


  const [
    floorFilter,
    setFloorFilter,
  ] = useState(
    "ALL"
  );


  const [
    statusFilter,
    setStatusFilter,
  ] = useState(
    "ALL"
  );


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


  const [
    showAddModal,
    setShowAddModal,
  ] = useState(
    false
  );


  const [
    editingRoomId,
    setEditingRoomId,
  ] = useState<
    number | null
  >(
    null
  );


  const [
    rentingRoomId,
    setRentingRoomId,
  ] = useState<
    number | null
  >(
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
        roomData,
        contractData,
        tenantData,
      ] = await Promise.all([

        apiGet<Room[]>(
          "/rooms"
        ),

        apiGet<Contract[]>(
          "/contracts"
        ),

        apiGet<Tenant[]>(
          "/tenants"
        ),

      ]);


      setRooms(
        roomData
      );


      setContracts(
        contractData
      );


      setTenants(
        tenantData
      );


    } catch (err) {

      console.error(
        err
      );


      setError(
        "Không thể tải danh sách phòng."
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
  // TENANT MAP
  // =========================================================

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


  // =========================================================
  // ACTIVE CONTRACT MAP
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
                contract.room_id,
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
  // FLOORS
  // =========================================================

  const floors =
    useMemo(
      () => {

        const values =
          rooms
            .map(
              (
                room
              ) =>
                room.floor
            )
            .filter(
              (
                floor
              ):
                floor is number =>
                  floor
                  !== null
                  &&
                  floor
                  !== undefined
            );


        return Array.from(
          new Set(
            values
          )
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

  const filteredRooms =
    useMemo(
      () => {

        const keyword =
          search
            .trim()
            .toLowerCase();


        return rooms.filter(
          (
            room
          ) => {

            const contract =
              activeContractMap.get(
                room.id
              );


            const tenant =
              contract

                ? tenantMap.get(
                    contract.tenant_id
                  )

                : undefined;


            const matchesSearch =
              keyword === ""
              ||
              room.room_code
                .toLowerCase()
                .includes(
                  keyword
                )
              ||
              (
                room.description
                ?? ""
              )
                .toLowerCase()
                .includes(
                  keyword
                )
              ||
              (
                tenant?.full_name
                ?? ""
              )
                .toLowerCase()
                .includes(
                  keyword
                );


            const matchesStatus =
              statusFilter
              === "ALL"
              ||
              room.status
              === statusFilter;


            const matchesFloor =
              floorFilter
              === "ALL"
              ||
              String(
                room.floor
              )
              === floorFilter;


            return (
              matchesSearch
              &&
              matchesStatus
              &&
              matchesFloor
            );

          }
        );

      },
      [
        rooms,
        search,
        floorFilter,
        statusFilter,
        activeContractMap,
        tenantMap,
      ]
    );


  // =========================================================
  // COUNTERS
  // =========================================================

  const occupiedCount =
    rooms.filter(
      (
        room
      ) =>
        room.status
        === "OCCUPIED"
    ).length;


  const vacantCount =
    rooms.filter(
      (
        room
      ) =>
        room.status
        === "VACANT"
    ).length;


  const occupancyRate =
    rooms.length > 0

      ? Math.round(
          (
            occupiedCount
            /
            rooms.length
          )
          *
          100
        )

      : 0;


  // =========================================================
  // ROOM CREATED
  // =========================================================

  function handleRoomCreated(
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


  // =========================================================
  // CONTRACT CREATED
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
            ===
            newContract.room_id

              ? {
                  ...room,

                  status:
                    "OCCUPIED",
                }

              : room
        )
    );


    setRentingRoomId(
      null
    );

  }


  // =========================================================
  // RESET FILTERS
  // =========================================================

  function resetFilters() {

    setSearch("");

    setFloorFilter(
      "ALL"
    );

    setStatusFilter(
      "ALL"
    );

  }


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
            PAGE HEADER
        ========================== */}

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
              Phòng
            </h1>


            <div
              className="
                mt-1
                text-xs
                text-slate-500
              "
            >
              {rooms.length}
              {" "}
              phòng đang quản lý
            </div>

          </div>


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
              gap-1.5
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

            Thêm

          </button>

        </div>


        {/* ==========================
            ERROR
        ========================== */}

        {error && (

          <div
            className="
              rounded-2xl
              border
              border-red-200
              bg-red-50
              px-4
              py-3
              text-sm
              text-red-700
            "
          >
            {error}
          </div>

        )}


        {/* ==========================
            MOBILE SUMMARY
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

          <button
            type="button"
            onClick={
              () =>
                setStatusFilter(
                  "ALL"
                )
            }
            className="
              min-w-0
              border-r
              border-[#eeeae2]
              px-2
              py-3
              text-center
            "
          >

            <div
              className="
                text-lg
                font-bold
                text-[#172033]
              "
            >
              {rooms.length}
            </div>


            <div
              className="
                mt-0.5
                text-[11px]
                text-slate-500
              "
            >
              Tất cả
            </div>

          </button>


          <button
            type="button"
            onClick={
              () =>
                setStatusFilter(
                  "OCCUPIED"
                )
            }
            className="
              min-w-0
              border-r
              border-[#eeeae2]
              px-2
              py-3
              text-center
            "
          >

            <div
              className="
                text-lg
                font-bold
                text-[#e44763]
              "
            >
              {occupiedCount}
            </div>


            <div
              className="
                mt-0.5
                text-[11px]
                text-slate-500
              "
            >
              Đang thuê
            </div>

          </button>


          <button
            type="button"
            onClick={
              () =>
                setStatusFilter(
                  "VACANT"
                )
            }
            className="
              min-w-0
              px-2
              py-3
              text-center
            "
          >

            <div
              className="
                text-lg
                font-bold
                text-[#b7862e]
              "
            >
              {vacantCount}
            </div>


            <div
              className="
                mt-0.5
                text-[11px]
                text-slate-500
              "
            >
              Trống
            </div>

          </button>

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
            placeholder=
              "Tìm phòng hoặc khách thuê..."
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
              transition
              placeholder:text-slate-400
              focus:border-[#d6a64c]
              focus:ring-2
              focus:ring-[#d6a64c]/15
            "
          />

        </div>


        {/* ==========================
            STATUS CHIPS
        ========================== */}

        <div
          className="
            flex
            gap-2
            overflow-x-auto
            pb-1
          "
        >

          <MobileFilterChip
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
            label="Tất cả"
          />


          <MobileFilterChip
            active={
              statusFilter
              === "OCCUPIED"
            }
            onClick={
              () =>
                setStatusFilter(
                  "OCCUPIED"
                )
            }
            label="Đang thuê"
          />


          <MobileFilterChip
            active={
              statusFilter
              === "VACANT"
            }
            onClick={
              () =>
                setStatusFilter(
                  "VACANT"
                )
            }
            label="Phòng trống"
          />


          <button
            type="button"
            onClick={
              loadData
            }
            disabled={
              loading
            }
            aria-label="Tải lại"
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-full
              border
              border-[#ddd9cf]
              bg-white
              text-slate-500
              disabled:opacity-50
            "
          >

            <RefreshCw
              size={15}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

          </button>

        </div>


        {/* ==========================
            FLOOR
        ========================== */}

        {floors.length > 0 && (

          <div>

            <div
              className="
                mb-2
                flex
                items-center
                gap-1.5
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.12em]
                text-slate-400
              "
            >

              <Layers3
                size={14}
              />

              Tầng

            </div>


            <div
              className="
                flex
                gap-2
                overflow-x-auto
                pb-1
              "
            >

              <MobileFloorChip
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
                label="Tất cả"
              />


              {floors.map(
                (
                  floor
                ) => (

                  <MobileFloorChip
                    key={
                      floor
                    }
                    active={
                      floorFilter
                      ===
                      String(
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
                    label={
                      floor === 0
                        ? "Trệt"
                        : `Tầng ${floor}`
                    }
                  />

                )
              )}

            </div>

          </div>

        )}


        {/* ==========================
            LIST TITLE
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
              Danh sách phòng
            </h2>


            <p
              className="
                mt-0.5
                text-xs
                text-slate-500
              "
            >
              {filteredRooms.length}
              {" "}
              kết quả
            </p>

          </div>


          {(
            search
            ||
            floorFilter !== "ALL"
            ||
            statusFilter !== "ALL"
          ) && (

            <button
              type="button"
              onClick={
                resetFilters
              }
              className="
                text-xs
                font-semibold
                text-[#b7862e]
              "
            >
              Đặt lại
            </button>

          )}

        </div>


        {/* ==========================
            MOBILE ROOM LIST
        ========================== */}

        {loading
          &&
          rooms.length === 0
          ? (

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

              Đang tải phòng...

            </div>

          ) : filteredRooms.length === 0 ? (

            <div
              className="
                rounded-2xl
                border
                border-[#ebe6dd]
                bg-white
                px-5
                py-10
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
                Không tìm thấy phòng
              </div>


              <div
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                Thử thay đổi từ khóa
                hoặc bộ lọc.
              </div>


              <button
                type="button"
                onClick={
                  resetFilters
                }
                className="
                  mt-4
                  min-h-10
                  rounded-xl
                  border
                  border-[#ddd9cf]
                  bg-white
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

              {filteredRooms.map(
                (
                  room
                ) => {

                  const contract =
                    activeContractMap.get(
                      room.id
                    );


                  const tenant =
                    contract

                      ? tenantMap.get(
                          contract.tenant_id
                        )

                      : undefined;


                  return (

                    <MobileRoomCard
                      key={
                        room.id
                      }
                      room={
                        room
                      }
                      tenantId={
                        tenant?.id
                      }
                      tenantName={
                        tenant?.full_name
                      }
                      contractId={
                        contract?.id
                      }
                      monthlyRent={
                        contract?.monthly_rent
                      }
                      onRent={
                        (
                          roomId
                        ) =>
                          setRentingRoomId(
                            roomId
                          )
                      }
                      onEdit={
                        (
                          roomId
                        ) =>
                          setEditingRoomId(
                            roomId
                          )
                      }
                      onDeleted={
                        loadData
                      }
                    />

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

          {/* =================================================
              HERO
          ================================================= */}

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

                  <Building2
                    size={16}
                  />

                  Rosehome Property

                </div>


                <h1
                  className="
                    text-2xl
                    font-semibold
                    tracking-tight
                    md:text-3xl
                  "
                >
                  Quản lý phòng
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
                  Theo dõi trạng thái phòng,
                  khách thuê và hợp đồng
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

                Thêm phòng

              </Button>

            </div>

          </section>


          {/* =================================================
              ERROR
          ================================================= */}

          {error && (

            <div
              className="
                rounded-xl
                border
                border-red-200
                bg-red-50
                px-4
                py-3
                text-sm
                text-red-700
              "
            >
              {error}
            </div>

          )}


          {/* =================================================
              SUMMARY
          ================================================= */}

          <div
            className="
              grid
              grid-cols-1
              gap-4
              sm:grid-cols-2
              xl:grid-cols-4
            "
          >

            <RoomSummaryCard
              title="Tổng số phòng"
              value={
                String(
                  rooms.length
                )
              }
              subtitle=
                "Toàn bộ phòng đang quản lý"
              icon={
                Building2
              }
            />


            <RoomSummaryCard
              title="Đang thuê"
              value={
                String(
                  occupiedCount
                )
              }
              subtitle={
                `${occupancyRate}% tỷ lệ lấp đầy`
              }
              icon={
                Users
              }
              accent="rose"
            />


            <RoomSummaryCard
              title="Phòng trống"
              value={
                String(
                  vacantCount
                )
              }
              subtitle=
                "Có thể tiếp nhận khách mới"
              icon={
                DoorOpen
              }
              accent="gold"
            />


            <RoomSummaryCard
              title="Đang hiển thị"
              value={
                String(
                  filteredRooms.length
                )
              }
              subtitle=
                "Theo bộ lọc hiện tại"
              icon={
                LayoutGrid
              }
            />

          </div>


          {/* =================================================
              FILTERS
          ================================================= */}

          <Card
            className="
              overflow-hidden
              rounded-2xl
              border-[#e9e2d8]
              shadow-sm
            "
          >

            <CardContent
              className="
                space-y-5
                p-5
                md:p-6
              "
            >

              <div
                className="
                  flex
                  flex-col
                  gap-3
                  lg:flex-row
                "
              >

                <div
                  className="
                    relative
                    flex-1
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
                      "Tìm mã phòng, mô tả hoặc tên khách thuê..."
                    className="
                      h-11
                      rounded-xl
                      border-[#ddd9cf]
                      bg-white
                      pl-10
                      focus-visible:border-[#d6a64c]
                      focus-visible:ring-[#d6a64c]/20
                    "
                  />

                </div>


                <div
                  className="
                    relative
                    min-w-[210px]
                  "
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
                      pr-4
                      text-sm
                      text-[#172033]
                      outline-none
                      transition
                      focus:border-[#d6a64c]
                      focus:ring-2
                      focus:ring-[#d6a64c]/15
                    "
                  >

                    <option
                      value="ALL"
                    >
                      Tất cả trạng thái
                    </option>

                    <option
                      value="VACANT"
                    >
                      Phòng trống
                    </option>

                    <option
                      value="OCCUPIED"
                    >
                      Đang thuê
                    </option>

                  </select>

                </div>


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
                    bg-white
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
                    resetFilters
                  }
                  className="
                    h-11
                    rounded-xl
                    border-[#ddd9cf]
                    bg-white
                  "
                >
                  Đặt lại
                </Button>

              </div>


              <div
                className="
                  border-t
                  border-[#eeeae2]
                  pt-5
                "
              >

                <div
                  className="
                    mb-3
                    flex
                    items-center
                    gap-2
                    text-xs
                    font-semibold
                    uppercase
                    tracking-[0.12em]
                    text-slate-500
                  "
                >

                  <Layers3
                    size={15}
                  />

                  Lọc theo tầng

                </div>


                <div
                  className="
                    flex
                    flex-wrap
                    gap-2
                  "
                >

                  <button
                    type="button"
                    onClick={
                      () =>
                        setFloorFilter(
                          "ALL"
                        )
                    }
                    className={
                      floorFilter
                      === "ALL"

                        ? `
                          inline-flex
                          h-9
                          items-center
                          rounded-full
                          border
                          border-[#122033]
                          bg-[#122033]
                          px-4
                          text-sm
                          font-medium
                          text-white
                          transition
                        `

                        : `
                          inline-flex
                          h-9
                          items-center
                          rounded-full
                          border
                          border-[#ddd9cf]
                          bg-white
                          px-4
                          text-sm
                          font-medium
                          text-slate-600
                          transition
                          hover:border-[#d6a64c]
                          hover:bg-[#fffaf1]
                          hover:text-[#8a6726]
                        `
                    }
                  >
                    Tất cả
                  </button>


                  {floors.map(
                    (
                      floor
                    ) => (

                      <button
                        key={
                          floor
                        }
                        type="button"
                        onClick={
                          () =>
                            setFloorFilter(
                              String(
                                floor
                              )
                            )
                        }
                        className={
                          floorFilter
                          ===
                          String(
                            floor
                          )

                            ? `
                              inline-flex
                              h-9
                              items-center
                              rounded-full
                              border
                              border-[#e44763]
                              bg-[#fcecef]
                              px-4
                              text-sm
                              font-semibold
                              text-[#b92f49]
                              transition
                            `

                            : `
                              inline-flex
                              h-9
                              items-center
                              rounded-full
                              border
                              border-[#ddd9cf]
                              bg-white
                              px-4
                              text-sm
                              font-medium
                              text-slate-600
                              transition
                              hover:border-[#d6a64c]
                              hover:bg-[#fffaf1]
                              hover:text-[#8a6726]
                            `
                        }
                      >
                        {floor === 0
                          ? "Tầng trệt"
                          : `Tầng ${floor}`}
                      </button>

                    )
                  )}

                </div>

              </div>

            </CardContent>

          </Card>


          {/* =================================================
              ROOM LIST HEADER
          ================================================= */}

          <div
            className="
              flex
              flex-col
              gap-3
              sm:flex-row
              sm:items-end
              sm:justify-between
            "
          >

            <div>

              <h2
                className="
                  text-lg
                  font-semibold
                  text-[#172033]
                "
              >
                Danh sách phòng
              </h2>


              <p
                className="
                  mt-1
                  text-sm
                  text-slate-500
                "
              >
                {filteredRooms.length}
                {" "}
                phòng phù hợp với
                bộ lọc hiện tại.
              </p>

            </div>


            <Badge
              variant="outline"
              className="
                w-fit
                rounded-full
                border-[#e5dccb]
                bg-[#fffaf2]
                px-3
                py-1
                text-[#8a6726]
              "
            >
              <LayoutGrid />

              {filteredRooms.length}
              {" "}
              phòng
            </Badge>

          </div>


          {/* =================================================
              CONTENT
          ================================================= */}

          {loading ? (

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

                Đang tải danh sách phòng...

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

          ) : filteredRooms.length === 0 ? (

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
                  min-h-52
                  flex-col
                  items-center
                  justify-center
                  gap-3
                  text-slate-500
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
                    size={22}
                  />

                </div>


                <div
                  className="
                    text-center
                  "
                >

                  <div
                    className="
                      font-medium
                      text-[#172033]
                    "
                  >
                    Không tìm thấy phòng
                  </div>


                  <div
                    className="
                      mt-1
                      text-sm
                    "
                  >
                    Hãy thử thay đổi từ khóa
                    hoặc bộ lọc.
                  </div>

                </div>


                <Button
                  type="button"
                  variant="outline"
                  onClick={
                    resetFilters
                  }
                >
                  Đặt lại bộ lọc
                </Button>

              </CardContent>

            </Card>

          ) : (

            <div
              className="
                room-square-grid
                rooms-responsive-grid
              "
            >

              {filteredRooms.map(
                (
                  room
                ) => {

                  const contract =
                    activeContractMap.get(
                      room.id
                    );


                  const tenant =
                    contract

                      ? tenantMap.get(
                          contract.tenant_id
                        )

                      : undefined;


                  return (

                    <RoomCard
                      key={
                        room.id
                      }
                      room={
                        room
                      }
                      tenantId={
                        tenant?.id
                      }
                      tenantName={
                        tenant?.full_name
                      }
                      contractId={
                        contract?.id
                      }
                      monthlyRent={
                        contract?.monthly_rent
                      }
                      onRent={
                        (
                          roomId
                        ) =>
                          setRentingRoomId(
                            roomId
                          )
                      }
                      onEdit={
                        (
                          roomId
                        ) =>
                          setEditingRoomId(
                            roomId
                          )
                      }
                      onDeleted={
                        loadData
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
          SHARED MODALS
      ===================================================== */}

      <AddRoomModal
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
          handleRoomCreated
        }
      />


      <EditRoomModal
        open={
          editingRoomId
          !== null
        }
        roomId={
          editingRoomId
        }
        onClose={
          () =>
            setEditingRoomId(
              null
            )
        }
        onUpdated={
          loadData
        }
      />


      <AddContractModal
        open={
          rentingRoomId
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
          rentingRoomId
        }
        onClose={
          () =>
            setRentingRoomId(
              null
            )
        }
        onCreated={
          handleContractCreated
        }
      />

    </>

  );

}


// =========================================================
// MOBILE FILTER CHIP
// =========================================================

function MobileFilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
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
// MOBILE FLOOR CHIP
// =========================================================

function MobileFloorChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
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
            h-8
            shrink-0
            rounded-full
            border
            border-[#d6a64c]
            bg-[#fff8e9]
            px-3
            text-[11px]
            font-semibold
            text-[#8a6726]
          `

          : `
            h-8
            shrink-0
            rounded-full
            border
            border-[#e1ddd5]
            bg-white
            px-3
            text-[11px]
            font-medium
            text-slate-500
          `
      }
    >
      {label}
    </button>

  );

}


// =========================================================
// DESKTOP SUMMARY CARD
// =========================================================

function RoomSummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon:
    typeof Building2;
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
        transition
        hover:-translate-y-0.5
        hover:shadow-md
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
              text-2xl
              font-semibold
              tracking-tight
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

            accent === "rose"

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

              : accent === "gold"

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


export default Rooms;