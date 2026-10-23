import {
  NavLink,
} from "react-router";

import {
  Building2,
  CalendarDays,
  FileClock,
  FileText,
  Gauge,
  Globe2,
  HandCoins,
  House,
  ReceiptText,
  Sparkles,
  Users,
  WalletCards,
  Zap,
} from "lucide-react";


const menuItems = [

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
      "Vận hành tháng",

    path:
      "/monthly-operations",

    icon:
      CalendarDays,
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
      "Hóa đơn",

    path:
      "/invoices",

    icon:
      ReceiptText,
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

];


type SidebarProps = {

  isOpen:
    boolean;

  onClose:
    () => void;

};


function Sidebar({
  isOpen,
  onClose,
}: SidebarProps) {

  return (

    <>

      {/* ==========================
          MOBILE BACKDROP
      ========================== */}

      <button
        type="button"
        className={
          isOpen

            ? "sidebar-backdrop visible"

            : "sidebar-backdrop"
        }
        aria-label="Đóng menu"
        onClick={
          onClose
        }
      />


      <aside
        className={
          isOpen

            ? "sidebar mobile-open"

            : "sidebar"
        }
      >

        {/* ==========================
            BRAND
        ========================== */}

        <div
          className=
            "rosehome-sidebar-brand-new"
        >

          <div
            className=
              "rosehome-sidebar-logo-box"
          >

            <img
              src="/Rosehome.png"
              alt="Rosehome Apartment"
              className=
                "rosehome-sidebar-logo-new"
            />

          </div>


          <div
            className=
              "rosehome-sidebar-brand-text"
          >

            <strong>
              Rosehome
            </strong>

            <span>
              Apartment
            </span>

          </div>


          <button
            type="button"
            className=
              "sidebar-close-button"
            onClick={
              onClose
            }
            aria-label="Đóng menu"
          >
            ×
          </button>

        </div>


        {/* ==========================
            MANAGEMENT
        ========================== */}

        <div
          className=
            "rosehome-sidebar-section-title"
        >
          QUẢN LÝ
        </div>


        <nav
          className="sidebar-menu"
        >

          {menuItems.map(
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
                  onClick={
                    onClose
                  }
                  className={
                    ({
                      isActive,
                    }) =>

                      isActive

                        ? "menu-item active"

                        : "menu-item"
                  }
                >

                  <Icon
                    size={18}
                    strokeWidth={1.8}
                    className=
                      "menu-item-icon"
                  />

                  <span>
                    {item.name}
                  </span>

                </NavLink>

              );

            }
          )}

        </nav>


        {/* ==========================
            WEBSITE
        ========================== */}

        <div
          className="
            rosehome-sidebar-section-title
            mt-5
          "
        >
          WEBSITE
        </div>


        <nav
          className="sidebar-menu"
        >

          <NavLink
            to="/website"
            onClick={
              onClose
            }
            className={
              ({
                isActive,
              }) =>

                isActive

                  ? "menu-item active"

                  : "menu-item"
            }
          >

            <Globe2
              size={18}
              strokeWidth={1.8}
              className=
                "menu-item-icon"
            />

            <span>
              Quản lý website
            </span>

          </NavLink>

        </nav>


        {/* ==========================
            SYSTEM
        ========================== */}

        <div
          className="
            rosehome-sidebar-section-title
            mt-5
          "
        >
          HỆ THỐNG
        </div>


        <nav
          className="sidebar-menu"
        >

          <NavLink
            to="/audit-logs"
            onClick={
              onClose
            }
            className={
              ({
                isActive,
              }) =>

                isActive

                  ? "menu-item active"

                  : "menu-item"
            }
          >

            <FileClock
              size={18}
              strokeWidth={1.8}
              className=
                "menu-item-icon"
            />

            <span>
              Nhật ký hoạt động
            </span>

          </NavLink>

        </nav>


        {/* ==========================
            AI SECTION
        ========================== */}

        <div
          className="
            rosehome-sidebar-section-title
            mt-5
          "
        >
          TRỢ LÝ
        </div>


        <nav
          className="sidebar-menu"
        >

          <NavLink
            to="/ai"
            onClick={
              onClose
            }
            className={
              ({
                isActive,
              }) =>

                isActive

                  ? "menu-item active"

                  : "menu-item"
            }
          >

            <Sparkles
              size={18}
              strokeWidth={1.8}
              className=
                "menu-item-icon"
            />

            <span>
              Rosehome AI
            </span>

          </NavLink>

        </nav>


        {/* ==========================
            FOOTER
        ========================== */}

        <div
          className=
            "rosehome-sidebar-footer"
        >

          <Building2
            size={15}
          />

          <span>
            Rosehome Management
          </span>

        </div>

      </aside>

    </>

  );

}


export default Sidebar;