import { CheckoutSummary } from "../components/CheckoutSettlementAction";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router";

import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Copy,
  Eye,
  FileImage,
  FileText,
  Landmark,
  Paperclip,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Trash2,
  Upload,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

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

import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPostFormData,
  apiPostNoBody,
} from "../api/api";

import AddInvoiceItemModal
  from "../components/AddInvoiceItemModal";

import AddPaymentModal
  from "../components/AddPaymentModal";

import type {
  Invoice,
} from "../types/invoice";

import type {
  Payment,
} from "../types/payment";

type ReceiptUrlResponse = {
  url: string;
  expires_in: number;
};


type ReceiptMode =
  | "ADD"
  | "REPLACE";


type PaymentUpdatePayload = {
  transaction_reference:
    | string
    | null;

  note:
    | string
    | null;
};


type InvoiceItemUpdatePayload = {
  description?: string;
  quantity?: number | null;
  unit?: string | null;
  unit_price?: number | null;
  amount?: number;
};


type PaymentVoidPayload = {
  reason: string;
};


type PaymentVoidResponse = {
  payment_id: number;
  invoice_id: number;
  voided: boolean;
  reason: string;
  total_paid: number;
  payment_status: string;
};


const MAX_RECEIPT_SIZE =
  5 * 1024 * 1024;


const ALLOWED_RECEIPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];


import type {
  Room,
} from "../types/room";

import type {
  MeterReading,
} from "../types/meterReading";


// =========================================================
// VIETQR CONFIG
// =========================================================

const VIETQR_BANK_ID =
  import.meta.env.VITE_VIETQR_BANK_ID?.trim()
  || "";

const VIETQR_ACCOUNT_NO =
  import.meta.env.VITE_VIETQR_ACCOUNT_NO?.trim()
  || "";

const VIETQR_ACCOUNT_NAME =
  import.meta.env.VITE_VIETQR_ACCOUNT_NAME?.trim()
  || "";


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


function formatNumber(
  value: number
) {
  return new Intl.NumberFormat(
    "vi-VN"
  ).format(value);
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
    "vi-VN"
  );
}


function getStatusText(
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


function getPaymentText(
  status?: string
) {
  if (status === "UNPAID") {
    return "Chưa thanh toán";
  }

  if (
    status
    === "PARTIALLY_PAID"
  ) {
    return "Thanh toán một phần";
  }

  if (status === "PAID") {
    return "Đã thanh toán";
  }

  return "-";
}


function getPaymentMethodText(
  method: string
) {
  if (method === "CASH") {
    return "Tiền mặt";
  }

  if (
    method
    === "BANK_TRANSFER"
  ) {
    return "Chuyển khoản";
  }

  if (method === "DEPOSIT") {
    return "Tiền cọc";
  }


  if (method === "OTHER") {
    return "Khác";
  }

  return method;
}


function isAutoCalculatedInvoiceItem(
  type: string
) {
  return (
    type === "RENT"
    ||
    type === "ELECTRICITY"
  );
}


function getItemTypeText(
  type: string
) {
  switch (type) {

    case "RENT":
      return "Tiền phòng";

    case "ELECTRICITY":
      return "Tiền điện";

    case "WATER":
      return "Tiền nước";

    case "MANAGEMENT":
      return "Phí quản lý";

    case "DEPOSIT":
      return "Tiền cọc";

    case "OTHER":
      return "Khoản khác";

    case "DISCOUNT":
      return "Giảm trừ";

    default:
      return type;
  }
}


function getBankName() {
  if (
    VIETQR_BANK_ID
    === "970416"
  ) {
    return "ACB";
  }

  return VIETQR_BANK_ID;
}


function escapeHtml(
  value: string
) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll(
      "'",
      "&#039;"
    );
}


// =========================================================
// VIETQR URL
// =========================================================

function buildVietQrUrl(
  amount: number,
  transferContent: string,
  template:
    | "compact2"
    | "compact"
    | "qr_only"
    = "compact2",
) {
  if (
    !VIETQR_BANK_ID
    ||
    !VIETQR_ACCOUNT_NO
    ||
    !VIETQR_ACCOUNT_NAME
    ||
    amount <= 0
  ) {
    return "";
  }

  const baseUrl =
    "https://img.vietqr.io/image/"
    +
    `${encodeURIComponent(
      VIETQR_BANK_ID
    )}-`
    +
    `${encodeURIComponent(
      VIETQR_ACCOUNT_NO
    )}-`
    +
    `${template}.png`;

  const params =
    new URLSearchParams({
      amount:
        String(
          Math.trunc(
            amount
          )
        ),

      addInfo:
        transferContent,

      accountName:
        VIETQR_ACCOUNT_NAME,
    });

  return (
    `${baseUrl}?${params.toString()}`
  );
}


// =========================================================
// LOAD IMAGE FOR PNG
// =========================================================

function loadImage(
  src: string
): Promise<HTMLImageElement> {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const image =
        new Image();

      image.crossOrigin =
        "anonymous";

      image.onload =
        () =>
          resolve(
            image
          );

      image.onerror =
        () =>
          reject(
            new Error(
              "Không thể tải ảnh."
            )
          );

      image.src =
        src;
    }
  );
}


// =========================================================
// COMPONENT
// =========================================================

function InvoiceDetails() {

  const {
    invoiceId,
  } = useParams();


  const navigate =
    useNavigate();


  const [
    invoice,
    setInvoice,
  ] = useState<
    Invoice | null
  >(null);


  const [
    room,
    setRoom,
  ] = useState<
    Room | null
  >(null);


  const [
    meterReading,
    setMeterReading,
  ] = useState<
    MeterReading | null
  >(null);


  const [
    payments,
    setPayments,
  ] = useState<
    Payment[]
  >([]);


  const [
    printNote,
    setPrintNote,
  ] = useState("");


  const [
    showAddItemModal,
    setShowAddItemModal,
  ] = useState(false);


  const [
    editingInvoiceItem,
    setEditingInvoiceItem,
  ] = useState<
    Invoice["items"][number] | null
  >(null);


  const [
    editItemDescription,
    setEditItemDescription,
  ] = useState("");


  const [
    editItemQuantity,
    setEditItemQuantity,
  ] = useState("");


  const [
    editItemUnit,
    setEditItemUnit,
  ] = useState("");


  const [
    editItemUnitPrice,
    setEditItemUnitPrice,
  ] = useState("");


  const [
    editItemAmount,
    setEditItemAmount,
  ] = useState("");


  const [
    showPaymentModal,
    setShowPaymentModal,
  ] = useState(false);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    processing,
    setProcessing,
  ] = useState(false);


  const [
    receiptProcessingId,
    setReceiptProcessingId,
  ] = useState<
    number | null
  >(null);


  const [
    voidingPaymentId,
    setVoidingPaymentId,
  ] = useState<
    number | null
  >(null);


  const [
    editingPayment,
    setEditingPayment,
  ] = useState<
    Payment | null
  >(null);


  const [
    editTransactionReference,
    setEditTransactionReference,
  ] = useState("");


  const [
    editPaymentNote,
    setEditPaymentNote,
  ] = useState("");


  const [
    paymentInfoProcessingId,
    setPaymentInfoProcessingId,
  ] = useState<
    number | null
  >(null);


  const [
    error,
    setError,
  ] = useState("");


  const [
    success,
    setSuccess,
  ] = useState("");


  // =========================================================
  // AUTO CALCULATE ITEM AMOUNT
  //
  // Tiền phòng / tiền điện:
  // Thành tiền = Số lượng × Đơn giá
  // =========================================================

  useEffect(
    () => {

      if (
        !editingInvoiceItem
        ||
        !isAutoCalculatedInvoiceItem(
          editingInvoiceItem.item_type
        )
      ) {
        return;
      }


      if (
        !editItemQuantity.trim()
        ||
        !editItemUnitPrice.trim()
      ) {
        return;
      }


      const quantity =
        Number(
          editItemQuantity
        );


      const unitPrice =
        Number(
          editItemUnitPrice
        );


      if (
        !Number.isInteger(
          quantity
        )
        ||
        quantity < 0
        ||
        !Number.isInteger(
          unitPrice
        )
        ||
        unitPrice < 0
      ) {
        return;
      }


      const amount =
        quantity
        *
        unitPrice;


      if (
        !Number.isSafeInteger(
          amount
        )
      ) {
        return;
      }


      setEditItemAmount(
        String(
          amount
        )
      );

    },
    [
      editingInvoiceItem,
      editItemQuantity,
      editItemUnitPrice,
    ]
  );


  // =========================================================
  // LOAD
  // =========================================================

  async function loadData() {

    if (!invoiceId) {

      setError(
        "Invoice ID không hợp lệ."
      );

      setLoading(false);

      return;
    }


    try {

      setLoading(true);
      setError("");
      setMeterReading(null);


      const invoiceData =
        await apiGet<Invoice>(
          `/invoices/${invoiceId}`
        );


      setInvoice(
        invoiceData
      );


      setPrintNote(
        invoiceData.note
        ?? ""
      );


      const [
        roomData,
        paymentData,
      ] =
        await Promise.all([

          apiGet<Room>(
            `/rooms/${invoiceData.room_id}`
          ),

          apiGet<Payment[]>(
            `/invoices/${invoiceData.id}/payments`
          ),

        ]);


      setRoom(
        roomData
      );


      setPayments(
        paymentData
      );


      try {

        if (invoiceData.meter_reading_id == null) {
          setMeterReading(null);
        } else {
          const source = await apiGet<MeterReading>(
            `/meter-readings/${invoiceData.meter_reading_id}`
          );
          if (
            source.id !== invoiceData.meter_reading_id
            || source.room_id !== invoiceData.room_id
            || source.year !== invoiceData.electricity_period_year
            || source.month !== invoiceData.electricity_period_month
          ) {
            throw new Error("Invoice meter source does not match");
          }
          setMeterReading(source);
        }

      } catch (
        meterError
      ) {

        console.warn(
          "Không tải được chỉ số điện:",
          meterError
        );


        setMeterReading(
          null
        );

      }

    } catch (
      err
    ) {

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
          "Không thể tải chi tiết hóa đơn."
        );

      }

    } finally {

      setLoading(false);

    }

  }


  useEffect(
    () => {

      loadData();

    },
    [
      invoiceId,
    ]
  );


  // =========================================================
  // PAYMENT
  // =========================================================

  const totalPaid =
    useMemo(
      () => {

        return payments.reduce(
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


  const remainingAmount =
    useMemo(
      () => {

        if (!invoice) {
          return 0;
        }


        return Math.max(
          0,
          invoice.total_amount
          -
          totalPaid
        );

      },
      [
        invoice,
        totalPaid,
      ]
    );


  const hasPaymentQrConfig =
    Boolean(
      VIETQR_BANK_ID
      &&
      VIETQR_ACCOUNT_NO
      &&
      VIETQR_ACCOUNT_NAME
    );


  const transferContent =
    (
      invoice
        ?.transfer_reference
        ?.trim()
      ?? ""
    );



  // =========================================================
  // COPY RH TRANSFER CODE
  // =========================================================

  async function handleCopyTransferContent() {

    if (!transferContent) {
      return;
    }


    try {

      if (
        !navigator.clipboard
      ) {
        throw new Error(
          "Clipboard API unavailable"
        );
      }


      await navigator.clipboard.writeText(
        transferContent
      );


      setError("");


      setSuccess(
        `Đã sao chép mã ${transferContent}.`
      );


    } catch {

      window.prompt(
        "Sao chép mã RH:",
        transferContent
      );

    }

  }


  const paymentQrUrl =
    useMemo(
      () => {

        if (
          !invoice
          ||
          !room
          ||
          !transferContent
          ||
          remainingAmount <= 0
        ) {
          return "";
        }


        return buildVietQrUrl(
          remainingAmount,
          transferContent,
          "compact2"
        );

      },
      [
        invoice,
        room,
        remainingAmount,
        transferContent,
      ]
    );


  const qrOnlyUrl =
    useMemo(
      () => {

        if (
          !invoice
          ||
          !room
          ||
          !transferContent
          ||
          remainingAmount <= 0
        ) {
          return "";
        }


        return buildVietQrUrl(
          remainingAmount,
          transferContent,
          "qr_only"
        );

      },
      [
        invoice,
        room,
        remainingAmount,
        transferContent,
      ]
    );


  // Presentation only; never changes persisted lifecycle or payment state.
  const invoicePresentation = {
    label: invoice?.status === "DRAFT" || invoice?.status === "CANCELLED"
      ? `${getStatusText(invoice.status)} · ${getPaymentText(invoice.payment_status)}`
      : getPaymentText(invoice?.payment_status),
    tone: invoice?.status === "DRAFT" || invoice?.status === "CANCELLED"
      ? "neutral"
      : invoice?.payment_status === "PAID"
        ? "paid"
        : invoice?.payment_status === "PARTIALLY_PAID" ? "partial" : "unpaid",
    paid: invoice?.status === "ISSUED"
      && invoice?.payment_status === "PAID"
      && remainingAmount === 0,
  };

  // =========================================================
  // PRINT / PDF V2
  // =========================================================

  function handlePrintInvoice() {

    if (
      !invoice
      ||
      !room
    ) {
      return;
    }


    const printWindow =
      window.open(
        "",
        "_blank",
        "width=900,height=980"
      );


    if (!printWindow) {

      window.alert(
        "Trình duyệt đang chặn cửa sổ in."
      );

      return;
    }


    const electricityItem =
      invoice.items.find(
        (item) =>
          item.item_type
          === "ELECTRICITY"
      );


    const oldReading =
      invoice.checkout_settlement?.electricity_old_reading ?? invoice.electricity_transition_old_reading ?? meterReading
        ?.old_reading
        ?? "-";


    const newReading =
      invoice.checkout_settlement?.electricity_new_reading ?? invoice.electricity_transition_new_reading ?? meterReading
        ?.new_reading
        ?? "-";


    const consumption =
      invoice.checkout_settlement?.electricity_consumption ?? (invoice.electricity_transition_new_reading != null && invoice.electricity_transition_old_reading != null
        ? invoice.electricity_transition_new_reading - invoice.electricity_transition_old_reading
        : null) ?? meterReading
        ?.consumption
        ??
        electricityItem
          ?.quantity
        ??
        "-";


    const electricityRate =
      electricityItem
        ?.unit_price
        ?? null;


    const rows =
      invoice.items
        .map(
          (item) => {

            let detail =
              item.description
              || getItemTypeText(
                item.item_type
              );


            if (
              item.item_type
              === "ELECTRICITY"
              && !invoice.checkout_settlement
            ) {

              detail =
                invoice.electricity_transition_new_reading != null
                  ? `Điện chuyển tiếp: ${oldReading} → ${newReading} (${consumption} kWh)`
                  : `${consumption} kWh`;

              if (
                electricityRate
                !== null
              ) {

                detail +=
                  ` × ${formatNumber(
                    electricityRate
                  )} đ`;

              }

            }


            return `
              <tr>
                <td>
                  ${escapeHtml(
                    getItemTypeText(
                      item.item_type
                    )
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    detail
                  )}
                </td>

                <td class="money">
                  ${escapeHtml(
                    formatMoney(
                      item.amount
                    )
                  )}
                </td>
              </tr>
            `;

          }
        )
        .join("");


    const qrHtml =
      (
        invoice.status === "ISSUED"
        && invoice.payment_status !== "PAID"
        && remainingAmount > 0
      )

        ? `
          <div class="payment-area">

            <div class="payment-info">

              <div class="payment-heading">
                THÔNG TIN THANH TOÁN
              </div>

              <div class="amount-label">
                Số tiền cần thanh toán
              </div>

              <div class="amount-due">
                ${escapeHtml(
                  formatMoney(
                    remainingAmount
                  )
                )}
              </div>

              <div class="bank-row">
                <span>Ngân hàng</span>
                <strong>
                  ${escapeHtml(
                    getBankName()
                  )}
                </strong>
              </div>

              <div class="bank-row">
                <span>Số tài khoản</span>
                <strong>
                  ${escapeHtml(
                    VIETQR_ACCOUNT_NO
                  )}
                </strong>
              </div>

              <div class="bank-row">
                <span>Chủ tài khoản</span>
                <strong>
                  ${escapeHtml(
                    VIETQR_ACCOUNT_NAME
                  )}
                </strong>
              </div>

              <div class="bank-row">
                <span>Nội dung CK</span>
                <strong>
                  ${escapeHtml(
                    transferContent
                  )}
                </strong>
              </div>

            </div>


            <div class="qr-box">
              ${qrOnlyUrl ? `
                <div class="qr-image">
                  <img src="${escapeHtml(qrOnlyUrl)}" alt="VietQR" />
                  <div class="qr-label">Quét QR để thanh toán</div>
                  <small>Vui lòng giữ nguyên nội dung chuyển khoản</small>
                </div>
              ` : ""}
              <div class="qr-fallback" ${qrOnlyUrl ? "hidden" : ""}>
                <strong>Không thể hiển thị mã QR</strong>
                <small>Vui lòng chuyển khoản theo thông tin bên trái.</small>
              </div>
            </div>

          </div>
        `

        : `
          <div class="${invoicePresentation.paid ? "paid-box" : "status-message"}">
            ${invoicePresentation.paid ? "HÓA ĐƠN ĐÃ THANH TOÁN ĐỦ" : escapeHtml(invoicePresentation.label)}
          </div>
        `;


    const logoUrl =
      `${window.location.origin}/Rosehome.png`;


    printWindow.document.write(`
      <!doctype html>

      <html lang="vi">

        <head>

          <meta charset="UTF-8" />

          <title>
            Hóa đơn ${escapeHtml(
              room.room_code
            )} - ${invoice.month}/${invoice.year}
          </title>

          <style>

            * {
              box-sizing: border-box;
            }


            body {
              margin: 0;
              padding: 0;
              background: white;
              color: #172033;
              font-family:
                Arial,
                Helvetica,
                sans-serif;
            }


            .sheet {
              width: 194mm;
              min-height: 270mm;
              margin: 0 auto;
              padding: 6mm 0;
              background: #ffffff;
            }


            .header {
              display: grid;
              align-items: center;
              justify-content: space-between;
              gap: 8px;
              padding-bottom: 12px;
              border-bottom: 2px solid #d99b24;
              grid-template-columns: 1fr;
            }


            .brand {
              display: flex;
              align-items: center;
              gap: 12px;
            }


            .logo {
              width: 58px;
              height: 58px;
              object-fit: contain;
            }


            .brand-name {
              font-size: 24px;
              font-weight: 700;
            }


            .brand-sub {
              margin-top: 4px;
              font-size: 12px;
              color: #667085;
            }


            .invoice-head {
              text-align: left;
              padding-left: 70px;
            }


            .invoice-title {
              font-size: 30px;
              font-weight: 800;
            }


            .invoice-number {
              margin-top: 4px;
              font-size: 14px;
              color: #667085;
            }


            .info-grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 8px;
              margin-top: 14px;
            }


            .info-card {
              padding: 12px;
              background: #f7f8fa;
              border: 1px solid #eaecf0;
              border-radius: 6px;
              min-width: 0;
            }


            .info-label {
              font-size: 13px;
              color: #000000;
              font-weight: 600;
            }


            .info-value {
              margin-top: 3px;
              font-size: 22px;
              font-weight: 700;
              line-height: 1.25;
              overflow-wrap: anywhere;
            }


            .meter-box {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 6px;
              margin-top: 10px;
            }


            .meter-item {
              padding: 12px 6px;
              border: 1px solid #eaecf0;
              border-radius: 5px;
              text-align: center;
              min-width: 0;
            }


            .meter-item span {
              display: block;
              font-size: 13px;
              color: #000000;
              font-weight: 600;
            }


            .meter-item strong {
              display: block;
              margin-top: 3px;
              font-size: 24px;
              overflow-wrap: anywhere;
            }


            table {
              width: 100%;
              margin-top: 12px;
              border-collapse: collapse;
              font-size: 14px;
            }


            th {
              padding: 10px;
              background: #f2f4f7;
              border: 1px solid #d0d5dd;
              text-align: left;
              font-size: 12px;
            }


            td {
              padding: 12px 10px;
              border: 1px solid #d0d5dd;
              overflow-wrap: anywhere;
            }


            .money {
              text-align: right;
              white-space: nowrap;
              font-weight: 700;
              font-size: 17px;
            }


            .total-section {
              margin-top: 16px;
              margin-left: auto;
              width: 100%;
              break-inside: avoid;
            }


            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
              font-size: 14px;
              gap: 16px;
            }


            .grand-total {
              margin-top: 4px;
              padding-top: 7px;
              border-top: 2px solid #d99b24;
              font-size: 19px;
              font-weight: 800;
              display: block;
              padding: 8px 16px;
              border: 1px solid #fecaca;
              border-radius: 8px;
              background: #fff7f7;
            }


            .remaining {
              color: #c62828;
              font-weight: 800;
              display: block;
              margin-top: 2px;
              font-size: 36px;
              white-space: nowrap;
            }


            .payment-area {
              display: grid;
              grid-template-columns: minmax(0, 1fr) 210px;
              gap: 16px;
              margin-top: 13px;
              padding: 16px;
              border: 1px solid #d0d5dd;
              border-radius: 8px;
              page-break-inside: avoid;
            }


            .payment-heading {
              margin-bottom: 8px;
              font-size: 18px;
              font-weight: 800;
            }


            .amount-label {
              font-size: 13px;
              color: #000000;
              font-weight: 600;
            }


            .amount-due {
              margin: 3px 0 10px;
              font-size: 24px;
              font-weight: 700;
              color: #c62828;
              white-space: nowrap;
            }


            .bank-row {
              display: grid;
              grid-template-columns: 115px minmax(0, 1fr);
              gap: 8px;
              margin-top: 5px;
              font-size: 14px;
              overflow-wrap: anywhere;
            }


            .bank-row span {
              color: #000000;
              font-weight: 600;
              font-size: 15px;
            }


            .qr-box {
              text-align: center;
              align-self: center;
            }

            .qr-fallback strong { font-size: 14px; color: #475467; }
            .qr-fallback small { font-size: 12px; line-height: 1.5; margin-top: 8px; }


            .qr-label {
              margin-bottom: 4px;
              font-size: 12px;
              font-weight: 700;
            }


            .qr-box img {
              width: 190px;
              height: 190px;
              object-fit: contain;
            }


            .qr-box small {
              display: block;
              margin-top: 3px;
              font-size: 11px;
              color: #667085;
            }


            .paid-box {
              margin-top: 14px;
              padding: 14px;
              border: 2px solid #179c64;
              border-radius: 8px;
              text-align: center;
              color: #179c64;
              font-size: 18px;
              font-weight: 800;
            }


            .note {
              margin-top: 12px;
              padding: 9px 10px;
              background: #fafafa;
              border: 1px solid #eaecf0;
              border-radius: 6px;
              font-size: 14px;
              line-height: 1.45;
              overflow-wrap: anywhere;
            }


            .note-text { white-space: pre-wrap; }

            .note strong {
              display: block;
              margin-bottom: 4px;
            }


            .footer {
              margin-top: 11px;
              padding-top: 7px;
              border-top: 1px solid #eaecf0;
              text-align: center;
              font-size: 11px;
              color: #667085;
            }


            @page {
              size: A4 portrait;
              margin: 8mm;
            }


            @media print {

              html,
              body {
                width: auto;
                height: auto;
              }


              .sheet {
                width: auto;
                min-height: auto;
                padding: 0;
              }

              .header { gap: 2px; padding-bottom: 8px; }
              .logo { width: 44px; height: 44px; }
              .info-card { padding: 8px; }
              .meter-item { padding: 9px 6px; }
              td { padding: 8px 10px; }
              .total-section { margin-top: 12px; }
              .grand-total { padding: 3px 12px; }
              .payment-area { margin-top: 10px; padding: 12px; }
              .note { margin-top: 8px; padding: 8px 10px; orphans: 3; widows: 3; }
              .footer { margin-top: 8px; padding-top: 5px; break-inside: avoid; }

            }

            .info-card.status-unpaid { background: #fff1f2; color: #9f1239; }
            .info-card.status-partial { background: #fffbeb; color: #92400e; }
            .info-card.status-paid { background: #f0fdf4; color: #166534; }
            .info-card.status-neutral { background: #f1f5f9; color: #475569; }
            .meter-item:nth-child(3) { background: #fffbeb; border-color: #d99b24; }
            .meter-item:nth-child(3) strong { font-size: 26px; }
            td:first-child { font-size: 17px; font-weight: 600; }
            .grand-total.is-paid { background: #f0fdf4; border-color: #bbf7d0; }
            .grand-total.is-paid .remaining { color: #166534; }
            .bank-row:last-child { display: block; margin-top: 10px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
            .bank-row:last-child strong { display: block; margin-top: 5px; font-size: 18px; }
            .total-row strong { white-space: nowrap; }
            .header, .info-grid, .meter-box, tr, .paid-box { break-inside: avoid; }
            thead { display: table-header-group; }
            .status-message { margin-top: 14px; padding: 14px; border: 1px solid #d0d5dd; color: #475569; text-align: center; }
          </style>

        </head>


        <body>

          <div class="sheet">

            <div class="header">

              <div class="brand">

                <img
                  class="logo"
                  src="${escapeHtml(
                    logoUrl
                  )}"
                  alt="Rosehome"
                />

                <div>

                  <div class="brand-name">
                    Rosehome Apartment
                  </div>

                  <div class="brand-sub">
                    Apartment Management
                  </div>

                </div>

              </div>


              <div class="invoice-head">

                <div class="invoice-title">
                  HÓA ĐƠN TIỀN PHÒNG
                </div>

                <div class="invoice-number">
                  Hóa đơn #${invoice.id}
                  •
                  Phiên bản v${invoice.version}
                </div>

              </div>

            </div>


            <div class="info-grid">

              <div class="info-card">

                <div class="info-label">
                  Phòng
                </div>

                <div class="info-value">
                  ${escapeHtml(
                    room.room_code
                  )}
                </div>

              </div>


              <div class="info-card">

                <div class="info-label">
                  Kỳ hóa đơn
                </div>

                <div class="info-value">
                  Tháng ${invoice.month}/${invoice.year}
                </div>

              </div>


              <div class="info-card status-${invoicePresentation.tone}">

                <div class="info-label">
                  Trạng thái thanh toán
                </div>

                <div class="info-value">
                  ${escapeHtml(
                    invoicePresentation.label
                  )}
                </div>

              </div>

            </div>


            <div class="meter-box">

              <div class="meter-item">
                <span>Số điện cũ</span>
                <strong>${oldReading}</strong>
              </div>

              <div class="meter-item">
                <span>Số điện mới</span>
                <strong>${newReading}</strong>
              </div>

              <div class="meter-item">
                <span>Tiêu thụ</span>
                <strong>${consumption} kWh</strong>
              </div>

              <div class="meter-item">
                <span>Đơn giá điện</span>
                <strong>
                  ${
                    electricityRate
                    !== null
                      ? `${escapeHtml(
                          formatNumber(
                            electricityRate
                          )
                        )} đ`
                      : "-"
                  }
                </strong>
              </div>

            </div>


            <table>

              <thead>

                <tr>
                  <th>Khoản</th>
                  <th>Chi tiết</th>
                  <th style="text-align:right">
                    Thành tiền
                  </th>
                </tr>

              </thead>

              <tbody>
                ${rows}
              </tbody>

            </table>


            <div class="total-section">

              <div class="total-row">
                <span>Tổng hóa đơn</span>
                <strong>
                  ${escapeHtml(
                    formatMoney(
                      invoice.total_amount
                    )
                  )}
                </strong>
              </div>

              <div class="total-row">
                <span>Đã thanh toán</span>
                <strong>
                  ${escapeHtml(
                    formatMoney(
                      totalPaid
                    )
                  )}
                </strong>
              </div>

              <div class="total-row grand-total ${invoicePresentation.paid ? "is-paid" : ""}">
                <span>${invoicePresentation.paid ? "ĐÃ THANH TOÁN ĐỦ" : "CÒN PHẢI TRẢ"}</span>

                <span class="remaining">
                  ${escapeHtml(
                    formatMoney(
                      remainingAmount
                    )
                  )}
                </span>
              </div>

            </div>


            ${qrHtml}


            ${
              printNote.trim()

                ? `
                  <div class="note">
                    <strong>Ghi chú</strong>
                    <div class="note-text">${escapeHtml(printNote.trim())}</div>
                  </div>
                `

                : ""
            }


            <div class="footer">
              Rosehome Apartment
              •
              Hóa đơn #${invoice.id}
              •
              ${invoice.month}/${invoice.year}
            </div>

          </div>


          <script>

            const waitForImages =
              Promise.all(
                Array.from(
                  document.images
                ).map(
                  (img) => {

                    if (
                      img.complete
                    ) {
                      return Promise.resolve();
                    }

                    return new Promise(
                      (resolve) => {

                        img.onload =
                          resolve;

                        img.onerror =
                          resolve;

                      }
                    );

                  }
                )
              );


            waitForImages.then(
              () => {
                document.querySelectorAll(".qr-image").forEach((box) => {
                  const img = box.querySelector("img");
                  if (!img || !img.naturalWidth) {
                    box.hidden = true;
                    box.nextElementSibling.hidden = false;
                  }
                });

                setTimeout(
                  () => {
                    window.print();
                  },
                  150
                );

              }
            );

          </script>

        </body>

      </html>
    `);


    printWindow.document.close();

  }


  // =========================================================
  // PNG V2 WITH QR
  // =========================================================

  async function handleDownloadPng() {

    if (
      !invoice
      ||
      !room
    ) {
      return;
    }


    try {

      setProcessing(true);
      setError("");

      const showPaymentInformation = invoice.status === "ISSUED"
        && invoice.payment_status !== "PAID"
        && remainingAmount > 0;


      const electricityItem =
        invoice.items.find(
          (item) =>
            item.item_type
            === "ELECTRICITY"
        );


      const oldReading =
        invoice.checkout_settlement?.electricity_old_reading ?? invoice.electricity_transition_old_reading ?? meterReading
          ?.old_reading
          ?? "-";


      const newReading =
        invoice.checkout_settlement?.electricity_new_reading ?? invoice.electricity_transition_new_reading ?? meterReading
          ?.new_reading
          ?? "-";


      const consumption =
        invoice.checkout_settlement?.electricity_consumption ?? (invoice.electricity_transition_new_reading != null && invoice.electricity_transition_old_reading != null
          ? invoice.electricity_transition_new_reading - invoice.electricity_transition_old_reading
          : null) ?? meterReading
          ?.consumption
          ??
          electricityItem
            ?.quantity
          ??
          "-";


      const canvas =
        document.createElement(
          "canvas"
        );


      const width =
        1200;


      const measureContext = canvas.getContext("2d");
      if (!measureContext) return;
      const wrapText = (text: string, maxWidth: number, font: string) => {
        measureContext.font = font;
        const lines: string[] = [];
        for (const paragraph of text.split("\n")) {
          let line = "";
          for (const word of paragraph.split(/\s+/)) {
            const candidate = line ? line + " " + word : word;
            if (measureContext.measureText(candidate).width <= maxWidth) {
              line = candidate;
              continue;
            }
            if (line) lines.push(line);
            line = "";
            for (const character of word) {
              if (line && measureContext.measureText(line + character).width > maxWidth) {
                lines.push(line);
                line = "";
              }
              line += character;
            }
          }
          lines.push(line);
        }
        return lines;
      };
      const itemLayouts = invoice.items.map((item) => {
        let detail =
          item.description
          ||
          "-";


        if (
          item.item_type
          === "ELECTRICITY"
          && !invoice.checkout_settlement
        ) {

          detail =
            invoice.electricity_transition_new_reading != null
                ? `Điện chuyển tiếp: ${oldReading} → ${newReading} (${consumption} kWh)`
                : `${consumption} kWh`;


          if (
            item.unit_price
            !== null
            &&
            item.unit_price
            !== undefined
          ) {

            detail +=
              ` × ${formatNumber(
                item.unit_price
              )} đ`;

          }

        }

        const lines = wrapText(detail, 390, "400 22px Arial");
        const names = wrapText(getItemTypeText(item.item_type), 280, "700 26px Arial");
        return { lines, names, height: Math.max(84, Math.max(lines.length, names.length) * 30 + 28) };
      });
      const noteLines = wrapText(printNote.trim(), 1024, "400 22px Arial");

      const paymentHeight =
        showPaymentInformation
          ? 390
          : 150;


      const noteHeight = printNote.trim() ? noteLines.length * 30 + 75 : 40;


      const height = 1150 + itemLayouts.reduce((sum, item) => sum + item.height, 0)
        +
        paymentHeight
        +
        noteHeight;


      canvas.width =
        width;


      canvas.height =
        height;


      const ctx =
        canvas.getContext(
          "2d"
        );


      if (!ctx) {

        window.alert(
          "Không thể tạo ảnh hóa đơn."
        );

        return;
      }


      ctx.fillStyle =
        "#ffffff";


      ctx.fillRect(
        0,
        0,
        width,
        height
      );


      ctx.fillStyle =
        "#172033";


      ctx.strokeStyle =
        "#d0d5dd";


      ctx.lineWidth =
        2;


      const left =
        70;


      const right =
        width - 70;


      const contentWidth =
        right - left;


      const drawText =
        (
          text: string,
          x: number,
          y: number,
          options?: {
            size?: number;
            bold?: boolean;
            weight?: 600;
            align?:
              | "left"
              | "center"
              | "right";
            color?: string;
            maxWidth?: number;
          }
        ) => {

          const size =
            options?.size
            ?? 26;


          const weight =
            options?.weight ?? (options?.bold ? "700" : "400");


          ctx.font =
            `${weight} ${size}px Arial, Helvetica, sans-serif`;


          ctx.fillStyle =
            options?.color
            ?? "#172033";


          ctx.textAlign =
            options?.align
            ?? "left";


          ctx.textBaseline =
            "middle";


          ctx.fillText(
            text,
            x,
            y,
            options?.maxWidth ?? (options?.align === "center" ? contentWidth : options?.align === "right" ? x - left : right - x)
          );

        };


      const drawLine =
        (
          y: number
        ) => {

          ctx.beginPath();

          ctx.moveTo(
            left,
            y
          );

          ctx.lineTo(
            right,
            y
          );

          ctx.stroke();

        };


      let y =
        55;


      // =====================================================
      // LOGO
      // =====================================================

      try {

        const logo =
          await loadImage(
            `${window.location.origin}/Rosehome.png`
          );


        ctx.drawImage(
          logo,
          left,
          y,
          120,
          120
        );

      } catch {
        // Không có logo vẫn tạo hóa đơn
      }


      drawText(
        "ROSEHOME APARTMENT",
        left + 135,
        y + 38,
        {
          size: 34,
          bold: true,
        }
      );


      drawText(
        "Apartment Management",
        left + 135,
        y + 78,
        {
          size: 20,
          color: "#667085",
        }
      );


      drawText(
        "HÓA ĐƠN TIỀN PHÒNG",
        left + 135,
        y + 120,
        {
          size: 44,
          bold: true,
        }
      );


      drawText(
        `Hóa đơn #${invoice.id} • v${invoice.version}`,
        right,
        y + 165,
        {
          size: 22,
          align: "right",
          color: "#667085",
        }
      );


      y +=
        195;


      drawLine(
        y
      );


      y +=
        35;


      // =====================================================
      // BASIC INFO
      // =====================================================

      const infoWidth =
        contentWidth / 3;


      const infoData =
        [
          [
            "PHÒNG",
            room.room_code,
          ],

          [
            "KỲ HÓA ĐƠN",
            `Tháng ${invoice.month}/${invoice.year}`,
          ],

          [
            "THANH TOÁN",
            invoicePresentation.label,
          ],
        ];


      infoData.forEach(
        (
          item,
          index
        ) => {

          const boxX =
            left
            +
            index
            *
            infoWidth;


          ctx.fillStyle = index !== 2 ? "#f7f8fa"
            : invoicePresentation.tone === "paid" ? "#f0fdf4"
            : invoicePresentation.tone === "unpaid" ? "#fff1f2"
            : invoicePresentation.tone === "partial" ? "#fffbeb" : "#f1f5f9";


          ctx.fillRect(
            boxX + 5,
            y,
            infoWidth - 10,
            105
          );


          ctx.strokeRect(
            boxX + 5,
            y,
            infoWidth - 10,
            105
          );


          drawText(
            item[0],
            boxX + 22,
            y + 30,
            {
              size: 19,
              color: "#000000",
              weight: 600,
            }
          );


          drawText(
            item[1],
            boxX + 22,
            y + 70,
            {
              size: 32,
              bold: true,
              maxWidth: infoWidth - 44,
            }
          );

        }
      );


      y +=
        140;


      // =====================================================
      // METER INFO
      // =====================================================

      const meterValues =
        [
          [
            "Số điện cũ",
            String(
              oldReading
            ),
          ],

          [
            "Số điện mới",
            String(
              newReading
            ),
          ],

          [
            "Tiêu thụ",
            `${consumption} kWh`,
          ],

          [
            "Đơn giá điện",
            electricityItem
              ?.unit_price
              !== null
              &&
              electricityItem
                ?.unit_price
              !== undefined

                ? `${formatNumber(
                    electricityItem.unit_price
                  )} đ`

                : "-",
          ],
        ];


      const meterWidth =
        contentWidth
        /
        4;


      meterValues.forEach(
        (
          item,
          index
        ) => {

          const boxX =
            left
            +
            index
            *
            meterWidth;


          ctx.strokeRect(
            boxX,
            y,
            meterWidth,
            90
          );


          drawText(
            item[0],
            boxX
            +
            meterWidth
            /
            2,
            y + 27,
            {
              size: 19,
              align: "center",
              color: "#000000",
              weight: 600,
            }
          );


          drawText(
            item[1],
            boxX
            +
            meterWidth
            /
            2,
            y + 62,
            {
              size: index === 2 ? 38 : 34,
              bold: true,
              align: "center",
              maxWidth: meterWidth - 24,
            }
          );

        }
      );


      y +=
        125;


      // =====================================================
      // ITEMS TABLE HEADER
      // =====================================================

      const col1 =
        left;


      const col2 =
        left + 320;


      ctx.fillStyle =
        "#f2f4f7";


      ctx.fillRect(
        left,
        y,
        contentWidth,
        60
      );


      ctx.strokeRect(
        left,
        y,
        contentWidth,
        60
      );


      drawText(
        "KHOẢN",
        col1 + 16,
        y + 30,
        {
          size: 19,
          bold: true,
        }
      );


      drawText(
        "CHI TIẾT",
        col2 + 16,
        y + 30,
        {
          size: 19,
          bold: true,
        }
      );


      drawText(
        "THÀNH TIỀN",
        right - 16,
        y + 30,
        {
          size: 19,
          bold: true,
          align: "right",
        }
      );


      y +=
        60;


      // =====================================================
      // ITEMS
      // =====================================================

      invoice.items.forEach(
        (item, index) => {
          const rowHeight = itemLayouts[index].height;

          ctx.strokeRect(
            left,
            y,
            contentWidth,
            rowHeight
          );


          itemLayouts[index].names.forEach((line, lineIndex) => {
            drawText(line, col1 + 16, y + 28 + lineIndex * 30, { size: 26, bold: true, maxWidth: 280 });
          });

          itemLayouts[index].lines.forEach((line, lineIndex) => {
            drawText(line, col2 + 16, y + 28 + lineIndex * 30, { size: 22, color: "#475467", maxWidth: 390 });
          });

          drawText(
            formatMoney(
              item.amount
            ),
            right - 16,
            y + rowHeight / 2,
            {
              size: 26,
              bold: true,
              align: "right",
              maxWidth: 290,
            }
          );


          y +=
            rowHeight;

        }
      );


      y +=
        35;


      // =====================================================
      // TOTALS
      // =====================================================

      const totalLeft =
        left;


      drawText(
        "Tổng hóa đơn",
        totalLeft,
        y,
        {
          size: 21,
        }
      );


      drawText(
        formatMoney(
          invoice.total_amount
        ),
        right,
        y,
        {
          size: 23,
          bold: true,
          align: "right",
        }
      );


      y +=
        45;


      drawText(
        "Đã thanh toán",
        totalLeft,
        y,
        {
          size: 21,
        }
      );


      drawText(
        formatMoney(
          totalPaid
        ),
        right,
        y,
        {
          size: 23,
          bold: true,
          align: "right",
        }
      );


      y +=
        48;


      ctx.strokeStyle =
        "#d99b24";


      ctx.lineWidth =
        4;


      ctx.beginPath();

      ctx.moveTo(
        totalLeft,
        y - 12
      );

      ctx.lineTo(
        right,
        y - 12
      );

      ctx.stroke();


      ctx.strokeStyle =
        "#d0d5dd";


      ctx.lineWidth =
        2;


      ctx.fillStyle = invoicePresentation.paid ? "#f0fdf4" : "#fff7f7";
      ctx.fillRect(left, y - 5, contentWidth, 112);
      drawText(
        invoicePresentation.paid ? "ĐÃ THANH TOÁN ĐỦ" : "CÒN PHẢI TRẢ",
        totalLeft + 20,
        y + 20,
        {
          size: 25,
          bold: true,
        }
      );


      drawText(
        formatMoney(
          remainingAmount
        ),
        right - 20,
        y + 70,
        {
          size: 54,
          bold: true,
          align: "right",
          color:
            invoicePresentation.paid
              ? "#179c64"
              : remainingAmount > 0 ? "#c62828" : "#667085",
        }
      );


      y +=
        142;


      // =====================================================
      // PAYMENT + QR
      // =====================================================

      if (showPaymentInformation) {

        const boxHeight =
          350;


        ctx.strokeRect(
          left,
          y,
          contentWidth,
          boxHeight
        );


        drawText(
          "THÔNG TIN THANH TOÁN",
          left + 25,
          y + 40,
          {
            size: 25,
            bold: true,
          }
        );


        drawText(
          "Số tiền cần thanh toán",
          left + 25,
          y + 85,
          {
            size: 20,
            color: "#000000",
            weight: 600,
          }
        );


        drawText(
          formatMoney(
            remainingAmount
          ),
          left + 25,
          y + 125,
          {
            size: 36,
            bold: true,
            color: "#c62828",
            maxWidth: 650,
          }
        );


        const rowsBank =
          [
            [
              "Ngân hàng:",
              getBankName() || "Chưa cấu hình",
            ],

            [
              "Số tài khoản:",
              VIETQR_ACCOUNT_NO || "Chưa cấu hình",
            ],

            [
              "Chủ tài khoản:",
              VIETQR_ACCOUNT_NAME || "Chưa cấu hình",
            ],

            [
              "Nội dung CK:",
              transferContent || "Chưa có mã RH",
            ],
          ];


        let bankY =
          y + 180;


        rowsBank.forEach(
          (
            row, index
          ) => {
            if (index === 3) {
              ctx.fillStyle = "#f8fafc";
              ctx.fillRect(left + 15, bankY - 20, 680, 38);
            }

            drawText(
              row[0],
              left + 25,
              bankY,
              {
                size: 20,
                color: "#000000",
                weight: 600,
              }
            );


            drawText(
              row[1],
              left + 190,
              bankY,
              {
                size: 22,
                bold: true,
                maxWidth: 495,
              }
            );


            bankY +=
              39;

          }
        );


        try {

          if (!qrOnlyUrl) {
            throw new Error("QR URL unavailable");
          }

          const qr =
            await loadImage(
              qrOnlyUrl
            );


          ctx.drawImage(
            qr,
            right - 310,
            y + 28,
            285,
            285
          );


          drawText(
            "Quét QR để thanh toán",
            right - 167,
            y + 325,
            {
              size: 16,
              bold: true,
              align: "center",
            }
          );

        } catch {
          const qrMessage = "Không thể hiển thị mã QR";
          setError(qrMessage + ". Vui lòng chuyển khoản theo thông tin bên trái.");

          drawText(
            qrMessage,
            right - 165,
            y + 150,
            {
              size: 20,
              align: "center",
              color: "#c62828",
              maxWidth: 285,
            }
          );
          drawText("Vui lòng chuyển khoản", right - 165, y + 183, {
            size: 17, align: "center", color: "#667085", maxWidth: 285,
          });
          drawText("theo thông tin bên trái.", right - 165, y + 207, {
            size: 17, align: "center", color: "#667085", maxWidth: 285,
          });

        }


        y +=
          boxHeight
          +
          30;

      } else {

        ctx.strokeStyle =
          invoicePresentation.paid ? "#179c64" : "#667085";


        ctx.lineWidth =
          3;


        ctx.strokeRect(
          left,
          y,
          contentWidth,
          95
        );


        drawText(
          invoicePresentation.paid ? "HÓA ĐƠN ĐÃ THANH TOÁN ĐỦ" : invoicePresentation.label,
          width / 2,
          y + 48,
          {
            size: 27,
            bold: true,
            align: "center",
            color: invoicePresentation.paid ? "#179c64" : "#667085",
          }
        );


        ctx.strokeStyle =
          "#d0d5dd";


        ctx.lineWidth =
          2;


        y +=
          125;

      }


      // =====================================================
      // NOTE
      // =====================================================

      if (
        printNote.trim()
      ) {

        ctx.fillStyle =
          "#f8fafc";


        ctx.fillRect(
          left,
          y,
          contentWidth,
          noteHeight - 30
        );


        ctx.strokeRect(
          left,
          y,
          contentWidth,
          noteHeight - 30
        );


        drawText(
          "Ghi chú",
          left + 18,
          y + 27,
          {
            size: 19,
            bold: true,
          }
        );


        noteLines.forEach((line, index) => {
          drawText(line, left + 18, y + 60 + index * 30, {
            size: 22, color: "#475467", maxWidth: 1024,
          });
        });
        y += noteHeight;

      }


      // =====================================================
      // FOOTER
      // =====================================================

      drawLine(
        y
      );


      y +=
        30;


      drawText(
        `Rosehome Apartment • Hóa đơn #${invoice.id} • ${invoice.month}/${invoice.year}`,
        width / 2,
        y,
        {
          size: 17,
          align: "center",
          color: "#667085",
        }
      );


      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = width;
      outputCanvas.height = Math.ceil(y + 45);
      outputCanvas.getContext("2d")?.drawImage(canvas, 0, 0);

      const safeRoomCode =
        room.room_code.replace(
          /[^a-zA-Z0-9_-]/g,
          "_"
        );


      const monthText =
        String(
          invoice.month
        ).padStart(
          2,
          "0"
        );


      let imageData:
        string;


      try {

        imageData =
          outputCanvas.toDataURL(
            "image/png",
            1
          );

      } catch {

        window.alert(
          "Trình duyệt không cho xuất ảnh QR. Hãy thử lại sau hoặc dùng In / Lưu PDF."
        );

        return;
      }


      const link =
        document.createElement(
          "a"
        );


      link.download =
        `Hoa_don_${safeRoomCode}_${monthText}_${invoice.year}.png`;


      link.href =
        imageData;


      document.body.appendChild(
        link
      );


      link.click();


      link.remove();

    } catch (
      err
    ) {

      console.error(
        err
      );


      window.alert(
        "Không thể tạo ảnh hóa đơn."
      );

    } finally {

      setProcessing(false);

    }

  }


  // =========================================================
  // UPDATE ITEM
  // =========================================================

  function handleInvoiceUpdated(
    updatedInvoice: Invoice
  ) {

    setInvoice(
      updatedInvoice
    );


    setSuccess(
      "Đã cập nhật hóa đơn."
    );

  }


  // =========================================================
  // OPEN EDIT ITEM
  // =========================================================

  function handleOpenEditItem(
    item: Invoice["items"][number]
  ) {

    setEditingInvoiceItem(
      item
    );


    setEditItemDescription(
      item.description
      ?? ""
    );


    setEditItemQuantity(
      item.quantity
      !== null
      &&
      item.quantity
      !== undefined

        ? String(
            item.quantity
          )

        : ""
    );


    setEditItemUnit(
      item.unit
      ?? ""
    );


    setEditItemUnitPrice(
      item.unit_price
      !== null
      &&
      item.unit_price
      !== undefined

        ? String(
            item.unit_price
          )

        : ""
    );


    setEditItemAmount(
      String(
        item.item_type
        === "DISCOUNT"

          ? Math.abs(
              item.amount
            )

          : item.amount
      )
    );


    setError("");
    setSuccess("");

  }


  // =========================================================
  // CLOSE EDIT ITEM
  // =========================================================

  function handleCloseEditItem() {

    if (
      processing
    ) {
      return;
    }


    setEditingInvoiceItem(
      null
    );


    setEditItemDescription("");
    setEditItemQuantity("");
    setEditItemUnit("");
    setEditItemUnitPrice("");
    setEditItemAmount("");

  }


  // =========================================================
  // SAVE EDIT ITEM
  // =========================================================

  async function handleSaveInvoiceItem() {

    if (
      !invoice
      ||
      !editingInvoiceItem
    ) {
      return;
    }


    if (
      invoice.status
      !== "DRAFT"
    ) {

      setError(
        "Chỉ hóa đơn nháp mới được sửa."
      );

      return;
    }


    const description =
      editItemDescription.trim();


    if (
      !description
      ||
      description.length > 150
    ) {

      setError(
        "Mô tả khoản phải từ 1 đến 150 ký tự."
      );

      return;
    }


    const parsedAmount =
      Number(
        editItemAmount
      );


    if (
      !Number.isInteger(
        parsedAmount
      )
      ||
      parsedAmount < 0
    ) {

      setError(
        "Thành tiền phải là số nguyên không âm."
      );

      return;
    }


    const payload:
      InvoiceItemUpdatePayload = {

        description,

        amount:
          editingInvoiceItem.item_type
          === "DISCOUNT"

            ? -parsedAmount

            : parsedAmount,

      };


    if (
      editItemQuantity.trim()
    ) {

      const quantity =
        Number(
          editItemQuantity
        );


      if (
        !Number.isInteger(
          quantity
        )
        ||
        quantity < 0
      ) {

        setError(
          "Số lượng phải là số nguyên không âm."
        );

        return;
      }


      payload.quantity =
        quantity;

    } else {

      payload.quantity =
        null;

    }


    const unit =
      editItemUnit.trim();


    if (
      unit.length > 20
    ) {

      setError(
        "Đơn vị tối đa 20 ký tự."
      );

      return;
    }


    payload.unit =
      unit
        ? unit
        : null;


    if (
      editItemUnitPrice.trim()
    ) {

      const unitPrice =
        Number(
          editItemUnitPrice
        );


      if (
        !Number.isInteger(
          unitPrice
        )
        ||
        unitPrice < 0
      ) {

        setError(
          "Đơn giá phải là số nguyên không âm."
        );

        return;
      }


      payload.unit_price =
        unitPrice;

    } else {

      payload.unit_price =
        null;

    }


    try {

      setProcessing(
        true
      );

      setError("");
      setSuccess("");


      const updatedInvoice =
        await apiPatch<
          Invoice,
          InvoiceItemUpdatePayload
        >(
          `/invoices/${invoice.id}/items/${editingInvoiceItem.id}`,
          payload
        );


      setInvoice(
        updatedInvoice
      );


      setEditingInvoiceItem(
        null
      );


      setEditItemDescription("");
      setEditItemQuantity("");
      setEditItemUnit("");
      setEditItemUnitPrice("");
      setEditItemAmount("");


      setSuccess(
        "Đã cập nhật khoản trong hóa đơn."
      );


    } catch (
      err
    ) {

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
          "Không thể cập nhật khoản."
        );

      }


    } finally {

      setProcessing(
        false
      );

    }

  }


  // =========================================================
  // DELETE DRAFT INVOICE
  // =========================================================

  async function handleDeleteDraftInvoice() {

    if (!invoice) {
      return;
    }


    if (
      invoice.status
      !== "DRAFT"
    ) {

      setError(
        "Chỉ hóa đơn nháp mới được xóa."
      );

      return;
    }


    const confirmed =
      window.confirm(
        `Xóa hoàn toàn hóa đơn nháp #${invoice.id}?\n\n`
        +
        `Phòng ${room?.room_code ?? invoice.room_id} • `
        +
        `${invoice.month}/${invoice.year}\n\n`
        +
        "Hành động này không thể hoàn tác. "
        +
        "Sau khi xóa, bạn có thể tạo lại hóa đơn cho cùng phòng và tháng."
      );


    if (!confirmed) {
      return;
    }


    try {

      setProcessing(
        true
      );

      setError("");
      setSuccess("");


      await apiDelete<void>(
        `/invoices/${invoice.id}`
      );


      navigate(
        "/invoices",
        {
          replace: true,
        }
      );


    } catch (
      err
    ) {

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
          "Không thể xóa hóa đơn nháp."
        );

      }


    } finally {

      setProcessing(
        false
      );

    }

  }



  // =========================================================
  // CANCEL / REPLACEMENT INVOICE
  // =========================================================

  async function handleCancelInvoice() {

    if (!invoice) {
      return;
    }


    if (
      invoice.status
      !== "ISSUED"
    ) {

      setError(
        "Chỉ hóa đơn đã phát hành mới được hủy."
      );

      return;
    }


    if (
      invoice.payment_status
      !== "UNPAID"
    ) {

      setError(
        "Hóa đơn đã có thanh toán nên không thể hủy trực tiếp."
      );

      return;
    }


    const input =
      window.prompt(
        "Nhập lý do hủy hóa đơn:",
        ""
      );


    if (input === null) {
      return;
    }


    const reason =
      input.trim();


    if (reason.length < 3) {

      setError(
        "Lý do hủy phải có ít nhất 3 ký tự."
      );

      return;
    }


    if (reason.length > 500) {

      setError(
        "Lý do hủy không được vượt quá 500 ký tự."
      );

      return;
    }


    const confirmed =
      window.confirm(
        `Hủy hóa đơn #${invoice.id}?\n\n`
        +
        "Hóa đơn cũ sẽ được giữ lại trong lịch sử ở trạng thái Đã hủy. "
        +
        "Sau đó bạn có thể tạo hóa đơn thay thế."
      );


    if (!confirmed) {
      return;
    }


    try {

      setProcessing(true);

      setError("");

      setSuccess("");


      const cancelledInvoice =
        await apiPost<
          Invoice,
          {
            reason: string;
          }
        >(
          `/invoices/${invoice.id}/cancel`,
          {
            reason,
          }
        );


      setInvoice(
        cancelledInvoice
      );


      setSuccess(
        `Đã hủy hóa đơn #${invoice.id}. Bạn có thể tạo hóa đơn thay thế.`
      );

    } catch (
      err
    ) {

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
          "Không thể hủy hóa đơn."
        );
      }

    } finally {

      setProcessing(
        false
      );
    }
  }


  async function handleCreateReplacementInvoice() {

    if (!invoice) {
      return;
    }


    if (
      invoice.status
      !== "CANCELLED"
    ) {

      setError(
        "Chỉ hóa đơn đã hủy mới được tạo hóa đơn thay thế."
      );

      return;
    }


    const confirmed =
      window.confirm(
        `Tạo hóa đơn thay thế cho hóa đơn #${invoice.id}?\n\n`
        +
        `Hệ thống sẽ tạo phiên bản v${invoice.version + 1} ở trạng thái nháp. `
        +
        "Bạn có thể sửa các khoản trước khi phát hành lại."
      );


    if (!confirmed) {
      return;
    }


    try {

      setProcessing(
        true
      );

      setError("");

      setSuccess("");


      const replacement =
        await apiPostNoBody<Invoice>(
          `/invoices/${invoice.id}/replacement`
        );


      navigate(
        `/invoices/${replacement.id}`
      );

    } catch (
      err
    ) {

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
          "Không thể tạo hóa đơn thay thế."
        );
      }

    } finally {

      setProcessing(
        false
      );
    }
  }


  // =========================================================
  // DELETE ITEM
  // =========================================================

  async function handleDeleteItem(
    itemId: number
  ) {

    if (!invoice) {
      return;
    }


    const confirmed =
      window.confirm(
        "Bạn có chắc muốn xóa khoản này khỏi hóa đơn?"
      );


    if (!confirmed) {
      return;
    }


    try {

      setProcessing(true);

      setError("");
      setSuccess("");


      const updatedInvoice =
        await apiDelete<Invoice>(
          `/invoices/${invoice.id}/items/${itemId}`
        );


      setInvoice(
        updatedInvoice
      );


      setSuccess(
        "Đã xóa khoản khỏi hóa đơn."
      );

    } catch (
      err
    ) {

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
          "Không thể xóa khoản."
        );

      }

    } finally {

      setProcessing(false);

    }

  }


  // =========================================================
  // ISSUE
  // =========================================================

  async function handleIssue() {

    if (!invoice) {
      return;
    }


    const confirmed =
      window.confirm(
        "Phát hành hóa đơn này? Sau khi phát hành sẽ không thể sửa trực tiếp."
      );


    if (!confirmed) {
      return;
    }


    try {

      setProcessing(true);

      setError("");
      setSuccess("");


      const issuedInvoice =
        await apiPostNoBody<Invoice>(
          `/invoices/${invoice.id}/issue`
        );


      setInvoice(
        issuedInvoice
      );


      setSuccess(
        "Đã phát hành hóa đơn thành công."
      );

    } catch (
      err
    ) {

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
          "Không thể phát hành hóa đơn."
        );

      }

    } finally {

      setProcessing(false);

    }

  }


  // =========================================================
  // UPDATE PAYMENT IN LOCAL STATE
  // =========================================================

  function updatePaymentState(
    updatedPayment: Payment
  ) {

    setPayments(
      (
        currentPayments
      ) =>

        currentPayments.map(
          (
            currentPayment
          ) =>

            currentPayment.id
            === updatedPayment.id

              ? updatedPayment

              : currentPayment

        )
    );

  }


  // =========================================================
  // OPEN RECEIPT FILE PICKER
  // =========================================================

  function openReceiptPicker(
    paymentId: number,
    mode: ReceiptMode,
  ) {

    const inputId =
      mode === "ADD"

        ? `receipt-add-${paymentId}`

        : `receipt-replace-${paymentId}`;


    const input =
      document.getElementById(
        inputId
      ) as HTMLInputElement | null;


    input?.click();

  }


  // =========================================================
  // ADD / REPLACE PAYMENT RECEIPT
  // =========================================================

  async function handleReceiptSelected(
    payment: Payment,
    mode: ReceiptMode,
    event: ChangeEvent<HTMLInputElement>,
  ) {

    if (!invoice) {
      return;
    }


    const file =
      event.target.files?.[0];


    // Cho phép chọn lại đúng file đó ở lần sau.
    event.target.value = "";


    if (!file) {
      return;
    }


    setError("");
    setSuccess("");


    // Frontend kiểm tra nhanh để báo lỗi sớm.
    // Backend vẫn là nơi kiểm tra bảo mật chính.
    if (
      !ALLOWED_RECEIPT_TYPES.includes(
        file.type
      )
    ) {

      setError(
        "Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP."
      );

      return;
    }


    if (
      file.size
      > MAX_RECEIPT_SIZE
    ) {

      setError(
        "Ảnh chứng từ phải có dung lượng tối đa 5 MB."
      );

      return;
    }


    const formData =
      new FormData();


    formData.append(
      "file",
      file
    );


    const path =
      mode === "REPLACE"

        ? (
          `/invoices/${invoice.id}`
          +
          `/payments/${payment.id}`
          +
          `/receipt/replace`
        )

        : (
          `/invoices/${invoice.id}`
          +
          `/payments/${payment.id}`
          +
          `/receipt`
        );


    try {

      setReceiptProcessingId(
        payment.id
      );


      const updatedPayment =
        await apiPostFormData<Payment>(
          path,
          formData
        );


      updatePaymentState(
        updatedPayment
      );


      setSuccess(
        mode === "REPLACE"

          ? `Đã thay chứng từ của thanh toán #${payment.id}.`

          : `Đã thêm chứng từ cho thanh toán #${payment.id}.`
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
          mode === "REPLACE"

            ? "Không thể thay chứng từ."

            : "Không thể tải chứng từ."
        );

      }


    } finally {

      setReceiptProcessingId(
        null
      );

    }

  }


  // =========================================================
// VIEW PAYMENT RECEIPT
// =========================================================

async function handleViewReceipt(
  payment: Payment
) {

  if (
    !invoice
    ||
    !payment.receipt_file_key
  ) {
    return;
  }


  // Mở tab trước để tránh trình duyệt
  // chặn popup sau khi await API.
  const receiptWindow =
    window.open(
      "",
      "_blank"
    );


  if (!receiptWindow) {

    window.alert(
      "Trình duyệt đang chặn cửa sổ xem chứng từ."
    );

    return;
  }


  receiptWindow.document.write(
    `
      <html>
        <body
          style="
            font-family: Arial, sans-serif;
            padding: 24px;
          "
        >
          Đang tải chứng từ...
        </body>
      </html>
    `
  );


  try {

    setError("");
    setSuccess("");


    const result =
      await apiGet<
        ReceiptUrlResponse
      >(
        `/invoices/${invoice.id}/payments/${payment.id}/receipt`
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

  }

}


// =========================================================
// DELETE PAYMENT RECEIPT
// =========================================================

async function handleDeleteReceipt(
  payment: Payment
) {

  if (
    !invoice
    ||
    !payment.receipt_file_key
  ) {
    return;
  }


  const confirmed =
    window.confirm(
      "Bạn có chắc muốn xóa ảnh chứng từ này?\n\n"
      +
      "Khoản thanh toán vẫn được giữ nguyên, "
      +
      "chỉ ảnh chứng từ bị xóa."
    );


  if (!confirmed) {
    return;
  }


  try {

    setReceiptProcessingId(
      payment.id
    );

    setError("");
    setSuccess("");


    const updatedPayment =
      await apiDelete<Payment>(
        `/invoices/${invoice.id}/payments/${payment.id}/receipt`
      );


    updatePaymentState(
      updatedPayment
    );


    setSuccess(
      `Đã xóa chứng từ của thanh toán #${payment.id}.`
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
        "Không thể xóa chứng từ."
      );

    }

  } finally {

    setReceiptProcessingId(
      null
    );

  }

}


  // =========================================================
  // VOID PAYMENT
  // =========================================================

  async function handleVoidPayment(
    payment: Payment
  ) {

    if (!invoice) {
      return;
    }


    if (
      payment.payment_method
      === "DEPOSIT"
    ) {

      setError(
        "Kho\u1ea3n thanh to\u00e1n t\u1eeb ti\u1ec1n c\u1ecdc do h\u1ec7 th\u1ed1ng t\u1ea1o, kh\u00f4ng th\u1ec3 h\u1ee7y th\u1ee7 c\u00f4ng."
      );

      return;
    }


    if (
      payment.receipt_file_key
    ) {

      setError(
        "Thanh to\u00e1n n\u00e0y \u0111ang c\u00f3 ch\u1ee9ng t\u1eeb. H\u00e3y x\u00f3a ch\u1ee9ng t\u1eeb tr\u01b0\u1edbc r\u1ed3i m\u1edbi h\u1ee7y ghi nh\u1eadn."
      );

      return;
    }


    const reasonInput =
      window.prompt(
        `L\u00fd do h\u1ee7y ghi nh\u1eadn thanh to\u00e1n #${payment.id}:`,
        "Ghi nh\u1eadn nh\u1ea7m khi x\u1eed l\u00fd kh\u00e1ch tr\u1ea3 ph\u00f2ng"
      );


    if (reasonInput === null) {
      return;
    }


    const reason =
      reasonInput.trim();


    if (
      reason.length < 3
    ) {

      setError(
        "Vui l\u00f2ng nh\u1eadp l\u00fd do h\u1ee7y ghi nh\u1eadn."
      );

      return;
    }


    const confirmed =
      window.confirm(
        `H\u1ee7y ghi nh\u1eadn thanh to\u00e1n #${payment.id} (${formatMoney(payment.amount)})?\n\n`
        +
        `L\u00fd do: ${reason}\n\n`
        +
        "S\u1ed1 ti\u1ec1n n\u00e0y s\u1ebd kh\u00f4ng c\u00f2n \u0111\u01b0\u1ee3c t\u00ednh l\u00e0 \u0111\u00e3 thu. "
        +
        "L\u1ecbch s\u1eed thao t\u00e1c v\u1eabn \u0111\u01b0\u1ee3c l\u01b0u trong Audit Log."
      );


    if (!confirmed) {
      return;
    }


    try {

      setVoidingPaymentId(
        payment.id
      );

      setError("");
      setSuccess("");


      const payload:
        PaymentVoidPayload = {
          reason,
        };


      const result =
        await apiPost<
          PaymentVoidResponse,
          PaymentVoidPayload
        >(
          `/invoices/${invoice.id}/payments/${payment.id}/void`,
          payload
        );


      setPayments(
        currentPayments =>
          currentPayments.filter(
            currentPayment =>
              currentPayment.id
              !== payment.id
          )
      );


      setInvoice(
        currentInvoice => {

          if (!currentInvoice) {
            return currentInvoice;
          }

          return {
            ...currentInvoice,

            payment_status:
              result.payment_status,
          };
        }
      );


      setSuccess(
        `\u0110\u00e3 h\u1ee7y ghi nh\u1eadn thanh to\u00e1n #${payment.id}.`
      );

    } catch (
      err
    ) {

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
          "Kh\u00f4ng th\u1ec3 h\u1ee7y ghi nh\u1eadn thanh to\u00e1n."
        );
      }

    } finally {

      setVoidingPaymentId(
        null
      );
    }
  }


  // =========================================================
  // OPEN EDIT PAYMENT INFO
  // =========================================================

  function handleOpenEditPayment(
    payment: Payment
  ) {

    setEditingPayment(
      payment
    );


    setEditTransactionReference(
      payment.transaction_reference
      ?? ""
    );


    setEditPaymentNote(
      payment.note
      ?? ""
    );


    setError("");
    setSuccess("");

  }


  // =========================================================
  // CLOSE EDIT PAYMENT INFO
  // =========================================================

  function handleCloseEditPayment() {

    if (
      editingPayment
      &&
      paymentInfoProcessingId
      === editingPayment.id
    ) {
      return;
    }


    setEditingPayment(
      null
    );


    setEditTransactionReference(
      ""
    );


    setEditPaymentNote(
      ""
    );

  }


  // =========================================================
  // SAVE PAYMENT INFO
  // =========================================================

  async function handleSavePaymentInfo() {

    if (
      !invoice
      ||
      !editingPayment
    ) {
      return;
    }


    const transactionReference =
      editTransactionReference
        .trim();


    const note =
      editPaymentNote
        .trim();


    if (
      transactionReference.length
      > 100
    ) {

      setError(
        "Mã giao dịch tối đa 100 ký tự."
      );

      return;
    }


    if (
      note.length
      > 500
    ) {

      setError(
        "Ghi chú tối đa 500 ký tự."
      );

      return;
    }


    const payload:
      PaymentUpdatePayload = {

        transaction_reference:
          transactionReference
            ? transactionReference
            : null,

        note:
          note
            ? note
            : null,

      };


    try {

      setPaymentInfoProcessingId(
        editingPayment.id
      );


      setError("");
      setSuccess("");


      const updatedPayment =
        await apiPatch<
          Payment,
          PaymentUpdatePayload
        >(
          `/invoices/${invoice.id}/payments/${editingPayment.id}`,
          payload
        );


      updatePaymentState(
        updatedPayment
      );


      const paymentId =
        editingPayment.id;


      setEditingPayment(
        null
      );


      setEditTransactionReference(
        ""
      );


      setEditPaymentNote(
        ""
      );


      setSuccess(
        `Đã cập nhật thông tin thanh toán #${paymentId}.`
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
          "Không thể cập nhật thông tin thanh toán."
        );

      }


    } finally {

      setPaymentInfoProcessingId(
        null
      );

    }

  }


  // =========================================================
  // PAYMENT CREATED
  // =========================================================

  async function handlePaymentCreated(
    _newPayment: Payment
  ) {

    setShowPaymentModal(
      false
    );


    setSuccess(
      "Đã ghi nhận thanh toán."
    );


    await loadData();

  }


  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {

    return (

      <div className="room-message">
        Đang tải chi tiết hóa đơn...
      </div>

    );

  }


  if (
    error
    &&
    (
      !invoice
      ||
      !room
    )
  ) {

    return (
      <>

        <Link
          to="/invoices"
          className="back-link"
        >
          ← Quay lại danh sách hóa đơn
        </Link>


        <div className="room-message error-text">
          {error}
        </div>

      </>
    );

  }


  if (
    !invoice
    ||
    !room
  ) {

    return (

      <div className="room-message">
        Không tìm thấy hóa đơn.
      </div>

    );

  }


  const isDraft =
    invoice.status
    === "DRAFT";


  const canEditDraft = isDraft && !invoice.checkout_settlement;

  const isIssued =
    invoice.status
    === "ISSUED";


  const isCancelled =
    invoice.status
    === "CANCELLED";


  const canPay =
    isIssued
    &&
    remainingAmount > 0;


  // =========================================================
  // UI
  // =========================================================

  return (

    <>

      {invoice.checkout_settlement && <section className="mb-4 rounded-xl border border-amber-200 p-4">
        <h2 className="mb-2 font-semibold">Quyết toán trả phòng · snapshot đã lưu</h2>
        <CheckoutSummary snapshot={invoice.checkout_settlement} />
        <p className="mt-2 text-sm">Review và phát hành thủ công. Snapshot được giữ nguyên; không sửa/xóa các khoản sau xác nhận.</p>
      </section>}

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

        {/* BACK + TITLE */}

        <div
          className="
            flex
            items-center
            justify-between
            gap-3
          "
        >

          <Link
            to="/invoices"
            className="
              inline-flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-[#ddd8ce]
              bg-white
              text-[#172033]
            "
            aria-label="Quay lại danh sách hóa đơn"
          >
            <ArrowLeft
              size={18}
            />
          </Link>


          <div
            className="
              min-w-0
              flex-1
            "
          >

            <div
              className="
                text-xs
                font-medium
                uppercase
                tracking-[0.14em]
                text-[#9a762f]
              "
            >
              Chi tiết hóa đơn
            </div>


            <h1
              className="
                mt-1
                truncate
                text-xl
                font-bold
                tracking-tight
                text-[#172033]
              "
            >
              {room.room_code}
              {" • "}
              {invoice.month}/{invoice.year}
            </h1>

          </div>


          <button
            type="button"
            onClick={
              loadData
            }
            disabled={
              loading
            }
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-[#ddd8ce]
              bg-white
              text-slate-600
              disabled:opacity-50
            "
            aria-label="Tải lại"
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


        {/* STATUS */}

        <div
          className="
            flex
            flex-wrap
            items-center
            gap-2
          "
        >

          <span
            className={
              isIssued
                ? "rounded-full bg-[#fcecef] px-2.5 py-1 text-[11px] font-semibold text-[#b92f49]"
                : isCancelled
                  ? "rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                  : "rounded-full bg-[#fff8e9] px-2.5 py-1 text-[11px] font-semibold text-[#8a6726]"
            }
          >
            {getStatusText(
              invoice.status
            )}
          </span>


          <span
            className={
              invoice.payment_status === "PAID"
                ? "rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
                : invoice.payment_status === "PARTIALLY_PAID"
                  ? "rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700"
                  : "rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600"
            }
          >
            {getPaymentText(
              invoice.payment_status
            )}
          </span>


          <span
            className="
              text-[11px]
              text-slate-400
            "
          >
            HĐ #{invoice.id}
            {" • "}
            v{invoice.version}
          </span>

        </div>


        {/* MESSAGES */}

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


        {isCancelled && (

          <div
            className="
              rounded-2xl
              border
              border-slate-200
              bg-slate-50
              px-4
              py-3
              text-sm
              text-slate-600
            "
          >
            Hóa đơn này đã bị hủy và không còn hiệu lực thanh toán.
          </div>

        )}


        {/* MONEY HERO */}
        <section className="rounded-3xl border border-[#e9e2d8] bg-white p-5 text-[#172033]">
          <div className="flex flex-wrap justify-between gap-2 text-sm text-slate-600">
            <span>Tổng hóa đơn</span>
            <strong className="whitespace-nowrap">{formatMoney(invoice.total_amount)}</strong>
          </div>
          <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm text-slate-600">
            <span>Đã thanh toán</span>
            <strong className="whitespace-nowrap">{formatMoney(totalPaid)}</strong>
          </div>
          <div className={invoicePresentation.paid
            ? "mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"
            : "mt-5 rounded-2xl border border-red-100 bg-red-50/60 p-4 text-red-800"}>
            <div className="text-lg font-bold">
              {invoicePresentation.paid ? "ĐÃ THANH TOÁN ĐỦ" : "CÒN PHẢI TRẢ"}
            </div>
            <div className="mt-2 overflow-x-auto whitespace-nowrap text-[32px] font-bold tracking-tight">
              {formatMoney(remainingAmount)}
            </div>
          </div>
        </section>


        {/* QUICK ACTIONS */}

        <div
          className="
            grid
            grid-cols-2
            gap-2
          "
        >

          <button
            type="button"
            onClick={
              handlePrintInvoice
            }
            className="
              inline-flex
              min-h-11
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

            <Printer
              size={16}
            />

            In / PDF

          </button>


          <button
            type="button"
            disabled={
              processing
            }
            onClick={
              handleDownloadPng
            }
            className="
              inline-flex
              min-h-11
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
              disabled:opacity-50
            "
          >

            {processing ? (
              <RefreshCw
                size={16}
                className="animate-spin"
              />
            ) : (
              <FileImage
                size={16}
              />
            )}

            Ảnh PNG

          </button>

        </div>


        {/* TRANSFER REFERENCE */}

        {!isDraft
          &&
          transferContent
          &&
          (

            <section>

              <div
                className="
                  mb-2
                  text-sm
                  font-bold
                  text-[#172033]
                "
              >
                Mã chuyển khoản
              </div>


              <div
                className="
                  rounded-2xl
                  border
                  border-[#ead9b7]
                  bg-[#fffaf0]
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
                        text-[11px]
                        text-[#8a6726]
                      "
                    >
                      Nội dung chuyển khoản
                    </div>


                    <div
                      className="
                        mt-1
                        break-all
                        font-mono
                        text-base
                        font-bold
                        text-[#172033]
                      "
                    >
                      {transferContent}
                    </div>

                  </div>


                  <button
                    type="button"
                    onClick={
                      handleCopyTransferContent
                    }
                    className="
                      flex
                      h-10
                      w-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-[#e5dccb]
                      bg-white
                      text-[#8a6726]
                    "
                    aria-label="Sao chép mã chuyển khoản"
                  >

                    <Copy
                      size={17}
                    />

                  </button>

                </div>

              </div>

            </section>

          )}


        {/* ITEMS */}

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
                  text-base
                  font-bold
                  text-[#172033]
                "
              >
                Các khoản
              </h2>


              <div
                className="
                  mt-0.5
                  text-xs
                  text-slate-500
                "
              >
                {invoice.items.length}
                {" "}
                khoản trong hóa đơn
              </div>

            </div>


            {canEditDraft && (

              <button
                type="button"
                onClick={
                  () =>
                    setShowAddItemModal(
                      true
                    )
                }
                className="
                  inline-flex
                  h-10
                  items-center
                  justify-center
                  gap-1.5
                  rounded-xl
                  bg-[#d6a64c]
                  px-3
                  text-xs
                  font-semibold
                  text-[#172033]
                "
              >

                <Plus
                  size={15}
                />

                Thêm

              </button>

            )}

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

            {invoice.items.map(
              (
                item
              ) => (

                <div
                  key={
                    item.id
                  }
                  className="
                    border-b
                    border-[#f0ece5]
                    p-4
                    last:border-0
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
                        {getItemTypeText(
                          item.item_type
                        )}
                      </div>


                      {item.description && (

                        <div
                          className="
                            mt-1
                            text-xs
                            leading-5
                            text-slate-500
                          "
                        >
                          {item.description}
                        </div>

                      )}


                      {(
                        item.quantity
                        !== null
                        &&
                        item.quantity
                        !== undefined
                      ) && (

                        <div
                          className="
                            mt-1
                            text-[11px]
                            text-slate-400
                          "
                        >
                          {item.quantity}
                          {" "}
                          {item.unit ?? ""}

                          {(
                            item.unit_price
                            !== null
                            &&
                            item.unit_price
                            !== undefined
                          )
                            ? ` × ${formatMoney(item.unit_price)}`
                            : ""}
                        </div>

                      )}

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
                          text-[#172033]
                        "
                      >
                        {formatMoney(
                          item.amount
                        )}
                      </div>


                      {canEditDraft && (

                        <div
                          className="
                            mt-2
                            flex
                            items-center
                            justify-end
                            gap-3
                          "
                        >

                          <button
                            type="button"
                            disabled={
                              processing
                            }
                            onClick={
                              () =>
                                handleOpenEditItem(
                                  item
                                )
                            }
                            className="
                              inline-flex
                              items-center
                              gap-1
                              text-xs
                              font-semibold
                              text-[#8a6726]
                              disabled:opacity-50
                            "
                          >

                            <Pencil
                              size={13}
                            />

                            Sửa

                          </button>


                          <button
                            type="button"
                            disabled={
                              processing
                            }
                            onClick={
                              () =>
                                handleDeleteItem(
                                  item.id
                                )
                            }
                            className="
                              inline-flex
                              items-center
                              gap-1
                              text-xs
                              font-semibold
                              text-red-600
                              disabled:opacity-50
                            "
                          >

                            <Trash2
                              size={13}
                            />

                            Xóa

                          </button>

                        </div>

                      )}

                    </div>

                  </div>

                </div>

              )
            )}


            <div
              className="
                flex
                items-center
                justify-between
                gap-4
                bg-[#fffaf0]
                px-4
                py-4
              "
            >

              <span
                className="
                  text-sm
                  font-semibold
                  text-[#8a6726]
                "
              >
                Tổng cộng
              </span>


              <strong
                className="
                  text-lg
                  text-[#172033]
                "
              >
                {formatMoney(
                  invoice.total_amount
                )}
              </strong>

            </div>

          </div>

        </section>


        {/* DRAFT ACTION */}

        {canEditDraft && (

          <div
            className="
              grid
              grid-cols-1
              gap-2
            "
          >

            <button
              type="button"
              disabled={
                processing
              }
              onClick={
                handleDeleteDraftInvoice
              }
              className="
                inline-flex
                min-h-11
                w-full
                items-center
                justify-center
                gap-2
                rounded-2xl
                border
                border-red-200
                bg-white
                px-4
                text-sm
                font-semibold
                text-red-600
                disabled:opacity-50
              "
            >

              <Trash2
                size={16}
              />

              Xóa hóa đơn nháp

            </button>


            <button
              type="button"
              disabled={
                processing
              }
              onClick={
                handleIssue
              }
              className="
                inline-flex
                min-h-12
                w-full
                items-center
                justify-center
                gap-2
                rounded-2xl
                bg-[#e44763]
                px-4
                text-sm
                font-semibold
                text-white
                disabled:opacity-50
              "
            >

              {processing ? (
                <RefreshCw
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <CheckCircle2
                  size={17}
                />
              )}

              {processing
                ? "Đang xử lý..."
                : "Phát hành hóa đơn"}

            </button>

          </div>

        )}



        {/* =====================================================
            MOBILE INVOICE LIFECYCLE ACTIONS
        ===================================================== */}

        {isIssued
          &&
          invoice.payment_status === "UNPAID"
          &&
          (
            <button
              type="button"
              disabled={
                processing
              }
              onClick={
                handleCancelInvoice
              }
              className="
                inline-flex
                min-h-11
                w-full
                items-center
                justify-center
                gap-2
                rounded-2xl
                border
                border-red-200
                bg-white
                px-4
                text-sm
                font-semibold
                text-red-600
                transition
                hover:bg-red-50
                disabled:opacity-50
              "
            >
              <Trash2
                size={16}
              />

              {processing
                ? "Đang xử lý..."
                : "Hủy hóa đơn"}

            </button>
          )}


        {isCancelled && (
          <button
            type="button"
            disabled={
              processing
            }
            onClick={
              handleCreateReplacementInvoice
            }
            className="
              inline-flex
              min-h-11
              w-full
              items-center
              justify-center
              gap-2
              rounded-2xl
              bg-[#d6a64c]
              px-4
              text-sm
              font-semibold
              text-[#172033]
              transition
              hover:bg-[#e0b85f]
              disabled:opacity-50
            "
          >
            <RefreshCw
              size={16}
              className={
                processing
                  ? "animate-spin"
                  : ""
              }
            />

            {processing
              ? "Đang xử lý..."
              : "Tạo hóa đơn thay thế"}

          </button>
        )}

        {/* QR */}

        {isIssued
          &&
          remainingAmount > 0
          &&
          (

            <section>

              <h2
                className="
                  mb-3
                  text-base
                  font-bold
                  text-[#172033]
                "
              >
                Thanh toán QR
              </h2>


              <div
                className="
                  rounded-2xl
                  border
                  border-[#ebe6dd]
                  bg-white
                  p-4
                "
              >

                {!hasPaymentQrConfig ? (

                  <div
                    className="
                      py-6
                      text-center
                      text-sm
                      text-slate-500
                    "
                  >
                    Chưa cấu hình tài khoản nhận tiền.
                  </div>

                ) : !transferContent ? (

                  <div
                    className="
                      rounded-xl
                      bg-amber-50
                      px-4
                      py-4
                      text-sm
                      text-amber-800
                    "
                  >
                    Hóa đơn chưa có mã RH.
                  </div>

                ) : (

                  <>

                    <img
                      src={
                        paymentQrUrl
                      }
                      alt="VietQR thanh toán"
                      className="
                        mx-auto
                        w-full
                        max-w-[310px]
                        h-auto
                        object-contain
                        rounded-2xl
                        border
                        border-[#e9e2d8]
                        bg-white
                      "
                    />


                    <div
                      className="
                        mt-4
                        space-y-0
                      "
                    >

                      <InvoiceDetailRow
                        label="Ngân hàng"
                        value={
                          getBankName()
                        }
                      />


                      <InvoiceDetailRow
                        label="Số tài khoản"
                        value={
                          VIETQR_ACCOUNT_NO
                        }
                      />


                      <InvoiceDetailRow
                        label="Chủ tài khoản"
                        value={
                          VIETQR_ACCOUNT_NAME
                        }
                      />

                    </div>


                    <div
                      className="
                        mt-4
                        flex
                        items-center
                        justify-between
                        gap-3
                        rounded-xl
                        bg-red-50
                        px-4
                        py-3
                      "
                    >

                      <span
                        className="
                          text-xs
                          font-medium
                          text-red-700
                        "
                      >
                        Cần thanh toán
                      </span>


                      <strong
                        className="
                          text-base
                          text-red-700
                        "
                      >
                        {formatMoney(
                          remainingAmount
                        )}
                      </strong>

                    </div>

                  </>

                )}

              </div>

            </section>

          )}


        {/* PAYMENTS */}

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
                  text-base
                  font-bold
                  text-[#172033]
                "
              >
                Thanh toán
              </h2>


              <div
                className="
                  mt-0.5
                  text-xs
                  text-slate-500
                "
              >
                {payments.length}
                {" "}
                giao dịch
              </div>

            </div>


            {canPay && (

              <button
                type="button"
                onClick={
                  () =>
                    setShowPaymentModal(
                      true
                    )
                }
                className="
                  inline-flex
                  h-10
                  items-center
                  justify-center
                  gap-1.5
                  rounded-xl
                  bg-[#e44763]
                  px-3
                  text-xs
                  font-semibold
                  text-white
                "
              >

                <Plus
                  size={15}
                />

                Ghi nhận

              </button>

            )}

          </div>


          {isDraft && (

            <div
              className="
                mb-3
                rounded-2xl
                border
                border-amber-200
                bg-amber-50
                px-4
                py-3
                text-sm
                text-amber-800
              "
            >
              Hãy phát hành hóa đơn trước khi ghi nhận thanh toán.
            </div>

          )}


          {isIssued
            &&
            remainingAmount === 0
            &&
            (

              <div
                className="
                  mb-3
                  flex
                  items-center
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
                />

                Đã thanh toán đủ.

              </div>

            )}


          {payments.length === 0 ? (

            <div
              className="
                rounded-2xl
                border
                border-[#ebe6dd]
                bg-white
                px-5
                py-8
                text-center
                text-sm
                text-slate-500
              "
            >
              Chưa có giao dịch thanh toán.
            </div>

          ) : (

            <div
              className="
                space-y-3
              "
            >

              {payments.map(
                (
                  payment
                ) => (

                  <article
                    key={
                      payment.id
                    }
                    className="
                      rounded-2xl
                      border
                      border-[#ebe6dd]
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
                            text-lg
                            font-bold
                            text-emerald-700
                          "
                        >
                          {formatMoney(
                            payment.amount
                          )}
                        </div>


                        <div
                          className="
                            mt-1
                            text-xs
                            text-slate-500
                          "
                        >
                          Thanh toán #{payment.id}
                          {" • "}
                          {formatDateTime(
                            payment.paid_at
                          )}
                        </div>

                      </div>


                      <span
                        className="
                          shrink-0
                          rounded-full
                          bg-[#fffaf0]
                          px-2.5
                          py-1
                          text-[11px]
                          font-semibold
                          text-[#8a6726]
                        "
                      >
                        {getPaymentMethodText(
                          payment.payment_method
                        )}
                      </span>

                    </div>


                    <div
                      className="
                        mt-4
                        space-y-2
                      "
                    >

                      <div
                        className="
                          flex
                          items-start
                          justify-between
                          gap-3
                          text-xs
                        "
                      >

                        <span
                          className="
                            shrink-0
                            text-slate-500
                          "
                        >
                          Mã giao dịch
                        </span>


                        <strong
                          className="
                            break-all
                            text-right
                            font-semibold
                            text-[#172033]
                          "
                        >
                          {payment.transaction_reference
                            ??
                            "-"}
                        </strong>

                      </div>


                      <div
                        className="
                          flex
                          items-start
                          justify-between
                          gap-3
                          text-xs
                        "
                      >

                        <span
                          className="
                            shrink-0
                            text-slate-500
                          "
                        >
                          Ghi chú
                        </span>


                        <span
                          className="
                            max-w-[65%]
                            text-right
                            leading-5
                            text-slate-600
                          "
                        >
                          {payment.note
                            ??
                            "-"}
                        </span>

                      </div>

                    </div>


                    <div
                      className="
                        mt-4
                        border-t
                        border-[#f0ece5]
                        pt-3
                      "
                    >

                      {payment.receipt_file_key ? (

                        <>

                          <div
                            className="
                              flex
                              min-w-0
                              items-center
                              gap-2
                              text-xs
                              text-slate-500
                            "
                          >

                            <Paperclip
                              size={14}
                              className="shrink-0"
                            />

                            <span
                              className="
                                truncate
                              "
                            >
                              {payment.receipt_original_name
                                ??
                                "Chứng từ"}
                            </span>

                          </div>


                          <input
                            id={
                              `mobile-receipt-replace-${payment.id}`
                            }
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={
                              (
                                event
                              ) =>
                                handleReceiptSelected(
                                  payment,
                                  "REPLACE",
                                  event
                                )
                            }
                          />


                          <div
                            className="
                              mt-3
                              grid
                              grid-cols-3
                              gap-2
                            "
                          >

                            <button
                              type="button"
                              disabled={
                                receiptProcessingId
                                === payment.id
                              }
                              onClick={
                                () =>
                                  handleViewReceipt(
                                    payment
                                  )
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
                                text-xs
                                font-semibold
                                text-[#172033]
                                disabled:opacity-50
                              "
                            >

                              <Eye
                                size={14}
                              />

                              Xem

                            </button>


                            <label
                              htmlFor={
                                `mobile-receipt-replace-${payment.id}`
                              }
                              className="
                                inline-flex
                                min-h-10
                                cursor-pointer
                                items-center
                                justify-center
                                gap-1.5
                                rounded-xl
                                border
                                border-amber-200
                                text-xs
                                font-semibold
                                text-amber-700
                              "
                            >

                              <RefreshCw
                                size={14}
                                className={
                                  receiptProcessingId === payment.id
                                    ? "animate-spin"
                                    : ""
                                }
                              />

                              Thay

                            </label>


                            <button
                              type="button"
                              disabled={
                                receiptProcessingId
                                === payment.id
                              }
                              onClick={
                                () =>
                                  handleDeleteReceipt(
                                    payment
                                  )
                              }
                              className="
                                inline-flex
                                min-h-10
                                items-center
                                justify-center
                                gap-1.5
                                rounded-xl
                                border
                                border-red-200
                                text-xs
                                font-semibold
                                text-red-600
                                disabled:opacity-50
                              "
                            >

                              <Trash2
                                size={14}
                              />

                              Xóa

                            </button>

                          </div>

                        </>

                      ) : (

                        <>

                          <input
                            id={
                              `mobile-receipt-add-${payment.id}`
                            }
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={
                              (
                                event
                              ) =>
                                handleReceiptSelected(
                                  payment,
                                  "ADD",
                                  event
                                )
                            }
                          />


                          <label
                            htmlFor={
                              `mobile-receipt-add-${payment.id}`
                            }
                            className="
                              inline-flex
                              min-h-10
                              w-full
                              cursor-pointer
                              items-center
                              justify-center
                              gap-2
                              rounded-xl
                              border
                              border-[#ead9b7]
                              bg-[#fffaf0]
                              text-xs
                              font-semibold
                              text-[#8a6726]
                            "
                          >

                            {receiptProcessingId === payment.id ? (
                              <RefreshCw
                                size={14}
                                className="animate-spin"
                              />
                            ) : (
                              <Upload
                                size={14}
                              />
                            )}

                            {receiptProcessingId === payment.id
                              ? "Đang tải..."
                              : "Thêm chứng từ"}

                          </label>

                        </>

                      )}


                      <button
                        type="button"
                        disabled={
                          paymentInfoProcessingId
                          === payment.id
                        }
                        onClick={
                          () =>
                            handleOpenEditPayment(
                              payment
                            )
                        }
                        className="
                          mt-2
                          inline-flex
                          min-h-10
                          w-full
                          items-center
                          justify-center
                          gap-2
                          rounded-xl
                          border
                          border-[#ddd8ce]
                          bg-white
                          text-xs
                          font-semibold
                          text-[#172033]
                          disabled:opacity-50
                        "
                      >

                        <Pencil
                          size={14}
                        />

                        Sửa thông tin thanh toán

                      </button>

                      {payment.payment_method !== "DEPOSIT" && (

                        <button
                          type="button"
                          disabled={
                            voidingPaymentId
                            === payment.id
                            ||
                            paymentInfoProcessingId
                            === payment.id
                          }
                          onClick={
                            () =>
                              handleVoidPayment(
                                payment
                              )
                          }
                          className="
                            mt-2
                            inline-flex
                            min-h-10
                            w-full
                            items-center
                            justify-center
                            gap-2
                            rounded-xl
                            border
                            border-red-200
                            bg-white
                            px-3
                            text-xs
                            font-semibold
                            text-red-600
                            transition
                            hover:bg-red-50
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                          "
                        >

                          <Trash2
                            size={14}
                          />

                          {
                            voidingPaymentId
                            === payment.id

                              ? "\u0110ang h\u1ee7y..."

                              : "H\u1ee7y ghi nh\u1eadn"
                          }

                        </button>

                      )}


                    </div>

                  </article>

                )
              )}

            </div>

          )}

        </section>


        {/* NOTES */}

        <section>

          <h2
            className="
              mb-3
              text-base
              font-bold
              text-[#172033]
            "
          >
            Ghi chú
          </h2>


          <div
            className="
              space-y-3
              rounded-2xl
              border
              border-[#ebe6dd]
              bg-white
              p-4
            "
          >

            <div>

              <div
                className="
                  text-xs
                  font-semibold
                  text-[#172033]
                "
              >
                Ghi chú hóa đơn
              </div>


              <div
                className="
                  mt-2
                  rounded-xl
                  bg-[#fcfbf8]
                  px-3
                  py-3
                  text-sm
                  leading-6
                  text-slate-600
                "
              >
                {invoice.note
                  ||
                  "Không có ghi chú."}
              </div>

            </div>


            <div>

              <label
                className="
                  text-xs
                  font-semibold
                  text-[#172033]
                "
              >
                Ghi chú khi in
              </label>


              <textarea
                value={
                  printNote
                }
                onChange={
                  (
                    event
                  ) =>
                    setPrintNote(
                      event.target.value
                    )
                }
                rows={4}
                placeholder="Ví dụ: Vui lòng thanh toán trước ngày 05..."
                className="
                  mt-2
                  min-h-24
                  w-full
                  resize-y
                  rounded-xl
                  border
                  border-[#ddd9cf]
                  bg-white
                  px-3
                  py-3
                  text-base
                  text-[#172033]
                  outline-none
                  placeholder:text-slate-400
                  focus:border-[#d6a64c]
                "
              />

            </div>

          </div>

        </section>


        {/* ROOM LINK */}

        <Link
          to={
            `/rooms/${room.id}`
          }
          className="
            inline-flex
            min-h-11
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
            font-semibold
            text-[#172033]
          "
        >

          <Building2
            size={16}
          />

          Xem chi tiết phòng

        </Link>

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
          BACK
      ===================================================== */}

      <Link
        to="/invoices"
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

        Quay lại danh sách hóa đơn

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
            gap-6
            xl:flex-row
            xl:items-center
            xl:justify-between
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

              Chi tiết hóa đơn

            </div>


            <h1
              className="
                text-2xl
                font-semibold
                tracking-tight
                md:text-3xl
              "
            >
              Hóa đơn #{invoice.id}
            </h1>


            <p
              className="
                mt-2
                text-sm
                text-slate-300
              "
            >
              Phòng {room.room_code}
              {" • "}
              Hóa đơn tháng {invoice.month}/{invoice.year}
              {" • "}
              {invoice.electricity_transition_new_reading != null
                ? `Điện chuyển tiếp: ${invoice.electricity_transition_old_reading} → ${invoice.electricity_transition_new_reading} (${invoice.electricity_transition_new_reading - (invoice.electricity_transition_old_reading ?? 0)} kWh)`
                : invoice.electricity_period_year != null
                && invoice.electricity_period_month != null
                ? `Điện kỳ ${String(invoice.electricity_period_month).padStart(2, "0")}/${invoice.electricity_period_year}`
                : "Không tính điện"}
              {" • "}
              Phiên bản v{invoice.version}
            </p>


            <div
              className="
                mt-4
                flex
                flex-wrap
                items-center
                gap-2
              "
            >

              <InvoiceDetailStatusBadge
                status={
                  invoice.status
                }
              />


              <PaymentDetailStatusBadge
                status={
                  invoice.payment_status
                }
              />

            </div>

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
                handlePrintInvoice
              }
              className="
                border-white/20
                bg-white/5
                text-white
                hover:bg-white/10
                hover:text-white
              "
            >

              <Printer />

              In / Lưu PDF

            </Button>


            <Button
              type="button"
              variant="outline"
              disabled={
                processing
              }
              onClick={
                handleDownloadPng
              }
              className="
                border-white/20
                bg-white/5
                text-white
                hover:bg-white/10
                hover:text-white
              "
            >

              {processing ? (

                <RefreshCw
                  className=
                    "animate-spin"
                />

              ) : (

                <FileImage />

              )}


              {processing
                ? "Đang xử lý..."
                : "Tải ảnh PNG"}

            </Button>

          </div>

        </div>

      </section>


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


      {isCancelled && (

        <div
          className="
            flex
            items-start
            gap-3
            rounded-xl
            border
            border-slate-200
            bg-slate-50
            px-4
            py-3
            text-sm
            text-slate-700
          "
        >

          <AlertCircle
            size={18}
            className=
              "mt-0.5 shrink-0"
          />

          Hóa đơn này đã bị hủy và không còn hiệu lực thanh toán.

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
          xl:grid-cols-3
        "
      >

        <InvoiceDetailStat
          title="Phòng"
          value={
            room.room_code
          }
          subtitle={
            `Kỳ ${invoice.month}/${invoice.year}`
          }
          icon={
            Building2
          }
        />


        <InvoiceDetailStat
          title="Tổng hóa đơn"
          value={
            formatMoney(
              invoice.total_amount
            )
          }
          subtitle={
            `Phiên bản v${invoice.version}`
          }
          icon={
            CircleDollarSign
          }
          accent="gold"
        />


        <InvoiceDetailStat
          title="Đã thanh toán"
          value={
            formatMoney(
              totalPaid
            )
          }
          subtitle={
            payments.length > 0
              ? `${payments.length} giao dịch`
              : "Chưa có giao dịch"
          }
          icon={
            CheckCircle2
          }
          success={
            totalPaid > 0
          }
        />


        <InvoiceDetailStat
          title={invoicePresentation.paid ? "ĐÃ THANH TOÁN ĐỦ" : "CÒN PHẢI TRẢ"}
          prominent
          success={invoicePresentation.paid}
          value={
            formatMoney(
              remainingAmount
            )
          }
          subtitle={
            remainingAmount > 0
              ? "Cần tiếp tục thanh toán"
              : invoicePresentation.label
          }
          icon={
            WalletCards
          }
          danger={
            remainingAmount > 0
            &&
            isIssued
          }
        />

      </div>


      {/* =====================================================
          RH TRANSFER REFERENCE
      ===================================================== */}

      {!isDraft
        &&
        transferContent
        &&
        (

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
                bg-[#fffdf9]
              "
            >

              <div
                className="
                  flex
                  flex-col
                  gap-4
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
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

                    <Landmark
                      size={18}
                      className=
                        "text-[#d6a64c]"
                    />

                    Mã đối soát chuyển khoản

                  </CardTitle>


                  <CardDescription>
                    Mã RH được dùng làm nội dung chuyển khoản và để tra cứu giao dịch.
                  </CardDescription>

                </div>


                <Button
                  type="button"
                  variant="outline"
                  onClick={
                    handleCopyTransferContent
                  }
                  className="
                    h-10
                    rounded-xl
                    border-[#ddd8ce]
                    bg-white
                  "
                >

                  <Copy />

                  Sao chép mã

                </Button>

              </div>

            </CardHeader>


            <CardContent
              className="
                space-y-4
                p-5
                md:p-6
              "
            >

              <div
                className="
                  flex
                  flex-col
                  gap-4
                  rounded-xl
                  border
                  border-[#e5dccb]
                  bg-[#fffaf2]
                  px-4
                  py-4
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                "
              >

                <div>

                  <div
                    className="
                      text-xs
                      font-medium
                      uppercase
                      tracking-[0.08em]
                      text-slate-500
                    "
                  >
                    Mã RH
                  </div>


                  <div
                    className="
                      mt-2
                      break-all
                      font-mono
                      text-lg
                      font-semibold
                      tracking-wide
                      text-[#8a6726]
                    "
                  >
                    {transferContent}
                  </div>

                </div>


                <Badge
                  variant="outline"
                  className={
                    isCancelled

                      ? `
                        w-fit
                        border-slate-200
                        bg-slate-50
                        text-slate-600
                      `

                      : `
                        w-fit
                        border-emerald-200
                        bg-emerald-50
                        text-emerald-700
                      `
                  }
                >
                  {isCancelled
                    ? "Hóa đơn đã hủy"
                    : "Dùng để đối soát"}
                </Badge>

              </div>


              <div
                className="
                  rounded-xl
                  border
                  border-[#eee9df]
                  bg-white
                  px-4
                  py-3
                  text-sm
                  leading-6
                  text-slate-600
                "
              >
                Khi nhận ảnh chuyển khoản có mã này,
                bạn có thể nhập trực tiếp
                <strong className="mx-1 text-[#172033]">
                  {transferContent}
                </strong>
                tại
                <strong className="ml-1 text-[#172033]">
                  Giao dịch → Tìm kiếm
                </strong>
                để đối chiếu hóa đơn và khoản thanh toán liên quan.
              </div>

            </CardContent>

          </Card>

        )}


      {/* =====================================================
          ITEMS
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
              flex-col
              gap-4
              sm:flex-row
              sm:items-center
              sm:justify-between
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

                Các khoản trong hóa đơn

              </CardTitle>


              <CardDescription>
                Chi tiết tiền phòng, điện, nước và các khoản phí.
              </CardDescription>

            </div>


            {canEditDraft && (

              <Button
                type="button"
                onClick={
                  () =>
                    setShowAddItemModal(
                      true
                    )
                }
                className="
                  bg-[#d6a64c]
                  text-[#172033]
                  hover:bg-[#e0b85f]
                "
              >

                <Plus />

                Thêm khoản

              </Button>

            )}

          </div>

        </CardHeader>


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
                min-w-[900px]
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

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Khoản
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Mô tả
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Số lượng
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Đơn giá
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Thành tiền
                  </th>

                  {canEditDraft && (
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Thao tác
                    </th>
                  )}

                </tr>

              </thead>


              <tbody>

                {invoice.items.map(
                  (
                    item
                  ) => (

                    <tr
                      key={
                        item.id
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

                        <Badge
                          variant="outline"
                          className="
                            border-[#e5dccb]
                            bg-[#fffaf2]
                            text-[#8a6726]
                          "
                        >
                          {getItemTypeText(
                            item.item_type
                          )}
                        </Badge>

                      </td>


                      <td
                        className="
                          max-w-[300px]
                          px-5
                          py-4
                          text-slate-600
                        "
                      >
                        {item.description
                          ||
                          "-"}
                      </td>


                      <td
                        className="
                          whitespace-nowrap
                          px-5
                          py-4
                          text-slate-600
                        "
                      >
                        {
                          item.quantity
                          !== null
                          &&
                          item.quantity
                          !== undefined

                            ? `${item.quantity} ${item.unit ?? ""}`

                            : "-"
                        }
                      </td>


                      <td
                        className="
                          whitespace-nowrap
                          px-5
                          py-4
                          text-slate-600
                        "
                      >
                        {
                          item.unit_price
                          !== null
                          &&
                          item.unit_price
                          !== undefined

                            ? formatMoney(
                                item.unit_price
                              )

                            : "-"
                        }
                      </td>


                      <td
                        className="
                          whitespace-nowrap
                          px-5
                          py-4
                          text-right
                          font-semibold
                          text-[#172033]
                        "
                      >
                        {formatMoney(
                          item.amount
                        )}
                      </td>


                      {canEditDraft && (

                        <td
                          className="
                            px-5
                            py-4
                            text-right
                          "
                        >

                          <div
                            className="
                              flex
                              justify-end
                              gap-2
                            "
                          >

                            <button
                              type="button"
                              disabled={
                                processing
                              }
                              onClick={
                                () =>
                                  handleOpenEditItem(
                                    item
                                  )
                              }
                              className="
                                inline-flex
                                h-8
                                items-center
                                justify-center
                                gap-1.5
                                rounded-lg
                                border
                                border-amber-200
                                bg-white
                                px-3
                                text-xs
                                font-semibold
                                text-amber-700
                                transition
                                hover:bg-amber-50
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                              "
                            >

                              <Pencil
                                size={13}
                              />

                              Sửa

                            </button>


                            <button
                              type="button"
                              disabled={
                                processing
                              }
                              onClick={
                                () =>
                                  handleDeleteItem(
                                    item.id
                                  )
                              }
                              className="
                                inline-flex
                                h-8
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
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                              "
                            >

                              <Trash2
                                size={13}
                              />

                              Xóa

                            </button>

                          </div>

                        </td>

                      )}

                    </tr>

                  )
                )}

              </tbody>


              <tfoot
                className="
                  border-t
                  border-[#e5dccb]
                  bg-[#fffaf2]
                "
              >

                <tr>

                  <td
                    colSpan={
                      isDraft
                        ? 4
                        : 3
                    }
                    className="
                      px-5
                      py-4
                      text-right
                      text-sm
                      font-semibold
                      text-[#8a6726]
                    "
                  >
                    Tổng cộng
                  </td>


                  <td
                    className="
                      whitespace-nowrap
                      px-5
                      py-4
                      text-right
                      text-lg
                      font-semibold
                      text-[#172033]
                    "
                  >
                    {formatMoney(
                      invoice.total_amount
                    )}
                  </td>


                  {canEditDraft && (
                    <td />
                  )}

                </tr>

              </tfoot>

            </table>

          </div>

        </CardContent>

      </Card>


      {/* =====================================================
          VIETQR
      ===================================================== */}

      {isIssued
        &&
        remainingAmount > 0
        &&
        (

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

              <CardTitle
                className="
                  flex
                  items-center
                  gap-2
                  text-base
                "
              >

                <Landmark
                  size={18}
                  className=
                    "text-[#d6a64c]"
                />

                QR chuyển khoản

              </CardTitle>


              <CardDescription>
                Khách quét mã để thanh toán số tiền còn phải trả.
              </CardDescription>

            </CardHeader>


            <CardContent
              className="p-5 md:p-6"
            >

              {!hasPaymentQrConfig ? (

                <div
                  className="
                    flex
                    min-h-36
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-dashed
                    border-[#ddd8ce]
                    bg-[#fcfbf8]
                    px-5
                    text-center
                    text-sm
                    text-slate-500
                  "
                >
                  Chưa cấu hình tài khoản nhận tiền.
                </div>

              ) : !transferContent ? (

                <div
                  className="
                    flex
                    min-h-36
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-amber-200
                    bg-amber-50
                    px-5
                    text-center
                    text-sm
                    text-amber-800
                  "
                >
                  Hóa đơn chưa có mã RH. Hãy kiểm tra migration
                  và phát hành lại hóa đơn nếu cần.
                </div>

              ) : (

                <div
                  className="
                    grid
                    grid-cols-1
                    gap-6
                    lg:grid-cols-[minmax(0,1fr)_340px]
                    lg:items-center
                  "
                >

                  <div
                    className="
                      flex
                      lg:order-2
                      justify-center
                    "
                  >

                    <img
                      src={
                        paymentQrUrl
                      }
                      alt="VietQR thanh toán"
                      className="
                        w-full
                        max-w-[330px]
                        h-auto
                        rounded-2xl
                        border
                        border-[#e9e2d8]
                        bg-white
                        object-contain
                        shadow-sm
                      "
                    />

                  </div>


                  <div
                    className="
                      space-y-1
                    "
                  >

                    <InvoiceDetailRow
                      label="Ngân hàng"
                      value={
                        getBankName()
                      }
                    />


                    <InvoiceDetailRow
                      label="Chủ tài khoản"
                      value={
                        VIETQR_ACCOUNT_NAME
                      }
                    />


                    <InvoiceDetailRow
                      label="Số tài khoản"
                      value={
                        VIETQR_ACCOUNT_NO
                      }
                    />


                    <InvoiceDetailRow
                      label="Nội dung chuyển khoản"
                      value={
                        transferContent
                      }
                    />


                    <div
                      className="
                        mt-4
                        flex
                        flex-col
                        items-start
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
                        Cần thanh toán
                      </span>


                      <strong
                        className="
                          max-w-full
                          overflow-x-auto
                          whitespace-nowrap
                          text-[30px]
                          text-red-700
                        "
                      >
                        {formatMoney(
                          remainingAmount
                        )}
                      </strong>

                    </div>


                    <div
                      className="
                        mt-3
                        rounded-xl
                        border
                        border-[#eee9df]
                        bg-[#fffdf9]
                        px-4
                        py-3
                        text-sm
                        leading-5
                        text-slate-600
                      "
                    >
                      Sau khi khách chuyển khoản,
                      hãy kiểm tra tiền đã vào tài khoản
                      trước khi ghi nhận thanh toán.
                    </div>

                  </div>

                </div>

              )}

            </CardContent>

          </Card>

        )}


      {/* =====================================================
          PAYMENT
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
              flex-col
              gap-4
              sm:flex-row
              sm:items-center
              sm:justify-between
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

                <Banknote
                  size={18}
                  className=
                    "text-[#e44763]"
                />

                Thanh toán

              </CardTitle>


              <CardDescription>
                Theo dõi lịch sử thanh toán và chứng từ của hóa đơn.
              </CardDescription>

            </div>


            {canPay && (

              <Button
                type="button"
                onClick={
                  () =>
                    setShowPaymentModal(
                      true
                    )
                }
                className="
                  bg-[#e44763]
                  text-white
                  hover:bg-[#cf3852]
                "
              >

                <Plus />

                Ghi nhận thanh toán

              </Button>

            )}

          </div>

        </CardHeader>


        <CardContent
          className="p-0"
        >

          <div
            className="
              grid
              grid-cols-1
              gap-3
              border-b
              border-[#eeeae2]
              bg-[#fcfbf8]
              p-5
              sm:grid-cols-3
            "
          >

            <PaymentMiniStat
              label="Tổng hóa đơn"
              value={
                formatMoney(
                  invoice.total_amount
                )
              }
            />


            <PaymentMiniStat
              label="Đã thanh toán"
              value={
                formatMoney(
                  totalPaid
                )
              }
              success={
                totalPaid > 0
              }
            />


            <PaymentMiniStat
              label="Còn phải trả"
              value={
                formatMoney(
                  remainingAmount
                )
              }
              danger={
                remainingAmount > 0
                &&
                isIssued
              }
              success={
                remainingAmount === 0
              }
            />

          </div>


          {isDraft && (

            <div
              className="
                m-5
                rounded-xl
                border
                border-amber-200
                bg-amber-50
                px-4
                py-3
                text-sm
                text-amber-800
              "
            >
              Hãy phát hành hóa đơn trước khi ghi nhận thanh toán.
            </div>

          )}


          {isIssued
            &&
            remainingAmount === 0
            &&
            (

              <div
                className="
                  m-5
                  flex
                  items-center
                  gap-2
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
                  size={17}
                />

                Hóa đơn đã được thanh toán đủ. Bạn vẫn có thể thêm hoặc cập nhật chứng từ bên dưới.

              </div>

            )}


          {payments.length === 0 ? (

            <div
              className="
                flex
                min-h-48
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

                <WalletCards
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
                Chưa có giao dịch thanh toán
              </strong>


              <p
                className="
                  mt-1
                  text-sm
                  text-slate-500
                "
              >
                Các khoản thanh toán sẽ xuất hiện tại đây.
              </p>

            </div>

          ) : (

            <div
              className="
                overflow-x-auto
              "
            >

              <table
                className="
                  w-full
                  min-w-[1260px]
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

                    <PaymentTableHead>Mã</PaymentTableHead>
                    <PaymentTableHead>Số tiền</PaymentTableHead>
                    <PaymentTableHead>Phương thức</PaymentTableHead>
                    <PaymentTableHead>Mã giao dịch</PaymentTableHead>
                    <PaymentTableHead>Ghi chú</PaymentTableHead>
                    <PaymentTableHead>Chứng từ</PaymentTableHead>
                    <PaymentTableHead>Thời gian</PaymentTableHead>
                    <PaymentTableHead>Thao tác</PaymentTableHead>

                  </tr>

                </thead>


                <tbody>

                  {payments.map(
                    (
                      payment
                    ) => (

                      <tr
                        key={
                          payment.id
                        }
                        className="
                          border-b
                          border-[#f0ece5]
                          transition
                          last:border-0
                          hover:bg-[#fcfbf8]
                        "
                      >

                        <td className="whitespace-nowrap px-5 py-4 font-semibold text-[#172033]">
                          #{payment.id}
                        </td>


                        <td className="whitespace-nowrap px-5 py-4 font-semibold text-emerald-700">
                          {formatMoney(
                            payment.amount
                          )}
                        </td>


                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">

                          <Badge
                            variant="outline"
                            className="
                              border-[#e5dccb]
                              bg-[#fffaf2]
                              text-[#8a6726]
                            "
                          >
                            {getPaymentMethodText(
                              payment.payment_method
                            )}
                          </Badge>

                        </td>


                        <td className="max-w-[180px] px-5 py-4 text-slate-600">
                          {payment.transaction_reference
                            ??
                            "-"}
                        </td>


                        <td className="max-w-[220px] px-5 py-4 text-slate-600">
                          {payment.note
                            ??
                            "-"}
                        </td>


                        <td
                          className="
                            px-5
                            py-4
                          "
                        >

                          {payment.receipt_file_key ? (

                            <div
                              className="
                                min-w-[235px]
                              "
                            >

                              <div
                                className="
                                  flex
                                  max-w-[220px]
                                  items-center
                                  gap-1.5
                                  truncate
                                  text-xs
                                  text-slate-500
                                "
                                title={
                                  payment.receipt_original_name
                                  ??
                                  "Chứng từ"
                                }
                              >

                                <Paperclip
                                  size={13}
                                  className="shrink-0"
                                />

                                <span className="truncate">
                                  {payment.receipt_original_name
                                    ??
                                    "Chứng từ"}
                                </span>

                              </div>


                              <input
                                id={
                                  `receipt-replace-${payment.id}`
                                }
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={
                                  (
                                    event
                                  ) =>
                                    handleReceiptSelected(
                                      payment,
                                      "REPLACE",
                                      event
                                    )
                                }
                              />


                              <div
                                className="
                                  mt-2
                                  flex
                                  flex-wrap
                                  gap-2
                                "
                              >

                                <button
                                  type="button"
                                  disabled={
                                    receiptProcessingId
                                    === payment.id
                                  }
                                  onClick={
                                    () =>
                                      handleViewReceipt(
                                        payment
                                      )
                                  }
                                  className="
                                    inline-flex
                                    h-8
                                    items-center
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
                                    disabled:cursor-not-allowed
                                    disabled:opacity-50
                                  "
                                >

                                  <Eye
                                    size={13}
                                  />

                                  Xem

                                </button>


                                <button
                                  type="button"
                                  disabled={
                                    receiptProcessingId
                                    === payment.id
                                  }
                                  onClick={
                                    () =>
                                      openReceiptPicker(
                                        payment.id,
                                        "REPLACE"
                                      )
                                  }
                                  className="
                                    inline-flex
                                    h-8
                                    items-center
                                    gap-1.5
                                    rounded-lg
                                    border
                                    border-amber-200
                                    bg-white
                                    px-3
                                    text-xs
                                    font-semibold
                                    text-amber-700
                                    transition
                                    hover:bg-amber-50
                                    disabled:cursor-not-allowed
                                    disabled:opacity-50
                                  "
                                >

                                  {
                                    receiptProcessingId
                                    === payment.id

                                      ? (

                                        <RefreshCw
                                          size={13}
                                          className="animate-spin"
                                        />

                                      )

                                      : (

                                        <RefreshCw
                                          size={13}
                                        />

                                      )
                                  }

                                  Thay

                                </button>


                                <button
                                  type="button"
                                  disabled={
                                    receiptProcessingId
                                    === payment.id
                                  }
                                  onClick={
                                    () =>
                                      handleDeleteReceipt(
                                        payment
                                      )
                                  }
                                  className="
                                    inline-flex
                                    h-8
                                    items-center
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
                                    disabled:cursor-not-allowed
                                    disabled:opacity-50
                                  "
                                >

                                  <Trash2
                                    size={13}
                                  />

                                  Xóa

                                </button>

                              </div>

                            </div>

                          ) : (

                            <div
                              className="
                                min-w-[190px]
                              "
                            >

                              <input
                                id={
                                  `receipt-add-${payment.id}`
                                }
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={
                                  (
                                    event
                                  ) =>
                                    handleReceiptSelected(
                                      payment,
                                      "ADD",
                                      event
                                    )
                                }
                              />


                              <button
                                type="button"
                                disabled={
                                  receiptProcessingId
                                  === payment.id
                                }
                                onClick={
                                  () =>
                                    openReceiptPicker(
                                      payment.id,
                                      "ADD"
                                    )
                                }
                                className="
                                  inline-flex
                                  h-9
                                  items-center
                                  gap-2
                                  rounded-lg
                                  border
                                  border-[#d6a64c]/50
                                  bg-[#fffaf2]
                                  px-3
                                  text-xs
                                  font-semibold
                                  text-[#8a6726]
                                  transition
                                  hover:bg-[#fff4df]
                                  disabled:cursor-not-allowed
                                  disabled:opacity-50
                                "
                              >

                                {
                                  receiptProcessingId
                                  === payment.id

                                    ? (

                                      <RefreshCw
                                        size={14}
                                        className="animate-spin"
                                      />

                                    )

                                    : (

                                      <Upload
                                        size={14}
                                      />

                                    )
                                }

                                {
                                  receiptProcessingId
                                  === payment.id

                                    ? "Đang tải..."

                                    : "Thêm chứng từ"
                                }

                              </button>

                            </div>

                          )}

                        </td>


                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {formatDateTime(
                            payment.paid_at
                          )}
                        </td>


                        <td className="whitespace-nowrap px-5 py-4">

                          <button
                            type="button"
                            disabled={
                              paymentInfoProcessingId
                              === payment.id
                            }
                            onClick={
                              () =>
                                handleOpenEditPayment(
                                  payment
                                )
                            }
                            className="
                              inline-flex
                              h-8
                              items-center
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
                              disabled:cursor-not-allowed
                              disabled:opacity-50
                            "
                          >

                            <Pencil
                              size={13}
                            />

                            Sửa thông tin

                          </button>

                          {payment.payment_method !== "DEPOSIT" && (

                            <button
                              type="button"
                              disabled={
                                voidingPaymentId
                                === payment.id
                                ||
                                paymentInfoProcessingId
                                === payment.id
                              }
                              onClick={
                                () =>
                                  handleVoidPayment(
                                    payment
                                  )
                              }
                              className="
                                ml-2
                                inline-flex
                                h-8
                                items-center
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
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                              "
                            >

                              <Trash2
                                size={13}
                              />

                              {
                                voidingPaymentId
                                === payment.id

                                  ? "\u0110ang h\u1ee7y..."

                                  : "H\u1ee7y ghi nh\u1eadn"
                              }

                            </button>

                          )}


                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </CardContent>

      </Card>


      {/* =====================================================
          NOTES
      ===================================================== */}

      <div
        className="
          grid
          grid-cols-1
          gap-5
          xl:grid-cols-2
        "
      >

        <Card
          className="
            rounded-2xl
            border-[#e9e2d8]
            shadow-sm
          "
        >

          <CardHeader className="border-b border-[#eeeae2]">

            <CardTitle className="text-base">
              Ghi chú hóa đơn
            </CardTitle>

            <CardDescription>
              Nội dung ghi chú đang lưu trong hóa đơn.
            </CardDescription>

          </CardHeader>


          <CardContent className="p-5">

            <div
              className="
                min-h-28
                rounded-xl
                border
                border-[#eee9df]
                bg-[#fffdf9]
                px-4
                py-3
                text-sm
                leading-6
                text-slate-600
              "
            >
              {invoice.note
                ||
                "Không có ghi chú."}
            </div>

          </CardContent>

        </Card>


        <Card
          className="
            rounded-2xl
            border-[#e9e2d8]
            shadow-sm
          "
        >

          <CardHeader className="border-b border-[#eeeae2]">

            <CardTitle className="text-base">
              Ghi chú khi in
            </CardTitle>

            <CardDescription>
              Nội dung này sẽ xuất hiện trên PDF và ảnh hóa đơn.
            </CardDescription>

          </CardHeader>


          <CardContent className="p-5">

            <textarea
              value={
                printNote
              }
              onChange={
                (
                  event
                ) =>
                  setPrintNote(
                    event.target.value
                  )
              }
              rows={5}
              placeholder="Ví dụ: Vui lòng thanh toán trước ngày 05..."
              className="
                min-h-28
                w-full
                resize-y
                rounded-xl
                border
                border-[#ddd9cf]
                bg-white
                px-3
                py-3
                text-sm
                text-[#172033]
                outline-none
                transition
                placeholder:text-slate-400
                focus:border-[#d6a64c]
              "
            />

          </CardContent>

        </Card>

      </div>


      {/* =====================================================
          ACTIONS
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
            flex
            flex-col
            gap-3
            p-5
            lg:flex-row
            lg:items-center
            lg:justify-between
          "
        >

          <div>

            <div className="text-sm font-semibold text-[#172033]">
              Thao tác hóa đơn
            </div>

            <p className="mt-1 text-xs text-slate-500">
              In hóa đơn, xuất ảnh hoặc phát hành hóa đơn nháp.
            </p>

          </div>


          <div
            className="
              flex
              flex-col
              gap-2
              sm:flex-row
              sm:flex-wrap
            "
          >

            <Link
              to={
                `/rooms/${room.id}`
              }
              className="
                inline-flex
                h-10
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-[#ddd8ce]
                bg-white
                px-4
                text-sm
                font-semibold
                text-[#172033]
                transition
                hover:border-[#d6a64c]
                hover:bg-[#fffaf1]
              "
            >

              <Building2
                size={16}
              />

              Xem phòng

            </Link>


            <Button
              type="button"
              variant="outline"
              onClick={
                handlePrintInvoice
              }
              className="
                h-10
                rounded-xl
                border-[#ddd8ce]
              "
            >

              <Printer />

              In / Lưu PDF

            </Button>


            <Button
              type="button"
              variant="outline"
              disabled={
                processing
              }
              onClick={
                handleDownloadPng
              }
              className="
                h-10
                rounded-xl
                border-[#ddd8ce]
              "
            >

              <FileImage />

              Tải ảnh PNG

            </Button>


            {canEditDraft && (

              <Button
                type="button"
                variant="outline"
                disabled={
                  processing
                }
                onClick={
                  handleDeleteDraftInvoice
                }
                className="
                  h-10
                  rounded-xl
                  border-red-200
                  bg-white
                  text-red-600
                  hover:bg-red-50
                  hover:text-red-700
                "
              >

                <Trash2 />

                Xóa hóa đơn nháp

              </Button>

            )}


            {isDraft && (

              <Button
                type="button"
                disabled={
                  processing
                }
                onClick={
                  handleIssue
                }
                className="
                  h-10
                  rounded-xl
                  bg-[#e44763]
                  text-white
                  hover:bg-[#cf3852]
                "
              >

                {processing ? (

                  <RefreshCw
                    className=
                      "animate-spin"
                  />

                ) : (

                  <CheckCircle2 />

                )}


                {processing
                  ? "Đang xử lý..."
                  : "Phát hành hóa đơn"}

              </Button>

            )}


            {/* =================================================
                DESKTOP INVOICE LIFECYCLE ACTIONS
            ================================================= */}

            {isIssued
              &&
              invoice.payment_status === "UNPAID"
              &&
              (
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    processing
                  }
                  onClick={
                    handleCancelInvoice
                  }
                  className="
                    h-10
                    rounded-xl
                    border-red-200
                    bg-white
                    text-red-600
                    hover:bg-red-50
                    hover:text-red-700
                  "
                >
                  <Trash2 />

                  {processing
                    ? "Đang xử lý..."
                    : "Hủy hóa đơn"}

                </Button>
              )}


            {isCancelled && (
              <Button
                type="button"
                disabled={
                  processing
                }
                onClick={
                  handleCreateReplacementInvoice
                }
                className="
                  h-10
                  rounded-xl
                  bg-[#d6a64c]
                  text-[#172033]
                  hover:bg-[#e0b85f]
                "
              >
                <RefreshCw
                  className={
                    processing
                      ? "animate-spin"
                      : ""
                  }
                />

                {processing
                  ? "Đang xử lý..."
                  : "Tạo hóa đơn thay thế"}

              </Button>
            )}

          </div>

        </CardContent>

      </Card>


        </div>

      </div>


      {/* =====================================================
          EDIT INVOICE ITEM MODAL
      ===================================================== */}

      {editingInvoiceItem && (

        <div
          className="
            fixed
            inset-0
            z-[110]
            flex
            items-center
            justify-center
            bg-slate-950/45
            p-4
          "
        >

          <div
            className="
              max-h-[90dvh]
              w-full
              max-w-xl
              overflow-y-auto
              rounded-2xl
              border
              border-[#e9e2d8]
              bg-white
              shadow-2xl
            "
          >

            <div
              className="
                border-b
                border-[#eeeae2]
                px-5
                py-4
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

                  <h2
                    className="
                      text-lg
                      font-semibold
                      text-[#172033]
                    "
                  >
                    Sửa khoản hóa đơn
                  </h2>


                  <p
                    className="
                      mt-1
                      text-sm
                      text-slate-500
                    "
                  >
                    {getItemTypeText(
                      editingInvoiceItem.item_type
                    )}
                    {" • "}
                    Hóa đơn #{invoice.id}
                  </p>

                </div>


                <button
                  type="button"
                  disabled={
                    processing
                  }
                  onClick={
                    handleCloseEditItem
                  }
                  className="
                    rounded-lg
                    px-2
                    py-1
                    text-sm
                    font-semibold
                    text-slate-500
                    transition
                    hover:bg-slate-100
                    hover:text-[#172033]
                    disabled:opacity-50
                  "
                >
                  Đóng
                </button>

              </div>

            </div>


            <div
              className="
                space-y-4
                px-5
                py-5
              "
            >

              <div
                className="
                  rounded-xl
                  border
                  border-amber-200
                  bg-amber-50
                  px-4
                  py-3
                  text-xs
                  leading-5
                  text-amber-800
                "
              >
                Chỉ hóa đơn đang ở trạng thái Nháp mới được chỉnh sửa.
                Loại khoản không thay đổi tại màn này.
              </div>


              <div>

                <label
                  htmlFor="invoice-item-description"
                  className="
                    block
                    text-sm
                    font-semibold
                    text-[#172033]
                  "
                >
                  Mô tả
                </label>


                <input
                  id="invoice-item-description"
                  type="text"
                  value={
                    editItemDescription
                  }
                  maxLength={150}
                  onChange={
                    (
                      event
                    ) =>
                      setEditItemDescription(
                        event.target.value
                      )
                  }
                  className="
                    mt-2
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
                />

              </div>


              <div
                className="
                  grid
                  grid-cols-1
                  gap-3
                  sm:grid-cols-3
                "
              >

                <div>

                  <label
                    htmlFor="invoice-item-quantity"
                    className="
                      block
                      text-xs
                      font-semibold
                      text-[#172033]
                    "
                  >
                    Số lượng
                  </label>


                  <input
                    id="invoice-item-quantity"
                    type="number"
                    min="0"
                    step="1"
                    value={
                      editItemQuantity
                    }
                    onChange={
                      (
                        event
                      ) =>
                        setEditItemQuantity(
                          event.target.value
                        )
                    }
                    placeholder="-"
                    className="
                      mt-2
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
                  />

                </div>


                <div>

                  <label
                    htmlFor="invoice-item-unit"
                    className="
                      block
                      text-xs
                      font-semibold
                      text-[#172033]
                    "
                  >
                    Đơn vị
                  </label>


                  <input
                    id="invoice-item-unit"
                    type="text"
                    value={
                      editItemUnit
                    }
                    maxLength={20}
                    onChange={
                      (
                        event
                      ) =>
                        setEditItemUnit(
                          event.target.value
                        )
                    }
                    placeholder="kWh"
                    className="
                      mt-2
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
                  />

                </div>


                <div>

                  <label
                    htmlFor="invoice-item-unit-price"
                    className="
                      block
                      text-xs
                      font-semibold
                      text-[#172033]
                    "
                  >
                    Đơn giá
                  </label>


                  <input
                    id="invoice-item-unit-price"
                    type="number"
                    min="0"
                    step="1"
                    value={
                      editItemUnitPrice
                    }
                    onChange={
                      (
                        event
                      ) =>
                        setEditItemUnitPrice(
                          event.target.value
                        )
                    }
                    placeholder="-"
                    className="
                      mt-2
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
                  />

                </div>

              </div>


              <div>

                <label
                  htmlFor="invoice-item-amount"
                  className="
                    block
                    text-sm
                    font-semibold
                    text-[#172033]
                  "
                >
                  {editingInvoiceItem.item_type
                    === "DISCOUNT"
                      ? "Số tiền giảm"
                      : "Thành tiền"}
                </label>


                <input
                  id="invoice-item-amount"
                  type="number"
                  min="0"
                  step="1"
                  value={
                    editItemAmount
                  }
                  readOnly={
                    isAutoCalculatedInvoiceItem(
                      editingInvoiceItem.item_type
                    )
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setEditItemAmount(
                        event.target.value
                      )
                  }
                  className={
                    isAutoCalculatedInvoiceItem(
                      editingInvoiceItem.item_type
                    )

                      ? `
                        mt-2
                        h-12
                        w-full
                        cursor-not-allowed
                        rounded-xl
                        border
                        border-[#e1ddd5]
                        bg-[#f7f5f0]
                        px-3
                        text-base
                        font-semibold
                        text-[#172033]
                        outline-none
                      `

                      : `
                        mt-2
                        h-12
                        w-full
                        rounded-xl
                        border
                        border-[#ddd9cf]
                        bg-white
                        px-3
                        text-base
                        font-semibold
                        text-[#172033]
                        outline-none
                        focus:border-[#d6a64c]
                      `
                  }
                />


                {isAutoCalculatedInvoiceItem(
                  editingInvoiceItem.item_type
                )
                  &&
                  (

                    <p
                      className="
                        mt-2
                        text-xs
                        leading-5
                        text-slate-500
                      "
                    >
                      Thành tiền được tự động tính bằng
                      {" "}
                      <strong>
                        Số lượng × Đơn giá
                      </strong>.
                      Bạn chỉ cần sửa số lượng hoặc đơn giá.
                    </p>

                  )}

              </div>

            </div>


            <div
              className="
                flex
                justify-end
                gap-2
                border-t
                border-[#eeeae2]
                bg-[#fcfbf8]
                px-5
                py-4
              "
            >

              <Button
                type="button"
                variant="outline"
                disabled={
                  processing
                }
                onClick={
                  handleCloseEditItem
                }
                className="
                  h-10
                  rounded-xl
                  border-[#ddd8ce]
                "
              >
                Hủy
              </Button>


              <Button
                type="button"
                disabled={
                  processing
                }
                onClick={
                  handleSaveInvoiceItem
                }
                className="
                  h-10
                  rounded-xl
                  bg-[#d6a64c]
                  text-[#172033]
                  hover:bg-[#e0b85f]
                "
              >

                {processing ? (

                  <RefreshCw
                    className="animate-spin"
                  />

                ) : (

                  <CheckCircle2 />

                )}


                {processing
                  ? "Đang lưu..."
                  : "Lưu thay đổi"}

              </Button>

            </div>

          </div>

        </div>

      )}


      {/* =====================================================
          EDIT PAYMENT INFO MODAL
      ===================================================== */}

      {editingPayment && (

        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-slate-950/45
            p-4
          "
        >

          <div
            className="
              w-full
              max-w-xl
              overflow-hidden
              rounded-2xl
              border
              border-[#e9e2d8]
              bg-white
              shadow-2xl
            "
          >

            <div
              className="
                border-b
                border-[#eeeae2]
                px-5
                py-4
              "
            >

              <div className="flex items-start justify-between gap-4">

                <div>

                  <h2
                    className="
                      text-lg
                      font-semibold
                      text-[#172033]
                    "
                  >
                    Sửa thông tin thanh toán #{editingPayment.id}
                  </h2>


                  <p
                    className="
                      mt-1
                      text-sm
                      text-slate-500
                    "
                  >
                    Chỉ cập nhật mã giao dịch và ghi chú.
                    Số tiền thanh toán vẫn được giữ nguyên.
                  </p>

                </div>


                <button
                  type="button"
                  disabled={
                    paymentInfoProcessingId
                    === editingPayment.id
                  }
                  onClick={
                    handleCloseEditPayment
                  }
                  className="
                    rounded-lg
                    px-2
                    py-1
                    text-sm
                    font-semibold
                    text-slate-500
                    transition
                    hover:bg-slate-100
                    hover:text-[#172033]
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  Đóng
                </button>

              </div>

            </div>


            <div
              className="
                space-y-5
                px-5
                py-5
              "
            >

              <div
                className="
                  grid
                  grid-cols-1
                  gap-3
                  sm:grid-cols-2
                "
              >

                <div
                  className="
                    rounded-xl
                    border
                    border-[#ebe6dd]
                    bg-[#fcfbf8]
                    px-4
                    py-3
                  "
                >

                  <div className="text-xs text-slate-500">
                    Số tiền
                  </div>

                  <div className="mt-1 font-semibold text-emerald-700">
                    {formatMoney(
                      editingPayment.amount
                    )}
                  </div>

                </div>


                <div
                  className="
                    rounded-xl
                    border
                    border-[#ebe6dd]
                    bg-[#fcfbf8]
                    px-4
                    py-3
                  "
                >

                  <div className="text-xs text-slate-500">
                    Phương thức
                  </div>

                  <div className="mt-1 font-semibold text-[#172033]">
                    {getPaymentMethodText(
                      editingPayment.payment_method
                    )}
                  </div>

                </div>

              </div>


              <div>

                <label
                  htmlFor="payment-transaction-reference"
                  className="
                    block
                    text-sm
                    font-semibold
                    text-[#172033]
                  "
                >
                  Mã giao dịch
                </label>


                <p className="mt-1 text-xs text-slate-500">
                  Mã giao dịch do ngân hàng cung cấp.
                  Không phải mã RH của hóa đơn.
                </p>


                <input
                  id="payment-transaction-reference"
                  type="text"
                  value={
                    editTransactionReference
                  }
                  maxLength={100}
                  onChange={
                    (
                      event
                    ) =>
                      setEditTransactionReference(
                        event.target.value
                      )
                  }
                  placeholder="Ví dụ: FT260828123456"
                  className="
                    mt-2
                    h-11
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
                    placeholder:text-slate-400
                    focus:border-[#d6a64c]
                  "
                />


                <div className="mt-1 text-right text-xs text-slate-400">
                  {editTransactionReference.length}/100
                </div>

              </div>


              <div>

                <label
                  htmlFor="payment-note"
                  className="
                    block
                    text-sm
                    font-semibold
                    text-[#172033]
                  "
                >
                  Ghi chú
                </label>


                <textarea
                  id="payment-note"
                  value={
                    editPaymentNote
                  }
                  maxLength={500}
                  rows={5}
                  onChange={
                    (
                      event
                    ) =>
                      setEditPaymentNote(
                        event.target.value
                      )
                  }
                  placeholder="Ví dụ: Khách chuyển khoản ACB, đã đối chiếu..."
                  className="
                    mt-2
                    min-h-28
                    w-full
                    resize-y
                    rounded-xl
                    border
                    border-[#ddd9cf]
                    bg-white
                    px-3
                    py-3
                    text-sm
                    text-[#172033]
                    outline-none
                    transition
                    placeholder:text-slate-400
                    focus:border-[#d6a64c]
                  "
                />


                <div className="mt-1 text-right text-xs text-slate-400">
                  {editPaymentNote.length}/500
                </div>

              </div>


              <div
                className="
                  rounded-xl
                  border
                  border-amber-200
                  bg-amber-50
                  px-4
                  py-3
                  text-xs
                  leading-5
                  text-amber-800
                "
              >
                Việc cập nhật này không thay đổi số tiền,
                thời gian thanh toán hoặc trạng thái PAID của hóa đơn.
              </div>

            </div>


            <div
              className="
                flex
                justify-end
                gap-2
                border-t
                border-[#eeeae2]
                bg-[#fcfbf8]
                px-5
                py-4
              "
            >

              <Button
                type="button"
                variant="outline"
                disabled={
                  paymentInfoProcessingId
                  === editingPayment.id
                }
                onClick={
                  handleCloseEditPayment
                }
                className="
                  h-10
                  rounded-xl
                  border-[#ddd8ce]
                "
              >
                Hủy
              </Button>


              <Button
                type="button"
                disabled={
                  paymentInfoProcessingId
                  === editingPayment.id
                }
                onClick={
                  handleSavePaymentInfo
                }
                className="
                  h-10
                  rounded-xl
                  bg-[#e44763]
                  text-white
                  hover:bg-[#cf3852]
                "
              >

                {
                  paymentInfoProcessingId
                  === editingPayment.id

                    ? (

                      <RefreshCw
                        className="animate-spin"
                      />

                    )

                    : (

                      <CheckCircle2 />

                    )
                }

                {
                  paymentInfoProcessingId
                  === editingPayment.id

                    ? "Đang lưu..."

                    : "Lưu thay đổi"
                }

              </Button>

            </div>

          </div>

        </div>

      )}


      {/* =====================================================
          MODALS
      ===================================================== */}

      <AddInvoiceItemModal
        open={
          showAddItemModal
        }
        invoiceId={
          invoice.id
        }
        onClose={
          () =>
            setShowAddItemModal(
              false
            )
        }
        onUpdated={
          handleInvoiceUpdated
        }
      />


      <AddPaymentModal
        open={
          showPaymentModal
        }
        invoiceId={
          invoice.id
        }
        remainingAmount={
          remainingAmount
        }
        onClose={
          () =>
            setShowPaymentModal(
              false
            )
        }
        onCreated={
          handlePaymentCreated
        }
      />

    </>

  );

}


// =========================================================
// STAT CARD
// =========================================================

function InvoiceDetailStat({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
  success = false,
  danger = false,
  prominent = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  accent?: "gold";
  success?: boolean;
  danger?: boolean;
  prominent?: boolean;
}) {

  return (

    <Card
      className={prominent
        ? `rounded-2xl border-[#e9e2d8] shadow-sm sm:col-span-2 xl:col-span-3 ${success ? "bg-emerald-50" : "bg-red-50/60"}`
        : "rounded-2xl border-[#e9e2d8] shadow-sm"}
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

        <div className="min-w-0 flex-1">

          <div className={prominent ? "text-lg font-bold text-slate-700" : "text-[13px] leading-4 font-semibold text-[#000000]"}>
            {title}
          </div>


          <div
            className={
              prominent
                ? `mt-2 overflow-x-auto whitespace-nowrap text-[32px] font-bold ${success ? "text-emerald-800" : "text-red-800"}`
                : danger

                ? "mt-2 overflow-x-auto whitespace-nowrap text-2xl font-bold text-red-600"

                : success

                  ? "mt-2 overflow-x-auto whitespace-nowrap text-2xl font-bold text-emerald-600"

                  : "mt-2 overflow-x-auto whitespace-nowrap text-2xl font-bold text-[#172033]"
            }
          >
            {value}
          </div>


          <div className="mt-2 break-words text-[13px] leading-4 font-semibold text-[#000000]">
            {subtitle}
          </div>

        </div>


        <div
          className={
            danger

              ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"

              : success

                ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"

                : accent === "gold"

                  ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f5eddc] text-[#9a762f]"

                  : "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef1f5] text-[#20334d]"
          }
        >

          <Icon size={21} />

        </div>

      </CardContent>

    </Card>

  );

}


// =========================================================
// DETAIL ROW
// =========================================================

function InvoiceDetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {

  return (

    <div
      className={label === "Nội dung chuyển khoản"
        ? "my-3 flex flex-col items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
        : `
        flex
        items-center
        justify-between
        gap-4
        border-b
        border-[#f0ece5]
        py-3
        last:border-0
      `}
    >

      <span className="text-[15px] leading-5 font-semibold text-[#000000]">
        {label}
      </span>


      <strong
        className="
          max-w-[62%]
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
// PAYMENT MINI STAT
// =========================================================

function PaymentMiniStat({
  label,
  value,
  success = false,
  danger = false,
}: {
  label: string;
  value: string;
  success?: boolean;
  danger?: boolean;
}) {

  return (

    <div
      className="
        rounded-xl
        border
        border-[#ebe6dd]
        bg-white
        px-4
        py-4
      "
    >

      <div className="text-[13px] leading-4 font-semibold text-[#000000]">
        {label}
      </div>


      <strong
        className={
          danger

            ? "mt-1 block text-lg text-red-600"

            : success

              ? "mt-1 block text-lg text-emerald-700"

              : "mt-1 block text-lg text-[#172033]"
        }
      >
        {value}
      </strong>

    </div>

  );

}


// =========================================================
// STATUS BADGES
// =========================================================

function InvoiceDetailStatusBadge({
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
          border-[#e44763]/40
          bg-[#e44763]/15
          text-[#ffb7c4]
        "
      >
        {getStatusText(
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
          border-white/15
          bg-white/5
          text-slate-300
        "
      >
        {getStatusText(
          status
        )}
      </Badge>

    );

  }


  return (

    <Badge
      variant="outline"
      className="
        border-[#d6a64c]/40
        bg-[#d6a64c]/10
        text-[#efd38f]
      "
    >
      {getStatusText(
        status
      )}
    </Badge>

  );

}


function PaymentDetailStatusBadge({
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
          border-emerald-400/30
          bg-emerald-400/10
          text-emerald-200
        "
      >
        {getPaymentText(
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
          border-amber-400/30
          bg-amber-400/10
          text-amber-200
        "
      >
        {getPaymentText(
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
          border-red-400/30
          bg-red-400/10
          text-red-200
        "
      >
        {getPaymentText(
          status
        )}
      </Badge>

    );

  }


  return (

    <Badge
      variant="outline"
      className="
        border-white/15
        bg-white/5
        text-slate-300
      "
    >
      {getPaymentText(
        status
      )}
    </Badge>

  );

}


// =========================================================
// PAYMENT TABLE HEAD
// =========================================================

function PaymentTableHead({
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


export default InvoiceDetails;
