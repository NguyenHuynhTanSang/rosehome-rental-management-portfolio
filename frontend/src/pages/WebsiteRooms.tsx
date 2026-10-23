import {
  useEffect,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Eye,
  EyeOff,
  LoaderCircle,
  RefreshCw,
  Settings2,
} from "lucide-react";

import {
  Link,
} from "react-router";

import {
  apiGet,
} from "../api/api.ts";


type RoomPublicProfileListItem = {

  room_id: number;

  room_code: string;

  floor:
    number
    | null;

  room_status: string;

  is_visible: boolean;

  monthly_rent:
    number
    | null;

  area_m2:
    number
    | null;

  max_occupants:
    number
    | null;

  available_from:
    string
    | null;

};


function formatMoney(
  value:
    number
    | null,
) {

  if (
    value === null
  ) {

    return "Chưa thiết lập";

  }


  return new Intl.NumberFormat(
    "vi-VN"
  ).format(
    value
  ) + " đ";

}


function getRoomStatusLabel(
  status: string,
) {

  if (
    status === "VACANT"
  ) {

    return "Trống";

  }


  if (
    status === "OCCUPIED"
  ) {

    return "Đang thuê";

  }


  return status;

}


function WebsiteRooms() {

  const [
    rooms,
    setRooms,
  ] = useState<
    RoomPublicProfileListItem[]
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


  async function loadRooms() {

    try {

      setLoading(
        true
      );

      setError(
        null
      );


      const data =
        await apiGet<
          RoomPublicProfileListItem[]
        >(
          "/rooms/public-profiles"
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


  useEffect(
    () => {

      void loadRooms();

    },
    []
  );


  const visibleCount =
    rooms.filter(
      (
        room
      ) =>
        room.is_visible
    ).length;


  return (

    <div
      className="
        mx-auto
        w-full
        max-w-7xl
        space-y-6
      "
    >

      {/* ==========================
          BACK
      ========================== */}

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


      {/* ==========================
          HEADER
      ========================== */}

      <div
        className="
          flex
          flex-col
          gap-4
          sm:flex-row
          sm:items-end
          sm:justify-between
        "
      >

        <div>

          <p
            className="
              text-sm
              font-medium
              text-neutral-500
            "
          >
            WEBSITE / PHÒNG ĐĂNG TIN
          </p>


          <h1
            className="
              mt-1
              text-2xl
              font-semibold
              tracking-tight
              text-neutral-900
            "
          >
            Phòng đăng tin
          </h1>


          <p
            className="
              mt-2
              max-w-2xl
              text-sm
              leading-6
              text-neutral-500
            "
          >
            Chọn những phòng được phép hiển
            thị trên website và quản lý thông
            tin cho thuê công khai.
          </p>

        </div>


        <div
          className="
            inline-flex
            w-fit
            items-center
            gap-2
            rounded-xl
            border
            border-neutral-200
            bg-white
            px-4
            py-2.5
            text-sm
            text-neutral-600
          "
        >

          <Building2
            size={17}
          />

          {rooms.length} phòng

        </div>

      </div>


      {/* ==========================
          INFO
      ========================== */}

      <div
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
            flex-col
            gap-4
            sm:flex-row
            sm:items-start
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

            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-neutral-100
              "
            >

              <Settings2
                size={19}
              />

            </div>


            <div>

              <h2
                className="
                  font-semibold
                  text-neutral-900
                "
              >
                Quản lý hiển thị website
              </h2>


              <p
                className="
                  mt-1
                  max-w-2xl
                  text-sm
                  leading-6
                  text-neutral-500
                "
              >
                Phòng trong hệ thống không tự
                động xuất hiện trên website.
                Chủ nhà quyết định phòng nào
                được đăng công khai.
              </p>

            </div>

          </div>


          {!loading && !error && (

            <div
              className="
                flex
                flex-wrap
                gap-2
              "
            >

              <span
                className="
                  rounded-full
                  bg-neutral-100
                  px-3
                  py-1.5
                  text-xs
                  font-medium
                  text-neutral-700
                "
              >
                Tổng: {rooms.length}
              </span>


              <span
                className="
                  rounded-full
                  bg-emerald-50
                  px-3
                  py-1.5
                  text-xs
                  font-medium
                  text-emerald-700
                "
              >
                Đang đăng: {visibleCount}
              </span>

            </div>

          )}

        </div>

      </div>


      {/* ==========================
          ROOM LIST
      ========================== */}

      <div
        className="
          overflow-hidden
          rounded-2xl
          border
          border-neutral-200
          bg-white
        "
      >

        <div
          className="
            flex
            items-center
            justify-between
            gap-4
            border-b
            border-neutral-200
            px-5
            py-4
          "
        >

          <div>

            <h2
              className="
                font-semibold
                text-neutral-900
              "
            >
              Danh sách phòng
            </h2>


            <p
              className="
                mt-1
                text-sm
                text-neutral-500
              "
            >
              Dữ liệu được lấy trực tiếp từ
              hệ thống quản lý Rosehome.
            </p>

          </div>


          <button
            type="button"
            onClick={
              () =>
                void loadRooms()
            }
            disabled={
              loading
            }
            className="
              inline-flex
              min-h-10
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-neutral-200
              bg-white
              px-3
              text-sm
              font-medium
              text-neutral-700
              transition
              hover:bg-neutral-50
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >

            <RefreshCw
              size={16}
            />

            Làm mới

          </button>

        </div>


        {/* ==========================
            LOADING
        ========================== */}

        {loading && (

          <div
            className="
              flex
              min-h-48
              flex-col
              items-center
              justify-center
              gap-3
              p-6
              text-neutral-500
            "
          >

            <LoaderCircle
              size={28}
              className="animate-spin"
            />

            <p
              className="
                text-sm
              "
            >
              Đang tải danh sách phòng...
            </p>

          </div>

        )}


        {/* ==========================
            ERROR
        ========================== */}

        {!loading && error && (

          <div
            className="
              p-5
            "
          >

            <div
              className="
                flex
                flex-col
                gap-4
                rounded-xl
                border
                border-red-200
                bg-red-50
                p-4
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
                  size={20}
                  className="
                    mt-0.5
                    shrink-0
                    text-red-600
                  "
                />


                <div>

                  <strong
                    className="
                      text-sm
                      text-red-800
                    "
                  >
                    Không thể tải dữ liệu
                  </strong>


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
                  min-h-10
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-white
                  px-4
                  text-sm
                  font-medium
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

        )}


        {/* ==========================
            EMPTY
        ========================== */}

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
                flex
                min-h-48
                flex-col
                items-center
                justify-center
                gap-2
                p-6
                text-center
              "
            >

              <Building2
                size={28}
                className="
                  text-neutral-400
                "
              />


              <strong
                className="
                  text-neutral-800
                "
              >
                Chưa có phòng
              </strong>


              <p
                className="
                  text-sm
                  text-neutral-500
                "
              >
                Hãy tạo phòng trong hệ thống
                quản lý trước.
              </p>

            </div>

          )
        }


        {/* ==========================
            ROOMS
        ========================== */}

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
                grid
                gap-3
                p-5
              "
            >

              {rooms.map(
                (
                  room
                ) => (

                  <div
                    key={
                      room.room_id
                    }
                    className="
                      flex
                      flex-col
                      gap-5
                      rounded-xl
                      border
                      border-neutral-200
                      p-4
                      sm:flex-row
                      sm:items-center
                      sm:justify-between
                    "
                  >

                    {/* LEFT */}

                    <div
                      className="
                        flex
                        min-w-0
                        items-start
                        gap-3
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
                          bg-neutral-100
                        "
                      >

                        <Building2
                          size={20}
                        />

                      </div>


                      <div
                        className="
                          min-w-0
                        "
                      >

                        <div
                          className="
                            flex
                            flex-wrap
                            items-center
                            gap-2
                          "
                        >

                          <strong
                            className="
                              text-neutral-900
                            "
                          >
                            {room.room_code}
                          </strong>


                          <span
                            className={
                              room.room_status
                              === "VACANT"

                                ? `
                                  rounded-full
                                  bg-emerald-50
                                  px-2.5
                                  py-1
                                  text-xs
                                  font-medium
                                  text-emerald-700
                                `

                                : `
                                  rounded-full
                                  bg-neutral-100
                                  px-2.5
                                  py-1
                                  text-xs
                                  font-medium
                                  text-neutral-600
                                `
                            }
                          >
                            {
                              getRoomStatusLabel(
                                room.room_status
                              )
                            }
                          </span>


                          <span
                            className={
                              room.is_visible

                                ? `
                                  inline-flex
                                  items-center
                                  gap-1
                                  rounded-full
                                  bg-blue-50
                                  px-2.5
                                  py-1
                                  text-xs
                                  font-medium
                                  text-blue-700
                                `

                                : `
                                  inline-flex
                                  items-center
                                  gap-1
                                  rounded-full
                                  bg-neutral-100
                                  px-2.5
                                  py-1
                                  text-xs
                                  font-medium
                                  text-neutral-600
                                `
                            }
                          >

                            {
                              room.is_visible
                                ? (
                                  <Eye
                                    size={13}
                                  />
                                )
                                : (
                                  <EyeOff
                                    size={13}
                                  />
                                )
                            }

                            {
                              room.is_visible
                                ? "Đang đăng"
                                : "Chưa đăng"
                            }

                          </span>

                        </div>


                        <div
                          className="
                            mt-2
                            flex
                            flex-wrap
                            gap-x-4
                            gap-y-1
                            text-sm
                            text-neutral-500
                          "
                        >

                          <span>
                            Tầng: {
                              room.floor
                              ?? "—"
                            }
                          </span>


                          <span>
                            Giá: {
                              formatMoney(
                                room.monthly_rent
                              )
                            }
                          </span>


                          <span>
                            Diện tích: {
                              room.area_m2
                              !== null
                                ? `${room.area_m2} m²`
                                : "Chưa thiết lập"
                            }
                          </span>


                          <span>
                            Tối đa: {
                              room.max_occupants
                              !== null
                                ? `${room.max_occupants} người`
                                : "Chưa thiết lập"
                            }
                          </span>

                        </div>

                      </div>

                    </div>


                    {/* RIGHT */}

                    <Link
  to={
    `/website/rooms/${room.room_id}`
  }
  className="
    inline-flex
    min-h-11
    shrink-0
    items-center
    justify-center
    gap-2
    rounded-xl
    border
    border-neutral-200
    bg-white
    px-4
    text-sm
    font-medium
    text-neutral-700
    transition
    hover:bg-neutral-50
  "
>

  <Settings2
    size={16}
  />

  Chỉnh thông tin

</Link>

                  </div>

                )
              )}

            </div>

          )
        }

      </div>

    </div>

  );

}


export default WebsiteRooms;