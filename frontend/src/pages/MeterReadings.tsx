import {
  useEffect,
  useRef,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Filter,
  Gauge,
  RefreshCw,
  Save,
  Search,
  Zap,
  type LucideIcon,
} from "lucide-react";

import {
  apiGet,
  apiPost,
} from "../api/api";

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
  MeterReading,
} from "../types/meterReading";

import type {
  Contract,
} from "../types/contract";


// =========================================================
// TYPES
// =========================================================

type ReadingInputs = {
  [roomId: number]: string;
};


type MeterReadingBulkItemPayload = {
  room_id: number;
  new_reading: number;
  old_reading?: number;
};


type MeterReadingBulkPayload = {
  year: number;
  month: number;
  readings: MeterReadingBulkItemPayload[];
};


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


// =========================================================
// METER READINGS
// =========================================================

function MeterReadings() {

  const today =
    new Date();


  const [
    year,
    setYear,
  ] = useState(() => {
    const value = Number(
      new URLSearchParams(window.location.search).get("year")
    );
    return Number.isInteger(value) && value >= 2020 && value <= 2100
      ? value
      : today.getFullYear();
  });


  const [
    month,
    setMonth,
  ] = useState(() => {
    const value = Number(
      new URLSearchParams(window.location.search).get("month")
    );
    return Number.isInteger(value) && value >= 1 && value <= 12
      ? value
      : today.getMonth() + 1;
  });


  const [
    rooms,
    setRooms,
  ] = useState<Room[]>([]);


  const [
    readings,
    setReadings,
  ] = useState<MeterReading[]>([]);


  const [
    previousReadings,
    setPreviousReadings,
  ] = useState<MeterReading[]>([]);


  const [
    contracts,
    setContracts,
  ] = useState<Contract[]>([]);


  const [
    inputs,
    setInputs,
  ] = useState<ReadingInputs>({});


  const [
    oldInputs,
    setOldInputs,
  ] = useState<ReadingInputs>({});


  const [
    search,
    setSearch,
  ] = useState("");


  const [
    floorFilter,
    setFloorFilter,
  ] = useState("ALL");


  const [
    readingStatusFilter,
    setReadingStatusFilter,
  ] = useState("ALL");


  const [
    occupiedOnly,
    setOccupiedOnly,
  ] = useState(false);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    saving,
    setSaving,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    success,
    setSuccess,
  ] = useState("");


  // =========================================================
  // LOAD ROOMS
  // =========================================================

  useEffect(
    () => {

      async function loadRooms() {

        try {

          const data =
            await apiGet<Room[]>(
              "/rooms"
            );


          setRooms(
            data
          );


        } catch (err) {

          console.error(
            err
          );


          setError(
            "Không thể tải danh sách phòng."
          );

        }

      }


      loadRooms();

    },
    []
  );


  // =========================================================
  // LOAD MONTH
  // =========================================================

  const monthRequest = useRef(0);
  const [transitionBaselines, setTransitionBaselines] = useState<{ room_id: number; new_reading: number }[]>([]);

  async function loadMonth() {
    const requestId = ++monthRequest.current;


    try {

      setLoading(
        true
      );


      setError("");
      setSuccess("");


      const [
        currentData,
        previousData,
        contractData,
        transitionData,
      ] =
        await Promise.all([

          apiGet<MeterReading[]>(
            `/meter-readings/month/${year}/${month}`
          ),

          apiGet<MeterReading[]>(
            `/meter-readings/previous/${year}/${month}`
          ),

          apiGet<Contract[]>(
            "/contracts"
          ),
          apiGet<{ room_id: number; new_reading: number }[]>(`/meter-readings/transition-baselines/${year}/${month}`),

        ]);


      if (requestId !== monthRequest.current) return;
      setTransitionBaselines(transitionData);

      setReadings(
        currentData
      );


      setPreviousReadings(
        previousData
      );


      setContracts(
        contractData
      );


      const currentInputs:
        ReadingInputs = {};


      currentData.forEach(
        (
          reading
        ) => {

          currentInputs[
            reading.room_id
          ] =
            String(
              reading.new_reading
            );

        }
      );


      setInputs(
        currentInputs
      );


      setOldInputs({});


    } catch (err) {
      if (requestId !== monthRequest.current) return;
      setTransitionBaselines([]);

      console.error(
        err
      );


      setError(
        "Không thể tải số điện của tháng này."
      );


      setReadings([]);
      setPreviousReadings([]);
      setContracts([]);
      setInputs({});
      setOldInputs({});


    } finally {
      if (requestId !== monthRequest.current) return;

      setLoading(
        false
      );

    }

  }


  useEffect(
    () => {

      loadMonth();
      return () => { monthRequest.current += 1; };

    },
    [
      year,
      month,
    ]
  );


  // =========================================================
  // READING MAP
  // =========================================================

  const readingMap =
    useMemo(
      () =>

        new Map(
          readings.map(
            (
              reading
            ) => [
              reading.room_id,
              reading,
            ]
          )
        ),

      [
        readings,
      ]
    );


  // =========================================================
  // PREVIOUS READING MAP
  // =========================================================

  const previousReadingMap =
    useMemo(
      () => {

        const result =
          new Map<
            number,
            {
              new_reading: number;
            }
          >();


        previousReadings.forEach(
          (
            reading
          ) => {

            result.set(
              reading.room_id,
              {
                new_reading:
                  reading.new_reading,
              }
            );

          }
        );


        transitionBaselines.forEach((reading) => result.set(reading.room_id, { new_reading: reading.new_reading }));

        const period =
          `${year}-${String(
            month
          ).padStart(
            2,
            "0"
          )}`;


        [...contracts]
          .filter(
            (
              contract
            ) =>
              contract.move_in_electric_reading
                !== null
              &&
              contract.move_in_electric_reading
                !== undefined
              &&
              contract.start_date.slice(
                0,
                7
              )
                === period
          )
          .sort(
            (
              a,
              b
            ) => {

              const dateCompare =
                a.start_date.localeCompare(
                  b.start_date
                );


              if (
                dateCompare
                !== 0
              ) {

                return dateCompare;

              }


              return (
                a.id
                -
                b.id
              );

            }
          )
          .forEach(
            (
              contract
            ) => {

              result.set(
                contract.room_id,
                {
                  new_reading:
                    Number(
                      contract.move_in_electric_reading
                    ),
                }
              );

            }
          );


        return result;

      },
      [
        previousReadings,
        transitionBaselines,
        contracts,
        year,
        month,
      ]
    );


  // =========================================================
  // FLOOR OPTIONS
  // =========================================================

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
  // SUMMARY
  // =========================================================

  const enteredRoomCount =
    useMemo(
      () =>

        rooms.filter(
          (
            room
          ) =>
            readingMap.has(
              room.id
            )
        ).length,

      [
        rooms,
        readingMap,
      ]
    );


  const notEnteredRoomCount =
    rooms.length
    -
    enteredRoomCount;


  const completionPercentage =
    rooms.length > 0

      ? Math.round(
          (
            enteredRoomCount
            /
            rooms.length
          )
          *
          100
        )

      : 0;


  // =========================================================
  // FILTER ROOMS
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

            const hasReading =
              readingMap.has(
                room.id
              );


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
                );


            const matchesFloor =
              floorFilter
              === "ALL"
              ||
              (
                floorFilter
                === "NONE"

                  ? room.floor
                    === null

                  : room.floor
                    === Number(
                      floorFilter
                    )
              );


            const matchesReadingStatus =
              readingStatusFilter
              === "ALL"
              ||
              (
                readingStatusFilter
                === "ENTERED"

                  ? hasReading

                  : !hasReading
              );


            const matchesOccupied =
              !occupiedOnly
              ||
              room.status
              === "OCCUPIED";


            return (
              matchesSearch
              &&
              matchesFloor
              &&
              matchesReadingStatus
              &&
              matchesOccupied
            );

          }
        );

      },
      [
        rooms,
        readingMap,
        search,
        floorFilter,
        readingStatusFilter,
        occupiedOnly,
      ]
    );


  // =========================================================
  // CHANGE NEW READING
  // =========================================================

  function handleReadingChange(
    roomId: number,
    value: string
  ) {

    setInputs(
      (
        current
      ) => ({
        ...current,
        [roomId]:
          value,
      })
    );

  }


  // =========================================================
  // CHANGE OLD READING
  // =========================================================

  function handleOldReadingChange(
    roomId: number,
    value: string
  ) {

    setOldInputs(
      (
        current
      ) => ({
        ...current,
        [roomId]:
          value,
      })
    );

  }


  // =========================================================
  // RESET FILTERS
  // =========================================================

  function handleResetFilters() {

    setSearch("");

    setFloorFilter(
      "ALL"
    );

    setReadingStatusFilter(
      "ALL"
    );

    setOccupiedOnly(
      false
    );

  }


  // =========================================================
  // SAVE BULK
  // =========================================================

  async function handleSave() {

    setError("");
    setSuccess("");


    const roomsToSave =
      rooms.filter(
        (
          room
        ) => {

          if (
            readingMap.has(
              room.id
            )
          ) {
            return false;
          }


          const value =
            inputs[
              room.id
            ];


          return (
            value !== undefined
            &&
            value.trim()
            !== ""
          );

        }
      );


    if (
      roomsToSave.length
      === 0
    ) {

      setError(
        "Bạn chưa nhập số điện mới cho phòng nào chưa được lưu."
      );

      return;

    }


    const missingOldReadingRoom =
      roomsToSave.find(
        (
          room
        ) => {

          const previous =
            previousReadingMap.get(
              room.id
            );


          if (
            previous
          ) {
            return false;
          }


          const oldValue =
            oldInputs[
              room.id
            ];


          return (
            oldValue
            === undefined
            ||
            oldValue.trim()
            === ""
          );

        }
      );


    if (
      missingOldReadingRoom
    ) {

      setError(
        `Phòng ${missingOldReadingRoom.room_code} là lần nhập đầu tiên. Hãy nhập số cũ ban đầu.`
      );

      return;

    }


    const readingItems:
      MeterReadingBulkItemPayload[] =
      roomsToSave.map(
        (
          room
        ) => {

          const previous =
            previousReadingMap.get(
              room.id
            );


          const item:
            MeterReadingBulkItemPayload = {

            room_id:
              room.id,

            new_reading:
              Number(
                inputs[
                  room.id
                ]
              ),

          };


          if (
            !previous
          ) {

            item.old_reading =
              Number(
                oldInputs[
                  room.id
                ]
              );

          }


          return item;

        }
      );


    const invalidNumberRoom =
      roomsToSave.find(
        (
          room
        ) => {

          const newReading =
            Number(
              inputs[
                room.id
              ]
            );


          if (
            Number.isNaN(
              newReading
            )
            ||
            newReading < 0
          ) {
            return true;
          }


          const previous =
            previousReadingMap.get(
              room.id
            );


          if (
            previous
          ) {
            return false;
          }


          const oldReading =
            Number(
              oldInputs[
                room.id
              ]
            );


          return (
            Number.isNaN(
              oldReading
            )
            ||
            oldReading < 0
          );

        }
      );


    if (
      invalidNumberRoom
    ) {

      setError(
        `Số điện của phòng ${invalidNumberRoom.room_code} không hợp lệ.`
      );

      return;

    }


    const invalidConsumptionRoom =
      roomsToSave.find(
        (
          room
        ) => {

          const newReading =
            Number(
              inputs[
                room.id
              ]
            );


          const previous =
            previousReadingMap.get(
              room.id
            );


          const oldReading =
            previous

              ? previous.new_reading

              : Number(
                  oldInputs[
                    room.id
                  ]
                );


          return (
            newReading
            <
            oldReading
          );

        }
      );


    if (
      invalidConsumptionRoom
    ) {

      setError(
        `Số điện mới của ${invalidConsumptionRoom.room_code} không được nhỏ hơn số điện cũ.`
      );

      return;

    }


    const data:
      MeterReadingBulkPayload = {

        year,
        month,

        readings:
          readingItems,

      };


    try {

      setSaving(
        true
      );


      await apiPost<
        unknown,
        MeterReadingBulkPayload
      >(
        "/meter-readings/bulk",
        data
      );


      setSuccess(
        "Đã lưu số điện thành công."
      );


      await loadMonth();


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
          "Không thể lưu số điện."
        );

      }


    } finally {

      setSaving(
        false
      );

    }

  }


  // =========================================================
  // OLD READING VALUE
  // =========================================================

  function getOldReadingValue(
    roomId: number
  ): number | null {

    const existing =
      readingMap.get(
        roomId
      );


    if (
      existing
    ) {
      return existing.old_reading;
    }


    const previous =
      previousReadingMap.get(
        roomId
      );


    if (
      previous
    ) {
      return previous.new_reading;
    }


    const manualOld =
      oldInputs[
        roomId
      ];


    if (
      manualOld === undefined
      ||
      manualOld.trim()
      === ""
      ||
      Number.isNaN(
        Number(
          manualOld
        )
      )
    ) {
      return null;
    }


    return Number(
      manualOld
    );

  }


  // =========================================================
  // CONSUMPTION PREVIEW
  // =========================================================

  function getPreviewConsumption(
    roomId: number
  ): number | null {

    const existing =
      readingMap.get(
        roomId
      );


    if (
      existing
    ) {
      return existing.consumption;
    }


    const newValue =
      inputs[
        roomId
      ];


    if (
      newValue === undefined
      ||
      newValue.trim()
      === ""
      ||
      Number.isNaN(
        Number(
          newValue
        )
      )
    ) {
      return null;
    }


    const oldReading =
      getOldReadingValue(
        roomId
      );


    if (
      oldReading === null
    ) {
      return null;
    }


    return (
      Number(
        newValue
      )
      -
      oldReading
    );

  }



  // =========================================================
  // PENDING MOBILE SAVE COUNT
  // =========================================================

  const pendingSaveCount =
    useMemo(
      () =>

        rooms.filter(
          (
            room
          ) => {

            if (
              readingMap.has(
                room.id
              )
            ) {
              return false;
            }


            const value =
              inputs[
                room.id
              ];


            return (
              value !== undefined
              &&
              value.trim()
              !== ""
            );

          }
        ).length,

      [
        rooms,
        readingMap,
        inputs,
      ]
    );


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
          pb-40
        "
      >

        {/* ==========================
            MOBILE HEADER
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
              Chỉ số điện
            </h1>


            <div
              className="
                mt-1
                text-xs
                text-slate-500
              "
            >
              Tháng {month}/{year}
            </div>

          </div>


          <button
            type="button"
            onClick={
              loadMonth
            }
            disabled={
              loading
            }
            aria-label="Tải lại số điện"
            className="
              flex
              h-11
              w-11
              shrink-0
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

        </div>


        {/* ==========================
            MOBILE PROGRESS
        ========================== */}

        <section
          className="
            overflow-hidden
            rounded-3xl
            bg-[#122033]
            p-5
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
                  text-slate-300
                "
              >
                Tiến độ ghi điện
              </div>


              <div
                className="
                  mt-2
                  text-3xl
                  font-bold
                  tracking-tight
                "
              >
                {completionPercentage}%
              </div>


              <div
                className="
                  mt-1
                  text-xs
                  text-slate-400
                "
              >
                {enteredRoomCount}/{rooms.length} phòng đã nhập
              </div>

            </div>


            <div
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-2xl
                bg-white/10
                text-[#d6a64c]
              "
            >

              <Zap
                size={22}
              />

            </div>

          </div>


          <div
            className="
              mt-5
              h-2
              overflow-hidden
              rounded-full
              bg-white/10
            "
          >

            <div
              className="
                h-full
                rounded-full
                bg-[#d6a64c]
                transition-all
              "
              style={{
                width:
                  `${completionPercentage}%`,
              }}
            />

          </div>


          <div
            className="
              mt-4
              grid
              grid-cols-2
              gap-3
            "
          >

            <button
              type="button"
              onClick={
                () =>
                  setReadingStatusFilter(
                    "NOT_ENTERED"
                  )
              }
              className="
                rounded-2xl
                bg-white/5
                px-4
                py-3
                text-left
                active:bg-white/10
              "
            >

              <div
                className="
                  text-lg
                  font-bold
                  text-[#ffd3da]
                "
              >
                {notEnteredRoomCount}
              </div>


              <div
                className="
                  mt-0.5
                  text-[11px]
                  text-slate-400
                "
              >
                Chưa nhập
              </div>

            </button>


            <button
              type="button"
              onClick={
                () =>
                  setReadingStatusFilter(
                    "ENTERED"
                  )
              }
              className="
                rounded-2xl
                bg-white/5
                px-4
                py-3
                text-left
                active:bg-white/10
              "
            >

              <div
                className="
                  text-lg
                  font-bold
                  text-emerald-300
                "
              >
                {enteredRoomCount}
              </div>


              <div
                className="
                  mt-0.5
                  text-[11px]
                  text-slate-400
                "
              >
                Đã nhập
              </div>

            </button>

          </div>

        </section>


        {/* ==========================
            PERIOD
        ========================== */}

        <div
          className="
            grid
            grid-cols-2
            gap-2
            rounded-2xl
            border
            border-[#ebe6dd]
            bg-white
            p-3
          "
        >

          <div>

            <label
              className="
                mb-1.5
                block
                text-[11px]
                font-medium
                text-slate-500
              "
            >
              Tháng
            </label>


            <select
              value={
                month
              }
              onChange={
                (
                  event
                ) =>
                  setMonth(
                    Number(
                      event.target.value
                    )
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
                text-base
                text-[#172033]
                outline-none
                focus:border-[#d6a64c]
              "
            >

              {Array.from(
                {
                  length: 12,
                },
                (
                  _,
                  index
                ) =>
                  index + 1
              ).map(
                (
                  value
                ) => (

                  <option
                    key={
                      value
                    }
                    value={
                      value
                    }
                  >
                    Tháng {value}
                  </option>

                )
              )}

            </select>

          </div>


          <div>

            <label
              className="
                mb-1.5
                block
                text-[11px]
                font-medium
                text-slate-500
              "
            >
              Năm
            </label>


            <Input
              type="number"
              value={
                year
              }
              min="2020"
              max="2100"
              onChange={
                (
                  event
                ) =>
                  setYear(
                    Number(
                      event.target.value
                    )
                  )
              }
              className="
                h-11
                rounded-xl
                border-[#ddd9cf]
                text-base
              "
            />

          </div>

        </div>


        {/* ==========================
            MESSAGES
        ========================== */}

        {error && (

          <div
            className="
              flex
              items-start
              gap-2
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

            <AlertCircle
              size={17}
              className="
                mt-0.5
                shrink-0
              "
            />

            {error}

          </div>

        )}


        {success && (

          <div
            className="
              flex
              items-start
              gap-2
              rounded-2xl
              border
              border-emerald-200
              bg-emerald-50
              px-4
              py-3
              text-sm
              text-emerald-700
            "
          >

            <CheckCircle2
              size={17}
              className="
                mt-0.5
                shrink-0
              "
            />

            {success}

          </div>

        )}


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
              "Tìm phòng..."
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
            STATUS FILTER
        ========================== */}

        <div
          className="
            flex
            gap-2
            overflow-x-auto
            pb-1
          "
        >

          <MobileMeterFilterChip
            active={
              readingStatusFilter
              === "ALL"
            }
            label="Tất cả"
            onClick={
              () =>
                setReadingStatusFilter(
                  "ALL"
                )
            }
          />


          <MobileMeterFilterChip
            active={
              readingStatusFilter
              === "NOT_ENTERED"
            }
            label={`Chưa nhập (${notEnteredRoomCount})`}
            onClick={
              () =>
                setReadingStatusFilter(
                  "NOT_ENTERED"
                )
            }
            danger
          />


          <MobileMeterFilterChip
            active={
              readingStatusFilter
              === "ENTERED"
            }
            label={`Đã nhập (${enteredRoomCount})`}
            onClick={
              () =>
                setReadingStatusFilter(
                  "ENTERED"
                )
            }
            success
          />

        </div>


        {/* ==========================
            COMPACT FILTERS
        ========================== */}

        <div
          className="
            grid
            grid-cols-[1fr_auto]
            gap-2
          "
        >

          <div
            className="
              relative
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

              <option value="ALL">
                Tất cả tầng
              </option>


              {rooms.some(
                (
                  room
                ) =>
                  room.floor
                  === null
              ) && (

                <option value="NONE">
                  Chưa có tầng
                </option>

              )}


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

          </div>


          <button
            type="button"
            onClick={
              () =>
                setOccupiedOnly(
                  (
                    current
                  ) =>
                    !current
                )
            }
            aria-pressed={
              occupiedOnly
            }
            className={
              occupiedOnly

                ? `
                  h-10
                  shrink-0
                  rounded-xl
                  border
                  border-[#e44763]
                  bg-[#fcecef]
                  px-3
                  text-xs
                  font-semibold
                  text-[#b92f49]
                `

                : `
                  h-10
                  shrink-0
                  rounded-xl
                  border
                  border-[#ddd9cf]
                  bg-white
                  px-3
                  text-xs
                  font-medium
                  text-slate-600
                `
            }
          >
            Đang thuê
          </button>

        </div>


        {/* ==========================
            LIST HEADER
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


            <div
              className="
                mt-0.5
                text-xs
                text-slate-500
              "
            >
              {filteredRooms.length}
              {" "}
              phòng đang hiển thị
            </div>

          </div>


          {(
            search
            ||
            floorFilter !== "ALL"
            ||
            readingStatusFilter !== "ALL"
            ||
            occupiedOnly
          ) && (

            <button
              type="button"
              onClick={
                handleResetFilters
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

            Đang tải số điện...

          </div>

        ) : filteredRooms.length === 0 ? (

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

            <Search
              size={22}
              className="
                mx-auto
                text-slate-400
              "
            />


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
              Thử thay đổi từ khóa hoặc bộ lọc.
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

            {filteredRooms.map(
              (
                room
              ) => {

                const existing =
                  readingMap.get(
                    room.id
                  );


                const previous =
                  previousReadingMap.get(
                    room.id
                  );


                const inputValue =
                  inputs[
                    room.id
                  ]
                  ?? "";


                const previewConsumption =
                  getPreviewConsumption(
                    room.id
                  );


                const isOccupied =
                  room.status
                  === "OCCUPIED";


                if (
                  existing
                ) {

                  return (

                    <article
                      key={
                        room.id
                      }
                      className="
                        overflow-hidden
                        rounded-2xl
                        border
                        border-[#dce9e2]
                        bg-white
                      "
                    >

                      <div
                        className="
                          h-1
                          bg-emerald-500
                        "
                      />


                      <div
                        className="
                          p-4
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

                          <div
                            className="
                              min-w-0
                            "
                          >

                            <div
                              className="
                                flex
                                items-center
                                gap-2
                              "
                            >

                              <strong
                                className="
                                  text-base
                                  text-[#172033]
                                "
                              >
                                {room.room_code}
                              </strong>


                              <span
                                className="
                                  rounded-full
                                  bg-emerald-50
                                  px-2
                                  py-0.5
                                  text-[10px]
                                  font-semibold
                                  text-emerald-700
                                "
                              >
                                Đã nhập
                              </span>

                            </div>


                            <div
                              className="
                                mt-1
                                text-xs
                                text-slate-500
                              "
                            >
                              {formatFloor(
                                room.floor
                              )}
                              {" • "}
                              {isOccupied
                                ? "Đang thuê"
                                : "Trống"}
                            </div>

                          </div>


                          <CheckCircle2
                            size={20}
                            className="
                              shrink-0
                              text-emerald-600
                            "
                          />

                        </div>


                        <div
                          className="
                            mt-4
                            grid
                            grid-cols-3
                            divide-x
                            divide-[#eeeae2]
                            rounded-xl
                            bg-[#f8faf9]
                            py-3
                          "
                        >

                          <div
                            className="
                              px-2
                              text-center
                            "
                          >

                            <div
                              className="
                                text-[10px]
                                text-slate-400
                              "
                            >
                              Số cũ
                            </div>

                            <strong
                              className="
                                mt-1
                                block
                                text-sm
                                text-[#172033]
                              "
                            >
                              {existing.old_reading}
                            </strong>

                          </div>


                          <div
                            className="
                              px-2
                              text-center
                            "
                          >

                            <div
                              className="
                                text-[10px]
                                text-slate-400
                              "
                            >
                              Số mới
                            </div>

                            <strong
                              className="
                                mt-1
                                block
                                text-sm
                                text-[#172033]
                              "
                            >
                              {existing.new_reading}
                            </strong>

                          </div>


                          <div
                            className="
                              px-2
                              text-center
                            "
                          >

                            <div
                              className="
                                text-[10px]
                                text-slate-400
                              "
                            >
                              Tiêu thụ
                            </div>

                            <strong
                              className="
                                mt-1
                                block
                                text-sm
                                text-[#172033]
                              "
                            >
                              {existing.consumption} kWh
                            </strong>

                          </div>

                        </div>

                      </div>

                    </article>

                  );

                }


                return (

                  <article
                    key={
                      room.id
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
                      className="
                        h-1
                        bg-[#d6a64c]
                      "
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
                              flex
                              items-center
                              gap-2
                            "
                          >

                            <strong
                              className="
                                text-lg
                                text-[#172033]
                              "
                            >
                              {room.room_code}
                            </strong>


                            <span
                              className="
                                rounded-full
                                bg-red-50
                                px-2
                                py-0.5
                                text-[10px]
                                font-semibold
                                text-red-600
                              "
                            >
                              Chưa nhập
                            </span>

                          </div>


                          <div
                            className="
                              mt-1
                              text-xs
                              text-slate-500
                            "
                          >
                            {formatFloor(
                              room.floor
                            )}
                          </div>

                        </div>


                        <span
                          className={
                            isOccupied

                              ? `
                                rounded-full
                                bg-[#fcecef]
                                px-2.5
                                py-1
                                text-[11px]
                                font-semibold
                                text-[#b92f49]
                              `

                              : `
                                rounded-full
                                bg-[#fff8e9]
                                px-2.5
                                py-1
                                text-[11px]
                                font-semibold
                                text-[#8a6726]
                              `
                          }
                        >
                          {isOccupied
                            ? "Đang thuê"
                            : "Trống"}
                        </span>

                      </div>


                      <div
                        className="
                          mt-4
                          grid
                          grid-cols-2
                          gap-3
                        "
                      >

                        <div>

                          <label
                            className="
                              mb-1.5
                              block
                              text-[11px]
                              font-medium
                              text-slate-500
                            "
                          >
                            Số điện cũ
                          </label>


                          {previous ? (

                            <div
                              className="
                                flex
                                h-12
                                items-center
                                rounded-xl
                                border
                                border-[#ebe6dd]
                                bg-[#f8faf9]
                                px-3
                              "
                            >

                              <div>

                                <strong
                                  className="
                                    block
                                    text-base
                                    text-[#172033]
                                  "
                                >
                                  {previous.new_reading}
                                </strong>


                                <span
                                  className="
                                    text-[10px]
                                    text-slate-400
                                  "
                                >
                                  Tự động
                                </span>

                              </div>

                            </div>

                          ) : (

                            <Input
                              type="number"
                              min="0"
                              inputMode="decimal"
                              value={
                                oldInputs[
                                  room.id
                                ]
                                ?? ""
                              }
                              onChange={
                                (
                                  event
                                ) =>
                                  handleOldReadingChange(
                                    room.id,
                                    event.target.value
                                  )
                              }
                              placeholder="Số cũ"
                              className="
                                h-12
                                rounded-xl
                                border-[#ddd9cf]
                                text-base
                              "
                            />

                          )}

                        </div>


                        <div>

                          <label
                            className="
                              mb-1.5
                              block
                              text-[11px]
                              font-medium
                              text-slate-500
                            "
                          >
                            Số điện mới
                          </label>


                          <Input
                            type="number"
                            min="0"
                            inputMode="decimal"
                            value={
                              inputValue
                            }
                            onChange={
                              (
                                event
                              ) =>
                                handleReadingChange(
                                  room.id,
                                  event.target.value
                                )
                            }
                            placeholder="Số mới"
                            className="
                              h-12
                              rounded-xl
                              border-[#d6a64c]
                              bg-[#fffdf8]
                              text-base
                              font-semibold
                            "
                          />

                        </div>

                      </div>


                      <div
                        className="
                          mt-3
                          flex
                          items-center
                          justify-between
                          rounded-xl
                          border
                          border-[#ead9b7]
                          bg-[#fffaf0]
                          px-4
                          py-3
                        "
                      >

                        <span
                          className="
                            text-xs
                            font-medium
                            text-[#8a6726]
                          "
                        >
                          Tiêu thụ dự kiến
                        </span>


                        <strong
                          className={
                            previewConsumption !== null
                            &&
                            previewConsumption < 0

                              ? "text-sm text-red-600"

                              : "text-sm text-[#172033]"
                          }
                        >

                          {previewConsumption
                            ?? "-"}

                          {previewConsumption
                            !== null
                            &&
                            " kWh"}

                        </strong>

                      </div>

                    </div>

                  </article>

                );

              }
            )}

          </div>

        )}

      </div>


      {/* =====================================================
          DESKTOP - GIỮ NGUYÊN GIAO DIỆN CŨ
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
        pb-28
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
            gap-6
            lg:flex-row
            lg:items-center
            lg:justify-between
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

              <Zap
                size={16}
              />

              Rosehome Electricity

            </div>


            <h1
              className="
                text-2xl
                font-semibold
                tracking-tight
                md:text-3xl
              "
            >
              Chỉ số điện
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
              Nhập và theo dõi chỉ số điện
              hàng tháng cho từng phòng.
            </p>

          </div>


          <div
            className="
              rounded-xl
              border
              border-white/10
              bg-white/5
              px-5
              py-4
              backdrop-blur-sm
            "
          >

            <div
              className="
                text-xs
                font-medium
                uppercase
                tracking-[0.12em]
                text-slate-400
              "
            >
              Kỳ đang xem
            </div>


            <div
              className="
                mt-1
                text-xl
                font-semibold
                text-white
              "
            >
              Tháng {month}/{year}
            </div>


            <div
              className="
                mt-1
                text-xs
                text-[#d6a64c]
              "
            >
              Hoàn thành {completionPercentage}%
            </div>

          </div>

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

        <MeterSummaryCard
          title="Tổng phòng"
          value={
            String(
              rooms.length
            )
          }
          subtitle="Toàn bộ phòng"
          icon={
            Building2
          }
        />


        <MeterSummaryCard
          title="Đã nhập điện"
          value={
            String(
              enteredRoomCount
            )
          }
          subtitle={
            `${completionPercentage}% hoàn thành`
          }
          icon={
            CheckCircle2
          }
          success
        />


        <MeterSummaryCard
          title="Chưa nhập điện"
          value={
            String(
              notEnteredRoomCount
            )
          }
          subtitle={
            notEnteredRoomCount > 0
              ? "Cần nhập chỉ số"
              : "Đã hoàn thành"
          }
          icon={
            AlertCircle
          }
          danger={
            notEnteredRoomCount > 0
          }
        />


        <MeterSummaryCard
          title="Đang hiển thị"
          value={
            String(
              filteredRooms.length
            )
          }
          subtitle="Theo bộ lọc hiện tại"
          icon={
            Gauge
          }
          accent="gold"
        />

      </div>


      {/* =====================================================
          PERIOD
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
              flex
              flex-col
              gap-4
              lg:flex-row
              lg:items-end
              lg:justify-between
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
                Kỳ ghi điện
              </div>


              <p
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                Chọn tháng và năm cần nhập chỉ số điện.
              </p>

            </div>


            <div
              className="
                grid
                grid-cols-1
                gap-3
                sm:grid-cols-[180px_150px_auto]
              "
            >

              <div>

                <label
                  className="
                    mb-1.5
                    block
                    text-xs
                    font-medium
                    text-slate-500
                  "
                >
                  Tháng
                </label>


                <select
                  value={
                    month
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setMonth(
                        Number(
                          event.target.value
                        )
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
                    outline-none
                    focus:border-[#d6a64c]
                  "
                >

                  {Array.from(
                    {
                      length: 12,
                    },
                    (
                      _,
                      index
                    ) =>
                      index + 1
                  ).map(
                    (
                      value
                    ) => (

                      <option
                        key={
                          value
                        }
                        value={
                          value
                        }
                      >
                        Tháng {value}
                      </option>

                    )
                  )}

                </select>

              </div>


              <div>

                <label
                  className="
                    mb-1.5
                    block
                    text-xs
                    font-medium
                    text-slate-500
                  "
                >
                  Năm
                </label>


                <Input
                  type="number"
                  value={
                    year
                  }
                  min="2020"
                  max="2100"
                  onChange={
                    (
                      event
                    ) =>
                      setYear(
                        Number(
                          event.target.value
                        )
                      )
                  }
                  className="
                    h-11
                    rounded-xl
                    border-[#ddd9cf]
                  "
                />

              </div>


              <Button
                type="button"
                variant="outline"
                disabled={
                  loading
                }
                onClick={
                  loadMonth
                }
                className="
                  h-11
                  self-end
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

            </div>

          </div>

        </CardContent>

      </Card>


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
              xl:grid-cols-[minmax(280px,1fr)_180px_210px_auto_auto]
            "
          >

            <div
              className="relative"
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
                  "Tìm mã phòng hoặc mô tả..."
                className="
                  h-11
                  rounded-xl
                  border-[#ddd9cf]
                  pl-10
                "
              />

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


              {rooms.some(
                (
                  room
                ) =>
                  room.floor
                  === null
              ) && (

                <option value="NONE">
                  Chưa có tầng
                </option>

              )}


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
                  readingStatusFilter
                }
                onChange={
                  (
                    event
                  ) =>
                    setReadingStatusFilter(
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
                  Tất cả tình trạng nhập
                </option>

                <option value="ENTERED">
                  Đã nhập điện
                </option>

                <option value="NOT_ENTERED">
                  Chưa nhập điện
                </option>

              </select>

            </div>


            <label
              className="
                flex
                h-11
                cursor-pointer
                items-center
                gap-2
                rounded-xl
                border
                border-[#ddd9cf]
                bg-white
                px-4
                text-sm
                text-[#172033]
              "
            >

              <input
                type="checkbox"
                checked={
                  occupiedOnly
                }
                onChange={
                  (
                    event
                  ) =>
                    setOccupiedOnly(
                      event.target.checked
                    )
                }
                className="
                  h-4
                  w-4
                  accent-[#e44763]
                "
              />

              Chỉ phòng đang thuê

            </label>


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
              Phòng đang hiển thị
            </span>


            <strong
              className=
                "text-[#172033]"
            >
              {filteredRooms.length}
              {" / "}
              {rooms.length}
            </strong>

          </div>

        </CardContent>

      </Card>


      {/* =====================================================
          MESSAGES
      ===================================================== */}

      {error && (

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
            text-red-700
          "
        >

          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />

          {error}

        </div>

      )}


      {success && (

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
            text-emerald-700
          "
        >

          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0"
          />

          {success}

        </div>

      )}


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

            Đang tải số điện...

          </CardContent>

        </Card>

      ) : filteredRooms.length === 0 ? (

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
              Không tìm thấy phòng
            </strong>


            <p
              className="
                text-sm
                text-slate-500
              "
            >
              Không có phòng phù hợp với bộ lọc hiện tại.
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

        <>

          {/* =================================================
              DESKTOP TABLE
          ================================================= */}

          <Card
            className="
              hidden
              overflow-hidden
              rounded-2xl
              border-[#e9e2d8]
              shadow-sm
              md:block
            "
          >

            <CardContent
              className="p-0"
            >

              <div
                className="
                  overflow-x-auto
                "
              >

                <table
                  className="
                    w-full
                    min-w-[980px]
                    border-collapse
                    text-sm
                  "
                >

                  <thead
                    className=
                      "bg-[#faf9f6]"
                  >

                    <tr
                      className="
                        border-b
                        border-[#eeeae2]
                      "
                    >

                      <MeterTableHead>
                        Phòng
                      </MeterTableHead>

                      <MeterTableHead>
                        Tầng
                      </MeterTableHead>

                      <MeterTableHead>
                        Trạng thái
                      </MeterTableHead>

                      <MeterTableHead>
                        Tình trạng
                      </MeterTableHead>

                      <MeterTableHead>
                        Số cũ
                      </MeterTableHead>

                      <MeterTableHead>
                        Số mới
                      </MeterTableHead>

                      <MeterTableHead>
                        Tiêu thụ
                      </MeterTableHead>

                    </tr>

                  </thead>


                  <tbody>

                    {filteredRooms.map(
                      (
                        room
                      ) => {

                        const existing =
                          readingMap.get(
                            room.id
                          );


                        const previous =
                          previousReadingMap.get(
                            room.id
                          );


                        const inputValue =
                          inputs[
                            room.id
                          ]
                          ?? "";


                        const previewConsumption =
                          getPreviewConsumption(
                            room.id
                          );


                        const isOccupied =
                          room.status
                          === "OCCUPIED";


                        return (

                          <tr
                            key={
                              room.id
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
                                    h-9
                                    w-9
                                    items-center
                                    justify-center
                                    rounded-lg
                                    bg-[#eef1f5]
                                    text-[#20334d]
                                  "
                                >

                                  <Building2
                                    size={16}
                                  />

                                </div>


                                <strong
                                  className=
                                    "text-[#172033]"
                                >
                                  {room.room_code}
                                </strong>

                              </div>

                            </td>


                            <td
                              className="
                                px-5
                                py-4
                                text-slate-600
                              "
                            >
                              {formatFloor(
                                room.floor
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
                                  isOccupied

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

                                {isOccupied
                                  ? "Đang thuê"
                                  : "Trống"}

                              </Badge>

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
                                  existing

                                    ? `
                                      border-emerald-200
                                      bg-emerald-50
                                      text-emerald-700
                                    `

                                    : `
                                      border-red-200
                                      bg-red-50
                                      text-red-700
                                    `
                                }
                              >

                                {existing
                                  ? "Đã nhập"
                                  : "Chưa nhập"}

                              </Badge>

                            </td>


                            <td
                              className="
                                px-5
                                py-4
                              "
                            >

                              {existing ? (

                                <strong
                                  className=
                                    "text-[#172033]"
                                >
                                  {existing.old_reading}
                                </strong>

                              ) : previous ? (

                                <div>

                                  <strong
                                    className=
                                      "text-[#172033]"
                                  >
                                    {previous.new_reading}
                                  </strong>


                                  <div
                                    className="
                                      mt-1
                                      text-[11px]
                                      text-slate-400
                                    "
                                  >
                                    Tự động
                                  </div>

                                </div>

                              ) : (

                                <Input
                                  type="number"
                                  min="0"
                                  value={
                                    oldInputs[
                                      room.id
                                    ]
                                    ?? ""
                                  }
                                  onChange={
                                    (
                                      event
                                    ) =>
                                      handleOldReadingChange(
                                        room.id,
                                        event.target.value
                                      )
                                  }
                                  placeholder=
                                    "Số cũ"
                                  className="
                                    h-9
                                    w-28
                                    rounded-lg
                                    border-[#ddd9cf]
                                  "
                                />

                              )}

                            </td>


                            <td
                              className="
                                px-5
                                py-4
                              "
                            >

                              <Input
                                type="number"
                                min="0"
                                value={
                                  inputValue
                                }
                                disabled={
                                  Boolean(
                                    existing
                                  )
                                }
                                onChange={
                                  (
                                    event
                                  ) =>
                                    handleReadingChange(
                                      room.id,
                                      event.target.value
                                    )
                                }
                                placeholder=
                                  "Số mới"
                                className="
                                  h-9
                                  w-28
                                  rounded-lg
                                  border-[#ddd9cf]
                                "
                              />

                            </td>


                            <td
                              className="
                                px-5
                                py-4
                              "
                            >

                              <span
                                className={
                                  previewConsumption !== null
                                  &&
                                  previewConsumption < 0

                                    ? `
                                      font-semibold
                                      text-red-600
                                    `

                                    : `
                                      font-semibold
                                      text-[#172033]
                                    `
                                }
                              >

                                {previewConsumption
                                  ?? "-"}

                                {previewConsumption
                                  !== null
                                  &&
                                  " kWh"}

                              </span>

                            </td>

                          </tr>

                        );

                      }
                    )}

                  </tbody>

                </table>

              </div>

            </CardContent>

          </Card>


          {/* =================================================
              MOBILE
          ================================================= */}

          <div
            className="
              grid
              grid-cols-1
              gap-4
              md:hidden
            "
          >

            {filteredRooms.map(
              (
                room
              ) => {

                const existing =
                  readingMap.get(
                    room.id
                  );


                const previous =
                  previousReadingMap.get(
                    room.id
                  );


                const inputValue =
                  inputs[
                    room.id
                  ]
                  ?? "";


                const previewConsumption =
                  getPreviewConsumption(
                    room.id
                  );


                const isOccupied =
                  room.status
                  === "OCCUPIED";


                return (

                  <Card
                    key={
                      room.id
                    }
                    className="
                      overflow-hidden
                      rounded-2xl
                      border-[#e9e2d8]
                      shadow-sm
                    "
                  >

                    <div
                      className={
                        existing
                          ? "h-1 bg-emerald-500"
                          : "h-1 bg-[#d6a64c]"
                      }
                    />


                    <CardContent
                      className="p-0"
                    >

                      <div
                        className="
                          flex
                          items-start
                          justify-between
                          gap-3
                          border-b
                          border-[#eeeae2]
                          px-5
                          py-4
                        "
                      >

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
                            Phòng
                          </div>


                          <h2
                            className="
                              mt-1
                              text-xl
                              font-semibold
                              text-[#172033]
                            "
                          >
                            {room.room_code}
                          </h2>


                          <div
                            className="
                              mt-1
                              text-xs
                              text-slate-500
                            "
                          >
                            {formatFloor(
                              room.floor
                            )}
                          </div>

                        </div>


                        <Badge
                          variant="outline"
                          className={
                            isOccupied

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
                          {isOccupied
                            ? "Đang thuê"
                            : "Trống"}
                        </Badge>

                      </div>


                      <div
                        className="
                          space-y-4
                          px-5
                          py-4
                        "
                      >

                        <div
                          className="
                            flex
                            items-center
                            justify-between
                          "
                        >

                          <span
                            className="
                              text-sm
                              text-slate-500
                            "
                          >
                            Tình trạng nhập
                          </span>


                          <Badge
                            variant="outline"
                            className={
                              existing

                                ? `
                                  border-emerald-200
                                  bg-emerald-50
                                  text-emerald-700
                                `

                                : `
                                  border-red-200
                                  bg-red-50
                                  text-red-700
                                `
                            }
                          >
                            {existing
                              ? "Đã nhập"
                              : "Chưa nhập"}
                          </Badge>

                        </div>


                        {existing ? (

                          <MeterMobileValue
                            label="Số cũ"
                            value={
                              String(
                                existing.old_reading
                              )
                            }
                          />

                        ) : previous ? (

                          <MeterMobileValue
                            label="Số cũ"
                            value={
                              `${previous.new_reading} (tự động)`
                            }
                          />

                        ) : (

                          <div>

                            <label
                              className="
                                mb-1.5
                                block
                                text-xs
                                font-medium
                                text-slate-500
                              "
                            >
                              Số cũ ban đầu
                            </label>


                            <Input
                              type="number"
                              min="0"
                              value={
                                oldInputs[
                                  room.id
                                ]
                                ?? ""
                              }
                              onChange={
                                (
                                  event
                                ) =>
                                  handleOldReadingChange(
                                    room.id,
                                    event.target.value
                                  )
                              }
                              placeholder=
                                "Nhập số cũ"
                              className="
                                h-11
                                rounded-xl
                                border-[#ddd9cf]
                              "
                            />

                          </div>

                        )}


                        <div>

                          <label
                            className="
                              mb-1.5
                              block
                              text-xs
                              font-medium
                              text-slate-500
                            "
                          >
                            Số điện mới
                          </label>


                          <Input
                            type="number"
                            min="0"
                            value={
                              inputValue
                            }
                            disabled={
                              Boolean(
                                existing
                              )
                            }
                            onChange={
                              (
                                event
                              ) =>
                                handleReadingChange(
                                  room.id,
                                  event.target.value
                                )
                            }
                            placeholder=
                              "Nhập số điện mới"
                            className="
                              h-11
                              rounded-xl
                              border-[#ddd9cf]
                            "
                          />

                        </div>


                        <div
                          className="
                            flex
                            items-center
                            justify-between
                            rounded-xl
                            border
                            border-[#ead9b7]
                            bg-[#fffaf0]
                            px-4
                            py-3
                          "
                        >

                          <span
                            className="
                              text-sm
                              font-medium
                              text-[#8a6726]
                            "
                          >
                            Tiêu thụ
                          </span>


                          <strong
                            className={
                              previewConsumption !== null
                              &&
                              previewConsumption < 0

                                ? "text-red-600"

                                : "text-[#172033]"
                            }
                          >

                            {previewConsumption
                              ?? "-"}

                            {previewConsumption
                              !== null
                              &&
                              " kWh"}

                          </strong>

                        </div>

                      </div>

                    </CardContent>

                  </Card>

                );

              }
            )}

          </div>

        </>

      )}


      {/* =====================================================
          SAVE
      ===================================================== */}

      <div
        className="
          fixed
          bottom-0
          left-0
          right-0
          z-30
          border-t
          border-[#e9e2d8]
          bg-white/95
          px-4
          py-3
          shadow-[0_-8px_30px_rgba(18,32,51,0.08)]
          backdrop-blur
          md:static
          md:rounded-2xl
          md:border
          md:px-5
          md:shadow-sm
        "
      >

        <div
          className="
            mx-auto
            flex
            max-w-full
            flex-col
            gap-3
            sm:flex-row
            sm:items-center
            sm:justify-between
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
              Lưu chỉ số điện tháng {month}/{year}
            </div>


            <div
              className="
                mt-1
                text-xs
                text-slate-500
              "
            >
              Chỉ các phòng chưa được lưu và có số mới sẽ được gửi lên hệ thống.
            </div>

          </div>


          <Button
            type="button"
            disabled={
              saving
              ||
              loading
            }
            onClick={
              handleSave
            }
            className="
              h-11
              rounded-xl
              bg-[#d6a64c]
              px-6
              font-semibold
              text-[#172033]
              hover:bg-[#e0b85f]
            "
          >

            {saving ? (

              <RefreshCw
                className=
                  "animate-spin"
              />

            ) : (

              <Save />

            )}


            {saving
              ? "Đang lưu..."
              : "Lưu số điện"}

          </Button>

        </div>

      </div>

    </div>

      </div>


      {/* =====================================================
          MOBILE SAVE BAR
      ===================================================== */}

      <div
        className="
          md:hidden
          fixed
          left-0
          right-0
          z-40
          border-t
          border-[#e9e2d8]
          bg-white/95
          px-4
          py-3
          shadow-[0_-8px_30px_rgba(18,32,51,0.08)]
          backdrop-blur
        "
        style={{
          bottom:
            "calc(4rem + env(safe-area-inset-bottom))",
        }}
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
              min-w-0
              flex-1
            "
          >

            <div
              className="
                text-sm
                font-semibold
                text-[#172033]
              "
            >
              {pendingSaveCount > 0
                ? `${pendingSaveCount} phòng chờ lưu`
                : "Chưa có thay đổi"}
            </div>


            <div
              className="
                mt-0.5
                truncate
                text-[11px]
                text-slate-500
              "
            >
              Tháng {month}/{year}
            </div>

          </div>


          <Button
            type="button"
            disabled={
              saving
              ||
              loading
            }
            onClick={
              handleSave
            }
            className="
              h-11
              shrink-0
              rounded-xl
              bg-[#d6a64c]
              px-4
              font-semibold
              text-[#172033]
              hover:bg-[#e0b85f]
            "
          >

            {saving ? (

              <RefreshCw
                className=
                  "animate-spin"
              />

            ) : (

              <Save />

            )}


            {saving
              ? "Đang lưu..."
              : "Lưu"}

          </Button>

        </div>

      </div>

    </>

  );

}


// =========================================================
// MOBILE FILTER CHIP
// =========================================================

function MobileMeterFilterChip({
  active,
  label,
  onClick,
  success = false,
  danger = false,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  success?: boolean;
  danger?: boolean;
}) {

  let activeClass =
    "bg-[#122033] text-white border-[#122033]";


  if (
    active
    &&
    success
  ) {

    activeClass =
      "bg-emerald-600 text-white border-emerald-600";

  }


  if (
    active
    &&
    danger
  ) {

    activeClass =
      "bg-[#e44763] text-white border-[#e44763]";

  }


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
            border
            px-4
            text-xs
            font-semibold
            ${activeClass}
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
// SUMMARY CARD
// =========================================================

function MeterSummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
  success = false,
  danger = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  accent?: "gold";
  success?: boolean;
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

                : success

                  ? `
                    mt-2
                    text-2xl
                    font-semibold
                    text-emerald-600
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

              : success

                ? `
                  flex
                  h-11
                  w-11
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-emerald-50
                  text-emerald-600
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


// =========================================================
// TABLE HEAD
// =========================================================

function MeterTableHead({
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


// =========================================================
// MOBILE VALUE
// =========================================================

function MeterMobileValue({
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
        gap-3
        border-b
        border-[#f0ece5]
        pb-3
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
          text-sm
          text-[#172033]
        "
      >
        {value}
      </strong>

    </div>

  );

}


export default MeterReadings;