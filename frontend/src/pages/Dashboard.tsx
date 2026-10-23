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
  Banknote,
  Building2,
  CalendarClock,
  CircleDollarSign,
  FileText,
  Gauge,
  House,
  Landmark,
  ReceiptText,
  RefreshCw,
  WalletCards,
  Zap,
  type LucideIcon,
} from "lucide-react";

import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  DebtReport,
} from "../types/report";


// =========================================================
// BRAND
// =========================================================

const NAVY =
  "#122033";

const ROSE =
  "#e44763";

const GOLD =
  "#d6a64c";


// =========================================================
// PAYMENT TYPES
// =========================================================

type PaymentHistoryItem = {
  id: number;

  invoice_id: number;

  room_id: number;

  room_code: string;

  invoice_year: number;

  invoice_month: number;

  amount: number;

  payment_method:
    | "CASH"
    | "BANK_TRANSFER"
    | "OTHER"
    | "DEPOSIT";

  transaction_reference:
    string | null;

  note:
    string | null;

  receipt_file_key:
    string | null;

  receipt_original_name:
    string | null;

  confirmed_by:
    string | null;

  paid_at: string;
};


type PaymentHistoryResponse = {
  total_count: number;

  total_amount: number;

  bank_transfer_amount: number;

  cash_amount: number;

  other_amount: number;

  items:
    PaymentHistoryItem[];
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
    + " đ"
  );

}


function formatCompactMoney(
  value: number
) {

  if (
    value >= 1_000_000_000
  ) {

    return `${(
      value
      /
      1_000_000_000
    ).toFixed(
      1
    )} tỷ`;

  }


  if (
    value >= 1_000_000
  ) {

    const millions =
      value
      /
      1_000_000;


    return `${millions.toLocaleString(
      "vi-VN",
      {
        maximumFractionDigits:
          1,
      }
    )} tr`;

  }


  if (
    value >= 1_000
  ) {

    return `${Math.round(
      value
      /
      1_000
    ).toLocaleString(
      "vi-VN"
    )}k`;

  }


  return new Intl.NumberFormat(
    "vi-VN"
  ).format(
    value
  );

}


function formatDate(
  value: string | null
) {

  if (!value) {
    return "-";
  }


  return new Date(
    `${value}T00:00:00`
  ).toLocaleDateString(
    "vi-VN"
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
    }
  );

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


function getPaymentMethodText(
  method: string
) {

  if (
    method
    === "BANK_TRANSFER"
  ) {
    return "Chuyển khoản";
  }


  if (
    method
    === "CASH"
  ) {
    return "Tiền mặt";
  }


  if (
    method
    === "DEPOSIT"
  ) {
    return "Tiền cọc";
  }


  return "Khác";

}


// =========================================================
// DASHBOARD
// =========================================================

function Dashboard() {

  const [
    rooms,
    setRooms,
  ] = useState<Room[]>(
    []
  );


  const [
    contracts,
    setContracts,
  ] = useState<
    Contract[]
  >([]);


  const [
    debtReport,
    setDebtReport,
  ] = useState<
    DebtReport | null
  >(null);


  const [
    payments,
    setPayments,
  ] = useState<
    PaymentHistoryItem[]
  >([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState("");


  // =========================================================
  // LOAD
  // =========================================================

  async function loadDashboard() {

    try {

      setLoading(
        true
      );

      setError("");


      const [
        roomData,
        contractData,
        debtData,
        paymentData,
      ] =
        await Promise.all([

          apiGet<Room[]>(
            "/rooms"
          ),

          apiGet<Contract[]>(
            "/contracts"
          ),

          apiGet<DebtReport>(
            "/reports/debts"
          ),

          apiGet<
            PaymentHistoryResponse
          >(
            "/payments?limit=500&offset=0"
          ),

        ]);


      setRooms(
        roomData
      );


      setContracts(
        contractData
      );


      setDebtReport(
        debtData
      );


      setPayments(
        paymentData.items
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
          "Không thể tải dữ liệu Dashboard."
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

      loadDashboard();

    },
    []
  );


  // =========================================================
  // ROOM DATA
  // =========================================================

  const totalRooms =
    rooms.length;


  const occupiedRooms =
    useMemo(
      () =>

        rooms.filter(
          (room) =>
            room.status
            === "OCCUPIED"
        ).length,

      [
        rooms,
      ]
    );


  const vacantRooms =
    useMemo(
      () =>

        rooms.filter(
          (room) =>
            room.status
            === "VACANT"
        ).length,

      [
        rooms,
      ]
    );


  const otherRooms =
    Math.max(
      0,
      totalRooms
      -
      occupiedRooms
      -
      vacantRooms
    );


  const occupancyRate =
    totalRooms > 0

      ? Math.round(
          (
            occupiedRooms
            /
            totalRooms
          )
          *
          100
        )

      : 0;


  const occupancyData =
    useMemo(
      () => {

        const result = [

          {
            name:
              "Đang thuê",

            value:
              occupiedRooms,

            color:
              ROSE,
          },

          {
            name:
              "Trống",

            value:
              vacantRooms,

            color:
              GOLD,
          },

        ];


        if (
          otherRooms > 0
        ) {

          result.push({
            name:
              "Khác",

            value:
              otherRooms,

            color:
              NAVY,
          });

        }


        return result;

      },
      [
        occupiedRooms,
        vacantRooms,
        otherRooms,
      ]
    );


  // =========================================================
  // CONTRACTS
  // =========================================================

  const roomMap =
    useMemo(
      () =>

        new Map(
          rooms.map(
            (room) => [
              room.id,
              room.room_code,
            ]
          )
        ),

      [
        rooms,
      ]
    );


  const activeContracts =
    useMemo(
      () =>

        contracts.filter(
          (contract) =>
            contract.status
            === "ACTIVE"
        ).length,

      [
        contracts,
      ]
    );


  const expiringContracts =
    useMemo(
      () => {

        return contracts
          .filter(
            (
              contract
            ) => {

              if (
                contract.status
                !== "ACTIVE"
              ) {
                return false;
              }


              const days =
                getDaysUntil(
                  contract.end_date
                );


              return (
                days !== null
                &&
                days >= 0
                &&
                days <= 30
              );

            }
          )
          .sort(
            (
              a,
              b
            ) => {

              const aDays =
                getDaysUntil(
                  a.end_date
                )
                ?? 999999;


              const bDays =
                getDaysUntil(
                  b.end_date
                )
                ?? 999999;


              return (
                aDays
                -
                bDays
              );

            }
          );

      },
      [
        contracts,
      ]
    );


  // =========================================================
  // DEBT
  // =========================================================

  const totalDebt =
    debtReport
      ?.total_debt
    ?? 0;


  const debtInvoiceCount =
    debtReport
      ?.debt_invoice_count
    ?? 0;


  // =========================================================
  // REVENUE
  // =========================================================

  const currentMonthRevenue =
    useMemo(
      () => {

        const now =
          new Date();


        return payments
          .filter(
            (
              payment
            ) => {

              const date =
                new Date(
                  payment.paid_at
                );


              return (
                date.getFullYear()
                ===
                now.getFullYear()
                &&
                date.getMonth()
                ===
                now.getMonth()
              );

            }
          )
          .reduce(
            (
              total,
              payment
            ) =>
              total
              +
              payment.amount,

            0
          );

      },
      [
        payments,
      ]
    );


  const previousMonthRevenue =
    useMemo(
      () => {

        const previous =
          new Date();

        previous.setDate(
          1
        );

        previous.setMonth(
          previous.getMonth()
          - 1
        );


        return payments
          .filter(
            (
              payment
            ) => {

              const date =
                new Date(
                  payment.paid_at
                );


              return (
                date.getFullYear()
                ===
                previous.getFullYear()
                &&
                date.getMonth()
                ===
                previous.getMonth()
              );

            }
          )
          .reduce(
            (
              total,
              payment
            ) =>
              total
              +
              payment.amount,

            0
          );

      },
      [
        payments,
      ]
    );


  const revenueGrowth =
    previousMonthRevenue > 0

      ? (
          (
            currentMonthRevenue
            -
            previousMonthRevenue
          )
          /
          previousMonthRevenue
        )
        *
        100

      : null;


  const revenueTrend =
    useMemo(
      () => {

        const result:
          {
            month: string;
            revenue: number;
          }[] = [];


        for (
          let offset = 5;
          offset >= 0;
          offset -= 1
        ) {

          const target =
            new Date();


          target.setDate(
            1
          );


          target.setHours(
            0,
            0,
            0,
            0
          );


          target.setMonth(
            target.getMonth()
            -
            offset
          );


          const year =
            target.getFullYear();


          const month =
            target.getMonth();


          const revenue =
            payments
              .filter(
                (
                  payment
                ) => {

                  const date =
                    new Date(
                      payment.paid_at
                    );


                  return (
                    date.getFullYear()
                    === year
                    &&
                    date.getMonth()
                    === month
                  );

                }
              )
              .reduce(
                (
                  total,
                  payment
                ) =>
                  total
                  +
                  payment.amount,

                0
              );


          result.push({

            month:
              `T${month + 1}/${String(
                year
              ).slice(-2)}`,

            revenue:
              revenue,

          });

        }


        return result;

      },
      [
        payments,
      ]
    );


  const recentPayments =
    useMemo(
      () => {

        return [
          ...payments,
        ]
          .sort(
            (
              a,
              b
            ) =>

              new Date(
                b.paid_at
              ).getTime()
              -
              new Date(
                a.paid_at
              ).getTime()
          )
          .slice(
            0,
            5
          );

      },
      [
        payments,
      ]
    );


  // =========================================================
  // LOADING
  // =========================================================

  if (
    loading
    &&
    rooms.length === 0
  ) {

    return (

      <div
        className="
          flex
          min-h-[300px]
          items-center
          justify-center
          gap-3
          text-sm
          text-slate-500
        "
      >

        <RefreshCw
          size={18}
          className="animate-spin"
        />

        Đang tải Dashboard...

      </div>

    );

  }


  // =========================================================
  // UI
  // =========================================================

  return (

    <>

      {/* =====================================================
          MOBILE DASHBOARD
      ===================================================== */}

      <div
        className="
          md:hidden
          space-y-5
          pb-2
        "
      >

        {/* ==========================
            MOBILE PAGE HEADER
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

            <p
              className="
                text-xs
                font-medium
                uppercase
                tracking-[0.16em]
                text-[#9a762f]
              "
            >
              Rosehome
            </p>


            <h1
              className="
                mt-1
                text-xl
                font-bold
                tracking-tight
                text-[#172033]
              "
            >
              Tổng quan
            </h1>

          </div>


          <button
            type="button"
            disabled={
              loading
            }
            onClick={
              loadDashboard
            }
            aria-label="Làm mới Dashboard"
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-2xl
              border
              border-slate-200
              bg-white
              text-slate-600
              shadow-sm
              transition
              active:bg-slate-100
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

        </div>


        {/* ==========================
            ERROR MOBILE
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
            MOBILE HERO
        ========================== */}

        <section
          className="
            overflow-hidden
            rounded-3xl
            bg-[#122033]
            p-5
            text-white
            shadow-sm
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
                  text-slate-300
                "
              >
                Đã thu tháng này
              </div>


              <div
                className="
                  mt-2
                  text-2xl
                  font-bold
                  tracking-tight
                "
              >
                {formatMoney(
                  currentMonthRevenue
                )}
              </div>


              <div
                className="
                  mt-2
                  text-xs
                  text-slate-300
                "
              >

                {revenueGrowth === null

                  ? "Chưa đủ dữ liệu so sánh"

                  : `${
                      revenueGrowth >= 0
                        ? "+"
                        : ""
                    }${revenueGrowth.toFixed(
                      1
                    )}% so với tháng trước`}

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

              <CircleDollarSign
                size={23}
              />

            </div>

          </div>


          <div
            className="
              my-5
              h-px
              bg-white/10
            "
          />


          <div
            className="
              grid
              grid-cols-2
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
                Tỷ lệ lấp đầy
              </div>


              <div
                className="
                  mt-1
                  text-lg
                  font-semibold
                "
              >
                {occupancyRate}%
              </div>

            </div>


            <div>

              <div
                className="
                  text-xs
                  text-slate-400
                "
              >
                Hợp đồng hoạt động
              </div>


              <div
                className="
                  mt-1
                  text-lg
                  font-semibold
                "
              >
                {activeContracts}
              </div>

            </div>

          </div>

        </section>


        {/* ==========================
            MOBILE ROOM STATS
        ========================== */}

        <section>

          <div
            className="
              mb-3
              flex
              items-center
              justify-between
            "
          >

            <h2
              className="
                text-base
                font-bold
                text-[#172033]
              "
            >
              Tình trạng hiện tại
            </h2>


            <Link
              to="/rooms"
              className="
                text-xs
                font-semibold
                text-[#b7862e]
              "
            >
              Xem phòng
            </Link>

          </div>


          <div
            className="
              grid
              grid-cols-2
              gap-3
            "
          >

            <MobileMetricCard
              label="Tổng phòng"
              value={
                String(
                  totalRooms
                )
              }
              icon={
                House
              }
            />


            <MobileMetricCard
              label="Đang thuê"
              value={
                String(
                  occupiedRooms
                )
              }
              icon={
                Building2
              }
              tone="rose"
            />


            <MobileMetricCard
              label="Phòng trống"
              value={
                String(
                  vacantRooms
                )
              }
              icon={
                House
              }
              tone="gold"
            />


            <MobileMetricCard
              label="Công nợ"
              value={
                formatCompactMoney(
                  totalDebt
                )
              }
              icon={
                WalletCards
              }
              tone={
                totalDebt > 0
                  ? "danger"
                  : "default"
              }
            />

          </div>

        </section>


        {/* ==========================
            MOBILE ATTENTION
        ========================== */}

        <section>

          <div
            className="
              mb-3
              flex
              items-center
              gap-2
            "
          >

            <AlertTriangle
              size={18}
              className=
                "text-[#e44763]"
            />


            <h2
              className="
                text-base
                font-bold
                text-[#172033]
              "
            >
              Việc cần chú ý
            </h2>

          </div>


          <div
            className="
              overflow-hidden
              rounded-2xl
              border
              border-[#ebe6dd]
              bg-white
            "
          >

            <MobileAttentionRow
              to="/debts"
              icon={
                WalletCards
              }
              title="Hóa đơn còn nợ"
              description={
                totalDebt > 0
                  ? formatMoney(
                      totalDebt
                    )
                  : "Hiện không có công nợ"
              }
              value={
                debtInvoiceCount
              }
              danger={
                debtInvoiceCount > 0
              }
            />


            <MobileAttentionRow
              to="/contracts"
              icon={
                CalendarClock
              }
              title="Hợp đồng sắp hết hạn"
              description="Trong 30 ngày tới"
              value={
                expiringContracts.length
              }
              warning={
                expiringContracts.length > 0
              }
            />

          </div>

        </section>


        {/* ==========================
            MOBILE QUICK ACTIONS
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
            Thao tác nhanh
          </h2>


          <div
            className="
              grid
              grid-cols-2
              gap-3
            "
          >

            <MobileQuickAction
              to="/rooms"
              label="Quản lý phòng"
              description="Xem & cho thuê"
              icon={
                House
              }
            />


            <MobileQuickAction
              to="/meter-readings"
              label="Nhập số điện"
              description="Chốt điện tháng"
              icon={
                Zap
              }
              tone="gold"
            />


            <MobileQuickAction
              to="/invoices"
              label="Hóa đơn"
              description="Xem & phát hành"
              icon={
                ReceiptText
              }
              tone="rose"
            />


            <MobileQuickAction
              to="/payments"
              label="Giao dịch"
              description="Các khoản đã thu"
              icon={
                Landmark
              }
            />

          </div>

        </section>


        {/* ==========================
            MOBILE EXPIRING CONTRACTS
        ========================== */}

        {expiringContracts.length > 0 && (

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
                Hợp đồng sắp hết hạn
              </h2>


              <Link
                to="/contracts"
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
                border-[#ebe6dd]
                bg-white
              "
            >

              {expiringContracts
                .slice(
                  0,
                  3
                )
                .map(
                  (
                    contract
                  ) => {

                    const days =
                      getDaysUntil(
                        contract.end_date
                      )
                      ?? 0;


                    return (

                      <Link
                        key={
                          contract.id
                        }
                        to={
                          `/contracts/${contract.id}`
                        }
                        className="
                          flex
                          min-h-[72px]
                          items-center
                          justify-between
                          gap-3
                          border-b
                          border-[#f0ece5]
                          px-4
                          py-3
                          last:border-0
                          active:bg-slate-50
                        "
                      >

                        <div
                          className="
                            min-w-0
                          "
                        >

                          <div
                            className="
                              truncate
                              text-sm
                              font-semibold
                              text-[#172033]
                            "
                          >

                            {
                              roomMap.get(
                                contract.room_id
                              )
                              ??
                              `Phòng #${contract.room_id}`
                            }

                          </div>


                          <div
                            className="
                              mt-1
                              text-xs
                              text-slate-500
                            "
                          >
                            HĐ #{contract.id}
                            {" • "}
                            {formatDate(
                              contract.end_date
                            )}
                          </div>

                        </div>


                        <span
                          className={
                            [
                              "shrink-0",
                              "rounded-full",
                              "px-2.5",
                              "py-1",
                              "text-xs",
                              "font-semibold",

                              days <= 7
                                ? "bg-red-50 text-red-600"
                                : "bg-amber-50 text-amber-700",
                            ].join(
                              " "
                            )
                          }
                        >

                          {days === 0
                            ? "Hôm nay"
                            : `${days} ngày`}

                        </span>

                      </Link>

                    );

                  }
                )}

            </div>

          </section>

        )}


        {/* ==========================
            MOBILE RECENT PAYMENTS
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
              Giao dịch gần đây
            </h2>


            <Link
              to="/payments"
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
              border-[#ebe6dd]
              bg-white
            "
          >

            {recentPayments.length === 0 ? (

              <div
                className="
                  px-4
                  py-8
                  text-center
                  text-sm
                  text-slate-500
                "
              >
                Chưa có giao dịch.
              </div>

            ) : (

              recentPayments
                .slice(
                  0,
                  3
                )
                .map(
                  (
                    payment
                  ) => (

                    <Link
                      key={
                        payment.id
                      }
                      to={
                        `/invoices/${payment.invoice_id}`
                      }
                      className="
                        flex
                        min-h-[76px]
                        items-center
                        justify-between
                        gap-3
                        border-b
                        border-[#f0ece5]
                        px-4
                        py-3
                        last:border-0
                        active:bg-slate-50
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
                          className="
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            bg-[#fcecef]
                            text-[#b92f49]
                          "
                        >

                          {payment.payment_method
                            === "BANK_TRANSFER"

                              ? (
                                <Landmark
                                  size={18}
                                />
                              )

                              : (
                                <Banknote
                                  size={18}
                                />
                              )}

                        </div>


                        <div
                          className="
                            min-w-0
                          "
                        >

                          <div
                            className="
                              truncate
                              text-sm
                              font-semibold
                              text-[#172033]
                            "
                          >
                            {payment.room_code}
                          </div>


                          <div
                            className="
                              mt-1
                              truncate
                              text-xs
                              text-slate-500
                            "
                          >
                            {getPaymentMethodText(
                              payment.payment_method
                            )}

                            {" • "}

                            {formatDateTime(
                              payment.paid_at
                            )}
                          </div>

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
                            text-sm
                            font-bold
                            text-emerald-700
                          "
                        >
                          +{formatCompactMoney(
                            payment.amount
                          )}
                        </div>

                      </div>

                    </Link>

                  )
                )

            )}

          </div>

        </section>

      </div>


      {/* =====================================================
          DESKTOP DASHBOARD
          GIỮ NGUYÊN GIAO DIỆN CŨ
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

                  <Gauge
                    size={16}
                  />

                  Rosehome Overview

                </div>


                <h1
                  className="
                    text-2xl
                    font-semibold
                    tracking-tight
                    md:text-3xl
                  "
                >
                  Tổng quan vận hành
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
                  Theo dõi phòng,
                  doanh thu,
                  công nợ và các việc
                  cần chú ý trong một màn hình.
                </p>

              </div>


              <Button
                type="button"
                disabled={
                  loading
                }
                onClick={
                  loadDashboard
                }
                className="
                  border
                  border-[#d6a64c]
                  bg-[#d6a64c]
                  text-[#172033]
                  hover:bg-[#e0b85f]
                "
              >

                <RefreshCw
                  className={
                    loading
                      ? "animate-spin"
                      : ""
                  }
                />

                Làm mới

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
              KPI
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

            <DashboardStatCard
              title="Tổng số phòng"
              value={
                String(
                  totalRooms
                )
              }
              subtitle={
                `${occupiedRooms} đang thuê • ${vacantRooms} trống`
              }
              icon={
                House
              }
              to="/rooms"
            />


            <DashboardStatCard
              title="Tỷ lệ lấp đầy"
              value={
                `${occupancyRate}%`
              }
              subtitle={
                `${occupiedRooms}/${totalRooms} phòng`
              }
              icon={
                Building2
              }
              to="/rooms"
              accent="rose"
            />


            <DashboardStatCard
              title="Đã thu tháng này"
              value={
                formatMoney(
                  currentMonthRevenue
                )
              }
              subtitle={
                revenueGrowth === null

                  ? "Chưa đủ dữ liệu so sánh"

                  : `${
                      revenueGrowth >= 0
                        ? "+"
                        : ""
                    }${revenueGrowth.toFixed(
                      1
                    )}% so với tháng trước`
              }
              icon={
                CircleDollarSign
              }
              to="/payments"
              accent="gold"
            />


            <DashboardStatCard
              title="Công nợ"
              value={
                formatMoney(
                  totalDebt
                )
              }
              subtitle={
                `${debtInvoiceCount} hóa đơn chưa đủ tiền`
              }
              icon={
                WalletCards
              }
              to="/debts"
              danger={
                totalDebt > 0
              }
            />

          </div>


          {/* =================================================
              CHARTS
          ================================================= */}

          <div
            className="
              grid
              grid-cols-1
              gap-5
              xl:grid-cols-[1.65fr_1fr]
            "
          >

            {/* REVENUE */}

            <Card
              className="
                rounded-2xl
                border-[#e9e2d8]
                shadow-sm
              "
            >

              <CardHeader>

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
                      className="text-base"
                    >
                      Doanh thu 6 tháng
                    </CardTitle>


                    <CardDescription
                      className="mt-1"
                    >
                      Dựa trên các khoản
                      thanh toán thực tế
                      đã ghi nhận.
                    </CardDescription>

                  </div>


                  <Badge
                    variant="outline"
                    className="
                      border-[#ead9b7]
                      bg-[#fffaf0]
                      text-[#8a6726]
                    "
                  >
                    <Landmark />

                    Đã thu
                  </Badge>

                </div>

              </CardHeader>


              <CardContent>

                <div
                  className="
                    h-[280px]
                    w-full
                  "
                >

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >

                    <LineChart
                      data={
                        revenueTrend
                      }
                      margin={{
                        top: 8,
                        right: 12,
                        bottom: 0,
                        left: 0,
                      }}
                    >

                      <CartesianGrid
                        stroke="#ebe7df"
                        strokeDasharray="4 4"
                        vertical={false}
                      />


                      <XAxis
                        dataKey="month"
                        tick={{
                          fill:
                            "#667085",

                          fontSize:
                            12,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />


                      <YAxis
                        tick={{
                          fill:
                            "#98a2b3",

                          fontSize:
                            11,
                        }}
                        axisLine={false}
                        tickLine={false}
                        width={50}
                        tickFormatter={
                          (
                            value
                          ) =>
                            `${Math.round(
                              Number(
                                value
                              )
                              /
                              1_000_000
                            )}tr`
                        }
                      />


                      <Tooltip
                        cursor={{
                          stroke:
                            "#d6a64c",

                          strokeDasharray:
                            "4 4",
                        }}
                        formatter={
                          (
                            value
                          ) => [
                            formatMoney(
                              Number(
                                value
                              )
                            ),
                            "Đã thu",
                          ]
                        }
                        contentStyle={{
                          borderRadius:
                            "12px",

                          border:
                            "1px solid #e9e2d8",

                          boxShadow:
                            "0 10px 30px rgba(18,32,51,.10)",
                        }}
                      />


                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke={
                          ROSE
                        }
                        strokeWidth={3}
                        dot={{
                          r: 4,
                          fill:
                            GOLD,

                          stroke:
                            "#ffffff",

                          strokeWidth:
                            2,
                        }}
                        activeDot={{
                          r: 6,
                        }}
                      />

                    </LineChart>

                  </ResponsiveContainer>

                </div>

              </CardContent>

            </Card>


            {/* OCCUPANCY */}

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
                  Tình trạng phòng
                </CardTitle>


                <CardDescription>
                  Tỷ lệ sử dụng hiện tại.
                </CardDescription>

              </CardHeader>


              <CardContent>

                <div
                  className="
                    relative
                    h-[220px]
                  "
                >

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >

                    <PieChart>

                      <Pie
                        data={
                          occupancyData
                        }
                        dataKey="value"
                        nameKey="name"
                        innerRadius={65}
                        outerRadius={90}
                        paddingAngle={3}
                        stroke="transparent"
                      >

                        {occupancyData.map(
                          (
                            item
                          ) => (

                            <Cell
                              key={
                                item.name
                              }
                              fill={
                                item.color
                              }
                            />

                          )
                        )}

                      </Pie>


                      <Tooltip
                        formatter={
                          (
                            value
                          ) => [
                            Number(
                              value
                            ),
                            "Phòng",
                          ]
                        }
                        contentStyle={{
                          borderRadius:
                            "12px",

                          border:
                            "1px solid #e9e2d8",
                        }}
                      />

                    </PieChart>

                  </ResponsiveContainer>


                  <div
                    className="
                      pointer-events-none
                      absolute
                      inset-0
                      flex
                      flex-col
                      items-center
                      justify-center
                    "
                  >

                    <strong
                      className="
                        text-3xl
                        font-semibold
                        text-[#172033]
                      "
                    >
                      {occupancyRate}%
                    </strong>


                    <span
                      className="
                        text-xs
                        text-slate-500
                      "
                    >
                      lấp đầy
                    </span>

                  </div>

                </div>


                <div
                  className="
                    grid
                    gap-2
                  "
                >

                  {occupancyData.map(
                    (
                      item
                    ) => (

                      <div
                        key={
                          item.name
                        }
                        className="
                          flex
                          items-center
                          justify-between
                          text-sm
                        "
                      >

                        <div
                          className="
                            flex
                            items-center
                            gap-2
                          "
                        >

                          <span
                            className="
                              h-2.5
                              w-2.5
                              rounded-full
                            "
                            style={{
                              background:
                                item.color,
                            }}
                          />

                          <span
                            className=
                              "text-slate-600"
                          >
                            {item.name}
                          </span>

                        </div>


                        <strong
                          className=
                            "text-[#172033]"
                        >
                          {item.value}
                        </strong>

                      </div>

                    )
                  )}

                </div>

              </CardContent>

            </Card>

          </div>


          {/* =================================================
              OPERATIONS
          ================================================= */}

          <div
            className="
              grid
              grid-cols-1
              gap-5
              xl:grid-cols-2
            "
          >

            {/* CONTRACT ALERT */}

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
                    items-center
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

                      <CalendarClock
                        size={18}
                        className=
                          "text-[#d6a64c]"
                      />

                      Hợp đồng sắp hết hạn

                    </CardTitle>


                    <CardDescription
                      className="mt-1"
                    >
                      Trong 30 ngày tới.
                    </CardDescription>

                  </div>


                  <Badge
                    variant="outline"
                    className="
                      border-amber-200
                      bg-amber-50
                      text-amber-700
                    "
                  >
                    {expiringContracts.length}
                  </Badge>

                </div>

              </CardHeader>


              <CardContent
                className="p-0"
              >

                {expiringContracts.length === 0 ? (

                  <div
                    className="
                      flex
                      min-h-40
                      items-center
                      justify-center
                      text-sm
                      text-slate-500
                    "
                  >
                    Không có hợp đồng
                    sắp hết hạn.
                  </div>

                ) : (

                  <div>

                    {expiringContracts
                      .slice(
                        0,
                        5
                      )
                      .map(
                        (
                          contract
                        ) => {

                          const days =
                            getDaysUntil(
                              contract.end_date
                            )
                            ?? 0;


                          return (

                            <Link
                              key={
                                contract.id
                              }
                              to={
                                `/contracts/${contract.id}`
                              }
                              className="
                                flex
                                items-center
                                justify-between
                                gap-4
                                border-b
                                border-[#f0ece5]
                                px-5
                                py-4
                                transition
                                last:border-0
                                hover:bg-[#fcfbf8]
                              "
                            >

                              <div>

                                <div
                                  className="
                                    font-semibold
                                    text-[#172033]
                                  "
                                >
                                  {
                                    roomMap.get(
                                      contract.room_id
                                    )
                                    ??
                                    `Phòng #${contract.room_id}`
                                  }
                                </div>


                                <div
                                  className="
                                    mt-1
                                    text-xs
                                    text-slate-500
                                  "
                                >
                                  HĐ #{contract.id}
                                  {" • "}
                                  {formatDate(
                                    contract.end_date
                                  )}
                                </div>

                              </div>


                              <Badge
                                variant="outline"
                                className={
                                  days <= 7

                                    ? `
                                      border-red-200
                                      bg-red-50
                                      text-red-700
                                    `

                                    : `
                                      border-amber-200
                                      bg-amber-50
                                      text-amber-700
                                    `
                                }
                              >

                                {days === 0
                                  ? "Hôm nay"
                                  : `${days} ngày`}

                              </Badge>

                            </Link>

                          );

                        }
                      )}

                  </div>

                )}


                <div
                  className="
                    border-t
                    border-[#eeeae2]
                    p-4
                  "
                >

                  <Link
                    to="/contracts"
                    className="
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
                      font-medium
                      text-[#172033]
                      transition
                      hover:border-[#d6a64c]
                      hover:bg-[#fffaf1]
                      hover:text-[#8a6726]
                    "
                  >

                    Xem tất cả hợp đồng

                    <ArrowUpRight
                      size={16}
                    />

                  </Link>

                </div>

              </CardContent>

            </Card>


            {/* RECENT PAYMENTS */}

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
                    items-center
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
                        className=
                          "text-[#e44763]"
                      />

                      Giao dịch gần đây

                    </CardTitle>


                    <CardDescription
                      className="mt-1"
                    >
                      5 khoản thu mới nhất.
                    </CardDescription>

                  </div>


                  <Badge
                    variant="outline"
                  >
                    {payments.length}
                  </Badge>

                </div>

              </CardHeader>


              <CardContent
                className="p-0"
              >

                {recentPayments.length === 0 ? (

                  <div
                    className="
                      flex
                      min-h-40
                      items-center
                      justify-center
                      text-sm
                      text-slate-500
                    "
                  >
                    Chưa có giao dịch.
                  </div>

                ) : (

                  <div>

                    {recentPayments.map(
                      (
                        payment
                      ) => (

                        <Link
                          key={
                            payment.id
                          }
                          to={
                            `/invoices/${payment.invoice_id}`
                          }
                          className="
                            flex
                            items-center
                            justify-between
                            gap-4
                            border-b
                            border-[#f0ece5]
                            px-5
                            py-4
                            transition
                            last:border-0
                            hover:bg-[#fcfbf8]
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
                                shrink-0
                                items-center
                                justify-center
                                rounded-xl
                                bg-[#fcecef]
                                text-[#b92f49]
                              "
                            >

                              {payment.payment_method
                                === "BANK_TRANSFER"

                                  ? (
                                    <Landmark
                                      size={18}
                                    />
                                  )

                                  : (
                                    <Banknote
                                      size={18}
                                    />
                                  )}

                            </div>


                            <div>

                              <div
                                className="
                                  font-semibold
                                  text-[#172033]
                                "
                              >
                                {payment.room_code}
                              </div>


                              <div
                                className="
                                  mt-1
                                  text-xs
                                  text-slate-500
                                "
                              >
                                {getPaymentMethodText(
                                  payment.payment_method
                                )}

                                {" • "}

                                {formatDateTime(
                                  payment.paid_at
                                )}
                              </div>

                            </div>

                          </div>


                          <strong
                            className="
                              whitespace-nowrap
                              text-sm
                              text-emerald-700
                            "
                          >
                            +{" "}
                            {formatMoney(
                              payment.amount
                            )}
                          </strong>

                        </Link>

                      )
                    )}

                  </div>

                )}


                <div
                  className="
                    border-t
                    border-[#eeeae2]
                    p-4
                  "
                >

                  <Link
                    to="/payments"
                    className="
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
                      font-medium
                      text-[#172033]
                      transition
                      hover:border-[#d6a64c]
                      hover:bg-[#fffaf1]
                      hover:text-[#8a6726]
                    "
                  >

                    Xem lịch sử giao dịch

                    <ArrowUpRight
                      size={16}
                    />

                  </Link>

                </div>

              </CardContent>

            </Card>

          </div>


          {/* =================================================
              ATTENTION + QUICK ACTIONS
          ================================================= */}

          <div
            className="
              grid
              grid-cols-1
              gap-5
              xl:grid-cols-[1fr_1.5fr]
            "
          >

            <Card
              className="
                rounded-2xl
                border-[#e9e2d8]
                shadow-sm
              "
            >

              <CardHeader>

                <CardTitle
                  className="
                    flex
                    items-center
                    gap-2
                    text-base
                  "
                >

                  <AlertTriangle
                    size={18}
                    className=
                      "text-[#e44763]"
                  />

                  Cần chú ý

                </CardTitle>

              </CardHeader>


              <CardContent
                className="space-y-3"
              >

                <AttentionRow
                  label="Hóa đơn còn nợ"
                  value={
                    `${debtInvoiceCount}`
                  }
                  to="/debts"
                />


                <AttentionRow
                  label="Tổng công nợ"
                  value={
                    formatMoney(
                      totalDebt
                    )
                  }
                  to="/debts"
                />


                <AttentionRow
                  label="Hợp đồng sắp hết hạn"
                  value={
                    `${expiringContracts.length}`
                  }
                  to="/contracts"
                />


                <AttentionRow
                  label="Hợp đồng đang hoạt động"
                  value={
                    `${activeContracts}`
                  }
                  to="/contracts"
                />

              </CardContent>

            </Card>


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
                  Các công việc thường dùng
                  trong tháng.
                </CardDescription>

              </CardHeader>


              <CardContent
                className="
                  grid
                  grid-cols-2
                  gap-3
                  md:grid-cols-3
                "
              >

                <QuickAction
                  to="/rooms"
                  label="Quản lý phòng"
                  icon={
                    House
                  }
                />


                <QuickAction
                  to="/contracts"
                  label="Hợp đồng"
                  icon={
                    FileText
                  }
                />


                <QuickAction
                  to="/meter-readings"
                  label="Nhập số điện"
                  icon={
                    Zap
                  }
                />


                <QuickAction
                  to="/invoices"
                  label="Hóa đơn"
                  icon={
                    ReceiptText
                  }
                />


                <QuickAction
                  to="/payments"
                  label="Giao dịch"
                  icon={
                    Landmark
                  }
                />


                <QuickAction
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

      </div>

    </>

  );

}


// =========================================================
// MOBILE METRIC CARD
// =========================================================

function MobileMetricCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?:
    | "default"
    | "rose"
    | "gold"
    | "danger";
}) {

  const iconClass =

    tone === "rose"

      ? "bg-[#fcecef] text-[#b92f49]"

      : tone === "gold"

        ? "bg-[#f7efdf] text-[#9a762f]"

        : tone === "danger"

          ? "bg-red-50 text-red-600"

          : "bg-[#eef1f5] text-[#20334d]";


  return (

    <div
      className="
        min-w-0
        rounded-2xl
        border
        border-[#ebe6dd]
        bg-white
        p-4
      "
    >

      <div
        className={`
          flex
          h-9
          w-9
          items-center
          justify-center
          rounded-xl
          ${iconClass}
        `}
      >

        <Icon
          size={18}
          strokeWidth={1.9}
        />

      </div>


      <div
        className="
          mt-4
          truncate
          text-xl
          font-bold
          tracking-tight
          text-[#172033]
        "
      >
        {value}
      </div>


      <div
        className="
          mt-1
          truncate
          text-xs
          text-slate-500
        "
      >
        {label}
      </div>

    </div>

  );

}


// =========================================================
// MOBILE ATTENTION ROW
// =========================================================

function MobileAttentionRow({
  to,
  icon: Icon,
  title,
  description,
  value,
  danger = false,
  warning = false,
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
  value: number;
  danger?: boolean;
  warning?: boolean;
}) {

  return (

    <Link
      to={
        to
      }
      className="
        flex
        min-h-[76px]
        items-center
        gap-3
        border-b
        border-[#f0ece5]
        px-4
        py-3
        last:border-0
        active:bg-slate-50
      "
    >

      <div
        className="
          flex
          h-10
          w-10
          shrink-0
          items-center
          justify-center
          rounded-xl
          bg-[#f7f4ee]
          text-[#6b5a3d]
        "
      >

        <Icon
          size={19}
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
            text-sm
            font-semibold
            text-[#172033]
          "
        >
          {title}
        </div>


        <div
          className="
            mt-1
            truncate
            text-xs
            text-slate-500
          "
        >
          {description}
        </div>

      </div>


      <div
        className={
          [
            "flex",
            "h-8",
            "min-w-8",
            "shrink-0",
            "items-center",
            "justify-center",
            "rounded-full",
            "px-2",
            "text-xs",
            "font-bold",

            danger
              ? "bg-red-50 text-red-600"
              : warning
                ? "bg-amber-50 text-amber-700"
                : "bg-slate-100 text-slate-600",
          ].join(
            " "
          )
        }
      >
        {value}
      </div>

    </Link>

  );

}


// =========================================================
// MOBILE QUICK ACTION
// =========================================================

function MobileQuickAction({
  to,
  label,
  description,
  icon: Icon,
  tone = "navy",
}: {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tone?:
    | "navy"
    | "rose"
    | "gold";
}) {

  const iconClass =

    tone === "rose"

      ? "bg-[#fcecef] text-[#b92f49]"

      : tone === "gold"

        ? "bg-[#f7efdf] text-[#9a762f]"

        : "bg-[#122033] text-[#d6a64c]";


  return (

    <Link
      to={
        to
      }
      className="
        flex
        min-h-[112px]
        flex-col
        justify-between
        rounded-2xl
        border
        border-[#ebe6dd]
        bg-white
        p-4
        active:bg-slate-50
      "
    >

      <div
        className={`
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-xl
          ${iconClass}
        `}
      >

        <Icon
          size={19}
        />

      </div>


      <div
        className="
          mt-4
          min-w-0
        "
      >

        <div
          className="
            truncate
            text-sm
            font-semibold
            text-[#172033]
          "
        >
          {label}
        </div>


        <div
          className="
            mt-1
            truncate
            text-[11px]
            text-slate-500
          "
        >
          {description}
        </div>

      </div>

    </Link>

  );

}


// =========================================================
// KPI CARD
// =========================================================

function DashboardStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  to,
  accent,
  danger = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  to: string;
  accent?:
    | "gold"
    | "rose";
  danger?: boolean;
}) {

  return (

    <Link
      to={
        to
      }
      className="
        group
        block
      "
    >

      <Card
        className="
          h-full
          rounded-2xl
          border-[#e9e2d8]
          shadow-sm
          transition
          group-hover:-translate-y-0.5
          group-hover:shadow-md
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

    </Link>

  );

}


// =========================================================
// ATTENTION
// =========================================================

function AttentionRow({
  label,
  value,
  to,
}: {
  label: string;
  value: string;
  to: string;
}) {

  return (

    <Link
      to={
        to
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
        hover:border-[#d8c79f]
        hover:bg-[#fcfaf5]
      "
    >

      <span
        className="
          text-sm
          text-slate-600
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

    </Link>

  );

}


// =========================================================
// QUICK ACTION
// =========================================================

function QuickAction({
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


export default Dashboard;