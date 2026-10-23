import {
  useState,
} from "react";

import {
  Link,
} from "react-router";

import {
  ArrowUpRight,
  Building2,
  ChevronUp,
  DoorOpen,
  FileText,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";

import {
  apiDelete,
} from "../../api/api";

import type {
  Room,
} from "../../types/room";


type MobileRoomCardProps = {
  room: Room;

  tenantId?: number;

  tenantName?: string;

  contractId?: number;

  monthlyRent?: number;

  onEdit: (
    roomId: number
  ) => void;

  onRent: (
    roomId: number
  ) => void;

  onDeleted: () => void;
};


type DeleteRoomResponse = {
  message: string;

  room_id: number;

  room_code: string;
};


// =========================================================
// HELPERS
// =========================================================

function formatMoney(
  value?: number
) {

  if (
    value === undefined
    ||
    value === null
  ) {
    return "-";
  }


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
    return "Chưa xác định";
  }


  if (
    floor === 0
  ) {
    return "Tầng trệt";
  }


  return `Tầng ${floor}`;

}


// =========================================================
// COMPONENT
// =========================================================

function MobileRoomCard({
  room,
  tenantId,
  tenantName,
  contractId,
  monthlyRent,
  onEdit,
  onRent,
  onDeleted,
}: MobileRoomCardProps) {

  const occupied =
    room.status
    === "OCCUPIED";


  const [
    actionsOpen,
    setActionsOpen,
  ] = useState(
    false
  );


  const [
    deleting,
    setDeleting,
  ] = useState(
    false
  );


  // =========================================================
  // DELETE
  // =========================================================

  async function handleDelete() {

    const confirmed =
      window.confirm(
        `Bạn có chắc muốn xóa phòng ${room.room_code}?\n\n`
        +
        "Phòng có dữ liệu hợp đồng, hóa đơn hoặc điện nước sẽ không thể xóa."
      );


    if (
      !confirmed
    ) {
      return;
    }


    try {

      setDeleting(
        true
      );


      await apiDelete<
        DeleteRoomResponse
      >(
        `/rooms/${room.id}`
      );


      onDeleted();


    } catch (err) {

      if (
        err instanceof Error
      ) {

        window.alert(
          err.message
        );

      } else {

        window.alert(
          "Không thể xóa phòng."
        );

      }


    } finally {

      setDeleting(
        false
      );

    }

  }


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

      {/* ==========================
          STATUS LINE
      ========================== */}

      <div
        className={
          occupied

            ? "h-1 bg-[#e44763]"

            : "h-1 bg-[#d6a64c]"
        }
      />


      {/* ==========================
          CONTENT
      ========================== */}

      <div
        className="
          p-4
        "
      >

        {/* HEADER */}

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
              className={
                occupied

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

                  : `
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
              }
            >

              {occupied ? (

                <Building2
                  size={20}
                />

              ) : (

                <DoorOpen
                  size={20}
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
                  text-lg
                  font-bold
                  tracking-tight
                  text-[#172033]
                "
              >
                {room.room_code}
              </div>


              <div
                className="
                  mt-0.5
                  text-xs
                  text-slate-500
                "
              >
                {formatFloor(
                  room.floor
                )}
              </div>

            </div>

          </div>


          <span
            className={
              occupied

                ? `
                  inline-flex
                  shrink-0
                  items-center
                  rounded-full
                  bg-[#fcecef]
                  px-2.5
                  py-1
                  text-[11px]
                  font-semibold
                  text-[#b92f49]
                `

                : `
                  inline-flex
                  shrink-0
                  items-center
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

            <span
              className={
                occupied

                  ? `
                    mr-1.5
                    h-1.5
                    w-1.5
                    rounded-full
                    bg-[#e44763]
                  `

                  : `
                    mr-1.5
                    h-1.5
                    w-1.5
                    rounded-full
                    bg-[#d6a64c]
                  `
              }
            />

            {occupied
              ? "Đang thuê"
              : "Trống"}

          </span>

        </div>


        {/* ==========================
            MAIN INFO
        ========================== */}

        {occupied ? (

          <div
            className="
              mt-4
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

              <div
                className="
                  flex
                  min-w-0
                  items-center
                  gap-2
                  text-sm
                  text-slate-500
                "
              >

                <UserRound
                  size={16}
                  className="shrink-0"
                />

                <span>
                  Khách thuê
                </span>

              </div>


              <strong
                className="
                  max-w-[55%]
                  truncate
                  text-right
                  text-sm
                  font-semibold
                  text-[#172033]
                "
              >
                {tenantName
                  ?? "Đang thuê"}
              </strong>

            </div>


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
                  flex
                  items-center
                  gap-2
                  text-sm
                  text-slate-500
                "
              >

                <WalletCards
                  size={16}
                />

                <span>
                  Tiền phòng
                </span>

              </div>


              <strong
                className="
                  text-sm
                  font-semibold
                  text-[#172033]
                "
              >
                {formatMoney(
                  monthlyRent
                )}
              </strong>

            </div>

          </div>

        ) : (

          <div
            className="
              mt-4
              rounded-xl
              bg-[#fffaf1]
              px-3
              py-3
              text-sm
              text-[#80642f]
            "
          >
            Phòng đang sẵn sàng
            tiếp nhận khách mới.
          </div>

        )}


        {/* DESCRIPTION */}

        {room.description && (

          <div
            className="
              mt-3
              truncate
              text-xs
              text-slate-500
            "
          >
            {room.description}
          </div>

        )}


        {/* ==========================
            PRIMARY ACTION
        ========================== */}

        <div
          className="
            mt-4
            flex
            gap-2
          "
        >

          {occupied ? (

            <Link
              to={
                `/rooms/${room.id}`
              }
              className="
                inline-flex
                h-11
                flex-1
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

              Chi tiết

              <ArrowUpRight
                size={16}
              />

            </Link>

          ) : (

            <button
              type="button"
              onClick={
                () =>
                  onRent(
                    room.id
                  )
              }
              className="
                inline-flex
                h-11
                flex-1
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-[#d6a64c]
                px-4
                text-sm
                font-semibold
                text-[#172033]
                active:bg-[#c99a43]
              "
            >

              <KeyRound
                size={16}
              />

              Cho thuê phòng

            </button>

          )}


          <button
            type="button"
            onClick={
              () =>
                setActionsOpen(
                  (
                    current
                  ) =>
                    !current
                )
            }
            aria-label="Thêm thao tác"
            aria-expanded={
              actionsOpen
            }
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-[#ddd8ce]
              bg-white
              text-[#172033]
              active:bg-slate-50
            "
          >

            {actionsOpen ? (

              <ChevronUp
                size={19}
              />

            ) : (

              <MoreHorizontal
                size={20}
              />

            )}

          </button>

        </div>


        {/* ==========================
            EXTRA ACTIONS
        ========================== */}

        {actionsOpen && (

          <div
            className="
              mt-3
              grid
              grid-cols-2
              gap-2
              border-t
              border-[#eeeae2]
              pt-3
            "
          >

            <button
              type="button"
              onClick={
                () => {

                  setActionsOpen(
                    false
                  );


                  onEdit(
                    room.id
                  );

                }
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
                font-medium
                text-[#172033]
                active:bg-slate-50
              "
            >

              <Pencil
                size={16}
              />

              Sửa phòng

            </button>


            {occupied
              &&
              contractId
              ? (

                <Link
                  to={
                    `/contracts/${contractId}`
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
                    font-medium
                    text-[#172033]
                    active:bg-slate-50
                  "
                >

                  <FileText
                    size={16}
                  />

                  Hợp đồng

                </Link>

              ) : (

                <button
                  type="button"
                  onClick={
                    handleDelete
                  }
                  disabled={
                    deleting
                  }
                  className="
                    inline-flex
                    min-h-11
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    border
                    border-red-200
                    bg-red-50
                    px-3
                    text-sm
                    font-medium
                    text-red-600
                    disabled:opacity-50
                  "
                >

                  {deleting ? (

                    <Loader2
                      size={16}
                      className=
                        "animate-spin"
                    />

                  ) : (

                    <Trash2
                      size={16}
                    />

                  )}

                  {deleting
                    ? "Đang xóa"
                    : "Xóa phòng"}

                </button>

              )}


            {occupied
              &&
              tenantId
              && (

                <Link
                  to={
                    `/tenants/${tenantId}`
                  }
                  className="
                    col-span-2
                    inline-flex
                    min-h-11
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    border
                    border-[#efd1d7]
                    bg-[#fcecef]
                    px-3
                    text-sm
                    font-semibold
                    text-[#b92f49]
                  "
                >

                  <UserRound
                    size={16}
                  />

                  Xem khách thuê

                  <ArrowUpRight
                    size={15}
                  />

                </Link>

              )}

          </div>

        )}

      </div>

    </article>

  );

}


export default MobileRoomCard;