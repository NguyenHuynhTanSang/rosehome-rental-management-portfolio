import {
  type FormEvent,
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  Globe2,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Phone,
  Save,
  Type,
} from "lucide-react";

import {
  Link,
} from "react-router";

import {
  apiGet,
  apiPut,
} from "../api/api.ts";


type WebsiteSetting = {
  id: number;
  site_name: string;
  hero_badge: string;
  hero_title: string;
  hero_description: string;
  phone: string | null;
  zalo_url: string | null;
  address: string | null;
  contact_note: string | null;
};


type WebsiteSettingSave = {
  site_name: string;
  hero_badge: string;
  hero_title: string;
  hero_description: string;
  phone: string | null;
  zalo_url: string | null;
  address: string | null;
  contact_note: string | null;
};


type FormState = {
  site_name: string;
  hero_badge: string;
  hero_title: string;
  hero_description: string;
  phone: string;
  zalo_url: string;
  address: string;
  contact_note: string;
};


const initialForm: FormState = {
  site_name: "",
  hero_badge: "",
  hero_title: "",
  hero_description: "",
  phone: "",
  zalo_url: "",
  address: "",
  contact_note: "",
};


function optionalText(
  value: string
): string | null {

  const cleaned =
    value.trim();

  return cleaned
    ? cleaned
    : null;
}


function WebsiteSettings() {

  const [
    form,
    setForm,
  ] = useState<FormState>(
    initialForm
  );


  const [
    loading,
    setLoading,
  ] = useState(
    true
  );


  const [
    saving,
    setSaving,
  ] = useState(
    false
  );


  const [
    error,
    setError,
  ] = useState<
    string
    | null
  >(
    null
  );


  const [
    success,
    setSuccess,
  ] = useState(
    false
  );


  useEffect(
    () => {

      async function loadSettings() {

        try {

          setLoading(
            true
          );

          setError(
            null
          );


          const data =
            await apiGet<
              WebsiteSetting
            >(
              "/website-settings"
            );


          setForm({
            site_name:
              data.site_name,

            hero_badge:
              data.hero_badge,

            hero_title:
              data.hero_title,

            hero_description:
              data.hero_description,

            phone:
              data.phone
              ?? "",

            zalo_url:
              data.zalo_url
              ?? "",

            address:
              data.address
              ?? "",

            contact_note:
              data.contact_note
              ?? "",
          });

        } catch (
          err
        ) {

          setError(
            err instanceof Error
              ? err.message
              : "Không thể tải thông tin website."
          );

        } finally {

          setLoading(
            false
          );

        }

      }


      void loadSettings();

    },
    []
  );


  function updateField(
    field: keyof FormState,
    value: string
  ) {

    setForm(
      (
        previous
      ) => ({
        ...previous,
        [field]: value,
      })
    );


    setSuccess(
      false
    );
  }


  async function handleSubmit(
    event: FormEvent
  ) {

    event.preventDefault();


    if (
      !form.site_name.trim()
      ||
      !form.hero_badge.trim()
      ||
      !form.hero_title.trim()
      ||
      !form.hero_description.trim()
    ) {

      setError(
        "Tên website, nhãn giới thiệu, tiêu đề và mô tả không được để trống."
      );

      return;
    }


    try {

      setSaving(
        true
      );

      setError(
        null
      );

      setSuccess(
        false
      );


      const payload:
        WebsiteSettingSave = {

        site_name:
          form.site_name.trim(),

        hero_badge:
          form.hero_badge.trim(),

        hero_title:
          form.hero_title.trim(),

        hero_description:
          form.hero_description.trim(),

        phone:
          optionalText(
            form.phone
          ),

        zalo_url:
          optionalText(
            form.zalo_url
          ),

        address:
          optionalText(
            form.address
          ),

        contact_note:
          optionalText(
            form.contact_note
          ),
      };


      const data =
        await apiPut<
          WebsiteSetting,
          WebsiteSettingSave
        >(
          "/website-settings",
          payload
        );


      setForm({
        site_name:
          data.site_name,

        hero_badge:
          data.hero_badge,

        hero_title:
          data.hero_title,

        hero_description:
          data.hero_description,

        phone:
          data.phone
          ?? "",

        zalo_url:
          data.zalo_url
          ?? "",

        address:
          data.address
          ?? "",

        contact_note:
          data.contact_note
          ?? "",
      });


      setSuccess(
        true
      );

    } catch (
      err
    ) {

      setError(
        err instanceof Error
          ? err.message
          : "Không thể lưu thông tin website."
      );

    } finally {

      setSaving(
        false
      );

    }

  }


  if (
    loading
  ) {

    return (

      <div
        className="
          flex
          min-h-64
          items-center
          justify-center
        "
      >

        <LoaderCircle
          size={30}
          className="animate-spin"
        />

      </div>

    );
  }


  return (

    <div
      className="
        mx-auto
        w-full
        max-w-5xl
        space-y-6
      "
    >

      <Link
        to="/website"
        className="
          inline-flex
          items-center
          gap-2
          text-sm
          font-medium
          text-neutral-500
          transition
          hover:text-neutral-900
        "
      >

        <ArrowLeft
          size={17}
        />

        Quản lý website

      </Link>


      <div>

        <p
          className="
            text-sm
            font-medium
            text-neutral-500
          "
        >
          WEBSITE / THÔNG TIN CHUNG
        </p>


        <h1
          className="
            mt-1
            text-2xl
            font-semibold
            text-neutral-900
          "
        >
          Thông tin website
        </h1>


        <p
          className="
            mt-2
            text-sm
            leading-6
            text-neutral-500
          "
        >
          Chỉnh nội dung giới thiệu và thông tin
          liên hệ hiển thị trên website công khai.
        </p>

      </div>


      {error && (

        <div
          className="
            rounded-xl
            border
            border-red-200
            bg-red-50
            p-4
            text-sm
            text-red-700
          "
        >
          {error}
        </div>

      )}


      {success && (

        <div
          className="
            rounded-xl
            border
            border-emerald-200
            bg-emerald-50
            p-4
            text-sm
            font-medium
            text-emerald-700
          "
        >
          Đã lưu thông tin website thành công.
        </div>

      )}


      <form
        onSubmit={
          handleSubmit
        }
        className="
          space-y-5
        "
      >

        <section
          className="
            rounded-2xl
            border
            border-neutral-200
            bg-white
            p-5
          "
        >

          <div
            className="
              flex
              items-center
              gap-2
            "
          >

            <Globe2
              size={18}
            />

            <h2
              className="
                font-semibold
                text-neutral-900
              "
            >
              Thông tin thương hiệu
            </h2>

          </div>


          <div
            className="
              mt-5
              grid
              gap-4
            "
          >

            <label
              className="space-y-2"
            >

              <span
                className="
                  flex
                  items-center
                  gap-2
                  text-sm
                  font-medium
                  text-neutral-700
                "
              >

                <Type
                  size={15}
                />

                Tên website

              </span>


              <input
                type="text"
                maxLength={100}
                value={
                  form.site_name
                }
                onChange={
                  (
                    event
                  ) =>
                    updateField(
                      "site_name",
                      event.target.value
                    )
                }
                placeholder="Rosehome Apartment"
                className="
                  min-h-11
                  w-full
                  rounded-xl
                  border
                  border-neutral-200
                  px-3
                  outline-none
                  transition
                  focus:border-neutral-400
                "
              />

            </label>

          </div>

        </section>


        <section
          className="
            rounded-2xl
            border
            border-neutral-200
            bg-white
            p-5
          "
        >

          <h2
            className="
              font-semibold
              text-neutral-900
            "
          >
            Nội dung đầu trang
          </h2>


          <p
            className="
              mt-1
              text-sm
              text-neutral-500
            "
          >
            Nội dung này sẽ xuất hiện ở khu vực
            Hero trên trang chủ.
          </p>


          <div
            className="
              mt-5
              grid
              gap-4
            "
          >

            <label className="space-y-2">
              <span className="text-sm font-medium text-neutral-700">
                Nhãn giới thiệu
              </span>
              <input
                type="text"
                maxLength={150}
                value={form.hero_badge}
                onChange={(event) =>
                  updateField("hero_badge", event.target.value)
                }
                placeholder="Phòng trọ & căn hộ cho thuê"
                className="min-h-11 w-full rounded-xl border border-neutral-200 px-3 outline-none transition focus:border-neutral-400"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-neutral-700">
                Tiêu đề chính
              </span>
              <input
                type="text"
                maxLength={255}
                value={form.hero_title}
                onChange={(event) =>
                  updateField("hero_title", event.target.value)
                }
                placeholder="Không gian phù hợp cho cuộc sống của bạn"
                className="min-h-11 w-full rounded-xl border border-neutral-200 px-3 outline-none transition focus:border-neutral-400"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-neutral-700">
                Mô tả
              </span>
              <textarea
                rows={4}
                maxLength={2000}
                value={form.hero_description}
                onChange={(event) =>
                  updateField("hero_description", event.target.value)
                }
                placeholder="Mô tả ngắn về Rosehome..."
                className="w-full rounded-xl border border-neutral-200 p-3 outline-none transition focus:border-neutral-400"
              />
            </label>

          </div>

        </section>


        <section
          className="
            rounded-2xl
            border
            border-neutral-200
            bg-white
            p-5
          "
        >

          <h2 className="font-semibold text-neutral-900">
            Thông tin liên hệ
          </h2>

          <p className="mt-1 text-sm text-neutral-500">
            Các thông tin này sẽ được dùng cho nút gọi điện,
            Zalo và phần liên hệ trên website.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">

            <label className="space-y-2">
              <span className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                <Phone size={15} />
                Số điện thoại
              </span>
              <input
                type="tel"
                maxLength={30}
                value={form.phone}
                onChange={(event) =>
                  updateField("phone", event.target.value)
                }
                placeholder="Số điện thoại (chưa cấu hình trong bản demo)"
                className="min-h-11 w-full rounded-xl border border-neutral-200 px-3 outline-none transition focus:border-neutral-400"
              />
            </label>

            <label className="space-y-2">
              <span className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                <MessageCircle size={15} />
                Link Zalo
              </span>
              <input
                type="url"
                maxLength={500}
                value={form.zalo_url}
                onChange={(event) =>
                  updateField("zalo_url", event.target.value)
                }
                placeholder="Liên kết Zalo (chưa cấu hình trong bản demo)"
                className="min-h-11 w-full rounded-xl border border-neutral-200 px-3 outline-none transition focus:border-neutral-400"
              />
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                <MapPin size={15} />
                Địa chỉ
              </span>
              <input
                type="text"
                maxLength={500}
                value={form.address}
                onChange={(event) =>
                  updateField("address", event.target.value)
                }
                placeholder="Nhập địa chỉ Rosehome"
                className="min-h-11 w-full rounded-xl border border-neutral-200 px-3 outline-none transition focus:border-neutral-400"
              />
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-medium text-neutral-700">
                Ghi chú liên hệ
              </span>
              <textarea
                rows={4}
                maxLength={2000}
                value={form.contact_note}
                onChange={(event) =>
                  updateField("contact_note", event.target.value)
                }
                placeholder="Ví dụ: Liên hệ trước để hẹn lịch xem phòng."
                className="w-full rounded-xl border border-neutral-200 p-3 outline-none transition focus:border-neutral-400"
              />
            </label>

          </div>

        </section>


        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">

          <Link
            to="/website"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            Hủy
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <Save size={17} />
            )}

            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>

        </div>

      </form>

    </div>
  );
}


export default WebsiteSettings;
