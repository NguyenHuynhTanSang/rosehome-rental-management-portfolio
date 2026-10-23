import {
  useEffect,
  useState,
} from "react";

import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileClock,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  apiGet,
} from "../api/api";

import {
  Button,
} from "@/components/ui/button";


type AuditLog = {
  id: number;

  user_id:
    number | null;

  actor_email:
    string;

  action:
    string;

  entity_type:
    string;

  entity_id:
    string | null;

  description:
    string | null;

  details:
    Record<string, unknown> | null;

  ip_address:
    string | null;

  created_at:
    string;
};


type AuditLogListResponse = {
  total_count:
    number;

  items:
    AuditLog[];
};


const PAGE_SIZE = 20;


function formatDateTime(
  value: string,
) {

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      dateStyle:
        "short",

      timeStyle:
        "short",
    }
  ).format(
    new Date(value)
  );

}


function translateAction(
  action: string,
) {

  const labels:
    Record<string, string> = {

    CREATE_PAYMENT:
      "Ghi nhận thanh toán",

    UPLOAD_PAYMENT_RECEIPT:
      "Tải chứng từ thanh toán",

    DELETE_PAYMENT_RECEIPT:
      "Xóa chứng từ thanh toán",

    COLLECT_DEPOSIT:
      "Thu tiền cọc",

    REFUND_DEPOSIT:
      "Hoàn tiền cọc",

    DEDUCT_DEPOSIT:
      "Khấu trừ tiền cọc",

    CREATE_INVOICE:
      "Tạo hóa đơn",

    CREATE_INVOICES_BULK:
      "Tạo hóa đơn hàng loạt",

    ADD_INVOICE_ITEM:
      "Thêm khoản phí",

    UPDATE_INVOICE_ITEM:
      "Sửa khoản phí",

    DELETE_INVOICE_ITEM:
      "Xóa khoản phí",

    ISSUE_INVOICE:
      "Phát hành hóa đơn",

    CANCEL_INVOICE:
      "Hủy hóa đơn",

    CREATE_REPLACEMENT_INVOICE:
      "Tạo hóa đơn thay thế",

    CREATE_CONTRACT:
      "Tạo hợp đồng",

    UPDATE_CONTRACT:
      "Cập nhật hợp đồng",

    DELETE_CONTRACT:
      "Xóa hợp đồng",

    END_CONTRACT:
      "Kết thúc hợp đồng",

  };


  return (
    labels[action]
    ??
    action
  );

}


function translateEntity(
  entityType: string,
) {

  const labels:
    Record<string, string> = {

    PAYMENT:
      "Thanh toán",

    DEPOSIT_TRANSACTION:
      "Tiền cọc",

    INVOICE:
      "Hóa đơn",

    INVOICE_ITEM:
      "Khoản phí",

    INVOICE_BATCH:
      "Nhóm hóa đơn",

    CONTRACT:
      "Hợp đồng",

  };


  return (
    labels[entityType]
    ??
    entityType
  );

}


function AuditLogs() {

  const [
    logs,
    setLogs,
  ] = useState<
    AuditLog[]
  >([]);


  const [
    totalCount,
    setTotalCount,
  ] = useState(0);


  const [
    search,
    setSearch,
  ] = useState("");


  const [
    action,
    setAction,
  ] = useState("");


  const [
    entityType,
    setEntityType,
  ] = useState("");


  const [
    page,
    setPage,
  ] = useState(1);


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    mobileFiltersOpen,
    setMobileFiltersOpen,
  ] = useState(false);


  async function loadLogs() {

    try {

      setLoading(true);

      setError("");


      const params =
        new URLSearchParams();


      if (
        search.trim()
      ) {

        params.set(
          "search",
          search.trim()
        );

      }


      if (action) {

        params.set(
          "action",
          action
        );

      }


      if (entityType) {

        params.set(
          "entity_type",
          entityType
        );

      }


      params.set(
        "limit",
        String(
          PAGE_SIZE
        )
      );


      params.set(
        "offset",
        String(
          (
            page - 1
          )
          *
          PAGE_SIZE
        )
      );


      const response =
        await apiGet<
          AuditLogListResponse
        >(
          `/audit-logs?${params.toString()}`
        );


      setLogs(
        response.items
      );


      setTotalCount(
        response.total_count
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
          "Không thể tải nhật ký hoạt động."
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

      const timer =
        window.setTimeout(
          () => {

            void loadLogs();

          },
          250
        );


      return () =>
        window.clearTimeout(
          timer
        );

    },
    [
      search,
      action,
      entityType,
      page,
    ]
  );


  useEffect(
    () => {

      setPage(1);

    },
    [
      search,
      action,
      entityType,
    ]
  );


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalCount
        /
        PAGE_SIZE
      )
    );


  return (

    <div
      className="
        mx-auto
        w-full
        max-w-[1500px]
        space-y-6
      "
    >

      {/* =================================================
          MOBILE
      ================================================= */}

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
              Rosehome Security
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
              Nhật ký hoạt động
            </h1>


            <div
              className="
                mt-2
                flex
                items-center
                gap-2
              "
            >

              <span
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  rounded-full
                  border
                  border-emerald-200
                  bg-emerald-50
                  px-2.5
                  py-1
                  text-[11px]
                  font-semibold
                  text-emerald-700
                "
              >

                <ShieldCheck
                  size={12}
                />

                Chỉ Admin

              </span>


              <span
                className="
                  text-xs
                  text-slate-500
                "
              >
                {totalCount} hoạt động
              </span>

            </div>

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
                void loadLogs()
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


        {/* MOBILE SUMMARY */}

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
                Hoạt động hệ thống
              </div>


              <div
                className="
                  mt-1
                  text-3xl
                  font-semibold
                  tracking-tight
                "
              >
                {totalCount}
              </div>


              <div
                className="
                  mt-1
                  text-xs
                  text-slate-400
                "
              >
                Trang {page}/{totalPages}
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
                rounded-xl
                bg-white/10
                text-[#d6a64c]
              "
            >

              <FileClock
                size={20}
              />

            </div>

          </div>


          <div
            className="
              mt-5
              grid
              grid-cols-2
              gap-2
            "
          >

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
                  text-[10px]
                  text-slate-400
                "
              >
                Đang hiển thị
              </div>


              <strong
                className="
                  mt-1
                  block
                  text-sm
                  text-white
                "
              >
                {logs.length} hoạt động
              </strong>

            </div>


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
                  text-[10px]
                  text-slate-400
                "
              >
                Mỗi trang
              </div>


              <strong
                className="
                  mt-1
                  block
                  text-sm
                  text-white
                "
              >
                {PAGE_SIZE} bản ghi
              </strong>

            </div>

          </div>

        </div>


        {/* MOBILE SEARCH + FILTER */}

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
              size={17}
              className="
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                text-slate-400
              "
            />


            <input
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
                "Tìm admin, hành động, mô tả..."
              className="
                h-11
                w-full
                rounded-xl
                border
                border-[#ddd8ce]
                bg-white
                pl-10
                pr-3
                text-sm
                outline-none
                focus:border-[#d6a64c]
              "
            />

          </div>


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
              mt-3
              flex
              min-h-10
              w-full
              items-center
              justify-between
              gap-3
              rounded-xl
              border
              border-[#ebe6dd]
              bg-[#fcfbf8]
              px-3
              py-2
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
                size={15}
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
                mt-3
                grid
                grid-cols-1
                gap-3
              "
            >

              <select
                value={
                  action
                }
                onChange={
                  (
                    event
                  ) =>
                    setAction(
                      event.target.value
                    )
                }
                className="
                  h-11
                  rounded-xl
                  border
                  border-[#ddd8ce]
                  bg-white
                  px-3
                  text-sm
                  outline-none
                  focus:border-[#d6a64c]
                "
              >

                <option value="">
                  Tất cả hành động
                </option>

                <option value="CREATE_PAYMENT">
                  Ghi nhận thanh toán
                </option>

                <option value="COLLECT_DEPOSIT">
                  Thu tiền cọc
                </option>

                <option value="REFUND_DEPOSIT">
                  Hoàn tiền cọc
                </option>

                <option value="DEDUCT_DEPOSIT">
                  Khấu trừ cọc
                </option>

                <option value="CREATE_INVOICE">
                  Tạo hóa đơn
                </option>

                <option value="ISSUE_INVOICE">
                  Phát hành hóa đơn
                </option>

                <option value="CANCEL_INVOICE">
                  Hủy hóa đơn
                </option>

                <option value="CREATE_CONTRACT">
                  Tạo hợp đồng
                </option>

                <option value="UPDATE_CONTRACT">
                  Sửa hợp đồng
                </option>

                <option value="END_CONTRACT">
                  Kết thúc hợp đồng
                </option>

              </select>


              <select
                value={
                  entityType
                }
                onChange={
                  (
                    event
                  ) =>
                    setEntityType(
                      event.target.value
                    )
                }
                className="
                  h-11
                  rounded-xl
                  border
                  border-[#ddd8ce]
                  bg-white
                  px-3
                  text-sm
                  outline-none
                  focus:border-[#d6a64c]
                "
              >

                <option value="">
                  Tất cả đối tượng
                </option>

                <option value="PAYMENT">
                  Thanh toán
                </option>

                <option value="DEPOSIT_TRANSACTION">
                  Tiền cọc
                </option>

                <option value="INVOICE">
                  Hóa đơn
                </option>

                <option value="INVOICE_ITEM">
                  Khoản phí
                </option>

                <option value="CONTRACT">
                  Hợp đồng
                </option>

              </select>


              {(search
                ||
                action
                ||
                entityType) && (

                <button
                  type="button"
                  onClick={
                    () => {

                      setSearch("");
                      setAction("");
                      setEntityType("");
                      setPage(1);

                    }
                  }
                  className="
                    h-10
                    rounded-xl
                    border
                    border-[#efced4]
                    bg-[#fcecef]
                    px-3
                    text-sm
                    font-semibold
                    text-[#b92f49]
                  "
                >
                  Xóa bộ lọc
                </button>

              )}

            </div>

          )}

        </div>


        {/* MOBILE CONTENT */}

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
              size={17}
              className=
                "animate-spin"
            />

            Đang tải nhật ký...

          </div>

        ) : logs.length === 0 ? (

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

              <Filter
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
              Chưa có hoạt động phù hợp
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
                  Hoạt động gần đây
                </h2>


                <p
                  className="
                    mt-0.5
                    text-xs
                    text-slate-500
                  "
                >
                  Nhật ký bảo mật và thao tác quản trị
                </p>

              </div>


              <span
                className="
                  rounded-full
                  border
                  border-[#e5dccb]
                  bg-[#fffaf2]
                  px-2.5
                  py-1
                  text-[11px]
                  font-semibold
                  text-[#8a6726]
                "
              >
                {logs.length}
              </span>

            </div>


            {logs.map(
              (
                log
              ) => (

                <MobileAuditLogCard
                  key={
                    log.id
                  }
                  log={
                    log
                  }
                />

              )
            )}

          </div>

        )}


        {/* MOBILE PAGINATION */}

        <div
          className="
            flex
            items-center
            justify-between
            gap-3
            rounded-2xl
            border
            border-[#e9e2d8]
            bg-white
            px-4
            py-3
            shadow-sm
          "
        >

          <Button
            type="button"
            variant="outline"
            disabled={
              page <= 1
              ||
              loading
            }
            onClick={
              () =>
                setPage(
                  (
                    current
                  ) =>
                    Math.max(
                      1,
                      current - 1
                    )
                )
            }
            className="
              h-9
              rounded-xl
              border-[#ddd8ce]
              px-3
            "
          >

            <ChevronLeft
              size={15}
            />

            Trước

          </Button>


          <span
            className="
              text-xs
              font-medium
              text-slate-500
            "
          >
            {page}/{totalPages}
          </span>


          <Button
            type="button"
            variant="outline"
            disabled={
              page
              >= totalPages
              ||
              loading
            }
            onClick={
              () =>
                setPage(
                  (
                    current
                  ) =>
                    Math.min(
                      totalPages,
                      current + 1
                    )
                )
            }
            className="
              h-9
              rounded-xl
              border-[#ddd8ce]
              px-3
            "
          >

            Sau

            <ChevronRight
              size={15}
            />

          </Button>

        </div>

      </div>


      {/* =================================================
          DESKTOP
      ================================================= */}

      <div
        className="
          hidden
          space-y-6
          md:block
        "
      >

      {/* HERO */}

      <section
        className="
          relative
          overflow-hidden
          rounded-3xl
          border
          border-[#26384f]
          bg-[#122033]
          px-5
          py-6
          text-white
          shadow-sm
          sm:px-7
        "
      >

        <div
          className="
            relative
            z-10
            flex
            flex-col
            gap-5
            lg:flex-row
            lg:items-center
            lg:justify-between
          "
        >

          <div
            className="
              flex
              items-start
              gap-4
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
                border
                border-[#d6a64c]/30
                bg-[#d6a64c]/10
                text-[#efd38f]
              "
            >

              <FileClock
                size={25}
              />

            </div>


            <div>

              <div
                className="
                  text-xs
                  font-semibold
                  uppercase
                  tracking-[0.18em]
                  text-[#d6a64c]
                "
              >
                Rosehome Security
              </div>


              <h1
                className="
                  mt-1
                  text-2xl
                  font-semibold
                  sm:text-3xl
                "
              >
                Nhật ký hoạt động
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
                Theo dõi các thao tác quan trọng
                liên quan đến thanh toán, tiền cọc,
                hóa đơn và hợp đồng.
              </p>

            </div>

          </div>


          <div
            className="
              inline-flex
              items-center
              gap-2
              self-start
              rounded-full
              border
              border-emerald-400/20
              bg-emerald-400/10
              px-3
              py-2
              text-xs
              text-emerald-200
            "
          >

            <ShieldCheck
              size={14}
            />

            Chỉ Admin

          </div>

        </div>

      </section>


      {/* FILTERS */}

      <section
        className="
          rounded-2xl
          border
          border-[#e9e2d8]
          bg-white
          p-5
          shadow-sm
        "
      >

        <div
          className="
            grid
            gap-3
            lg:grid-cols-[1fr_220px_220px_auto]
          "
        >

          <div
            className="
              relative
            "
          >

            <Search
              size={16}
              className="
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                text-slate-400
              "
            />


            <input
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
                "Tìm admin, hành động, mô tả..."
              className="
                h-11
                w-full
                rounded-xl
                border
                border-[#ddd8ce]
                bg-white
                pl-10
                pr-3
                text-sm
                outline-none
                focus:border-[#d6a64c]
              "
            />

          </div>


          <select
            value={
              action
            }
            onChange={
              (
                event
              ) =>
                setAction(
                  event.target.value
                )
            }
            className="
              h-11
              rounded-xl
              border
              border-[#ddd8ce]
              bg-white
              px-3
              text-sm
              outline-none
              focus:border-[#d6a64c]
            "
          >

            <option value="">
              Tất cả hành động
            </option>

            <option value="CREATE_PAYMENT">
              Ghi nhận thanh toán
            </option>

            <option value="COLLECT_DEPOSIT">
              Thu tiền cọc
            </option>

            <option value="REFUND_DEPOSIT">
              Hoàn tiền cọc
            </option>

            <option value="DEDUCT_DEPOSIT">
              Khấu trừ cọc
            </option>

            <option value="CREATE_INVOICE">
              Tạo hóa đơn
            </option>

            <option value="ISSUE_INVOICE">
              Phát hành hóa đơn
            </option>

            <option value="CANCEL_INVOICE">
              Hủy hóa đơn
            </option>

            <option value="CREATE_CONTRACT">
              Tạo hợp đồng
            </option>

            <option value="UPDATE_CONTRACT">
              Sửa hợp đồng
            </option>

            <option value="END_CONTRACT">
              Kết thúc hợp đồng
            </option>

          </select>


          <select
            value={
              entityType
            }
            onChange={
              (
                event
              ) =>
                setEntityType(
                  event.target.value
                )
            }
            className="
              h-11
              rounded-xl
              border
              border-[#ddd8ce]
              bg-white
              px-3
              text-sm
              outline-none
              focus:border-[#d6a64c]
            "
          >

            <option value="">
              Tất cả đối tượng
            </option>

            <option value="PAYMENT">
              Thanh toán
            </option>

            <option value="DEPOSIT_TRANSACTION">
              Tiền cọc
            </option>

            <option value="INVOICE">
              Hóa đơn
            </option>

            <option value="INVOICE_ITEM">
              Khoản phí
            </option>

            <option value="CONTRACT">
              Hợp đồng
            </option>

          </select>


          <Button
            type="button"
            variant="outline"
            disabled={
              loading
            }
            onClick={
              () =>
                void loadLogs()
            }
            className="
              h-11
              rounded-xl
            "
          >

            <RefreshCw
              size={15}
            />

            Tải lại

          </Button>

        </div>

      </section>


      {/* CONTENT */}

      <section
        className="
          overflow-hidden
          rounded-2xl
          border
          border-[#e9e2d8]
          bg-white
          shadow-sm
        "
      >

        <div
          className="
            flex
            items-center
            justify-between
            border-b
            border-[#eeeae2]
            px-5
            py-4
          "
        >

          <div
            className="
              flex
              items-center
              gap-2
            "
          >

            <Activity
              size={17}
              className=
                "text-[#d6a64c]"
            />


            <h2
              className="
                text-sm
                font-semibold
                text-[#172033]
              "
            >
              Hoạt động gần đây
            </h2>

          </div>


          <span
            className="
              text-xs
              text-slate-500
            "
          >
            {totalCount} hoạt động
          </span>

        </div>


        {error && (

          <div
            className="
              m-5
              rounded-xl
              bg-red-50
              p-4
              text-sm
              text-red-700
            "
          >
            {error}
          </div>

        )}


        {loading ? (

          <div
            className="
              p-10
              text-center
              text-sm
              text-slate-500
            "
          >
            Đang tải nhật ký...
          </div>

        ) : logs.length === 0 ? (

          <div
            className="
              p-12
              text-center
            "
          >

            <Filter
              size={28}
              className="
                mx-auto
                text-slate-300
              "
            />


            <p
              className="
                mt-3
                text-sm
                text-slate-500
              "
            >
              Chưa có hoạt động phù hợp.
            </p>

          </div>

        ) : (

          <div
            className="
              divide-y
              divide-[#eeeae2]
            "
          >

            {logs.map(
              (
                log
              ) => (

                <div
                  key={
                    log.id
                  }
                  className="
                    px-5
                    py-5
                    transition
                    hover:bg-[#fcfbf8]
                  "
                >

                  <div
                    className="
                      flex
                      flex-col
                      gap-3
                      lg:flex-row
                      lg:items-start
                      lg:justify-between
                    "
                  >

                    <div
                      className="
                        flex
                        min-w-0
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
                          bg-[#f5eddc]
                          text-[#8a6726]
                        "
                      >

                        <Activity
                          size={17}
                        />

                      </div>


                      <div
                        className="
                          min-w-0
                        "
                      >

                        <div
                          className="
                            text-sm
                            font-semibold
                            text-[#172033]
                          "
                        >
                          {translateAction(
                            log.action
                          )}
                        </div>


                        {log.description && (

                          <p
                            className="
                              mt-1
                              text-sm
                              leading-6
                              text-slate-600
                            "
                          >
                            {log.description}
                          </p>

                        )}


                        <div
                          className="
                            mt-3
                            flex
                            flex-wrap
                            gap-2
                          "
                        >

                          <span
                            className="
                              rounded-full
                              bg-[#eef1f5]
                              px-2.5
                              py-1
                              text-[11px]
                              font-medium
                              text-[#20334d]
                            "
                          >
                            {translateEntity(
                              log.entity_type
                            )}
                          </span>


                          {log.entity_id && (

                            <span
                              className="
                                rounded-full
                                bg-[#fcecef]
                                px-2.5
                                py-1
                                text-[11px]
                                font-medium
                                text-[#b92f49]
                              "
                            >
                              #{log.entity_id}
                            </span>

                          )}

                        </div>

                      </div>

                    </div>


                    <div
                      className="
                        shrink-0
                        space-y-1.5
                        text-xs
                        text-slate-500
                        lg:text-right
                      "
                    >

                      <div
                        className="
                          flex
                          items-center
                          gap-1.5
                          lg:justify-end
                        "
                      >

                        <UserRound
                          size={13}
                        />

                        {log.actor_email}

                      </div>


                      <div
                        className="
                          flex
                          items-center
                          gap-1.5
                          lg:justify-end
                        "
                      >

                        <Clock3
                          size={13}
                        />

                        {formatDateTime(
                          log.created_at
                        )}

                      </div>


                      {log.ip_address && (

                        <div>
                          IP: {log.ip_address}
                        </div>

                      )}

                    </div>

                  </div>

                </div>

              )
            )}

          </div>

        )}


        {/* PAGINATION */}

        <div
          className="
            flex
            items-center
            justify-between
            border-t
            border-[#eeeae2]
            px-5
            py-4
          "
        >

          <span
            className="
              text-xs
              text-slate-500
            "
          >
            Trang {page}/{totalPages}
          </span>


          <div
            className="
              flex
              gap-2
            "
          >

            <Button
              type="button"
              variant="outline"
              disabled={
                page <= 1
                ||
                loading
              }
              onClick={
                () =>
                  setPage(
                    (
                      current
                    ) =>
                      Math.max(
                        1,
                        current - 1
                      )
                  )
              }
              className="
                h-9
                w-9
                rounded-xl
                p-0
              "
            >

              <ChevronLeft
                size={16}
              />

            </Button>


            <Button
              type="button"
              variant="outline"
              disabled={
                page
                >= totalPages
                ||
                loading
              }
              onClick={
                () =>
                  setPage(
                    (
                      current
                    ) =>
                      Math.min(
                        totalPages,
                        current + 1
                      )
                  )
              }
              className="
                h-9
                w-9
                rounded-xl
                p-0
              "
            >

              <ChevronRight
                size={16}
              />

            </Button>

          </div>

        </div>

      </section>

      </div>

    </div>

  );

}


// =========================================================
// MOBILE AUDIT LOG CARD
// =========================================================

function MobileAuditLogCard({
  log,
}: {
  log: AuditLog;
}) {

  return (

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

      <div
        className="
          h-1
          bg-[#d6a64c]
        "
      />


      <div
        className="
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
              text-[#8a6726]
            "
          >

            <Activity
              size={17}
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
                flex
                items-start
                justify-between
                gap-2
              "
            >

              <strong
                className="
                  min-w-0
                  text-sm
                  leading-5
                  text-[#172033]
                "
              >
                {translateAction(
                  log.action
                )}
              </strong>


              <span
                className="
                  shrink-0
                  text-[10px]
                  text-slate-400
                "
              >
                #{log.id}
              </span>

            </div>


            {log.description && (

              <p
                className="
                  mt-1.5
                  text-sm
                  leading-5
                  text-slate-600
                "
              >
                {log.description}
              </p>

            )}

          </div>

        </div>


        <div
          className="
            mt-4
            flex
            flex-wrap
            gap-2
          "
        >

          <span
            className="
              rounded-full
              bg-[#eef1f5]
              px-2.5
              py-1
              text-[11px]
              font-medium
              text-[#20334d]
            "
          >
            {translateEntity(
              log.entity_type
            )}
          </span>


          {log.entity_id && (

            <span
              className="
                rounded-full
                bg-[#fcecef]
                px-2.5
                py-1
                text-[11px]
                font-medium
                text-[#b92f49]
              "
            >
              #{log.entity_id}
            </span>

          )}

        </div>


        <div
          className="
            mt-4
            space-y-2
            rounded-xl
            border
            border-[#eee9df]
            bg-[#fcfbf8]
            px-3
            py-3
          "
        >

          <MobileAuditMetaRow
            icon={
              UserRound
            }
            label="Admin"
            value={
              log.actor_email
            }
          />


          <MobileAuditMetaRow
            icon={
              Clock3
            }
            label="Thời gian"
            value={
              formatDateTime(
                log.created_at
              )
            }
          />


          {log.ip_address && (

            <MobileAuditMetaRow
              icon={
                ShieldCheck
              }
              label="IP"
              value={
                log.ip_address
              }
            />

          )}

        </div>

      </div>

    </div>

  );

}


// =========================================================
// MOBILE AUDIT META ROW
// =========================================================

function MobileAuditMetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon:
    React.ComponentType<{
      size?: number;
      className?: string;
    }>;
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

      <div
        className="
          flex
          shrink-0
          items-center
          gap-1.5
          text-xs
          text-slate-400
        "
      >

        <Icon
          size={13}
        />

        {label}

      </div>


      <strong
        className="
          min-w-0
          break-all
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


export default AuditLogs;