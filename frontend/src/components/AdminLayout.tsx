import {
  useState,
} from "react";

import {
  Outlet,
  useNavigate,
} from "react-router";

import {
  LogOut,
  Menu,
  ShieldCheck,
} from "lucide-react";


import Sidebar
  from "./Sidebar";

import NotificationBell
  from "./NotificationBell";

import MobileHeader
  from "./mobile/MobileHeader";

import MobileBottomNav
  from "./mobile/MobileBottomNav";


import {
  clearAuth,
  getStoredUser,
} from "../auth";


function AdminLayout() {

  const navigate =
    useNavigate();


  const user =
    getStoredUser();


  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(
    false
  );


  const userEmail =
    user?.email
    ?? "Admin";


  const userRole =
    user?.role
    ?? "ADMIN";


  const userInitial =
    userEmail
      .charAt(
        0
      )
      .toUpperCase();


  function handleLogout() {

    clearAuth();


    navigate(
      "/login",
      {
        replace:
          true,
      }
    );

  }


  return (

    <div
      className="admin-layout"
    >

      {/* ==========================
          DESKTOP SIDEBAR
      ========================== */}

      <div
        className="
          hidden
          md:block
        "
      >

        <Sidebar
          isOpen={
            sidebarOpen
          }
          onClose={
            () =>
              setSidebarOpen(
                false
              )
          }
        />

      </div>


      <div
        className="main-area"
      >

        {/* ==========================
            DESKTOP TOPBAR
        ========================== */}

        <div
          className="
            hidden
            md:block
          "
        >

          <header
            className="topbar rosehome-topbar"
          >

            {/* LEFT */}

            <div
              className="topbar-left"
            >

              <button
                type="button"
                className=
                  "mobile-menu-button rosehome-mobile-menu-button"
                onClick={
                  () =>
                    setSidebarOpen(
                      true
                    )
                }
                aria-label="Mở menu"
              >

                <Menu
                  size={21}
                />

              </button>


              <div
                className=
                  "topbar-brand rosehome-topbar-brand"
              >

                <div
                  className=
                    "rosehome-topbar-logo-box"
                >

                  <img
                    src="/Rosehome.png"
                    alt=
                      "Rosehome Apartment"
                    className=
                      "rosehome-topbar-logo"
                  />

                </div>


                <div
                  className=
                    "rosehome-topbar-text"
                >

                  <div
                    className=
                      "rosehome-topbar-name"
                  >
                    Rosehome Apartment
                  </div>


                  <div
                    className=
                      "rosehome-topbar-subtitle"
                  >

                    <span
                      className=
                        "rosehome-topbar-dot"
                    />

                    Property Management

                  </div>

                </div>

              </div>

            </div>


            {/* RIGHT */}

            <div
              className=
                "admin-account rosehome-admin-account"
            >

              <div
                className=
                  "rosehome-notification-slot"
              >

                <NotificationBell />

              </div>


              <div
                className=
                  "rosehome-user-card"
              >

                <div
                  className=
                    "rosehome-user-avatar"
                >
                  {userInitial}
                </div>


                <div
                  className=
                    "admin-info rosehome-admin-info"
                >

                  <strong>
                    {userEmail}
                  </strong>


                  <span>

                    <ShieldCheck
                      size={12}
                    />

                    {userRole}

                  </span>

                </div>

              </div>


              <button
                type="button"
                className=
                  "logout-button rosehome-logout-button"
                onClick={
                  handleLogout
                }
              >

                <LogOut
                  size={16}
                />

                <span>
                  Đăng xuất
                </span>

              </button>

            </div>

          </header>

        </div>


        {/* ==========================
            MOBILE HEADER
        ========================== */}

        <MobileHeader
          userEmail={
            userEmail
          }
          userInitial={
            userInitial
          }
        />


        {/* ==========================
            PAGE
        ========================== */}

        <main
          className="page-content"
        >

          <Outlet />


          {/* ==========================
              MOBILE BOTTOM SAFE SPACE

              MobileBottomNav là fixed nên
              cần vùng scroll thật phía dưới.
          ========================== */}

          <div
            className="md:hidden"
            aria-hidden="true"
            style={{
              height:
                "calc(6rem + env(safe-area-inset-bottom))",
            }}
          />

        </main>


        {/* ==========================
            MOBILE BOTTOM NAV
        ========================== */}

        <MobileBottomNav
          onLogout={
            handleLogout
          }
        />

      </div>

    </div>

  );

}


export default AdminLayout;