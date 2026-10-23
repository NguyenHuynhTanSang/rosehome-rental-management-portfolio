import {
  useState,
} from "react";

import {
  Link,
} from "react-router";

import {
  ArrowUpRight,
  Building2,
  DoorOpen,
  FileText,
  KeyRound,
  Loader2,
  Pencil,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";

import {
  apiDelete,
} from "../api/api";

import type {
  Room,
} from "../types/room";


type RoomCardProps = {
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

function RoomCard({
  room,
  tenantId,
  tenantName,
  contractId,
  monthlyRent,
  onEdit,
  onRent,
  onDeleted,
}: RoomCardProps) {

  const occupied =
    room.status
    === "OCCUPIED";


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
        group
        relative
        flex
        h-full
        min-h-[390px]
        flex-col
        overflow-hidden
        rounded-2xl
        border
        border-[#e9e2d8]
        bg-white
        shadow-sm
        transition-all
        duration-200
        hover:-translate-y-1
        hover:border-[#d8c79f]
        hover:shadow-[0_16px_40px_rgba(18,32,51,0.10)]
      "
    >

      {/* =====================================================
          STATUS ACCENT
      ===================================================== */}

      <div
        className={
          occupied

            ? `
              h-1
              w-full
              bg-[#e44763]
            `

            : `
              h-1
              w-full
              bg-[#d6a64c]
            `
        }
      />


      {/* =====================================================
          HEADER
      ===================================================== */}

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
                size={21}
              />

            ) : (

              <DoorOpen
                size={21}
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
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.16em]
                text-slate-400
              "
            >
              Phòng
            </div>


            <h2
              className="
                mt-0.5
                truncate
                text-xl
                font-semibold
                tracking-tight
                text-[#172033]
              "
            >
              {room.room_code}
            </h2>


            <div
              className="
                mt-1
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
                border
                border-[#f1c5ce]
                bg-[#fcecef]
                px-2.5
                py-1
                text-xs
                font-semibold
                text-[#b92f49]
              `

              : `
                inline-flex
                shrink-0
                items-center
                rounded-full
                border
                border-[#ead9b7]
                bg-[#fff8e9]
                px-2.5
                py-1
                text-xs
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


      {/* =====================================================
          INFORMATION
      ===================================================== */}

      <div
        className="
          flex
          flex-1
          flex-col
          px-5
          py-4
        "
      >

        <div
          className="
            space-y-3
          "
        >

          {/* TENANT */}

          <div
            className="
              flex
              items-center
              justify-between
              gap-4
              rounded-xl
              bg-[#faf9f7]
              px-3.5
              py-3
            "
          >

            <div
              className="
                flex
                min-w-0
                items-center
                gap-2.5
              "
            >

              <UserRound
                size={16}
                className="
                  shrink-0
                  text-slate-400
                "
              />

              <span
                className="
                  text-sm
                  text-slate-500
                "
              >
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

              {occupied

                ? (
                    tenantName
                    ?? "Đang thuê"
                  )

                : "Chưa có khách"}

            </strong>

          </div>


          {/* CONTRACT */}

          <div
            className="
              flex
              items-center
              justify-between
              gap-4
              px-3.5
              py-2
            "
          >

            <div
              className="
                flex
                items-center
                gap-2.5
              "
            >

              <FileText
                size={16}
                className="
                  text-slate-400
                "
              />

              <span
                className="
                  text-sm
                  text-slate-500
                "
              >
                Hợp đồng
              </span>

            </div>


            <strong
              className="
                text-sm
                font-semibold
                text-[#172033]
              "
            >

              {occupied
                &&
                contractId

                  ? `#${contractId}`

                  : "-"}

            </strong>

          </div>


          {/* RENT */}

          <div
            className="
              flex
              items-center
              justify-between
              gap-4
              px-3.5
              py-2
            "
          >

            <div
              className="
                flex
                items-center
                gap-2.5
              "
            >

              <WalletCards
                size={16}
                className="
                  text-slate-400
                "
              />

              <span
                className="
                  text-sm
                  text-slate-500
                "
              >
                Tiền phòng
              </span>

            </div>


            <strong
              className={
                occupied

                  ? `
                    text-sm
                    font-semibold
                    text-[#172033]
                  `

                  : `
                    text-sm
                    font-medium
                    text-slate-400
                  `
              }
            >

              {occupied
                ? formatMoney(
                    monthlyRent
                  )
                : "-"}

            </strong>

          </div>

        </div>


        {/* ===================================================
            DESCRIPTION
        =================================================== */}

        {room.description && (

          <div
            className="
              mt-4
              rounded-xl
              border
              border-[#eee9df]
              bg-[#fffdf9]
              px-3.5
              py-3
              text-sm
              leading-5
              text-slate-500
            "
          >
            {room.description}
          </div>

        )}


        <div
          className="flex-1"
        />

      </div>


      {/* =====================================================
          MAIN ACTIONS
      ===================================================== */}

      <div
        className="
          grid
          grid-cols-3
          gap-2
          border-t
          border-[#eeeae2]
          px-5
          py-4
        "
      >

        {/* DETAILS */}

        <Link
          to={
            `/rooms/${room.id}`
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

          <ArrowUpRight
            size={14}
          />

          Chi tiết

        </Link>


        {/* EDIT */}

        <button
          type="button"
          onClick={
            () =>
              onEdit(
                room.id
              )
          }
          className="
            inline-flex
            h-9
            items-center
            justify-center
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
            hover:text-[#8a6726]
          "
        >

          <Pencil
            size={14}
          />

          Sửa

        </button>


        {/* CONTRACT / DELETE */}

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
                h-9
                items-center
                justify-center
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
                hover:border-[#e44763]
                hover:bg-[#fcecef]
                hover:text-[#b92f49]
              "
            >

              <FileText
                size={14}
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
                h-9
                items-center
                justify-center
                gap-1.5
                rounded-lg
                border
                border-[#f2cbd2]
                bg-white
                px-3
                text-xs
                font-semibold
                text-[#b92f49]
                transition
                hover:bg-[#fcecef]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >

              {deleting ? (

                <Loader2
                  size={14}
                  className=
                    "animate-spin"
                />

              ) : (

                <Trash2
                  size={14}
                />

              )}

              {deleting
                ? "Đang xóa"
                : "Xóa"}

            </button>

          )}

      </div>


      {/* =====================================================
          PRIMARY ROOM ACTION
      ===================================================== */}

      <div
        className="
          border-t
          border-[#eeeae2]
          bg-[#fcfbf8]
          px-5
          py-4
        "
      >

        {occupied ? (

          tenantId ? (

            <Link
              to={
                `/tenants/${tenantId}`
              }
              className="
                inline-flex
                h-10
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-[#efd1d7]
                bg-[#fcecef]
                px-4
                text-sm
                font-semibold
                text-[#b92f49]
                transition
                hover:border-[#e44763]
                hover:bg-[#f9dde3]
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

          ) : (

            <div
              className="
                flex
                h-10
                items-center
                justify-center
                text-xs
                text-slate-400
              "
            >
              Chưa có thông tin khách thuê
            </div>

          )

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
              h-10
              w-full
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-[#d6a64c]
              bg-[#d6a64c]
              px-4
              text-sm
              font-semibold
              text-[#172033]
              transition
              hover:bg-[#e0b85f]
            "
          >

            <KeyRound
              size={16}
            />

            Cho thuê phòng

          </button>

        )}

      </div>

    </article>

  );

}


export default RoomCard;