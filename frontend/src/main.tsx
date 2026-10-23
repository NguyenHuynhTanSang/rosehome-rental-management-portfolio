import {
  StrictMode,
  useEffect,
  useState,
} from "react";

import {
  createRoot,
} from "react-dom/client";

import {
  BrowserRouter,
  useLocation,
  useNavigate,
} from "react-router";

import {
  Capacitor,
} from "@capacitor/core";

import {
  App as CapacitorApp,
} from "@capacitor/app";

import {
  SplashScreen,
} from "@capacitor/splash-screen";

import App from "./App";

import AppUpdateChecker from "./components/AppUpdateChecker";

import splashImage from "../assets/splash-mobile.png";

import "./index.css";


// =========================================================
// ANDROID BACK BUTTON
// =========================================================

function AndroidBackHandler() {

  const navigate =
    useNavigate();


  const location =
    useLocation();


  useEffect(
    () => {

      if (
        !Capacitor.isNativePlatform()
      ) {
        return;
      }


      const listener =
        CapacitorApp.addListener(
          "backButton",
          (
            {
              canGoBack,
            }
          ) => {

            const isRootPage =
              location.pathname === "/"
              ||
              location.pathname === "/dashboard"
              ||
              location.pathname === "/login";


            // Dashboard / Login:
            // bấm Back vật lý -> thoát app.
            if (
              isRootPage
            ) {

              CapacitorApp.exitApp();

              return;

            }


            // Các trang con:
            // quay lại màn trước.
            if (
              canGoBack
            ) {

              navigate(
                -1
              );

              return;

            }


            // Trường hợp Android không còn history
            // nhưng đang ở trang con -> về Dashboard.
            navigate(
              "/",
              {
                replace:
                  true,
              }
            );

          }
        );


      return () => {

        listener.then(
          (
            handle
          ) => {

            handle.remove();

          }
        );

      };

    },
    [
      location.pathname,
      navigate,
    ]
  );


  return null;

}


// =========================================================
// ROSEHOME BRANDED SPLASH
// =========================================================

function RosehomeLaunchSplash() {

  const isNative =
    Capacitor.isNativePlatform();


  const [
    visible,
    setVisible,
  ] = useState(
    isNative
  );


  const [
    fading,
    setFading,
  ] = useState(
    false
  );


  useEffect(
    () => {

      if (
        !isNative
      ) {
        return;
      }


      // Ẩn splash mặc định của Android / Capacitor
      // sau khi React đã mount.
      SplashScreen.hide()
        .catch(
          (
            error
          ) => {

            console.warn(
              "Không thể ẩn native splash:",
              error
            );

          }
        );


      // Cho branded splash hiển thị khoảng 1.3 giây.
      const fadeTimer =
        window.setTimeout(
          () => {

            setFading(
              true
            );

          },
          1300
        );


      // Sau hiệu ứng fade thì gỡ splash khỏi DOM.
      const hideTimer =
        window.setTimeout(
          () => {

            setVisible(
              false
            );

          },
          1600
        );


      return () => {

        window.clearTimeout(
          fadeTimer
        );


        window.clearTimeout(
          hideTimer
        );

      };

    },
    [
      isNative,
    ]
  );


  if (
    !visible
  ) {
    return null;
  }


  return (

    <div
      style={{
        position:
          "fixed",

        inset:
          0,

        zIndex:
          99999,

        display:
          "flex",

        alignItems:
          "center",

        justifyContent:
          "center",

        overflow:
          "hidden",

        backgroundColor:
          "#fff9f4",

        opacity:
          fading
            ? 0
            : 1,

        transition:
          "opacity 300ms ease",
      }}
    >

      <img
        src={
          splashImage
        }
        alt="Rosehome Apartment"
        draggable={
          false
        }
        style={{
          position:
            "absolute",

          inset:
            0,

          width:
            "100%",

          height:
            "100%",

          objectFit:
            "cover",

          objectPosition:
            "center",

          userSelect:
            "none",
        }}
      />

    </div>

  );

}


// =========================================================
// APP ROOT
// =========================================================

createRoot(
  document.getElementById(
    "root"
  )!
).render(

  <StrictMode>

    <BrowserRouter>

      <AndroidBackHandler />

      <RosehomeLaunchSplash />

      <AppUpdateChecker />

      <App />

    </BrowserRouter>

  </StrictMode>

);