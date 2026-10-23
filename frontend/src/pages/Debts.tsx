import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router";

import {
  AlertCircle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  FileSpreadsheet,
  ReceiptText,
  RefreshCw,
  Search,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import {
  utils,
  writeFileXLSX,
} from "xlsx";

import {
  apiGet,
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
  DebtReport,
  DebtReportItem,
} from "../types/report";

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


function getPaymentStatusText(
  status: string
) {

  if (
    status === "UNPAID"
  ) {
    return "Chưa thanh toán";
  }


  if (
    status === "PARTIALLY_PAID"
  ) {
    return "Thanh toán một phần";
  }


  if (
    status === "PAID"
  ) {
    return "Đã thanh toán";
  }


  return status;

}


function formatExportDate(
  date: Date
) {

  return date.toLocaleString(
    "vi-VN"
  );

}


function formatFileDate(
  date: Date
) {

  const year =
    date.getFullYear();


  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );


  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );


  return `${year}-${month}-${day}`;

}


// =========================================================
// DEBTS
// =========================================================

function Debts() {

  const [
    report,
    setReport,
  ] = useState<
    DebtReport | null
  >(null);


  const [
    rooms,
    setRooms,
  ] = useState<Room[]>([]);


  const [
    search,
    setSearch,
  ] = useState("");


  const [
    floorFilter,
    setFloorFilter,
  ] = useState("ALL");


  const [
    yearFilter,
    setYearFilter,
  ] = useState(() => {
    const value = Number(
      new URLSearchParams(window.location.search).get("year")
    );
    return Number.isInteger(value) && value >= 2020 && value <= 2100
      ? String(value)
      : "ALL";
  });


  const [
    monthFilter,
    setMonthFilter,
  ] = useState(() => {
    const value = Number(
      new URLSearchParams(window.location.search).get("month")
    );
    return Number.isInteger(value) && value >= 1 && value <= 12
      ? String(value)
      : "ALL";
  });


  const [
    paymentStatusFilter,
    setPaymentStatusFilter,
  ] = useState("ALL");


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
    exporting,
    setExporting,
  ] = useState(
    false
  );


  // =========================================================
  // LOAD
  // =========================================================

  async function loadDebts() {

    try {

      setLoading(
        true
      );


      setError("");


      const [
        data,
        roomData,
      ] =
        await Promise.all([

          apiGet<DebtReport>(
            "/reports/debts"
          ),

          apiGet<Room[]>(
            "/rooms"
          ),

        ]);


      setReport(
        data
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
          "Không thể tải công nợ."
        );

      }


    } finally {

      setLoading(
        false
      );

    }

  }


  useEffect(
    () => {

      loadDebts();

    },
    []
  );


  // =========================================================
  // ROOM / FILTER OPTIONS
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


  const yearOptions =
    useMemo(
      () => {

        if (
          !report
        ) {
          return [];
        }


        return Array.from(
          new Set(
            report.items.map(
              (
                item
              ) =>
                item.year
            )
          )
        ).sort(
          (
            a,
            b
          ) =>
            b - a
        );

      },
      [
        report,
      ]
    );


  // =========================================================
  // FILTER
  // =========================================================

  const filteredItems =
    useMemo(
      () => {

        if (
          !report
        ) {
          return [];
        }


        const keyword =
          search
            .trim()
            .toLowerCase();


        return report.items.filter(
          (
            item:
              DebtReportItem
          ) => {

            const period =
              `${item.month}/${item.year}`;


            const room =
              roomMap.get(
                item.room_id
              );


            const matchesSearch =
              !keyword
              ||
              item.room_code
                .toLowerCase()
                .includes(
                  keyword
                )
              ||
              String(
                item.invoice_id
              ).includes(
                keyword
              )
              ||
              period.includes(
                keyword
              );


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


            const matchesYear =
              yearFilter
                === "ALL"
              ||
              String(
                item.year
              )
              ===
              yearFilter;


            const matchesMonth =
              monthFilter
                === "ALL"
              ||
              String(
                item.month
              )
              ===
              monthFilter;


            const matchesPaymentStatus =
              paymentStatusFilter
                === "ALL"
              ||
              item.payment_status
              ===
              paymentStatusFilter;


            return (
              matchesSearch
              &&
              matchesFloor
              &&
              matchesYear
              &&
              matchesMonth
              &&
              matchesPaymentStatus
            );

          }
        );

      },
      [
        report,
        search,
        floorFilter,
        yearFilter,
        monthFilter,
        paymentStatusFilter,
        roomMap,
      ]
    );


  function handleResetFilters() {

    setSearch("");

    setFloorFilter(
      "ALL"
    );

    setYearFilter(
      "ALL"
    );

    setMonthFilter(
      "ALL"
    );

    setPaymentStatusFilter(
      "ALL"
    );

  }


  // =========================================================
  // SUMMARY
  // =========================================================

  const debtRoomCount =
    useMemo(
      () => {

        if (
          !report
        ) {
          return 0;
        }


        return new Set(
          report.items.map(
            (
              item
            ) =>
              item.room_id
          )
        ).size;

      },
      [
        report,
      ]
    );


  const exportTotalDebt =
    useMemo(
      () =>

        filteredItems.reduce(
          (
            total,
            item
          ) =>
            total
            +
            item.remaining_amount,

          0
        ),

      [
        filteredItems,
      ]
    );


  const exportRoomCount =
    useMemo(
      () =>

        new Set(
          filteredItems.map(
            (
              item
            ) =>
              item.room_id
          )
        ).size,

      [
        filteredItems,
      ]
    );


  // =========================================================
  // EXPORT EXCEL
  // =========================================================

  function handleExportExcel() {

    if (
      !report
      ||
      filteredItems.length
      === 0
    ) {

      window.alert(
        "Không có dữ liệu công nợ để xuất Excel."
      );

      return;

    }


    try {

      setExporting(
        true
      );


      const now =
        new Date();


      const rows:
        (
          string
          |
          number
        )[][] = [

          [
            "BÁO CÁO CÔNG NỢ",
          ],

          [
            "Ngày xuất",
            formatExportDate(
              now
            ),
          ],

          [
            "Tổng công nợ",
            exportTotalDebt,
          ],

          [
            "Số hóa đơn còn nợ",
            filteredItems.length,
          ],

          [
            "Số phòng đang nợ",
            exportRoomCount,
          ],

          [],

          [
            "STT",
            "Phòng",
            "Mã hóa đơn",
            "Kỳ hóa đơn",
            "Tổng bill",
            "Đã trả",
            "Còn nợ",
            "Trạng thái",
          ],

          ...filteredItems.map(
            (
              item,
              index
            ) => [

              index + 1,

              item.room_code,

              item.invoice_id,

              `${item.month}/${item.year}`,

              item.invoice_total,

              item.total_paid,

              item.remaining_amount,

              getPaymentStatusText(
                item.payment_status
              ),

            ]
          ),

        ];


      const worksheet =
        utils.aoa_to_sheet(
          rows
        );


      worksheet["!merges"] = [

        {
          s: {
            r: 0,
            c: 0,
          },

          e: {
            r: 0,
            c: 7,
          },
        },

      ];


      worksheet["!cols"] = [

        {
          wch: 7,
        },

        {
          wch: 14,
        },

        {
          wch: 14,
        },

        {
          wch: 14,
        },

        {
          wch: 18,
        },

        {
          wch: 18,
        },

        {
          wch: 18,
        },

        {
          wch: 24,
        },

      ];


      if (
        worksheet["B3"]
      ) {

        worksheet["B3"].z =
          '#,##0 "đ"';

      }


      const firstDataRow =
        8;


      const lastDataRow =
        firstDataRow
        +
        filteredItems.length
        -
        1;


      for (
        let row =
          firstDataRow;

        row
        <=
        lastDataRow;

        row += 1
      ) {

        [
          "E",
          "F",
          "G",
        ].forEach(
          (
            column
          ) => {

            const cell =
              worksheet[
                `${column}${row}`
              ];


            if (
              cell
            ) {

              cell.z =
                '#,##0 "đ"';

            }

          }
        );

      }


      const workbook =
        utils.book_new();


      utils.book_append_sheet(
        workbook,
        worksheet,
        "Công nợ"
      );


      const fileName =
        `Bao_cao_cong_no_${formatFileDate(now)}.xlsx`;


      writeFileXLSX(
        workbook,
        fileName
      );


    } catch (err) {

      console.error(
        err
      );


      window.alert(
        "Không thể xuất file Excel."
      );


    } finally {

      setExporting(
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
        space-y-6
        pb-10
      "
    >

      {/* =====================================================
          MOBILE
      ===================================================== */}

      <div
        className="
          space-y-4
          md:hidden
        "
      >

        {/* MOBILE HEADER */}

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
                tracking-[0.16em]
                text-[#9a762f]
              "
            >
              Rosehome Debt Control
            </div>


            <h1
              className="
                mt-1
                text-2xl
                font-semibold
                tracking-tight
                text-[#172033]
              "
            >
              Công nợ
            </h1>


            <p
              className="
                mt-1
                text-sm
                text-slate-500
              "
            >
              Theo dõi các khoản còn phải thu
            </p>

          </div>


          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={
              loading
            }
            onClick={
              loadDebts
            }
            className="
              h-10
              w-10
              rounded-xl
              border-[#ddd8ce]
              bg-white
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

          </Button>

        </div>


        {/* MOBILE LOADING / ERROR */}

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
              size={18}
              className=
                "animate-spin"
            />

            Đang tải công nợ...

          </div>

        ) : error ? (

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
              py-4
              text-sm
              text-red-700
            "
          >

            <AlertCircle
              size={18}
              className=
                "mt-0.5 shrink-0"
            />

            {error}

          </div>

        ) : !report ? (

          <div
            className="
              rounded-2xl
              border
              border-[#e9e2d8]
              bg-white
              px-4
              py-10
              text-center
              text-sm
              text-slate-500
            "
          >
            Không có dữ liệu công nợ.
          </div>

        ) : (

          <>

            {/* MOBILE TOTAL HERO */}

            <div
              className="
                overflow-hidden
                rounded-2xl
                bg-[#122033]
                p-5
                text-white
                shadow-[0_14px_36px_rgba(18,32,51,0.14)]
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
                      font-medium
                      text-slate-400
                    "
                  >
                    Tổng công nợ
                  </div>


                  <div
                    className={
                      report.total_debt > 0

                        ? `
                          mt-1
                          text-2xl
                          font-semibold
                          tracking-tight
                          text-[#ffb7c4]
                        `

                        : `
                          mt-1
                          text-2xl
                          font-semibold
                          tracking-tight
                          text-emerald-300
                        `
                    }
                  >
                    {formatMoney(
                      report.total_debt
                    )}
                  </div>

                </div>


                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-white/10
                    text-[#d6a64c]
                  "
                >

                  <WalletCards
                    size={19}
                  />

                </div>

              </div>


              <div
                className="
                  mt-5
                  grid
                  grid-cols-3
                  gap-2
                "
              >

                <MobileDebtMiniStat
                  label="Hóa đơn nợ"
                  value={
                    String(
                      report.debt_invoice_count
                    )
                  }
                />


                <MobileDebtMiniStat
                  label="Phòng nợ"
                  value={
                    String(
                      debtRoomCount
                    )
                  }
                />


                <MobileDebtMiniStat
                  label="Đang xem"
                  value={
                    String(
                      filteredItems.length
                    )
                  }
                />

              </div>

            </div>


            {/* MOBILE ACTIONS */}

            <div
              className="
                grid
                grid-cols-2
                gap-2
              "
            >

              <Button
                type="button"
                variant="outline"
                onClick={
                  loadDebts
                }
                disabled={
                  loading
                }
                className="
                  h-10
                  rounded-xl
                  border-[#ddd8ce]
                  bg-white
                "
              >

                <RefreshCw
                  size={16}
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
                onClick={
                  handleExportExcel
                }
                disabled={
                  loading
                  ||
                  exporting
                  ||
                  filteredItems.length
                  === 0
                }
                className="
                  h-10
                  rounded-xl
                  bg-[#d6a64c]
                  text-[#172033]
                  hover:bg-[#e0b85f]
                "
              >

                {exporting ? (

                  <RefreshCw
                    size={16}
                    className=
                      "animate-spin"
                  />

                ) : (

                  <FileSpreadsheet
                    size={16}
                  />

                )}


                {exporting
                  ? "Đang xuất"
                  : "Xuất Excel"}

              </Button>

            </div>


            {/* MOBILE SEARCH + FILTERS */}

            <div
              className="
                rounded-2xl
                border
                border-[#e9e2d8]
                bg-white
                p-4
                shadow-sm
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
                    "Tìm phòng, hóa đơn, tháng/năm..."
                  className="
                    h-11
                    rounded-xl
                    border-[#ddd9cf]
                    pl-10
                  "
                />

              </div>


              <div
                className="
                  mt-3
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
                    h-10
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
                    paymentStatusFilter
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setPaymentStatusFilter(
                        event.target.value
                      )
                  }
                  className="
                    h-10
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
                    Tất cả trạng thái
                  </option>

                  <option value="UNPAID">
                    Chưa thanh toán
                  </option>

                  <option value="PARTIALLY_PAID">
                    Thanh toán một phần
                  </option>

                </select>


                <select
                  value={
                    monthFilter
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setMonthFilter(
                        event.target.value
                      )
                  }
                  className="
                    h-10
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
                    Tất cả tháng
                  </option>

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
                      item
                    ) => (

                      <option
                        key={
                          item
                        }
                        value={
                          String(
                            item
                          )
                        }
                      >
                        Tháng {item}
                      </option>

                    )
                  )}

                </select>


                <select
                  value={
                    yearFilter
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setYearFilter(
                        event.target.value
                      )
                  }
                  className="
                    h-10
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
                    Tất cả năm
                  </option>

                  {yearOptions.map(
                    (
                      item
                    ) => (

                      <option
                        key={
                          item
                        }
                        value={
                          String(
                            item
                          )
                        }
                      >
                        {item}
                      </option>

                    )
                  )}

                </select>

              </div>


              <div
                className="
                  mt-3
                  flex
                  items-center
                  justify-between
                  gap-3
                  text-xs
                  text-slate-500
                "
              >

                <span>
                  {filteredItems.length}
                  {" / "}
                  {report.items.length}
                  {" hóa đơn"}
                </span>


                {(search
                  ||
                  floorFilter !== "ALL"
                  ||
                  yearFilter !== "ALL"
                  ||
                  monthFilter !== "ALL"
                  ||
                  paymentStatusFilter !== "ALL") && (

                  <button
                    type="button"
                    onClick={
                      handleResetFilters
                    }
                    className="
                      font-semibold
                      text-[#b92f49]
                    "
                  >
                    Đặt lại
                  </button>

                )}

              </div>

            </div>


            {/* MOBILE CONTENT */}

            {report.items.length === 0 ? (

              <div
                className="
                  flex
                  min-h-52
                  flex-col
                  items-center
                  justify-center
                  rounded-2xl
                  border
                  border-emerald-200
                  bg-emerald-50/50
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
                    bg-emerald-100
                    text-emerald-600
                  "
                >

                  <CheckCircle2
                    size={22}
                  />

                </div>


                <strong
                  className="
                    mt-4
                    text-sm
                    text-emerald-800
                  "
                >
                  Không có công nợ
                </strong>


                <p
                  className="
                    mt-1
                    text-xs
                    leading-5
                    text-emerald-700
                  "
                >
                  Tất cả hóa đơn đã phát hành hiện đã được thanh toán đủ.
                </p>

              </div>

            ) : filteredItems.length === 0 ? (

              <div
                className="
                  flex
                  min-h-44
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

                <Search
                  size={22}
                  className=
                    "text-slate-400"
                />


                <strong
                  className="
                    mt-3
                    text-sm
                    text-[#172033]
                  "
                >
                  Không tìm thấy công nợ
                </strong>


                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-500
                  "
                >
                  Không có hóa đơn phù hợp với từ khóa hoặc bộ lọc hiện tại.
                </p>

              </div>

            ) : (

              <div
                className="
                  space-y-3
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

                  <div>

                    <h2
                      className="
                        text-base
                        font-semibold
                        text-[#172033]
                      "
                    >
                      Danh sách công nợ
                    </h2>


                    <p
                      className="
                        mt-0.5
                        text-xs
                        text-slate-500
                      "
                    >
                      Ưu tiên kiểm tra số tiền còn phải thu
                    </p>

                  </div>


                  <Badge
                    variant="outline"
                    className="
                      border-red-200
                      bg-red-50
                      text-red-700
                    "
                  >
                    {filteredItems.length}
                  </Badge>

                </div>


                {filteredItems.map(
                  (
                    item
                  ) => (

                    <MobileDebtCard
                      key={
                        item.invoice_id
                      }
                      item={
                        item
                      }
                    />

                  )
                )}

              </div>

            )}

          </>

        )}

      </div>


      {/* =====================================================
          DESKTOP
      ===================================================== */}

      <div
        className="
          hidden
          space-y-6
          md:block
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

              <WalletCards
                size={16}
              />

              Rosehome Debt Control

            </div>


            <h1
              className="
                text-2xl
                font-semibold
                tracking-tight
                md:text-3xl
              "
            >
              Công nợ
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
              Theo dõi các hóa đơn
              chưa được thanh toán đủ
              và số tiền còn phải thu.
            </p>

          </div>


          <div
            className="
              flex
              flex-col
              gap-2
              sm:flex-row
            "
          >

            <Button
              type="button"
              variant="outline"
              onClick={
                loadDebts
              }
              disabled={
                loading
              }
              className="
                border-white/20
                bg-white/5
                text-white
                hover:bg-white/10
                hover:text-white
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
              onClick={
                handleExportExcel
              }
              disabled={
                loading
                ||
                exporting
                ||
                filteredItems.length
                === 0
              }
              className="
                border
                border-[#d6a64c]
                bg-[#d6a64c]
                text-[#172033]
                hover:bg-[#e0b85f]
              "
            >

              {exporting ? (

                <RefreshCw
                  className=
                    "animate-spin"
                />

              ) : (

                <FileSpreadsheet />

              )}


              {exporting
                ? "Đang xuất..."
                : "Xuất Excel"}

            </Button>

          </div>

        </div>

      </section>


      {/* =====================================================
          LOADING
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

            Đang tải công nợ...

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
              gap-2
              text-sm
              text-red-700
            "
          >

            <AlertCircle
              size={18}
            />

            {error}

          </CardContent>

        </Card>

      ) : !report ? (

        <Card
          className="
            rounded-2xl
            border-[#e9e2d8]
          "
        >

          <CardContent
            className="
              flex
              min-h-40
              items-center
              justify-center
              text-sm
              text-slate-500
            "
          >
            Không có dữ liệu công nợ.
          </CardContent>

        </Card>

      ) : (

        <>

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

            <DebtSummaryCard
              title="Tổng công nợ"
              value={
                formatMoney(
                  report.total_debt
                )
              }
              subtitle=
                "Tổng tiền chưa thu"
              icon={
                CircleDollarSign
              }
              danger={
                report.total_debt > 0
              }
            />


            <DebtSummaryCard
              title="Hóa đơn còn nợ"
              value={
                String(
                  report.debt_invoice_count
                )
              }
              subtitle=
                "Hóa đơn chưa trả đủ"
              icon={
                ReceiptText
              }
              accent="rose"
            />


            <DebtSummaryCard
              title="Phòng đang nợ"
              value={
                String(
                  debtRoomCount
                )
              }
              subtitle=
                "Số phòng có công nợ"
              icon={
                Building2
              }
              accent="gold"
            />


            <DebtSummaryCard
              title="Đang hiển thị"
              value={
                String(
                  filteredItems.length
                )
              }
              subtitle=
                "Theo tìm kiếm hiện tại"
              icon={
                WalletCards
              }
            />

          </div>


          {/* =================================================
              SEARCH + FILTERS
          ================================================= */}

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
                  xl:grid-cols-[minmax(260px,1fr)_150px_190px_150px_140px_auto]
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
                      "Tìm phòng, mã hóa đơn hoặc kỳ..."
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
                    paymentStatusFilter
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setPaymentStatusFilter(
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
                    Tất cả trạng thái
                  </option>

                  <option value="UNPAID">
                    Chưa thanh toán
                  </option>

                  <option value="PARTIALLY_PAID">
                    Thanh toán một phần
                  </option>

                </select>


                <select
                  value={
                    monthFilter
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setMonthFilter(
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
                    Tất cả tháng
                  </option>

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
                      item
                    ) => (

                      <option
                        key={
                          item
                        }
                        value={
                          String(
                            item
                          )
                        }
                      >
                        Tháng {item}
                      </option>

                    )
                  )}

                </select>


                <select
                  value={
                    yearFilter
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setYearFilter(
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
                    Tất cả năm
                  </option>

                  {yearOptions.map(
                    (
                      item
                    ) => (

                      <option
                        key={
                          item
                        }
                        value={
                          String(
                            item
                          )
                        }
                      >
                        {item}
                      </option>

                    )
                  )}

                </select>


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
                  Excel sẽ xuất theo dữ liệu đang lọc.
                </span>


                <strong
                  className=
                    "text-[#172033]"
                >
                  {filteredItems.length}
                  {" / "}
                  {report.items.length}
                  {" hóa đơn"}
                </strong>

              </div>

            </CardContent>

          </Card>


          {/* =================================================
              EMPTY - NO DEBT
          ================================================= */}

          {report.items.length === 0 ? (

            <Card
              className="
                rounded-2xl
                border-emerald-200
                bg-emerald-50/50
              "
            >

              <CardContent
                className="
                  flex
                  min-h-60
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
                    h-14
                    w-14
                    items-center
                    justify-center
                    rounded-2xl
                    bg-emerald-100
                    text-emerald-600
                  "
                >

                  <CheckCircle2
                    size={26}
                  />

                </div>


                <strong
                  className="
                    mt-4
                    text-lg
                    text-emerald-800
                  "
                >
                  Không có công nợ
                </strong>


                <p
                  className="
                    mt-2
                    max-w-md
                    text-sm
                    leading-6
                    text-emerald-700
                  "
                >
                  Tất cả hóa đơn đã phát hành
                  hiện đã được thanh toán đủ.
                </p>

              </CardContent>

            </Card>

          ) : filteredItems.length === 0 ? (

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

                <Search
                  size={24}
                  className=
                    "text-slate-400"
                />


                <strong
                  className=
                    "text-[#172033]"
                >
                  Không tìm thấy công nợ
                </strong>


                <p
                  className="
                    text-sm
                    text-slate-500
                  "
                >
                  Không có hóa đơn nào phù hợp với từ khóa hiện tại.
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

              {/* =============================================
                  DESKTOP TABLE
              ============================================= */}

              <Card
                className="
                  hidden
                  overflow-hidden
                  rounded-2xl
                  border-[#e9e2d8]
                  shadow-sm
                  lg:block
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
                        min-w-[1050px]
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

                          <DebtTableHead>
                            Phòng
                          </DebtTableHead>

                          <DebtTableHead>
                            Hóa đơn
                          </DebtTableHead>

                          <DebtTableHead>
                            Kỳ
                          </DebtTableHead>

                          <DebtTableHead>
                            Tổng bill
                          </DebtTableHead>

                          <DebtTableHead>
                            Đã trả
                          </DebtTableHead>

                          <DebtTableHead>
                            Còn nợ
                          </DebtTableHead>

                          <DebtTableHead>
                            Trạng thái
                          </DebtTableHead>

                          <DebtTableHead>
                            Thao tác
                          </DebtTableHead>

                        </tr>

                      </thead>


                      <tbody>

                        {filteredItems.map(
                          (
                            item
                          ) => (

                            <tr
                              key={
                                item.invoice_id
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
                                      shrink-0
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
                                    {item.room_code}
                                  </strong>

                                </div>

                              </td>


                              <td
                                className="
                                  whitespace-nowrap
                                  px-5
                                  py-4
                                  font-semibold
                                  text-[#172033]
                                "
                              >
                                #{item.invoice_id}
                              </td>


                              <td
                                className="
                                  whitespace-nowrap
                                  px-5
                                  py-4
                                  text-slate-600
                                "
                              >
                                {item.month}/{item.year}
                              </td>


                              <td
                                className="
                                  whitespace-nowrap
                                  px-5
                                  py-4
                                  font-medium
                                  text-[#172033]
                                "
                              >
                                {formatMoney(
                                  item.invoice_total
                                )}
                              </td>


                              <td
                                className="
                                  whitespace-nowrap
                                  px-5
                                  py-4
                                  font-semibold
                                  text-emerald-700
                                "
                              >
                                {formatMoney(
                                  item.total_paid
                                )}
                              </td>


                              <td
                                className="
                                  whitespace-nowrap
                                  px-5
                                  py-4
                                  font-semibold
                                  text-red-600
                                "
                              >
                                {formatMoney(
                                  item.remaining_amount
                                )}
                              </td>


                              <td
                                className="
                                  px-5
                                  py-4
                                "
                              >

                                <DebtStatusBadge
                                  status={
                                    item.payment_status
                                  }
                                />

                              </td>


                              <td
                                className="
                                  px-5
                                  py-4
                                "
                              >

                                <Link
                                  to={
                                    `/invoices/${item.invoice_id}`
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

                                  Xem hóa đơn

                                  <ArrowUpRight
                                    size={14}
                                  />

                                </Link>

                              </td>

                            </tr>

                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                </CardContent>

              </Card>


              {/* =============================================
                  MOBILE / TABLET CARDS
              ============================================= */}

              <div
                className="
                  grid
                  grid-cols-1
                  gap-4
                  md:grid-cols-2
                  lg:hidden
                "
              >

                {filteredItems.map(
                  (
                    item
                  ) => (

                    <Card
                      key={
                        item.invoice_id
                      }
                      className="
                        overflow-hidden
                        rounded-2xl
                        border-[#e9e2d8]
                        shadow-sm
                      "
                    >

                      <div
                        className="
                          h-1
                          bg-[#e44763]
                        "
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
                              Công nợ
                            </div>


                            <h2
                              className="
                                mt-1
                                text-xl
                                font-semibold
                                text-[#172033]
                              "
                            >
                              {item.room_code}
                            </h2>


                            <div
                              className="
                                mt-1
                                text-xs
                                text-slate-500
                              "
                            >
                              Hóa đơn #{item.invoice_id}
                              {" • "}
                              {item.month}/{item.year}
                            </div>

                          </div>


                          <DebtStatusBadge
                            status={
                              item.payment_status
                            }
                          />

                        </div>


                        <div
                          className="
                            space-y-1
                            px-5
                            py-4
                          "
                        >

                          <DebtMobileRow
                            label="Tổng bill"
                            value={
                              formatMoney(
                                item.invoice_total
                              )
                            }
                          />


                          <DebtMobileRow
                            label="Đã trả"
                            value={
                              formatMoney(
                                item.total_paid
                              )
                            }
                            success
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
                              Còn nợ
                            </span>


                            <strong
                              className="
                                text-lg
                                text-red-700
                              "
                            >
                              {formatMoney(
                                item.remaining_amount
                              )}
                            </strong>

                          </div>

                        </div>


                        <div
                          className="
                            border-t
                            border-[#eeeae2]
                            bg-[#fcfbf8]
                            px-5
                            py-4
                          "
                        >

                          <Link
                            to={
                              `/invoices/${item.invoice_id}`
                            }
                            className="
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

                            Xem hóa đơn

                            <ArrowUpRight
                              size={15}
                            />

                          </Link>

                        </div>

                      </CardContent>

                    </Card>

                  )
                )}

              </div>

            </>

          )}

        </>

      )}

      </div>

    </div>

  );

}


// =========================================================
// MOBILE DEBT MINI STAT
// =========================================================

function MobileDebtMiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {

  return (

    <div
      className="
        rounded-xl
        bg-white/5
        px-3
        py-3
        text-center
      "
    >

      <div
        className="
          text-lg
          font-semibold
          text-white
        "
      >
        {value}
      </div>


      <div
        className="
          mt-1
          truncate
          text-[10px]
          text-slate-400
        "
      >
        {label}
      </div>

    </div>

  );

}


// =========================================================
// MOBILE DEBT CARD
// =========================================================

function MobileDebtCard({
  item,
}: {
  item: DebtReportItem;
}) {

  return (

    <Card
      className="
        overflow-hidden
        rounded-2xl
        border-[#e9e2d8]
        shadow-sm
      "
    >

      <div
        className="
          h-1
          bg-[#e44763]
        "
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
            px-4
            py-4
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

              <div
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-[#eef1f5]
                  text-[#20334d]
                "
              >

                <Building2
                  size={16}
                />

              </div>


              <div>

                <h3
                  className="
                    text-lg
                    font-semibold
                    text-[#172033]
                  "
                >
                  {item.room_code}
                </h3>


                <div
                  className="
                    mt-0.5
                    text-xs
                    text-slate-500
                  "
                >
                  Hóa đơn #{item.invoice_id}
                  {" • "}
                  {item.month}/{item.year}
                </div>

              </div>

            </div>

          </div>


          <DebtStatusBadge
            status={
              item.payment_status
            }
          />

        </div>


        <div
          className="
            px-4
            py-4
          "
        >

          <div
            className="
              grid
              grid-cols-2
              gap-2
            "
          >

            <div
              className="
                rounded-xl
                border
                border-[#ebe6dd]
                bg-[#fcfbf8]
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
                Tổng hóa đơn
              </div>


              <strong
                className="
                  mt-1
                  block
                  text-sm
                  text-[#172033]
                "
              >
                {formatMoney(
                  item.invoice_total
                )}
              </strong>

            </div>


            <div
              className="
                rounded-xl
                border
                border-emerald-200
                bg-emerald-50
                px-3
                py-3
              "
            >

              <div
                className="
                  text-[11px]
                  text-emerald-600
                "
              >
                Đã trả
              </div>


              <strong
                className="
                  mt-1
                  block
                  text-sm
                  text-emerald-700
                "
              >
                {formatMoney(
                  item.total_paid
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
              border-red-200
              bg-red-50
              px-4
              py-4
            "
          >

            <div>

              <div
                className="
                  text-xs
                  font-medium
                  text-red-600
                "
              >
                Còn phải thu
              </div>


              <div
                className="
                  mt-1
                  text-[11px]
                  text-red-500
                "
              >
                {getPaymentStatusText(
                  item.payment_status
                )}
              </div>

            </div>


            <strong
              className="
                text-lg
                text-red-700
              "
            >
              {formatMoney(
                item.remaining_amount
              )}
            </strong>

          </div>

        </div>


        <div
          className="
            border-t
            border-[#eeeae2]
            bg-[#fcfbf8]
            px-4
            py-3
          "
        >

          <Link
            to={
              `/invoices/${item.invoice_id}`
            }
            className="
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

            <ReceiptText
              size={15}
            />

            Xem hóa đơn

            <ArrowUpRight
              size={14}
            />

          </Link>

        </div>

      </CardContent>

    </Card>

  );

}


// =========================================================
// SUMMARY CARD
// =========================================================

function DebtSummaryCard({
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
// STATUS BADGE
// =========================================================

function DebtStatusBadge({
  status,
}: {
  status: string;
}) {

  if (
    status
    === "PARTIALLY_PAID"
  ) {

    return (

      <Badge
        variant="outline"
        className="
          whitespace-nowrap
          border-amber-200
          bg-amber-50
          text-amber-700
        "
      >
        {getPaymentStatusText(
          status
        )}
      </Badge>

    );

  }


  if (
    status === "PAID"
  ) {

    return (

      <Badge
        variant="outline"
        className="
          whitespace-nowrap
          border-emerald-200
          bg-emerald-50
          text-emerald-700
        "
      >
        {getPaymentStatusText(
          status
        )}
      </Badge>

    );

  }


  return (

    <Badge
      variant="outline"
      className="
        whitespace-nowrap
        border-red-200
        bg-red-50
        text-red-700
      "
    >
      {getPaymentStatusText(
        status
      )}
    </Badge>

  );

}


// =========================================================
// TABLE HEAD
// =========================================================

function DebtTableHead({
  children,
}: {
  children: string;
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
// MOBILE ROW
// =========================================================

function DebtMobileRow({
  label,
  value,
  success = false,
}: {
  label: string;
  value: string;
  success?: boolean;
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

      <span
        className="
          text-sm
          text-slate-500
        "
      >
        {label}
      </span>


      <strong
        className={
          success
            ? "text-sm text-emerald-700"
            : "text-sm text-[#172033]"
        }
      >
        {value}
      </strong>

    </div>

  );

}


export default Debts;