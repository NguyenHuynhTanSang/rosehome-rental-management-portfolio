import {
  type FormEvent,
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  CircleHelp,
  Eye,
  EyeOff,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {
  Link,
} from "react-router";

import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
} from "../api/api.ts";


type WebsiteFaq = {
  id: number;
  question: string;
  answer: string;
  sort_order: number;
  is_visible: boolean;
};


type FaqPayload = {
  question: string;
  answer: string;
  is_visible: boolean;
};


type FormState = {
  question: string;
  answer: string;
  is_visible: boolean;
};


const initialForm: FormState = {
  question: "",
  answer: "",
  is_visible: true,
};


function WebsiteFaqs() {

  const [
    faqs,
    setFaqs,
  ] = useState<WebsiteFaq[]>(
    []
  );


  const [
    form,
    setForm,
  ] = useState<FormState>(
    initialForm
  );


  const [
    editingFaqId,
    setEditingFaqId,
  ] = useState<
    number
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
    saving,
    setSaving,
  ] = useState(
    false
  );


  const [
    deletingFaqId,
    setDeletingFaqId,
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
    success,
    setSuccess,
  ] = useState<
    string
    | null
  >(
    null
  );


  async function loadFaqs() {

    try {

      setLoading(
        true
      );

      setError(
        null
      );


      const data =
        await apiGet<
          WebsiteFaq[]
        >(
          "/website-faqs"
        );


      setFaqs(
        data
      );

    } catch (
      err
    ) {

      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách FAQ."
      );

    } finally {

      setLoading(
        false
      );

    }

  }


  useEffect(
    () => {

      void loadFaqs();

    },
    []
  );


  function resetForm() {

    setForm(
      initialForm
    );

    setEditingFaqId(
      null
    );

  }


  function handleEdit(
    faq: WebsiteFaq
  ) {

    setEditingFaqId(
      faq.id
    );


    setForm({
      question:
        faq.question,

      answer:
        faq.answer,

      is_visible:
        faq.is_visible,
    });


    setError(
      null
    );

    setSuccess(
      null
    );


    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

  }


  async function handleSubmit(
    event: FormEvent
  ) {

    event.preventDefault();


    const question =
      form.question.trim();

    const answer =
      form.answer.trim();


    if (
      !question
      ||
      !answer
    ) {

      setError(
        "Câu hỏi và câu trả lời không được để trống."
      );

      return;

    }


    const payload:
      FaqPayload = {

      question,
      answer,

      is_visible:
        form.is_visible,
    };


    try {

      setSaving(
        true
      );

      setError(
        null
      );

      setSuccess(
        null
      );


      if (
        editingFaqId
        !== null
      ) {

        await apiPut<
          WebsiteFaq,
          FaqPayload
        >(
          `/website-faqs/${editingFaqId}`,
          payload
        );


        setSuccess(
          "Đã cập nhật FAQ thành công."
        );

      } else {

        await apiPost<
          WebsiteFaq,
          FaqPayload
        >(
          "/website-faqs",
          payload
        );


        setSuccess(
          "Đã thêm FAQ mới."
        );

      }


      resetForm();

      await loadFaqs();

    } catch (
      err
    ) {

      setError(
        err instanceof Error
          ? err.message
          : "Không thể lưu FAQ."
      );

    } finally {

      setSaving(
        false
      );

    }

  }


  async function handleToggleVisibility(
    faq: WebsiteFaq
  ) {

    try {

      setError(
        null
      );

      setSuccess(
        null
      );


      await apiPut<
        WebsiteFaq,
        FaqPayload
      >(
        `/website-faqs/${faq.id}`,
        {
          question:
            faq.question,

          answer:
            faq.answer,

          is_visible:
            !faq.is_visible,
        }
      );


      await loadFaqs();

    } catch (
      err
    ) {

      setError(
        err instanceof Error
          ? err.message
          : "Không thể thay đổi trạng thái FAQ."
      );

    }

  }


  async function handleDelete(
    faq: WebsiteFaq
  ) {

    const confirmed =
      window.confirm(
        `Bạn có chắc muốn xóa FAQ "${faq.question}"?`
      );


    if (!confirmed) {

      return;

    }


    try {

      setDeletingFaqId(
        faq.id
      );

      setError(
        null
      );

      setSuccess(
        null
      );


      await apiDelete<void>(
        `/website-faqs/${faq.id}`
      );


      if (
        editingFaqId
        === faq.id
      ) {

        resetForm();

      }


      setSuccess(
        "Đã xóa FAQ."
      );


      await loadFaqs();

    } catch (
      err
    ) {

      setError(
        err instanceof Error
          ? err.message
          : "Không thể xóa FAQ."
      );

    } finally {

      setDeletingFaqId(
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
          WEBSITE / FAQ
        </p>


        <h1
          className="
            mt-1
            text-2xl
            font-semibold
            text-neutral-900
          "
        >
          Câu hỏi thường gặp
        </h1>


        <p
          className="
            mt-2
            text-sm
            leading-6
            text-neutral-500
          "
        >
          Quản lý các câu hỏi và câu trả lời
          hiển thị trên website Rosehome.
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


      {/* ==========================
          ADD / EDIT
      ========================== */}

      <form
        onSubmit={
          handleSubmit
        }
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

          <div
            className="
              flex
              items-center
              gap-2
            "
          >

            {
              editingFaqId
              !== null
                ? (
                  <Pencil
                    size={18}
                  />
                )
                : (
                  <Plus
                    size={18}
                  />
                )
            }


            <h2
              className="
                font-semibold
                text-neutral-900
              "
            >
              {
                editingFaqId
                !== null
                  ? "Chỉnh sửa FAQ"
                  : "Thêm FAQ"
              }
            </h2>

          </div>


          {editingFaqId !== null && (

            <button
              type="button"
              onClick={
                resetForm
              }
              className="
                inline-flex
                items-center
                gap-2
                rounded-xl
                px-3
                py-2
                text-sm
                font-medium
                text-neutral-500
                hover:bg-neutral-100
                hover:text-neutral-900
              "
            >

              <X
                size={16}
              />

              Hủy sửa

            </button>

          )}

        </div>


        <div
          className="
            mt-5
            space-y-4
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
              Câu hỏi
            </span>


            <input
              type="text"
              maxLength={500}
              value={
                form.question
              }
              onChange={
                (
                  event
                ) =>
                  setForm(
                    (
                      previous
                    ) => ({
                      ...previous,

                      question:
                        event.target.value,
                    })
                  )
              }
              placeholder="Ví dụ: Có cần đặt cọc khi thuê phòng không?"
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
              Câu trả lời
            </span>


            <textarea
              rows={5}
              maxLength={5000}
              value={
                form.answer
              }
              onChange={
                (
                  event
                ) =>
                  setForm(
                    (
                      previous
                    ) => ({
                      ...previous,

                      answer:
                        event.target.value,
                    })
                  )
              }
              placeholder="Nhập câu trả lời..."
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


          <label
            className="
              flex
              items-center
              justify-between
              gap-4
              rounded-xl
              border
              border-neutral-200
              p-4
            "
          >

            <div>

              <p
                className="
                  text-sm
                  font-medium
                  text-neutral-800
                "
              >
                Hiển thị trên website
              </p>


              <p
                className="
                  mt-1
                  text-xs
                  text-neutral-500
                "
              >
                Tắt nếu muốn tạm ẩn FAQ khỏi website.
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
                  setForm(
                    (
                      previous
                    ) => ({
                      ...previous,

                      is_visible:
                        event.target.checked,
                    })
                  )
              }
              className="
                h-5
                w-5
                accent-neutral-900
              "
            />

          </label>


          <div
            className="
              flex
              justify-end
            "
          >

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
                hover:bg-neutral-800
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
                  : (
                    editingFaqId
                    !== null
                      ? "Lưu thay đổi"
                      : "Thêm FAQ"
                  )
              }

            </button>

          </div>

        </div>

      </form>


      {/* ==========================
          LIST
      ========================== */}

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
            justify-between
            gap-4
          "
        >

          <div
            className="
              flex
              items-center
              gap-2
            "
          >

            <CircleHelp
              size={18}
            />


            <h2
              className="
                font-semibold
                text-neutral-900
              "
            >
              Danh sách FAQ
            </h2>

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
            {faqs.length} FAQ
          </span>

        </div>


        {faqs.length === 0 ? (

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

            <CircleHelp
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
              Chưa có FAQ
            </p>


            <p
              className="
                mt-1
                text-sm
                text-neutral-400
              "
            >
              Thêm câu hỏi đầu tiên ở phía trên.
            </p>

          </div>

        ) : (

          <div
            className="
              mt-5
              space-y-3
            "
          >

            {faqs.map(
              (
                faq,
                index
              ) => (

                <div
                  key={
                    faq.id
                  }
                  className="
                    rounded-2xl
                    border
                    border-neutral-200
                    p-4
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
                        min-w-0
                        flex-1
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

                        <span
                          className="
                            rounded-full
                            bg-neutral-100
                            px-2.5
                            py-1
                            text-xs
                            font-medium
                            text-neutral-500
                          "
                        >
                          #{index + 1}
                        </span>


                        <span
                          className={`
                            inline-flex
                            items-center
                            gap-1.5
                            rounded-full
                            px-2.5
                            py-1
                            text-xs
                            font-medium
                            ${
                              faq.is_visible
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
                            faq.is_visible
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
                            faq.is_visible
                              ? "Đang hiển thị"
                              : "Đang ẩn"
                          }

                        </span>

                      </div>


                      <h3
                        className="
                          mt-3
                          font-semibold
                          text-neutral-900
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
                          text-neutral-500
                        "
                      >
                        {faq.answer}
                      </p>

                    </div>


                    <div
                      className="
                        flex
                        shrink-0
                        flex-wrap
                        gap-2
                      "
                    >

                      <button
                        type="button"
                        onClick={
                          () =>
                            void handleToggleVisibility(
                              faq
                            )
                        }
                        className="
                          inline-flex
                          h-9
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
                          text-neutral-600
                          hover:bg-neutral-50
                        "
                      >

                        {
                          faq.is_visible
                            ? (
                              <EyeOff
                                size={15}
                              />
                            )
                            : (
                              <Eye
                                size={15}
                              />
                            )
                        }


                        {
                          faq.is_visible
                            ? "Ẩn"
                            : "Hiện"
                        }

                      </button>


                      <button
                        type="button"
                        onClick={
                          () =>
                            handleEdit(
                              faq
                            )
                        }
                        className="
                          inline-flex
                          h-9
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
                          text-neutral-600
                          hover:bg-neutral-50
                        "
                      >

                        <Pencil
                          size={15}
                        />

                        Sửa

                      </button>


                      <button
                        type="button"
                        disabled={
                          deletingFaqId
                          === faq.id
                        }
                        onClick={
                          () =>
                            void handleDelete(
                              faq
                            )
                        }
                        className="
                          inline-flex
                          h-9
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
                          deletingFaqId
                          === faq.id
                            ? (
                              <LoaderCircle
                                size={15}
                                className="animate-spin"
                              />
                            )
                            : (
                              <Trash2
                                size={15}
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

        )}

      </section>

    </div>

  );

}


export default WebsiteFaqs;