import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router";

import {
  Banknote,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ExternalLink,
  FileImage,
  Filter,
  Hash,
  Landmark,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  WalletCards,
} from "lucide-react";

import {
  apiGet,
} from "../api/api";

import {
  Button,
} from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Input,
} from "@/components/ui/input";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type {
  Room,
} from "../types/room";


type PaymentMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "OTHER"
  | "DEPOSIT";


type PaymentHistoryItem = {
  id: number;

  invoice_id: number;

  room_id: number;

  room_code: string;

  invoice_year: number;

  invoice_month: number;

  invoice_transfer_reference: string | null;

  amount: number;

  payment_method: PaymentMethod;

  transaction_reference: string | null;

  note: string | null;

  receipt_file_key: string | null;

  receipt_original_name: string | null;

  confirmed_by: string | null;

  paid_at: string;
};


type PaymentHistoryResponse = {
  total_count: number;

  total_amount: number;

  bank_transfer_amount: number;

  cash_amount: number;

  other_amount: number;

  deposit_amount: number;

  items: PaymentHistoryItem[];
};


type ReceiptUrlResponse = {
  url: string;

  expires_in: number;
};


function formatMoney(
  value: number
) {

  return (
    new Intl.NumberFormat(
      "vi-VN"
    ).format(value)
    + " đ"
  );

}


function formatDateTime(
  value: string
) {

  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }


  return date.toLocaleString(
    "vi-VN",
    {
      hour:
        "2-digit",

      minute:
        "2-digit",

      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",
    }
  );

}



function getPaymentMethodText(
  method: string
) {

  if (
    method === "BANK_TRANSFER"
  ) {
    return "Chuyển khoản";
  }


  if (
    method === "CASH"
  ) {
    return "Tiền mặt";
  }


  if (
    method === "DEPOSIT"
  ) {
    return "Tiền cọc";
  }


  if (
    method === "OTHER"
  ) {
    return "Khác";
  }


  return method;

}


function Payments() {

  const [
    data,
    setData,
  ] = useState<
    PaymentHistoryResponse | null
  >(null);


  const [
    rooms,
    setRooms,
  ] = useState<Room[]>([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    viewingReceiptId,
    setViewingReceiptId,
  ] = useState<
    number | null
  >(null);


  const [
    error,
    setError,
  ] = useState("");


  const [
    mobileFiltersOpen,
    setMobileFiltersOpen,
  ] = useState(false);


  // =========================================================
  // FILTERS
  // =========================================================

  const [
    search,
    setSearch,
  ] = useState("");


  const [
    floorFilter,
    setFloorFilter,
  ] = useState("ALL");


  const [
    year,
    setYear,
  ] = useState("");


  const [
    month,
    setMonth,
  ] = useState("");


  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState("");


  const [
    receiptFilter,
    setReceiptFilter,
  ] = useState("");


  const [
    dateFrom,
    setDateFrom,
  ] = useState("");


  const [
    dateTo,
    setDateTo,
  ] = useState("");


  // =========================================================
  // ROOM / FLOOR OPTIONS
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


  const displayedItems =
    useMemo(
      () => {

        if (
          !data
        ) {
          return [];
        }


        if (
          floorFilter
          === "ALL"
        ) {
          return data.items;
        }


        return data.items.filter(
          (
            payment
          ) => {

            const room =
              roomMap.get(
                payment.room_id
              );


            return (
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

          }
        );

      },
      [
        data,
        floorFilter,
        roomMap,
      ]
    );


  const displayedSummary =
    useMemo(
      () => {

        if (
          !data
        ) {

          return {
            totalCount: 0,
            totalAmount: 0,
            bankTransferAmount: 0,
            cashAmount: 0,
            depositAmount: 0,
            otherAmount: 0,
          };

        }


        if (
          floorFilter
          === "ALL"
        ) {

          return {
            totalCount:
              data.total_count,

            totalAmount:
              data.total_amount,

            bankTransferAmount:
              data.bank_transfer_amount,

            cashAmount:
              data.cash_amount,

            depositAmount:
              data.deposit_amount,

            otherAmount:
              data.other_amount,
          };

        }


        return displayedItems.reduce(
          (
            summary,
            payment
          ) => {

            summary.totalCount += 1;

            summary.totalAmount +=
              payment.amount;


            if (
              payment.payment_method
              === "BANK_TRANSFER"
            ) {

              summary.bankTransferAmount +=
                payment.amount;

            } else if (
              payment.payment_method
              === "CASH"
            ) {

              summary.cashAmount +=
                payment.amount;

            } else if (
              payment.payment_method
              === "DEPOSIT"
            ) {

              summary.depositAmount +=
                payment.amount;

            } else {

              summary.otherAmount +=
                payment.amount;

            }


            return summary;

          },
          {
            totalCount: 0,
            totalAmount: 0,
            bankTransferAmount: 0,
            cashAmount: 0,
            depositAmount: 0,
            otherAmount: 0,
          }
        );

      },
      [
        data,
        displayedItems,
        floorFilter,
      ]
    );


  // =========================================================
  // YEAR OPTIONS
  // =========================================================

  const yearOptions =
    useMemo(
      () => {

        const currentYear =
          new Date().getFullYear();


        return [
          currentYear + 1,
          currentYear,
          currentYear - 1,
          currentYear - 2,
          currentYear - 3,
        ];

      },
      []
    );


  // =========================================================
  // LOAD ROOMS
  // =========================================================

  async function loadRooms() {

    try {

      const roomData =
        await apiGet<Room[]>(
          "/rooms"
        );


      setRooms(
        roomData
      );


    } catch (err) {

      console.error(
        err
      );

    }

  }


  // =========================================================
  // LOAD PAYMENTS
  // =========================================================

  async function loadPayments(
    clearFilters = false
  ) {

    try {

      setLoading(true);

      setError("");


      const params =
        new URLSearchParams();


      let searchValue =
        clearFilters
          ? ""
          : search.trim();


      if (
        searchValue.startsWith(
          "#"
        )
      ) {

        searchValue =
          searchValue.slice(1);

      }


      const yearValue =
        clearFilters
          ? ""
          : year;


      const monthValue =
        clearFilters
          ? ""
          : month;


      const methodValue =
        clearFilters
          ? ""
          : paymentMethod;


      const receiptValue =
        clearFilters
          ? ""
          : receiptFilter;


      const fromValue =
        clearFilters
          ? ""
          : dateFrom;


      const toValue =
        clearFilters
          ? ""
          : dateTo;


      if (searchValue) {

        params.set(
          "search",
          searchValue
        );

      }


      if (yearValue) {

        params.set(
          "year",
          yearValue
        );

      }


      if (monthValue) {

        params.set(
          "month",
          monthValue
        );

      }


      if (methodValue) {

        params.set(
          "payment_method",
          methodValue
        );

      }


      if (
        receiptValue === "HAS"
      ) {

        params.set(
          "has_receipt",
          "true"
        );

      }


      if (
        receiptValue === "NONE"
      ) {

        params.set(
          "has_receipt",
          "false"
        );

      }


      if (fromValue) {

        params.set(
          "date_from",
          fromValue
        );

      }


      if (toValue) {

        params.set(
          "date_to",
          toValue
        );

      }


      params.set(
        "limit",
        "100"
      );


      params.set(
        "offset",
        "0"
      );


      const result =
        await apiGet<
          PaymentHistoryResponse
        >(
          `/payments?${params.toString()}`
        );


      setData(
        result
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
          "Không thể tải lịch sử giao dịch."
        );

      }

    } finally {

      setLoading(false);

    }

  }


  useEffect(
    () => {

      loadRooms();

      loadPayments();

    },
    []
  );


  // =========================================================
  // RESET
  // =========================================================

  function handleReset() {

    setSearch("");

    setFloorFilter(
      "ALL"
    );

    setYear("");

    setMonth("");

    setPaymentMethod("");

    setReceiptFilter("");

    setDateFrom("");

    setDateTo("");


    loadPayments(
      true
    );

  }


  // =========================================================
  // VIEW RECEIPT
  // =========================================================

  async function handleViewReceipt(
    payment: PaymentHistoryItem
  ) {

    if (
      !payment.receipt_file_key
    ) {
      return;
    }


    const receiptWindow =
      window.open(
        "",
        "_blank"
      );


    if (
      !receiptWindow
    ) {

      window.alert(
        "Trình duyệt đang chặn cửa sổ xem chứng từ."
      );

      return;

    }


    receiptWindow.document.write(`
      <!doctype html>
      <html lang="vi">

        <head>
          <meta charset="UTF-8" />

          <title>
            Rosehome - Chứng từ
          </title>
        </head>

        <body
          style="
            font-family:
              Arial,
              sans-serif;

            padding: 30px;

            background:
              #f8f7f3;

            color:
              #172033;
          "
        >
          Đang tải chứng từ...
        </body>

      </html>
    `);


    try {

      setViewingReceiptId(
        payment.id
      );


      const result =
        await apiGet<
          ReceiptUrlResponse
        >(
          `/invoices/${payment.invoice_id}/payments/${payment.id}/receipt`
        );


      receiptWindow.opener =
        null;


      receiptWindow.location.href =
        result.url;


    } catch (err) {

      console.error(
        err
      );


      receiptWindow.close();


      if (
        err instanceof Error
      ) {

        setError(
          err.message
        );

      } else {

        setError(
          "Không thể mở chứng từ."
        );

      }

    } finally {

      setViewingReceiptId(
        null
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
              Rosehome Finance
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
              Giao dịch
            </h1>


            <p
              className="
                mt-1
                text-sm
                text-slate-500
              "
            >
              {displayedSummary.totalCount} giao dịch phù hợp
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
              () =>
                loadPayments()
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


        {/* MOBILE TOTAL */}

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
                Tổng đã thu
              </div>


              <div
                className="
                  mt-1
                  text-2xl
                  font-semibold
                  tracking-tight
                "
              >
                {formatMoney(
                  displayedSummary.totalAmount
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
                text-[#d7ba80]
              "
            >

              <CircleDollarSign
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

            <MobileFinanceStat
              label="Chuyển khoản"
              value={
                formatMoney(
                  displayedSummary.bankTransferAmount
                )
              }
            />


            <MobileFinanceStat
              label="Tiền mặt"
              value={
                formatMoney(
                  displayedSummary.cashAmount
                )
              }
            />


            <MobileFinanceStat
              label="Tiền cọc"
              value={
                formatMoney(
                  displayedSummary.depositAmount
                )
              }
            />


            <MobileFinanceStat
              label="Khác"
              value={
                formatMoney(
                  displayedSummary.otherAmount
                )
              }
            />

          </div>

        </div>


        {/* MOBILE SEARCH */}

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
              value={
                search
              }
              onChange={
                (event) =>
                  setSearch(
                    event.target.value
                  )
              }
              onKeyDown={
                (event) => {

                  if (
                    event.key
                    === "Enter"
                  ) {

                    loadPayments();

                  }

                }
              }
              placeholder=
                "Tìm mã RH, phòng, HĐ, mã giao dịch..."
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
            className="
              mt-3
              grid
              grid-cols-2
              gap-2
            "
          >

            <Button
              type="button"
              disabled={
                loading
              }
              onClick={
                () =>
                  loadPayments()
              }
              className="
                h-10
                rounded-xl
                bg-[#122033]
                text-white
                hover:bg-[#20334d]
              "
            >

              <Filter
                size={16}
              />

              Áp dụng

            </Button>


            <Button
              type="button"
              variant="outline"
              disabled={
                loading
              }
              onClick={
                handleReset
              }
              className="
                h-10
                rounded-xl
                border-[#ddd8ce]
                bg-white
              "
            >

              <RotateCcw
                size={16}
              />

              Đặt lại

            </Button>

          </div>

        </div>


        {/* MOBILE QUICK FILTERS */}

        <div
          className="
            flex
            gap-2
            overflow-x-auto
            pb-1
            [scrollbar-width:none]
            [&::-webkit-scrollbar]:hidden
          "
        >

          <MobilePaymentFilterChip
            active={
              paymentMethod === ""
            }
            onClick={
              () =>
                setPaymentMethod("")
            }
          >
            Tất cả
          </MobilePaymentFilterChip>


          <MobilePaymentFilterChip
            active={
              paymentMethod
              === "BANK_TRANSFER"
            }
            onClick={
              () =>
                setPaymentMethod(
                  "BANK_TRANSFER"
                )
            }
          >
            Chuyển khoản
          </MobilePaymentFilterChip>


          <MobilePaymentFilterChip
            active={
              paymentMethod
              === "CASH"
            }
            onClick={
              () =>
                setPaymentMethod(
                  "CASH"
                )
            }
          >
            Tiền mặt
          </MobilePaymentFilterChip>


          <MobilePaymentFilterChip
            active={
              receiptFilter
              === "HAS"
            }
            onClick={
              () =>
                setReceiptFilter(
                  receiptFilter === "HAS"
                    ? ""
                    : "HAS"
                )
            }
          >
            Có chứng từ
          </MobilePaymentFilterChip>

        </div>


        {/* MOBILE ADVANCED FILTER */}

        <div
          className="
            overflow-hidden
            rounded-2xl
            border
            border-[#e9e2d8]
            bg-white
            shadow-sm
          "
        >

          <button
            type="button"
            onClick={
              () =>
                setMobileFiltersOpen(
                  (
                    current
                  ) =>
                    !current
                )
            }
            className="
              flex
              min-h-11
              w-full
              items-center
              justify-between
              gap-3
              px-4
              py-3
              text-left
            "
          >

            <div
              className="
                flex
                items-center
                gap-2
              "
            >

              <Filter
                size={16}
                className=
                  "text-[#9a762f]"
              />

              <span
                className="
                  text-sm
                  font-semibold
                  text-[#172033]
                "
              >
                Bộ lọc nâng cao
              </span>

            </div>


            <span
              className="
                text-xs
                font-medium
                text-slate-500
              "
            >
              {mobileFiltersOpen
                ? "Thu gọn"
                : "Mở"}
            </span>

          </button>


          {mobileFiltersOpen && (

            <div
              className="
                grid
                grid-cols-2
                gap-3
                border-t
                border-[#eeeae2]
                p-4
              "
            >

              <FilterSelect
                label="Tầng"
                icon={
                  Building2
                }
                value={
                  floorFilter
                }
                onChange={
                  setFloorFilter
                }
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

              </FilterSelect>


              <FilterSelect
                label="Năm"
                icon={
                  CalendarDays
                }
                value={
                  year
                }
                onChange={
                  setYear
                }
              >

                <option value="">
                  Tất cả
                </option>


                {yearOptions.map(
                  (item) => (

                    <option
                      key={
                        item
                      }
                      value={
                        item
                      }
                    >
                      {item}
                    </option>

                  )
                )}

              </FilterSelect>


              <FilterSelect
                label="Tháng"
                icon={
                  CalendarDays
                }
                value={
                  month
                }
                onChange={
                  setMonth
                }
              >

                <option value="">
                  Tất cả
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
                  (item) => (

                    <option
                      key={
                        item
                      }
                      value={
                        item
                      }
                    >
                      Tháng {item}
                    </option>

                  )
                )}

              </FilterSelect>


              <FilterSelect
                label="Phương thức"
                icon={
                  WalletCards
                }
                value={
                  paymentMethod
                }
                onChange={
                  setPaymentMethod
                }
              >

                <option value="">
                  Tất cả
                </option>

                <option value="BANK_TRANSFER">
                  Chuyển khoản
                </option>

                <option value="CASH">
                  Tiền mặt
                </option>

                <option value="DEPOSIT">
                  Tiền cọc
                </option>

                <option value="OTHER">
                  Khác
                </option>

              </FilterSelect>


              <FilterSelect
                label="Chứng từ"
                icon={
                  FileImage
                }
                value={
                  receiptFilter
                }
                onChange={
                  setReceiptFilter
                }
              >

                <option value="">
                  Tất cả
                </option>

                <option value="HAS">
                  Có chứng từ
                </option>

                <option value="NONE">
                  Chưa có
                </option>

              </FilterSelect>


              <DateFilter
                label="Từ ngày"
                value={
                  dateFrom
                }
                onChange={
                  setDateFrom
                }
              />


              <DateFilter
                label="Đến ngày"
                value={
                  dateTo
                }
                onChange={
                  setDateTo
                }
              />

            </div>

          )}

        </div>


        {/* MOBILE ERROR */}

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


        {/* MOBILE LIST */}

        <div>

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
                  text-base
                  font-semibold
                  text-[#172033]
                "
              >
                Lịch sử thanh toán
              </h2>


              <p
                className="
                  mt-0.5
                  text-xs
                  text-slate-500
                "
              >
                {displayedSummary.totalCount} giao dịch
              </p>

            </div>


            {(search
              ||
              floorFilter !== "ALL"
              ||
              year
              ||
              month
              ||
              paymentMethod
              ||
              receiptFilter
              ||
              dateFrom
              ||
              dateTo) && (

              <button
                type="button"
                onClick={
                  handleReset
                }
                className="
                  text-xs
                  font-semibold
                  text-[#9a762f]
                "
              >
                Xóa lọc
              </button>

            )}

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
                size={18}
                className=
                  "animate-spin"
              />

              Đang tải giao dịch...

            </div>

          ) : !data
          ||
          displayedItems.length === 0 ? (

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

                <ReceiptText
                  size={20}
                />

              </div>


              <strong
                className="
                  mt-3
                  text-sm
                  text-[#172033]
                "
              >
                Không tìm thấy giao dịch
              </strong>


              <p
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                Thử thay đổi từ khóa hoặc bộ lọc.
              </p>

            </div>

          ) : (

            <div
              className="
                space-y-3
              "
            >

              {displayedItems.map(
                (
                  payment
                ) => (

                  <MobilePaymentCard
                    key={
                      payment.id
                    }
                    payment={
                      payment
                    }
                    viewingReceiptId={
                      viewingReceiptId
                    }
                    onViewReceipt={
                      handleViewReceipt
                    }
                  />

                )
              )}

            </div>

          )}

        </div>

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

      <div
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
          shadow-[0_18px_50px_rgba(15,31,51,0.16)]
          md:px-8
        "
      >

        <div
          className="
            absolute
            -right-20
            -top-24
            h-64
            w-64
            rounded-full
            bg-[#c9a35d]/10
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
                text-[#d7ba80]
              "
            >

              <WalletCards
                size={16}
              />

              Rosehome Finance

            </div>


            <h1
              className="
                text-2xl
                font-semibold
                tracking-tight
                md:text-3xl
              "
            >
              Lịch sử giao dịch
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
              Theo dõi, tìm kiếm và
              đối soát toàn bộ khoản
              thanh toán của Rosehome.
            </p>

          </div>


          <Button
            type="button"
            disabled={
              loading
            }
            onClick={
              () =>
                loadPayments()
            }
            className="
              border
              border-[#d5b36e]
              bg-[#c9a35d]
              text-[#172033]
              shadow-none
              hover:bg-[#d6b877]
            "
          >

            <RefreshCw
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            {loading
              ? "Đang tải"
              : "Làm mới"}

          </Button>

        </div>

      </div>


      {/* =====================================================
          ERROR
      ===================================================== */}

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

        <SummaryCard
          title="Tổng đã thu"
          value={
            formatMoney(
              displayedSummary.totalAmount
            )
          }
          icon={
            CircleDollarSign
          }
          accent
        />


        <SummaryCard
          title="Chuyển khoản"
          value={
            formatMoney(
              displayedSummary.bankTransferAmount
            )
          }
          icon={
            Landmark
          }
        />


        <SummaryCard
          title="Tiền mặt"
          value={
            formatMoney(
              displayedSummary.cashAmount
            )
          }
          icon={
            Banknote
          }
        />


        <SummaryCard
          title="Tiền cọc"
          value={
            formatMoney(
              displayedSummary.depositAmount
            )
          }
          icon={
            Banknote
          }
        />


        <SummaryCard
          title="Số giao dịch"
          value={
            String(
              displayedSummary.totalCount
            )
          }
          icon={
            ReceiptText
          }
        />

      </div>


      {/* =====================================================
          FILTERS
      ===================================================== */}

      <Card
        className="
          overflow-hidden
          rounded-2xl
          border-[#e6e2d9]
          shadow-sm
        "
      >

        <CardHeader
          className="
            border-b
            border-[#eeeae2]
            bg-[#fbfaf7]
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
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-[#122033]
                text-[#d6b56f]
              "
            >

              <Filter
                size={19}
              />

            </div>


            <div>

              <CardTitle
                className="
                  text-base
                  text-[#172033]
                "
              >
                Tìm kiếm & lọc
              </CardTitle>


              <CardDescription>
                Lọc giao dịch theo
                thời gian, hình thức
                và chứng từ.
              </CardDescription>

            </div>

          </div>

        </CardHeader>


        <CardContent
          className="
            space-y-5
            p-5
            md:p-6
          "
        >

          {/* SEARCH */}

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
                value={
                  search
                }
                onChange={
                  (event) =>
                    setSearch(
                      event.target.value
                    )
                }
                onKeyDown={
                  (event) => {

                    if (
                      event.key
                      === "Enter"
                    ) {

                      loadPayments();

                    }

                  }
                }
                placeholder=
                  "VD: RH2608P101I25, P101, HĐ #25, mã GD..."
                className="
                  h-11
                  rounded-xl
                  border-[#ddd9cf]
                  bg-white
                  pl-10
                  focus-visible:border-[#c9a35d]
                  focus-visible:ring-[#c9a35d]/20
                "
              />

            </div>


            <Button
              type="button"
              onClick={
                () =>
                  loadPayments()
              }
              disabled={
                loading
              }
              className="
                h-11
                rounded-xl
                bg-[#122033]
                px-6
                text-white
                hover:bg-[#20334d]
              "
            >

              <Filter />

              Áp dụng

            </Button>


            <Button
              type="button"
              variant="outline"
              disabled={
                loading
              }
              onClick={
                handleReset
              }
              className="
                h-11
                rounded-xl
                border-[#ddd9cf]
                bg-white
                px-5
              "
            >

              <RotateCcw />

              Đặt lại

            </Button>

          </div>


          {/* FILTER GRID */}

          <div
            className="
              grid
              grid-cols-1
              gap-4
              sm:grid-cols-2
              lg:grid-cols-3
              xl:grid-cols-7
            "
          >

            <FilterSelect
              label="Tầng"
              icon={
                Building2
              }
              value={
                floorFilter
              }
              onChange={
                setFloorFilter
              }
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

            </FilterSelect>


            <FilterSelect
              label="Năm"
              icon={
                CalendarDays
              }
              value={
                year
              }
              onChange={
                setYear
              }
            >

              <option value="">
                Tất cả
              </option>


              {yearOptions.map(
                (item) => (

                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    {item}
                  </option>

                )
              )}

            </FilterSelect>


            <FilterSelect
              label="Tháng"
              icon={
                CalendarDays
              }
              value={
                month
              }
              onChange={
                setMonth
              }
            >

              <option value="">
                Tất cả
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
                (item) => (

                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    Tháng {item}
                  </option>

                )
              )}

            </FilterSelect>


            <FilterSelect
              label="Phương thức"
              icon={
                WalletCards
              }
              value={
                paymentMethod
              }
              onChange={
                setPaymentMethod
              }
            >

              <option value="">
                Tất cả
              </option>

              <option
                value="BANK_TRANSFER"
              >
                Chuyển khoản
              </option>

              <option
                value="CASH"
              >
                Tiền mặt
              </option>

              <option
                value="DEPOSIT"
              >
                Tiền cọc
              </option>

              <option
                value="OTHER"
              >
                Khác
              </option>

            </FilterSelect>


            <FilterSelect
              label="Chứng từ"
              icon={
                FileImage
              }
              value={
                receiptFilter
              }
              onChange={
                setReceiptFilter
              }
            >

              <option value="">
                Tất cả
              </option>

              <option
                value="HAS"
              >
                Có chứng từ
              </option>

              <option
                value="NONE"
              >
                Chưa có chứng từ
              </option>

            </FilterSelect>


            <DateFilter
              label="Từ ngày"
              value={
                dateFrom
              }
              onChange={
                setDateFrom
              }
            />


            <DateFilter
              label="Đến ngày"
              value={
                dateTo
              }
              onChange={
                setDateTo
              }
            />

          </div>

        </CardContent>

      </Card>


      {/* =====================================================
          TRANSACTIONS
      ===================================================== */}

      <Card
        className="
          overflow-hidden
          rounded-2xl
          border-[#e6e2d9]
          shadow-sm
        "
      >

        <CardHeader
          className="
            flex
            flex-row
            items-center
            justify-between
            border-b
            border-[#eeeae2]
            bg-white
          "
        >

          <div>

            <CardTitle
              className="
                text-base
                text-[#172033]
              "
            >
              Giao dịch
            </CardTitle>


            <CardDescription
              className="mt-1"
            >
              {data
                ? `${displayedSummary.totalCount} giao dịch phù hợp`
                : "Đang tải dữ liệu"}
            </CardDescription>

          </div>


          <Badge
            variant="outline"
            className="
              rounded-full
              border-[#ded8cc]
              bg-[#faf8f3]
              px-3
              py-1
              text-[#675a43]
            "
          >
            {displayedSummary.totalCount} giao dịch
          </Badge>

        </CardHeader>


        <CardContent
          className="p-0"
        >

          {loading ? (

            <div
              className="
                flex
                min-h-52
                items-center
                justify-center
                gap-2
                text-sm
                text-slate-500
              "
            >

              <RefreshCw
                size={18}
                className=
                  "animate-spin"
              />

              Đang tải giao dịch...

            </div>

          ) : !data
          ||
          displayedItems.length === 0 ? (

            <div
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

              <ReceiptText
                size={34}
                strokeWidth={1.5}
              />

              <span>
                Không tìm thấy giao dịch.
              </span>

            </div>

          ) : (

            <div
              className="
                overflow-x-auto
              "
            >

              <Table>

                <TableHeader>

                  <TableRow
                    className="
                      bg-[#faf9f6]
                      hover:bg-[#faf9f6]
                    "
                  >

                    <TableHead>
                      Thời gian
                    </TableHead>

                    <TableHead>
                      Phòng / HĐ
                    </TableHead>

                    <TableHead>
                      Số tiền
                    </TableHead>

                    <TableHead>
                      Thanh toán
                    </TableHead>

                    <TableHead>
                      Ghi chú
                    </TableHead>

                    <TableHead>
                      Chứng từ
                    </TableHead>

                    <TableHead
                      className=
                        "text-right"
                    >
                      Thao tác
                    </TableHead>

                  </TableRow>

                </TableHeader>


                <TableBody>

                  {displayedItems.map(
                    (
                      payment
                    ) => (

                      <TableRow
                        key={
                          payment.id
                        }
                        className="
                          border-[#eeeae2]
                          hover:bg-[#fcfbf8]
                        "
                      >

                        <TableCell
                          className="
                            whitespace-nowrap
                            text-sm
                            text-slate-600
                          "
                        >
                          {formatDateTime(
                            payment.paid_at
                          )}
                        </TableCell>


                        <TableCell>

                          <div
                            className="
                              flex
                              items-start
                              gap-3
                            "
                          >

                            <div
                              className="
                                mt-0.5
                                flex
                                h-9
                                w-9
                                shrink-0
                                items-center
                                justify-center
                                rounded-lg
                                bg-[#f4efe5]
                                text-[#9a762f]
                              "
                            >

                              <Building2
                                size={17}
                              />

                            </div>


                            <div>

                              <Link
                                to={
                                  `/rooms/${payment.room_id}`
                                }
                                className="
                                  font-semibold
                                  text-[#172033]
                                  hover:text-[#9a762f]
                                "
                              >
                                {payment.room_code}
                              </Link>


                              <div
                                className="
                                  mt-1
                                  flex
                                  items-center
                                  gap-1
                                  text-xs
                                  text-slate-500
                                "
                              >

                                <Hash
                                  size={12}
                                />

                                <Link
                                  to={
                                    `/invoices/${payment.invoice_id}`
                                  }
                                  className=
                                    "hover:text-[#9a762f]"
                                >
                                  HĐ {payment.invoice_id}
                                </Link>

                                <span>
                                  •
                                </span>

                                <span>
                                  {payment.invoice_month}
                                  /
                                  {payment.invoice_year}
                                </span>

                              </div>


                              {payment.invoice_transfer_reference && (

                                <div
                                  className="
                                    mt-1
                                    max-w-52
                                    truncate
                                    font-mono
                                    text-[11px]
                                    font-semibold
                                    tracking-wide
                                    text-[#9a762f]
                                  "
                                  title={
                                    payment.invoice_transfer_reference
                                  }
                                >
                                  RH:{" "}
                                  {payment.invoice_transfer_reference}
                                </div>

                              )}

                            </div>

                          </div>

                        </TableCell>


                        <TableCell>

                          <div
                            className="
                              whitespace-nowrap
                              text-sm
                              font-semibold
                              text-emerald-700
                            "
                          >
                            +{" "}
                            {formatMoney(
                              payment.amount
                            )}
                          </div>

                        </TableCell>


                        <TableCell>

                          <div
                            className=
                              "space-y-1.5"
                          >

                            <PaymentMethodBadge
                              method={
                                payment.payment_method
                              }
                            />


                            {payment.transaction_reference && (

                              <div
                                className="
                                  max-w-44
                                  truncate
                                  text-xs
                                  text-slate-500
                                "
                                title={
                                  payment.transaction_reference
                                }
                              >
                                Mã GD:{" "}
                                {
                                  payment.transaction_reference
                                }
                              </div>

                            )}

                          </div>

                        </TableCell>


                        <TableCell>

                          <div
                            className="
                              max-w-52
                              truncate
                              text-sm
                              text-slate-600
                            "
                            title={
                              payment.note
                              ?? undefined
                            }
                          >
                            {payment.note
                              ?? "—"}
                          </div>

                        </TableCell>


                        <TableCell>

                          {payment.receipt_file_key ? (

                            <div
                              className="
                                flex
                                flex-col
                                items-start
                                gap-2
                              "
                            >

                              <Badge
                                variant="outline"
                                className="
                                  border-emerald-200
                                  bg-emerald-50
                                  text-emerald-700
                                "
                              >

                                <FileImage />

                                Có chứng từ

                              </Badge>


                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={
                                  viewingReceiptId
                                  === payment.id
                                }
                                onClick={
                                  () =>
                                    handleViewReceipt(
                                      payment
                                    )
                                }
                                className="
                                  h-8
                                  rounded-lg
                                  border-[#ddd8ce]
                                "
                              >

                                <ExternalLink />

                                {viewingReceiptId
                                  === payment.id
                                    ? "Đang mở"
                                    : "Xem bill"}

                              </Button>

                            </div>

                          ) : (

                            <Badge
                              variant="outline"
                              className="
                                border-slate-200
                                bg-slate-50
                                text-slate-500
                              "
                            >
                              Chưa có
                            </Badge>

                          )}

                        </TableCell>


                        <TableCell
                          className=
                            "text-right"
                        >

                          <Link
                            to={
                              `/invoices/${payment.invoice_id}`
                            }
                            className="
                              inline-flex
                              h-9
                              items-center
                              gap-2
                              rounded-lg
                              bg-[#122033]
                              px-3
                              text-sm
                              font-medium
                              text-white
                              transition
                              hover:bg-[#20334d]
                            "
                          >

                            <ReceiptText
                              size={15}
                            />

                            Hóa đơn

                          </Link>

                        </TableCell>

                      </TableRow>

                    )
                  )}

                </TableBody>

              </Table>

            </div>

          )}

        </CardContent>

      </Card>

      </div>

    </div>

  );

}


// =========================================================
// MOBILE FINANCE STAT
// =========================================================

function MobileFinanceStat({
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
      "
    >

      <div
        className="
          truncate
          text-[10px]
          text-slate-400
        "
      >
        {label}
      </div>


      <div
        className="
          mt-1
          truncate
          text-[11px]
          font-semibold
          text-white
        "
      >
        {value}
      </div>

    </div>

  );

}


// =========================================================
// MOBILE FILTER CHIP
// =========================================================

function MobilePaymentFilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
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
            border
            border-[#122033]
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
// MOBILE PAYMENT CARD
// =========================================================

function MobilePaymentCard({
  payment,
  viewingReceiptId,
  onViewReceipt,
}: {
  payment: PaymentHistoryItem;
  viewingReceiptId: number | null;
  onViewReceipt: (
    payment: PaymentHistoryItem
  ) => void;
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
          bg-emerald-500
        "
      />


      <CardContent
        className="
          p-0
        "
      >

        <div
          className="
            flex
            items-start
            justify-between
            gap-3
            border-b
            border-[#f0ece5]
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
                text-[11px]
                text-slate-400
              "
            >
              {formatDateTime(
                payment.paid_at
              )}
            </div>


            <div
              className="
                mt-1
                text-xl
                font-semibold
                text-emerald-700
              "
            >
              + {formatMoney(
                payment.amount
              )}
            </div>

          </div>


          <PaymentMethodBadge
            method={
              payment.payment_method
            }
          />

        </div>


        <div
          className="
            space-y-3
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

            <Link
              to={
                `/rooms/${payment.room_id}`
              }
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
                  flex
                  items-center
                  gap-1.5
                  text-[11px]
                  text-slate-400
                "
              >

                <Building2
                  size={13}
                />

                Phòng

              </div>


              <strong
                className="
                  mt-1
                  block
                  text-sm
                  text-[#172033]
                "
              >
                {payment.room_code}
              </strong>

            </Link>


            <Link
              to={
                `/invoices/${payment.invoice_id}`
              }
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
                  flex
                  items-center
                  gap-1.5
                  text-[11px]
                  text-slate-400
                "
              >

                <ReceiptText
                  size={13}
                />

                Hóa đơn

              </div>


              <strong
                className="
                  mt-1
                  block
                  text-sm
                  text-[#172033]
                "
              >
                #{payment.invoice_id}
                {" • "}
                {payment.invoice_month}/{payment.invoice_year}
              </strong>

            </Link>

          </div>


          {payment.invoice_transfer_reference && (

            <div
              className="
                rounded-xl
                border
                border-[#ead9b7]
                bg-[#fffaf0]
                px-3
                py-3
              "
            >

              <div
                className="
                  text-[10px]
                  font-medium
                  uppercase
                  tracking-[0.08em]
                  text-[#9a762f]
                "
              >
                Mã RH
              </div>


              <div
                className="
                  mt-1
                  break-all
                  font-mono
                  text-xs
                  font-semibold
                  text-[#8a6726]
                "
              >
                {payment.invoice_transfer_reference}
              </div>

            </div>

          )}


          {(payment.transaction_reference
            ||
            payment.note) && (

            <div
              className="
                space-y-2
                rounded-xl
                border
                border-[#eee9df]
                bg-white
                px-3
                py-3
              "
            >

              {payment.transaction_reference && (

                <MobilePaymentInfoRow
                  label="Mã giao dịch"
                  value={
                    payment.transaction_reference
                  }
                />

              )}


              {payment.note && (

                <MobilePaymentInfoRow
                  label="Ghi chú"
                  value={
                    payment.note
                  }
                />

              )}

            </div>

          )}


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
                  text-xs
                  text-slate-400
                "
              >
                Chứng từ
              </div>


              <div
                className="
                  mt-1
                  max-w-44
                  truncate
                  text-xs
                  font-medium
                  text-slate-600
                "
              >
                {payment.receipt_file_key
                  ? (
                      payment.receipt_original_name
                      ?? "Có chứng từ"
                    )
                  : "Chưa có"}
              </div>

            </div>


            {payment.receipt_file_key && (

              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={
                  viewingReceiptId
                  === payment.id
                }
                onClick={
                  () =>
                    onViewReceipt(
                      payment
                    )
                }
                className="
                  h-9
                  shrink-0
                  rounded-xl
                  border-[#ddd8ce]
                "
              >

                <ExternalLink
                  size={14}
                />

                {viewingReceiptId
                  === payment.id
                    ? "Đang mở"
                    : "Xem bill"}

              </Button>

            )}

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
              `/invoices/${payment.invoice_id}`
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

            <ExternalLink
              size={14}
            />

          </Link>

        </div>

      </CardContent>

    </Card>

  );

}


// =========================================================
// MOBILE PAYMENT INFO ROW
// =========================================================

function MobilePaymentInfoRow({
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
        items-start
        justify-between
        gap-3
      "
    >

      <span
        className="
          shrink-0
          text-xs
          text-slate-400
        "
      >
        {label}
      </span>


      <strong
        className="
          min-w-0
          break-words
          text-right
          text-xs
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
// SUMMARY CARD
// =========================================================

type IconComponent =
  React.ComponentType<{
    size?: number;
    className?: string;
  }>;


function SummaryCard({
  title,
  value,
  icon: Icon,
  accent = false,
}: {
  title: string;
  value: string;
  icon: IconComponent;
  accent?: boolean;
}) {

  return (

    <Card
      className="
        rounded-2xl
        border-[#e6e2d9]
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
            className={
              accent

                ? `
                  mt-2
                  text-xl
                  font-semibold
                  tracking-tight
                  text-[#9a762f]
                `

                : `
                  mt-2
                  text-xl
                  font-semibold
                  tracking-tight
                  text-[#172033]
                `
            }
          >
            {value}
          </div>

        </div>


        <div
          className={
            accent

              ? `
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-[#f4efe3]
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
// FILTER SELECT
// =========================================================

function FilterSelect({
  label,
  icon: Icon,
  value,
  onChange,
  children,
}: {
  label: string;
  icon: IconComponent;
  value: string;
  onChange: (
    value: string
  ) => void;
  children:
    React.ReactNode;
}) {

  return (

    <label
      className=
        "grid gap-2"
    >

      <span
        className="
          flex
          items-center
          gap-1.5
          text-xs
          font-medium
          text-slate-500
        "
      >

        <Icon
          size={14}
        />

        {label}

      </span>


      <select
        value={
          value
        }
        onChange={
          (event) =>
            onChange(
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
          px-3
          text-sm
          text-[#172033]
          outline-none
          transition
          focus:border-[#c9a35d]
          focus:ring-2
          focus:ring-[#c9a35d]/15
        "
      >
        {children}
      </select>

    </label>

  );

}


// =========================================================
// DATE FILTER
// =========================================================

function DateFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
}) {

  return (

    <label
      className=
        "grid gap-2"
    >

      <span
        className="
          flex
          items-center
          gap-1.5
          text-xs
          font-medium
          text-slate-500
        "
      >

        <CalendarDays
          size={14}
        />

        {label}

      </span>


      <Input
        type="date"
        value={
          value
        }
        onChange={
          (event) =>
            onChange(
              event.target.value
            )
        }
        className="
          h-10
          rounded-xl
          border-[#ddd9cf]
          bg-white
          focus-visible:border-[#c9a35d]
          focus-visible:ring-[#c9a35d]/15
        "
      />

    </label>

  );

}


// =========================================================
// PAYMENT BADGE
// =========================================================

function PaymentMethodBadge({
  method,
}: {
  method:
    PaymentMethod;
}) {

  if (
    method === "BANK_TRANSFER"
  ) {

    return (

      <Badge
        variant="outline"
        className="
          border-blue-200
          bg-blue-50
          text-blue-700
        "
      >
        <Landmark />

        Chuyển khoản
      </Badge>

    );

  }


  if (
    method === "CASH"
  ) {

    return (

      <Badge
        variant="outline"
        className="
          border-amber-200
          bg-amber-50
          text-amber-700
        "
      >
        <Banknote />

        Tiền mặt
      </Badge>

    );

  }


  if (
    method === "DEPOSIT"
  ) {

    return (

      <Badge
        variant="outline"
        className="
          border-emerald-200
          bg-emerald-50
          text-emerald-700
        "
      >
        <Banknote />

        Tiền cọc
      </Badge>

    );

  }


  return (

    <Badge
      variant="outline"
    >
      {getPaymentMethodText(
        method
      )}
    </Badge>

  );

}


export default Payments;