import {
  useEffect,
  useState,
} from "react";

import {
  Navigate,
  Outlet,
} from "react-router";

import {
  apiGet,
} from "../api/api";

import {
  clearAuth,
  getAccessToken,
} from "../auth";

import type {
  AuthUser,
} from "../types/auth";


function ProtectedRoute() {

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    authenticated,
    setAuthenticated,
  ] = useState(false);


  useEffect(() => {

    async function checkAuth() {

      const token =
        getAccessToken();


      // Không có token
      if (!token) {

        setAuthenticated(false);
        setLoading(false);

        return;
      }


      try {

        // Backend kiểm tra JWT thật
        const user =
          await apiGet<AuthUser>(
            "/auth/me"
          );


        // Hiện tại Admin UI chỉ dành cho ADMIN
        if (
          user.role !== "ADMIN"
          ||
          !user.is_active
        ) {

          clearAuth();

          setAuthenticated(false);
          setLoading(false);

          return;
        }


        setAuthenticated(true);

      } catch (error) {

        console.error(
          "Auth check failed:",
          error
        );


        // Token sai / hết hạn
        clearAuth();

        setAuthenticated(false);

      } finally {

        setLoading(false);

      }

    }


    checkAuth();

  }, []);


  // ==============================
  // ĐANG KIỂM TRA TOKEN
  // ==============================

  if (loading) {

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Đang kiểm tra đăng nhập...
      </div>
    );

  }


  // ==============================
  // CHƯA LOGIN
  // ==============================

  if (!authenticated) {

    return (
      <Navigate
        to="/login"
        replace
      />
    );

  }


  // ==============================
  // ĐÃ LOGIN
  // ==============================

  return <Outlet />;
}


export default ProtectedRoute;