import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  useNavigate,
} from "react-router";

import {
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";

import {
  apiGet,
  apiPost,
} from "../api/api";

import {
  clearAuth,
  getAccessToken,
  saveAuth,
} from "../auth";

import type {
  AuthUser,
  LoginRequest,
  LoginResponse,
} from "../types/auth";


function Login() {

  const navigate =
    useNavigate();


  const [
    email,
    setEmail,
  ] = useState("");


  const [
    password,
    setPassword,
  ] = useState("");


  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  const [
    checkingAuth,
    setCheckingAuth,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState("");


  // ==============================
  // NẾU ĐÃ LOGIN
  // → KHÔNG CHO VÀO /login
  // ==============================

  useEffect(() => {

    async function checkExistingLogin() {

      const token =
        getAccessToken();


      if (!token) {

        setCheckingAuth(false);

        return;

      }


      try {

        const user =
          await apiGet<AuthUser>(
            "/auth/me"
          );


        if (
          user.is_active
          &&
          user.role === "ADMIN"
        ) {

          navigate(
            "/",
            {
              replace: true,
            }
          );


          return;

        }


        clearAuth();


      } catch {

        clearAuth();


      } finally {

        setCheckingAuth(false);

      }

    }


    checkExistingLogin();

  }, [navigate]);


  // ==============================
  // LOGIN
  // ==============================

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    setError("");


    if (
      !email.trim()
      ||
      !password
    ) {

      setError(
        "Vui lòng nhập email và mật khẩu."
      );


      return;

    }


    if (
      password.length > 128
    ) {

      setError(
        "Mật khẩu không hợp lệ."
      );


      return;

    }


    const data:
      LoginRequest = {

        email:
          email
            .trim()
            .toLowerCase(),

        password,

      };


    try {

      setSubmitting(
        true
      );


      const response =
        await apiPost<
          LoginResponse,
          LoginRequest
        >(
          "/auth/login",
          data
        );


      saveAuth(
        response.access_token,
        response.user
      );


      navigate(
        "/",
        {
          replace: true,
        }
      );


    } catch (err) {

      if (
        err instanceof Error
      ) {

        setError(
          err.message
        );


      } else {

        setError(
          "Không thể đăng nhập."
        );

      }


    } finally {

      setSubmitting(
        false
      );

    }

  }


  // ==============================
  // ĐANG KIỂM TRA JWT
  // ==============================

  if (checkingAuth) {

    return (

      <>

        {/* ==========================
            MOBILE
        ========================== */}

        <div
          className="
            flex
            min-h-[100dvh]
            items-center
            justify-center
            bg-[#f7f5f1]
            px-5
            py-8
            md:hidden
          "
        >

          <div
            className="
              w-full
              max-w-sm
              rounded-3xl
              border
              border-[#e9e2d8]
              bg-white
              px-6
              py-8
              text-center
              shadow-[0_18px_50px_rgba(18,32,51,0.08)]
            "
          >

            <div
              className="
                mx-auto
                flex
                h-20
                w-20
                items-center
                justify-center
                overflow-hidden
                rounded-2xl
                border
                border-[#ead9b7]
                bg-[#fffaf0]
                p-2
              "
            >

              <img
                src="/Rosehome.png"
                alt="Rosehome Apartment"
                className="
                  h-full
                  w-full
                  object-contain
                "
              />

            </div>


            <h1
              className="
                mt-5
                text-xl
                font-semibold
                tracking-tight
                text-[#172033]
              "
            >
              Rosehome Apartment
            </h1>


            <div
              className="
                mt-4
                inline-flex
                items-center
                gap-2
                rounded-full
                bg-[#f5eddc]
                px-3
                py-2
                text-xs
                font-medium
                text-[#8a6726]
              "
            >

              <Loader2
                size={14}
                className="animate-spin"
              />

              Đang kiểm tra đăng nhập...

            </div>

          </div>

        </div>


        {/* ==========================
            DESKTOP CŨ
        ========================== */}

        <div className="hidden md:block">

          <div className="login-page">

            <div className="login-card">

              <div
                className="
                  login-brand
                  rosehome-login-brand
                "
              >

                <img
                  src="/Rosehome.png"
                  alt="Rosehome Apartment"
                  className="rosehome-login-logo"
                />


                <h1>
                  Rosehome Apartment
                </h1>


                <p>
                  Đang kiểm tra đăng nhập...
                </p>

              </div>

            </div>

          </div>

        </div>

      </>

    );

  }


  // ==============================
  // FORM LOGIN
  // ==============================

  return (

    <>

      {/* ==========================
          MOBILE LOGIN
      ========================== */}

      <div
        className="
          min-h-[100dvh]
          bg-[#f7f5f1]
          px-5
          pb-8
          pt-7
          md:hidden
        "
      >

        <div
          className="
            mx-auto
            w-full
            max-w-sm
          "
        >

          {/* BRAND */}

          <div
            className="
              mb-6
              text-center
            "
          >

            <div
              className="
                mx-auto
                flex
                h-20
                w-20
                items-center
                justify-center
                overflow-hidden
                rounded-2xl
                border
                border-[#ead9b7]
                bg-white
                p-2
                shadow-sm
              "
            >

              <img
                src="/Rosehome.png"
                alt="Rosehome Apartment"
                className="
                  h-full
                  w-full
                  object-contain
                "
              />

            </div>


            <div
              className="
                mt-4
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.18em]
                text-[#9a762f]
              "
            >
              Rosehome Management
            </div>


            <h1
              className="
                mt-1
                text-2xl
                font-semibold
                tracking-tight
                text-[#172033]
              "
            >
              Chào mừng trở lại
            </h1>


            <p
              className="
                mt-2
                text-sm
                leading-5
                text-slate-500
              "
            >
              Đăng nhập để quản lý phòng, hóa đơn và vận hành Rosehome.
            </p>

          </div>


          {/* LOGIN CARD */}

          <div
            className="
              overflow-hidden
              rounded-3xl
              border
              border-[#e9e2d8]
              bg-white
              shadow-[0_18px_50px_rgba(18,32,51,0.08)]
            "
          >

            <div
              className="
                h-1
                bg-[#d6a64c]
              "
            />


            <form
              onSubmit={
                handleSubmit
              }
              className="
                space-y-5
                p-5
              "
            >

              {/* EMAIL */}

              <label
                className="
                  block
                "
              >

                <span
                  className="
                    mb-2
                    block
                    text-xs
                    font-semibold
                    text-[#344257]
                  "
                >
                  Email
                </span>


                <div
                  className="
                    relative
                  "
                >

                  <Mail
                    size={17}
                    className="
                      pointer-events-none
                      absolute
                      left-3.5
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                    "
                  />


                  <input
                    type="email"
                    value={
                      email
                    }
                    onChange={
                      (event) =>
                        setEmail(
                          event.target.value
                        )
                    }
                    placeholder="admin@example.com"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={254}
                    required
                    className="
                      h-12
                      w-full
                      rounded-xl
                      border
                      border-[#ddd8ce]
                      bg-white
                      pl-10
                      pr-3
                      text-[16px]
                      text-[#172033]
                      outline-none
                      transition
                      placeholder:text-slate-400
                      focus:border-[#d6a64c]
                      focus:ring-2
                      focus:ring-[#d6a64c]/15
                    "
                  />

                </div>

              </label>


              {/* PASSWORD */}

              <label
                className="
                  block
                "
              >

                <span
                  className="
                    mb-2
                    block
                    text-xs
                    font-semibold
                    text-[#344257]
                  "
                >
                  Mật khẩu
                </span>


                <div
                  className="
                    relative
                  "
                >

                  <Lock
                    size={17}
                    className="
                      pointer-events-none
                      absolute
                      left-3.5
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                    "
                  />


                  <input
                    type="password"
                    value={
                      password
                    }
                    onChange={
                      (event) =>
                        setPassword(
                          event.target.value
                        )
                    }
                    placeholder="Nhập mật khẩu"
                    autoComplete="current-password"
                    maxLength={128}
                    required
                    className="
                      h-12
                      w-full
                      rounded-xl
                      border
                      border-[#ddd8ce]
                      bg-white
                      pl-10
                      pr-3
                      text-[16px]
                      text-[#172033]
                      outline-none
                      transition
                      placeholder:text-slate-400
                      focus:border-[#d6a64c]
                      focus:ring-2
                      focus:ring-[#d6a64c]/15
                    "
                  />

                </div>

              </label>


              {/* ERROR */}

              {error && (

                <div
                  className="
                    rounded-xl
                    border
                    border-red-200
                    bg-red-50
                    px-4
                    py-3
                    text-sm
                    leading-5
                    text-red-700
                  "
                >
                  {error}
                </div>

              )}


              {/* SUBMIT */}

              <button
                type="submit"
                disabled={
                  submitting
                }
                className="
                  inline-flex
                  h-12
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-[#122033]
                  px-4
                  text-sm
                  font-semibold
                  text-white
                  shadow-sm
                  transition
                  active:scale-[0.99]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >

                {submitting ? (

                  <>

                    <Loader2
                      size={17}
                      className="animate-spin"
                    />

                    Đang đăng nhập...

                  </>

                ) : (

                  "Đăng nhập"

                )}

              </button>

            </form>


            <div
              className="
                flex
                items-center
                justify-center
                gap-2
                border-t
                border-[#eeeae2]
                bg-[#fcfbf8]
                px-5
                py-4
                text-[11px]
                text-slate-500
              "
            >

              <ShieldCheck
                size={13}
                className=
                  "text-emerald-600"
              />

              Khu vực quản trị Rosehome

            </div>

          </div>


          <div
            className="
              mt-5
              text-center
              text-[11px]
              text-slate-400
            "
          >
            Rosehome Apartment Management System
          </div>

        </div>

      </div>


      {/* ==========================
          DESKTOP CŨ
      ========================== */}

      <div className="hidden md:block">

        <div className="login-page">

          <div className="login-card">

            <div
              className="
                login-brand
                rosehome-login-brand
              "
            >

              <img
                src="/Rosehome.png"
                alt="Rosehome Apartment"
                className="rosehome-login-logo"
              />


              <h1>
                Rosehome Apartment
              </h1>


              <p>
                Đăng nhập vào hệ thống quản lý
              </p>

            </div>


            <form
              className="login-form"
              onSubmit={
                handleSubmit
              }
            >

              <div className="login-field">

                <label>
                  Email
                </label>


                <input
                  type="email"
                  value={
                    email
                  }
                  onChange={
                    (event) =>
                      setEmail(
                        event.target.value
                      )
                  }
                  placeholder="admin@example.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={254}
                  required
                />

              </div>


              <div className="login-field">

                <label>
                  Mật khẩu
                </label>


                <input
                  type="password"
                  value={
                    password
                  }
                  onChange={
                    (event) =>
                      setPassword(
                        event.target.value
                      )
                  }
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  maxLength={128}
                  required
                />

              </div>


              {error && (

                <div className="form-error">
                  {error}
                </div>

              )}


              <button
                type="submit"
                className="login-button"
                disabled={
                  submitting
                }
              >

                {submitting
                  ? "Đang đăng nhập..."
                  : "Đăng nhập"}

              </button>

            </form>


            <div className="login-footer">
              Rosehome Apartment Management System
            </div>

          </div>

        </div>

      </div>

    </>

  );

}


export default Login;
