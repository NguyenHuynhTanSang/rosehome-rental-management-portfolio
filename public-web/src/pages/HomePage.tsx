import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router";

import {
  publicApiGet,
} from "@/lib/api";

import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  Camera,
  CarFront,
  CircleHelp,
  Clock3,
  Droplets,
  GraduationCap,
  Hospital,
  House,
  LoaderCircle,
  MapPin,
  MapPinned,
  Maximize2,
  Menu,
  MessageCircle,
  PawPrint,
  Phone,
  RefreshCw,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserRoundCheck,
  Users,
  WalletCards,
  Wifi,
  Zap,
} from "lucide-react";


type PublicRoom = {
  id: number;
  room_code: string;

  floor:
    number
    | null;

  description:
    string
    | null;

  public_status: string;
  monthly_rent: number;
  area_m2: number;
  max_occupants: number;

  available_from:
    string
    | null;

  deposit_months: number;
  parking_fee: number;
  wifi_fee: number;
  images: string[];
};


type PublicWebsiteSetting = {
  site_name: string;
  hero_badge: string;
  hero_title: string;
  hero_description: string;

  phone:
    string
    | null;

  zalo_url:
    string
    | null;

  address:
    string
    | null;

  contact_note:
    string
    | null;
};


type PublicFaq = {
  id: number;
  question: string;
  answer: string;
};


type PublicWebsiteImage = {
  id: number;
  image_type: "HERO" | "GALLERY";

  alt_text:
    string
    | null;

  sort_order: number;
  url: string;
};


const DEFAULT_WEBSITE_SETTING:
  PublicWebsiteSetting = {

  site_name:
    "Rosehome Apartment",

  hero_badge:
    "Phòng trọ & căn hộ cho thuê",

  hero_title:
    "Không gian phù hợp cho cuộc sống của bạn",

  hero_description:
    (
      "Xem thông tin phòng, hình ảnh thực tế, "
      + "giá thuê, chi phí và tiện ích trước khi "
      + "liên hệ trực tiếp với chủ nhà."
    ),

  phone:
    null,

  zalo_url:
    null,

  address:
    null,

  contact_note:
    null,
};


const pricingItems = [
  {
    label:
      "Tiền điện",

    value:
      "4.000đ",

    note:
      "/ kWh",

    icon:
      Zap,

    iconClass:
      "bg-amber-50 text-amber-600",
  },

  {
    label:
      "Tiền nước",

    value:
      "150.000đ",

    note:
      "/ người / tháng",

    icon:
      Droplets,

    iconClass:
      "bg-blue-50 text-blue-600",
  },

  {
    label:
      "Wifi & Giữ xe",

    value:
      "Miễn phí",

    note:
      "Wifi + 1 xe/phòng • Xe thứ 2 phụ thu 100.000đ/tháng",

    icon:
      Wifi,

    iconClass:
      "bg-violet-50 text-violet-600",
  },

  {
    label:
      "Phí quản lý",

    value:
      "250.000đ",

    note:
      "/ phòng / tháng",

    icon:
      Settings2,

    iconClass:
      "bg-emerald-50 text-emerald-600",
  },
];


const amenityItems = [
  {
    title:
      "Wifi ổn định",

    description:
      (
        "Kết nối internet phục vụ học tập, "
        + "làm việc và giải trí hằng ngày."
      ),

    icon:
      Wifi,

    iconClass:
      "bg-emerald-100 text-emerald-700",
  },
  {
    title:
      "Camera an ninh",

    description:
      (
        "Camera tại khu vực chung giúp tăng cường "
        + "an ninh cho người thuê."
      ),

    icon:
      Camera,

    iconClass:
      "bg-blue-100 text-blue-700",
  },
  {
    title:
      "Chỗ để xe",

    description:
      (
        "Có khu vực để xe thuận tiện phục vụ "
        + "nhu cầu đi lại hằng ngày."
      ),

    icon:
      CarFront,

    iconClass:
      "bg-violet-100 text-violet-700",
  },
  {
    title:
      "Giờ giấc linh hoạt",

    description:
      (
        "Phù hợp với sinh viên và người đi làm "
        + "có lịch sinh hoạt khác nhau."
      ),

    icon:
      Clock3,

    iconClass:
      "bg-amber-100 text-amber-700",
  },
  {
    title:
      "Môi trường an toàn",

    description:
      (
        "Không gian sạch sẽ, yên tĩnh và phù hợp "
        + "cho nhu cầu ở lâu dài."
      ),

    icon:
      ShieldCheck,

    iconClass:
      "bg-rose-100 text-rose-700",
  },
  {
    title:
      "Thông tin minh bạch",

    description:
      (
        "Giá thuê, chi phí và điều kiện thuê được "
        + "trao đổi rõ ràng trước khi ký hợp đồng."
      ),

    icon:
      BadgeCheck,

    iconClass:
      "bg-slate-200 text-slate-700",
  },
];


const nearbyItems = [
  {
    title:
      "Trường học",

    note:
      "Khoảng 5–10 phút",

    icon:
      GraduationCap,

    iconClass:
      "text-blue-600",
  },
  {
    title:
      "Chợ / cửa hàng",

    note:
      "Khoảng 3–5 phút",

    icon:
      Store,

    iconClass:
      "text-emerald-600",
  },
  {
    title:
      "Siêu thị",

    note:
      "Thuận tiện mua sắm",

    icon:
      ShoppingBag,

    iconClass:
      "text-violet-600",
  },
  {
    title:
      "Y tế",

    note:
      "Dễ dàng tiếp cận",

    icon:
      Hospital,

    iconClass:
      "text-rose-600",
  },
];


const faqIcons = [
  WalletCards,
  CalendarDays,
  UserRoundCheck,
  Clock3,
  PawPrint,
  House,
  CircleHelp,
];


const faqIconClasses = [
  "bg-emerald-100 text-emerald-700",
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-slate-100 text-slate-700",
];


function formatMoney(
  value: number
) {

  return new Intl.NumberFormat(
    "vi-VN"
  ).format(
    value
  );
}


function formatAvailableFrom(
  value:
    string
    | null
) {

  if (!value) {

    return "Có thể vào ở ngay";
  }


  const [
    year,
    month,
    day,
  ] = value.split("-");


  return (
    `Có thể vào ở từ ${day}/${month}/${year}`
  );
}


function buildPhoneHref(
  phone:
    string
    | null
) {

  if (!phone) {

    return "#contact";
  }


  const normalized =
    phone.replace(
      /[^\d+]/g,
      ""
    );


  return normalized
    ? `tel:${normalized}`
    : "#contact";
}


function HomePage() {

  const [
    rooms,
    setRooms,
  ] = useState<
    PublicRoom[]
  >(
    []
  );


  const [
    loading,
    setLoading,
  ] = useState(
    true
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
    websiteSetting,
    setWebsiteSetting,
  ] = useState<
    PublicWebsiteSetting
  >(
    DEFAULT_WEBSITE_SETTING
  );


  const [
    faqs,
    setFaqs,
  ] = useState<
    PublicFaq[]
  >(
    []
  );


  const [
    faqLoading,
    setFaqLoading,
  ] = useState(
    true
  );


  const [
    faqError,
    setFaqError,
  ] = useState<
    string
    | null
  >(
    null
  );


  const [
    websiteImages,
    setWebsiteImages,
  ] = useState<
    PublicWebsiteImage[]
  >(
    []
  );


  const activeHero =
    websiteImages.find(
      (
        image
      ) =>
        image.image_type
        === "HERO"
    )
    ?? null;


  const galleryImages =
    websiteImages
      .filter(
        (
          image
        ) =>
          image.image_type
          === "GALLERY"
      )
      .sort(
        (
          a,
          b
        ) =>
          a.sort_order
          - b.sort_order
      );


  const phoneHref =
    buildPhoneHref(
      websiteSetting.phone
    );


  const zaloHref =
    websiteSetting.zalo_url
    ?? "#contact";


  async function loadRooms() {

    try {

      setLoading(
        true
      );

      setError(
        null
      );


      const data =
        await publicApiGet<
          PublicRoom[]
        >(
          "/public/rooms"
        );


      setRooms(
        data
      );

    } catch (
      err
    ) {

      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách phòng."
      );

    } finally {

      setLoading(
        false
      );

    }

  }


  async function loadWebsiteContent() {

    setFaqLoading(
      true
    );

    setFaqError(
      null
    );


    const [
      settingResult,
      faqResult,
      imageResult,
    ] = await Promise.allSettled([

      publicApiGet<
        PublicWebsiteSetting
      >(
        "/public/website-settings"
      ),

      publicApiGet<
        PublicFaq[]
      >(
        "/public/faqs"
      ),

      publicApiGet<
        PublicWebsiteImage[]
      >(
        "/public/website-images"
      ),

    ]);


    if (
      settingResult.status
      === "fulfilled"
    ) {

      setWebsiteSetting(
        settingResult.value
      );

    } else {

      setWebsiteSetting(
        DEFAULT_WEBSITE_SETTING
      );

    }


    if (
      faqResult.status
      === "fulfilled"
    ) {

      setFaqs(
        faqResult.value
      );

    } else {

      setFaqs(
        []
      );

      setFaqError(
        "Không thể tải câu hỏi thường gặp."
      );

    }


    if (
      imageResult.status
      === "fulfilled"
    ) {

      setWebsiteImages(
        imageResult.value
      );

    } else {

      setWebsiteImages(
        []
      );

    }


    setFaqLoading(
      false
    );

  }


  useEffect(
    () => {

      void loadRooms();

      void loadWebsiteContent();

    },
    []
  );


  return (

    <div
      className="
        min-h-screen
        bg-white
        pb-20
        text-slate-900
        md:pb-0
      "
    >

      {/* ==========================
          HEADER
      ========================== */}

      <header
        className="
          border-b
          border-slate-200
          bg-white
        "
      >

        <div
          className="
            mx-auto
            flex
            h-20
            max-w-7xl
            items-center
            justify-between
            px-6
            lg:px-8
          "
        >

          <a
            href="/"
            className="
              flex
              items-center
              gap-3
            "
          >

            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-slate-900
                text-white
              "
            >

              <House
                size={20}
              />

            </div>


            <div>

              <p
                className="
                  text-lg
                  font-bold
                  leading-none
                "
              >
                {websiteSetting.site_name}
              </p>


              <p
                className="
                  mt-1
                  max-w-48
                  truncate
                  text-xs
                  text-slate-500
                "
              >
                {websiteSetting.hero_badge}
              </p>

            </div>

          </a>


          <nav
            className="
              hidden
              items-center
              gap-8
              md:flex
            "
          >

            <a
              href="#rooms"
              className="
                text-sm
                font-medium
                text-slate-600
                transition
                hover:text-slate-900
              "
            >
              Phòng
            </a>


            <a
              href="#pricing"
              className="
                text-sm
                font-medium
                text-slate-600
                transition
                hover:text-slate-900
              "
            >
              Chi phí
            </a>


            <a
              href="#amenities"
              className="
                text-sm
                font-medium
                text-slate-600
                transition
                hover:text-slate-900
              "
            >
              Tiện ích
            </a>


            {galleryImages.length > 0 && (

              <a
                href="#gallery"
                className="
                  text-sm
                  font-medium
                  text-slate-600
                  transition
                  hover:text-slate-900
                "
              >
                Hình ảnh
              </a>

            )}


            <a
              href="#location"
              className="
                text-sm
                font-medium
                text-slate-600
                transition
                hover:text-slate-900
              "
            >
              Vị trí
            </a>


            <a
              href="#faq"
              className="
                text-sm
                font-medium
                text-slate-600
                transition
                hover:text-slate-900
              "
            >
              FAQ
            </a>

          </nav>


          <div
            className="
              hidden
              md:block
            "
          >

            <a
              href={
                phoneHref
              }
              className="
                inline-flex
                items-center
                gap-2
                rounded-xl
                bg-slate-900
                px-5
                py-3
                text-sm
                font-semibold
                text-white
                transition
                hover:bg-slate-700
              "
            >

              <Phone
                size={16}
              />

              Liên hệ chủ nhà

            </a>

          </div>


          <button
            type="button"
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-lg
              border
              border-slate-200
              md:hidden
            "
            aria-label="Mở menu"
          >

            <Menu
              size={20}
            />

          </button>

        </div>

      </header>


      <main>

        {/* ==========================
            HERO
        ========================== */}

        <section
          className="
            bg-slate-50
            py-16
            sm:py-20
            lg:py-24
          "
        >

          <div
            className="
              mx-auto
              grid
              max-w-7xl
              items-center
              gap-12
              px-6
              lg:grid-cols-[1fr_0.95fr]
              lg:px-8
            "
          >

            {/* ==========================
                HERO CONTENT
            ========================== */}

            <div
              className="
                text-center
                lg:text-left
              "
            >

              <span
                className="
                  inline-flex
                  rounded-full
                  bg-emerald-100
                  px-4
                  py-2
                  text-sm
                  font-semibold
                  text-emerald-700
                "
              >
                {websiteSetting.hero_badge}
              </span>


              <h1
                className="
                  mt-6
                  text-4xl
                  font-bold
                  tracking-tight
                  text-slate-950
                  sm:text-5xl
                  lg:text-6xl
                "
              >
                {websiteSetting.hero_title}
              </h1>


              <p
                className="
                  mx-auto
                  mt-6
                  max-w-2xl
                  text-base
                  leading-7
                  text-slate-600
                  sm:text-lg
                  lg:mx-0
                "
              >
                {websiteSetting.hero_description}
              </p>


              <div
                className="
                  mt-8
                  flex
                  flex-col
                  justify-center
                  gap-3
                  sm:flex-row
                  lg:justify-start
                "
              >

                <a
                  href="#rooms"
                  className="
                    inline-flex
                    items-center
                    justify-center
                    rounded-xl
                    bg-slate-900
                    px-6
                    py-3.5
                    font-semibold
                    text-white
                    transition
                    hover:bg-slate-700
                  "
                >
                  Xem phòng đang trống
                </a>


                <a
                  href={
                    phoneHref
                  }
                  className="
                    inline-flex
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-slate-300
                    bg-white
                    px-6
                    py-3.5
                    font-semibold
                    text-slate-700
                    transition
                    hover:bg-slate-100
                  "
                >
                  Liên hệ chủ nhà
                </a>

              </div>

            </div>


            {/* ==========================
                HERO IMAGE
            ========================== */}

            <div
              className="
                overflow-hidden
                rounded-3xl
                border
                border-slate-200
                bg-white
                shadow-xl
                shadow-slate-200/60
              "
            >

              {
                activeHero
                  ? (

                    <img
                      src={
                        activeHero.url
                      }
                      alt={
                        activeHero.alt_text
                        ?? "Hình ảnh Rosehome"
                      }
                      decoding="async"
                      className="
                        aspect-[4/3]
                        h-full
                        w-full
                        object-cover
                      "
                    />

                  )
                  : (

                    <div
                      className="
                        flex
                        aspect-[4/3]
                        items-center
                        justify-center
                        bg-slate-100
                        p-8
                        text-center
                      "
                    >

                      <div>

                        <House
                          size={42}
                          className="
                            mx-auto
                            text-slate-300
                          "
                        />


                        <p
                          className="
                            mt-4
                            font-semibold
                            text-slate-600
                          "
                        >
                          Hình ảnh Rosehome
                        </p>


                        <p
                          className="
                            mt-1
                            text-sm
                            text-slate-400
                          "
                        >
                          Hình Hero đang được cập nhật.
                        </p>

                      </div>

                    </div>

                  )
              }

            </div>

          </div>

        </section>


        {/* ==========================
            AVAILABLE ROOMS
        ========================== */}

        <section
          id="rooms"
          className="
            bg-white
            py-20
            sm:py-24
          "
        >

          <div
            className="
              mx-auto
              max-w-7xl
              px-6
              lg:px-8
            "
          >

            <div
              className="
                flex
                flex-col
                justify-between
                gap-5
                md:flex-row
                md:items-end
              "
            >

              <div>

                <span
                  className="
                    text-sm
                    font-semibold
                    text-emerald-600
                  "
                >
                  Phòng hiện có
                </span>


                <h2
                  className="
                    mt-2
                    text-3xl
                    font-bold
                    tracking-tight
                    text-slate-950
                    sm:text-4xl
                  "
                >
                  Phòng đang trống
                </h2>


                <p
                  className="
                    mt-3
                    max-w-2xl
                    text-slate-600
                  "
                >
                  Xem nhanh giá thuê, diện tích
                  và thông tin cơ bản trước khi
                  chọn phòng phù hợp.
                </p>

              </div>


              {
                !loading
                &&
                !error
                &&
                (
                  <div
                    className="
                      text-sm
                      text-slate-500
                    "
                  >
                    Hiện có{" "}

                    <strong
                      className="
                        text-slate-900
                      "
                    >
                      {rooms.length} phòng
                    </strong>{" "}

                    có thể xem
                  </div>
                )
              }

            </div>


            {loading && (

              <div
                className="
                  mt-10
                  flex
                  min-h-64
                  flex-col
                  items-center
                  justify-center
                  gap-3
                  rounded-2xl
                  border
                  border-slate-200
                  bg-slate-50
                "
              >

                <LoaderCircle
                  size={30}
                  className="
                    animate-spin
                    text-slate-500
                  "
                />


                <p
                  className="
                    text-sm
                    text-slate-500
                  "
                >
                  Đang tải phòng...
                </p>

              </div>

            )}


            {
              !loading
              &&
              error
              &&
              (

                <div
                  className="
                    mt-10
                    rounded-2xl
                    border
                    border-red-200
                    bg-red-50
                    p-6
                  "
                >

                  <div
                    className="
                      flex
                      flex-col
                      gap-4
                      sm:flex-row
                      sm:items-center
                      sm:justify-between
                    "
                  >

                    <div
                      className="
                        flex
                        items-start
                        gap-3
                      "
                    >

                      <AlertCircle
                        size={21}
                        className="
                          mt-0.5
                          shrink-0
                          text-red-600
                        "
                      />


                      <div>

                        <p
                          className="
                            font-semibold
                            text-red-800
                          "
                        >
                          Không thể tải danh sách phòng
                        </p>


                        <p
                          className="
                            mt-1
                            text-sm
                            text-red-700
                          "
                        >
                          {error}
                        </p>

                      </div>

                    </div>


                    <button
                      type="button"
                      onClick={
                        () =>
                          void loadRooms()
                      }
                      className="
                        inline-flex
                        min-h-11
                        items-center
                        justify-center
                        gap-2
                        rounded-xl
                        bg-white
                        px-4
                        text-sm
                        font-semibold
                        text-red-700
                      "
                    >

                      <RefreshCw
                        size={16}
                      />

                      Thử lại

                    </button>

                  </div>

                </div>

              )
            }


            {
              !loading
              &&
              !error
              &&
              rooms.length === 0
              &&
              (

                <div
                  className="
                    mt-10
                    flex
                    min-h-64
                    flex-col
                    items-center
                    justify-center
                    rounded-2xl
                    border
                    border-slate-200
                    bg-slate-50
                    p-8
                    text-center
                  "
                >

                  <House
                    size={34}
                    className="
                      text-slate-400
                    "
                  />


                  <h3
                    className="
                      mt-4
                      text-lg
                      font-bold
                      text-slate-900
                    "
                  >
                    Hiện chưa có phòng trống
                  </h3>


                  <p
                    className="
                      mt-2
                      max-w-md
                      text-sm
                      leading-6
                      text-slate-500
                    "
                  >
                    Vui lòng quay lại sau hoặc
                    liên hệ trực tiếp với chủ nhà
                    để biết thêm thông tin.
                  </p>

                </div>

              )
            }


            {
              !loading
              &&
              !error
              &&
              rooms.length > 0
              &&
              (

                <div
                  className="
                    mt-10
                    grid
                    gap-6
                    md:grid-cols-2
                    lg:grid-cols-3
                  "
                >

                  {rooms.map(
                    (
                      room
                    ) => (

                      <article
                        key={
                          room.id
                        }
                        className="
                          group
                          overflow-hidden
                          rounded-2xl
                          border
                          border-slate-200
                          bg-white
                          transition
                          hover:-translate-y-1
                          hover:shadow-xl
                        "
                      >

                        <div
                          className="
                            relative
                            aspect-[4/3]
                            overflow-hidden
                            bg-slate-100
                          "
                        >

                          {
                            room.images
                            &&
                            room.images.length > 0
                              ? (

                                <img
                                  src={
                                    room.images[0]
                                  }
                                  alt={
                                    `Phòng ${room.room_code}`
                                  }
                                  loading="lazy"
                                  decoding="async"
                                  className="
                                    h-full
                                    w-full
                                    object-cover
                                    transition
                                    duration-500
                                    group-hover:scale-105
                                  "
                                />

                              )
                              : (

                                <div
                                  className="
                                    flex
                                    h-full
                                    w-full
                                    items-center
                                    justify-center
                                  "
                                >

                                  <div
                                    className="
                                      text-center
                                      text-slate-400
                                    "
                                  >

                                    <House
                                      size={36}
                                      className="mx-auto"
                                    />


                                    <p
                                      className="
                                        mt-3
                                        text-sm
                                      "
                                    >
                                      Chưa có ảnh phòng {
                                        room.room_code
                                      }
                                    </p>

                                  </div>

                                </div>

                              )
                          }


                          <span
                            className="
                              absolute
                              left-4
                              top-4
                              rounded-full
                              bg-emerald-500
                              px-3
                              py-1.5
                              text-xs
                              font-bold
                              text-white
                              shadow-sm
                            "
                          >
                            CÒN PHÒNG
                          </span>

                        </div>


                        <div
                          className="p-6"
                        >

                          <div
                            className="
                              flex
                              items-start
                              justify-between
                              gap-4
                            "
                          >

                            <div>

                              <p
                                className="
                                  text-xs
                                  font-semibold
                                  uppercase
                                  tracking-wider
                                  text-slate-400
                                "
                              >
                                Phòng
                              </p>


                              <h3
                                className="
                                  mt-1
                                  text-2xl
                                  font-bold
                                  text-slate-950
                                "
                              >
                                {room.room_code}
                              </h3>

                            </div>


                            <div
                              className="text-right"
                            >

                              <p
                                className="
                                  text-xl
                                  font-bold
                                  text-slate-950
                                "
                              >
                                {
                                  formatMoney(
                                    room.monthly_rent
                                  )
                                }đ
                              </p>


                              <p
                                className="
                                  mt-1
                                  text-xs
                                  text-slate-500
                                "
                              >
                                / tháng
                              </p>

                            </div>

                          </div>


                          <div
                            className="
                              mt-5
                              flex
                              flex-wrap
                              gap-4
                              border-y
                              border-slate-100
                              py-4
                            "
                          >

                            <div
                              className="
                                flex
                                items-center
                                gap-2
                                text-sm
                                text-slate-600
                              "
                            >

                              <Maximize2
                                size={16}
                              />

                              {room.area_m2}m²

                            </div>


                            <div
                              className="
                                flex
                                items-center
                                gap-2
                                text-sm
                                text-slate-600
                              "
                            >

                              <Users
                                size={16}
                              />

                              Tối đa {
                                room.max_occupants
                              } người

                            </div>

                          </div>


                          <p
                            className="
                              mt-5
                              min-h-12
                              text-sm
                              leading-6
                              text-slate-600
                            "
                          >
                            {
                              room.description
                              ??
                              (
                                `Phòng ${room.room_code} `
                                + "đang trống và sẵn sàng "
                                + "cho thuê."
                              )
                            }
                          </p>


                          <div
                            className="
                              mt-4
                              flex
                              items-center
                              gap-2
                              text-sm
                              font-medium
                              text-emerald-700
                            "
                          >

                            <MapPin
                              size={16}
                            />

                            {
                              formatAvailableFrom(
                                room.available_from
                              )
                            }

                          </div>


                          <Link
                            to={
                              `/rooms/${room.room_code}`
                            }
                            className="
                              mt-6
                              flex
                              w-full
                              items-center
                              justify-between
                              rounded-xl
                              bg-slate-900
                              px-5
                              py-3.5
                              text-sm
                              font-semibold
                              text-white
                              transition
                              group-hover:bg-slate-800
                            "
                          >

                            Xem chi tiết phòng

                            <ArrowRight
                              size={17}
                            />

                          </Link>

                        </div>

                      </article>

                    )
                  )}

                </div>

              )
            }

          </div>

        </section>


        {/* ==========================
            PRICING
        ========================== */}

        <section
          id="pricing"
          className="
            bg-slate-50
            py-20
            sm:py-24
          "
        >

          <div
            className="
              mx-auto
              max-w-7xl
              px-6
              lg:px-8
            "
          >

            <div
              className="
                mx-auto
                max-w-2xl
                text-center
              "
            >

              <span
                className="
                  text-sm
                  font-semibold
                  text-emerald-600
                "
              >
                Chi phí rõ ràng
              </span>


              <h2
                className="
                  mt-2
                  text-3xl
                  font-bold
                  tracking-tight
                  text-slate-950
                  sm:text-4xl
                "
              >
                Các khoản chi phí khi thuê
              </h2>


              <p
                className="
                  mt-4
                  leading-7
                  text-slate-600
                "
              >
                Tham khảo trước các khoản phí
                cơ bản để dễ dàng tính toán chi
                phí sinh hoạt hàng tháng.
              </p>

            </div>


            <div
              className="
                mt-12
                grid
                gap-5
                sm:grid-cols-2
                lg:grid-cols-4
              "
            >

              {pricingItems.map(
                (
                  item
                ) => {

                  const Icon =
                    item.icon;


                  return (

                    <div
                      key={
                        item.label
                      }
                      className="
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                        p-6
                      "
                    >

                      <div
                        className={`
                          flex
                          h-11
                          w-11
                          items-center
                          justify-center
                          rounded-xl
                          ${item.iconClass}
                        `}
                      >

                        <Icon
                          size={21}
                        />

                      </div>


                      <p
                        className="
                          mt-5
                          text-sm
                          font-medium
                          text-slate-500
                        "
                      >
                        {item.label}
                      </p>


                      <p
                        className="
                          mt-2
                          text-xl
                          font-bold
                          text-slate-950
                        "
                      >
                        {item.value}
                      </p>


                      <p
                        className="
                          mt-1
                          text-sm
                          text-slate-500
                        "
                      >
                        {item.note}
                      </p>

                    </div>

                  );

                }
              )}

            </div>


            <div
              className="
                mt-8
                rounded-2xl
                border
                border-slate-200
                bg-white
                p-6
              "
            >

              <p
                className="
                  text-sm
                  leading-6
                  text-slate-600
                "
              >

                <strong
                  className="
                    text-slate-900
                  "
                >
                  Lưu ý:
                </strong>{" "}

                Mức phí có thể khác tùy từng
                phòng hoặc thời điểm thuê.
                Chi phí chính xác sẽ được xác
                nhận với chủ nhà trước khi ký
                hợp đồng.

              </p>

            </div>

          </div>

        </section>


        {/* ==========================
            AMENITIES
        ========================== */}

        <section
          id="amenities"
          className="
            bg-white
            py-20
            sm:py-24
          "
        >

          <div
            className="
              mx-auto
              max-w-7xl
              px-6
              lg:px-8
            "
          >

            <div
              className="
                mx-auto
                max-w-2xl
                text-center
              "
            >

              <span
                className="
                  text-sm
                  font-semibold
                  text-emerald-600
                "
              >
                Tiện ích nổi bật
              </span>


              <h2
                className="
                  mt-2
                  text-3xl
                  font-bold
                  tracking-tight
                  text-slate-950
                  sm:text-4xl
                "
              >
                Những tiện ích người thuê thường quan tâm
              </h2>


              <p
                className="
                  mt-4
                  leading-7
                  text-slate-600
                "
              >
                Không chỉ là giá thuê, môi trường
                sống an toàn và thuận tiện cũng là
                yếu tố quan trọng khi lựa chọn phòng.
              </p>

            </div>


            <div
              className="
                mt-12
                grid
                gap-5
                md:grid-cols-2
                lg:grid-cols-3
              "
            >

              {amenityItems.map(
                (
                  item
                ) => {

                  const Icon =
                    item.icon;


                  return (

                    <div
                      key={
                        item.title
                      }
                      className="
                        rounded-2xl
                        border
                        border-slate-200
                        bg-slate-50
                        p-6
                      "
                    >

                      <div
                        className={`
                          flex
                          h-12
                          w-12
                          items-center
                          justify-center
                          rounded-xl
                          ${item.iconClass}
                        `}
                      >

                        <Icon
                          size={22}
                        />

                      </div>


                      <h3
                        className="
                          mt-5
                          text-lg
                          font-bold
                          text-slate-950
                        "
                      >
                        {item.title}
                      </h3>


                      <p
                        className="
                          mt-2
                          text-sm
                          leading-6
                          text-slate-600
                        "
                      >
                        {item.description}
                      </p>

                    </div>

                  );

                }
              )}

            </div>

          </div>

        </section>


        {/* ==========================
            WEBSITE GALLERY
        ========================== */}

        {galleryImages.length > 0 && (

          <section
            id="gallery"
            className="
              bg-slate-50
              py-20
              sm:py-24
            "
          >

            <div
              className="
                mx-auto
                max-w-7xl
                px-6
                lg:px-8
              "
            >

              <div
                className="
                  mx-auto
                  max-w-2xl
                  text-center
                "
              >

                <span
                  className="
                    text-sm
                    font-semibold
                    text-emerald-600
                  "
                >
                  Không gian Rosehome
                </span>


                <h2
                  className="
                    mt-2
                    text-3xl
                    font-bold
                    tracking-tight
                    text-slate-950
                    sm:text-4xl
                  "
                >
                  Hình ảnh thực tế
                </h2>


                <p
                  className="
                    mt-4
                    leading-7
                    text-slate-600
                  "
                >
                  Một số hình ảnh về mặt tiền, hành lang,
                  khu vực để xe và không gian chung tại Rosehome.
                </p>

              </div>


              <div
                className="
                  mt-12
                  grid
                  gap-5
                  sm:grid-cols-2
                  lg:grid-cols-3
                "
              >

                {galleryImages.map(
                  (
                    image,
                    index
                  ) => (

                    <figure
                      key={
                        image.id
                      }
                      className="
                        group
                        overflow-hidden
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                      "
                    >

                      <div
                        className="
                          aspect-[4/3]
                          overflow-hidden
                          bg-slate-100
                        "
                      >

                        <img
                          src={
                            image.url
                          }
                          alt={
                            image.alt_text
                            ?? `Hình ảnh Rosehome ${index + 1}`
                          }
                          loading="lazy"
                          decoding="async"
                          className="
                            h-full
                            w-full
                            object-cover
                            transition
                            duration-500
                            group-hover:scale-105
                          "
                        />

                      </div>


                      {image.alt_text && (

                        <figcaption
                          className="
                            p-4
                            text-sm
                            leading-6
                            text-slate-600
                          "
                        >
                          {image.alt_text}
                        </figcaption>

                      )}

                    </figure>

                  )
                )}

              </div>

            </div>

          </section>

        )}


        {/* ==========================
            LOCATION
        ========================== */}

        <section
          id="location"
          className="
            bg-slate-50
            py-20
            sm:py-24
          "
        >

          <div
            className="
              mx-auto
              max-w-7xl
              px-6
              lg:px-8
            "
          >

            <div
              className="
                grid
                gap-10
                lg:grid-cols-2
                lg:items-stretch
              "
            >

              <div>

                <span
                  className="
                    text-sm
                    font-semibold
                    text-emerald-600
                  "
                >
                  Vị trí thuận tiện
                </span>


                <h2
                  className="
                    mt-2
                    text-3xl
                    font-bold
                    tracking-tight
                    text-slate-950
                    sm:text-4xl
                  "
                >
                  Dễ dàng di chuyển và sinh hoạt hằng ngày
                </h2>


                <p
                  className="
                    mt-4
                    max-w-xl
                    leading-7
                    text-slate-600
                  "
                >
                  {websiteSetting.site_name} nằm tại khu vực
                  thuận tiện cho việc học tập, làm việc và
                  sinh hoạt. Các tiện ích thiết yếu đều có
                  thể tiếp cận nhanh chóng.
                </p>


                <div
                  className="
                    mt-8
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    p-6
                  "
                >

                  <div
                    className="
                      flex
                      items-start
                      gap-4
                    "
                  >

                    <div
                      className="
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-emerald-100
                        text-emerald-700
                      "
                    >

                      <MapPinned
                        size={21}
                      />

                    </div>


                    <div>

                      <p
                        className="
                          text-sm
                          font-medium
                          text-slate-500
                        "
                      >
                        Địa chỉ
                      </p>


                      <p
                        className="
                          mt-1
                          font-semibold
                          leading-6
                          text-slate-950
                        "
                      >
                        {
                          websiteSetting.address
                          ?? "Địa chỉ đang được cập nhật"
                        }
                      </p>


                      <p
                        className="
                          mt-2
                          text-sm
                          leading-6
                          text-slate-500
                        "
                      >
                        {
                          websiteSetting.contact_note
                          ?? (
                            "Liên hệ chủ nhà để được "
                            + "hướng dẫn đường đi và đặt "
                            + "lịch xem phòng."
                          )
                        }
                      </p>

                    </div>

                  </div>

                </div>


                <div
                  className="
                    mt-5
                    grid
                    gap-3
                    sm:grid-cols-2
                  "
                >

                  {nearbyItems.map(
                    (
                      item
                    ) => {

                      const Icon =
                        item.icon;


                      return (

                        <div
                          key={
                            item.title
                          }
                          className="
                            flex
                            items-center
                            gap-3
                            rounded-xl
                            border
                            border-slate-200
                            bg-white
                            p-4
                          "
                        >

                          <Icon
                            size={20}
                            className={`
                              shrink-0
                              ${item.iconClass}
                            `}
                          />


                          <div>

                            <p
                              className="
                                text-sm
                                font-semibold
                                text-slate-900
                              "
                            >
                              {item.title}
                            </p>


                            <p
                              className="
                                mt-1
                                text-xs
                                text-slate-500
                              "
                            >
                              {item.note}
                            </p>

                          </div>

                        </div>

                      );

                    }
                  )}

                </div>

              </div>


              <div
                className="
                  min-h-[450px]
                  overflow-hidden
                  rounded-3xl
                  border
                  border-slate-200
                  bg-white
                "
              >

                <div
                  className="
                    flex
                    h-full
                    min-h-[450px]
                    items-center
                    justify-center
                    bg-slate-100
                    p-8
                    text-center
                  "
                >

                  <div>

                    <div
                      className="
                        mx-auto
                        flex
                        h-16
                        w-16
                        items-center
                        justify-center
                        rounded-2xl
                        bg-white
                        text-slate-700
                        shadow-sm
                      "
                    >

                      <Building2
                        size={28}
                      />

                    </div>


                    <h3
                      className="
                        mt-5
                        text-xl
                        font-bold
                        text-slate-950
                      "
                    >
                      Bản đồ {
                        websiteSetting.site_name
                      }
                    </h3>


                    <p
                      className="
                        mx-auto
                        mt-2
                        max-w-sm
                        text-sm
                        leading-6
                        text-slate-500
                      "
                    >
                      Google Maps sẽ được hiển thị
                      tại đây sau khi cập nhật địa
                      chỉ chính xác.
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>


        {/* ==========================
            FAQ
        ========================== */}

        <section
          id="faq"
          className="
            bg-white
            py-20
            sm:py-24
          "
        >

          <div
            className="
              mx-auto
              max-w-7xl
              px-6
              lg:px-8
            "
          >

            <div
              className="
                grid
                gap-12
                lg:grid-cols-[0.8fr_1.2fr]
              "
            >

              <div>

                <span
                  className="
                    text-sm
                    font-semibold
                    text-emerald-600
                  "
                >
                  Thông tin thuê
                </span>


                <h2
                  className="
                    mt-2
                    text-3xl
                    font-bold
                    tracking-tight
                    text-slate-950
                    sm:text-4xl
                  "
                >
                  Những điều nên biết trước khi thuê
                </h2>


                <p
                  className="
                    mt-4
                    max-w-lg
                    leading-7
                    text-slate-600
                  "
                >
                  Một số thông tin cơ bản giúp bạn
                  hiểu rõ hơn về điều kiện thuê phòng
                  trước khi liên hệ với chủ nhà.
                </p>


                <div
                  className="
                    mt-8
                    rounded-2xl
                    bg-slate-950
                    p-6
                    text-white
                  "
                >

                  <CircleHelp
                    size={25}
                    className="
                      text-emerald-400
                    "
                  />


                  <h3
                    className="
                      mt-5
                      text-xl
                      font-bold
                    "
                  >
                    Cần thêm thông tin?
                  </h3>


                  <p
                    className="
                      mt-2
                      text-sm
                      leading-6
                      text-slate-300
                    "
                  >
                    Nếu bạn có câu hỏi khác hoặc
                    muốn xác nhận tình trạng phòng,
                    hãy liên hệ trực tiếp với chủ nhà.
                  </p>


                  <a
                    href={
                      phoneHref
                    }
                    className="
                      mt-6
                      inline-flex
                      items-center
                      gap-2
                      rounded-xl
                      bg-white
                      px-5
                      py-3
                      text-sm
                      font-semibold
                      text-slate-950
                      transition
                      hover:bg-slate-100
                    "
                  >

                    <Phone
                      size={16}
                    />

                    Liên hệ chủ nhà

                  </a>

                </div>

              </div>


              <div
                className="space-y-4"
              >

                {faqLoading && (

                  <div
                    className="
                      flex
                      min-h-40
                      items-center
                      justify-center
                      rounded-2xl
                      border
                      border-slate-200
                      bg-slate-50
                    "
                  >

                    <LoaderCircle
                      size={26}
                      className="
                        animate-spin
                        text-slate-400
                      "
                    />

                  </div>

                )}


                {
                  !faqLoading
                  &&
                  faqError
                  &&
                  (

                    <div
                      className="
                        rounded-2xl
                        border
                        border-red-200
                        bg-red-50
                        p-5
                        text-sm
                        text-red-700
                      "
                    >
                      {faqError}
                    </div>

                  )
                }


                {
                  !faqLoading
                  &&
                  !faqError
                  &&
                  faqs.length === 0
                  &&
                  (

                    <div
                      className="
                        rounded-2xl
                        border
                        border-dashed
                        border-slate-300
                        bg-slate-50
                        p-8
                        text-center
                      "
                    >

                      <CircleHelp
                        size={30}
                        className="
                          mx-auto
                          text-slate-300
                        "
                      />


                      <p
                        className="
                          mt-3
                          font-semibold
                          text-slate-700
                        "
                      >
                        FAQ đang được cập nhật
                      </p>


                      <p
                        className="
                          mt-1
                          text-sm
                          text-slate-500
                        "
                      >
                        Vui lòng liên hệ chủ nhà nếu
                        bạn cần thêm thông tin.
                      </p>

                    </div>

                  )
                }


                {
                  !faqLoading
                  &&
                  !faqError
                  &&
                  faqs.map(
                    (
                      faq,
                      index
                    ) => {

                      const Icon =
                        faqIcons[
                          index
                          %
                          faqIcons.length
                        ];


                      const iconClass =
                        faqIconClasses[
                          index
                          %
                          faqIconClasses.length
                        ];


                      return (

                        <div
                          key={
                            faq.id
                          }
                          className="
                            rounded-2xl
                            border
                            border-slate-200
                            p-6
                          "
                        >

                          <div
                            className="
                              flex
                              items-start
                              gap-4
                            "
                          >

                            <div
                              className={`
                                flex
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                rounded-xl
                                ${iconClass}
                              `}
                            >

                              <Icon
                                size={19}
                              />

                            </div>


                            <div>

                              <h3
                                className="
                                  font-bold
                                  text-slate-950
                                "
                              >
                                {faq.question}
                              </h3>


                              <p
                                className="
                                  mt-2
                                  whitespace-pre-line
                                  text-sm
                                  leading-6
                                  text-slate-600
                                "
                              >
                                {faq.answer}
                              </p>

                            </div>

                          </div>

                        </div>

                      );

                    }
                  )
                }

              </div>

            </div>

          </div>

        </section>


        {/* ==========================
            CONTACT
        ========================== */}

        <section
          id="contact"
          className="
            bg-slate-950
            py-20
            text-white
            sm:py-24
          "
        >

          <div
            className="
              mx-auto
              max-w-7xl
              px-6
              lg:px-8
            "
          >

            <div
              className="
                grid
                gap-10
                lg:grid-cols-[1.2fr_0.8fr]
                lg:items-center
              "
            >

              <div>

                <span
                  className="
                    text-sm
                    font-semibold
                    text-emerald-400
                  "
                >
                  Liên hệ {
                    websiteSetting.site_name
                  }
                </span>


                <h2
                  className="
                    mt-3
                    max-w-3xl
                    text-3xl
                    font-bold
                    tracking-tight
                    sm:text-4xl
                    lg:text-5xl
                  "
                >
                  Bạn đã tìm thấy căn phòng phù hợp?
                </h2>


                <p
                  className="
                    mt-5
                    max-w-2xl
                    leading-7
                    text-slate-300
                  "
                >
                  {
                    websiteSetting.contact_note
                    ?? (
                      "Liên hệ trực tiếp với chủ nhà để "
                      + "xác nhận tình trạng phòng, hỏi thêm "
                      + "thông tin hoặc hẹn thời gian đến xem phòng."
                    )
                  }
                </p>


                <div
                  className="
                    mt-8
                    flex
                    flex-col
                    gap-3
                    sm:flex-row
                  "
                >

                  <a
                    href={
                      phoneHref
                    }
                    className="
                      inline-flex
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      bg-white
                      px-6
                      py-3.5
                      font-semibold
                      text-slate-950
                      transition
                      hover:bg-slate-100
                    "
                  >

                    <Phone
                      size={18}
                    />

                    Gọi chủ nhà

                  </a>


                  <a
                    href={
                      zaloHref
                    }
                    target={
                      websiteSetting.zalo_url
                        ? "_blank"
                        : undefined
                    }
                    rel={
                      websiteSetting.zalo_url
                        ? "noreferrer"
                        : undefined
                    }
                    className="
                      inline-flex
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      border
                      border-slate-700
                      px-6
                      py-3.5
                      font-semibold
                      text-white
                      transition
                      hover:bg-slate-900
                    "
                  >

                    <MessageCircle
                      size={18}
                    />

                    Nhắn qua Zalo

                  </a>

                </div>

              </div>


              <div
                className="
                  rounded-3xl
                  border
                  border-slate-800
                  bg-slate-900
                  p-7
                "
              >

                <h3
                  className="
                    text-lg
                    font-bold
                  "
                >
                  Thông tin liên hệ
                </h3>


                <div
                  className="
                    mt-6
                    space-y-5
                  "
                >

                  <div
                    className="
                      flex
                      items-start
                      gap-4
                    "
                  >

                    <div
                      className="
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-slate-800
                      "
                    >

                      <Phone
                        size={18}
                      />

                    </div>


                    <div>

                      <p
                        className="
                          text-xs
                          text-slate-400
                        "
                      >
                        Điện thoại
                      </p>


                      <a
                        href={
                          phoneHref
                        }
                        className="
                          mt-1
                          block
                          font-semibold
                          text-white
                          hover:text-emerald-400
                        "
                      >
                        {
                          websiteSetting.phone
                          ?? "Đang cập nhật"
                        }
                      </a>

                    </div>

                  </div>


                  <div
                    className="
                      flex
                      items-start
                      gap-4
                    "
                  >

                    <div
                      className="
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-slate-800
                      "
                    >

                      <MessageCircle
                        size={18}
                      />

                    </div>


                    <div>

                      <p
                        className="
                          text-xs
                          text-slate-400
                        "
                      >
                        Zalo
                      </p>


                      <a
                        href={
                          zaloHref
                        }
                        target={
                          websiteSetting.zalo_url
                            ? "_blank"
                            : undefined
                        }
                        rel={
                          websiteSetting.zalo_url
                            ? "noreferrer"
                            : undefined
                        }
                        className="
                          mt-1
                          block
                          font-semibold
                          text-white
                          hover:text-emerald-400
                        "
                      >
                        {
                          websiteSetting.zalo_url
                            ? "Nhắn qua Zalo"
                            : "Đang cập nhật"
                        }
                      </a>

                    </div>

                  </div>


                  <div
                    className="
                      flex
                      items-start
                      gap-4
                    "
                  >

                    <div
                      className="
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-slate-800
                      "
                    >

                      <MapPin
                        size={18}
                      />

                    </div>


                    <div>

                      <p
                        className="
                          text-xs
                          text-slate-400
                        "
                      >
                        Địa chỉ
                      </p>


                      <p
                        className="
                          mt-1
                          font-semibold
                          leading-6
                        "
                      >
                        {
                          websiteSetting.address
                          ?? "Địa chỉ đang cập nhật"
                        }
                      </p>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>

      </main>


      {/* ==========================
          FOOTER
      ========================== */}

      <footer
        className="
          border-t
          border-slate-200
          bg-white
        "
      >

        <div
          className="
            mx-auto
            max-w-7xl
            px-6
            py-10
            lg:px-8
          "
        >

          <div
            className="
              flex
              flex-col
              gap-8
              md:flex-row
              md:items-center
              md:justify-between
            "
          >

            <div
              className="
                flex
                items-center
                gap-3
              "
            >

              <div
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  bg-slate-900
                  text-white
                "
              >

                <House
                  size={20}
                />

              </div>


              <div>

                <p
                  className="
                    font-bold
                    text-slate-950
                  "
                >
                  {websiteSetting.site_name}
                </p>


                <p
                  className="
                    text-xs
                    text-slate-500
                  "
                >
                  {websiteSetting.hero_badge}
                </p>

              </div>

            </div>


            <div
              className="
                flex
                flex-wrap
                gap-x-6
                gap-y-3
                text-sm
                text-slate-500
              "
            >

              <a
                href="#rooms"
                className="
                  transition
                  hover:text-slate-950
                "
              >
                Phòng
              </a>


              <a
                href="#pricing"
                className="
                  transition
                  hover:text-slate-950
                "
              >
                Chi phí
              </a>


              <a
                href="#amenities"
                className="
                  transition
                  hover:text-slate-950
                "
              >
                Tiện ích
              </a>


              {galleryImages.length > 0 && (

                <a
                  href="#gallery"
                  className="
                    transition
                    hover:text-slate-950
                  "
                >
                  Hình ảnh
                </a>

              )}


              <a
                href="#location"
                className="
                  transition
                  hover:text-slate-950
                "
              >
                Vị trí
              </a>


              <a
                href="#faq"
                className="
                  transition
                  hover:text-slate-950
                "
              >
                FAQ
              </a>

            </div>

          </div>


          <div
            className="
              mt-8
              border-t
              border-slate-200
              pt-6
            "
          >

            <p
              className="
                text-sm
                text-slate-400
              "
            >
              © {new Date().getFullYear()} {
                websiteSetting.site_name
              }. All rights reserved.
            </p>

          </div>

        </div>

      </footer>


      {/* ==========================
          MOBILE CONTACT BAR
      ========================== */}

      <div
        className="
          fixed
          inset-x-0
          bottom-0
          z-50
          border-t
          border-slate-200
          bg-white
          p-3
          shadow-[0_-6px_20px_rgba(15,23,42,0.08)]
          md:hidden
        "
      >

        <div
          className="
            mx-auto
            grid
            max-w-lg
            grid-cols-2
            gap-3
          "
        >

          <a
            href={
              phoneHref
            }
            className="
              flex
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-slate-950
              px-4
              py-3
              font-semibold
              text-white
            "
          >

            <Phone
              size={18}
            />

            Gọi ngay

          </a>


          <a
            href={
              zaloHref
            }
            target={
              websiteSetting.zalo_url
                ? "_blank"
                : undefined
            }
            rel={
              websiteSetting.zalo_url
                ? "noreferrer"
                : undefined
            }
            className="
              flex
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-slate-300
              bg-white
              px-4
              py-3
              font-semibold
              text-slate-700
            "
          >

            <MessageCircle
              size={18}
            />

            Nhắn Zalo

          </a>

        </div>

      </div>

    </div>

  );
}


export default HomePage;
