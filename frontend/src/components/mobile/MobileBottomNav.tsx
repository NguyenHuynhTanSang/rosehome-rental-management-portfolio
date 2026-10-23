import {
  useState,
} from "react";

import {
  NavLink,
  useLocation,
} from "react-router";

import {
  Gauge,
  House,
  Menu,
  ReceiptText,
} from "lucide-react";


import MobileMoreMenu
  from "./MobileMoreMenu";


type MobileBottomNavProps = {

  onLogout:
    () => void;

};


const mainItems = [

  {
    name:
      "Tổng quan",

    path:
      "/",

    icon:
      Gauge,
  },

  {
    name:
      "Phòng",

    path:
      "/rooms",

    icon:
      House,
  },

  {
    name:
      "Hóa đơn",

    path:
      "/invoices",

    icon:
      ReceiptText,
  },

];


const morePaths = [

  "/monthly-operations",

  "/tenants",
  "/contracts",
  "/meter-readings",
  "/payments",
  "/debts",
  "/audit-logs",
  "/ai",

];


function MobileBottomNav({
  onLogout,
}: MobileBottomNavProps) {

  const location =
    useLocation();


  const [
    moreOpen,
    setMoreOpen,
  ] = useState(
    false
  );


  const moreIsActive =
    morePaths.some(
      (
        path
      ) =>
        location.pathname === path
        ||
        location.pathname.startsWith(
          `${path}/`
        )
    );


  function handleLogout() {

    setMoreOpen(
      false
    );


    onLogout();

  }


  return (

    <>

      <nav
        className="
          md:hidden
          fixed
          bottom-0
          left-0
          right-0
          z-50
          border-t
          border-slate-200
          bg-white/95
          backdrop-blur
        "
        style={{
          paddingBottom:
            "env(safe-area-inset-bottom)",
        }}
      >

        <div
          className="
            grid
            grid-cols-4
            px-2
          "
        >

          {mainItems.map(
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
                  end={
                    item.path
                    === "/"
                  }
                  className={({
                    isActive,
                  }) =>

                    [
                      "flex",
                      "min-h-16",
                      "flex-col",
                      "items-center",
                      "justify-center",
                      "gap-1",
                      "rounded-xl",
                      "px-1",
                      "text-[11px]",
                      "font-medium",
                      "transition",

                      isActive
                        ? "text-rose-600"
                        : "text-slate-500",
                    ].join(
                      " "
                    )
                  }
                >

                  {({
                    isActive,
                  }) => (

                    <>

                      <div
                        className={
                          [
                            "flex",
                            "h-8",
                            "min-w-10",
                            "items-center",
                            "justify-center",
                            "rounded-xl",
                            "transition",

                            isActive
                              ? "bg-rose-50"
                              : "",
                          ].join(
                            " "
                          )
                        }
                      >

                        <Icon
                          size={20}
                          strokeWidth={
                            isActive
                              ? 2.2
                              : 1.8
                          }
                        />

                      </div>


                      <span>
                        {item.name}
                      </span>

                    </>

                  )}

                </NavLink>

              );

            }
          )}


          {/* ==========================
              MORE
          ========================== */}

          <button
            type="button"
            onClick={
              () =>
                setMoreOpen(
                  true
                )
            }
            className={
              [
                "flex",
                "min-h-16",
                "flex-col",
                "items-center",
                "justify-center",
                "gap-1",
                "rounded-xl",
                "px-1",
                "text-[11px]",
                "font-medium",
                "transition",

                (
                  moreOpen
                  ||
                  moreIsActive
                )
                  ? "text-rose-600"
                  : "text-slate-500",
              ].join(
                " "
              )
            }
          >

            <div
              className={
                [
                  "flex",
                  "h-8",
                  "min-w-10",
                  "items-center",
                  "justify-center",
                  "rounded-xl",

                  (
                    moreOpen
                    ||
                    moreIsActive
                  )
                    ? "bg-rose-50"
                    : "",
                ].join(
                  " "
                )
              }
            >

              <Menu
                size={20}
                strokeWidth={
                  (
                    moreOpen
                    ||
                    moreIsActive
                  )
                    ? 2.2
                    : 1.8
                }
              />

            </div>


            <span>
              Thêm
            </span>

          </button>

        </div>

      </nav>


      <MobileMoreMenu
        isOpen={
          moreOpen
        }
        onClose={
          () =>
            setMoreOpen(
              false
            )
        }
        onLogout={
          handleLogout
        }
      />

    </>

  );

}


export default MobileBottomNav;