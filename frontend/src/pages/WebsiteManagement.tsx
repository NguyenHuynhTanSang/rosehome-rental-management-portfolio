import {
  Building2,
  CircleHelp,
  Images,
  Settings2,
} from "lucide-react";

import {
  Link,
} from "react-router";


const sections = [

  {
    title:
      "Phòng đăng tin",

    description:
      "Quản lý phòng được hiển thị trên website, giá thuê, tiện ích và hình ảnh phòng.",

    icon:
      Building2,

    path:
      "/website/rooms",
  },

  {
    title:
      "Thông tin website",

    description:
      "Quản lý tên website, nội dung giới thiệu, số điện thoại, Zalo và địa chỉ.",

    icon:
      Settings2,

    path:
      "/website/settings",
  },

  {
    title:
      "FAQ",

    description:
      "Quản lý câu hỏi thường gặp, quy định và các điều kiện thuê phòng.",

    icon:
      CircleHelp,

    path:
      "/website/faq",
  },

  {
    title:
      "Hình ảnh",

    description:
      "Quản lý ảnh Hero, banner và thư viện hình ảnh chung của Rosehome.",

    icon:
      Images,

    path:
      "/website/images",
  },

];


function WebsiteManagement() {

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
          HEADER
      ========================== */}

      <div>

        <p
          className="
            text-sm
            font-medium
            text-neutral-500
          "
        >
          PUBLIC WEBSITE
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
          Quản lý website
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
          Quản lý các thông tin mà khách thuê
          có thể xem trên website Rosehome.
        </p>

      </div>


      {/* ==========================
          SECTIONS
      ========================== */}

      <div
        className="
          grid
          grid-cols-1
          gap-4
          lg:grid-cols-2
        "
      >

        {sections.map(
          (
            section
          ) => {

            const Icon =
              section.icon;


            const content = (

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
                    bg-neutral-100
                    text-neutral-700
                  "
                >

                  <Icon
                    size={21}
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
                      items-center
                      gap-2
                    "
                  >

                    <h2
                      className="
                        font-semibold
                        text-neutral-900
                      "
                    >
                      {section.title}
                    </h2>


                    {!section.path && (

                      <span
                        className="
                          rounded-full
                          bg-neutral-100
                          px-2
                          py-0.5
                          text-xs
                          font-medium
                          text-neutral-500
                        "
                      >
                        Sắp tới
                      </span>

                    )}

                  </div>


                  <p
                    className="
                      mt-1
                      text-sm
                      leading-6
                      text-neutral-500
                    "
                  >
                    {section.description}
                  </p>

                </div>

              </div>

            );


            if (
              section.path
            ) {

              return (

                <Link
                  key={
                    section.title
                  }
                  to={
                    section.path
                  }
                  className="
                    rounded-2xl
                    border
                    border-neutral-200
                    bg-white
                    p-5
                    transition
                    hover:border-neutral-300
                    hover:bg-neutral-50
                  "
                >
                  {content}
                </Link>

              );

            }


            return (

              <div
                key={
                  section.title
                }
                className="
                  cursor-default
                  rounded-2xl
                  border
                  border-neutral-200
                  bg-white
                  p-5
                  opacity-75
                "
              >
                {content}
              </div>

            );

          }
        )}

      </div>


      {/* ==========================
          NOTE
      ========================== */}

      <div
        className="
          rounded-2xl
          border
          border-dashed
          border-neutral-300
          bg-neutral-50
          p-5
        "
      >

        <p
          className="
            text-sm
            leading-6
            text-neutral-600
          "
        >
          Các thay đổi trong khu vực này sẽ
          được lưu vào backend và website
          public sẽ tự đọc dữ liệu mới.
        </p>

      </div>

    </div>

  );

}


export default WebsiteManagement;