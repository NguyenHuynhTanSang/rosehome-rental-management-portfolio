import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Capacitor,
} from "@capacitor/core";

import {
  App as CapacitorApp,
} from "@capacitor/app";

import {
  Browser,
} from "@capacitor/browser";

import {
  useLocation,
} from "react-router";


import {
  getAccessToken,
} from "../auth";

import {
  apiGet,
} from "../api/api";


// =========================================================
// TYPES
// =========================================================

type AppVersionResponse = {

  platform:
    string;

  latest_version:
    string;

  latest_build:
    number;

  minimum_build:
    number;

  force_update:
    boolean;

  release_notes:
    string[];

  download_requires_auth:
    boolean;

};


type AppUpdateDownloadResponse = {

  latest_version:
    string;

  latest_build:
    number;

  download_url:
    string;

  expires_in:
    number;

};


// =========================================================
// APP UPDATE CHECKER
// =========================================================

export default function AppUpdateChecker() {

  const location =
    useLocation();


  const [
    updateInfo,
    setUpdateInfo,
  ] = useState<AppVersionResponse | null>(
    null
  );


  const [
    currentVersion,
    setCurrentVersion,
  ] = useState(
    ""
  );


  const [
    currentBuild,
    setCurrentBuild,
  ] = useState(
    0
  );


  const [
    visible,
    setVisible,
  ] = useState(
    false
  );


  const [
    downloading,
    setDownloading,
  ] = useState(
    false
  );


  const [
    errorMessage,
    setErrorMessage,
  ] = useState(
    ""
  );


  const checkedBuildRef =
    useRef<string | null>(
      null
    );


  // =======================================================
  // CHECK VERSION
  // =======================================================

  useEffect(
    () => {

      // Chỉ chạy trong app Android/iOS native.
      //
      // Website Rosehome trên trình duyệt
      // không cần popup APK.
      if (
        !Capacitor.isNativePlatform()
      ) {

        return;

      }


      // Download APK hiện yêu cầu
      // tài khoản admin.
      //
      // Nếu chưa login thì chờ.
      //
      // Sau khi login và route đổi sang Dashboard,
      // useEffect này sẽ chạy lại.
      const token =
        getAccessToken();


      if (
        !token
      ) {

        checkedBuildRef.current =
          null;

        return;

      }


      let cancelled =
        false;


      const checkForUpdate =
        async () => {

          try {

            // Lấy version/build thật
            // từ APK đang được cài trên máy.
            const appInfo =
              await CapacitorApp.getInfo();


            if (
              cancelled
            ) {

              return;

            }


            const installedBuild =
              Number.parseInt(
                appInfo.build,
                10
              );


            if (
              !Number.isFinite(
                installedBuild
              )
            ) {

              console.warn(
                "Không đọc được Android build number:",
                appInfo.build
              );

              return;

            }


            // Không gọi server liên tục
            // mỗi khi user chuyển trang.
            if (
              checkedBuildRef.current
              === appInfo.build
            ) {

              return;

            }


            checkedBuildRef.current =
              appInfo.build;


            const serverInfo =
              await apiGet<AppVersionResponse>(
                "/app/version"
              );


            if (
              cancelled
            ) {

              return;

            }


            // Checker hiện tại dành cho Android.
            if (
              serverInfo.platform
              !== "android"
            ) {

              return;

            }


            setCurrentVersion(
              appInfo.version
            );


            setCurrentBuild(
              installedBuild
            );


            // Build number là tiêu chí chính
            // để xác định có update hay không.
            //
            // Ví dụ:
            //
            // máy:   build 1
            // server: build 2
            //
            // => có update.
            const hasUpdate =

              serverInfo.latest_build
              >
              installedBuild;


            if (
              hasUpdate
            ) {

              setUpdateInfo(
                serverInfo
              );

              setErrorMessage(
                ""
              );

              setVisible(
                true
              );

            }


          } catch (
            error
          ) {

            // Không làm app bị lỗi chỉ vì
            // server update tạm thời không truy cập được.
            console.warn(
              "Không thể kiểm tra cập nhật Rosehome:",
              error
            );

          }

        };


      void checkForUpdate();


      return () => {

        cancelled =
          true;

      };

    },
    [
      location.pathname,
    ]
  );


  // =======================================================
  // UPDATE NOW
  // =======================================================

  const handleUpdateNow =
    async () => {

      if (
        downloading
      ) {

        return;

      }


      setDownloading(
        true
      );


      setErrorMessage(
        ""
      );


      try {

        // Endpoint này yêu cầu ADMIN JWT.
        //
        // Backend sẽ tạo presigned URL
        // R2 sống tạm thời.
        const downloadInfo =
          await apiGet<AppUpdateDownloadResponse>(
            "/app/version/download"
          );


        await Browser.open({

          url:
            downloadInfo.download_url,

        });


      } catch (
        error
      ) {

        console.error(
          "Không thể tải bản cập nhật:",
          error
        );


        setErrorMessage(

          error instanceof Error

            ? error.message

            : (
                "Không thể tải bản cập nhật. "
                + "Vui lòng thử lại."
              )

        );


      } finally {

        setDownloading(
          false
        );

      }

    };


  // =======================================================
  // NO UPDATE MODAL
  // =======================================================

  if (
    !visible
    ||
    !updateInfo
  ) {

    return null;

  }


  // Bắt buộc update nếu:
  //
  // 1. Backend bật force_update
  //
  // hoặc
  //
  // 2. Build hiện tại thấp hơn minimum_build.
  const mustUpdate =

    updateInfo.force_update

    ||

    currentBuild
    <
    updateInfo.minimum_build;


  // =======================================================
  // UI
  // =======================================================

  return (

    <div
      style={{

        position:
          "fixed",

        inset:
          0,

        zIndex:
          99998,

        display:
          "flex",

        alignItems:
          "center",

        justifyContent:
          "center",

        padding:
          "24px",

        background:
          "rgba(15, 23, 42, 0.48)",

        backdropFilter:
          "blur(4px)",

      }}
    >

      <div
        style={{

          width:
            "100%",

          maxWidth:
            "420px",

          overflow:
            "hidden",

          borderRadius:
            "24px",

          border:
            "1px solid rgba(226, 178, 90, 0.30)",

          background:
            "#fffdf9",

          boxShadow:
            "0 24px 70px rgba(15, 23, 42, 0.22)",

        }}
      >

        {/* ============================================= */}
        {/* HEADER */}
        {/* ============================================= */}

        <div
          style={{

            padding:
              "24px 24px 18px",

            borderBottom:
              "1px solid #f1e8dc",

          }}
        >

          <div
            style={{

              marginBottom:
                "7px",

              fontSize:
                "11px",

              fontWeight:
                700,

              letterSpacing:
                "0.14em",

              color:
                "#b27a26",

            }}
          >

            ROSEHOME UPDATE

          </div>


          <div
            style={{

              fontSize:
                "21px",

              fontWeight:
                750,

              color:
                "#132238",

            }}
          >

            Có phiên bản mới

          </div>


          <div
            style={{

              marginTop:
                "8px",

              fontSize:
                "14px",

              lineHeight:
                1.55,

              color:
                "#64748b",

            }}
          >

            Rosehome {

              updateInfo.latest_version

            } đã sẵn sàng để cài đặt.

          </div>

        </div>


        {/* ============================================= */}
        {/* CONTENT */}
        {/* ============================================= */}

        <div
          style={{

            padding:
              "20px 24px",

          }}
        >

          <div
            style={{

              display:
                "flex",

              justifyContent:
                "space-between",

              gap:
                "16px",

              marginBottom:
                "18px",

              padding:
                "12px 14px",

              borderRadius:
                "14px",

              background:
                "#fff7ed",

              fontSize:
                "13px",

            }}
          >

            <div>

              <div
                style={{

                  marginBottom:
                    "3px",

                  color:
                    "#94a3b8",

                }}
              >

                Phiên bản hiện tại

              </div>


              <strong
                style={{

                  color:
                    "#334155",

                }}
              >

                {currentVersion}

              </strong>

            </div>


            <div
              style={{

                textAlign:
                  "right",

              }}
            >

              <div
                style={{

                  marginBottom:
                    "3px",

                  color:
                    "#94a3b8",

                }}
              >

                Phiên bản mới

              </div>


              <strong
                style={{

                  color:
                    "#b26f1c",

                }}
              >

                {updateInfo.latest_version}

              </strong>

            </div>

          </div>


          {
            updateInfo.release_notes.length
            >
            0
            &&
            (

              <div>

                <div
                  style={{

                    marginBottom:
                      "8px",

                    fontSize:
                      "13px",

                    fontWeight:
                      700,

                    color:
                      "#334155",

                  }}
                >

                  Nội dung cập nhật

                </div>


                <div
                  style={{

                    display:
                      "flex",

                    flexDirection:
                      "column",

                    gap:
                      "7px",

                  }}
                >

                  {
                    updateInfo.release_notes.map(
                      (
                        note,
                        index
                      ) => (

                        <div
                          key={
                            `${index}-${note}`
                          }
                          style={{

                            display:
                              "flex",

                            gap:
                              "9px",

                            fontSize:
                              "13px",

                            lineHeight:
                              1.5,

                            color:
                              "#64748b",

                          }}
                        >

                          <span
                            style={{

                              color:
                                "#d89832",

                              fontWeight:
                                700,

                            }}
                          >

                            •

                          </span>


                          <span>

                            {note}

                          </span>

                        </div>

                      )
                    )
                  }

                </div>

              </div>

            )
          }


          {
            mustUpdate
            &&
            (

              <div
                style={{

                  marginTop:
                    "16px",

                  padding:
                    "11px 13px",

                  borderRadius:
                    "12px",

                  background:
                    "#fff1f2",

                  fontSize:
                    "12px",

                  lineHeight:
                    1.5,

                  color:
                    "#be123c",

                }}
              >

                Phiên bản hiện tại không còn được hỗ trợ.
                Vui lòng cập nhật để tiếp tục sử dụng Rosehome.

              </div>

            )
          }


          {
            errorMessage
            &&
            (

              <div
                style={{

                  marginTop:
                    "16px",

                  padding:
                    "11px 13px",

                  borderRadius:
                    "12px",

                  background:
                    "#fff1f2",

                  fontSize:
                    "12px",

                  lineHeight:
                    1.5,

                  color:
                    "#be123c",

                }}
              >

                {errorMessage}

              </div>

            )
          }

        </div>


        {/* ============================================= */}
        {/* ACTIONS */}
        {/* ============================================= */}

        <div
          style={{

            display:
              "flex",

            gap:
              "10px",

            padding:
              "0 24px 24px",

          }}
        >

          {
            !mustUpdate
            &&
            (

              <button
                type="button"
                disabled={
                  downloading
                }
                onClick={
                  () => {

                    setVisible(
                      false
                    );

                  }
                }
                style={{

                  flex:
                    1,

                  minHeight:
                    "46px",

                  border:
                    "1px solid #e2e8f0",

                  borderRadius:
                    "13px",

                  background:
                    "#ffffff",

                  color:
                    "#475569",

                  fontSize:
                    "14px",

                  fontWeight:
                    650,

                  cursor:
                    "pointer",

                }}
              >

                Để sau

              </button>

            )
          }


          <button
            type="button"
            disabled={
              downloading
            }
            onClick={
              () => {

                void handleUpdateNow();

              }
            }
            style={{

              flex:
                mustUpdate
                  ? 1
                  : 1.35,

              minHeight:
                "46px",

              border:
                "none",

              borderRadius:
                "13px",

              background:
                "#132238",

              color:
                "#ffffff",

              fontSize:
                "14px",

              fontWeight:
                700,

              opacity:
                downloading
                  ? 0.7
                  : 1,

              cursor:
                downloading
                  ? "default"
                  : "pointer",

            }}
          >

            {
              downloading

                ? "Đang chuẩn bị..."

                : "Cập nhật ngay"
            }

          </button>

        </div>

      </div>

    </div>

  );

}