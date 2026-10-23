import {
  useEffect,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowLeft,
  Bike,
  Check,
  ChevronLeft,
  ChevronRight,
  Droplets,
  House,
  Images,
  LoaderCircle,
  MapPin,
  Maximize2,
  MessageCircle,
  Phone,
  RefreshCw,
  Users,
  WalletCards,
  Wifi,
  X,
  Zap,
} from "lucide-react";

import {
  Link,
  useParams,
} from "react-router";

import {
  publicApiGet,
} from "@/lib/api";


type PublicRoomDetail = {
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

  electricity_rate:
    number
    | null;

  water_fee:
    number
    | null;

  management_fee:
    number
    | null;

  amenities: string[];

  furniture: string[];

  images: string[];
};


function formatMoney(
  value:
    number
    | null,
) {

  if (
    value === null
  ) {
    return "Liên hệ";
  }


  if (
    value === 0
  ) {
    return "Miễn phí";
  }


  return `${value.toLocaleString(
    "vi-VN",
  )}đ`;

}


function formatAvailableFrom(
  value:
    string
    | null,
) {

  if (!value) {
    return "Có thể vào ở ngay";
  }


  const parts =
    value.split("-");


  if (
    parts.length !== 3
  ) {
    return value;
  }


  const [
    year,
    month,
    day,
  ] = parts;


  return `Có thể vào ở từ ${day}/${month}/${year}`;

}


type RoomImageProps = {
  src?: string;

  alt: string;

  label?: string;

  className?: string;

  iconSize?: number;
};


function RoomImage({
  src,
  alt,
  label,
  className = "",
  iconSize = 36,
}: RoomImageProps) {

  if (src) {

    return (

      <img
        src={src}
        alt={alt}
        className={`
          h-full
          w-full
          object-cover
          ${className}
        `}
      />

    );

  }


  return (

    <div
      className={`
        flex
        h-full
        w-full
        items-center
        justify-center
        bg-slate-200
        ${className}
      `}
    >

      <div
        className="
          text-center
          text-slate-400
        "
      >

        <House
          size={iconSize}
          className="mx-auto"
        />


        {label && (

          <p
            className="
              mt-3
              text-sm
              font-medium
            "
          >
            {label}
          </p>

        )}

      </div>

    </div>

  );

}


function RoomDetailPage() {

  const {
    roomCode,
  } = useParams();


  const [
    room,
    setRoom,
  ] = useState<
    PublicRoomDetail
    | null
  >(
    null
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
    galleryOpen,
    setGalleryOpen,
  ] = useState(
    false
  );


  const [
    selectedImageIndex,
    setSelectedImageIndex,
  ] = useState(
    0
  );


  async function loadRoom() {

    const normalizedRoomCode =
      roomCode
        ?.trim()
        .toUpperCase();


    if (!normalizedRoomCode) {

      setRoom(
        null
      );

      setError(
        "Không tìm thấy mã phòng."
      );

      setLoading(
        false
      );

      return;

    }


    try {

      setLoading(
        true
      );

      setError(
        null
      );


      const data =
        await publicApiGet<
          PublicRoomDetail
        >(
          `/public/rooms/${
            encodeURIComponent(
              normalizedRoomCode
            )
          }`
        );


      setRoom(
        data
      );

    } catch (
      err
    ) {

      setRoom(
        null
      );


      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải thông tin phòng."
      );

    } finally {

      setLoading(
        false
      );

    }

  }


  useEffect(
    () => {

      void loadRoom();

    },
    [
      roomCode,
    ]
  );


  const galleryImages:
    Array<
      string
      | undefined
    > =
      room?.images
      &&
      room.images.length > 0

        ? room.images

        : [
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          ];


  function openGallery(
    index: number,
  ) {

    setSelectedImageIndex(
      index
    );

    setGalleryOpen(
      true
    );

  }


  function closeGallery() {

    setGalleryOpen(
      false
    );

  }


  function showPreviousImage() {

    setSelectedImageIndex(
      (
        current
      ) =>
        current === 0
          ? galleryImages.length - 1
          : current - 1
    );

  }


  function showNextImage() {

    setSelectedImageIndex(
      (
        current
      ) =>
        current ===
        galleryImages.length - 1
          ? 0
          : current + 1
    );

  }


  useEffect(
    () => {

      if (!galleryOpen) {
        return;
      }


      function handleKeyDown(
        event: KeyboardEvent,
      ) {

        if (
          event.key
          === "Escape"
        ) {
          setGalleryOpen(
            false
          );
        }


        if (
          event.key
          === "ArrowLeft"
        ) {

          setSelectedImageIndex(
            (
              current
            ) =>
              current === 0
                ? galleryImages.length - 1
                : current - 1
          );

        }


        if (
          event.key
          === "ArrowRight"
        ) {

          setSelectedImageIndex(
            (
              current
            ) =>
              current ===
              galleryImages.length - 1
                ? 0
                : current + 1
          );

        }

      }


      document.body.style.overflow =
        "hidden";


      window.addEventListener(
        "keydown",
        handleKeyDown,
      );


      return () => {

        document.body.style.overflow =
          "";


        window.removeEventListener(
          "keydown",
          handleKeyDown,
        );

      };

    },
    [
      galleryOpen,
      galleryImages.length,
    ]
  );


  if (
    loading
  ) {

    return (

      <main
        className="
          flex
          min-h-screen
          items-center
          justify-center
          bg-slate-50
          px-6
        "
      >

        <div
          className="
            text-center
          "
        >

          <LoaderCircle
            size={36}
            className="
              mx-auto
              animate-spin
              text-slate-500
            "
          />


          <p
            className="
              mt-4
              text-sm
              text-slate-500
            "
          >
            Đang tải thông tin phòng...
          </p>

        </div>

      </main>

    );

  }


  if (
    !room
  ) {

    return (

      <main
        className="
          flex
          min-h-screen
          items-center
          justify-center
          bg-slate-50
          px-6
        "
      >

        <div
          className="
            max-w-md
            text-center
          "
        >

          <AlertCircle
            size={48}
            className="
              mx-auto
              text-slate-300
            "
          />


          <h1
            className="
              mt-5
              text-3xl
              font-bold
              text-slate-950
            "
          >
            Không tìm thấy phòng
          </h1>


          <p
            className="
              mt-3
              text-slate-500
            "
          >
            Phòng bạn đang tìm không tồn tại,
            đã có người thuê hoặc đã được gỡ
            khỏi website.
          </p>


          {error && (

            <p
              className="
                mt-3
                text-sm
                text-red-600
              "
            >
              {error}
            </p>

          )}


          <div
            className="
              mt-7
              flex
              flex-col
              justify-center
              gap-3
              sm:flex-row
            "
          >

            <Link
              to="/"
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-slate-900
                px-5
                py-3
                font-semibold
                text-white
              "
            >

              <ArrowLeft
                size={17}
              />

              Về trang chủ

            </Link>


            <button
              type="button"
              onClick={
                () =>
                  void loadRoom()
              }
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-slate-300
                bg-white
                px-5
                py-3
                font-semibold
                text-slate-700
              "
            >

              <RefreshCw
                size={17}
              />

              Thử lại

            </button>

          </div>

        </div>

      </main>

    );

  }


  const availableText =
    formatAvailableFrom(
      room.available_from
    );


  return (

    <div
      className="
        min-h-screen
        bg-slate-50
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

          <Link
            to="/"
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
                Rosehome
              </p>


              <p
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                Apartment
              </p>

            </div>

          </Link>


          <button type="button" disabled aria-label="Demo: liên hệ đã vô hiệu hóa" title="Portfolio demo: không hỗ trợ liên hệ"
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
            "
          >

            <Phone
              size={16}
            />


            <span
              className="
                hidden
                sm:inline
              "
            >
              Liên hệ chủ nhà
            </span>

          </button>

        </div>

      </header>


      <main>

        <div
          className="
            mx-auto
            max-w-7xl
            px-6
            py-10
            lg:px-8
          "
        >

          {/* ==========================
              BACK
          ========================== */}

          <Link
            to="/#rooms"
            className="
              inline-flex
              items-center
              gap-2
              text-sm
              font-semibold
              text-slate-500
              transition
              hover:text-slate-950
            "
          >

            <ArrowLeft
              size={17}
            />

            Quay lại danh sách phòng

          </Link>


          {/* ==========================
              TITLE
          ========================== */}

          <div
            className="
              mt-8
              flex
              flex-col
              justify-between
              gap-6
              lg:flex-row
              lg:items-end
            "
          >

            <div>

              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  gap-3
                "
              >

                <span
                  className="
                    rounded-full
                    bg-emerald-100
                    px-3
                    py-1.5
                    text-xs
                    font-bold
                    text-emerald-700
                  "
                >
                  CÒN PHÒNG
                </span>


                <span
                  className="
                    text-sm
                    text-slate-500
                  "
                >
                  {availableText}
                </span>

              </div>


              <h1
                className="
                  mt-4
                  text-4xl
                  font-bold
                  tracking-tight
                  text-slate-950
                  sm:text-5xl
                "
              >
                Phòng {room.room_code}
              </h1>


              <p
                className="
                  mt-4
                  max-w-2xl
                  leading-7
                  text-slate-600
                "
              >
                {
                  room.description
                  ??
                  (
                    `Phòng ${room.room_code} ` +
                    "đang trống và sẵn sàng cho thuê."
                  )
                }
              </p>

            </div>


            <div
              className="
                lg:text-right
              "
            >

              <p
                className="
                  text-sm
                  text-slate-500
                "
              >
                Giá thuê
              </p>


              <p
                className="
                  mt-1
                  text-3xl
                  font-bold
                  text-slate-950
                "
              >
                {
                  formatMoney(
                    room.monthly_rent
                  )
                }
              </p>


              <p
                className="
                  mt-1
                  text-sm
                  text-slate-500
                "
              >
                / tháng
              </p>

            </div>

          </div>


          {/* ==========================
              GALLERY
          ========================== */}

          <section
            className="
              mt-10
            "
          >

            <div
              className="
                grid
                gap-3
                lg:grid-cols-[2fr_1fr]
              "
            >

              {/* MAIN */}

              <button
                type="button"
                onClick={
                  () =>
                    openGallery(
                      0
                    )
                }
                className="
                  group
                  relative
                  min-h-[300px]
                  overflow-hidden
                  rounded-3xl
                  text-left
                  sm:min-h-[420px]
                "
              >

                <RoomImage
                  src={
                    galleryImages[0]
                  }
                  alt={
                    `Ảnh chính phòng ${room.room_code}`
                  }
                  label={
                    `Ảnh chính phòng ${room.room_code}`
                  }
                  iconSize={48}
                />


                <div
                  className="
                    absolute
                    inset-0
                    bg-black/0
                    transition
                    group-hover:bg-black/5
                  "
                />

              </button>


              {/* SIDE */}

              <div
                className="
                  grid
                  grid-cols-2
                  gap-3
                  lg:grid-cols-1
                "
              >

                <button
                  type="button"
                  onClick={
                    () =>
                      openGallery(
                        1
                      )
                  }
                  className="
                    group
                    relative
                    min-h-[145px]
                    overflow-hidden
                    rounded-3xl
                    sm:min-h-[200px]
                  "
                >

                  <RoomImage
                    src={
                      galleryImages[1]
                    }
                    alt={
                      `Ảnh phòng ${room.room_code} 2`
                    }
                    label="Ảnh phòng"
                  />


                  <div
                    className="
                      absolute
                      inset-0
                      bg-black/0
                      transition
                      group-hover:bg-black/5
                    "
                  />

                </button>


                <button
                  type="button"
                  onClick={
                    () =>
                      openGallery(
                        2
                      )
                  }
                  className="
                    group
                    relative
                    min-h-[145px]
                    overflow-hidden
                    rounded-3xl
                    sm:min-h-[200px]
                  "
                >

                  <RoomImage
                    src={
                      galleryImages[2]
                    }
                    alt={
                      `Ảnh phòng ${room.room_code} 3`
                    }
                    label="Ảnh phòng"
                  />


                  <div
                    className="
                      absolute
                      inset-0
                      bg-black/0
                      transition
                      group-hover:bg-black/5
                    "
                  />


                  <div
                    className="
                      absolute
                      bottom-4
                      right-4
                    "
                  >

                    <span
                      className="
                        inline-flex
                        items-center
                        gap-2
                        rounded-xl
                        bg-white/95
                        px-4
                        py-2.5
                        text-xs
                        font-bold
                        text-slate-900
                        shadow-lg
                        backdrop-blur
                      "
                    >

                      <Images
                        size={16}
                      />

                      Xem tất cả ảnh

                    </span>

                  </div>

                </button>

              </div>

            </div>

          </section>


          {/* ==========================
              BASIC INFO
          ========================== */}

          <section
            className="
              mt-8
              grid
              gap-4
              sm:grid-cols-2
              lg:grid-cols-4
            "
          >

            <div
              className="
                rounded-2xl
                border
                border-slate-200
                bg-white
                p-5
              "
            >

              <Maximize2
                size={20}
                className="
                  text-emerald-600
                "
              />


              <p
                className="
                  mt-4
                  text-sm
                  text-slate-500
                "
              >
                Diện tích
              </p>


              <p
                className="
                  mt-1
                  text-xl
                  font-bold
                "
              >
                {room.area_m2}m²
              </p>

            </div>


            <div
              className="
                rounded-2xl
                border
                border-slate-200
                bg-white
                p-5
              "
            >

              <Users
                size={20}
                className="
                  text-blue-600
                "
              />


              <p
                className="
                  mt-4
                  text-sm
                  text-slate-500
                "
              >
                Số người
              </p>


              <p
                className="
                  mt-1
                  text-xl
                  font-bold
                "
              >
                Tối đa {
                  room.max_occupants
                }
              </p>

            </div>


            <div
              className="
                rounded-2xl
                border
                border-slate-200
                bg-white
                p-5
              "
            >

              <WalletCards
                size={20}
                className="
                  text-violet-600
                "
              />


              <p
                className="
                  mt-4
                  text-sm
                  text-slate-500
                "
              >
                Tiền cọc
              </p>


              <p
                className="
                  mt-1
                  text-xl
                  font-bold
                "
              >
                {
                  room.deposit_months === 0
                    ? "Không cọc"
                    : `${room.deposit_months} tháng`
                }
              </p>

            </div>


            <div
              className="
                rounded-2xl
                border
                border-slate-200
                bg-white
                p-5
              "
            >

              <MapPin
                size={20}
                className="
                  text-rose-600
                "
              />


              <p
                className="
                  mt-4
                  text-sm
                  text-slate-500
                "
              >
                Tình trạng
              </p>


              <p
                className="
                  mt-1
                  text-lg
                  font-bold
                "
              >
                {availableText}
              </p>

            </div>

          </section>


          {/* ==========================
              DETAIL
          ========================== */}

          <div
            className="
              mt-8
              grid
              gap-6
              lg:grid-cols-[1.3fr_0.7fr]
            "
          >

            <div
              className="
                space-y-6
              "
            >

              {/* AMENITIES */}

              <section
                className="
                  rounded-3xl
                  border
                  border-slate-200
                  bg-white
                  p-7
                "
              >

                <h2
                  className="
                    text-xl
                    font-bold
                  "
                >
                  Tiện ích phòng
                </h2>


                {
                  room.amenities.length > 0
                    ? (

                      <div
                        className="
                          mt-6
                          grid
                          gap-3
                          sm:grid-cols-2
                        "
                      >

                        {room.amenities.map(
                          (
                            item
                          ) => (

                            <div
                              key={
                                item
                              }
                              className="
                                flex
                                items-center
                                gap-3
                                rounded-xl
                                bg-slate-50
                                p-4
                              "
                            >

                              <Check
                                size={18}
                                className="
                                  text-emerald-600
                                "
                              />


                              <span
                                className="
                                  text-sm
                                  font-medium
                                "
                              >
                                {item}
                              </span>

                            </div>

                          )
                        )}

                      </div>

                    )
                    : (

                      <p
                        className="
                          mt-4
                          text-sm
                          text-slate-500
                        "
                      >
                        Thông tin tiện ích đang được cập nhật.
                      </p>

                    )
                }

              </section>


              {/* FURNITURE */}

              <section
                className="
                  rounded-3xl
                  border
                  border-slate-200
                  bg-white
                  p-7
                "
              >

                <h2
                  className="
                    text-xl
                    font-bold
                  "
                >
                  Nội thất có sẵn
                </h2>


                {
                  room.furniture.length > 0
                    ? (

                      <div
                        className="
                          mt-6
                          grid
                          gap-3
                          sm:grid-cols-2
                        "
                      >

                        {room.furniture.map(
                          (
                            item
                          ) => (

                            <div
                              key={
                                item
                              }
                              className="
                                flex
                                items-center
                                gap-3
                                rounded-xl
                                bg-slate-50
                                p-4
                              "
                            >

                              <Check
                                size={18}
                                className="
                                  text-blue-600
                                "
                              />


                              <span
                                className="
                                  text-sm
                                  font-medium
                                "
                              >
                                {item}
                              </span>

                            </div>

                          )
                        )}

                      </div>

                    )
                    : (

                      <p
                        className="
                          mt-4
                          text-sm
                          text-slate-500
                        "
                      >
                        Thông tin nội thất đang được cập nhật.
                      </p>

                    )
                }

              </section>

            </div>


            {/* ==========================
                COST
            ========================== */}

            <aside
              className="
                h-fit
                rounded-3xl
                border
                border-slate-200
                bg-white
                p-7
                lg:sticky
                lg:top-6
              "
            >

              <h2
                className="
                  text-xl
                  font-bold
                "
              >
                Chi phí
              </h2>


              <div
                className="
                  mt-6
                  space-y-5
                "
              >

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-4
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      gap-3
                    "
                  >

                    <Zap
                      size={18}
                      className="
                        text-amber-600
                      "
                    />

                    <span
                      className="
                        text-sm
                        text-slate-600
                      "
                    >
                      Điện
                    </span>

                  </div>


                  <strong
                    className="
                      text-sm
                    "
                  >
                    {
                      formatMoney(
                        room.electricity_rate
                      )
                    }

                    {
                      room.electricity_rate
                      !== null
                      &&
                      " / kWh"
                    }
                  </strong>

                </div>


                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-4
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      gap-3
                    "
                  >

                    <Droplets
                      size={18}
                      className="
                        text-blue-600
                      "
                    />

                    <span
                      className="
                        text-sm
                        text-slate-600
                      "
                    >
                      Nước
                    </span>

                  </div>


                  <strong
                    className="
                      text-sm
                    "
                  >
                    {
                      formatMoney(
                        room.water_fee
                      )
                    }
                  </strong>

                </div>


                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-4
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      gap-3
                    "
                  >

                    <Wifi
                      size={18}
                      className="
                        text-violet-600
                      "
                    />

                    <span
                      className="
                        text-sm
                        text-slate-600
                      "
                    >
                      Wifi
                    </span>

                  </div>


                  <strong
                    className="
                      text-sm
                    "
                  >
                    {
                      formatMoney(
                        room.wifi_fee
                      )
                    }
                  </strong>

                </div>


                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-4
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      gap-3
                    "
                  >

                    <Bike
                      size={18}
                      className="
                        text-emerald-600
                      "
                    />

                    <span
                      className="
                        text-sm
                        text-slate-600
                      "
                    >
                      Giữ xe
                    </span>

                  </div>


                  <strong
                    className="
                      text-sm
                    "
                  >
                    {
                      formatMoney(
                        room.parking_fee
                      )
                    }
                  </strong>

                </div>


                {
                  room.management_fee
                  !== null
                  &&
                  (

                    <div
                      className="
                        flex
                        items-center
                        justify-between
                        gap-4
                      "
                    >

                      <div
                        className="
                          flex
                          items-center
                          gap-3
                        "
                      >

                        <House
                          size={18}
                          className="
                            text-slate-600
                          "
                        />

                        <span
                          className="
                            text-sm
                            text-slate-600
                          "
                        >
                          Phí quản lý
                        </span>

                      </div>


                      <strong
                        className="
                          text-sm
                        "
                      >
                        {
                          formatMoney(
                            room.management_fee
                          )
                        }
                      </strong>

                    </div>

                  )
                }

              </div>


              <div
                className="
                  mt-7
                  border-t
                  border-slate-200
                  pt-7
                "
              >

                <button type="button" disabled aria-label="Demo: liên hệ đã vô hiệu hóa" title="Portfolio demo: không hỗ trợ liên hệ"
                  className="
                    flex
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-slate-950
                    px-5
                    py-3.5
                    font-semibold
                    text-white
                    transition
                    hover:bg-slate-800
                  "
                >

                  <Phone
                    size={17}
                  />

                  Gọi chủ nhà

                </button>


                <button type="button" disabled aria-label="Demo: liên hệ đã vô hiệu hóa" title="Portfolio demo: không hỗ trợ liên hệ"
                  className="
                    mt-3
                    flex
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    border
                    border-slate-300
                    px-5
                    py-3.5
                    font-semibold
                    text-slate-700
                    transition
                    hover:bg-slate-50
                  "
                >

                  <MessageCircle
                    size={17}
                  />

                  Nhắn Zalo

                </button>

              </div>

            </aside>

          </div>

        </div>

      </main>


      {/* ==========================
          MOBILE CONTACT
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

          <button type="button" disabled aria-label="Demo: liên hệ đã vô hiệu hóa" title="Portfolio demo: không hỗ trợ liên hệ"
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

          </button>


          <button type="button" disabled aria-label="Demo: liên hệ đã vô hiệu hóa" title="Portfolio demo: không hỗ trợ liên hệ"
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

          </button>

        </div>

      </div>


      {/* ==========================
          FULL SCREEN GALLERY
      ========================== */}

      {galleryOpen && (

        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            flex-col
            bg-black/95
          "
          role="dialog"
          aria-modal="true"
          aria-label={
            `Thư viện ảnh phòng ${room.room_code}`
          }
        >

          {/* HEADER */}

          <div
            className="
              flex
              h-16
              shrink-0
              items-center
              justify-between
              border-b
              border-white/10
              px-4
              text-white
              sm:px-6
            "
          >

            <div>

              <p
                className="
                  font-semibold
                "
              >
                Phòng {room.room_code}
              </p>


              <p
                className="
                  mt-0.5
                  text-xs
                  text-white/60
                "
              >
                {selectedImageIndex + 1}
                {" / "}
                {galleryImages.length}
              </p>

            </div>


            <button
              type="button"
              onClick={
                closeGallery
              }
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-full
                bg-white/10
                transition
                hover:bg-white/20
              "
              aria-label="Đóng thư viện ảnh"
            >

              <X
                size={22}
              />

            </button>

          </div>


          {/* LARGE IMAGE */}

          <div
            className="
              relative
              flex
              min-h-0
              flex-1
              items-center
              justify-center
              px-14
              py-6
              sm:px-20
            "
          >

            <div
              className="
                h-full
                max-h-[70vh]
                w-full
                max-w-6xl
                overflow-hidden
                rounded-2xl
                bg-slate-900
              "
            >

              <RoomImage
                src={
                  galleryImages[
                    selectedImageIndex
                  ]
                }
                alt={
                  `Ảnh ${
                    selectedImageIndex + 1
                  } phòng ${room.room_code}`
                }
                label={
                  `Ảnh ${
                    selectedImageIndex + 1
                  } phòng ${room.room_code}`
                }
                iconSize={55}
              />

            </div>


            <button
              type="button"
              onClick={
                showPreviousImage
              }
              className="
                absolute
                left-2
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-full
                bg-white/10
                text-white
                backdrop-blur
                transition
                hover:bg-white/20
                sm:left-6
                sm:h-12
                sm:w-12
              "
              aria-label="Ảnh trước"
            >

              <ChevronLeft
                size={25}
              />

            </button>


            <button
              type="button"
              onClick={
                showNextImage
              }
              className="
                absolute
                right-2
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-full
                bg-white/10
                text-white
                backdrop-blur
                transition
                hover:bg-white/20
                sm:right-6
                sm:h-12
                sm:w-12
              "
              aria-label="Ảnh tiếp theo"
            >

              <ChevronRight
                size={25}
              />

            </button>

          </div>


          {/* THUMBNAILS */}

          <div
            className="
              shrink-0
              overflow-x-auto
              border-t
              border-white/10
              px-4
              py-4
            "
          >

            <div
              className="
                mx-auto
                flex
                w-max
                gap-3
              "
            >

              {galleryImages.map(
                (
                  image,
                  index,
                ) => (

                  <button
                    key={index}
                    type="button"
                    onClick={
                      () =>
                        setSelectedImageIndex(
                          index
                        )
                    }
                    className={`
                      h-16
                      w-24
                      overflow-hidden
                      rounded-xl
                      border-2
                      transition
                      sm:h-20
                      sm:w-28
                      ${
                        selectedImageIndex
                        === index

                          ? "border-white"

                          : `
                            border-transparent
                            opacity-60
                            hover:opacity-100
                          `
                      }
                    `}
                  >

                    <RoomImage
                      src={image}
                      alt={
                        `Ảnh nhỏ ${
                          index + 1
                        } phòng ${room.room_code}`
                      }
                      iconSize={20}
                    />

                  </button>

                )
              )}

            </div>

          </div>

        </div>

      )}

    </div>

  );

}


export default RoomDetailPage;