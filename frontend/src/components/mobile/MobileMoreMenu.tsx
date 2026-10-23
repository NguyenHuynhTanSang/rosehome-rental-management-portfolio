import {
  NavLink,
} from "react-router";

import {
  CalendarDays,
  FileClock,
  FileText,
  HandCoins,
  LogOut,
  Sparkles,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";


type MobileMoreMenuProps = {

  isOpen:
    boolean;

  onClose:
    () => void;

  onLogout:
    () => void;

};


const moreMenuItems = [

  {
    name:
      "Vận hành tháng",

    path:
      "/monthly-operations",

    icon:
      CalendarDays,
  },

  {
    name:
      "Khách thuê",

    path:
      "/tenants",

    icon:
      Users,
  },

  {
    name:
      "Hợp đồng",

    path:
      "/contracts",

    icon:
      FileText,
  },

  {
    name:
      "Chỉ số điện",

    path:
      "/meter-readings",

    icon:
      Zap,
  },

  {
    name:
      "Giao dịch",

    path:
      "/payments",

    icon:
      WalletCards,
  },

  {
    name:
      "Công nợ",

    path:
      "/debts",

    icon:
      HandCoins,
  },

  {
    name:
      "Nhật ký hoạt động",

    path:
      "/audit-logs",

    icon:
      FileClock,
  },

  {
    name:
      "Rosehome AI",

    path:
      "/ai",

    icon:
      Sparkles,
  },

];


function MobileMoreMenu({
  isOpen,
  onClose,
  onLogout,
}: MobileMoreMenuProps) {

  if (
    !isOpen
  ) {

    return null;

  }


  return (

    <div
      className="
        md:hidden
        fixed
        inset-0
        z-[60]
      "
    >

      <button
        type="button"
        aria-label="Đóng menu"
        className="
          absolute
          inset-0
          bg-slate-950/40
        "
        onClick={
          onClose
        }
      />


      <div
        className="
          absolute
          bottom-0
          left-0
          right-0
          max-h-[80%]
          overflow-y-auto
          rounded-t-3xl
          bg-white
          px-4
          pb-6
          pt-3
          shadow-2xl
        "
        style={{
          paddingBottom:
            "calc(1.5rem + env(safe-area-inset-bottom))",
        }}
      >

        <div
          className="
            mx-auto
            mb-3
            h-1
            w-10
            rounded-full
            bg-slate-300
          "
        />


        <div
          className="
            mb-3
            flex
            items-center
            justify-between
          "
        >

          <div>

            <div
              className="
                text-base
                font-bold
                text-slate-900
              "
            >
              Thêm chức năng
            </div>


            <div
              className="
                mt-0.5
                text-xs
                text-slate-500
              "
            >
              Các công cụ quản lý khác
            </div>

          </div>


          <button
            type="button"
            onClick={
              onClose
            }
            aria-label="Đóng"
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              text-slate-500
              transition
              hover:bg-slate-100
              active:bg-slate-200
            "
          >

            <X
              size={20}
            />

          </button>

        </div>


        <div
          className="
            grid
            grid-cols-2
            gap-2
          "
        >

          {moreMenuItems.map(
            (
              item
            ) => {

              const Icon =
                item.icon;


              return (

                <NavLink
                  key={
                    item.path
                  }
                  to={
                    item.path
                  }
                  onClick={
                    onClose
                  }
                  className={({
                    isActive,
                  }) =>

                    [
                      "flex",
                      "min-h-20",
                      "flex-col",
                      "items-start",
                      "justify-between",
                      "rounded-2xl",
                      "border",
                      "p-3",
                      "transition",

                      isActive
                        ? "border-rose-200 bg-rose-50 text-rose-600"
                        : "border-slate-200 bg-white text-slate-700 active:bg-slate-50",
                    ].join(
                      " "
                    )
                  }
                >

                  <Icon
                    size={20}
                    strokeWidth={1.8}
                  />


                  <span
                    className="
                      text-sm
                      font-semibold
                    "
                  >
                    {item.name}
                  </span>

                </NavLink>

              );

            }
          )}

        </div>


        <button
          type="button"
          onClick={
            onLogout
          }
          className="
            mt-4
            flex
            min-h-12
            w-full
            items-center
            justify-center
            gap-2
            rounded-2xl
            border
            border-red-200
            bg-red-50
            px-4
            text-sm
            font-semibold
            text-red-600
            transition
            active:bg-red-100
          "
        >

          <LogOut
            size={18}
          />

          Đăng xuất

        </button>

      </div>

    </div>

  );

}


export default MobileMoreMenu;