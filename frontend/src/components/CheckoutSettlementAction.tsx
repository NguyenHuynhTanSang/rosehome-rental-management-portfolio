import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { apiGet, apiPost } from "../api/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type {
  Contract,
  ContractEndRequest,
} from "../types/contract";
import type {
  CheckoutAmounts,
  CheckoutDepositApplyRequest,
  CheckoutInput,
  CheckoutPreview,
  CheckoutSnapshot,
} from "../types/checkoutSettlement";
import type { DepositSummary } from "../types/deposit";
import type { Invoice } from "../types/invoice";

const money = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + " đ";
const inputClass = "mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900";
const modes = { NONE: "Không thu thêm tiền phòng", FULL_MONTH: "Thu nguyên tháng", PRORATED: "Tính theo ngày", CUSTOM: "Nhập số tiền khác" } as const;
type Context = {
  invoice_id: number | null; invoice_status: string | null; invoice_version: number | null; total_paid: number;
  suggested_checkout_type: "EARLY" | "ON_TIME";
  monthly_rent: number; rent_cycle: number; rent_anchor_year: number; rent_anchor_month: number;
  electricity_rate: number; water_fee: number; management_fee: number;
  deposit: DepositSummary;
  rent_history: { id: number; year: number; month: number; version: number; status: string; amount: number; description: string }[];
};
function today() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}
function errorText(e: unknown) { return e instanceof Error ? e.message : "Không thể tải dữ liệu quyết toán."; }

export function CheckoutSummary({ snapshot: s }: { snapshot: CheckoutAmounts }) {
  const checkoutTypeLabel =
    s.checkout_type === "EARLY"
      ? "Trả phòng trước hạn – mất cọc"
      : s.checkout_type === "ON_TIME"
        ? "Trả phòng đúng hạn – hoàn cọc sau khấu trừ"
        : "Snapshot cũ – chưa phân loại";

  return <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-800">
    <p>Ngày trả phòng: <strong>{s.checkout_date}</strong></p>
    <p>Hình thức trả phòng: <strong>{checkoutTypeLabel}</strong></p>
    <p>Điện cuối: {s.electricity_old_reading} → {s.electricity_new_reading} = {s.electricity_consumption} kWh × {money(s.electricity_rate)}</p>
    <p>Mốc điện đã được đưa vào hóa đơn #{s.baseline_invoice_id}. Đã tính tiền không đồng nghĩa đã thanh toán.</p>
    <dl className="grid grid-cols-2 gap-2">
      <dt>Điện phát sinh cuối {s.electricity_enabled ? "" : "(không thu)"}</dt><dd className="text-right">{money(s.electricity_amount)}</dd>
      <dt>Điện giữ lại từ hóa đơn cũ</dt><dd className="text-right">{money(s.carried_electricity_amount)}</dd>
      <dt>Tiền phòng ({modes[s.rent_mode as keyof typeof modes]})</dt><dd className="text-right">{money(s.rent_amount)}</dd>
      <dt>Nước</dt><dd className="text-right">{money(s.water_amount)}</dd>
      <dt>Quản lý</dt><dd className="text-right">{money(s.management_amount)}</dd>
      <dt>Khoản khác</dt><dd className="text-right">{money(s.other_amount)}</dd>
      <dt className="font-bold">Tổng quyết toán</dt><dd className="text-right font-bold">{money(s.total_amount)}</dd>
    </dl>
    {s.rent_period_start && <p>Khoảng tiền phòng: {s.rent_period_start} → {s.rent_period_end}. Tính ngày gồm cả ngày đầu và ngày cuối.</p>}
    {s.checkout_type && <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="font-medium">Kế hoạch xử lý cọc</p>
      <p>Cọc đang giữ lúc chuẩn bị: {money(s.deposit_balance_at_prepare ?? 0)}</p>
      <p>Mất cọc: {money(s.deposit_forfeit_amount ?? 0)}</p>
      <p>Dự kiến dùng cọc bù quyết toán: {money(s.deposit_offset_amount ?? 0)}</p>
      <p>Dự kiến hoàn lại: {money(s.deposit_refund_amount ?? 0)}</p>
      <p>Khách còn phải trả riêng: {money(s.tenant_due_after_deposit ?? 0)}</p>
    </div>}
    <p className="whitespace-pre-wrap break-words">Lý do: {s.reason}</p>
  </div>;
}

export default function CheckoutSettlementAction({
  contract,
  roomCode,
  tenantName,
  onEnded,
  onSettlementPresenceChange,
}: {
  contract: Contract;
  roomCode: string;
  tenantName: string;
  onEnded?: (contract: Contract) => void;
  onSettlementPresenceChange?: (
    present: boolean | null
  ) => void;
}) {
  const [saved, setSaved] = useState<CheckoutSnapshot | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let active = true;

    setLoaded(false);
    setError("");
    setSaved(null);

    onSettlementPresenceChange?.(
      null
    );

    apiGet<CheckoutSnapshot | null>(
      `/contracts/${contract.id}/checkout-settlement`
    )
      .then(value => {
        if (active) {
          setSaved(value);
          setLoaded(true);

          onSettlementPresenceChange?.(
            value !== null
          );
        }
      })
      .catch(e => {
        if (active) {
          setError(
            errorText(e)
          );
        }
      });

    return () => {
      active = false;
    };
  }, [
    contract.id,
    retry,
    onSettlementPresenceChange,
  ]);
  return <section className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-semibold text-slate-900">Quyết toán & trả phòng</h2>
        <p className="mt-1 text-sm text-slate-600">{
          saved
            ? contract.status === "ENDED"
              ? "Đã hoàn tất trả phòng và kết thúc hợp đồng."
              : saved.deposit_execution_status === "APPLIED"
                ? "Cọc đã xử lý · chờ hoàn tất thanh toán và kết thúc hợp đồng."
                : "Đã lưu snapshot · chờ phát hành hóa đơn và xử lý cọc."
            : "Chuẩn bị hóa đơn cuối để kiểm tra trước khi phát hành."
        }</p>
      </div>
      <Button type="button" disabled={!loaded || (!saved && contract.status !== "ACTIVE")} onClick={() => setOpen(true)}>
        {saved ? "Xem quyết toán" : "Quyết toán & trả phòng"}
      </Button>
    </div>
    {error && <div role="alert" className="mt-2 text-sm text-red-700">{error} <Button type="button" variant="outline" onClick={() => setRetry(n => n + 1)}>Thử lại</Button></div>}
    {!loaded && !error && <p className="mt-2 text-sm" role="status">Đang tải quyết toán…</p>}
    {open && (
      <CheckoutWizard
        key={contract.id}
        contract={contract}
        roomCode={roomCode}
        tenantName={tenantName}
        saved={saved}
        onSaved={value => {
          setSaved(value);

          onSettlementPresenceChange?.(
            true
          );
        }}
        onEnded={onEnded}
        onClose={() => setOpen(false)}
      />
    )}
  </section>;
}

function CheckoutWizard({
  contract,
  roomCode,
  tenantName,
  saved,
  onSaved,
  onEnded,
  onClose,
}: {
  contract: Contract;
  roomCode: string;
  tenantName: string;
  saved: CheckoutSnapshot | null;
  onSaved: (s: CheckoutSnapshot) => void;
  onEnded?: (contract: Contract) => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(today);
  const [reading, setReading] = useState("");
  const [checkoutType, setCheckoutType] = useState<CheckoutInput["checkout_type"] | "">("");
  const [mode, setMode] = useState<CheckoutInput["rent_mode"] | "">("");
  const [start, setStart] = useState(today().slice(0, 8) + "01");
  const [end, setEnd] = useState(today);
  const [custom, setCustom] = useState("");
  const [electricity, setElectricity] = useState(true);
  const [water, setWater] = useState(true);
  const [management, setManagement] = useState(false);
  const [otherEnabled, setOtherEnabled] = useState(false);
  const [other, setOther] = useState("");
  const [reason, setReason] = useState("");
  const [context, setContext] = useState<Context | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [step, setStep] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const [applyConfirmed, setApplyConfirmed] = useState(false);

  const [
    checkoutInvoice,
    setCheckoutInvoice,
  ] = useState<Invoice | null>(
    null
  );

  const [
    invoiceLoading,
    setInvoiceLoading,
  ] = useState(false);

  const [
    invoiceError,
    setInvoiceError,
  ] = useState("");

  const [
    finishConfirmed,
    setFinishConfirmed,
  ] = useState(false);

  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [previewInput, setPreviewInput] = useState<CheckoutInput | null>(null);
  const sending = useRef(false);

  useEffect(() => {
    if (saved) return;
    let active = true;
    setContext(null); setPreview(null); setPreviewInput(null); setConfirmed(false); setError("");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    setLoading(true);
    apiGet<Context>(`/contracts/${contract.id}/checkout-context?checkout_date=${date}`)
      .then(v => { if (active) setContext(v); })
      .catch(e => { if (active) setError(errorText(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [date, contract.id, retry, saved]);

  useEffect(() => {
    let active = true;

    setCheckoutInvoice(
      null
    );

    setInvoiceError("");
    setFinishConfirmed(false);

    if (
      !saved?.invoice_id
      ||
      saved.deposit_execution_status
      !== "APPLIED"
    ) {
      return () => {
        active = false;
      };
    }

    setInvoiceLoading(true);

    apiGet<Invoice>(
      `/invoices/${saved.invoice_id}`
    )
      .then(value => {
        if (active) {
          setCheckoutInvoice(
            value
          );
        }
      })
      .catch(e => {
        if (active) {
          setInvoiceError(
            errorText(e)
          );
        }
      })
      .finally(() => {
        if (active) {
          setInvoiceLoading(
            false
          );
        }
      });

    return () => {
      active = false;
    };
  }, [
    saved?.invoice_id,
    saved?.deposit_execution_status,
  ]);


  const invoiceReady =
    checkoutInvoice?.status
      === "ISSUED"
    &&
    checkoutInvoice?.payment_status
      === "PAID";


  function numeric(value: string, label: string) {
    const n = Number(value);
    if (!value.trim() || !Number.isSafeInteger(n) || n < 0) throw new Error(label + " phải là số nguyên không âm.");
    return n;
  }
  function buildInput(): CheckoutInput {
    if (!context || !checkoutType) throw new Error("Hãy chọn rõ hình thức trả phòng.");
    if (!mode) throw new Error("Hãy chọn rõ cách tính tiền phòng.");
    if (reason.trim().length < 3) throw new Error("Vui lòng nhập lý do quyết toán (ít nhất 3 ký tự).");
    if (reason.length > 500) throw new Error("Lý do quyết toán tối đa 500 ký tự.");
    return { room_id: contract.room_id, invoice_id: context.invoice_id, checkout_date: date,
      checkout_type: checkoutType,
      move_out_electric_reading: numeric(reading, "Chỉ số trả phòng"), rent_mode: mode,
      rent_period_start: mode === "PRORATED" ? start : null, rent_period_end: mode === "PRORATED" ? end : null,
      custom_rent_amount: mode === "CUSTOM" ? numeric(custom, "Tiền phòng") : 0,
      include_electricity: electricity, include_water: water, include_management: management,
      other_amount: otherEnabled ? numeric(other, "Khoản khác") : 0, reason: reason.trim() };
  }
  async function next() {
    setError("");
    try {
      if (step === 1) {
        const n = numeric(reading, "Chỉ số trả phòng");
        if (contract.move_in_electric_reading != null && n < contract.move_in_electric_reading)
          throw new Error("Chỉ số trả phòng không được nhỏ hơn chỉ số nhận phòng.");
        if (!context || loading) throw new Error("Hãy chờ tải dữ liệu kỳ trả phòng.");
        if (!checkoutType) throw new Error("Bạn cần chọn rõ trả trước hạn hay trả đúng hạn.");
      }
      if (step === 2 && !mode) throw new Error("Bạn cần chọn rõ cách tính tiền phòng.");
      if (step === 3) {
        const input = buildInput();
        setBusy(true);
        const result = await apiPost<CheckoutPreview, CheckoutInput>(`/contracts/${contract.id}/checkout-preview`, input);
        setPreview(result); setPreviewInput(input); setConfirmed(false);
      }
      setStep(s => s + 1);
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }
  async function prepare() {
    if (sending.current || busy || !confirmed || !preview || !previewInput || step !== 5) return;
    sending.current = true; setBusy(true); setError("");
    try {
      const result = await apiPost<CheckoutSnapshot, CheckoutInput & { preview_token: string; confirmed: true }>(
        `/contracts/${contract.id}/checkout-prepare`, { ...previewInput, preview_token: preview.preview_token, confirmed: true });
      onSaved(result);
    } catch (e) { setError(errorText(e)); }
    finally { sending.current = false; setBusy(false); }
  }


  async function applyDepositPlan() {
    if (
      sending.current
      ||
      busy
      ||
      !saved
      ||
      saved.deposit_execution_status === "APPLIED"
      ||
      !applyConfirmed
    ) {
      return;
    }

    sending.current = true;
    setBusy(true);
    setError("");

    try {
      const result = await apiPost<
        CheckoutSnapshot,
        CheckoutDepositApplyRequest
      >(
        `/contracts/${contract.id}/checkout-apply-deposit`,
        {
          confirmed: true,
        }
      );

      onSaved(result);
      setApplyConfirmed(false);
    } catch (e) {
      setError(errorText(e));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  async function refreshCheckoutInvoice() {
    if (
      invoiceLoading
      ||
      !saved?.invoice_id
    ) {
      return;
    }

    setInvoiceLoading(true);
    setInvoiceError("");

    try {
      const latest =
        await apiGet<Invoice>(
          `/invoices/${saved.invoice_id}`
        );

      setCheckoutInvoice(
        latest
      );

      setFinishConfirmed(
        false
      );
    } catch (e) {
      setInvoiceError(
        errorText(e)
      );
    } finally {
      setInvoiceLoading(
        false
      );
    }
  }


  async function finalizeCheckout() {
    if (
      sending.current
      ||
      busy
      ||
      !saved
      ||
      saved.deposit_execution_status
        !== "APPLIED"
      ||
      !saved.invoice_id
      ||
      !finishConfirmed
      ||
      contract.status
        !== "ACTIVE"
    ) {
      return;
    }

    sending.current = true;
    setBusy(true);
    setError("");
    setInvoiceError("");

    try {
      // Always re-read immediately before finalization.
      // The backend remains the final source of truth.
      const latestInvoice =
        await apiGet<Invoice>(
          `/invoices/${saved.invoice_id}`
        );

      setCheckoutInvoice(
        latestInvoice
      );

      if (
        latestInvoice.status
          !== "ISSUED"
        ||
        latestInvoice.payment_status
          !== "PAID"
      ) {
        throw new Error(
          "Hóa đơn quyết toán chưa được thanh toán đầy đủ. "
          +
          "Hãy ghi nhận đủ thanh toán rồi tải lại trạng thái."
        );
      }

      const data:
        ContractEndRequest = {

        end_date:
          saved.checkout_date,

        move_out_electric_reading:
          saved.move_out_electric_reading,

        allow_unsettled_deposit:
          false,
      };

      const endedContract =
        await apiPost<
          Contract,
          ContractEndRequest
        >(
          `/contracts/${contract.id}/end`,
          data
        );

      onEnded?.(
        endedContract
      );

      setFinishConfirmed(
        false
      );

      onClose();
    } catch (e) {
      setError(
        errorText(e)
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }


  const billableDays = start && end ? Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1 : 0;
  const daysInMonth = date ? new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0).getDate() : 0;
  return <Dialog open onOpenChange={value => { if (!value && !busy) onClose(); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl" showCloseButton={!busy}>
      <DialogHeader><DialogTitle>Quyết toán & trả phòng · {roomCode}</DialogTitle>
        <DialogDescription>{tenantName} · Hợp đồng #{contract.id}{!saved && ` · Bước ${step}/5`}</DialogDescription></DialogHeader>
      {saved ? <div className="space-y-4">
        <CheckoutSummary snapshot={saved} />

        <div className={`rounded-xl border p-4 text-sm ${
          saved.deposit_execution_status === "APPLIED"
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}>
          <p className="font-semibold">
            Tiền cọc: {
              saved.deposit_execution_status === "APPLIED"
                ? "Đã xử lý"
                : "Chờ xử lý"
            }
          </p>

          {saved.deposit_execution_status === "PENDING" && saved.checkout_type && <>
            <p className="mt-2">
              Trước khi xử lý cọc, hãy mở hóa đơn quyết toán, kiểm tra và phát hành hóa đơn.
              Backend chỉ cho xử lý khi hóa đơn ở trạng thái ISSUED.
            </p>

            <div className="mt-3 rounded-lg border border-amber-200 bg-white p-3">
              {saved.checkout_type === "EARLY" ? <>
                <p className="font-medium">Trả phòng trước hạn – mất cọc</p>
                <p className="mt-1">
                  Mất toàn bộ {money(saved.deposit_forfeit_amount ?? 0)} tiền cọc.
                  Khoản cọc này không thanh toán hóa đơn.
                  Khách vẫn phải trả riêng {money(saved.tenant_due_after_deposit ?? 0)}.
                </p>
              </> : <>
                <p className="font-medium">Trả phòng đúng hạn – khấu trừ và hoàn cọc</p>
                <p className="mt-1">
                  Dùng {money(saved.deposit_offset_amount ?? 0)} cọc để thanh toán hóa đơn,
                  hoàn {money(saved.deposit_refund_amount ?? 0)},
                  khách còn phải trả {money(saved.tenant_due_after_deposit ?? 0)}.
                </p>
              </>}
            </div>

            <label className="mt-3 flex items-start gap-3 rounded-lg border border-amber-300 bg-white p-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={applyConfirmed}
                disabled={busy}
                onChange={e => setApplyConfirmed(e.target.checked)}
              />

              <span>
                Tôi đã kiểm tra hóa đơn và xác nhận thực hiện đúng kế hoạch tiền cọc ở trên.
                Thao tác này sẽ tạo giao dịch tài chính thật và không dùng để kết thúc hợp đồng tự động.
              </span>
            </label>

            <Button
              type="button"
              className="mt-3"
              disabled={busy || !applyConfirmed}
              onClick={applyDepositPlan}
            >
              {busy ? "Đang xử lý tiền cọc…" : "Xử lý tiền cọc"}
            </Button>
          </>}

          {saved.deposit_execution_status === "PENDING" && !saved.checkout_type && (
            <p className="mt-2 text-red-700">
              Snapshot cũ chưa có phân loại trả phòng. Không thể tự động xử lý tiền cọc.
            </p>
          )}

          {saved.deposit_execution_status === "APPLIED" && <>
            <p className="mt-2">
              Kế hoạch cọc đã được ghi nhận.
              Số dư cọc của checkout phải về 0 trước khi kết thúc hợp đồng.
            </p>

            {saved.deposit_processed_at && (
              <p className="mt-1">
                Thời điểm xử lý: {new Date(saved.deposit_processed_at).toLocaleString("vi-VN")}
              </p>
            )}

            {saved.deposit_forfeit_transaction_id && (
              <p>Mã giao dịch mất cọc: #{saved.deposit_forfeit_transaction_id}</p>
            )}

            {saved.deposit_deduction_transaction_id && (
              <p>Mã giao dịch khấu trừ: #{saved.deposit_deduction_transaction_id}</p>
            )}

            {saved.deposit_refund_transaction_id && (
              <p>Mã giao dịch hoàn cọc: #{saved.deposit_refund_transaction_id}</p>
            )}

            {saved.deposit_payment_id && (
              <p>Payment bằng tiền cọc: #{saved.deposit_payment_id}</p>
            )}

            {(saved.tenant_due_after_deposit ?? 0) > 0 ? (
              <p className="mt-2 font-medium">
                Khách còn phải thanh toán {money(saved.tenant_due_after_deposit ?? 0)}.
              </p>
            ) : (
              <p className="mt-2 font-medium">
                Không còn phần thiếu theo kế hoạch tiền cọc.
              </p>
            )}

            <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    Trạng thái hóa đơn quyết toán
                  </p>

                  {invoiceLoading ? (
                    <p className="mt-1">
                      Đang kiểm tra…
                    </p>
                  ) : checkoutInvoice ? (
                    <p className="mt-1">
                      Hóa đơn #{checkoutInvoice.id}
                      {" · "}
                      {checkoutInvoice.status}
                      {" · "}
                      {checkoutInvoice.payment_status ?? "UNKNOWN"}
                    </p>
                  ) : (
                    <p className="mt-1">
                      Chưa tải được trạng thái hóa đơn.
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    busy
                    ||
                    invoiceLoading
                    ||
                    !saved.invoice_id
                  }
                  onClick={
                    refreshCheckoutInvoice
                  }
                >
                  {invoiceLoading
                    ? "Đang kiểm tra…"
                    : "Kiểm tra lại"}
                </Button>
              </div>

              {invoiceError && (
                <p className="mt-2 text-red-700">
                  {invoiceError}
                </p>
              )}

              {!invoiceLoading
                &&
                checkoutInvoice
                &&
                !invoiceReady
                &&
                contract.status === "ACTIVE"
                &&
                (
                  <p className="mt-2 font-medium text-amber-700">
                    Chưa thể hoàn tất trả phòng.
                    Hóa đơn phải ISSUED và PAID đầy đủ.
                  </p>
                )}

              {contract.status === "ENDED" ? (
                <div className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 font-medium text-emerald-800">
                  Hợp đồng đã kết thúc và phòng đã được trả.
                </div>
              ) : invoiceReady ? (
                <div className="mt-3 space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p>
                      Ngày trả phòng cố định:
                      {" "}
                      <strong>
                        {saved.checkout_date}
                      </strong>
                    </p>

                    <p>
                      Chỉ số điện trả phòng cố định:
                      {" "}
                      <strong>
                        {saved.move_out_electric_reading}
                      </strong>
                    </p>

                    <p className="mt-1 text-slate-600">
                      Hai giá trị này lấy trực tiếp từ snapshot quyết toán
                      và không nhập lại ở bước kết thúc.
                    </p>
                  </div>

                  <label className="flex items-start gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={
                        finishConfirmed
                      }
                      disabled={busy}
                      onChange={
                        e =>
                          setFinishConfirmed(
                            e.target.checked
                          )
                      }
                    />

                    <span>
                      Tôi xác nhận hóa đơn đã thanh toán đầy đủ
                      và hoàn tất trả phòng theo snapshot trên.
                      Thao tác này sẽ kết thúc hợp đồng
                      và chuyển phòng về trạng thái trống.
                    </span>
                  </label>

                  <Button
                    type="button"
                    disabled={
                      busy
                      ||
                      !finishConfirmed
                      ||
                      !invoiceReady
                    }
                    onClick={
                      finalizeCheckout
                    }
                  >
                    {busy
                      ? "Đang hoàn tất trả phòng…"
                      : "Hoàn tất trả phòng"}
                  </Button>
                </div>
              ) : null}
            </div>
          </>}
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {saved.invoice_id && (
          <Link
            className="inline-block rounded-xl bg-slate-900 px-4 py-3 font-medium text-white"
            to={`/invoices/${saved.invoice_id}`}
          >
            Xem hóa đơn quyết toán
          </Link>
        )}
      </div> : <>
        <fieldset disabled={busy} className="space-y-4">
          {step === 1 && <>
            <label className="block">Ngày trả phòng<input type="date" className={inputClass} value={date} min={contract.start_date}
              onChange={e => { setDate(e.target.value); setStart(e.target.value.slice(0, 8) + "01"); setEnd(e.target.value); }} /></label>
            <p className="text-sm">Chỉ số nhận phòng: {contract.move_in_electric_reading ?? "Chưa có"}. Điện cuối sẽ dựa trên mốc điện đã được đưa vào hóa đơn, không tính lại toàn bộ thời gian thuê.</p>
            <label className="block">Chỉ số điện trả phòng<input type="number" inputMode="numeric" min="0" step="1" className={inputClass} value={reading} onChange={e => setReading(e.target.value)} /></label>
            {context && <p className="text-sm">{context.invoice_id ? `Hóa đơn #${context.invoice_id} · v${context.invoice_version} · ${context.invoice_status} · Đã thu ${money(context.total_paid)}` : "Chưa có hóa đơn trong kỳ trả phòng."}</p>}

            {context && <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
              <p>
                Hệ thống gợi ý: <strong>
                  {context.suggested_checkout_type === "EARLY"
                    ? "Trả phòng trước hạn – mất cọc"
                    : "Trả phòng đúng hạn – hoàn cọc sau khấu trừ"}
                </strong>. Đây chỉ là gợi ý; admin phải xác nhận theo thỏa thuận thực tế.
              </p>

              <label className="flex items-start gap-3 rounded-xl border bg-white p-3">
                <input
                  className="mt-1"
                  type="radio"
                  name="checkout-type"
                  checked={checkoutType === "EARLY"}
                  onChange={() => setCheckoutType("EARLY")}
                />
                <span>
                  <strong>Trả phòng trước hạn – mất cọc</strong><br />
                  Toàn bộ cọc đang giữ bị mất. Cọc không dùng để bù điện, nước, phí hoặc khoản khác; khách vẫn thanh toán phần quyết toán riêng.
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-xl border bg-white p-3">
                <input
                  className="mt-1"
                  type="radio"
                  name="checkout-type"
                  checked={checkoutType === "ON_TIME"}
                  onChange={() => setCheckoutType("ON_TIME")}
                />
                <span>
                  <strong>Trả phòng đúng hạn – hoàn cọc sau khấu trừ</strong><br />
                  Cọc được dự kiến dùng bù phần quyết toán; phần dư hoàn lại, phần thiếu khách trả thêm.
                </span>
              </label>
            </div>}
          </>}
          {step === 2 && <>
            <p>Giá tháng: {money(context?.monthly_rent ?? contract.monthly_rent)}. Chu kỳ {context?.rent_cycle} tháng, anchor {context?.rent_anchor_month}/{context?.rent_anchor_year}.</p>
            <p className="rounded-xl bg-amber-50 p-3 text-sm">Lịch thu không chứng minh đã thu tiền. Hãy đối chiếu lịch sử và chọn rõ cách tính; hệ thống không tự miễn tiền phòng.</p>
            <details className="text-sm"><summary className="cursor-pointer">Lịch sử đã tính tiền phòng (không bao gồm hóa đơn hủy)</summary>
              {context?.rent_history.map(i => <p key={i.id} className="mt-2"><Link className="underline" to={`/invoices/${i.id}`}>#{i.id} v{i.version}</Link> · {i.month}/{i.year} · {i.status} · {money(i.amount)} · {i.description}{i.id === context.invoice_id ? " — hóa đơn sẽ được điều chỉnh, không dùng làm bằng chứng khoản vẫn còn hiệu lực" : ""}</p>)}
              {!context?.rent_history.length && <p>Chưa có bằng chứng tiền phòng từ lịch sử.</p>}
            </details>
            {Object.entries(modes).map(([key, label]) => <label key={key} className="flex items-center gap-3 rounded-xl border p-3"><input type="radio" name="rent-mode" checked={mode === key} onChange={() => setMode(key as CheckoutInput["rent_mode"])} />{label}</label>)}
            {mode === "PRORATED" && <div className="space-y-2"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label>Từ ngày<input className={inputClass} type="date" value={start} onChange={e => setStart(e.target.value)} /></label>
              <label>Đến ngày<input className={inputClass} type="date" value={end} onChange={e => setEnd(e.target.value)} /></label>
            </div><p className="text-sm">{money(contract.monthly_rent)} / {daysInMonth} ngày × {billableDays} ngày (gồm hai đầu). Làm tròn đến đồng, 0,5 làm tròn lên; số tiền chính thức ở preview.</p></div>}
            {mode === "CUSTOM" && <label className="block">Số tiền phòng điều chỉnh<input type="number" min="0" step="1" className={inputClass} value={custom} onChange={e => setCustom(e.target.value)} /></label>}
          </>}
          {step === 3 && <>
            <label className="flex items-center gap-2"><input type="checkbox" checked={electricity} onChange={e => setElectricity(e.target.checked)} />Điện (giữ khoản cũ và cộng phần cuối chưa tính tiền)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={water} onChange={e => setWater(e.target.checked)} />Nước: {money(context?.water_fee ?? 0)}</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={management} onChange={e => setManagement(e.target.checked)} />Phí quản lý: {money(context?.management_fee ?? 0)}</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={otherEnabled} onChange={e => setOtherEnabled(e.target.checked)} />Khoản khác</label>
            {otherEnabled && <label className="block">Số tiền khoản khác<input type="number" min="0" step="1" className={inputClass} value={other} onChange={e => setOther(e.target.value)} /></label>}
            <label className="block">Lý do / thỏa thuận quyết toán<textarea maxLength={500} className={inputClass} value={reason} onChange={e => setReason(e.target.value)} /><span className="mt-1 block text-sm text-slate-600">Tối đa 500 ký tự.</span></label>
          </>}
          {step >= 4 && preview && <>
            <CheckoutSummary snapshot={preview.snapshot} />
            <div className="rounded-xl border border-amber-300 p-3 text-sm">
              {preview.action === "PRESERVE"
                ? `Hóa đơn #${preview.invoice_id} v${preview.invoice_version} đã thanh toán đầy đủ sẽ được GIỮ NGUYÊN; tạo hóa đơn quyết toán v${(preview.invoice_version ?? 0) + 1} DRAFT chỉ cho phần chưa thu.`
                : preview.action === "REPLACE"
                  ? `Hóa đơn #${preview.invoice_id} v${preview.invoice_version} ISSUED sẽ bị HỦY; tạo replacement v${(preview.invoice_version ?? 0) + 1} DRAFT.`
                  : preview.action === "UPDATE"
                    ? `Cập nhật toàn bộ các khoản của hóa đơn nháp #${preview.invoice_id}.`
                    : "Tạo hóa đơn quyết toán mới ở trạng thái DRAFT."}

              {preview.previous_items.length > 0 && (
                <div className="mt-2">
                  <p>
                    {preview.action === "PRESERVE"
                      ? "Các khoản dưới đây thuộc hóa đơn đã thanh toán và được giữ nguyên; quyết toán không thu lại:"
                      : "Các khoản cũ được thay bằng bảng quyết toán ở trên:"}
                  </p>

                  {preview.previous_items.map(
                    (
                      item,
                      index
                    ) => (
                      <p key={index}>
                        {item.description || item.type}: {money(item.amount)}
                      </p>
                    )
                  )}
                </div>
              )}
            </div>
            {context && <div className="text-sm"><p>Cọc yêu cầu: {money(context.deposit.required_amount)}</p>
              <p>Đã thu: {money(context.deposit.total_collected)} · Đã hoàn: {money(context.deposit.total_refunded)}</p>
              <p>Khấu trừ: {money(context.deposit.total_deducted)} · Mất cọc: {money(context.deposit.total_forfeited)}</p>
              <p>Đang giữ: {money(context.deposit.current_balance)}</p>
              <p className="mt-2">Cọc sẽ được xử lý sau khi hóa đơn quyết toán được phát hành.</p></div>}
            {step === 5 && <label className="flex items-start gap-3 rounded-xl border p-3"><input className="mt-1" type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /><span>Tôi xác nhận các khoản, lý do, ngày trả và thao tác hóa đơn ở trên. Chỉ chuẩn bị DRAFT; snapshot được giữ nguyên để review. Không phát hành, thu tiền, xử lý cọc hoặc trả phòng tự động.</span></label>}
          </>}
        </fieldset>
        {loading && <p role="status">Đang tải dữ liệu…</p>}
        {error && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}{step === 1 && <Button type="button" variant="outline" disabled={busy} onClick={() => setRetry(n => n + 1)}>Thử tải lại</Button>}</div>}
        <div className="flex flex-wrap justify-between gap-3 border-t pt-4">
          <Button type="button" variant="outline" disabled={busy} onClick={() => { if (step === 1) onClose(); else { setStep(s => s - 1); setConfirmed(false); setError(""); } }}>{step === 1 ? "Đóng" : "Quay lại"}</Button>
          {step < 5 ? <Button type="button" disabled={busy || loading || !context} onClick={next}>{busy ? "Đang xem trước…" : step === 3 ? "Xem preview" : "Tiếp tục"}</Button>
            : <Button type="button" disabled={busy || !confirmed || !preview} onClick={prepare}>{busy ? "Đang chuẩn bị…" : "Xác nhận chuẩn bị quyết toán"}</Button>}
        </div>
      </>}
    </DialogContent>
  </Dialog>;
}
