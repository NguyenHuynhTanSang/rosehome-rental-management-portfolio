import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router";

import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Gauge,
  RefreshCw,
  WalletCards,
  type LucideIcon,
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
} from "@/components/ui/card";

import type {
  Room,
} from "../types/room";

import type {
  Contract,
} from "../types/contract";

import type {
  Invoice,
} from "../types/invoice";

import type {
  MeterReading,
} from "../types/meterReading";

type PaymentHistoryResponse = {
  total_count: number;
  total_amount: number;
  bank_transfer_amount: number;
  cash_amount: number;
  other_amount: number;
  items: unknown[];
};

type DebtReportItemLite = {
  room_id: number;
  year: number;
  month: number;
  remaining_amount: number;
};

type DebtReportLite = {
  items: DebtReportItemLite[];
};

type MonthlySummary = {
  eligibleRoomCount: number;
  meterEnteredCount: number;
  meterMissingCount: number;
  invoiceCount: number;
  invoiceMissingCount: number;
  draftCount: number;
  issuedCount: number;
  cancelledCount: number;
  paidCount: number;
  notFullyPaidCount: number;
  partiallyPaidCount: number;
  collectedAmount: number;
  debtRoomCount: number;
  debtInvoiceCount: number;
  totalDebt: number;
};

type SummaryCardProps = {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger";
};

type WorkflowStepStatus =
  | "done"
  | "action"
  | "waiting";

type WorkflowStep = {
  label: string;
  detail: string;
  status: WorkflowStepStatus;
  icon: LucideIcon;
};

type NextAction = {
  title: string;
  description: string;
  path: string | null;
  buttonLabel: string | null;
  complete: boolean;
};

function getInitialPeriod() {
  const today = new Date();

  let year = today.getFullYear();
  let month = today.getMonth() + 1;

  if (typeof window === "undefined") {
    return { year, month };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const queryYear = Number(searchParams.get("year"));
  const queryMonth = Number(searchParams.get("month"));

  if (
    Number.isInteger(queryYear)
    && queryYear >= 2020
    && queryYear <= 2100
  ) {
    year = queryYear;
  }

  if (
    Number.isInteger(queryMonth)
    && queryMonth >= 1
    && queryMonth <= 12
  ) {
    month = queryMonth;
  }

  return { year, month };
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function getPeriodRange(
  year: number,
  month: number
) {
  const lastDay = new Date(year, month, 0).getDate();

  return {
    firstDay: `${year}-${pad2(month)}-01`,
    lastDay: `${year}-${pad2(month)}-${pad2(lastDay)}`,
  };
}

function contractIntersectsPeriod(
  contract: Contract,
  firstDay: string,
  lastDay: string
) {
  return (
    contract.start_date <= lastDay
    && (
      contract.end_date === null
      || contract.end_date >= firstDay
    )
  );
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("vi-VN").format(value)} đ`;
}

function buildPeriodPath(
  path: string,
  year: number,
  month: number
) {
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
  });

  return `${path}?${params.toString()}`;
}

function SummaryCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "default",
}: SummaryCardProps) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "bg-amber-50 text-amber-700"
        : tone === "danger"
          ? "bg-red-50 text-red-700"
          : "bg-[#eef1f5] text-[#20334d]";

  return (
    <div className="rounded-2xl border border-[#ece7df] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            {label}
          </div>

          <div className="mt-2 text-2xl font-semibold tracking-tight text-[#172033]">
            {value}
          </div>

          <div className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </div>
        </div>

        <div
          className={`
            flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
            ${toneClass}
          `}
        >
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}

function MonthlyOperations() {
  const navigate = useNavigate();

  const initialPeriod = useMemo(
    getInitialPeriod,
    []
  );

  const [year, setYear] = useState(
    initialPeriod.year
  );

  const [month, setMonth] = useState(
    initialPeriod.month
  );

  const [summary, setSummary] = useState<MonthlySummary | null>(
    null
  );

  const [loading, setLoading] = useState(
    true
  );

  const [error, setError] = useState(
    ""
  );

  const requestIdRef = useRef(
    0
  );

  const yearOptions = useMemo(
    () => {
      const values: number[] = [];

      for (
        let value = 2020;
        value <= 2100;
        value += 1
      ) {
        values.push(value);
      }

      return values;
    },
    []
  );

  const loadData = useCallback(
    async () => {
      const requestId =
        requestIdRef.current + 1;

      requestIdRef.current =
        requestId;

      try {
        setLoading(true);
        setError("");

        const [
          rooms,
          contracts,
          meterReadings,
          paymentData,
          debtData,
        ] = await Promise.all([
          apiGet<Room[]>(
            "/rooms"
          ),
          apiGet<Contract[]>(
            "/contracts"
          ),
          apiGet<MeterReading[]>(
            `/meter-readings/month/${year}/${month}`
          ),
          apiGet<PaymentHistoryResponse>(
            `/payments?year=${year}&month=${month}&limit=1&offset=0`
          ),
          apiGet<DebtReportLite>(
            "/reports/debts"
          ),
        ]);

        const histories =
          rooms.length > 0
            ? await Promise.all(
                rooms.map(
                  (room) =>
                    apiGet<Invoice[]>(
                      `/invoices/history/${room.id}/${year}/${month}`
                    )
                )
              )
            : [];

        if (
          requestId
          !== requestIdRef.current
        ) {
          return;
        }

        const roomIds = new Set(
          rooms.map(
            (room) =>
              room.id
          )
        );

        const {
          firstDay,
          lastDay,
        } = getPeriodRange(
          year,
          month
        );

        const eligibleRoomIds =
          new Set<number>();

        contracts.forEach(
          (contract) => {
            if (
              roomIds.has(
                contract.room_id
              )
              && contractIntersectsPeriod(
                contract,
                firstDay,
                lastDay
              )
            ) {
              eligibleRoomIds.add(
                contract.room_id
              );
            }
          }
        );

        const meterRoomIds = new Set(
          meterReadings.map(
            (reading) =>
              reading.room_id
          )
        );

        const meterEnteredCount =
          Array.from(
            eligibleRoomIds
          ).filter(
            (roomId) =>
              meterRoomIds.has(
                roomId
              )
          ).length;

        const invoices =
          histories.flat();

        const invoiceHistoryRoomIds =
          new Set(
            invoices.map(
              (invoice) =>
                invoice.room_id
            )
          );

        const latestInvoiceMap =
          new Map<number, Invoice>();

        invoices.forEach(
          (invoice) => {
            const current =
              latestInvoiceMap.get(
                invoice.room_id
              );

            if (
              !current
              || invoice.version
                > current.version
            ) {
              latestInvoiceMap.set(
                invoice.room_id,
                invoice
              );
            }
          }
        );

        const latestInvoices =
          Array.from(
            latestInvoiceMap.values()
          );

        const invoiceMissingCount =
          Array.from(
            eligibleRoomIds
          ).filter(
            (roomId) =>
              !invoiceHistoryRoomIds.has(
                roomId
              )
          ).length;

        const draftCount =
          latestInvoices.filter(
            (invoice) =>
              invoice.status
              === "DRAFT"
          ).length;

        const issuedInvoices =
          latestInvoices.filter(
            (invoice) =>
              invoice.status
              === "ISSUED"
          );

        const cancelledCount =
          latestInvoices.filter(
            (invoice) =>
              invoice.status
              === "CANCELLED"
          ).length;

        const paidCount =
          issuedInvoices.filter(
            (invoice) =>
              invoice.payment_status
              === "PAID"
          ).length;

        const partiallyPaidCount =
          issuedInvoices.filter(
            (invoice) =>
              invoice.payment_status
              === "PARTIALLY_PAID"
          ).length;

        const notFullyPaidCount =
          issuedInvoices.filter(
            (invoice) =>
              invoice.payment_status
              === "UNPAID"
              || invoice.payment_status
              === "PARTIALLY_PAID"
          ).length;

        const periodDebtItems =
          debtData.items.filter(
            (item) =>
              item.year === year
              && item.month === month
              && item.remaining_amount > 0
          );

        const debtRoomCount =
          new Set(
            periodDebtItems.map(
              (item) =>
                item.room_id
            )
          ).size;

        const totalDebt =
          periodDebtItems.reduce(
            (
              total,
              item
            ) =>
              total
              + item.remaining_amount,
            0
          );

        setSummary({
          eligibleRoomCount:
            eligibleRoomIds.size,

          meterEnteredCount,

          meterMissingCount:
            Math.max(
              eligibleRoomIds.size
              - meterEnteredCount,
              0
            ),

          invoiceCount:
            latestInvoices.length,

          invoiceMissingCount,

          draftCount,

          issuedCount:
            issuedInvoices.length,

          cancelledCount,

          paidCount,

          notFullyPaidCount,

          partiallyPaidCount,

          collectedAmount:
            paymentData.total_amount,

          debtRoomCount,

          debtInvoiceCount:
            periodDebtItems.length,

          totalDebt,
        });
      } catch (err) {
        if (
          requestId
          !== requestIdRef.current
        ) {
          return;
        }

        console.error(
          err
        );

        setSummary(
          null
        );

        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải dữ liệu vận hành tháng."
        );
      } finally {
        if (
          requestId
          === requestIdRef.current
        ) {
          setLoading(
            false
          );
        }
      }
    },
    [
      year,
      month,
    ]
  );

  useEffect(
    () => {
      void loadData();

      return () => {
        requestIdRef.current += 1;
      };
    },
    [
      loadData,
    ]
  );

  const meterProgress =
    summary
    && summary.eligibleRoomCount > 0
      ? Math.round(
          (
            summary.meterEnteredCount
            / summary.eligibleRoomCount
          ) * 100
        )
      : 0;

  const workflow = useMemo(
    () => {
      if (!summary) {
        return null;
      }

      const noRooms =
        summary.eligibleRoomCount === 0;

      if (noRooms) {
        const steps: WorkflowStep[] = [
          {
            label: "Chỉ số điện",
            detail: "Không phát sinh phòng cần nhập",
            status: "done",
            icon: Gauge,
          },
          {
            label: "Hóa đơn",
            detail: "Không phát sinh hóa đơn cần xử lý",
            status: "done",
            icon: FileText,
          },
          {
            label: "Thu tiền",
            detail: "Không có hóa đơn cần thu trong kỳ",
            status: "done",
            icon: CircleDollarSign,
          },
          {
            label: "Công nợ",
            detail: "Không phát sinh công nợ trong kỳ",
            status: "done",
            icon: WalletCards,
          },
        ];

        const nextAction: NextAction = {
          title: "Không có phòng cần xử lý trong kỳ này",
          description:
            `Tháng ${month}/${year} hiện không có phòng thuộc phạm vi vận hành.`,
          path: null,
          buttonLabel: null,
          complete: true,
        };

        return {
          steps,
          nextAction,
          completedCount: 4,
        };
      }

      const meterDone =
        summary.meterMissingCount === 0;

      const invoiceDone =
        meterDone
        && summary.invoiceMissingCount === 0
        && summary.draftCount === 0
        && summary.cancelledCount === 0;

      const paymentDone =
        invoiceDone
        && summary.notFullyPaidCount === 0;

      const debtDone =
        invoiceDone
        && summary.totalDebt <= 0;

      const steps: WorkflowStep[] = [
        {
          label: "Chỉ số điện",
          detail:
            meterDone
              ? `Đã nhập đủ ${summary.meterEnteredCount}/${summary.eligibleRoomCount} phòng`
              : `Còn ${summary.meterMissingCount} phòng chưa nhập`,
          status:
            meterDone
              ? "done"
              : "action",
          icon: Gauge,
        },
        {
          label: "Hóa đơn",
          detail:
            !meterDone
              ? "Chờ hoàn tất chỉ số điện"
              : summary.invoiceMissingCount > 0
                ? `Còn ${summary.invoiceMissingCount} phòng chưa có hóa đơn`
                : summary.draftCount > 0
                  ? `Còn ${summary.draftCount} hóa đơn nháp cần kiểm tra`
                  : summary.cancelledCount > 0
                    ? `Có ${summary.cancelledCount} hóa đơn đã hủy cần kiểm tra`
                    : "Hóa đơn trong kỳ đã xử lý",
          status:
            !meterDone
              ? "waiting"
              : invoiceDone
                ? "done"
                : "action",
          icon: FileText,
        },
        {
          label: "Thu tiền",
          detail:
            !invoiceDone
              ? "Chờ hoàn tất hóa đơn"
              : summary.notFullyPaidCount > 0
                ? `Còn ${summary.notFullyPaidCount} hóa đơn chưa thanh toán đủ`
                : summary.issuedCount > 0
                  ? "Các hóa đơn đã phát hành đã thanh toán đủ"
                  : "Không có hóa đơn cần thu",
          status:
            !invoiceDone
              ? "waiting"
              : paymentDone
                ? "done"
                : "action",
          icon: CircleDollarSign,
        },
        {
          label: "Công nợ",
          detail:
            !invoiceDone
              ? "Theo dõi sau khi hoàn tất hóa đơn"
              : summary.totalDebt > 0
                ? `Còn ${formatMoney(summary.totalDebt)} phải thu`
                : "Không còn công nợ trong kỳ",
          status:
            !invoiceDone
              ? "waiting"
              : debtDone
                ? "done"
                : "action",
          icon: WalletCards,
        },
      ];

      let nextAction: NextAction;

      if (summary.meterMissingCount > 0) {
        nextAction = {
          title: "Hoàn tất chỉ số điện",
          description:
            `Còn ${summary.meterMissingCount} phòng chưa có chỉ số điện tháng ${month}/${year}.`,
          path:
            buildPeriodPath(
              "/meter-readings",
              year,
              month
            ),
          buttonLabel: "Nhập chỉ số điện",
          complete: false,
        };
      } else if (summary.invoiceMissingCount > 0) {
        nextAction = {
          title: "Tạo và kiểm tra hóa đơn còn thiếu",
          description:
            `Còn ${summary.invoiceMissingCount} phòng chưa có lịch sử hóa đơn trong kỳ.`,
          path:
            buildPeriodPath(
              "/invoices",
              year,
              month
            ),
          buttonLabel: "Quản lý hóa đơn",
          complete: false,
        };
      } else if (summary.draftCount > 0) {
        nextAction = {
          title: "Kiểm tra và phát hành hóa đơn nháp",
          description:
            `Còn ${summary.draftCount} hóa đơn nháp cần kiểm tra trước khi phát hành.`,
          path:
            buildPeriodPath(
              "/invoices",
              year,
              month
            ),
          buttonLabel: "Xử lý hóa đơn nháp",
          complete: false,
        };
      } else if (summary.cancelledCount > 0) {
        nextAction = {
          title: "Kiểm tra hóa đơn đã hủy",
          description:
            `Có ${summary.cancelledCount} hóa đơn đã hủy trong kỳ. Kiểm tra xem có cần tạo hóa đơn thay thế hay không.`,
          path:
            buildPeriodPath(
              "/invoices",
              year,
              month
            ),
          buttonLabel: "Kiểm tra hóa đơn",
          complete: false,
        };
      } else if (summary.notFullyPaidCount > 0) {
        nextAction = {
          title: "Thu các hóa đơn chưa thanh toán đủ",
          description:
            `Còn ${summary.notFullyPaidCount} hóa đơn đã phát hành nhưng chưa thanh toán đủ.`,
          path:
            buildPeriodPath(
              "/invoices",
              year,
              month
            ),
          buttonLabel: "Xem hóa đơn cần thu",
          complete: false,
        };
      } else if (summary.totalDebt > 0) {
        nextAction = {
          title: "Theo dõi công nợ còn lại",
          description:
            `Kỳ ${month}/${year} hiện còn ${formatMoney(summary.totalDebt)} công nợ.`,
          path:
            buildPeriodPath(
              "/debts",
              year,
              month
            ),
          buttonLabel: "Xem công nợ",
          complete: false,
        };
      } else {
        nextAction = {
          title: "Đã hoàn tất các bước vận hành chính",
          description:
            `Kỳ ${month}/${year} hiện không còn việc cần xử lý theo các dữ liệu đang có.`,
          path: null,
          buttonLabel: null,
          complete: true,
        };
      }

      return {
        steps,
        nextAction,
        completedCount:
          steps.filter(
            (step) =>
              step.status === "done"
          ).length,
      };
    },
    [
      summary,
      year,
      month,
    ]
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="rounded-3xl border border-[#e9e2d8] bg-white p-5 shadow-sm md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#f7f0e3] px-3 py-1.5 text-xs font-semibold text-[#8a6726]">
              <CalendarDays size={15} />
              Quy trình vận hành theo tháng
            </div>

            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#172033] md:text-3xl">
              Vận hành tháng
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Theo dõi từ chỉ số điện, hóa đơn, thu tiền đến công nợ cho cùng một kỳ.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-end">
            <label className="block text-sm font-medium text-slate-600">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                Tháng
              </span>

              <select
                value={month}
                onChange={
                  (event) =>
                    setMonth(
                      Number(
                        event.target.value
                      )
                    )
                }
                className="h-11 min-w-32 rounded-xl border border-[#ddd8ce] bg-white px-3 text-sm text-[#172033] outline-none focus:border-[#d6a64c]"
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
                  (value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      Tháng {value}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-600">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                Năm
              </span>

              <select
                value={year}
                onChange={
                  (event) =>
                    setYear(
                      Number(
                        event.target.value
                      )
                    )
                }
                className="h-11 min-w-28 rounded-xl border border-[#ddd8ce] bg-white px-3 text-sm text-[#172033] outline-none focus:border-[#d6a64c]"
              >
                {yearOptions.map(
                  (value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {value}
                    </option>
                  )
                )}
              </select>
            </label>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle
              className="mt-0.5 shrink-0 text-red-600"
              size={20}
            />

            <div>
              <div className="text-sm font-semibold text-red-700">
                Không thể tải dữ liệu vận hành
              </div>

              <div className="mt-1 text-sm text-red-600">
                {error}
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={
              () => {
                void loadData();
              }
            }
            className="shrink-0 border-red-200 bg-white"
          >
            <RefreshCw size={16} />
            Thử lại
          </Button>
        </div>
      )}

      {loading && (
        <Card className="rounded-3xl border-[#e9e2d8] shadow-sm">
          <CardContent className="flex min-h-48 items-center justify-center p-6">
            <div className="text-center">
              <RefreshCw
                className="mx-auto animate-spin text-[#b7862e]"
                size={26}
              />

              <div className="mt-3 text-sm font-medium text-slate-600">
                Đang tổng hợp dữ liệu tháng {month}/{year}...
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading
      && summary
      && workflow
      && (
        <div className="space-y-5">
          <Card className="overflow-hidden rounded-3xl border-[#e9e2d8] shadow-sm">
            <div
              className={
                workflow.nextAction.complete
                  ? "h-1.5 bg-emerald-500"
                  : "h-1.5 bg-amber-500"
              }
            />

            <CardContent className="p-5 md:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={
                      workflow.nextAction.complete
                        ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"
                        : "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"
                    }
                  >
                    {workflow.nextAction.complete
                      ? (
                        <CheckCircle2 size={22} />
                      )
                      : (
                        <AlertCircle size={22} />
                      )}
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Tiến độ tháng {month}/{year}
                    </div>

                    <h2 className="mt-1 text-xl font-semibold text-[#172033]">
                      {workflow.nextAction.title}
                    </h2>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                      {workflow.nextAction.description}
                    </p>

                    <div className="mt-3 text-xs font-semibold text-slate-500">
                      {workflow.completedCount}/4 bước đã hoàn tất
                    </div>
                  </div>
                </div>

                {workflow.nextAction.path
                && workflow.nextAction.buttonLabel
                && (
                  <Button
                    type="button"
                    className="shrink-0"
                    onClick={
                      () => {
                        const path =
                          workflow.nextAction.path;

                        if (path) {
                          navigate(
                            path
                          );
                        }
                      }
                    }
                  >
                    {workflow.nextAction.buttonLabel}
                    <ArrowRight size={16} />
                  </Button>
                )}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {workflow.steps.map(
                  (
                    step,
                    index
                  ) => {
                    const Icon =
                      step.icon;

                    const isDone =
                      step.status === "done";

                    const isAction =
                      step.status === "action";

                    return (
                      <div
                        key={step.label}
                        className={
                          isDone
                            ? "rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"
                            : isAction
                              ? "rounded-2xl border border-amber-200 bg-amber-50/60 p-4"
                              : "rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div
                            className={
                              isDone
                                ? "flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-700"
                                : isAction
                                  ? "flex h-9 w-9 items-center justify-center rounded-xl bg-white text-amber-700"
                                  : "flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500"
                            }
                          >
                            <Icon size={18} />
                          </div>

                          <span
                            className={
                              isDone
                                ? "rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
                                : isAction
                                  ? "rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700"
                                  : "rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                            }
                          >
                            {isDone
                              ? "Hoàn tất"
                              : isAction
                                ? "Cần xử lý"
                                : "Đang chờ"}
                          </span>
                        </div>

                        <div className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                          Bước {index + 1}
                        </div>

                        <div className="mt-1 text-sm font-semibold text-[#172033]">
                          {step.label}
                        </div>

                        <div className="mt-1 text-xs leading-5 text-slate-500">
                          {step.detail}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={
                    workflow.completedCount === 4
                      ? "h-full rounded-full bg-emerald-500 transition-all"
                      : "h-full rounded-full bg-amber-500 transition-all"
                  }
                  style={{
                    width:
                      `${workflow.completedCount * 25}%`,
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-3xl border-[#e9e2d8] shadow-sm">
            <div className="h-1.5 bg-[#d6a64c]" />

            <CardContent className="p-5 md:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff7e8] text-[#9a762f]">
                      <Gauge size={22} />
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                        Bước 1
                      </div>

                      <h2 className="text-xl font-semibold text-[#172033]">
                        Chỉ số điện
                      </h2>
                    </div>
                  </div>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                    Mẫu số chỉ tính các phòng có hợp đồng giao với kỳ {month}/{year}.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={
                    () =>
                      navigate(
                        buildPeriodPath(
                          "/meter-readings",
                          year,
                          month
                        )
                      )
                  }
                >
                  Nhập chỉ số điện
                  <ArrowRight size={16} />
                </Button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <SummaryCard
                  label="Cần nhập"
                  value={
                    String(
                      summary.eligibleRoomCount
                    )
                  }
                  description="Phòng cần xử lý trong kỳ"
                  icon={Gauge}
                />

                <SummaryCard
                  label="Đã nhập"
                  value={
                    String(
                      summary.meterEnteredCount
                    )
                  }
                  description={`${meterProgress}% hoàn thành`}
                  icon={CheckCircle2}
                  tone="success"
                />

                <SummaryCard
                  label="Còn thiếu"
                  value={
                    String(
                      summary.meterMissingCount
                    )
                  }
                  description="Phòng chưa có chỉ số kỳ này"
                  icon={AlertCircle}
                  tone={
                    summary.meterMissingCount > 0
                      ? "warning"
                      : "success"
                  }
                />
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#d6a64c] transition-all"
                  style={{
                    width:
                      `${meterProgress}%`,
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-3xl border-[#e9e2d8] shadow-sm">
            <div className="h-1.5 bg-[#20334d]" />

            <CardContent className="p-5 md:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef1f5] text-[#20334d]">
                      <FileText size={22} />
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                        Bước 2
                      </div>

                      <h2 className="text-xl font-semibold text-[#172033]">
                        Hóa đơn
                      </h2>
                    </div>
                  </div>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                    Trạng thái được tính theo phiên bản hóa đơn mới nhất của từng phòng trong kỳ.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={
                    () =>
                      navigate(
                        buildPeriodPath(
                          "/invoices",
                          year,
                          month
                        )
                      )
                  }
                >
                  Quản lý hóa đơn
                  <ArrowRight size={16} />
                </Button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <SummaryCard
                  label="Đã có hóa đơn"
                  value={
                    String(
                      summary.invoiceCount
                    )
                  }
                  description="Phiên bản mới nhất theo phòng"
                  icon={FileText}
                />

                <SummaryCard
                  label="Chưa có lịch sử"
                  value={
                    String(
                      summary.invoiceMissingCount
                    )
                  }
                  description="Phòng cần xử lý nhưng chưa có hóa đơn"
                  icon={AlertCircle}
                  tone={
                    summary.invoiceMissingCount > 0
                      ? "warning"
                      : "success"
                  }
                />

                <SummaryCard
                  label="Nháp"
                  value={
                    String(
                      summary.draftCount
                    )
                  }
                  description="Hóa đơn chưa phát hành"
                  icon={FileText}
                  tone="warning"
                />

                <SummaryCard
                  label="Đã phát hành"
                  value={
                    String(
                      summary.issuedCount
                    )
                  }
                  description="Hóa đơn đang có hiệu lực"
                  icon={CheckCircle2}
                  tone="success"
                />

                <SummaryCard
                  label="Đã hủy"
                  value={
                    String(
                      summary.cancelledCount
                    )
                  }
                  description="Cần kiểm tra nếu phải tạo thay thế"
                  icon={AlertCircle}
                  tone={
                    summary.cancelledCount > 0
                      ? "danger"
                      : "default"
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-3xl border-[#e9e2d8] shadow-sm">
            <div className="h-1.5 bg-emerald-500" />

            <CardContent className="p-5 md:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                      <CircleDollarSign size={22} />
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                        Bước 3
                      </div>

                      <h2 className="text-xl font-semibold text-[#172033]">
                        Thu tiền
                      </h2>
                    </div>
                  </div>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                    Chỉ tính trạng thái thanh toán của hóa đơn đã phát hành. Tổng tiền là số đã thu cho hóa đơn thuộc kỳ {month}/{year}.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={
                    () =>
                      navigate(
                        buildPeriodPath(
                          "/invoices",
                          year,
                          month
                        )
                      )
                  }
                >
                  Xem hóa đơn cần thu
                  <ArrowRight size={16} />
                </Button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  label="Đã thanh toán"
                  value={
                    String(
                      summary.paidCount
                    )
                  }
                  description="Hóa đơn ISSUED đã đủ tiền"
                  icon={CheckCircle2}
                  tone="success"
                />

                <SummaryCard
                  label="Chưa thanh toán đủ"
                  value={
                    String(
                      summary.notFullyPaidCount
                    )
                  }
                  description="UNPAID hoặc PARTIALLY_PAID"
                  icon={WalletCards}
                  tone={
                    summary.notFullyPaidCount > 0
                      ? "warning"
                      : "success"
                  }
                />

                <SummaryCard
                  label="Thanh toán một phần"
                  value={
                    String(
                      summary.partiallyPaidCount
                    )
                  }
                  description="Hóa đơn đã thu nhưng chưa đủ"
                  icon={CircleDollarSign}
                  tone={
                    summary.partiallyPaidCount > 0
                      ? "warning"
                      : "default"
                  }
                />

                <SummaryCard
                  label="Đã thu cho hóa đơn kỳ"
                  value={
                    formatMoney(
                      summary.collectedAmount
                    )
                  }
                  description={`${month}/${year}`}
                  icon={CircleDollarSign}
                  tone="success"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-3xl border-[#e9e2d8] shadow-sm">
            <div className="h-1.5 bg-[#e44763]" />

            <CardContent className="p-5 md:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fcecef] text-[#b92f49]">
                      <WalletCards size={22} />
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                        Bước 4
                      </div>

                      <h2 className="text-xl font-semibold text-[#172033]">
                        Công nợ
                      </h2>
                    </div>
                  </div>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                    Đây là công nợ hiện còn của các hóa đơn thuộc kỳ {month}/{year}.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={
                    () =>
                      navigate(
                        buildPeriodPath(
                          "/debts",
                          year,
                          month
                        )
                      )
                  }
                >
                  Xem công nợ
                  <ArrowRight size={16} />
                </Button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <SummaryCard
                  label="Phòng còn nợ"
                  value={
                    String(
                      summary.debtRoomCount
                    )
                  }
                  description="Số phòng có công nợ trong kỳ"
                  icon={WalletCards}
                  tone={
                    summary.debtRoomCount > 0
                      ? "danger"
                      : "success"
                  }
                />

                <SummaryCard
                  label="Khoản còn nợ"
                  value={
                    String(
                      summary.debtInvoiceCount
                    )
                  }
                  description="Số hóa đơn còn số dư"
                  icon={FileText}
                  tone={
                    summary.debtInvoiceCount > 0
                      ? "danger"
                      : "success"
                  }
                />

                <SummaryCard
                  label="Tổng công nợ kỳ"
                  value={
                    formatMoney(
                      summary.totalDebt
                    )
                  }
                  description="Tổng số tiền hiện còn phải thu"
                  icon={WalletCards}
                  tone={
                    summary.totalDebt > 0
                      ? "danger"
                      : "success"
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default MonthlyOperations;
