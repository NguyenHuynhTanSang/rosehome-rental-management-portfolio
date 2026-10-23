import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router";

import {
  apiGet,
  apiPatchNoBody,
} from "../api/api";

import type {
  NotificationItem,
  NotificationReadAllResult,
  NotificationReadResult,
  NotificationUnreadCount,
} from "../types/notification";


function formatDate(
  value: string
) {
  return new Date(
    `${value}T00:00:00`
  ).toLocaleDateString(
    "vi-VN"
  );
}


function NotificationBell() {

  const navigate =
    useNavigate();

  const wrapperRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    notifications,
    setNotifications,
  ] = useState<NotificationItem[]>([]);

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");


  async function loadUnreadCount() {

    try {

      const data =
        await apiGet<NotificationUnreadCount>(
          "/notifications/unread-count"
        );

      setUnreadCount(
        data.unread_count
      );

    } catch (err) {

      console.error(
        "Không thể tải số thông báo:",
        err
      );

    }

  }


  async function loadNotifications() {

    try {

      setLoading(true);
      setError("");

      const data =
        await apiGet<NotificationItem[]>(
          "/notifications?limit=20"
        );

      setNotifications(
        data
      );

      setUnreadCount(
        data.filter(
          (item) =>
            !item.is_read
        ).length
      );

    } catch (err) {

      console.error(err);

      setError(
        "Không thể tải thông báo."
      );

    } finally {

      setLoading(false);

    }

  }


  useEffect(() => {

    loadUnreadCount();

    const intervalId =
      window.setInterval(
        loadUnreadCount,
        60_000
      );

    return () =>
      window.clearInterval(
        intervalId
      );

  }, []);


  useEffect(() => {

    function handleClickOutside(
      event: MouseEvent
    ) {

      if (
        wrapperRef.current
        &&
        !wrapperRef.current.contains(
          event.target as Node
        )
      ) {

        setOpen(false);

      }

    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {

      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );

    };

  }, []);


  async function handleToggle() {

    const nextOpen =
      !open;

    setOpen(
      nextOpen
    );

    if (nextOpen) {
      await loadNotifications();
    }

  }


  async function handleNotificationClick(
    notification: NotificationItem
  ) {

    try {

      if (
        !notification.is_read
      ) {

        await apiPatchNoBody<
          NotificationReadResult
        >(
          `/notifications/${notification.id}/read`
        );

        setNotifications(
          (current) =>
            current.map(
              (item) =>
                item.id === notification.id
                  ? {
                      ...item,
                      is_read: true,
                    }
                  : item
            )
        );

        setUnreadCount(
          (current) =>
            Math.max(
              0,
              current - 1
            )
        );

      }

      setOpen(false);

      navigate(
        `/contracts/${notification.contract_id}`
      );

    } catch (err) {

      console.error(err);

      setError(
        "Không thể mở thông báo."
      );

    }

  }


  async function handleMarkAllRead() {

    try {

      setError("");

      await apiPatchNoBody<
        NotificationReadAllResult
      >(
        "/notifications/read-all"
      );

      setNotifications(
        (current) =>
          current.map(
            (item) => ({
              ...item,
              is_read: true,
            })
          )
      );

      setUnreadCount(0);

    } catch (err) {

      console.error(err);

      setError(
        "Không thể đánh dấu tất cả đã đọc."
      );

    }

  }


  return (

    <div
      ref={wrapperRef}
      style={{
        position: "relative",
      }}
    >

      <button
        type="button"
        onClick={handleToggle}
        title="Thông báo"
        aria-label="Thông báo"
        style={{
          position: "relative",
          width: "38px",
          height: "38px",
          border: "1px solid #d0d5dd",
          borderRadius: "8px",
          background: "#ffffff",
          cursor: "pointer",
          fontSize: "18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        🔔

        {unreadCount > 0 && (

          <span
            style={{
              position: "absolute",
              top: "-6px",
              right: "-6px",
              minWidth: "19px",
              height: "19px",
              padding: "0 5px",
              borderRadius: "999px",
              background: "#dc2626",
              color: "#ffffff",
              fontSize: "11px",
              fontWeight: 700,
              lineHeight: "19px",
              border: "2px solid #ffffff",
            }}
          >
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>

        )}

      </button>


      {open && (

        <div
          style={{
            position: "absolute",
            top: "46px",
            right: "0",
            width: "390px",
            maxWidth: "calc(100vw - 24px)",
            maxHeight: "520px",
            border: "1px solid #e4e7ec",
            borderRadius: "12px",
            background: "#ffffff",
            boxShadow:
              "0 16px 40px rgba(16, 24, 40, 0.16)",
            overflow: "hidden",
            zIndex: 1000,
          }}
        >

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              padding: "14px 16px",
              borderBottom: "1px solid #eaecf0",
            }}
          >

            <div>

              <strong
                style={{
                  display: "block",
                  fontSize: "15px",
                }}
              >
                Thông báo
              </strong>

              <span
                style={{
                  fontSize: "12px",
                  color: "#667085",
                }}
              >
                {unreadCount > 0
                  ? `${unreadCount} chưa đọc`
                  : "Không có thông báo chưa đọc"}
              </span>

            </div>


            {unreadCount > 0 && (

              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#2563eb",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                Đánh dấu tất cả đã đọc
              </button>

            )}

          </div>


          {error && (

            <div
              style={{
                margin: "10px 12px 0",
                padding: "9px 10px",
                borderRadius: "8px",
                background: "#fef2f2",
                color: "#b91c1c",
                fontSize: "12px",
              }}
            >
              {error}
            </div>

          )}


          <div
            style={{
              maxHeight: "430px",
              overflowY: "auto",
            }}
          >

            {loading ? (

              <div
                style={{
                  padding: "24px 16px",
                  textAlign: "center",
                  color: "#667085",
                  fontSize: "13px",
                }}
              >
                Đang tải thông báo...
              </div>

            ) : notifications.length === 0 ? (

              <div
                style={{
                  padding: "28px 16px",
                  textAlign: "center",
                  color: "#667085",
                  fontSize: "13px",
                }}
              >
                Chưa có thông báo.
              </div>

            ) : (

              notifications.map(
                (notification) => {

                  const urgent =
                    notification.days_remaining
                    <= 7;

                  return (

                    <button
                      type="button"
                      key={notification.id}
                      onClick={
                        () =>
                          handleNotificationClick(
                            notification
                          )
                      }
                      style={{
                        width: "100%",
                        border: "none",
                        borderBottom:
                          "1px solid #f2f4f7",
                        background:
                          notification.is_read
                            ? "#ffffff"
                            : urgent
                              ? "#fef2f2"
                              : "#fffbeb",
                        padding: "12px 16px",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "12px",
                          alignItems: "flex-start",
                        }}
                      >

                        <div
                          style={{
                            minWidth: 0,
                          }}
                        >

                          <strong
                            style={{
                              display: "block",
                              fontSize: "13px",
                              color: "#101828",
                              marginBottom: "4px",
                            }}
                          >
                            {!notification.is_read
                              ? "● "
                              : ""}
                            {notification.title}
                          </strong>

                          <div
                            style={{
                              fontSize: "13px",
                              color: "#344054",
                              marginBottom: "4px",
                            }}
                          >
                            <strong>
                              {notification.room_code}
                            </strong>
                            {" • HĐ #"}
                            {notification.contract_id}
                          </div>

                          <div
                            style={{
                              fontSize: "12px",
                              color: "#667085",
                              lineHeight: 1.5,
                            }}
                          >
                            {notification.message}
                          </div>

                          <div
                            style={{
                              marginTop: "5px",
                              fontSize: "11px",
                              color: "#98a2b3",
                            }}
                          >
                            Hết hạn:{" "}
                            {formatDate(
                              notification.contract_end_date
                            )}
                          </div>

                        </div>


                        <strong
                          style={{
                            fontSize: "12px",
                            color:
                              urgent
                                ? "#dc2626"
                                : "#d97706",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {notification.days_remaining === 0
                            ? "Hôm nay"
                            : `Còn ${notification.days_remaining} ngày`}
                        </strong>

                      </div>

                    </button>

                  );

                }
              )

            )}

          </div>

        </div>

      )}

    </div>

  );

}


export default NotificationBell;