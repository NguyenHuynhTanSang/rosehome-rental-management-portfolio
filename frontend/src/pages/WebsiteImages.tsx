import {
  type ChangeEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  Eye,
  EyeOff,
  ImagePlus,
  Images,
  LoaderCircle,
  Trash2,
} from "lucide-react";

import {
  Link,
} from "react-router";

import {
  apiDelete,
  apiGet,
  apiPatchNoBody,
  apiPostFormData,
} from "../api/api.ts";


type WebsiteImage = {
  id: number;
  image_type: "HERO" | "GALLERY";
  file_key: string;
  original_name: string | null;
  content_type: string | null;
  alt_text: string | null;
  sort_order: number;
  is_active: boolean;
  url: string;
};


const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];


const MAX_IMAGE_BYTES =
  10
  * 1024
  * 1024;


const MAX_GALLERY_IMAGES = 20;


function WebsiteImages() {

  const [
    images,
    setImages,
  ] = useState<WebsiteImage[]>(
    []
  );


  const [
    loading,
    setLoading,
  ] = useState(
    true
  );


  const [
    uploadingHero,
    setUploadingHero,
  ] = useState(
    false
  );


  const [
    uploadingGallery,
    setUploadingGallery,
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
    togglingImageId,
    setTogglingImageId,
  ] = useState<
    number
    | null
  >(
    null
  );


  const [
    heroAltText,
    setHeroAltText,
  ] = useState(
    ""
  );


  const [
    galleryAltText,
    setGalleryAltText,
  ] = useState(
    ""
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
  ] = useState<
    string
    | null
  >(
    null
  );


  const heroImages =
    useMemo(
      () =>
        images
          .filter(
            (
              image
            ) =>
              image.image_type === "HERO"
          )
          .sort(
            (
              a,
              b
            ) =>
              Number(b.is_active)
              - Number(a.is_active)
              ||
              b.id
              - a.id
          ),
      [
        images,
      ]
    );


  const galleryImages =
    useMemo(
      () =>
        images
          .filter(
            (
              image
            ) =>
              image.image_type === "GALLERY"
          )
          .sort(
            (
              a,
              b
            ) =>
              a.sort_order
              - b.sort_order
              ||
              a.id
              - b.id
          ),
      [
        images,
      ]
    );


  const activeHero =
    heroImages.find(
      (
        image
      ) =>
        image.is_active
    )
    ?? null;


  async function loadImages() {

    try {

      setLoading(
        true
      );

      setError(
        null
      );


      const data =
        await apiGet<
          WebsiteImage[]
        >(
          "/website-images"
        );


      setImages(
        data
      );

    } catch (
      err
    ) {

      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải hình ảnh website."
      );

    } finally {

      setLoading(
        false
      );

    }

  }


  useEffect(
    () => {

      void loadImages();

    },
    []
  );


  function validateFiles(
    files: File[]
  ): string | null {

    const invalidType =
      files.find(
        (
          file
        ) =>
          !ALLOWED_IMAGE_TYPES.includes(
            file.type
          )
      );


    if (invalidType) {

      return (
        "Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP."
      );

    }


    const oversized =
      files.find(
        (
          file
        ) =>
          file.size
          > MAX_IMAGE_BYTES
      );


    if (oversized) {

      return (
        "Mỗi ảnh phải nhỏ hơn hoặc bằng 10 MB."
      );

    }


    return null;
  }


  async function handleHeroUpload(
    event:
      ChangeEvent<HTMLInputElement>
  ) {

    const input =
      event.currentTarget;


    const file =
      input.files?.[0];


    if (!file) {

      return;

    }


    const validationError =
      validateFiles(
        [
          file,
        ]
      );


    if (validationError) {

      setError(
        validationError
      );

      input.value =
        "";

      return;

    }


    try {

      setUploadingHero(
        true
      );

      setError(
        null
      );

      setSuccess(
        null
      );


      const formData =
        new FormData();


      formData.append(
        "file",
        file
      );


      const altText =
        heroAltText.trim();


      if (altText) {

        formData.append(
          "alt_text",
          altText
        );

      }


      await apiPostFormData<
        WebsiteImage
      >(
        "/website-images/hero",
        formData
      );


      setHeroAltText(
        ""
      );


      setSuccess(
        "Đã cập nhật ảnh Hero."
      );


      await loadImages();

    } catch (
      err
    ) {

      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải ảnh Hero lên."
      );

    } finally {

      setUploadingHero(
        false
      );

      input.value =
        "";

    }

  }


  async function handleGalleryUpload(
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
      files.length === 0
    ) {

      return;

    }


    const remainingSlots =
      MAX_GALLERY_IMAGES
      - galleryImages.length;


    if (
      remainingSlots <= 0
    ) {

      setError(
        "Thư viện đã có tối đa 20 ảnh."
      );

      input.value =
        "";

      return;

    }


    if (
      files.length
      > remainingSlots
    ) {

      setError(
        `Chỉ có thể thêm ${remainingSlots} ảnh nữa.`
      );

      input.value =
        "";

      return;

    }


    const validationError =
      validateFiles(
        files
      );


    if (validationError) {

      setError(
        validationError
      );

      input.value =
        "";

      return;

    }


    try {

      setUploadingGallery(
        true
      );

      setError(
        null
      );

      setSuccess(
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


        const altText =
          galleryAltText.trim();


        if (altText) {

          formData.append(
            "alt_text",
            altText
          );

        }


        await apiPostFormData<
          WebsiteImage
        >(
          "/website-images/gallery",
          formData
        );

      }


      setGalleryAltText(
        ""
      );


      setSuccess(
        files.length === 1
          ? "Đã thêm ảnh vào thư viện."
          : `Đã thêm ${files.length} ảnh vào thư viện.`
      );


      await loadImages();

    } catch (
      err
    ) {

      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải ảnh thư viện lên."
      );

    } finally {

      setUploadingGallery(
        false
      );

      input.value =
        "";

    }

  }


  async function handleToggleActive(
    image: WebsiteImage
  ) {

    try {

      setTogglingImageId(
        image.id
      );

      setError(
        null
      );

      setSuccess(
        null
      );


      await apiPatchNoBody<
        WebsiteImage
      >(
        `/website-images/${image.id}/active`
      );


      setSuccess(
        image.is_active
          ? "Đã ẩn ảnh khỏi website."
          : "Đã hiển thị ảnh trên website."
      );


      await loadImages();

    } catch (
      err
    ) {

      setError(
        err instanceof Error
          ? err.message
          : "Không thể thay đổi trạng thái ảnh."
      );

    } finally {

      setTogglingImageId(
        null
      );

    }

  }


  async function handleDelete(
    image: WebsiteImage
  ) {

    const confirmed =
      window.confirm(
        image.image_type === "HERO"
          ? (
            "Bạn có chắc muốn xóa ảnh Hero này? "
            + "Ảnh sẽ bị xóa khỏi cả R2 và database."
          )
          : (
            "Bạn có chắc muốn xóa ảnh này khỏi thư viện? "
            + "Ảnh sẽ bị xóa khỏi cả R2 và database."
          )
      );


    if (!confirmed) {

      return;

    }


    try {

      setDeletingImageId(
        image.id
      );

      setError(
        null
      );

      setSuccess(
        null
      );


      await apiDelete<void>(
        `/website-images/${image.id}`
      );


      setSuccess(
        "Đã xóa ảnh."
      );


      await loadImages();

    } catch (
      err
    ) {

      setError(
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
        max-w-6xl
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
          WEBSITE / HÌNH ẢNH
        </p>


        <h1
          className="
            mt-1
            text-2xl
            font-semibold
            text-neutral-900
          "
        >
          Hình ảnh website
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
          Quản lý ảnh Hero đầu trang và thư viện
          hình ảnh chung của Rosehome. Ảnh được lưu
          trên Cloudflare R2.
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
          {success}
        </div>

      )}


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
            flex-col
            gap-4
            md:flex-row
            md:items-start
            md:justify-between
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
                Ảnh Hero
              </h2>

            </div>


            <p
              className="
                mt-2
                max-w-2xl
                text-sm
                leading-6
                text-neutral-500
              "
            >
              Ảnh lớn dùng ở phần đầu trang public.
              Upload ảnh mới sẽ tự đặt ảnh mới làm
              Hero đang hoạt động.
            </p>

          </div>


          <span
            className={`
              rounded-full
              px-3
              py-1.5
              text-xs
              font-medium
              ${
                activeHero
                  ? `
                    bg-emerald-50
                    text-emerald-700
                  `
                  : `
                    bg-neutral-100
                    text-neutral-500
                  `
              }
            `}
          >
            {
              activeHero
                ? "Đã có Hero"
                : "Chưa có Hero"
            }
          </span>

        </div>


        {activeHero ? (

          <div
            className="
              mt-5
              overflow-hidden
              rounded-2xl
              border
              border-neutral-200
            "
          >

            <div
              className="
                relative
                aspect-[16/7]
                bg-neutral-100
              "
            >

              <img
                src={
                  activeHero.url
                }
                alt={
                  activeHero.alt_text
                  ?? "Ảnh Hero Rosehome"
                }
                className="
                  h-full
                  w-full
                  object-cover
                "
              />


              <span
                className="
                  absolute
                  left-4
                  top-4
                  rounded-full
                  bg-neutral-900
                  px-3
                  py-1.5
                  text-xs
                  font-semibold
                  text-white
                "
              >
                Hero đang dùng
              </span>

            </div>


            <div
              className="
                flex
                flex-col
                gap-3
                p-4
                sm:flex-row
                sm:items-center
                sm:justify-between
              "
            >

              <div
                className="
                  min-w-0
                "
              >

                <p
                  className="
                    truncate
                    text-sm
                    font-medium
                    text-neutral-800
                  "
                >
                  {
                    activeHero.original_name
                    ?? "Ảnh Hero"
                  }
                </p>


                <p
                  className="
                    mt-1
                    text-xs
                    text-neutral-500
                  "
                >
                  {
                    activeHero.alt_text
                    ?? "Chưa có mô tả ảnh"
                  }
                </p>

              </div>


              <button
                type="button"
                disabled={
                  deletingImageId
                  === activeHero.id
                }
                onClick={
                  () =>
                    void handleDelete(
                      activeHero
                    )
                }
                className="
                  inline-flex
                  min-h-10
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-red-200
                  px-3
                  text-sm
                  font-medium
                  text-red-600
                  hover:bg-red-50
                  disabled:opacity-50
                "
              >

                {
                  deletingImageId
                  === activeHero.id
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

                Xóa

              </button>

            </div>

          </div>

        ) : (

          <div
            className="
              mt-5
              flex
              min-h-52
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

            <ImagePlus
              size={32}
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
              Chưa có ảnh Hero
            </p>


            <p
              className="
                mt-1
                text-sm
                text-neutral-400
              "
            >
              Thêm một ảnh để sử dụng ở đầu trang.
            </p>

          </div>

        )}


        <div
          className="
            mt-5
            grid
            gap-3
            sm:grid-cols-[1fr_auto]
            sm:items-end
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
              Mô tả ảnh (không bắt buộc)
            </span>


            <input
              type="text"
              maxLength={255}
              value={
                heroAltText
              }
              onChange={
                (
                  event
                ) =>
                  setHeroAltText(
                    event.target.value
                  )
              }
              placeholder="Ví dụ: Mặt tiền Rosehome Apartment"
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
                uploadingHero
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
              uploadingHero
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
              uploadingHero
                ? "Đang tải..."
                : (
                  activeHero
                    ? "Thay ảnh Hero"
                    : "Thêm ảnh Hero"
                )
            }


            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={
                uploadingHero
              }
              onChange={
                handleHeroUpload
              }
              className="hidden"
            />

          </label>

        </div>

      </section>


      {heroImages.length > 1 && (

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
            Hero đã tải trước đây
          </h2>


          <p
            className="
              mt-1
              text-sm
              text-neutral-500
            "
          >
            Có thể chọn lại ảnh cũ hoặc xóa nếu
            không còn sử dụng.
          </p>


          <div
            className="
              mt-5
              grid
              gap-4
              sm:grid-cols-2
              lg:grid-cols-3
            "
          >

            {heroImages
              .filter(
                (
                  image
                ) =>
                  !image.is_active
              )
              .map(
                (
                  image
                ) => (

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

                    <img
                      src={
                        image.url
                      }
                      alt={
                        image.alt_text
                        ?? "Ảnh Hero cũ"
                      }
                      loading="lazy"
                      className="
                        aspect-[16/9]
                        w-full
                        object-cover
                      "
                    />


                    <div
                      className="
                        space-y-3
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
                          ?? "Ảnh Hero"
                        }
                      </p>


                      <div
                        className="
                          grid
                          grid-cols-2
                          gap-2
                        "
                      >

                        <button
                          type="button"
                          disabled={
                            togglingImageId
                            === image.id
                          }
                          onClick={
                            () =>
                              void handleToggleActive(
                                image
                              )
                          }
                          className="
                            inline-flex
                            min-h-9
                            items-center
                            justify-center
                            gap-2
                            rounded-xl
                            border
                            border-neutral-200
                            bg-white
                            px-3
                            text-xs
                            font-medium
                            text-neutral-700
                            hover:bg-neutral-100
                            disabled:opacity-50
                          "
                        >

                          {
                            togglingImageId
                            === image.id
                              ? (
                                <LoaderCircle
                                  size={14}
                                  className="animate-spin"
                                />
                              )
                              : (
                                <Eye
                                  size={14}
                                />
                              )
                          }

                          Dùng lại

                        </button>


                        <button
                          type="button"
                          disabled={
                            deletingImageId
                            === image.id
                          }
                          onClick={
                            () =>
                              void handleDelete(
                                image
                              )
                          }
                          className="
                            inline-flex
                            min-h-9
                            items-center
                            justify-center
                            gap-2
                            rounded-xl
                            border
                            border-red-200
                            bg-white
                            px-3
                            text-xs
                            font-medium
                            text-red-600
                            hover:bg-red-50
                            disabled:opacity-50
                          "
                        >

                          {
                            deletingImageId
                            === image.id
                              ? (
                                <LoaderCircle
                                  size={14}
                                  className="animate-spin"
                                />
                              )
                              : (
                                <Trash2
                                  size={14}
                                />
                              )
                          }

                          Xóa

                        </button>

                      </div>

                    </div>

                  </div>

                )
              )}

          </div>

        </section>

      )}


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
                Thư viện Rosehome
              </h2>

            </div>


            <p
              className="
                mt-2
                max-w-2xl
                text-sm
                leading-6
                text-neutral-500
              "
            >
              Dùng cho ảnh mặt tiền, hành lang,
              bãi xe hoặc các khu vực chung.
            </p>

          </div>


          <span
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
            {galleryImages.length}
            {" / "}
            {MAX_GALLERY_IMAGES} ảnh
          </span>

        </div>


        {galleryImages.length > 0 ? (

          <div
            className="
              mt-5
              grid
              gap-4
              sm:grid-cols-2
              lg:grid-cols-3
            "
          >

            {galleryImages.map(
              (
                image,
                index
              ) => (

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
                        image.alt_text
                        ?? `Ảnh Rosehome ${index + 1}`
                      }
                      loading="lazy"
                      className="
                        h-full
                        w-full
                        object-cover
                      "
                    />


                    <span
                      className={`
                        absolute
                        left-3
                        top-3
                        inline-flex
                        items-center
                        gap-1.5
                        rounded-full
                        px-2.5
                        py-1
                        text-xs
                        font-semibold
                        shadow-sm
                        ${
                          image.is_active
                            ? `
                              bg-emerald-50
                              text-emerald-700
                            `
                            : `
                              bg-neutral-900
                              text-white
                            `
                        }
                      `}
                    >

                      {
                        image.is_active
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
                        image.is_active
                          ? "Đang hiện"
                          : "Đang ẩn"
                      }

                    </span>

                  </div>


                  <div
                    className="
                      space-y-3
                      p-3
                    "
                  >

                    <div>

                      <p
                        className="
                          truncate
                          text-xs
                          text-neutral-500
                        "
                      >
                        {
                          image.original_name
                          ?? "Ảnh Rosehome"
                        }
                      </p>


                      {image.alt_text && (

                        <p
                          className="
                            mt-1
                            truncate
                            text-xs
                            text-neutral-400
                          "
                        >
                          {image.alt_text}
                        </p>

                      )}

                    </div>


                    <div
                      className="
                        grid
                        grid-cols-2
                        gap-2
                      "
                    >

                      <button
                        type="button"
                        disabled={
                          togglingImageId
                          === image.id
                        }
                        onClick={
                          () =>
                            void handleToggleActive(
                              image
                            )
                        }
                        className="
                          inline-flex
                          min-h-9
                          items-center
                          justify-center
                          gap-2
                          rounded-xl
                          border
                          border-neutral-200
                          bg-white
                          px-3
                          text-xs
                          font-medium
                          text-neutral-700
                          hover:bg-neutral-100
                          disabled:opacity-50
                        "
                      >

                        {
                          togglingImageId
                          === image.id
                            ? (
                              <LoaderCircle
                                size={14}
                                className="animate-spin"
                              />
                            )
                            : (
                              image.is_active
                                ? (
                                  <EyeOff
                                    size={14}
                                  />
                                )
                                : (
                                  <Eye
                                    size={14}
                                  />
                                )
                            )
                        }


                        {
                          image.is_active
                            ? "Ẩn"
                            : "Hiện"
                        }

                      </button>


                      <button
                        type="button"
                        disabled={
                          deletingImageId
                          === image.id
                        }
                        onClick={
                          () =>
                            void handleDelete(
                              image
                            )
                        }
                        className="
                          inline-flex
                          min-h-9
                          items-center
                          justify-center
                          gap-2
                          rounded-xl
                          border
                          border-red-200
                          bg-white
                          px-3
                          text-xs
                          font-medium
                          text-red-600
                          hover:bg-red-50
                          disabled:opacity-50
                        "
                      >

                        {
                          deletingImageId
                          === image.id
                            ? (
                              <LoaderCircle
                                size={14}
                                className="animate-spin"
                              />
                            )
                            : (
                              <Trash2
                                size={14}
                              />
                            )
                        }

                        Xóa

                      </button>

                    </div>

                  </div>

                </div>

              )
            )}

          </div>

        ) : (

          <div
            className="
              mt-5
              flex
              min-h-44
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
              Chưa có ảnh thư viện
            </p>


            <p
              className="
                mt-1
                text-sm
                text-neutral-400
              "
            >
              Thêm hình ảnh khu vực chung của Rosehome.
            </p>

          </div>

        )}


        <div
          className="
            mt-5
            grid
            gap-3
            sm:grid-cols-[1fr_auto]
            sm:items-end
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
              Mô tả ảnh (không bắt buộc)
            </span>


            <input
              type="text"
              maxLength={255}
              value={
                galleryAltText
              }
              onChange={
                (
                  event
                ) =>
                  setGalleryAltText(
                    event.target.value
                  )
              }
              placeholder="Ví dụ: Khu vực để xe Rosehome"
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
                  uploadingGallery
                  ||
                  galleryImages.length
                  >= MAX_GALLERY_IMAGES
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
              uploadingGallery
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
              uploadingGallery
                ? "Đang tải..."
                : (
                  galleryImages.length
                  >= MAX_GALLERY_IMAGES
                    ? "Đã đủ 20 ảnh"
                    : "Thêm ảnh"
                )
            }


            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              disabled={
                uploadingGallery
                ||
                galleryImages.length
                >= MAX_GALLERY_IMAGES
              }
              onChange={
                handleGalleryUpload
              }
              className="hidden"
            />

          </label>

        </div>


        <p
          className="
            mt-3
            text-xs
            text-neutral-400
          "
        >
          JPG, PNG hoặc WEBP. Tối đa 10 MB mỗi ảnh.
          Thư viện tối đa 20 ảnh.
        </p>

      </section>

    </div>

  );
}


export default WebsiteImages;
