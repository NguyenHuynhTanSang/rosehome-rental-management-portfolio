import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  Eye,
  ImagePlus,
  Images,
  LoaderCircle,
  Save,
  Trash2,
} from "lucide-react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router";

import {
  apiDelete,
  apiGet,
  apiPatchNoBody,
  apiPostFormData,
  apiPut,
} from "../api/api.ts";

type RoomPublicProfile = {

  id:
    number
    | null;

  room_id: number;

  room_code: string;

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

  deposit_months: number;

  parking_fee: number;

  wifi_fee: number;

  amenities: string[];

  furniture: string[];

};


type RoomPublicImage = {

  id: number;

  room_id: number;

  file_key: string;

  original_name:
    string
    | null;

  content_type:
    string
    | null;

  sort_order: number;

  url: string;

};


type FormState = {

  is_visible: boolean;

  monthly_rent: string;

  area_m2: string;

  max_occupants: string;

  available_from: string;

  deposit_months: string;

  parking_fee: string;

  wifi_fee: string;

  amenities: string;

  furniture: string;

};


const initialForm: FormState = {

  is_visible: false,

  monthly_rent: "",

  area_m2: "",

  max_occupants: "",

  available_from: "",

  deposit_months: "1",

  parking_fee: "0",

  wifi_fee: "0",

  amenities: "",

  furniture: "",

};


const MAX_ROOM_IMAGES = 10;


const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];


const MAX_IMAGE_BYTES =
  10
  * 1024
  * 1024;


function optionalNumber(
  value: string
): number | null {

  const normalized =
    value.trim();


  if (!normalized) {

    return null;

  }


  return Number(
    normalized
  );

}


function splitItems(
  value: string
): string[] {

  return value
    .split(",")
    .map(
      (
        item
      ) =>
        item.trim()
    )
    .filter(
      Boolean
    );

}


function WebsiteRoomEdit() {

  const {
    roomId,
  } = useParams();


  const navigate =
    useNavigate();


  const [
    form,
    setForm,
  ] = useState<FormState>(
    initialForm
  );


  const [
    roomCode,
    setRoomCode,
  ] = useState(
    ""
  );


  const [
    images,
    setImages,
  ] = useState<
    RoomPublicImage[]
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
    saving,
    setSaving,
  ] = useState(
    false
  );


  const [
    uploadingImages,
    setUploadingImages,
  ] = useState(
    false
  );


  const [
    deletingImageId,
    setDeletingImageId,
  ] = useState<
    number
    | null
  >(
    null
  );

  const [
    settingCoverId,
    setSettingCoverId,
  ] = useState<
    number
    | null
  >(
    null
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
    imageError,
    setImageError,
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


  async function refreshImages() {

    if (!roomId) {
      return;
    }


    const data =
      await apiGet<
        RoomPublicImage[]
      >(
        `/rooms/${roomId}/public-images`
      );


    setImages(
      data
    );

  }


  useEffect(
    () => {

      async function loadData() {

        if (!roomId) {

          setError(
            "Không tìm thấy phòng."
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

          setImageError(
            null
          );


          const [
            profileData,
            imageData,
          ] = await Promise.all([

            apiGet<
              RoomPublicProfile
            >(
              `/rooms/${roomId}/public-profile`
            ),

            apiGet<
              RoomPublicImage[]
            >(
              `/rooms/${roomId}/public-images`
            ),

          ]);


          setRoomCode(
            profileData.room_code
          );


          setImages(
            imageData
          );


          setForm({

            is_visible:
              profileData.is_visible,

            monthly_rent:
              profileData.monthly_rent
              !== null
                ? String(
                    profileData.monthly_rent
                  )
                : "",

            area_m2:
              profileData.area_m2
              !== null
                ? String(
                    profileData.area_m2
                  )
                : "",

            max_occupants:
              profileData.max_occupants
              !== null
                ? String(
                    profileData.max_occupants
                  )
                : "",

            available_from:
              profileData.available_from
              ?? "",

            deposit_months:
              String(
                profileData.deposit_months
              ),

            parking_fee:
              String(
                profileData.parking_fee
              ),

            wifi_fee:
              String(
                profileData.wifi_fee
              ),

            amenities:
              profileData.amenities.join(
                ", "
              ),

            furniture:
              profileData.furniture.join(
                ", "
              ),

          });

        } catch (
          err
        ) {

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


      void loadData();

    },
    [
      roomId,
    ]
  );


  function updateField(
    field: keyof FormState,
    value:
      string
      | boolean
  ) {

    setForm(
      (
        previous
      ) => ({

        ...previous,

        [field]:
          value,

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


    if (!roomId) {

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


      await apiPut<
        RoomPublicProfile,
        {
          is_visible: boolean;
          monthly_rent: number | null;
          area_m2: number | null;
          max_occupants: number | null;
          available_from: string | null;
          deposit_months: number;
          parking_fee: number;
          wifi_fee: number;
          amenities: string[];
          furniture: string[];
        }
      >(
        `/rooms/${roomId}/public-profile`,
        {
          is_visible:
            form.is_visible,

          monthly_rent:
            optionalNumber(
              form.monthly_rent
            ),

          area_m2:
            optionalNumber(
              form.area_m2
            ),

          max_occupants:
            optionalNumber(
              form.max_occupants
            ),

          available_from:
            form.available_from
            || null,

          deposit_months:
            Number(
              form.deposit_months
              || 0
            ),

          parking_fee:
            Number(
              form.parking_fee
              || 0
            ),

          wifi_fee:
            Number(
              form.wifi_fee
              || 0
            ),

          amenities:
            splitItems(
              form.amenities
            ),

          furniture:
            splitItems(
              form.furniture
            ),
        }
      );


      setSuccess(
        true
      );

    } catch (
      err
    ) {

      setError(
        err instanceof Error
          ? err.message
          : "Không thể lưu thông tin."
      );

    } finally {

      setSaving(
        false
      );

    }

  }


  async function handleImageUpload(
    event:
      ChangeEvent<HTMLInputElement>
  ) {

    const input =
      event.currentTarget;


    const files =
      Array.from(
        input.files
        ?? []
      );


    if (
      !roomId
      ||
      files.length === 0
    ) {

      return;

    }


    const remainingSlots =
      MAX_ROOM_IMAGES
      - images.length;


    if (
      remainingSlots <= 0
    ) {

      setImageError(
        "Phòng đã có tối đa 10 ảnh."
      );

      input.value =
        "";

      return;

    }


    if (
      files.length
      >
      remainingSlots
    ) {

      setImageError(
        (
          `Chỉ có thể thêm ${
            remainingSlots
          } ảnh nữa.`
        )
      );

      input.value =
        "";

      return;

    }


    const invalidType =
      files.find(
        (
          file
        ) =>
          !ALLOWED_IMAGE_TYPES
            .includes(
              file.type
            )
      );


    if (invalidType) {

      setImageError(
        (
          "Chỉ hỗ trợ ảnh "
          + "JPG, PNG hoặc WEBP."
        )
      );

      input.value =
        "";

      return;

    }


    const oversizedFile =
      files.find(
        (
          file
        ) =>
          file.size
          >
          MAX_IMAGE_BYTES
      );


    if (oversizedFile) {

      setImageError(
        (
          "Mỗi ảnh phải nhỏ hơn "
          + "hoặc bằng 10 MB."
        )
      );

      input.value =
        "";

      return;

    }


    try {

      setUploadingImages(
        true
      );

      setImageError(
        null
      );


      for (
        const file
        of files
      ) {

        const formData =
          new FormData();


        formData.append(
          "file",
          file
        );


        await apiPostFormData<
          RoomPublicImage
        >(
          `/rooms/${roomId}/public-images`,
          formData
        );

      }


      await refreshImages();

    } catch (
      err
    ) {

      setImageError(
        err instanceof Error
          ? err.message
          : "Không thể tải ảnh lên."
      );

    } finally {

      setUploadingImages(
        false
      );


      input.value =
        "";

    }

  }

  // =======================================================
  // SET COVER IMAGE
  // =======================================================

  async function handleSetCover(
    image:
      RoomPublicImage
  ) {

    if (!roomId) {

      return;

    }


    if (
      images[0]?.id
      === image.id
    ) {

      return;

    }


    try {

      setSettingCoverId(
        image.id
      );

      setImageError(
        null
      );


      const data =
        await apiPatchNoBody<
          RoomPublicImage[]
        >(
          (
            `/rooms/${roomId}`
            + `/public-images/${image.id}`
            + "/cover"
          )
        );


      setImages(
        data
      );

    } catch (
      err
    ) {

      setImageError(
        err instanceof Error
          ? err.message
          : "Không thể đặt ảnh đại diện."
      );

    } finally {

      setSettingCoverId(
        null
      );

    }

  }


  // =======================================================
  // DELETE IMAGE
  // =======================================================

  async function handleDeleteImage(
    image:
      RoomPublicImage
  ) {

    if (!roomId) {

      return;

    }


    const isCover =
      images[0]?.id
      === image.id;


    const confirmed =
      window.confirm(
        (
          isCover
            ? (
              "Đây đang là ảnh đại diện. "
              + "Bạn có chắc muốn xóa ảnh này?"
            )
            : "Bạn có chắc muốn xóa ảnh này?"
        )
      );


    if (!confirmed) {

      return;

    }


    try {

      setDeletingImageId(
        image.id
      );

      setImageError(
        null
      );


      await apiDelete<void>(
        (
          `/rooms/${roomId}`
          + `/public-images/${image.id}`
        )
      );


      await refreshImages();

    } catch (
      err
    ) {

      setImageError(
        err instanceof Error
          ? err.message
          : "Không thể xóa ảnh."
      );

    } finally {

      setDeletingImageId(
        null
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
        to="/website/rooms"
        className="
          inline-flex
          items-center
          gap-2
          text-sm
          font-medium
          text-neutral-500
          hover:text-neutral-900
        "
      >

        <ArrowLeft
          size={17}
        />

        Phòng đăng tin

      </Link>


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
            text-neutral-900
          "
        >
          Chỉnh thông tin {roomCode}
        </h1>


        <p
          className="
            mt-2
            text-sm
            text-neutral-500
          "
        >
          Những thông tin này chỉ phục vụ
          website công khai và không thay đổi
          hợp đồng hay hóa đơn hiện tại.
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

        {/* ==========================
            HIỂN THỊ
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
              items-center
              justify-between
              gap-4
            "
          >

            <div>

              <div
                className="
                  flex
                  items-center
                  gap-2
                  font-semibold
                  text-neutral-900
                "
              >

                <Eye
                  size={18}
                />

                Hiển thị trên website

              </div>


              <p
                className="
                  mt-1
                  text-sm
                  text-neutral-500
                "
              >
                Chỉ phòng trống mới có thể
                xuất hiện trên website khách thuê.
              </p>

            </div>


            <input
              type="checkbox"
              checked={
                form.is_visible
              }
              onChange={
                (
                  event
                ) =>
                  updateField(
                    "is_visible",
                    event.target.checked
                  )
              }
              className="
                h-5
                w-5
                accent-neutral-900
              "
            />

          </div>

        </div>


        {/* ==========================
            THÔNG TIN CƠ BẢN
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

          <h2
            className="
              font-semibold
              text-neutral-900
            "
          >
            Thông tin cho thuê
          </h2>


          <div
            className="
              mt-5
              grid
              grid-cols-1
              gap-4
              sm:grid-cols-2
            "
          >

            <label
              className="space-y-2"
            >

              <span
                className="
                  text-sm
                  font-medium
                  text-neutral-700
                "
              >
                Giá thuê / tháng
              </span>


              <input
                type="number"
                min="0"
                value={
                  form.monthly_rent
                }
                onChange={
                  (
                    event
                  ) =>
                    updateField(
                      "monthly_rent",
                      event.target.value
                    )
                }
                placeholder="3500000"
                className="
                  min-h-11
                  w-full
                  rounded-xl
                  border
                  border-neutral-200
                  px-3
                  outline-none
                  focus:border-neutral-400
                "
              />

            </label>


            <label
              className="space-y-2"
            >

              <span
                className="
                  text-sm
                  font-medium
                  text-neutral-700
                "
              >
                Diện tích (m²)
              </span>


              <input
                type="number"
                min="1"
                value={
                  form.area_m2
                }
                onChange={
                  (
                    event
                  ) =>
                    updateField(
                      "area_m2",
                      event.target.value
                    )
                }
                placeholder="25"
                className="
                  min-h-11
                  w-full
                  rounded-xl
                  border
                  border-neutral-200
                  px-3
                  outline-none
                  focus:border-neutral-400
                "
              />

            </label>


            <label
              className="space-y-2"
            >

              <span
                className="
                  text-sm
                  font-medium
                  text-neutral-700
                "
              >
                Số người tối đa
              </span>


              <input
                type="number"
                min="1"
                value={
                  form.max_occupants
                }
                onChange={
                  (
                    event
                  ) =>
                    updateField(
                      "max_occupants",
                      event.target.value
                    )
                }
                placeholder="2"
                className="
                  min-h-11
                  w-full
                  rounded-xl
                  border
                  border-neutral-200
                  px-3
                  outline-none
                  focus:border-neutral-400
                "
              />

            </label>


            <label
              className="space-y-2"
            >

              <span
                className="
                  text-sm
                  font-medium
                  text-neutral-700
                "
              >
                Ngày có thể vào ở
              </span>


              <input
                type="date"
                value={
                  form.available_from
                }
                onChange={
                  (
                    event
                  ) =>
                    updateField(
                      "available_from",
                      event.target.value
                    )
                }
                className="
                  min-h-11
                  w-full
                  rounded-xl
                  border
                  border-neutral-200
                  px-3
                  outline-none
                  focus:border-neutral-400
                "
              />

            </label>


            <label
              className="space-y-2"
            >

              <span
                className="
                  text-sm
                  font-medium
                  text-neutral-700
                "
              >
                Tiền cọc (tháng)
              </span>


              <input
                type="number"
                min="0"
                value={
                  form.deposit_months
                }
                onChange={
                  (
                    event
                  ) =>
                    updateField(
                      "deposit_months",
                      event.target.value
                    )
                }
                className="
                  min-h-11
                  w-full
                  rounded-xl
                  border
                  border-neutral-200
                  px-3
                "
              />

            </label>


            <label
              className="space-y-2"
            >

              <span
                className="
                  text-sm
                  font-medium
                  text-neutral-700
                "
              >
                Phí giữ xe
              </span>


              <input
                type="number"
                min="0"
                value={
                  form.parking_fee
                }
                onChange={
                  (
                    event
                  ) =>
                    updateField(
                      "parking_fee",
                      event.target.value
                    )
                }
                className="
                  min-h-11
                  w-full
                  rounded-xl
                  border
                  border-neutral-200
                  px-3
                "
              />

            </label>


            <label
              className="space-y-2"
            >

              <span
                className="
                  text-sm
                  font-medium
                  text-neutral-700
                "
              >
                Phí Wifi
              </span>


              <input
                type="number"
                min="0"
                value={
                  form.wifi_fee
                }
                onChange={
                  (
                    event
                  ) =>
                    updateField(
                      "wifi_fee",
                      event.target.value
                    )
                }
                className="
                  min-h-11
                  w-full
                  rounded-xl
                  border
                  border-neutral-200
                  px-3
                "
              />

            </label>

          </div>

        </div>


        {/* ==========================
            TIỆN ÍCH
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

          <h2
            className="
              font-semibold
              text-neutral-900
            "
          >
            Tiện ích & nội thất
          </h2>


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
                  text-sm
                  font-medium
                  text-neutral-700
                "
              >
                Tiện ích
              </span>


              <textarea
                rows={3}
                value={
                  form.amenities
                }
                onChange={
                  (
                    event
                  ) =>
                    updateField(
                      "amenities",
                      event.target.value
                    )
                }
                placeholder=
                  "Wifi, Camera an ninh, Toilet riêng, Khu vực để xe"
                className="
                  w-full
                  rounded-xl
                  border
                  border-neutral-200
                  p-3
                  outline-none
                  focus:border-neutral-400
                "
              />


              <p
                className="
                  text-xs
                  text-neutral-400
                "
              >
                Mỗi mục cách nhau bằng dấu phẩy.
              </p>

            </label>


            <label
              className="space-y-2"
            >

              <span
                className="
                  text-sm
                  font-medium
                  text-neutral-700
                "
              >
                Nội thất
              </span>


              <textarea
                rows={3}
                value={
                  form.furniture
                }
                onChange={
                  (
                    event
                  ) =>
                    updateField(
                      "furniture",
                      event.target.value
                    )
                }
                placeholder=
                  "Máy lạnh, Giường, Tủ quần áo, Bàn làm việc"
                className="
                  w-full
                  rounded-xl
                  border
                  border-neutral-200
                  p-3
                  outline-none
                  focus:border-neutral-400
                "
              />

            </label>

          </div>

        </div>


        {/* ==========================
            HÌNH ẢNH PHÒNG
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

            <div>

              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >

                <Images
                  size={18}
                />


                <h2
                  className="
                    font-semibold
                    text-neutral-900
                  "
                >
                  Hình ảnh phòng
                </h2>

              </div>


              <p
                className="
                  mt-2
                  text-sm
                  leading-6
                  text-neutral-500
                "
              >
                Ảnh đầu tiên sẽ được dùng làm
                ảnh đại diện trên website.
                Bạn có thể chọn một ảnh khác
                làm ảnh đại diện.
              </p>

            </div>


            <div
              className="
                rounded-full
                bg-neutral-100
                px-3
                py-1.5
                text-xs
                font-medium
                text-neutral-600
              "
            >
              {images.length}
              {" / "}
              {MAX_ROOM_IMAGES} ảnh
            </div>

          </div>


          {imageError && (

            <div
              className="
                mt-4
                rounded-xl
                border
                border-red-200
                bg-red-50
                p-3
                text-sm
                text-red-700
              "
            >
              {imageError}
            </div>

          )}


          {images.length > 0 ? (

            <div
              className="
                mt-5
                grid
                gap-4
                sm:grid-cols-2
                lg:grid-cols-3
              "
            >

              {images.map(
                (
                  image,
                  index
                ) => {

                  const isCover =
                    index === 0;


                  return (

                    <div
                      key={
                        image.id
                      }
                      className="
                        overflow-hidden
                        rounded-2xl
                        border
                        border-neutral-200
                        bg-neutral-50
                      "
                    >

                      <div
                        className="
                          relative
                          aspect-[4/3]
                          overflow-hidden
                          bg-neutral-100
                        "
                      >

                        <img
                          src={
                            image.url
                          }
                          alt={
                            `Ảnh ${index + 1} phòng ${roomCode}`
                          }
                          className="
                            h-full
                            w-full
                            object-cover
                          "
                        />


                        <div
                          className="
                            absolute
                            left-3
                            top-3
                          "
                        >

                          <span
                            className={`
                              rounded-full
                              px-3
                              py-1.5
                              text-xs
                              font-semibold
                              shadow-sm
                              ${
                                isCover
                                  ? `
                                    bg-neutral-900
                                    text-white
                                  `
                                  : `
                                    bg-white/95
                                    text-neutral-700
                                  `
                              }
                            `}
                          >

                            {
                              isCover
                                ? "Ảnh đại diện"
                                : `Ảnh ${index + 1}`
                            }

                          </span>

                        </div>


                        <button
                          type="button"
                          disabled={
                            deletingImageId
                            === image.id
                            ||
                            settingCoverId
                            !== null
                          }
                          onClick={
                            () =>
                              void handleDeleteImage(
                                image
                              )
                          }
                          className="
                            absolute
                            right-3
                            top-3
                            flex
                            h-9
                            w-9
                            items-center
                            justify-center
                            rounded-full
                            bg-white/95
                            text-red-600
                            shadow-sm
                            transition
                            hover:bg-red-50
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                          "
                          aria-label="Xóa ảnh"
                        >

                          {
                            deletingImageId
                            === image.id
                              ? (
                                <LoaderCircle
                                  size={16}
                                  className="animate-spin"
                                />
                              )
                              : (
                                <Trash2
                                  size={16}
                                />
                              )
                          }

                        </button>


                        {!isCover && (

                          <button
                            type="button"
                            disabled={
                              settingCoverId
                              !== null
                              ||
                              deletingImageId
                              !== null
                            }
                            onClick={
                              () =>
                                void handleSetCover(
                                  image
                                )
                            }
                            className="
                              absolute
                              bottom-3
                              left-3
                              rounded-xl
                              bg-white/95
                              px-3
                              py-2
                              text-xs
                              font-semibold
                              text-neutral-800
                              shadow-sm
                              transition
                              hover:bg-white
                              disabled:cursor-not-allowed
                              disabled:opacity-60
                            "
                          >

                            {
                              settingCoverId
                              === image.id
                                ? (
                                  <span
                                    className="
                                      inline-flex
                                      items-center
                                      gap-2
                                    "
                                  >

                                    <LoaderCircle
                                      size={14}
                                      className="animate-spin"
                                    />

                                    Đang chọn...

                                  </span>
                                )
                                : "Đặt làm ảnh đại diện"
                            }

                          </button>

                        )}

                      </div>


                      <div
                        className="
                          p-3
                        "
                      >

                        <p
                          className="
                            truncate
                            text-xs
                            text-neutral-500
                          "
                        >
                          {
                            image.original_name
                            ?? "Ảnh phòng"
                          }
                        </p>

                      </div>

                    </div>

                  );

                }
              )}

            </div>

          ) : (

            <div
              className="
                mt-5
                flex
                min-h-40
                flex-col
                items-center
                justify-center
                rounded-2xl
                border
                border-dashed
                border-neutral-300
                bg-neutral-50
                p-6
                text-center
              "
            >

              <Images
                size={30}
                className="
                  text-neutral-300
                "
              />


              <p
                className="
                  mt-3
                  font-medium
                  text-neutral-700
                "
              >
                Chưa có ảnh phòng
              </p>


              <p
                className="
                  mt-1
                  text-sm
                  text-neutral-400
                "
              >
                Thêm ảnh để hiển thị trên website.
              </p>

            </div>

          )}


          <div
            className="
              mt-5
              flex
              flex-col
              gap-3
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >

            <p
              className="
                text-xs
                leading-5
                text-neutral-400
              "
            >
              JPG, PNG hoặc WEBP.
              Tối đa 10 MB mỗi ảnh.
              Tối đa 10 ảnh mỗi phòng.
            </p>


            <label
              className={`
                inline-flex
                min-h-11
                items-center
                justify-center
                gap-2
                rounded-xl
                px-4
                text-sm
                font-medium
                ${
                  (
                    uploadingImages
                    ||
                    images.length
                    >= MAX_ROOM_IMAGES
                  )
                    ? `
                      cursor-not-allowed
                      bg-neutral-100
                      text-neutral-400
                    `
                    : `
                      cursor-pointer
                      bg-neutral-900
                      text-white
                      hover:bg-neutral-800
                    `
                }
              `}
            >

              {
                uploadingImages
                  ? (
                    <LoaderCircle
                      size={17}
                      className="animate-spin"
                    />
                  )
                  : (
                    <ImagePlus
                      size={17}
                    />
                  )
              }


              {
                uploadingImages
                  ? "Đang tải ảnh..."
                  : (
                    images.length
                    >= MAX_ROOM_IMAGES
                      ? "Đã đủ 10 ảnh"
                      : "Thêm ảnh"
                  )
              }


              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                disabled={
                  uploadingImages
                  ||
                  images.length
                  >= MAX_ROOM_IMAGES
                }
                onChange={
                  handleImageUpload
                }
                className="hidden"
              />

            </label>

          </div>

        </div>


        {/* ==========================
            ACTION
        ========================== */}

        <div
          className="
            flex
            flex-col
            gap-3
            sm:flex-row
            sm:justify-end
          "
        >

          <button
            type="button"
            onClick={
              () =>
                navigate(
                  "/website/rooms"
                )
            }
            className="
              min-h-11
              rounded-xl
              border
              border-neutral-200
              bg-white
              px-5
              text-sm
              font-medium
              text-neutral-700
            "
          >
            Hủy
          </button>


          <button
            type="submit"
            disabled={
              saving
            }
            className="
              inline-flex
              min-h-11
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-neutral-900
              px-5
              text-sm
              font-medium
              text-white
              disabled:opacity-50
            "
          >

            {
              saving
                ? (
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                )
                : (
                  <Save
                    size={17}
                  />
                )
            }

            {
              saving
                ? "Đang lưu..."
                : "Lưu thay đổi"
            }

          </button>

        </div>

      </form>

    </div>

  );

}


export default WebsiteRoomEdit;