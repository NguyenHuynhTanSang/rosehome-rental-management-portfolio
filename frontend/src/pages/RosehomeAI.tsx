import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import {
  Banknote,
  Bot,
  Building2,
  CalendarClock,
  Database,
  HandCoins,
  History,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  Zap,
  type LucideIcon,
} from "lucide-react";

import {
  apiDelete,
  apiGet,
  apiPost,
} from "../api/api";

import {
  Button,
} from "@/components/ui/button";

import ReactMarkdown
  from "react-markdown";

import remarkGfm
  from "remark-gfm";


// =========================================================
// TYPES
// =========================================================

type AIToolUsage = {
  name: string;

  description:
    string | null;
};


type AIChatRequest = {
  message: string;

  conversation_id:
    number | null;
};


type AIChatResponse = {
  answer: string;

  conversation_id: number;

  tools_used:
    AIToolUsage[];

  model:
    string | null;
};


type AIConversationSummary = {
  id: number;

  title: string;

  created_at: string;

  updated_at: string;
};


type AIMessageResponse = {
  id: number;

  role: string;

  content: string;

  tools_used:
    AIToolUsage[];

  model:
    string | null;

  created_at: string;
};


type AIConversationDetail = {
  id: number;

  title: string;

  created_at: string;

  updated_at: string;

  messages:
    AIMessageResponse[];
};


type ChatMessage = {
  id: string;

  role:
    "user"
    |
    "assistant";

  content: string;

  toolsUsed?:
    AIToolUsage[];

  model?:
    string | null;
};


type QuickPrompt = {
  label: string;

  prompt: string;

  icon: LucideIcon;
};


// =========================================================
// CONSTANTS
// =========================================================

const ACTIVE_CONVERSATION_KEY =
  "rosehome_ai_active_conversation";


const quickPrompts:
  QuickPrompt[] = [

    {
      label:
        "Tổng quan hệ thống",

      prompt:
        (
          "Tóm tắt tình hình Rosehome hiện tại: "
          +
          "tổng số phòng, phòng đang thuê và phòng trống."
        ),

      icon:
        Building2,
    },

    {
      label:
        "Việc cần xử lý",

      prompt:
        "Hôm nay Rosehome có gì cần tôi xử lý?",

      icon:
        History,
    },

    {
      label:
        "Xem công nợ",

      prompt:
        (
          "Hiện tại Rosehome còn bao nhiêu "
          +
          "công nợ và phòng nào còn nợ?"
        ),

      icon:
        HandCoins,
    },

    {
      label:
        "Doanh thu tháng này",

      prompt:
        (
          "Tháng này Rosehome đã thu thực tế "
          +
          "được bao nhiêu tiền?"
        ),

      icon:
        Banknote,
    },

    {
      label:
        "Hợp đồng sắp hết hạn",

      prompt:
        (
          "Có hợp đồng nào sẽ hết hạn "
          +
          "trong 30 ngày tới không?"
        ),

      icon:
        CalendarClock,
    },

    {
      label:
        "Chỉ số điện",

      prompt:
        (
          "Tháng này phòng nào chưa nhập "
          +
          "chỉ số điện?"
        ),

      icon:
        Zap,
    },

  ];


// =========================================================
// HELPERS
// =========================================================

function createMessageId() {

  return (
    `${Date.now()}-${Math.random()}`
  );

}


function getInitialMessages():
  ChatMessage[] {

  return [

    {
      id:
        "rosehome-ai-welcome",

      role:
        "assistant",

      content:
        (
          "Xin chào! Tôi là Rosehome AI. "
          +
          "Tôi có thể kiểm tra dữ liệu vận hành "
          +
          "như phòng trống, công nợ, doanh thu, "
          +
          "chỉ số điện và hợp đồng sắp hết hạn."
        ),

      toolsUsed:
        [],

      model:
        null,
    },

  ];

}


function mapStoredMessages(
  messages:
    AIMessageResponse[],
): ChatMessage[] {

  if (
    messages.length
    === 0
  ) {

    return getInitialMessages();

  }


  return messages
    .filter(
      (
        message
      ) => {

        const role =
          message.role
            .trim()
            .toUpperCase();


        return (
          role === "USER"
          ||
          role === "ASSISTANT"
        );

      }
    )
    .map(
      (
        message
      ) => {

        const role =
          message.role
            .trim()
            .toUpperCase();


        return {
          id:
            `db-${message.id}`,

          role:
            role === "USER"
              ? "user"
              : "assistant",

          content:
            message.content,

          toolsUsed:
            message.tools_used,

          model:
            message.model,
        };

      }
    );

}


function formatConversationTime(
  value: string,
) {

  const date = new Date(
    value
  );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }


  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      day:
        "2-digit",

      month:
        "2-digit",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    date
  );

}


// =========================================================
// PAGE
// =========================================================

function RosehomeAI() {

  const [
    input,
    setInput,
  ] = useState("");


  const [
    messages,
    setMessages,
  ] = useState<
    ChatMessage[]
  >(
    getInitialMessages
  );


  const [
    conversations,
    setConversations,
  ] = useState<
    AIConversationSummary[]
  >([]);


  const [
    activeConversationId,
    setActiveConversationId,
  ] = useState<
    number | null
  >(null);


  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  const [
    loadingConversations,
    setLoadingConversations,
  ] = useState(true);


  const [
    loadingConversation,
    setLoadingConversation,
  ] = useState(false);


  const [
    deletingConversationId,
    setDeletingConversationId,
  ] = useState<
    number | null
  >(null);


  const [
    historyOpen,
    setHistoryOpen,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const messagesEndRef =
    useRef<HTMLDivElement | null>(
      null
    );


  const mobileMessagesEndRef =
    useRef<HTMLDivElement | null>(
      null
    );


  // =======================================================
  // AUTO SCROLL
  // =======================================================

  useEffect(
    () => {

      messagesEndRef.current
        ?.scrollIntoView(
          {
            behavior:
              "smooth",
          }
        );


      mobileMessagesEndRef.current
        ?.scrollIntoView(
          {
            behavior:
              "smooth",
          }
        );

    },
    [
      messages,
      submitting,
      loadingConversation,
    ]
  );


  // =======================================================
  // INITIAL HISTORY LOAD
  // =======================================================

  useEffect(
    () => {

      void initializeHistory();

    },
    []
  );


  async function initializeHistory() {

    try {

      setLoadingConversations(
        true
      );

      setError("");


      const data =
        await apiGet<
          AIConversationSummary[]
        >(
          "/ai/conversations"
        );


      setConversations(
        data
      );


      const storedIdRaw =
        localStorage.getItem(
          ACTIVE_CONVERSATION_KEY
        );


      const storedId =
        storedIdRaw
          ? Number(
              storedIdRaw
            )
          : null;


      const storedConversation =
        storedId !== null
        &&
        Number.isInteger(
          storedId
        )

          ? data.find(
              (
                conversation
              ) =>
                conversation.id
                === storedId
            )

          : undefined;


      const conversationToOpen =
        storedConversation
        ??
        data[0];


      if (
        conversationToOpen
      ) {

        await loadConversation(
          conversationToOpen.id,
          false
        );

      }

    } catch (err) {

      console.error(
        err
      );


      if (
        err instanceof Error
      ) {

        setError(
          err.message
        );

      } else {

        setError(
          "Không thể tải lịch sử Rosehome AI."
        );

      }

    } finally {

      setLoadingConversations(
        false
      );

    }

  }


  async function refreshConversationList() {

    try {

      const data =
        await apiGet<
          AIConversationSummary[]
        >(
          "/ai/conversations"
        );


      setConversations(
        data
      );

    } catch (err) {

      console.error(
        err
      );

    }

  }


  // =======================================================
  // LOAD ONE CONVERSATION
  // =======================================================

  async function loadConversation(
    conversationId: number,
    closeHistory = true,
  ) {

    if (
      submitting
      ||
      deletingConversationId
      !== null
    ) {
      return;
    }


    try {

      setLoadingConversation(
        true
      );

      setError("");


      const detail =
        await apiGet<
          AIConversationDetail
        >(
          `/ai/conversations/${conversationId}`
        );


      setActiveConversationId(
        detail.id
      );

      setMessages(
        mapStoredMessages(
          detail.messages
        )
      );

      setInput("");


      localStorage.setItem(
        ACTIVE_CONVERSATION_KEY,
        String(
          detail.id
        )
      );


      if (
        closeHistory
      ) {
        setHistoryOpen(
          false
        );
      }

    } catch (err) {

      console.error(
        err
      );


      if (
        err instanceof Error
      ) {

        setError(
          err.message
        );

      } else {

        setError(
          "Không thể tải cuộc trò chuyện."
        );

      }

    } finally {

      setLoadingConversation(
        false
      );

    }

  }


  // =======================================================
  // NEW CHAT
  // =======================================================

  function handleNewChat() {

    if (
      submitting
      ||
      loadingConversation
    ) {
      return;
    }


    setActiveConversationId(
      null
    );

    setMessages(
      getInitialMessages()
    );

    setInput("");

    setError("");

    setHistoryOpen(
      false
    );


    localStorage.removeItem(
      ACTIVE_CONVERSATION_KEY
    );

  }


  // =======================================================
  // DELETE CHAT
  // =======================================================

  async function handleDeleteConversation(
    conversationId: number,
  ) {

    if (
      submitting
      ||
      deletingConversationId
      !== null
    ) {
      return;
    }


    const conversation =
      conversations.find(
        (
          item
        ) =>
          item.id
          === conversationId
      );


    const confirmed =
      window.confirm(
        conversation
          ? `Xóa cuộc trò chuyện "${conversation.title}"?`
          : "Xóa cuộc trò chuyện này?"
      );


    if (
      !confirmed
    ) {
      return;
    }


    try {

      setDeletingConversationId(
        conversationId
      );

      setError("");


      await apiDelete<void>(
        `/ai/conversations/${conversationId}`
      );


      const remaining =
        conversations.filter(
          (
            item
          ) =>
            item.id
            !== conversationId
        );


      setConversations(
        remaining
      );


      if (
        activeConversationId
        === conversationId
      ) {

        localStorage.removeItem(
          ACTIVE_CONVERSATION_KEY
        );


        const nextConversation =
          remaining[0];


        if (
          nextConversation
        ) {

          await loadConversation(
            nextConversation.id
          );

        } else {

          setActiveConversationId(
            null
          );

          setMessages(
            getInitialMessages()
          );

          setInput("");

        }

      }

    } catch (err) {

      console.error(
        err
      );


      if (
        err instanceof Error
      ) {

        setError(
          err.message
        );

      } else {

        setError(
          "Không thể xóa cuộc trò chuyện."
        );

      }

    } finally {

      setDeletingConversationId(
        null
      );

    }

  }


  // =======================================================
  // SEND MESSAGE
  // =======================================================

  async function sendMessage(
    overrideMessage?: string,
  ) {

    if (
      submitting
      ||
      loadingConversation
    ) {
      return;
    }


    const cleanMessage = (
      overrideMessage
      ??
      input
    ).trim();


    if (
      !cleanMessage
    ) {
      return;
    }


    const conversationIdBeforeSend =
      activeConversationId;


    const userMessage:
      ChatMessage = {

      id:
        createMessageId(),

      role:
        "user",

      content:
        cleanMessage,

    };


    setMessages(
      (
        current
      ) => [

        ...current,

        userMessage,

      ]
    );


    setInput("");

    setError("");

    setSubmitting(
      true
    );


    try {

      const response =
        await apiPost<
          AIChatResponse,
          AIChatRequest
        >(
          "/ai/chat",
          {
            message:
              cleanMessage,

            conversation_id:
              conversationIdBeforeSend,
          }
        );


      const assistantMessage:
        ChatMessage = {

        id:
          createMessageId(),

        role:
          "assistant",

        content:
          response.answer,

        toolsUsed:
          response.tools_used,

        model:
          response.model,

      };


      setMessages(
        (
          current
        ) => [

          ...current,

          assistantMessage,

        ]
      );


      if (
        conversationIdBeforeSend
        === null
      ) {

        setActiveConversationId(
          response.conversation_id
        );


        localStorage.setItem(
          ACTIVE_CONVERSATION_KEY,
          String(
            response.conversation_id
          )
        );

      }


      await refreshConversationList();

    } catch (err) {

      console.error(
        err
      );


      if (
        err instanceof Error
      ) {

        setError(
          err.message
        );

      } else {

        setError(
          "Không thể kết nối với Rosehome AI."
        );

      }

    } finally {

      setSubmitting(
        false
      );

    }

  }


  // =======================================================
  // FORM
  // =======================================================

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    void sendMessage();

  }


  // =======================================================
  // ENTER TO SEND
  // =======================================================

  function handleKeyDown(
    event:
      KeyboardEvent<HTMLTextAreaElement>
  ) {

    if (
      event.key
      === "Enter"
      &&
      !event.shiftKey
    ) {

      event.preventDefault();


      void sendMessage();

    }

  }


  // =======================================================
  // UI
  // =======================================================

  return (

    <div
      className="
        mx-auto
        w-full
        max-w-[1600px]
        space-y-6
      "
    >

      {/* =================================================
          MOBILE
      ================================================= */}

      <div
        className="
          space-y-4
          md:hidden
        "
      >

        {/* MOBILE PAGE HEADER */}

        <div
          className="
            flex
            items-start
            justify-between
            gap-3
          "
        >

          <div
            className="min-w-0"
          >

            <div
              className="
                flex
                items-center
                gap-2
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.16em]
                text-[#9a762f]
              "
            >

              <Sparkles
                size={13}
              />

              Rosehome Intelligence

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
              Rosehome AI
            </h1>


            <div
              className="
                mt-2
                flex
                flex-wrap
                items-center
                gap-2
              "
            >

              <span
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  rounded-full
                  border
                  border-emerald-200
                  bg-emerald-50
                  px-2.5
                  py-1
                  text-[11px]
                  font-medium
                  text-emerald-700
                "
              >

                <ShieldCheck
                  size={12}
                />

                Read-only

              </span>


              <span
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  rounded-full
                  border
                  border-[#ead9b7]
                  bg-[#fffaf0]
                  px-2.5
                  py-1
                  text-[11px]
                  font-medium
                  text-[#8a6726]
                "
              >

                <Database
                  size={12}
                />

                Dữ liệu Rosehome

              </span>

            </div>

          </div>


          <div
            className="
              flex
              shrink-0
              items-center
              gap-2
            "
          >

            <button
              type="button"
              onClick={
                () =>
                  setHistoryOpen(
                    true
                  )
              }
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                border
                border-[#ddd8ce]
                bg-white
                text-[#172033]
                shadow-sm
              "
              aria-label="Mở lịch sử chat"
            >

              <History
                size={17}
              />

            </button>


            <button
              type="button"
              disabled={
                submitting
                ||
                loadingConversation
              }
              onClick={
                handleNewChat
              }
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-[#122033]
                text-white
                shadow-sm
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
              aria-label="Chat mới"
            >

              <MessageSquarePlus
                size={17}
              />

            </button>

          </div>

        </div>


        {/* MOBILE QUICK PROMPTS */}

        <section>

          <div
            className="
              mb-2
              flex
              items-center
              justify-between
              gap-3
            "
          >

            <div>

              <div
                className="
                  text-sm
                  font-semibold
                  text-[#172033]
                "
              >
                Hỏi nhanh
              </div>


              <div
                className="
                  mt-0.5
                  text-xs
                  text-slate-500
                "
              >
                Chạm để AI kiểm tra dữ liệu
              </div>

            </div>


            <Bot
              size={17}
              className=
                "text-[#9a762f]"
            />

          </div>


          <div
            className="
              flex
              gap-2
              overflow-x-auto
              pb-1
              [scrollbar-width:none]
              [&::-webkit-scrollbar]:hidden
            "
          >

            {quickPrompts.map(
              (
                quickPrompt
              ) => {

                const Icon =
                  quickPrompt.icon;


                return (

                  <button
                    key={
                      quickPrompt.label
                    }
                    type="button"
                    disabled={
                      submitting
                      ||
                      loadingConversation
                    }
                    onClick={
                      () =>
                        void sendMessage(
                          quickPrompt.prompt
                        )
                    }
                    className="
                      inline-flex
                      min-h-10
                      shrink-0
                      items-center
                      gap-2
                      rounded-full
                      border
                      border-[#e5dccb]
                      bg-[#fffaf2]
                      px-3.5
                      py-2
                      text-xs
                      font-semibold
                      text-[#67552f]
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  >

                    <Icon
                      size={14}
                    />

                    {quickPrompt.label}

                  </button>

                );

              }
            )}

          </div>

        </section>


        {/* MOBILE CHAT WORKSPACE */}

        <section
          className="
            overflow-hidden
            rounded-2xl
            border
            border-[#e9e2d8]
            bg-white
            shadow-sm
          "
        >

          {/* MOBILE CHAT HEADER */}

          <div
            className="
              flex
              items-center
              justify-between
              gap-3
              border-b
              border-[#eeeae2]
              bg-[#fcfbf8]
              px-4
              py-3
            "
          >

            <div
              className="
                flex
                min-w-0
                items-center
                gap-3
              "
            >

              <div
                className="
                  relative
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-[#122033]
                  text-[#efd38f]
                "
              >

                <Bot
                  size={19}
                />


                <span
                  className="
                    absolute
                    -right-0.5
                    -top-0.5
                    h-2.5
                    w-2.5
                    rounded-full
                    border-2
                    border-white
                    bg-emerald-500
                  "
                />

              </div>


              <div
                className="min-w-0"
              >

                <div
                  className="
                    truncate
                    text-sm
                    font-semibold
                    text-[#172033]
                  "
                >
                  {activeConversationId
                    ? conversations.find(
                        (
                          conversation
                        ) =>
                          conversation.id
                          === activeConversationId
                      )?.title
                      ?? "Trợ lý Rosehome"
                    : "Cuộc trò chuyện mới"}
                </div>


                <div
                  className="
                    mt-0.5
                    text-[11px]
                    text-slate-500
                  "
                >
                  Groq AI • Có lưu lịch sử
                </div>

              </div>

            </div>


            <button
              type="button"
              onClick={
                () =>
                  setHistoryOpen(
                    true
                  )
              }
              className="
                flex
                h-9
                shrink-0
                items-center
                gap-1.5
                rounded-xl
                border
                border-[#ddd8ce]
                bg-white
                px-3
                text-xs
                font-semibold
                text-[#172033]
              "
            >

              <History
                size={14}
              />

              Lịch sử

            </button>

          </div>


          {/* MOBILE CHAT BODY */}

          <div
            className="
              h-[52dvh]
              min-h-[390px]
              overflow-y-auto
              bg-[#f8f9fb]
              px-3
              py-4
            "
          >

            <div
              className="
                flex
                flex-col
                gap-4
              "
            >

              {loadingConversation ? (

                <div
                  className="
                    flex
                    min-h-[220px]
                    items-center
                    justify-center
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      gap-2
                      text-sm
                      text-slate-400
                    "
                  >

                    <Loader2
                      size={17}
                      className=
                        "animate-spin"
                    />

                    Đang tải cuộc trò chuyện...

                  </div>

                </div>

              ) : (

                <>

                  {messages.map(
                    (
                      message
                    ) => (

                      <ChatBubble
                        key={
                          message.id
                        }
                        message={
                          message
                        }
                      />

                    )
                  )}


                  {submitting && (

                    <div
                      className="
                        flex
                        items-start
                        gap-2
                      "
                    >

                      <div
                        className="
                          flex
                          h-8
                          w-8
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          bg-[#122033]
                          text-[#efd38f]
                        "
                      >

                        <Bot
                          size={15}
                        />

                      </div>


                      <div
                        className="
                          rounded-2xl
                          rounded-tl-md
                          border
                          border-[#e9e2d8]
                          bg-white
                          px-3
                          py-3
                          shadow-sm
                        "
                      >

                        <div
                          className="
                            flex
                            items-center
                            gap-2
                            text-xs
                            text-slate-500
                          "
                        >

                          <Loader2
                            size={14}
                            className=
                              "animate-spin"
                          />

                          Đang kiểm tra dữ liệu...

                        </div>

                      </div>

                    </div>

                  )}

                </>

              )}


              <div
                ref={
                  mobileMessagesEndRef
                }
              />

            </div>

          </div>


          {/* MOBILE ERROR */}

          {error && (

            <div
              className="
                border-t
                border-red-100
                bg-red-50
                px-4
                py-3
                text-xs
                text-red-700
              "
            >
              {error}
            </div>

          )}


          {/* MOBILE INPUT */}

          <form
            onSubmit={
              handleSubmit
            }
            className="
              border-t
              border-[#eeeae2]
              bg-white
              p-3
            "
          >

            <div
              className="
                flex
                items-end
                gap-2
                rounded-2xl
                border
                border-[#ddd9cf]
                bg-white
                p-2
                shadow-sm
                focus-within:border-[#d6a64c]
              "
            >

              <textarea
                value={
                  input
                }
                onChange={
                  (
                    event
                  ) =>
                    setInput(
                      event.target.value
                    )
                }
                onKeyDown={
                  handleKeyDown
                }
                disabled={
                  submitting
                  ||
                  loadingConversation
                }
                rows={1}
                maxLength={2000}
                placeholder=
                  "Hỏi Rosehome AI..."
                className="
                  min-h-10
                  max-h-28
                  flex-1
                  resize-none
                  border-0
                  bg-transparent
                  px-2
                  py-2.5
                  text-sm
                  leading-5
                  text-[#172033]
                  outline-none
                  placeholder:text-slate-400
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              />


              <Button
                type="submit"
                disabled={
                  submitting
                  ||
                  loadingConversation
                  ||
                  !input.trim()
                }
                className="
                  h-10
                  w-10
                  shrink-0
                  rounded-xl
                  bg-[#d6a64c]
                  p-0
                  text-[#172033]
                  hover:bg-[#e0b85f]
                "
                aria-label="Gửi câu hỏi"
              >

                {submitting ? (

                  <Loader2
                    size={17}
                    className=
                      "animate-spin"
                  />

                ) : (

                  <Send
                    size={17}
                  />

                )}

              </Button>

            </div>


            <div
              className="
                mt-1.5
                flex
                items-center
                justify-between
                px-1
                text-[10px]
                text-slate-400
              "
            >

              <span>
                Enter gửi • Shift + Enter xuống dòng
              </span>


              <span>
                {input.length}/2000
              </span>

            </div>

          </form>

        </section>


        {/* MOBILE HISTORY DRAWER */}

        {historyOpen && (

          <div
            className="
              fixed
              inset-0
              z-[90]
              md:hidden
            "
          >

            <button
              type="button"
              className="
                absolute
                inset-0
                bg-[#122033]/40
              "
              onClick={
                () =>
                  setHistoryOpen(
                    false
                  )
              }
              aria-label=
                "Đóng lịch sử chat"
            />


            <aside
              className="
                absolute
                inset-y-0
                left-0
                flex
                w-[86%]
                max-w-[340px]
                flex-col
                bg-[#fcfbf8]
                shadow-2xl
              "
            >

              <div
                className="
                  border-b
                  border-[#e9e2d8]
                  p-4
                "
              >

                <div
                  className="
                    mb-3
                    flex
                    items-center
                    justify-between
                    gap-3
                  "
                >

                  <div>

                    <div
                      className="
                        text-base
                        font-semibold
                        text-[#172033]
                      "
                    >
                      Lịch sử chat
                    </div>


                    <div
                      className="
                        mt-0.5
                        text-xs
                        text-slate-500
                      "
                    >
                      {conversations.length} cuộc trò chuyện
                    </div>

                  </div>


                  <button
                    type="button"
                    onClick={
                      () =>
                        setHistoryOpen(
                          false
                        )
                    }
                    className="
                      rounded-lg
                      px-2.5
                      py-1.5
                      text-xs
                      font-semibold
                      text-slate-500
                    "
                  >
                    Đóng
                  </button>

                </div>


                <Button
                  type="button"
                  onClick={
                    handleNewChat
                  }
                  disabled={
                    submitting
                    ||
                    loadingConversation
                  }
                  className="
                    h-10
                    w-full
                    justify-start
                    rounded-xl
                    bg-[#122033]
                    text-white
                    hover:bg-[#1c3049]
                  "
                >

                  <MessageSquarePlus
                    size={16}
                  />

                  Chat mới

                </Button>

              </div>


              <div
                className="
                  flex
                  items-center
                  justify-between
                  px-4
                  pb-2
                  pt-4
                "
              >

                <div
                  className="
                    flex
                    items-center
                    gap-2
                    text-xs
                    font-semibold
                    uppercase
                    tracking-[0.12em]
                    text-slate-500
                  "
                >

                  <History
                    size={14}
                  />

                  Cuộc trò chuyện

                </div>


                <button
                  type="button"
                  onClick={
                    () =>
                      void refreshConversationList()
                  }
                  className="
                    rounded-lg
                    p-1.5
                    text-slate-400
                  "
                  aria-label=
                    "Tải lại lịch sử"
                >

                  <RefreshCw
                    size={14}
                  />

                </button>

              </div>


              <div
                className="
                  flex-1
                  overflow-y-auto
                  px-2
                  pb-6
                "
              >

                {loadingConversations ? (

                  <div
                    className="
                      flex
                      items-center
                      gap-2
                      px-3
                      py-4
                      text-sm
                      text-slate-400
                    "
                  >

                    <Loader2
                      size={15}
                      className=
                        "animate-spin"
                    />

                    Đang tải lịch sử...

                  </div>

                ) : conversations.length === 0 ? (

                  <div
                    className="
                      px-3
                      py-5
                      text-sm
                      leading-6
                      text-slate-400
                    "
                  >
                    Chưa có cuộc trò chuyện nào.
                  </div>

                ) : (

                  <div
                    className=
                      "space-y-1"
                  >

                    {conversations.map(
                      (
                        conversation
                      ) => {

                        const isActive =
                          activeConversationId
                          === conversation.id;


                        const isDeleting =
                          deletingConversationId
                          === conversation.id;


                        return (

                          <div
                            key={
                              conversation.id
                            }
                            className={
                              isActive

                                ? `
                                  flex
                                  items-center
                                  gap-1
                                  rounded-xl
                                  border
                                  border-[#e2cfaa]
                                  bg-[#fff8e9]
                                  p-1
                                `

                                : `
                                  flex
                                  items-center
                                  gap-1
                                  rounded-xl
                                  border
                                  border-transparent
                                  p-1
                                `
                            }
                          >

                            <button
                              type="button"
                              disabled={
                                isDeleting
                              }
                              onClick={
                                () =>
                                  void loadConversation(
                                    conversation.id
                                  )
                              }
                              className="
                                min-w-0
                                flex-1
                                rounded-lg
                                px-2.5
                                py-2.5
                                text-left
                              "
                            >

                              <div
                                className="
                                  flex
                                  items-start
                                  gap-2
                                "
                              >

                                <MessageSquare
                                  size={14}
                                  className={
                                    isActive
                                      ? "mt-0.5 shrink-0 text-[#b48225]"
                                      : "mt-0.5 shrink-0 text-slate-400"
                                  }
                                />


                                <div
                                  className=
                                    "min-w-0"
                                >

                                  <div
                                    className={
                                      isActive
                                        ? "truncate text-sm font-semibold text-[#172033]"
                                        : "truncate text-sm font-medium text-[#344257]"
                                    }
                                  >
                                    {conversation.title}
                                  </div>


                                  <div
                                    className="
                                      mt-1
                                      text-[10px]
                                      text-slate-400
                                    "
                                  >
                                    {formatConversationTime(
                                      conversation.updated_at
                                    )}
                                  </div>

                                </div>

                              </div>

                            </button>


                            <button
                              type="button"
                              disabled={
                                isDeleting
                              }
                              onClick={
                                () =>
                                  void handleDeleteConversation(
                                    conversation.id
                                  )
                              }
                              className="
                                mr-1
                                flex
                                h-9
                                w-9
                                shrink-0
                                items-center
                                justify-center
                                rounded-lg
                                text-slate-400
                                hover:bg-red-50
                                hover:text-red-500
                                disabled:opacity-40
                              "
                              aria-label=
                                "Xóa cuộc trò chuyện"
                            >

                              {isDeleting ? (

                                <Loader2
                                  size={14}
                                  className=
                                    "animate-spin"
                                />

                              ) : (

                                <Trash2
                                  size={14}
                                />

                              )}

                            </button>

                          </div>

                        );

                      }
                    )}

                  </div>

                )}

              </div>

            </aside>

          </div>

        )}

      </div>


      {/* =================================================
          DESKTOP
      ================================================= */}

      <div
        className="
          hidden
          space-y-6
          md:block
        "
      >

      {/* =================================================
          HERO
      ================================================= */}

      <section
        className="
          relative
          overflow-hidden
          rounded-3xl
          border
          border-[#26384f]
          bg-[#122033]
          px-5
          py-6
          text-white
          shadow-sm
          sm:px-7
          sm:py-7
        "
      >

        <div
          className="
            absolute
            -right-20
            -top-24
            h-64
            w-64
            rounded-full
            bg-[#e44763]/10
            blur-3xl
          "
        />


        <div
          className="
            absolute
            -bottom-28
            left-1/3
            h-56
            w-56
            rounded-full
            bg-[#d6a64c]/10
            blur-3xl
          "
        />


        <div
          className="
            relative
            z-10
            flex
            flex-col
            gap-5
            lg:flex-row
            lg:items-center
            lg:justify-between
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
                h-14
                w-14
                shrink-0
                items-center
                justify-center
                rounded-2xl
                border
                border-[#d6a64c]/30
                bg-[#d6a64c]/10
                text-[#efd38f]
              "
            >

              <Sparkles
                size={25}
              />

            </div>


            <div>

              <div
                className="
                  text-xs
                  font-semibold
                  uppercase
                  tracking-[0.18em]
                  text-[#d6a64c]
                "
              >
                Rosehome Intelligence
              </div>


              <h1
                className="
                  mt-1
                  text-2xl
                  font-semibold
                  tracking-tight
                  sm:text-3xl
                "
              >
                Rosehome AI
              </h1>


              <p
                className="
                  mt-2
                  max-w-2xl
                  text-sm
                  leading-6
                  text-slate-300
                "
              >
                Trợ lý AI đọc dữ liệu vận hành
                thực tế của Rosehome và ghi nhớ
                lịch sử hội thoại theo tài khoản.
              </p>

            </div>

          </div>


          <div
            className="
              flex
              flex-wrap
              items-center
              gap-2
            "
          >

            <div
              className="
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-emerald-400/20
                bg-emerald-400/10
                px-3
                py-2
                text-xs
                font-medium
                text-emerald-200
              "
            >

              <ShieldCheck
                size={14}
              />

              Read-only

            </div>


            <div
              className="
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-white/10
                bg-white/5
                px-3
                py-2
                text-xs
                font-medium
                text-slate-300
              "
            >

              <Database
                size={14}
              />

              Dữ liệu Rosehome

            </div>

          </div>

        </div>

      </section>


      {/* =================================================
          QUICK PROMPTS
      ================================================= */}

      <section
        className="
          rounded-2xl
          border
          border-[#e9e2d8]
          bg-white
          p-5
          shadow-sm
        "
      >

        <div>

          <h2
            className="
              text-sm
              font-semibold
              text-[#172033]
            "
          >
            Hỏi nhanh
          </h2>


          <p
            className="
              mt-1
              text-xs
              text-slate-500
            "
          >
            Chọn câu hỏi phổ biến để
            Rosehome AI kiểm tra ngay.
          </p>

        </div>


        <div
          className="
            mt-4
            grid
            grid-cols-1
            gap-3
            sm:grid-cols-2
            xl:grid-cols-6
          "
        >

          {quickPrompts.map(
            (
              quickPrompt
            ) => {

              const Icon =
                quickPrompt.icon;


              return (

                <button
                  key={
                    quickPrompt.label
                  }
                  type="button"
                  disabled={
                    submitting
                    ||
                    loadingConversation
                  }
                  onClick={
                    () =>
                      void sendMessage(
                        quickPrompt.prompt
                      )
                  }
                  className="
                    group
                    flex
                    min-h-20
                    items-start
                    gap-3
                    rounded-xl
                    border
                    border-[#e9e2d8]
                    bg-[#fcfbf8]
                    p-3
                    text-left
                    transition
                    hover:border-[#d6a64c]
                    hover:bg-[#fffaf0]
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >

                  <div
                    className="
                      flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-lg
                      bg-[#eef1f5]
                      text-[#20334d]
                      transition
                      group-hover:bg-[#f5eddc]
                      group-hover:text-[#8a6726]
                    "
                  >

                    <Icon
                      size={17}
                    />

                  </div>


                  <span
                    className="
                      pt-1
                      text-sm
                      font-medium
                      leading-5
                      text-[#172033]
                    "
                  >
                    {quickPrompt.label}
                  </span>

                </button>

              );

            }
          )}

        </div>

      </section>


      {/* =================================================
          AI WORKSPACE
      ================================================= */}

      <section
        className="
          relative
          overflow-hidden
          rounded-2xl
          border
          border-[#e9e2d8]
          bg-white
          shadow-sm
        "
      >

        <div
          className="
            flex
            min-h-[650px]
          "
        >

          {/* =============================================
              HISTORY PANEL
          ============================================= */}

          <aside
            className={
              historyOpen

                ? `
                    absolute
                    inset-y-0
                    left-0
                    z-30
                    flex
                    w-[290px]
                    flex-col
                    border-r
                    border-[#e9e2d8]
                    bg-[#fcfbf8]
                    shadow-xl
                    lg:static
                    lg:shadow-none
                  `

                : `
                    hidden
                    w-[290px]
                    flex-col
                    border-r
                    border-[#e9e2d8]
                    bg-[#fcfbf8]
                    lg:flex
                  `
            }
          >

            <div
              className="
                border-b
                border-[#e9e2d8]
                p-4
              "
            >

              <Button
                type="button"
                onClick={
                  handleNewChat
                }
                disabled={
                  submitting
                  ||
                  loadingConversation
                }
                className="
                  h-10
                  w-full
                  justify-start
                  rounded-xl
                  bg-[#122033]
                  text-white
                  hover:bg-[#1c3049]
                "
              >

                <MessageSquarePlus
                  size={16}
                />

                Chat mới

              </Button>

            </div>


            <div
              className="
                flex
                items-center
                justify-between
                px-4
                pb-2
                pt-4
              "
            >

              <div
                className="
                  flex
                  items-center
                  gap-2
                  text-xs
                  font-semibold
                  uppercase
                  tracking-[0.12em]
                  text-slate-500
                "
              >

                <History
                  size={14}
                />

                Lịch sử

              </div>


              <button
                type="button"
                onClick={
                  () =>
                    void refreshConversationList()
                }
                className="
                  rounded-lg
                  p-1.5
                  text-slate-400
                  transition
                  hover:bg-white
                  hover:text-[#172033]
                "
                aria-label="Tải lại lịch sử"
              >

                <RefreshCw
                  size={14}
                />

              </button>

            </div>


            <div
              className="
                flex-1
                overflow-y-auto
                px-2
                pb-4
              "
            >

              {loadingConversations ? (

                <div
                  className="
                    flex
                    items-center
                    gap-2
                    px-3
                    py-4
                    text-sm
                    text-slate-400
                  "
                >

                  <Loader2
                    size={15}
                    className="animate-spin"
                  />

                  Đang tải lịch sử...

                </div>

              ) : conversations.length === 0 ? (

                <div
                  className="
                    px-3
                    py-5
                    text-sm
                    leading-6
                    text-slate-400
                  "
                >
                  Chưa có cuộc trò chuyện nào.
                  Hãy gửi câu hỏi đầu tiên cho Rosehome AI.
                </div>

              ) : (

                <div
                  className="space-y-1"
                >

                  {conversations.map(
                    (
                      conversation
                    ) => {

                      const isActive =
                        activeConversationId
                        === conversation.id;


                      const isDeleting =
                        deletingConversationId
                        === conversation.id;


                      return (

                        <div
                          key={
                            conversation.id
                          }
                          className={
                            isActive

                              ? `
                                  group
                                  flex
                                  items-center
                                  gap-1
                                  rounded-xl
                                  border
                                  border-[#e2cfaa]
                                  bg-[#fff8e9]
                                  p-1
                                `

                              : `
                                  group
                                  flex
                                  items-center
                                  gap-1
                                  rounded-xl
                                  border
                                  border-transparent
                                  p-1
                                  transition
                                  hover:border-[#eee7dc]
                                  hover:bg-white
                                `
                          }
                        >

                          <button
                            type="button"
                            disabled={
                              isDeleting
                            }
                            onClick={
                              () =>
                                void loadConversation(
                                  conversation.id
                                )
                            }
                            className="
                              min-w-0
                              flex-1
                              rounded-lg
                              px-2.5
                              py-2
                              text-left
                            "
                          >

                            <div
                              className="
                                flex
                                items-start
                                gap-2
                              "
                            >

                              <MessageSquare
                                size={14}
                                className={
                                  isActive
                                    ? "mt-0.5 shrink-0 text-[#b48225]"
                                    : "mt-0.5 shrink-0 text-slate-400"
                                }
                              />


                              <div
                                className="min-w-0"
                              >

                                <div
                                  className={
                                    isActive

                                      ? "truncate text-sm font-semibold text-[#172033]"

                                      : "truncate text-sm font-medium text-[#344257]"
                                  }
                                >
                                  {conversation.title}
                                </div>


                                <div
                                  className="
                                    mt-1
                                    text-[10px]
                                    text-slate-400
                                  "
                                >
                                  {formatConversationTime(
                                    conversation.updated_at
                                  )}
                                </div>

                              </div>

                            </div>

                          </button>


                          <button
                            type="button"
                            disabled={
                              isDeleting
                            }
                            onClick={
                              () =>
                                void handleDeleteConversation(
                                  conversation.id
                                )
                            }
                            className="
                              mr-1
                              flex
                              h-8
                              w-8
                              shrink-0
                              items-center
                              justify-center
                              rounded-lg
                              text-slate-300
                              opacity-100
                              transition
                              hover:bg-red-50
                              hover:text-red-500
                              disabled:opacity-40
                              lg:opacity-0
                              lg:group-hover:opacity-100
                            "
                            aria-label="Xóa cuộc trò chuyện"
                          >

                            {isDeleting ? (

                              <Loader2
                                size={14}
                                className="animate-spin"
                              />

                            ) : (

                              <Trash2
                                size={14}
                              />

                            )}

                          </button>

                        </div>

                      );

                    }
                  )}

                </div>

              )}

            </div>

          </aside>


          {historyOpen && (

            <button
              type="button"
              className="
                absolute
                inset-0
                z-20
                bg-[#122033]/20
                lg:hidden
              "
              onClick={
                () =>
                  setHistoryOpen(
                    false
                  )
              }
              aria-label="Đóng lịch sử chat"
            />

          )}


          {/* =============================================
              CHAT PANEL
          ============================================= */}

          <div
            className="
              flex
              min-w-0
              flex-1
              flex-col
            "
          >

            {/* CHAT HEADER */}

            <div
              className="
                flex
                items-center
                justify-between
                gap-3
                border-b
                border-[#eeeae2]
                bg-[#fcfbf8]
                px-4
                py-4
                sm:px-5
              "
            >

              <div
                className="
                  flex
                  min-w-0
                  items-center
                  gap-3
                "
              >

                <button
                  type="button"
                  className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-[#e5dfd4]
                    bg-white
                    text-[#172033]
                    lg:hidden
                  "
                  onClick={
                    () =>
                      setHistoryOpen(
                        true
                      )
                  }
                  aria-label="Mở lịch sử chat"
                >

                  <History
                    size={17}
                  />

                </button>


                <div
                  className="
                    relative
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#122033]
                    text-[#efd38f]
                  "
                >

                  <Bot
                    size={19}
                  />


                  <span
                    className="
                      absolute
                      -right-0.5
                      -top-0.5
                      h-2.5
                      w-2.5
                      rounded-full
                      border-2
                      border-white
                      bg-emerald-500
                    "
                  />

                </div>


                <div
                  className="min-w-0"
                >

                  <div
                    className="
                      truncate
                      text-sm
                      font-semibold
                      text-[#172033]
                    "
                  >
                    {activeConversationId
                      ? conversations.find(
                          (
                            conversation
                          ) =>
                            conversation.id
                            === activeConversationId
                        )?.title
                        ?? "Trợ lý Rosehome"
                      : "Cuộc trò chuyện mới"}
                  </div>


                  <div
                    className="
                      text-xs
                      text-slate-500
                    "
                  >
                    Groq AI • Có lưu lịch sử
                  </div>

                </div>

              </div>


              <Button
                type="button"
                variant="outline"
                disabled={
                  submitting
                  ||
                  loadingConversation
                }
                onClick={
                  handleNewChat
                }
                className="
                  h-9
                  rounded-xl
                  border-[#ddd8ce]
                  px-3
                "
              >

                <MessageSquarePlus
                  size={15}
                />

                <span
                  className="
                    hidden
                    sm:inline
                  "
                >
                  Chat mới
                </span>

              </Button>

            </div>


            {/* CHAT BODY */}

            <div
              className="
                h-[500px]
                flex-1
                overflow-y-auto
                bg-[#f8f9fb]
                px-4
                py-5
                sm:px-6
              "
            >

              <div
                className="
                  mx-auto
                  flex
                  max-w-4xl
                  flex-col
                  gap-5
                "
              >

                {loadingConversation ? (

                  <div
                    className="
                      flex
                      min-h-[260px]
                      items-center
                      justify-center
                    "
                  >

                    <div
                      className="
                        flex
                        items-center
                        gap-2
                        text-sm
                        text-slate-400
                      "
                    >

                      <Loader2
                        size={17}
                        className="animate-spin"
                      />

                      Đang tải cuộc trò chuyện...

                    </div>

                  </div>

                ) : (

                  <>

                    {messages.map(
                      (
                        message
                      ) => (

                        <ChatBubble
                          key={
                            message.id
                          }
                          message={
                            message
                          }
                        />

                      )
                    )}


                    {submitting && (

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
                            h-9
                            w-9
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            bg-[#122033]
                            text-[#efd38f]
                          "
                        >

                          <Bot
                            size={17}
                          />

                        </div>


                        <div
                          className="
                            rounded-2xl
                            rounded-tl-md
                            border
                            border-[#e9e2d8]
                            bg-white
                            px-4
                            py-3
                            shadow-sm
                          "
                        >

                          <div
                            className="
                              flex
                              items-center
                              gap-2
                              text-sm
                              text-slate-500
                            "
                          >

                            <Loader2
                              size={16}
                              className="animate-spin"
                            />

                            Rosehome AI đang kiểm tra dữ liệu...

                          </div>

                        </div>

                      </div>

                    )}

                  </>

                )}


                <div
                  ref={
                    messagesEndRef
                  }
                />

              </div>

            </div>


            {/* ERROR */}

            {error && (

              <div
                className="
                  border-t
                  border-red-100
                  bg-red-50
                  px-5
                  py-3
                  text-sm
                  text-red-700
                "
              >
                {error}
              </div>

            )}


            {/* INPUT */}

            <form
              onSubmit={
                handleSubmit
              }
              className="
                border-t
                border-[#eeeae2]
                bg-white
                p-4
                sm:p-5
              "
            >

              <div
                className="
                  mx-auto
                  max-w-4xl
                "
              >

                <div
                  className="
                    flex
                    items-end
                    gap-3
                    rounded-2xl
                    border
                    border-[#ddd9cf]
                    bg-white
                    p-2
                    shadow-sm
                    transition
                    focus-within:border-[#d6a64c]
                  "
                >

                  <textarea
                    value={
                      input
                    }
                    onChange={
                      (
                        event
                      ) =>
                        setInput(
                          event.target.value
                        )
                    }
                    onKeyDown={
                      handleKeyDown
                    }
                    disabled={
                      submitting
                      ||
                      loadingConversation
                    }
                    rows={1}
                    maxLength={2000}
                    placeholder="Hỏi Rosehome AI về phòng, doanh thu, công nợ..."
                    className="
                      min-h-11
                      max-h-36
                      flex-1
                      resize-none
                      border-0
                      bg-transparent
                      px-3
                      py-3
                      text-sm
                      leading-5
                      text-[#172033]
                      outline-none
                      placeholder:text-slate-400
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                    "
                  />


                  <Button
                    type="submit"
                    disabled={
                      submitting
                      ||
                      loadingConversation
                      ||
                      !input.trim()
                    }
                    className="
                      h-11
                      w-11
                      shrink-0
                      rounded-xl
                      bg-[#d6a64c]
                      p-0
                      text-[#172033]
                      hover:bg-[#e0b85f]
                    "
                    aria-label="Gửi câu hỏi"
                  >

                    {submitting ? (

                      <Loader2
                        size={18}
                        className="animate-spin"
                      />

                    ) : (

                      <Send
                        size={18}
                      />

                    )}

                  </Button>

                </div>


                <div
                  className="
                    mt-2
                    flex
                    items-center
                    justify-between
                    gap-3
                    px-1
                    text-[11px]
                    text-slate-400
                  "
                >

                  <span>
                    Enter để gửi • Shift + Enter xuống dòng
                  </span>


                  <span>
                    {input.length}/2000
                  </span>

                </div>

              </div>

            </form>

          </div>

        </div>

      </section>

      </div>

    </div>

  );

}


// =========================================================
// CHAT BUBBLE
// =========================================================

function ChatBubble({
  message,
}: {
  message: ChatMessage;
}) {

  const isUser =
    message.role
    === "user";


  return (

    <div
      className={
        isUser

          ? `
              flex
              items-start
              justify-end
              gap-3
            `

          : `
              flex
              items-start
              gap-3
            `
      }
    >

      {!isUser && (

        <div
          className="
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-[#122033]
            text-[#efd38f]
          "
        >

          <Bot
            size={17}
          />

        </div>

      )}


      <div
        className="
          max-w-[85%]
          sm:max-w-[75%]
        "
      >

        <div
          className={
            isUser

              ? `
                  rounded-2xl
                  rounded-tr-md
                  bg-[#122033]
                  px-4
                  py-3
                  text-sm
                  leading-6
                  text-white
                  shadow-sm
                `

              : `
                  rounded-2xl
                  rounded-tl-md
                  border
                  border-[#e9e2d8]
                  bg-white
                  px-4
                  py-3
                  text-sm
                  leading-6
                  text-[#27364a]
                  shadow-sm
                `
          }
        >

          {isUser ? (

            <div
              className="whitespace-pre-wrap"
            >
              {message.content}
            </div>

          ) : (

            <div
              className="
                rosehome-ai-markdown
                text-sm
                leading-6
              "
            >

              <ReactMarkdown
                remarkPlugins={[
                  remarkGfm,
                ]}
                components={{

                  p: ({
                    children,
                  }) => (

                    <p
                      className="
                        mb-2
                        last:mb-0
                      "
                    >
                      {children}
                    </p>

                  ),

                  strong: ({
                    children,
                  }) => (

                    <strong
                      className="
                        font-semibold
                        text-[#172033]
                      "
                    >
                      {children}
                    </strong>

                  ),

                  ul: ({
                    children,
                  }) => (

                    <ul
                      className="
                        my-2
                        list-disc
                        space-y-1
                        pl-5
                      "
                    >
                      {children}
                    </ul>

                  ),

                  ol: ({
                    children,
                  }) => (

                    <ol
                      className="
                        my-2
                        list-decimal
                        space-y-1
                        pl-5
                      "
                    >
                      {children}
                    </ol>

                  ),

                  blockquote: ({
                    children,
                  }) => (

                    <blockquote
                      className="
                        my-3
                        border-l-2
                        border-[#d6a64c]
                        bg-[#fffaf0]
                        px-3
                        py-2
                        text-slate-600
                      "
                    >
                      {children}
                    </blockquote>

                  ),

                  code: ({
                    children,
                  }) => (

                    <code
                      className="
                        rounded
                        bg-slate-100
                        px-1
                        py-0.5
                        text-xs
                        text-[#b92f49]
                      "
                    >
                      {children}
                    </code>

                  ),

                }}
              >
                {message.content}
              </ReactMarkdown>

            </div>

          )}

        </div>


        {!isUser
          &&
          message.toolsUsed
          &&
          message.toolsUsed.length > 0
          &&
          (

            <div
              className="
                mt-2
                flex
                flex-wrap
                items-center
                gap-2
              "
            >

              <span
                className="
                  text-[11px]
                  font-medium
                  text-slate-400
                "
              >
                Đã kiểm tra:
              </span>


              {message.toolsUsed.map(
                (
                  tool
                ) => (

                  <span
                    key={
                      tool.name
                    }
                    className="
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-full
                      border
                      border-[#ead9b7]
                      bg-[#fffaf0]
                      px-2.5
                      py-1
                      text-[11px]
                      font-medium
                      text-[#8a6726]
                    "
                  >

                    <Database
                      size={11}
                    />

                    {tool.description
                      ??
                      tool.name}

                  </span>

                )
              )}

            </div>

          )}


        {!isUser
          &&
          message.model
          &&
          (

            <div
              className="
                mt-1.5
                text-[10px]
                text-slate-400
              "
            >
              {message.model}
            </div>

          )}

      </div>


      {isUser && (

        <div
          className="
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-[#fcecef]
            text-[#b92f49]
          "
        >

          <UserRound
            size={17}
          />

        </div>

      )}

    </div>

  );

}


export default RosehomeAI;
