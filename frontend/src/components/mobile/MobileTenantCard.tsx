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
  FileText,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Trash2,
  UserRound,
} from "lucide-react";

import type {
  Tenant,
} from "../../types/tenant";

import type {
  Contract,
} from "../../types/contract";

import type {
  Room,
} from "../../types/room";


type MobileTenantCardProps = {
  tenant: Tenant;

  contract?: Contract;

  room?: Room;

  onEdit: () => void;

  onCreateContract: () => void;

  onDelete: () => void;
};


// =========================================================
// HELPERS
// =========================================================

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
    return "-";
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

function MobileTenantCard({
  tenant,
  contract,
  room,
  onEdit,
  onCreateContract,
  onDelete,
}: MobileTenantCardProps) {

  const renting =
    Boolean(
      contract
    );


  const [
    actionsOpen,
    setActionsOpen,
  ] = useState(
    false
  );


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
          renting

            ? "h-1 bg-[#e44763]"

            : "h-1 bg-[#d6a64c]"
        }
      />


      <div
        className="
          p-4
        "
      >

        {/* ==========================
            HEADER
        ========================== */}

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
                renting

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

              <UserRound
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
                  text-base
                  font-bold
                  text-[#172033]
                "
              >
                {tenant.full_name}
              </h2>


              <div
                className="
                  mt-1
                  text-[11px]
                  text-slate-400
                "
              >
                Khách #{tenant.id}
              </div>

            </div>

          </div>


          <span
            className={
              renting

                ? `
                  shrink-0
                  rounded-full
                  bg-[#fcecef]
                  px-2.5
                  py-1
                  text-[11px]
                  font-semibold
                  text-[#b92f49]
                `

                : `
                  shrink-0
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
            {renting
              ? "Đang thuê"
              : "Chưa thuê"}
          </span>

        </div>


        {/* ==========================
            MAIN INFO
        ========================== */}

        {renting
          &&
          contract
          &&
          room
          ? (

            <div
              className="
                mt-4
                rounded-xl
                border
                border-[#eee9df]
                bg-[#fcfbf8]
                px-3.5
                py-3
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
                    items-center
                    gap-2
                    text-sm
                    text-slate-500
                  "
                >

                  <Building2
                    size={15}
                  />

                  Phòng hiện tại

                </div>


                <strong
                  className="
                    text-sm
                    text-[#172033]
                  "
                >
                  {room.room_code}
                </strong>

              </div>


              <div
                className="
                  mt-2
                  flex
                  items-center
                  justify-between
                  gap-3
                  text-xs
                  text-slate-500
                "
              >

                <span>
                  {formatFloor(
                    room.floor
                  )}
                </span>

                <span>
                  HĐ #{contract.id}
                </span>

              </div>

            </div>

          ) : (

            <div
              className="
                mt-4
                rounded-xl
                bg-[#fffaf1]
                px-3.5
                py-3
                text-sm
                text-[#80642f]
              "
            >
              Hiện chưa có hợp đồng đang hoạt động.
            </div>

          )}


        {/* ==========================
            CONTACT
        ========================== */}

        <div
          className="
            mt-4
            space-y-2.5
          "
        >

          <div
            className="
              flex
              items-center
              gap-2.5
              text-sm
            "
          >

            <Phone
              size={15}
              className="
                shrink-0
                text-slate-400
              "
            />

            <span
              className="
                truncate
                text-slate-600
              "
            >
              {tenant.phone
                ?? "Chưa có số điện thoại"}
            </span>

          </div>


          {tenant.email && (

            <div
              className="
                flex
                items-center
                gap-2.5
                text-sm
              "
            >

              <Mail
                size={15}
                className="
                  shrink-0
                  text-slate-400
                "
              />

              <span
                className="
                  truncate
                  text-slate-600
                "
              >
                {tenant.email}
              </span>

            </div>

          )}

        </div>


        {tenant.note && (

          <div
            className="
              mt-3
              line-clamp-2
              text-xs
              leading-5
              text-slate-500
            "
          >
            {tenant.note}
          </div>

        )}


        {/* ==========================
            ACTIONS
        ========================== */}

        <div
          className="
            mt-4
            flex
            gap-2
          "
        >

          <Link
            to={
              `/tenants/${tenant.id}`
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


                  onEdit();

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

              Sửa

            </button>


            {contract
              &&
              room
              ? (

                <Link
                  to={
                    `/rooms/${room.id}`
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

                  <Building2
                    size={16}
                  />

                  Phòng

                </Link>

              ) : (

                <button
                  type="button"
                  onClick={
                    () => {

                      setActionsOpen(
                        false
                      );


                      onCreateContract();

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
                    border-[#ead9b7]
                    bg-[#fffaf0]
                    px-3
                    text-sm
                    font-semibold
                    text-[#8a6726]
                    active:bg-[#fff4dc]
                  "
                >

                  <FileText
                    size={16}
                  />

                  Tạo hợp đồng

                </button>

              )}


            {contract ? (

              <Link
                to={
                  `/contracts/${contract.id}`
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

                <FileText
                  size={16}
                />

                Xem hợp đồng

                <ArrowUpRight
                  size={15}
                />

              </Link>

            ) : (

              <button
                type="button"
                onClick={
                  () => {

                    setActionsOpen(
                      false
                    );


                    onDelete();

                  }
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
                  border-red-200
                  bg-red-50
                  px-3
                  text-sm
                  font-medium
                  text-red-600
                  active:bg-red-100
                "
              >

                <Trash2
                  size={16}
                />

                Xóa khách

              </button>

            )}

          </div>

        )}

      </div>

    </article>

  );

}


export default MobileTenantCard;
