import {
  Link,
} from "react-router";

import {
  AlertCircle,
  ArrowUpRight,
  CircleDollarSign,
  ReceiptText,
} from "lucide-react";

import type {
  Invoice,
} from "../../types/invoice";


// =========================================================
// HELPERS
// =========================================================

function formatMoney(
  value: number
) {

  return (
    new Intl.NumberFormat(
      "vi-VN"
    ).format(
      value
    )
    +
    " đ"
  );

}


function getInvoiceStatusText(
  status: string
) {

  if (
    status === "DRAFT"
  ) {
    return "Nháp";
  }


  if (
    status === "ISSUED"
  ) {
    return "Đã phát hành";
  }


  if (
    status === "CANCELLED"
  ) {
    return "Đã hủy";
  }


  return status;

}


function getPaymentStatusText(
  status?: string
) {

  if (
    status === "PAID"
  ) {
    return "Đã thanh toán";
  }


  if (
    status === "PARTIALLY_PAID"
  ) {
    return "Thanh toán một phần";
  }


  if (
    status === "UNPAID"
  ) {
    return "Chưa thanh toán";
  }


  return "-";

}


// =========================================================
// COMPONENT
// =========================================================

function MobileInvoiceCard({
  invoice,
  roomCode,
}: {
  invoice: Invoice;

  roomCode: string;
}) {

  const cancelled =
    invoice.status
    === "CANCELLED";


  const paymentClass =

    invoice.payment_status
    === "PAID"

      ? `
        bg-emerald-50
        text-emerald-700
      `

      : invoice.payment_status
        === "PARTIALLY_PAID"

        ? `
          bg-amber-50
          text-amber-700
        `

        : `
          bg-red-50
          text-red-600
        `;


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

          invoice.status
          === "ISSUED"

            ? "h-1 bg-[#e44763]"

            : invoice.status
              === "CANCELLED"

              ? "h-1 bg-slate-400"

              : "h-1 bg-[#d6a64c]"
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
              className="
                min-w-0
              "
            >

              <h2
                className="
                  truncate
                  text-lg
                  font-bold
                  tracking-tight
                  text-[#172033]
                "
              >
                {roomCode}
              </h2>


              <div
                className="
                  mt-0.5
                  text-xs
                  text-slate-500
                "
              >
                Tháng {invoice.month}/{invoice.year}
              </div>

            </div>

          </div>


          <span
            className="
              shrink-0
              rounded-full
              bg-slate-100
              px-2.5
              py-1
              text-[11px]
              font-semibold
              text-slate-600
            "
          >
            {getInvoiceStatusText(
              invoice.status
            )}
          </span>

        </div>


        <div
          className="
            mt-4
            flex
            items-center
            justify-between
            gap-3
            rounded-2xl
            bg-[#fffaf0]
            px-4
            py-3.5
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
                font-medium
                text-[#8a6726]
              "
            >
              Tổng hóa đơn
            </div>


            <div
              className="
                mt-1
                truncate
                text-xl
                font-bold
                tracking-tight
                text-[#172033]
              "
            >
              {formatMoney(
                invoice.total_amount
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
              bg-[#f5eddc]
              text-[#9a762f]
            "
          >

            <CircleDollarSign
              size={19}
            />

          </div>

        </div>


        <div
          className="
            mt-4
            flex
            items-center
            justify-between
            gap-3
          "
        >

          <div
            className="
              text-xs
              text-slate-500
            "
          >
            HĐ #{invoice.id}
            {" • "}
            v{invoice.version}
          </div>


          {!cancelled && (

            <span
              className={`
                shrink-0
                rounded-full
                px-2.5
                py-1
                text-[11px]
                font-semibold
                ${paymentClass}
              `}
            >
              {getPaymentStatusText(
                invoice.payment_status
              )}
            </span>

          )}

        </div>


        {cancelled && (

          <div
            className="
              mt-3
              flex
              items-center
              gap-2
              rounded-xl
              bg-slate-50
              px-3
              py-2.5
              text-xs
              text-slate-600
            "
          >

            <AlertCircle
              size={15}
              className="shrink-0"
            />

            Hóa đơn này đã bị hủy.

          </div>

        )}


        <Link
          to={
            `/invoices/${invoice.id}`
          }
          className="
            mt-4
            inline-flex
            h-11
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
            active:bg-[#20334d]
          "
        >

          Xem chi tiết

          <ArrowUpRight
            size={16}
          />

        </Link>

      </div>

    </article>

  );

}


export default MobileInvoiceCard;