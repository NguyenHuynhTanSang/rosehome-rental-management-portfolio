import {
  useEffect,
  useRef,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router";

import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  FileSpreadsheet,
  FileText,
  Filter,
  Plus,
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
  apiPost,
} from "../api/api";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import AddPaymentModal
  from "../components/AddPaymentModal";

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
  Invoice,
  InvoiceBulkGenerate,
  InvoiceBulkResult,
} from "../types/invoice";

import type {
  MeterReading,
} from "../types/meterReading";

import type {
  Payment,
} from "../types/payment";


type InvoiceBulkIssueRequest = {
  invoice_ids: number[];
};


type InvoiceBulkIssueSkipped = {
  invoice_id: number;
  reason: string;
};


type InvoiceBulkIssueResult = {
  issued_count: number;
  skipped_count: number;
  issued_invoice_ids: number[];
  skipped_invoices: InvoiceBulkIssueSkipped[];
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


function getInvoiceStatusText(
  status: string
) {
  if (status === "DRAFT") {
    return "Nháp";
  }

  if (status === "ISSUED") {
    return "Đã phát hành";
  }

  if (status === "CANCELLED") {
    return "Đã hủy";
  }

  return status;
}


function getPaymentStatusText(
  status?: string
) {
  if (!status) {
    return "-";
  }

  if (status === "UNPAID") {
    return "Chưa thanh toán";
  }

  if (
    status === "PARTIALLY_PAID"
  ) {
    return "Thanh toán một phần";
  }

  if (status === "PAID") {
    return "Đã thanh toán";
  }

  return status;
}


function safeSheetName(
  value: string
) {
  const cleaned =
    value
      .replace(
        /[\\/*?:[\]]/g,
        "_"
      )
      .trim();

  return (
    cleaned.slice(
      0,
      31
    )
    ||
    "Phong"
  );
}


function padMonth(
  value: number
) {
  return String(
    value
  ).padStart(
    2,
    "0"
  );
}


// =========================================================
// INVOICES
// =========================================================

type TransitionPreview = {
  candidates: { room_id: number; room_code: string; old_reading: number; electricity_rate: number }[];
  warnings: string[];
};

type InvoiceTypeFilter = "ALL" | "MONTHLY" | "CHECKOUT";

function Invoices() {
  const [transitionDialog, setTransitionDialog] = useState(false);
  const [transitionPreview, setTransitionPreview] = useState<TransitionPreview | null>(null);
  const [transitionInputs, setTransitionInputs] = useState<Record<number, string>>({});
  const [transitionSelected, setTransitionSelected] = useState<Record<number, boolean>>({});
  const [transitionError, setTransitionError] = useState("");
  const transitionRequest = useRef(0);


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
    invoices,
    setInvoices,
  ] = useState<Invoice[]>([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    generating,
    setGenerating,
  ] = useState(false);


  const [
    exportingExcel,
    setExportingExcel,
  ] = useState(false);


  const [
    search,
    setSearch,
  ] = useState("");


  const [invoiceTypeFilter, setInvoiceTypeFilter] =
    useState<InvoiceTypeFilter>("ALL");
  const [checkoutMonthFilter, setCheckoutMonthFilter] =
    useState<number | "ALL">("ALL");
  const [checkoutYearFilter, setCheckoutYearFilter] =
    useState<number | "ALL">("ALL");
  const [allCheckoutInvoices, setAllCheckoutInvoices] = useState<Invoice[]>([]);
  const [checkoutHistoryLoading, setCheckoutHistoryLoading] = useState(false);
  const [checkoutHistoryError, setCheckoutHistoryError] = useState("");
  const checkoutHistoryRequest = useRef(0);


  const [
    invoiceStatusFilter,
    setInvoiceStatusFilter,
  ] = useState("ALL");


  const [
    paymentStatusFilter,
    setPaymentStatusFilter,
  ] = useState("ALL");


  const [
    floorFilter,
    setFloorFilter,
  ] = useState("ALL");


  const [
    sortBy,
    setSortBy,
  ] = useState("ROOM_ASC");


  const [
    error,
    setError,
  ] = useState("");


  const [
    success,
    setSuccess,
  ] = useState("");


  const [
    bulkResult,
    setBulkResult,
  ] = useState<
    InvoiceBulkResult | null
  >(null);


  const [
    mobileFiltersOpen,
    setMobileFiltersOpen,
  ] = useState(false);


  const [
    selectionMode,
    setSelectionMode,
  ] = useState(false);


  const [
    selectedInvoiceIds,
    setSelectedInvoiceIds,
  ] = useState<number[]>([]);


  const [
    issuingSelected,
    setIssuingSelected,
  ] = useState(false);


  const [
    bulkIssueResult,
    setBulkIssueResult,
  ] = useState<
    InvoiceBulkIssueResult | null
  >(null);


  const [
    quickPaymentInvoice,
    setQuickPaymentInvoice,
  ] = useState<Invoice | null>(
    null
  );


  const [
    quickPaymentRemaining,
    setQuickPaymentRemaining,
  ] = useState(0);


  const [
    quickPaymentLoadingId,
    setQuickPaymentLoadingId,
  ] = useState<number | null>(
    null
  );


  useEffect(
    () => {

      setSelectedInvoiceIds(
        []
      );

    },
    [
      year,
      month,
      search,
      invoiceTypeFilter,
      checkoutMonthFilter,
      checkoutYearFilter,
      invoiceStatusFilter,
      paymentStatusFilter,
      floorFilter,
      sortBy,
    ]
  );


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

          setLoading(
            false
          );

        }

      }


      loadRooms();

    },
    []
  );


  // =========================================================
  // LOAD INVOICES
  // =========================================================

  async function loadInvoices() {

    if (
      rooms.length === 0
    ) {

      setInvoices(
        []
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
      setSuccess("");


      const histories =
        await Promise.all(

          rooms.map(
            (
              room
            ) =>
              apiGet<Invoice[]>(
                `/invoices/history/${room.id}/${year}/${month}`
              )
          )

        );


      setInvoices(
        histories.flat()
      );


    } catch (err) {

      console.error(
        err
      );

      setError(
        "Không thể tải hóa đơn."
      );

      setInvoices(
        []
      );


    } finally {

      setLoading(
        false
      );

    }

  }


  useEffect(
    () => {

      loadInvoices();

    },
    [
      rooms,
      year,
      month,
    ]
  );


  // Checkout history is loaded only when needed. Monthly invoices and
  // monthly summary/Excel continue using the selected billing period.
  async function loadCheckoutHistory() {
    const requestId = ++checkoutHistoryRequest.current;
    setCheckoutHistoryLoading(true);
    setCheckoutHistoryError("");
    try {
      const data = await apiGet<Invoice[]>("/invoices/checkout-history");
      if (requestId !== checkoutHistoryRequest.current) return;
      setAllCheckoutInvoices(data);
    } catch (err) {
      if (requestId !== checkoutHistoryRequest.current) return;
      setAllCheckoutInvoices([]);
      setCheckoutHistoryError(
        err instanceof Error ? err.message : "Không thể tải lịch sử hóa đơn trả phòng."
      );
    } finally {
      if (requestId === checkoutHistoryRequest.current) {
        setCheckoutHistoryLoading(false);
      }
    }
  }

  useEffect(() => {
    if (invoiceTypeFilter === "CHECKOUT") {
      void loadCheckoutHistory();
    }
    return () => { checkoutHistoryRequest.current += 1; };
  }, [invoiceTypeFilter]);

  async function handleReloadInvoices() {
    await Promise.all([
      loadInvoices(),
      invoiceTypeFilter === "CHECKOUT"
        ? loadCheckoutHistory()
        : Promise.resolve(),
    ]);
  }

  const isCheckoutHistoryView = invoiceTypeFilter === "CHECKOUT";
  const displayLoading = loading || (isCheckoutHistoryView && checkoutHistoryLoading);

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
              room.room_code,
            ]
          )
        ),

      [
        rooms,
      ]
    );


  const roomFloorMap =
    useMemo(
      () =>

        new Map(
          rooms.map(
            (
              room
            ) => [
              room.id,
              room.floor,
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
  // LATEST VERSION
  // =========================================================

  const latestInvoices =
    useMemo(
      () => {

        const checkoutInvoices =
          invoices.filter(
            (
              invoice
            ) =>
              Boolean(
                invoice.checkout_settlement
              )
          );


        const checkoutSourceIds =
          new Set<number>(
            checkoutInvoices
              .map(
                (
                  invoice
                ) =>
                  invoice.checkout_settlement
                    ?.source_invoice_id
              )
              .filter(
                (
                  id
                ): id is number =>
                  id !== null
                  &&
                  id !== undefined
              )
          );


        const regularByRoom =
          new Map<
            number,
            Invoice
          >();


        invoices.forEach(
          (
            invoice
          ) => {

            // Checkout invoices are independent final-settlement
            // financial documents, so do not collapse them into
            // the normal monthly invoice version chain.
            if (
              invoice.checkout_settlement
            ) {
              return;
            }


            // In the old unpaid checkout flow, the source invoice
            // was cancelled and replaced by the checkout invoice.
            // Do not surface that cancelled source beside it.
            if (
              invoice.status
              === "CANCELLED"
              &&
              checkoutSourceIds.has(
                invoice.id
              )
            ) {
              return;
            }


            const current =
              regularByRoom.get(
                invoice.room_id
              );


            if (
              !current
              ||
              invoice.version
              >
              current.version
            ) {

              regularByRoom.set(
                invoice.room_id,
                invoice
              );

            }

          }
        );


        // A preserved PAID monthly invoice and its checkout invoice
        // are both real financial documents and must both contribute
        // to the month view, summary and Excel export.
        return [
          ...Array.from(
            regularByRoom.values()
          ),
          ...checkoutInvoices,
        ].sort(
          (
            a,
            b
          ) => {

            const roomA =
              roomMap.get(
                a.room_id
              )
              ?? "";

            const roomB =
              roomMap.get(
                b.room_id
              )
              ?? "";


            const roomCompare =
              roomA.localeCompare(
                roomB
              );


            if (
              roomCompare
              !== 0
            ) {
              return roomCompare;
            }


            return (
              a.version
              -
              b.version
            );

          }
        );

      },
      [
        invoices,
        roomMap,
      ]
    );


  // Checkout history uses its own period filters, independent of monthly billing.
  // The monthly dashboard and Excel export still rely on latestInvoices only.
  const checkoutYearOptions = useMemo(
    () => Array.from(new Set([
      new Date().getFullYear(),
      ...allCheckoutInvoices.map((invoice) => invoice.year),
    ])).sort((a, b) => b - a),
    [allCheckoutInvoices]
  );
  const scopedCheckoutInvoices = useMemo(
    () => allCheckoutInvoices.filter((invoice) =>
      (checkoutMonthFilter === "ALL" || invoice.month === checkoutMonthFilter)
      && (checkoutYearFilter === "ALL" || invoice.year === checkoutYearFilter)
    ),
    [allCheckoutInvoices, checkoutMonthFilter, checkoutYearFilter]
  );
  const displayInvoices = isCheckoutHistoryView ? scopedCheckoutInvoices : latestInvoices;
  const invoiceTypeCounts = useMemo(() => ({
    ALL: latestInvoices.length,
    MONTHLY: latestInvoices.filter((invoice) => !invoice.checkout_settlement).length,
    CHECKOUT: isCheckoutHistoryView
      ? scopedCheckoutInvoices.length
      : latestInvoices.filter((invoice) => Boolean(invoice.checkout_settlement)).length,
  }), [latestInvoices, isCheckoutHistoryView, scopedCheckoutInvoices]);

  // =========================================================
  // SEARCH + FILTER
  // =========================================================

  const filteredInvoices =
    useMemo(
      () => {

        const keyword =
          search
            .trim()
            .toLowerCase();


        const result =
          displayInvoices.filter(
            (
              invoice
            ) => {

              const roomCode =
                roomMap.get(
                  invoice.room_id
                )
                ?? "";


              const matchesType =
                invoiceTypeFilter === "ALL"
                || (invoiceTypeFilter === "CHECKOUT"
                  ? Boolean(invoice.checkout_settlement)
                  : !invoice.checkout_settlement);

              const matchesSearch =
                keyword === ""
                ||
                roomCode
                  .toLowerCase()
                  .includes(
                    keyword
                  )
                ||
                String(
                  invoice.id
                ).includes(
                  keyword
                );


              const matchesInvoiceStatus =
                invoiceStatusFilter
                === "ALL"
                ||
                invoice.status
                === invoiceStatusFilter;


              const matchesPaymentStatus =
                paymentStatusFilter
                === "ALL"
                ||
                invoice.payment_status
                === paymentStatusFilter;


              const roomFloor =
                roomFloorMap.get(
                  invoice.room_id
                );


              const matchesFloor =
                floorFilter
                === "ALL"
                ||
                (
                  roomFloor !== null
                  &&
                  roomFloor !== undefined
                  &&
                  String(
                    roomFloor
                  )
                  === floorFilter
                );


              return (
                matchesType
                &&
                matchesSearch
                &&
                matchesInvoiceStatus
                &&
                matchesPaymentStatus
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
              === "TOTAL_DESC"
            ) {
              return (
                b.total_amount
                -
                a.total_amount
              );
            }


            if (
              sortBy
              === "TOTAL_ASC"
            ) {
              return (
                a.total_amount
                -
                b.total_amount
              );
            }


            const roomA =
              roomMap.get(
                a.room_id
              )
              ?? "";

            const roomB =
              roomMap.get(
                b.room_id
              )
              ?? "";


            return roomA.localeCompare(
              roomB
            );

          }
        );

      },
      [
        displayInvoices,
        roomMap,
        roomFloorMap,
        invoiceTypeFilter,
        search,
        invoiceStatusFilter,
        paymentStatusFilter,
        floorFilter,
        sortBy,
      ]
    );


  const visibleDraftInvoices =
    useMemo(
      () =>
        filteredInvoices.filter(
          (
            invoice
          ) =>
            invoice.status
            === "DRAFT"
        ),
      [
        filteredInvoices,
      ]
    );


  const selectedDraftInvoices =
    useMemo(
      () => {

        const selectedIds =
          new Set(
            selectedInvoiceIds
          );


        return visibleDraftInvoices.filter(
          (
            invoice
          ) =>
            selectedIds.has(
              invoice.id
            )
        );

      },
      [
        visibleDraftInvoices,
        selectedInvoiceIds,
      ]
    );


  const allVisibleDraftsSelected =
    visibleDraftInvoices.length > 0
    &&
    selectedDraftInvoices.length
    === visibleDraftInvoices.length;


  const selectedDraftTotal =
    selectedDraftInvoices.reduce(
      (
        total,
        invoice
      ) =>
        total
        +
        invoice.total_amount,
      0
    );


  function handleToggleSelectionMode() {

    setSelectionMode(
      (
        current
      ) =>
        !current
    );

    setSelectedInvoiceIds(
      []
    );

    setBulkIssueResult(
      null
    );

  }


  function handleToggleInvoiceSelection(
    invoiceId: number
  ) {

    setSelectedInvoiceIds(
      (
        current
      ) =>

        current.includes(
          invoiceId
        )

          ? current.filter(
              (
                id
              ) =>
                id !== invoiceId
            )

          : [
              ...current,
              invoiceId,
            ]
    );

  }


  function handleToggleAllVisibleDrafts() {

    const visibleIds =
      visibleDraftInvoices.map(
        (
          invoice
        ) =>
          invoice.id
      );


    setSelectedInvoiceIds(
      allVisibleDraftsSelected
        ? []
        : visibleIds
    );

  }


  function handleResetFilters() {

    // Reset criteria without unexpectedly leaving the selected invoice tab.
    setCheckoutMonthFilter("ALL");
    setCheckoutYearFilter("ALL");
    setSearch("");

    setInvoiceStatusFilter(
      "ALL"
    );

    setPaymentStatusFilter(
      "ALL"
    );

    setFloorFilter(
      "ALL"
    );

    setSortBy(
      "ROOM_ASC"
    );

    setSelectedInvoiceIds(
      []
    );

  }


  // =========================================================
  // SUMMARY
  // =========================================================

  const totalAmount =
    latestInvoices.reduce(
      (
        sum,
        invoice
      ) =>
        invoice.status
        === "CANCELLED"

          ? sum

          : sum
            +
            invoice.total_amount,

      0
    );


  const draftCount =
    latestInvoices.filter(
      (
        invoice
      ) =>
        invoice.status
        === "DRAFT"
    ).length;


  const issuedCount =
    latestInvoices.filter(
      (
        invoice
      ) =>
        invoice.status
        === "ISSUED"
    ).length;


  const unpaidCount =
    latestInvoices.filter(
      (
        invoice
      ) =>
        invoice.status
        !== "CANCELLED"
        &&
        invoice.payment_status
        !== "PAID"
    ).length;


  // =========================================================
  // BULK GENERATE
  // =========================================================

  useEffect(() => {
    transitionRequest.current += 1;
    setTransitionDialog(false);
    setTransitionPreview(null);
    setTransitionInputs({});
    setTransitionSelected({});
    return () => { transitionRequest.current += 1; };
  }, [year, month]);

  async function handleGenerateBulk() {
    const requestId = ++transitionRequest.current;
    setTransitionDialog(true);
    setTransitionPreview(null);
    setTransitionError("");
    try {
      const preview = await apiGet<TransitionPreview>(`/invoices/transition-preview?year=${year}&month=${month}`);
      if (requestId !== transitionRequest.current) return;
      const pendingIds = new Set(preview.candidates.map((room) => room.room_id));
      setTransitionInputs((current) => Object.fromEntries(
        Object.entries(current).filter(([roomId]) => pendingIds.has(Number(roomId)))
      ));
      setTransitionSelected((current) => Object.fromEntries(
        Object.entries(current).filter(([roomId]) => pendingIds.has(Number(roomId)))
      ));
      setTransitionPreview(preview);
    } catch (err) {
      if (requestId === transitionRequest.current) setTransitionError(err instanceof Error ? err.message : "Không thể tải điện chuyển tiếp.");
    }
  }

  async function submitGenerateBulk() {
    if (!transitionDialog || !transitionPreview || generating) return;
    const transitionReadings: NonNullable<InvoiceBulkGenerate["transition_readings"]> = [];
    for (const room of transitionPreview.candidates) {
      if (!transitionSelected[room.room_id]) continue;
      const raw = transitionInputs[room.room_id]?.trim() ?? "";
      const current = Number(raw);
      if (!/^\d+$/.test(raw) || !Number.isSafeInteger(current) || current > 2147483647 || current < room.old_reading) {
        setTransitionError(`${room.room_code}: Chỉ số hiện tại phải là số nguyên, từ ${room.old_reading} đến 2147483647.`);
        return;
      }
      transitionReadings.push({ room_id: room.room_id, current_reading: current });
    }
    setTransitionError("");

    try {

      setGenerating(
        true
      );

      setError("");
      setSuccess("");

      setBulkResult(
        null
      );


      const data:
        InvoiceBulkGenerate = {

        year,
        month,
        transition_readings: transitionReadings,

      };


      const result =
        await apiPost<
          InvoiceBulkResult,
          InvoiceBulkGenerate
        >(
          "/invoices/generate-bulk",
          data
        );


      // Refresh candidates after commit: successful rooms disappear, while
      // skipped rooms retain input/selection by room_id. On refresh failure,
      // keep the draft state and require a successful preview before retry.
      await handleGenerateBulk();
      if (result.skipped_count === 0) setTransitionDialog(false);

      setBulkResult(
        result
      );


      setSuccess(
        `Đã tạo ${result.created_count} hóa đơn.`
      );


      await loadInvoices();


    } catch (err) {
      setTransitionError(err instanceof Error ? err.message : "Không thể tạo hóa đơn.");

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
          "Không thể tạo hóa đơn."
        );

      }


    } finally {

      setGenerating(
        false
      );

    }

  }


  // =========================================================
  // BULK ISSUE SELECTED DRAFTS
  // =========================================================

  async function handleIssueSelected() {

    if (
      selectedDraftInvoices.length
      === 0
    ) {

      window.alert(
        "Hãy chọn ít nhất một hóa đơn nháp để phát hành."
      );

      return;

    }


    const confirmed =
      window.confirm(
        `Phát hành ${selectedDraftInvoices.length} hóa đơn đã chọn?\n\n`
        +
        `Tổng giá trị: ${formatMoney(selectedDraftTotal)}\n\n`
        +
        "Sau khi phát hành, hóa đơn sẽ trở thành hóa đơn chính thức và có thể ghi nhận thanh toán."
      );


    if (
      !confirmed
    ) {
      return;
    }


    try {

      setIssuingSelected(
        true
      );

      setError("");
      setSuccess("");
      setBulkIssueResult(
        null
      );


      const data:
        InvoiceBulkIssueRequest = {

        invoice_ids:
          selectedDraftInvoices.map(
            (
              invoice
            ) =>
              invoice.id
          ),

      };


      const result =
        await apiPost<
          InvoiceBulkIssueResult,
          InvoiceBulkIssueRequest
        >(
          "/invoices/issue-bulk",
          data
        );


      await handleReloadInvoices();


      setBulkIssueResult(
        result
      );

      setSuccess(
        result.skipped_count > 0

          ? `Đã phát hành ${result.issued_count} hóa đơn, bỏ qua ${result.skipped_count} hóa đơn.`

          : `Đã phát hành ${result.issued_count} hóa đơn.`
      );

      setSelectedInvoiceIds(
        []
      );

      setSelectionMode(
        false
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
          "Không thể phát hành các hóa đơn đã chọn."
        );

      }


    } finally {

      setIssuingSelected(
        false
      );

    }

  }


  // =========================================================
  // QUICK PAYMENT FROM INVOICE LIST
  // =========================================================

  async function handleOpenQuickPayment(
    invoice: Invoice
  ) {

    if (
      invoice.status !== "ISSUED"
      ||
      invoice.payment_status === "PAID"
    ) {
      return;
    }


    try {

      setQuickPaymentLoadingId(
        invoice.id
      );

      setError("");
      setSuccess("");


      const payments =
        await apiGet<Payment[]>(
          `/invoices/${invoice.id}/payments`
        );


      const totalPaid =
        payments.reduce(
          (
            total,
            payment
          ) =>
            total
            +
            payment.amount,
          0
        );


      const remaining =
        Math.max(
          0,
          invoice.total_amount
          -
          totalPaid
        );


      if (
        remaining <= 0
      ) {

        await handleReloadInvoices();

        setSuccess(
          `Hóa đơn #${invoice.id} đã thanh toán đủ.`
        );

        return;

      }


      setQuickPaymentRemaining(
        remaining
      );

      setQuickPaymentInvoice(
        invoice
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
          "Không thể mở ghi nhận thanh toán."
        );

      }


    } finally {

      setQuickPaymentLoadingId(
        null
      );

    }

  }


  async function handleQuickPaymentCreated(
    _payment: Payment
  ) {

    const invoiceId =
      quickPaymentInvoice
        ?.id;


    setQuickPaymentInvoice(
      null
    );

    setQuickPaymentRemaining(
      0
    );


    await handleReloadInvoices();


    setSuccess(
      invoiceId
        ? `Đã ghi nhận thanh toán cho hóa đơn #${invoiceId}.`
        : "Đã ghi nhận thanh toán."
    );

  }


  // =========================================================
  // EXPORT EXCEL
  // =========================================================

  async function handleExportMonthExcel() {

    const exportableInvoices =
      latestInvoices.filter(
        (
          invoice
        ) =>
          invoice.status
          !== "CANCELLED"
      );


    if (
      exportableInvoices.length
      === 0
    ) {

      window.alert(
        `Không có hóa đơn hợp lệ để xuất cho tháng ${month}/${year}.`
      );

      return;

    }


    try {

      setExportingExcel(
        true
      );

      setError("");


      const detailedInvoices =
        await Promise.all(

          exportableInvoices.map(
            (
              invoice
            ) =>
              apiGet<Invoice>(
                `/invoices/${invoice.id}`
              )
          )

        );


      const periodMap =
        new Map<
          string,
          {
            year: number;
            month: number;
          }
        >();


      detailedInvoices.forEach(
        (
          invoice
        ) => {

          if (
            invoice.meter_reading_id == null
            ||
            invoice.electricity_period_year
            == null
            ||
            invoice.electricity_period_month
            == null
          ) {
            return;
          }


          const key =
            `${invoice.electricity_period_year}-${invoice.electricity_period_month}`;


          periodMap.set(
            key,
            {
              year:
                invoice.electricity_period_year,

              month:
                invoice.electricity_period_month,
            }
          );

        }
      );


      const meterGroups =
        await Promise.all(

          Array.from(
            periodMap.values()
          ).map(

            async (
              period
            ) => ({

              period,

              readings:
                await apiGet<MeterReading[]>(
                  `/meter-readings/month/${period.year}/${period.month}`
                ),

            })

          )

        );


      const meterMap =
        new Map<
          number,
          MeterReading
        >();


      meterGroups.forEach(
        (
          group
        ) => {

          group.readings.forEach(
            (
              reading
            ) => {

              meterMap.set(
                reading.id,
                reading
              );

            }
          );

        }
      );


      const getElectricityReadingsForInvoice =
        (
          invoice: Invoice
        ) => {

          if (invoice.checkout_settlement) {
            return {
              old_reading: invoice.checkout_settlement.electricity_old_reading,
              new_reading: invoice.checkout_settlement.electricity_new_reading,
              consumption: invoice.checkout_settlement.electricity_consumption,
            };
          }
          if (invoice.electricity_transition_old_reading != null && invoice.electricity_transition_new_reading != null) {
            return {
              old_reading: invoice.electricity_transition_old_reading,
              new_reading: invoice.electricity_transition_new_reading,
              consumption: invoice.electricity_transition_new_reading - invoice.electricity_transition_old_reading,
            };
          }

          if (
            invoice.meter_reading_id == null
            ||
            invoice.electricity_period_year
            == null
            ||
            invoice.electricity_period_month
            == null
          ) {
            return undefined;
          }


          const reading = meterMap.get(invoice.meter_reading_id);
          return reading?.room_id === invoice.room_id
            && reading.year === invoice.electricity_period_year
            && reading.month === invoice.electricity_period_month
            ? reading
            : undefined;

        };


      const workbook =
        utils.book_new();


      // =====================================================
      // SUMMARY SHEET
      // =====================================================

      const summaryRows:
        (
          string
          |
          number
        )[][] = [

          [
            "TỔNG HỢP HÓA ĐƠN THÁNG",
            `${padMonth(month)}/${year}`,
          ],

          [],

          [
            "STT",
            "Phòng",
            "Số điện cũ",
            "Số điện mới",
            "kWh",
            "Tiền điện",
            "Tiền nước",
            "Phí quản lý",
            "Tiền phòng",
            "Phí khác",
            "Giảm trừ",
            "Tiền cọc",
            "Tổng cộng",
            "Trạng thái",
          ],

        ];


      detailedInvoices.forEach(
        (
          invoice,
          index
        ) => {

          const roomCode =
            roomMap.get(
              invoice.room_id
            )
            ??
            `Phong_${invoice.room_id}`;


          const meter =
            getElectricityReadingsForInvoice(
              invoice
            );


          const sumByType =
            (
              itemType: string
            ) =>

              invoice.items
                .filter(
                  (
                    item
                  ) =>
                    item.item_type
                    === itemType
                )
                .reduce(
                  (
                    total,
                    item
                  ) =>
                    total
                    +
                    item.amount,

                  0
                );


          summaryRows.push(
            [

              index + 1,

              roomCode,

              meter
                ?.old_reading
                ?? "",

              meter
                ?.new_reading
                ?? "",

              meter
                ?.consumption
                ?? "",

              sumByType(
                "ELECTRICITY"
              ),

              sumByType(
                "WATER"
              ),

              sumByType(
                "MANAGEMENT"
              ),

              sumByType(
                "RENT"
              ),

              sumByType(
                "OTHER"
              ),

              sumByType(
                "DISCOUNT"
              ),

              sumByType(
                "DEPOSIT"
              ),

              invoice.total_amount,

              getPaymentStatusText(
                invoice.payment_status
              ),

            ]
          );

        }
      );


      const summarySheet =
        utils.aoa_to_sheet(
          summaryRows
        );


      summarySheet["!cols"] = [

        { wch: 7 },
        { wch: 12 },
        { wch: 14 },
        { wch: 14 },
        { wch: 10 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 18 },
        { wch: 22 },

      ];


      for (
        let row = 4;
        row
        <=
        detailedInvoices.length
        + 3;
        row += 1
      ) {

        [
          "F",
          "G",
          "H",
          "I",
          "J",
          "K",
          "L",
          "M",
        ].forEach(
          (
            column
          ) => {

            const cell =
              summarySheet[
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


      utils.book_append_sheet(
        workbook,
        summarySheet,
        "Tổng hợp"
      );


      // =====================================================
      // ONE ROOM = ONE SHEET
      // =====================================================

      const usedSheetNames =
        new Set<string>(
          [
            "Tổng hợp",
          ]
        );


      detailedInvoices.forEach(
        (
          invoice
        ) => {

          const roomCode =
            roomMap.get(
              invoice.room_id
            )
            ??
            `Phong_${invoice.room_id}`;


          const meter =
            getElectricityReadingsForInvoice(
              invoice
            );


          const electricityItem =
            invoice.items.find(
              (
                item
              ) =>
                item.item_type
                === "ELECTRICITY"
            );


          const rentItems =
            invoice.items.filter(
              (
                item
              ) =>
                item.item_type
                === "RENT"
            );


          const waterItems =
            invoice.items.filter(
              (
                item
              ) =>
                item.item_type
                === "WATER"
            );


          const managementItems =
            invoice.items.filter(
              (
                item
              ) =>
                item.item_type
                === "MANAGEMENT"
            );


          const adjustments =
            invoice.items.filter(
              (
                item
              ) =>
                item.item_type
                === "OTHER"
                ||
                item.item_type
                === "DISCOUNT"
                ||
                item.item_type
                === "DEPOSIT"
            );


          const sumItems =
            (
              items:
                Invoice["items"]
            ) =>

              items.reduce(
                (
                  total,
                  item
                ) =>
                  total
                  +
                  item.amount,

                0
              );


          const rentAmount =
            sumItems(
              rentItems
            );


          const waterAmount =
            sumItems(
              waterItems
            );


          const managementAmount =
            sumItems(
              managementItems
            );


          const electricityAmount =
            electricityItem
              ?.amount
              ?? 0;


          const electricityRate =
            electricityItem
              ?.unit_price
              ?? "";


          const consumption =
            meter
              ?.consumption
              ??
              electricityItem
                ?.quantity
              ??
              "";


          const rows:
            (
              string
              |
              number
            )[][] = [

              [
                "HÓA ĐƠN TIỀN PHÒNG",
                `Tháng ${invoice.month}/${invoice.year}`,
              ],

              [
                "Điện kỳ",
                invoice.checkout_settlement ? "Quy\u1ebft to\u00e1n tr\u1ea3 ph\u00f2ng" : invoice.electricity_transition_new_reading != null
                  ? "Điện chuyển tiếp"
                  : invoice.electricity_period_year != null
                  && invoice.electricity_period_month != null
                  ? `${padMonth(invoice.electricity_period_month)}/${invoice.electricity_period_year}`
                  : "Không tính điện",
              ],

              [
                "Phòng",
                roomCode,
              ],

              [
                "",
                "",
              ],

              [
                "Số điện cũ",
                meter
                  ?.old_reading
                  ?? "",
              ],

              [
                "Số điện mới",
                meter
                  ?.new_reading
                  ?? "",
              ],

              [
                "",
                "",
              ],

              [
                "Đơn giá điện (đ/kWh)",
                electricityRate,
              ],

              [
                "",
                "",
              ],

              [
                "kWh tiêu thụ",
                consumption,
              ],

              [
                "Tiền điện",
                electricityAmount,
              ],

              [
                "",
                "",
              ],

              [
                "Tiền nước",
                waterAmount,
              ],

              [
                "Phí quản lý cố định",
                managementAmount,
              ],

              [
                rentItems.length > 0
                &&
                rentItems[0].description
                &&
                rentItems[0].description
                !== "Tiền phòng"

                  ? rentItems[0].description

                  : "Tiền phòng tháng",

                rentAmount,
              ],

            ];


          adjustments.forEach(
            (
              item
            ) => {

              let label =
                item.description
                ||
                "Khoản điều chỉnh";


              if (
                item.item_type
                === "DISCOUNT"
                &&
                !item.description
              ) {

                label =
                  "Giảm trừ";

              }


              if (
                item.item_type
                === "DEPOSIT"
                &&
                !item.description
              ) {

                label =
                  "Tiền cọc / xử lý cọc";

              }


              rows.push(
                [
                  label,
                  item.amount,
                ]
              );

            }
          );


          if (
            invoice.note
          ) {

            rows.push(
              [
                "",
                "",
              ]
            );


            rows.push(
              [
                "Ghi chú",
                invoice.note,
              ]
            );

          }


          rows.push(
            [
              "",
              "",
            ]
          );


          const totalRowIndex =
            rows.length
            + 1;


          rows.push(
            [
              "TỔNG CỘNG",
              invoice.total_amount,
            ]
          );


          const sheet =
            utils.aoa_to_sheet(
              rows
            );


          sheet["!cols"] = [

            {
              wch: 40,
            },

            {
              wch: 22,
            },

          ];


          [
            11,
            13,
            14,
            15,
          ].forEach(
            (
              row
            ) => {

              const cell =
                sheet[
                  `B${row}`
                ];


              if (
                cell
                &&
                typeof cell.v
                === "number"
              ) {

                cell.z =
                  '#,##0 "đ"';

              }

            }
          );


          const adjustmentStartRow =
            16;


          const adjustmentEndRow =
            adjustmentStartRow
            +
            adjustments.length
            -
            1;


          for (
            let row =
              adjustmentStartRow;

            row
            <=
            adjustmentEndRow;

            row += 1
          ) {

            const cell =
              sheet[
                `B${row}`
              ];


            if (
              cell
              &&
              typeof cell.v
              === "number"
            ) {

              cell.z =
                '#,##0 "đ"';

            }

          }


          const totalCell =
            sheet[
              `B${totalRowIndex}`
            ];


          if (
            totalCell
          ) {

            totalCell.z =
              '#,##0 "đ"';

          }


          let sheetName =
            safeSheetName(
              roomCode
            );


          let counter =
            2;


          while (
            usedSheetNames.has(
              sheetName
            )
          ) {

            const suffix =
              `_${counter}`;


            sheetName =
              safeSheetName(
                `${roomCode}${suffix}`
              );


            counter += 1;

          }


          usedSheetNames.add(
            sheetName
          );


          utils.book_append_sheet(
            workbook,
            sheet,
            sheetName
          );

        }
      );


      const fileName =
        `Hoa_don_thang_${padMonth(month)}_${year}.xlsx`;


      writeFileXLSX(
        workbook,
        fileName
      );


      setSuccess(
        `Đã xuất Excel tháng ${month}/${year} với ${detailedInvoices.length} phòng.`
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
          "Không thể xuất Excel hóa đơn tháng."
        );

      }


    } finally {

      setExportingExcel(
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
              Rosehome Billing
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
              Hóa đơn
            </h1>


            <p
              className="
                mt-1
                text-sm
                text-slate-500
              "
            >
              Tháng {month}/{year}
            </p>

          </div>


          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={
              handleReloadInvoices
            }
            disabled={
              loading
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


        {/* MOBILE PERIOD */}

        <div
          className="
            grid
            grid-cols-[1fr_120px]
            gap-2
          "
        >

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
              font-medium
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


          <Input
            type="number"
            min="2020"
            max="2100"
            value={
              year
            }
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
              bg-white
              text-center
              font-medium
            "
          />

        </div>


        {/* MOBILE INVOICE TYPE TABS */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-[#172033]">Loại hóa đơn</p>
          <InvoiceTypeTabs
            value={invoiceTypeFilter}
            onChange={setInvoiceTypeFilter}
            counts={invoiceTypeCounts}
          />
          {invoiceTypeFilter === "CHECKOUT" && (
            <div className="mt-2 space-y-2">
            <CheckoutHistoryPeriodFilters
              monthFilter={checkoutMonthFilter}
              yearFilter={checkoutYearFilter}
              availableYears={checkoutYearOptions}
              onMonthChange={setCheckoutMonthFilter}
              onYearChange={setCheckoutYearFilter}
              onReset={() => { setCheckoutMonthFilter("ALL"); setCheckoutYearFilter("ALL"); }}
            />
            {isCheckoutHistoryView && checkoutHistoryError && (
              <p role="alert" className="text-xs text-red-600">
                Không tải được lịch sử trả phòng: {checkoutHistoryError}
                {" "}
                <button type="button" className="underline" onClick={loadCheckoutHistory}>
                  Thử lại
                </button>
              </p>
            )}
          </div>
        )}
          <p className="text-[11px] text-slate-500">
            Thống kê và Excel chỉ tính kỳ {month}/{year}.
          </p>
        </div>

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
                Tổng tiền hóa đơn tháng {month}/{year}
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
                  totalAmount
                )}
              </div>


              <div
                className="
                  mt-1
                  text-xs
                  text-slate-400
                "
              >
                Không gồm hóa đơn đã hủy
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

              <CircleDollarSign
                size={19}
              />

            </div>

          </div>


          <div
            className="
              mt-5
              grid
              grid-cols-4
              gap-2
            "
          >

            <MobileInvoiceMiniStat
              label="Tổng"
              value={
                String(
                  latestInvoices.length
                )
              }
            />


            <MobileInvoiceMiniStat
              label="Nháp"
              value={
                String(
                  draftCount
                )
              }
            />


            <MobileInvoiceMiniStat
              label="Đã PH"
              value={
                String(
                  issuedCount
                )
              }
            />


            <MobileInvoiceMiniStat
              label="Còn nợ"
              value={
                String(
                  unpaidCount
                )
              }
              danger={
                unpaidCount > 0
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
              handleExportMonthExcel
            }
            disabled={
              loading
              ||
              exportingExcel
              ||
              latestInvoices.length
              === 0
            }
            className="
              h-10
              rounded-xl
              border-[#ddd8ce]
              bg-white
            "
          >

            {exportingExcel ? (

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


            {exportingExcel
              ? "Đang xuất"
              : "Xuất Excel"}

          </Button>


          <Button
            type="button"
            onClick={
              handleGenerateBulk
            }
            disabled={
              generating
              ||
              loading
            }
            className="
              h-10
              rounded-xl
              bg-[#d6a64c]
              font-semibold
              text-[#172033]
              hover:bg-[#e0b85f]
            "
          >

            {generating ? (

              <RefreshCw
                size={16}
                className=
                  "animate-spin"
              />

            ) : (

              <Plus
                size={16}
              />

            )}


            {generating
              ? "Đang tạo"
              : "Tạo hóa đơn"}

          </Button>

        </div>


        {visibleDraftInvoices.length > 0 && (

          <Button
            type="button"
            variant="outline"
            onClick={
              handleToggleSelectionMode
            }
            disabled={
              issuingSelected
            }
            className="
              h-10
              w-full
              rounded-xl
              border-[#d6a64c]
              bg-[#fffaf0]
              font-semibold
              text-[#8a6726]
            "
          >
            {selectionMode
              ? "Thoát chế độ chọn"
              : `Chọn bản nháp (${visibleDraftInvoices.length})`}
          </Button>

        )}


        {/* MOBILE MESSAGES */}

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
              className=
                "mt-0.5 shrink-0"
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
              className=
                "mt-0.5 shrink-0"
            />

            {success}

          </div>

        )}


        {bulkIssueResult
          &&
          bulkIssueResult.skipped_count > 0
          &&
          (

            <div
              className="
                rounded-2xl
                border
                border-amber-200
                bg-amber-50
                px-4
                py-4
              "
            >

              <strong
                className="
                  text-sm
                  text-amber-800
                "
              >
                Có {bulkIssueResult.skipped_count} hóa đơn chưa được phát hành
              </strong>


              <ul
                className="
                  mt-2
                  space-y-1
                  pl-4
                  text-xs
                  leading-5
                  text-amber-800
                  list-disc
                "
              >

                {bulkIssueResult.skipped_invoices.map(
                  (
                    item
                  ) => (

                    <li
                      key={
                        item.invoice_id
                      }
                    >
                      #{item.invoice_id}: {item.reason}
                    </li>

                  )
                )}

              </ul>

            </div>

          )}


        {bulkResult
          &&
          bulkResult.skipped_count > 0
          &&
          (

            <div
              className="
                rounded-2xl
                border
                border-amber-200
                bg-amber-50
                px-4
                py-4
              "
            >

              <div
                className="
                  flex
                  items-start
                  gap-3
                "
              >

                <AlertCircle
                  size={18}
                  className="
                    mt-0.5
                    shrink-0
                    text-amber-700
                  "
                />


                <div
                  className="
                    min-w-0
                  "
                >

                  <strong
                    className="
                      text-sm
                      text-amber-800
                    "
                  >
                    {bulkResult.skipped_count} phòng chưa tạo hóa đơn
                  </strong>


                  <ul
                    className="
                      mt-2
                      space-y-1
                      pl-4
                      text-xs
                      leading-5
                      text-amber-800
                      list-disc
                    "
                  >

                    {bulkResult.skipped_rooms.map(
                      (
                        message,
                        index
                      ) => (

                        <li
                          key={
                            index
                          }
                        >
                          {message}
                        </li>

                      )
                    )}

                  </ul>

                </div>

              </div>

            </div>

          )}


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
                "Tìm phòng hoặc mã hóa đơn..."
              className="
                h-11
                rounded-xl
                border-[#ddd9cf]
                pl-10
              "
            />

          </div>

        </div>


        {/* MOBILE PAYMENT STATUS CHIPS */}

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

          <MobileInvoiceFilterChip
            active={
              paymentStatusFilter
              === "ALL"
            }
            onClick={
              () =>
                setPaymentStatusFilter(
                  "ALL"
                )
            }
          >
            Tất cả
          </MobileInvoiceFilterChip>


          <MobileInvoiceFilterChip
            active={
              paymentStatusFilter
              === "UNPAID"
            }
            onClick={
              () =>
                setPaymentStatusFilter(
                  "UNPAID"
                )
            }
          >
            Chưa thanh toán
          </MobileInvoiceFilterChip>


          <MobileInvoiceFilterChip
            active={
              paymentStatusFilter
              === "PARTIALLY_PAID"
            }
            onClick={
              () =>
                setPaymentStatusFilter(
                  "PARTIALLY_PAID"
                )
            }
          >
            Một phần
          </MobileInvoiceFilterChip>


          <MobileInvoiceFilterChip
            active={
              paymentStatusFilter
              === "PAID"
            }
            onClick={
              () =>
                setPaymentStatusFilter(
                  "PAID"
                )
            }
          >
            Đã thanh toán
          </MobileInvoiceFilterChip>

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
                grid-cols-1
                gap-3
                border-t
                border-[#eeeae2]
                p-4
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
                  invoiceStatusFilter
                }
                onChange={
                  (
                    event
                  ) =>
                    setInvoiceStatusFilter(
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
                  Tất cả trạng thái hóa đơn
                </option>

                <option value="DRAFT">
                  Nháp
                </option>

                <option value="ISSUED">
                  Đã phát hành
                </option>

                <option value="CANCELLED">
                  Đã hủy
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

                <option value="ROOM_ASC">
                  Phòng A-Z
                </option>

                <option value="TOTAL_DESC">
                  Tiền cao → thấp
                </option>

                <option value="TOTAL_ASC">
                  Tiền thấp → cao
                </option>

              </select>


              <Button
                type="button"
                variant="outline"
                onClick={
                  handleResetFilters
                }
                className="
                  h-10
                  rounded-xl
                  border-[#ddd8ce]
                "
              >
                Đặt lại bộ lọc
              </Button>

            </div>

          )}

        </div>


        {/* MOBILE RESULT HEADER */}

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
              Danh sách hóa đơn
            </h2>


            <p
              className="
                mt-0.5
                text-xs
                text-slate-500
              "
            >
              {filteredInvoices.length}
              {" / "}
              {displayInvoices.length}
              {" hóa đơn"}
            </p>

          </div>


          {(search
            ||
            invoiceTypeFilter !== "ALL"
            ||
            invoiceStatusFilter !== "ALL"
            ||
            paymentStatusFilter !== "ALL"
            ||
            floorFilter !== "ALL"
            ||
            sortBy !== "ROOM_ASC") && (

            <button
              type="button"
              onClick={
                handleResetFilters
              }
              className="
                text-xs
                font-semibold
                text-[#b92f49]
              "
            >
              Xóa lọc
            </button>

          )}

        </div>


        {selectionMode && (

          <div
            className="
              rounded-2xl
              border
              border-[#ead9b7]
              bg-[#fffaf0]
              p-4
            "
          >

            <label
              className="
                flex
                items-center
                gap-2
                text-sm
                font-semibold
                text-[#172033]
              "
            >

              <input
                type="checkbox"
                checked={
                  allVisibleDraftsSelected
                }
                onChange={
                  handleToggleAllVisibleDrafts
                }
                disabled={
                  visibleDraftInvoices.length
                  === 0
                  ||
                  issuingSelected
                }
                className="h-4 w-4 accent-[#d6a64c]"
              />

              Chọn tất cả bản nháp đang hiển thị
              ({visibleDraftInvoices.length})

            </label>


            <div
              className="
                mt-3
                flex
                items-end
                justify-between
                gap-3
              "
            >

              <div
                className="
                  text-xs
                  text-slate-600
                "
              >
                Đã chọn {selectedDraftInvoices.length}
                <br />
                {formatMoney(selectedDraftTotal)}
              </div>


              <Button
                type="button"
                onClick={
                  handleIssueSelected
                }
                disabled={
                  selectedDraftInvoices.length
                  === 0
                  ||
                  issuingSelected
                }
                className="
                  h-10
                  rounded-xl
                  bg-[#d6a64c]
                  font-semibold
                  text-[#172033]
                  hover:bg-[#e0b85f]
                "
              >
                {issuingSelected
                  ? "Đang phát hành..."
                  : `Phát hành ${selectedDraftInvoices.length}`}
              </Button>

            </div>

          </div>

        )}


        {/* MOBILE CONTENT */}

        {displayLoading ? (

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

            {isCheckoutHistoryView ? "Đang tải lịch sử trả phòng..." : "Đang tải hóa đơn..."}

          </div>

        ) : displayInvoices.length === 0 ? (

          <div
            className="
              flex
              min-h-52
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
                h-12
                w-12
                items-center
                justify-center
                rounded-xl
                bg-[#f5eddc]
                text-[#9a762f]
              "
            >

              <ReceiptText
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
              {isCheckoutHistoryView ? "Chưa có hóa đơn trả phòng" : `Chưa có hóa đơn tháng ${month}/${year}`}
            </strong>


            <p
              className="
                mt-1
                max-w-xs
                text-xs
                leading-5
                text-slate-500
              "
            >
              {isCheckoutHistoryView
                ? "Chưa có hóa đơn quyết toán nào được ghi nhận."
                : "Sau khi nhập chỉ số điện, bạn có thể tạo hóa đơn hàng loạt cho tháng này."}
            </p>


{!isCheckoutHistoryView && (
            <Button
              type="button"
              onClick={
                handleGenerateBulk
              }
              disabled={
                generating
              }
              className="
                mt-4
                h-10
                rounded-xl
                bg-[#d6a64c]
                text-[#172033]
                hover:bg-[#e0b85f]
              "
            >

              <Plus
                size={16}
              />

              Tạo hóa đơn tháng

            </Button>
            )}

          </div>

        ) : filteredInvoices.length === 0 ? (

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
              {invoiceTypeFilter === "CHECKOUT"
                ? "Không tìm thấy hóa đơn trả phòng"
                : invoiceTypeFilter === "MONTHLY"
                ? "Không tìm thấy hóa đơn hàng tháng"
                : "Không tìm thấy hóa đơn"}
            </strong>


            <p
              className="
                mt-1
                text-xs
                text-slate-500
              "
            >
              {isCheckoutHistoryView
                ? "Thử thay đổi mã phòng, mã hóa đơn hoặc các bộ lọc trạng thái."
                : "Hãy kiểm tra tháng/năm đang chọn hoặc thay đổi từ khóa, bộ lọc."}
            </p>

          </div>

        ) : (

          <div
            className="
              space-y-3
            "
          >

            {filteredInvoices.map(
              (
                invoice
              ) => (

                <MobileInvoiceCard
                  key={
                    invoice.id
                  }
                  invoice={
                    invoice
                  }
                  roomCode={
                    roomMap.get(
                      invoice.room_id
                    )
                    ??
                    `Phòng #${invoice.room_id}`
                  }
                  selectionMode={
                    selectionMode
                  }
                  selected={
                    selectedInvoiceIds.includes(
                      invoice.id
                    )
                  }
                  onToggleSelected={
                    () =>
                      handleToggleInvoiceSelection(
                        invoice.id
                      )
                  }
                  onQuickPayment={
                    () =>
                      handleOpenQuickPayment(
                        invoice
                      )
                  }
                  quickPaymentLoading={
                    quickPaymentLoadingId
                    === invoice.id
                  }
                />

              )
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

              <ReceiptText
                size={16}
              />

              Rosehome Billing

            </div>


            <h1
              className="
                text-2xl
                font-semibold
                tracking-tight
                md:text-3xl
              "
            >
              Hóa đơn
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
              Tạo, quản lý và theo dõi
              hóa đơn tiền phòng hàng tháng.
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
                handleExportMonthExcel
              }
              disabled={
                loading
                ||
                exportingExcel
                ||
                latestInvoices.length
                === 0
              }
              className="
                border-white/20
                bg-white/5
                text-white
                hover:bg-white/10
                hover:text-white
              "
            >

              {exportingExcel ? (

                <RefreshCw
                  className=
                    "animate-spin"
                />

              ) : (

                <FileSpreadsheet />

              )}


              {exportingExcel
                ? "Đang xuất..."
                : "Xuất Excel tháng"}

            </Button>


            <Button
              type="button"
              onClick={
                handleGenerateBulk
              }
              disabled={
                generating
                ||
                loading
              }
              className="
                border
                border-[#d6a64c]
                bg-[#d6a64c]
                text-[#172033]
                hover:bg-[#e0b85f]
              "
            >

              {generating ? (

                <RefreshCw
                  className=
                    "animate-spin"
                />

              ) : (

                <Plus />

              )}


              {generating
                ? "Đang tạo..."
                : "Tạo hóa đơn tháng"}

            </Button>

          </div>

        </div>

      </section>


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
                Kỳ hóa đơn
              </div>


              <p
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                Chọn tháng và năm cần quản lý hóa đơn.
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
                  min="2020"
                  max="2100"
                  value={
                    year
                  }
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
                onClick={
                  handleReloadInvoices
                }
                disabled={
                  loading
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
          INVOICE TYPE TABS
      ===================================================== */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-[#172033]">Loại hóa đơn</h2>
          <p className="text-xs text-slate-500">
            Thống kê và Excel giữ nguyên theo kỳ {month}/{year}
          </p>
        </div>
        <InvoiceTypeTabs
          value={invoiceTypeFilter}
          onChange={setInvoiceTypeFilter}
          counts={invoiceTypeCounts}
        />
        {invoiceTypeFilter === "CHECKOUT" && (
          <div className="mt-2 space-y-2">
            <CheckoutHistoryPeriodFilters
              monthFilter={checkoutMonthFilter}
              yearFilter={checkoutYearFilter}
              availableYears={checkoutYearOptions}
              onMonthChange={setCheckoutMonthFilter}
              onYearChange={setCheckoutYearFilter}
              onReset={() => { setCheckoutMonthFilter("ALL"); setCheckoutYearFilter("ALL"); }}
            />
            {isCheckoutHistoryView && checkoutHistoryError && (
              <p role="alert" className="text-xs text-red-600">
                Không tải được lịch sử trả phòng: {checkoutHistoryError}
                {" "}
                <button type="button" className="underline" onClick={loadCheckoutHistory}>
                  Thử lại
                </button>
              </p>
            )}
          </div>
        )}
      </div>

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

        <InvoiceSummaryCard
          title="Hóa đơn"
          value={
            String(
              latestInvoices.length
            )
          }
          subtitle={
            `Tháng ${month}/${year}`
          }
          icon={
            ReceiptText
          }
        />


        <InvoiceSummaryCard
          title="Nháp"
          value={
            String(
              draftCount
            )
          }
          subtitle=
            "Chưa phát hành"
          icon={
            FileText
          }
          accent="gold"
        />


        <InvoiceSummaryCard
          title="Đã phát hành"
          value={
            String(
              issuedCount
            )
          }
          subtitle=
            "Hóa đơn chính thức"
          icon={
            CheckCircle2
          }
          accent="rose"
        />


        <InvoiceSummaryCard
          title="Chưa thanh toán đủ"
          value={
            String(
              unpaidCount
            )
          }
          subtitle={
            unpaidCount > 0
              ? "Cần theo dõi"
              : "Không còn tồn đọng"
          }
          icon={
            WalletCards
          }
          danger={
            unpaidCount > 0
          }
        />


        <InvoiceSummaryCard
          title="Tổng tiền"
          value={
            formatMoney(
              totalAmount
            )
          }
          subtitle=
            "Không gồm hóa đơn hủy"
          icon={
            CircleDollarSign
          }
          accent="gold"
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
              xl:grid-cols-[minmax(240px,1fr)_190px_190px_160px_180px_auto]
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
                  "Tìm phòng hoặc mã hóa đơn..."
                className="
                  h-11
                  rounded-xl
                  border-[#ddd9cf]
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
                  invoiceStatusFilter
                }
                onChange={
                  (
                    event
                  ) =>
                    setInvoiceStatusFilter(
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

                <option value="DRAFT">
                  Nháp
                </option>

                <option value="ISSUED">
                  Đã phát hành
                </option>

                <option value="CANCELLED">
                  Đã hủy
                </option>

              </select>

            </div>


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
                Tất cả thanh toán
              </option>

              <option value="UNPAID">
                Chưa thanh toán
              </option>

              <option value="PARTIALLY_PAID">
                Thanh toán một phần
              </option>

              <option value="PAID">
                Đã thanh toán
              </option>

            </select>


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

              <option value="ROOM_ASC">
                Phòng A-Z
              </option>

              <option value="TOTAL_DESC">
                Tiền cao → thấp
              </option>

              <option value="TOTAL_ASC">
                Tiền thấp → cao
              </option>

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
              flex-wrap
              items-center
              justify-between
              gap-3
              border-t
              border-[#eeeae2]
              pt-4
              text-sm
              text-slate-500
            "
          >

            <div>
              Hóa đơn đang hiển thị
              {" "}
              <strong
                className=
                  "text-[#172033]"
              >
                {filteredInvoices.length}
                {" / "}
                {displayInvoices.length}
              </strong>
            </div>


            {visibleDraftInvoices.length > 0 && (

              <Button
                type="button"
                variant="outline"
                onClick={
                  handleToggleSelectionMode
                }
                disabled={
                  issuingSelected
                }
                className="
                  h-9
                  rounded-xl
                  border-[#d6a64c]
                  bg-[#fffaf0]
                  font-semibold
                  text-[#8a6726]
                "
              >
                {selectionMode
                  ? "Thoát chọn"
                  : `Chọn bản nháp (${visibleDraftInvoices.length})`}
              </Button>

            )}

          </div>


          {selectionMode && (

            <div
              className="
                mt-3
                flex
                flex-wrap
                items-center
                justify-between
                gap-4
                rounded-xl
                border
                border-[#ead9b7]
                bg-[#fffaf0]
                px-4
                py-3
              "
            >

              <label
                className="
                  flex
                  items-center
                  gap-2
                  text-sm
                  font-semibold
                  text-[#172033]
                "
              >

                <input
                  type="checkbox"
                  checked={
                    allVisibleDraftsSelected
                  }
                  onChange={
                    handleToggleAllVisibleDrafts
                  }
                  disabled={
                    visibleDraftInvoices.length
                    === 0
                    ||
                    issuingSelected
                  }
                  className="h-4 w-4 accent-[#d6a64c]"
                />

                Chọn tất cả bản nháp đang hiển thị
                ({visibleDraftInvoices.length})

              </label>


              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  gap-3
                "
              >

                <span
                  className="
                    text-sm
                    text-slate-600
                  "
                >
                  Đã chọn
                  {" "}
                  <strong
                    className="text-[#172033]"
                  >
                    {selectedDraftInvoices.length}
                  </strong>
                  {" • "}
                  {formatMoney(selectedDraftTotal)}
                </span>


                <Button
                  type="button"
                  onClick={
                    handleIssueSelected
                  }
                  disabled={
                    selectedDraftInvoices.length
                    === 0
                    ||
                    issuingSelected
                  }
                  className="
                    h-9
                    rounded-xl
                    bg-[#d6a64c]
                    font-semibold
                    text-[#172033]
                    hover:bg-[#e0b85f]
                  "
                >
                  {issuingSelected
                    ? "Đang phát hành..."
                    : `Phát hành ${selectedDraftInvoices.length} hóa đơn`}
                </Button>

              </div>

            </div>

          )}

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
            className=
              "mt-0.5 shrink-0"
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
            className=
              "mt-0.5 shrink-0"
          />

          {success}

        </div>

      )}


      {/* =====================================================
          BULK RESULT
      ===================================================== */}

      {bulkIssueResult
        &&
        bulkIssueResult.skipped_count > 0
        &&
        (

          <Card
            className="
              rounded-2xl
              border-amber-200
              bg-amber-50
            "
          >

            <CardContent
              className="p-5"
            >

              <strong
                className="
                  text-sm
                  text-amber-800
                "
              >
                Có {bulkIssueResult.skipped_count} hóa đơn chưa được phát hành
              </strong>


              <ul
                className="
                  mt-3
                  space-y-1
                  pl-4
                  text-sm
                  text-amber-800
                  list-disc
                "
              >

                {bulkIssueResult.skipped_invoices.map(
                  (
                    item
                  ) => (

                    <li
                      key={
                        item.invoice_id
                      }
                    >
                      #{item.invoice_id}: {item.reason}
                    </li>

                  )
                )}

              </ul>

            </CardContent>

          </Card>

        )}


      {bulkResult
        &&
        bulkResult.skipped_count > 0
        &&
        (

          <Card
            className="
              rounded-2xl
              border-amber-200
              bg-amber-50
            "
          >

            <CardContent
              className="p-5"
            >

              <div
                className="
                  flex
                  items-start
                  gap-3
                "
              >

                <AlertCircle
                  size={20}
                  className="
                    mt-0.5
                    shrink-0
                    text-amber-700
                  "
                />


                <div>

                  <strong
                    className="
                      text-sm
                      text-amber-800
                    "
                  >
                    Có {bulkResult.skipped_count} phòng chưa tạo hóa đơn
                  </strong>


                  <ul
                    className="
                      mt-3
                      space-y-1
                      pl-4
                      text-sm
                      text-amber-800
                      list-disc
                    "
                  >

                    {bulkResult.skipped_rooms.map(
                      (
                        message,
                        index
                      ) => (

                        <li
                          key={
                            index
                          }
                        >
                          {message}
                        </li>

                      )
                    )}

                  </ul>

                </div>

              </div>

            </CardContent>

          </Card>

        )}


      {/* =====================================================
          CONTENT
      ===================================================== */}

      {displayLoading ? (

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

            {isCheckoutHistoryView ? "Đang tải lịch sử trả phòng..." : "Đang tải hóa đơn..."}

          </CardContent>

        </Card>

      ) : displayInvoices.length === 0 ? (

        <Card
          className="
            rounded-2xl
            border-[#e9e2d8]
          "
        >

          <CardContent
            className="
              flex
              min-h-56
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

              <ReceiptText
                size={21}
              />

            </div>


            <strong
              className=
                "text-[#172033]"
            >
              {isCheckoutHistoryView ? "Chưa có hóa đơn trả phòng" : `Chưa có hóa đơn tháng ${month}/${year}`}
            </strong>


            <p
              className="
                max-w-sm
                text-sm
                text-slate-500
              "
            >
              {isCheckoutHistoryView
                ? "Chưa có hóa đơn quyết toán nào được ghi nhận."
                : "Sau khi nhập chỉ số điện, bạn có thể tạo hóa đơn hàng loạt cho tháng này."}
            </p>


{!isCheckoutHistoryView && (
            <Button
              type="button"
              onClick={
                handleGenerateBulk
              }
              disabled={
                generating
              }
              className="
                mt-1
                bg-[#d6a64c]
                text-[#172033]
                hover:bg-[#e0b85f]
              "
            >

              <Plus />

              Tạo hóa đơn tháng

            </Button>
            )}

          </CardContent>

        </Card>

      ) : filteredInvoices.length === 0 ? (

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
              {invoiceTypeFilter === "CHECKOUT"
                ? "Không tìm thấy hóa đơn trả phòng"
                : invoiceTypeFilter === "MONTHLY"
                ? "Không tìm thấy hóa đơn hàng tháng"
                : "Không tìm thấy hóa đơn"}
            </strong>


            <p
              className="
                text-sm
                text-slate-500
              "
            >
              {isCheckoutHistoryView
                ? "Thử thay đổi mã phòng, mã hóa đơn hoặc các bộ lọc trạng thái."
                : "Hãy kiểm tra tháng/năm đang chọn hoặc thay đổi từ khóa, bộ lọc."}
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

          {filteredInvoices.map(
            (
              invoice
            ) => (

              <InvoiceCard
                key={
                  invoice.id
                }
                invoice={
                  invoice
                }
                roomCode={
                  roomMap.get(
                    invoice.room_id
                  )
                  ??
                  `Phòng #${invoice.room_id}`
                }
                selectionMode={
                  selectionMode
                }
                selected={
                  selectedInvoiceIds.includes(
                    invoice.id
                  )
                }
                onToggleSelected={
                  () =>
                    handleToggleInvoiceSelection(
                      invoice.id
                    )
                }
                onQuickPayment={
                  () =>
                    handleOpenQuickPayment(
                      invoice
                    )
                }
                quickPaymentLoading={
                  quickPaymentLoadingId
                  === invoice.id
                }
              />

            )
          )}

        </div>

      )}

      </div>


      <Dialog open={transitionDialog} onOpenChange={(open) => {
        if (generating) return;
        setTransitionDialog(open);
        if (!open) transitionRequest.current += 1;
      }}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tạo hóa đơn {month}/{year}</DialogTitle>
            <DialogDescription>
              Điện chuyển tiếp chỉ dùng một lần cho phần chưa thu. Chọn từng phòng và nhập chỉ số hiện tại. Phòng không chọn giữ cách tính an toàn hiện tại, không thu lại điện cũ.
            </DialogDescription>
          </DialogHeader>
          {transitionError && <p role="alert" className="text-sm text-red-600">{transitionError}</p>}
          {!transitionPreview && !transitionError && <p>Đang kiểm tra nguồn điện...</p>}
          {!transitionPreview && transitionError && <Button onClick={handleGenerateBulk}>Thử lại</Button>}
          {transitionPreview?.warnings.map((warning) => <p key={warning} className="text-sm text-amber-700">{warning}</p>)}
          {transitionPreview?.candidates.length === 0 && <p className="text-sm">Không có phòng đủ điều kiện điện chuyển tiếp. Các phòng được tạo theo luồng thông thường.</p>}
          {transitionPreview?.candidates.map((room) => {
            const raw = transitionInputs[room.room_id] ?? "";
            const value = Number(raw);
            const valid = /^\d+$/.test(raw) && Number.isSafeInteger(value) && value >= room.old_reading && value <= 2147483647;
            return <div key={room.room_id} className="space-y-3 rounded-lg border p-4">
              <div className="font-semibold">{room.room_code}</div>
              <p className="text-sm">Đã thu điện đến: {room.old_reading}</p>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" disabled={generating} checked={!!transitionSelected[room.room_id]} onChange={(event) => setTransitionSelected((current) => ({ ...current, [room.room_id]: event.target.checked }))} />
                Áp dụng điện chuyển tiếp
              </label>
              <label className="block space-y-1 text-sm">
                <span>Chỉ số hiện tại</span>
                <Input type="number" inputMode="numeric" min={room.old_reading} max={2147483647} step={1} disabled={generating || !transitionSelected[room.room_id]} value={raw} onChange={(event) => setTransitionInputs((current) => ({ ...current, [room.room_id]: event.target.value }))} />
              </label>
              {transitionSelected[room.room_id] && valid && <p className="text-sm text-emerald-700">{room.old_reading} → {value} • {value - room.old_reading} kWh × {formatMoney(room.electricity_rate)} = {formatMoney((value - room.old_reading) * room.electricity_rate)}</p>}
              {transitionSelected[room.room_id] && !valid && <p className="text-sm text-amber-700">Nhập số nguyên không nhỏ hơn {room.old_reading}.</p>}
            </div>;
          })}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={generating} onClick={() => { transitionRequest.current += 1; setTransitionDialog(false); }}>Đóng</Button>
            <Button type="button" disabled={generating || !transitionPreview} onClick={submitGenerateBulk}>{generating ? "Đang tạo..." : "Xác nhận tạo hóa đơn"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AddPaymentModal
        open={
          quickPaymentInvoice
          !== null
        }
        invoiceId={
          quickPaymentInvoice
            ?.id
          ?? 0
        }
        remainingAmount={
          quickPaymentRemaining
        }
        onClose={
          () => {

            setQuickPaymentInvoice(
              null
            );

            setQuickPaymentRemaining(
              0
            );

          }
        }
        onCreated={
          handleQuickPaymentCreated
        }
      />

    </div>

  );

}


function CheckoutHistoryPeriodFilters({
  monthFilter,
  yearFilter,
  availableYears,
  onMonthChange,
  onYearChange,
  onReset,
}: {
  monthFilter: number | "ALL";
  yearFilter: number | "ALL";
  availableYears: number[];
  onMonthChange: (next: number | "ALL") => void;
  onYearChange: (next: number | "ALL") => void;
  onReset: () => void;
}) {
  const allTime = monthFilter === "ALL" && yearFilter === "ALL";
  const selectStyle = "min-h-9 rounded-lg border border-[#ddd8ce] bg-white px-3 py-2 text-xs font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6a64c]";
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-medium text-slate-600">Kỳ quyết toán:</span>
      <button
        type="button"
        aria-pressed={allTime}
        onClick={onReset}
        className={"min-h-9 rounded-lg border px-3 py-2 font-semibold " +
          (allTime
            ? "border-[#122033] bg-[#122033] text-white"
            : "border-[#ddd8ce] bg-white text-slate-600 hover:bg-[#f7f5f0]")}
      >
        Tất cả thời gian
      </button>
      <select
        aria-label="Lọc tháng hóa đơn trả phòng"
        value={monthFilter}
        onChange={(event) => onMonthChange(
          event.target.value === "ALL" ? "ALL" : Number(event.target.value)
        )}
        className={selectStyle}
      >
        <option value="ALL">Tất cả tháng</option>
        {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
          <option key={value} value={value}>Tháng {value}</option>
        ))}
      </select>
      <select
        aria-label="Lọc năm hóa đơn trả phòng"
        value={yearFilter}
        onChange={(event) => onYearChange(
          event.target.value === "ALL" ? "ALL" : Number(event.target.value)
        )}
        className={selectStyle}
      >
        <option value="ALL">Tất cả năm</option>
        {availableYears.map((value) => (
          <option key={value} value={value}>{value}</option>
        ))}
      </select>
    </div>
  );
}

// =========================================================
// INVOICE TYPE FILTER (MOBILE + DESKTOP)
// =========================================================

function InvoiceTypeTabs({
  value,
  onChange,
  counts,
}: {
  value: InvoiceTypeFilter;
  onChange: (next: InvoiceTypeFilter) => void;
  counts: Record<InvoiceTypeFilter, number>;
}) {
  const options: { value: InvoiceTypeFilter; label: string }[] = [
    { value: "ALL", label: "Tất cả" },
    { value: "MONTHLY", label: "Hàng tháng" },
    { value: "CHECKOUT", label: "Trả phòng" },
  ];

  return (
    <div
      role="tablist"
      aria-label="Loại hóa đơn"
      className="flex w-full gap-2 overflow-x-auto rounded-2xl border border-[#e9e2d8] bg-white p-2 shadow-sm"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={
            "flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition sm:flex-1 sm:text-sm " +
            (value === option.value
              ? "bg-[#122033] text-white"
              : "bg-[#f7f5f0] text-slate-600 hover:bg-[#eee9df]")
          }
        >
          {option.label}
          <span
            className={
              "rounded-full px-2 py-0.5 text-[11px] " +
              (value === option.value
                ? "bg-white/20 text-white"
                : "bg-white text-slate-500")
            }
          >
            {counts[option.value]}
          </span>
        </button>
      ))}
    </div>
  );
}

// =========================================================
// MOBILE MINI STAT
// =========================================================

function MobileInvoiceMiniStat({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {

  return (

    <div
      className="
        rounded-xl
        bg-white/5
        px-2
        py-3
        text-center
      "
    >

      <div
        className={
          danger

            ? `
              text-lg
              font-semibold
              text-[#ffb7c4]
            `

            : `
              text-lg
              font-semibold
              text-white
            `
        }
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
// MOBILE FILTER CHIP
// =========================================================

function MobileInvoiceFilterChip({
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
// MOBILE INVOICE CARD
// =========================================================

function MobileInvoiceCard({
  invoice,
  roomCode,
  selectionMode,
  selected,
  onToggleSelected,
  onQuickPayment,
  quickPaymentLoading,
}: {
  invoice: Invoice;
  roomCode: string;
  selectionMode: boolean;
  selected: boolean;
  onToggleSelected: () => void;
  onQuickPayment: () => void;
  quickPaymentLoading: boolean;
}) {

  const isCancelled =
    invoice.status
    === "CANCELLED";


  const canQuickPay =
    invoice.status
    === "ISSUED"
    &&
    invoice.payment_status
    !== "PAID";


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
        className={
          invoice.status
          === "ISSUED"

            ? "h-1 bg-[#e44763]"

            : invoice.status
              === "CANCELLED"

              ? "h-1 bg-slate-400"

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
                font-semibold
                uppercase
                tracking-[0.12em]
                text-slate-400
              "
            >
              Hóa đơn #{invoice.id}
            </div>


            <h3
              className="
                mt-1
                text-lg
                font-semibold
                text-[#172033]
              "
            >
              {roomCode}
            </h3>

            <p className="mt-1 text-[11px] font-semibold text-[#8a6726]">
              {invoice.checkout_settlement ? "Quyết toán trả phòng" : "Hóa đơn hàng tháng"}
            </p>

            <div
              className="
                mt-1
                text-xs
                text-slate-500
              "
            >
              Tháng {invoice.month}/{invoice.year}
              {" • "}
              v{invoice.version}
            </div>

          </div>


          <InvoiceStatusBadge
            status={
              invoice.status
            }
          />

        </div>


        <div
          className="
            px-4
            py-4
          "
        >

          {selectionMode
            &&
            invoice.status === "DRAFT"
            &&
            (

              <label
                className="
                  mb-3
                  flex
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-[#ead9b7]
                  bg-[#fffaf0]
                  px-3
                  py-2
                  text-xs
                  font-semibold
                  text-[#8a6726]
                "
              >

                <input
                  type="checkbox"
                  checked={
                    selected
                  }
                  onChange={
                    onToggleSelected
                  }
                  className="h-4 w-4 accent-[#d6a64c]"
                />

                Chọn hóa đơn này

              </label>

            )}


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
                text-slate-500
              "
            >
              Thanh toán
            </span>


            <PaymentStatusBadge
              status={
                invoice.payment_status
              }
            />

          </div>


          <div
            className="
              mt-4
              rounded-xl
              border
              border-[#ead9b7]
              bg-[#fffaf0]
              px-4
              py-4
            "
          >

            <div
              className="
                text-xs
                font-medium
                text-[#8a6726]
              "
            >
              Tổng tiền
            </div>


            <div
              className="
                mt-1
                text-xl
                font-semibold
                text-[#172033]
              "
            >
              {formatMoney(
                invoice.total_amount
              )}
            </div>

          </div>


          {isCancelled && (

            <div
              className="
                mt-3
                flex
                items-center
                gap-2
                rounded-xl
                border
                border-slate-200
                bg-slate-50
                px-3
                py-2
                text-xs
                text-slate-600
              "
            >

              <AlertCircle
                size={14}
              />

              Hóa đơn đã bị hủy

            </div>

          )}

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

          <div
            className="
              space-y-2
            "
          >

            <Link
              to={
                `/invoices/${invoice.id}`
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

              Xem chi tiết

              <ArrowUpRight
                size={14}
              />

            </Link>


            {canQuickPay && (

              <Button
                type="button"
                variant="outline"
                onClick={
                  onQuickPayment
                }
                disabled={
                  quickPaymentLoading
                }
                className="
                  h-10
                  w-full
                  rounded-xl
                  border-[#d6a64c]
                  bg-[#fffaf0]
                  font-semibold
                  text-[#8a6726]
                  hover:bg-[#f8efdc]
                  hover:text-[#76581f]
                "
              >

                {quickPaymentLoading ? (

                  <RefreshCw
                    size={15}
                    className=
                      "animate-spin"
                  />

                ) : (

                  <WalletCards
                    size={15}
                  />

                )}


                {quickPaymentLoading
                  ? "Đang tải..."
                  : invoice.payment_status
                    === "PARTIALLY_PAID"
                    ? "Ghi nhận thêm"
                    : "Ghi nhận thanh toán"}

              </Button>

            )}

          </div>

        </div>

      </CardContent>

    </Card>

  );

}


// =========================================================
// INVOICE CARD
// =========================================================

function InvoiceCard({
  invoice,
  roomCode,
  selectionMode,
  selected,
  onToggleSelected,
  onQuickPayment,
  quickPaymentLoading,
}: {
  invoice: Invoice;
  roomCode: string;
  selectionMode: boolean;
  selected: boolean;
  onToggleSelected: () => void;
  onQuickPayment: () => void;
  quickPaymentLoading: boolean;
}) {

  const isCancelled =
    invoice.status
    === "CANCELLED";


  const canQuickPay =
    invoice.status
    === "ISSUED"
    &&
    invoice.payment_status
    !== "PAID";


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
          invoice.status
          === "ISSUED"

            ? "h-1 bg-[#e44763]"

            : invoice.status
              === "CANCELLED"

              ? "h-1 bg-slate-400"

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
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-[#eef1f5]
                text-[#20334d]
              "
            >

              <ReceiptText
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
                Hóa đơn #{invoice.id}
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
                {roomCode}
              </h2>
              <p className="mt-1 text-xs font-semibold text-[#8a6726]">
                {invoice.checkout_settlement ? "Quyết toán trả phòng" : "Hóa đơn hàng tháng"}
              </p>

            </div>

          </div>


          <InvoiceStatusBadge
            status={
              invoice.status
            }
          />

        </div>


        {/* BODY */}

        <div
          className="
            space-y-1
            px-5
            py-4
          "
        >

          {selectionMode
            &&
            invoice.status === "DRAFT"
            &&
            (

              <label
                className="
                  mb-3
                  flex
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-[#ead9b7]
                  bg-[#fffaf0]
                  px-3
                  py-2
                  text-sm
                  font-semibold
                  text-[#8a6726]
                "
              >

                <input
                  type="checkbox"
                  checked={
                    selected
                  }
                  onChange={
                    onToggleSelected
                  }
                  className="h-4 w-4 accent-[#d6a64c]"
                />

                Chọn hóa đơn này

              </label>

            )}


          <InvoiceInfoRow
            label="Kỳ hóa đơn"
            value={
              `${invoice.month}/${invoice.year}`
            }
          />


          <InvoiceInfoRow
            label="Phiên bản"
            value={
              `v${invoice.version}`
            }
          />


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
              Thanh toán
            </span>


            <PaymentStatusBadge
              status={
                invoice.payment_status
              }
            />

          </div>


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

            <div>

              <div
                className="
                  text-xs
                  font-medium
                  text-[#8a6726]
                "
              >
                Tổng tiền
              </div>


              <strong
                className="
                  mt-1
                  block
                  text-xl
                  text-[#172033]
                "
              >
                {formatMoney(
                  invoice.total_amount
                )}
              </strong>

            </div>


            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-[#f5eddc]
                text-[#9a762f]
              "
            >

              <CircleDollarSign
                size={19}
              />

            </div>

          </div>


          {isCancelled && (

            <div
              className="
                mt-3
                flex
                items-center
                gap-2
                rounded-xl
                border
                border-slate-200
                bg-slate-50
                px-3
                py-2
                text-xs
                text-slate-600
              "
            >

              <AlertCircle
                size={15}
              />

              Hóa đơn này đã bị hủy.

            </div>

          )}

        </div>


        {/* ACTION */}

        <div
          className="
            border-t
            border-[#eeeae2]
            bg-[#fcfbf8]
            px-5
            py-4
          "
        >

          <div
            className={
              canQuickPay

                ? `
                  grid
                  grid-cols-2
                  gap-2
                `

                : ""
            }
          >

            <Link
              to={
                `/invoices/${invoice.id}`
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

              Xem chi tiết

              <ArrowUpRight
                size={15}
              />

            </Link>


            {canQuickPay && (

              <Button
                type="button"
                variant="outline"
                onClick={
                  onQuickPayment
                }
                disabled={
                  quickPaymentLoading
                }
                className="
                  h-10
                  w-full
                  rounded-xl
                  border-[#d6a64c]
                  bg-[#fffaf0]
                  font-semibold
                  text-[#8a6726]
                  hover:bg-[#f8efdc]
                  hover:text-[#76581f]
                "
              >

                {quickPaymentLoading ? (

                  <RefreshCw
                    size={15}
                    className=
                      "animate-spin"
                  />

                ) : (

                  <WalletCards
                    size={15}
                  />

                )}


                {quickPaymentLoading
                  ? "Đang tải..."
                  : invoice.payment_status
                    === "PARTIALLY_PAID"
                    ? "Ghi nhận thêm"
                    : "Ghi nhận thanh toán"}

              </Button>

            )}

          </div>

        </div>

      </CardContent>

    </Card>

  );

}


// =========================================================
// INVOICE STATUS
// =========================================================

function InvoiceStatusBadge({
  status,
}: {
  status: string;
}) {

  if (
    status === "ISSUED"
  ) {

    return (

      <Badge
        variant="outline"
        className="
          border-[#efced4]
          bg-[#fcecef]
          text-[#b92f49]
        "
      >
        {getInvoiceStatusText(
          status
        )}
      </Badge>

    );

  }


  if (
    status === "CANCELLED"
  ) {

    return (

      <Badge
        variant="outline"
        className="
          border-slate-200
          bg-slate-50
          text-slate-600
        "
      >
        {getInvoiceStatusText(
          status
        )}
      </Badge>

    );

  }


  return (

    <Badge
      variant="outline"
      className="
        border-[#ead9b7]
        bg-[#fffaf0]
        text-[#8a6726]
      "
    >
      {getInvoiceStatusText(
        status
      )}
    </Badge>

  );

}


// =========================================================
// PAYMENT STATUS
// =========================================================

function PaymentStatusBadge({
  status,
}: {
  status?: string;
}) {

  if (
    status === "PAID"
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
        {getPaymentStatusText(
          status
        )}
      </Badge>

    );

  }


  if (
    status === "PARTIALLY_PAID"
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
        {getPaymentStatusText(
          status
        )}
      </Badge>

    );

  }


  if (
    status === "UNPAID"
  ) {

    return (

      <Badge
        variant="outline"
        className="
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


  return (

    <Badge
      variant="outline"
      className="
        border-slate-200
        bg-slate-50
        text-slate-600
      "
    >
      {getPaymentStatusText(
        status
      )}
    </Badge>

  );

}


// =========================================================
// INFO ROW
// =========================================================

function InvoiceInfoRow({
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
// SUMMARY CARD
// =========================================================

function InvoiceSummaryCard({
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


export default Invoices;