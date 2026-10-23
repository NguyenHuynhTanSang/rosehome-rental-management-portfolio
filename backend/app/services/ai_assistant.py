import json
import logging
import os

from datetime import date
from typing import Any

from openai import OpenAI
from sqlalchemy.orm import Session

from backend.app.services.ai_tools import (
    AI_TOOL_FUNCTIONS,
)


# =========================================================
# CONFIG
# =========================================================

GROQ_BASE_URL = (
    "https://api.groq.com/openai/v1"
)

DEFAULT_MODEL = (
    "openai/gpt-oss-20b"
)

MAX_TOOL_ROUNDS = 6


logger = logging.getLogger(
    __name__
)


# =========================================================
# TOOL DESCRIPTIONS
# =========================================================

TOOL_DESCRIPTIONS = {

    "get_property_summary":
        "Tổng quan phòng và hợp đồng",

    "get_debt_report":
        "Báo cáo công nợ",

    "get_monthly_revenue":
        "Doanh thu thực tế theo tháng",

    "get_expiring_contracts":
        "Hợp đồng sắp hết hạn",

    "get_meter_progress":
        "Tiến độ quản lý theo tháng",

    "get_recent_payments":
        "Giao dịch gần đây",

    "get_attention_items":
        "Các việc cần chú ý",

    "get_room_detail":
        "Chi tiết tình trạng phòng",

}


# =========================================================
# GROQ TOOL DEFINITIONS
# =========================================================

AI_TOOLS: list[
    dict[str, Any]
] = [

    # =====================================================
    # 1. PROPERTY SUMMARY
    # =====================================================

    {
        "type":
            "function",

        "name":
            "get_property_summary",

        "description":
            (
                "Lấy tổng quan hệ thống Rosehome, "
                "bao gồm tổng số phòng, phòng đang thuê, "
                "phòng trống, tỷ lệ lấp đầy, "
                "hợp đồng đang hoạt động "
                "và mã các phòng đang trống. "
                "Dùng cho câu hỏi tổng quan toàn hệ thống."
            ),

        "parameters":
            {
                "type":
                    "object",

                "properties":
                    {},

                "required":
                    [],

                "additionalProperties":
                    False,
            },

        "strict":
            True,
    },


    # =====================================================
    # 2. DEBT REPORT
    # =====================================================

    {
        "type":
            "function",

        "name":
            "get_debt_report",

        "description":
            (
                "Lấy công nợ hiện tại của toàn Rosehome. "
                "Dùng khi admin hỏi tổng công nợ, "
                "các phòng còn nợ hoặc hóa đơn chưa trả đủ."
            ),

        "parameters":
            {
                "type":
                    "object",

                "properties":
                    {},

                "required":
                    [],

                "additionalProperties":
                    False,
            },

        "strict":
            True,
    },


    # =====================================================
    # 3. MONTHLY REVENUE
    # =====================================================

    {
        "type":
            "function",

        "name":
            "get_monthly_revenue",

        "description":
            (
                "Lấy tổng số tiền thực tế Rosehome "
                "đã nhận trong một tháng dựa trên "
                "các giao dịch thanh toán."
            ),

        "parameters":
            {
                "type":
                    "object",

                "properties":
                    {

                        "year":
                            {
                                "type":
                                    "integer",

                                "minimum":
                                    2000,

                                "maximum":
                                    2100,

                                "description":
                                    "Năm cần kiểm tra.",
                            },

                        "month":
                            {
                                "type":
                                    "integer",

                                "minimum":
                                    1,

                                "maximum":
                                    12,

                                "description":
                                    "Tháng cần kiểm tra.",
                            },

                    },

                "required":
                    [
                        "year",
                        "month",
                    ],

                "additionalProperties":
                    False,
            },

        "strict":
            True,
    },


    # =====================================================
    # 4. EXPIRING CONTRACTS
    # =====================================================

    {
        "type":
            "function",

        "name":
            "get_expiring_contracts",

        "description":
            (
                "Lấy các hợp đồng đang hoạt động "
                "sẽ hết hạn trong một số ngày sắp tới."
            ),

        "parameters":
            {
                "type":
                    "object",

                "properties":
                    {

                        "days":
                            {
                                "type":
                                    "integer",

                                "minimum":
                                    1,

                                "maximum":
                                    365,

                                "description":
                                    (
                                        "Số ngày cần kiểm tra, "
                                        "ví dụ 7, 30 hoặc 60."
                                    ),
                            },

                    },

                "required":
                    [
                        "days",
                    ],

                "additionalProperties":
                    False,
            },

        "strict":
            True,
    },


    # =====================================================
    # 5. MONTHLY PROGRESS
    # =====================================================

    {
        "type":
            "function",

        "name":
            "get_meter_progress",

        "description":
            (
                "Lấy tiến độ vận hành Rosehome theo tháng: "
                "nhập chỉ số điện, tạo hóa đơn, "
                "phát hành hóa đơn và thanh toán."
            ),

        "parameters":
            {
                "type":
                    "object",

                "properties":
                    {

                        "year":
                            {
                                "type":
                                    "integer",

                                "minimum":
                                    2000,

                                "maximum":
                                    2100,

                                "description":
                                    "Năm cần kiểm tra.",
                            },

                        "month":
                            {
                                "type":
                                    "integer",

                                "minimum":
                                    1,

                                "maximum":
                                    12,

                                "description":
                                    "Tháng cần kiểm tra.",
                            },

                    },

                "required":
                    [
                        "year",
                        "month",
                    ],

                "additionalProperties":
                    False,
            },

        "strict":
            True,
    },


    # =====================================================
    # 6. RECENT PAYMENTS
    # =====================================================

    {
        "type":
            "function",

        "name":
            "get_recent_payments",

        "description":
            (
                "Lấy các giao dịch thanh toán "
                "gần đây nhất của Rosehome."
            ),

        "parameters":
            {
                "type":
                    "object",

                "properties":
                    {

                        "limit":
                            {
                                "type":
                                    "integer",

                                "minimum":
                                    1,

                                "maximum":
                                    20,

                                "description":
                                    (
                                        "Số giao dịch cần lấy, "
                                        "từ 1 đến 20."
                                    ),
                            },

                    },

                "required":
                    [
                        "limit",
                    ],

                "additionalProperties":
                    False,
            },

        "strict":
            True,
    },


    # =====================================================
    # 7. ATTENTION ITEMS
    # =====================================================

    {
        "type":
            "function",

        "name":
            "get_attention_items",

        "description":
            (
                "Tổng hợp những việc admin Rosehome "
                "cần chú ý hoặc xử lý: công nợ, "
                "chỉ số điện, hóa đơn và hợp đồng. "
                "Phải ưu tiên dùng tool này khi admin hỏi "
                "hôm nay cần làm gì, "
                "có gì cần xử lý, "
                "có gì cần chú ý "
                "hoặc việc nào cần ưu tiên."
            ),

        "parameters":
            {
                "type":
                    "object",

                "properties":
                    {},

                "required":
                    [],

                "additionalProperties":
                    False,
            },

        "strict":
            True,
    },


    # =====================================================
    # 8. ROOM DETAIL
    # =====================================================

    {
        "type":
            "function",

        "name":
            "get_room_detail",

        "description":
            (
                "Lấy tình trạng vận hành chi tiết "
                "của một phòng Rosehome theo mã phòng. "
                "Bao gồm trạng thái phòng, tầng, "
                "hợp đồng hiện tại, tiền thuê, tiền cọc, "
                "chỉ số điện gần nhất, "
                "tình trạng điện tháng hiện tại, "
                "hóa đơn gần nhất, "
                "tình trạng hóa đơn tháng hiện tại "
                "và công nợ của riêng phòng đó. "
                "Phải ưu tiên dùng tool này khi admin "
                "hỏi về một mã phòng cụ thể."
            ),

        "parameters":
            {
                "type":
                    "object",

                "properties":
                    {

                        "room_code":
                            {
                                "type":
                                    "string",

                                "minLength":
                                    1,

                                "maxLength":
                                    20,

                                "description":
                                    (
                                        "Mã phòng cần kiểm tra, "
                                        "ví dụ P01."
                                    ),
                            },

                    },

                "required":
                    [
                        "room_code",
                    ],

                "additionalProperties":
                    False,
            },

        "strict":
            True,
    },

]


# =========================================================
# GET MODEL
# =========================================================

def get_ai_model() -> str:

    model = (
        os.getenv(
            "AI_MODEL",
            DEFAULT_MODEL,
        )
        .strip()
    )


    if not model:

        return DEFAULT_MODEL


    return model


# =========================================================
# GROQ CLIENT
# =========================================================

def get_groq_client() -> OpenAI:

    api_key = (
        os.getenv(
            "GROQ_API_KEY",
            "",
        )
        .strip()
    )


    if not api_key:

        raise RuntimeError(
            "GROQ_API_KEY chưa được cấu hình."
        )


    return OpenAI(
        api_key=
            api_key,

        base_url=
            GROQ_BASE_URL,
    )


# =========================================================
# SYSTEM INSTRUCTIONS
# =========================================================

def build_ai_instructions() -> str:

    today = date.today()


    return f"""
Bạn là Rosehome AI, trợ lý vận hành của hệ thống
quản lý phòng trọ và căn hộ Rosehome Apartment.

Ngày hiện tại:
{today.isoformat()}.


VAI TRÒ:

Bạn là một trợ lý quản lý dành cho chủ nhà
và người vận hành căn hộ.

Cách nói phải giống một nhân viên hỗ trợ quản lý,
không giống lập trình viên, database console
hoặc công cụ debug.


NHIỆM VỤ:

- Hỗ trợ admin kiểm tra tình trạng Rosehome.
- Trả lời dựa trên dữ liệu thật từ tool.
- Trả lời bằng tiếng Việt tự nhiên.
- Trả lời rõ ràng, ngắn gọn và dễ hiểu.
- Tiền tệ hiển thị theo VNĐ.
- Ưu tiên dùng mã phòng.
- "Tháng này" là tháng và năm hiện tại.
- "Hôm nay" là ngày hiện tại.


QUY TẮC CHỌN TOOL:

1. Nếu hỏi tổng quan toàn hệ thống,
tổng số phòng, phòng trống hoặc tỷ lệ lấp đầy:
dùng get_property_summary.

2. Nếu hỏi công nợ của toàn hệ thống
hoặc các phòng nào còn nợ:
dùng get_debt_report.

3. Nếu hỏi tiền đã thu hoặc doanh thu theo tháng:
dùng get_monthly_revenue.

4. Nếu hỏi hợp đồng sắp hết hạn
trong một khoảng thời gian:
dùng get_expiring_contracts.

5. Nếu hỏi tiến độ tháng,
phòng chưa nhập điện,
chưa tạo hóa đơn,
chưa phát hành hóa đơn
hoặc chưa thanh toán:
dùng get_meter_progress.

6. Nếu hỏi giao dịch gần đây:
dùng get_recent_payments.

7. Nếu admin hỏi những câu như:
"Hôm nay cần làm gì?"
"Có gì cần xử lý?"
"Có gì cần chú ý?"
"Có việc nào tồn đọng?"
"Việc nào cần ưu tiên?"
thì phải dùng get_attention_items.

8. Nếu câu hỏi nhắc đến một mã phòng cụ thể
như P01, P02, A01
hoặc hỏi tình trạng riêng của một phòng,
phải ưu tiên dùng get_room_detail.

Ví dụ:

"P01 hiện thế nào?"
"P01 còn nợ không?"
"P01 đã nhập điện tháng này chưa?"
"Hợp đồng P01 còn bao lâu?"
"P01 đang giữ bao nhiêu tiền cọc?"
"Hóa đơn gần nhất của P01 là bao nhiêu?"

Các câu trên phải dùng get_room_detail.


QUY TẮC DỮ LIỆU:

- Không tự đoán số liệu.
- Nếu câu hỏi cần dữ liệu Rosehome,
  phải gọi tool phù hợp.
- Chỉ kết luận từ dữ liệu tool trả về.
- Không bịa mã phòng, số tiền,
  hóa đơn hoặc hợp đồng.
- Nếu không tìm thấy phòng,
  nói rõ không tìm thấy.
- Không suy đoán nguyên nhân
  chỉ dựa trên một con số.


QUY TẮC HIỂN THỊ CHO NGƯỜI DÙNG:

Không hiển thị tên field nội bộ như:

deposit_balance
deposit_required
payment_status
room_id
contract_id
invoice_id
room_code
days_remaining
days_overdue
current_month_meter
current_month_invoice

Không giải thích bằng tên biến,
JSON, code, database field
hoặc cấu trúc dữ liệu nội bộ.

Ví dụ không nói:
"deposit_balance = 0"

Hãy nói:
"Số dư tiền cọc hiện tại là 0 đ."


DIỄN GIẢI TRẠNG THÁI:

OCCUPIED:
nói "Đang thuê".

VACANT:
nói "Phòng trống".

ACTIVE:
nói "Đang hoạt động".

ENDED:
nói "Đã kết thúc".

PAID:
nói "Đã thanh toán đủ".

UNPAID:
nói "Chưa thanh toán".

PARTIALLY_PAID:
nói "Đã thanh toán một phần".

DRAFT:
nói "Chưa phát hành".

ISSUED:
nói "Đã phát hành".


QUY TẮC TRÌNH BÀY:

Frontend hiện hiển thị câu trả lời
như văn bản thông thường.

Không sử dụng cú pháp Markdown.

Không sử dụng ký hiệu định dạng
cho chữ đậm, tiêu đề, blockquote,
inline code, code block
hoặc đường phân cách Markdown.

Nếu cần liệt kê,
hãy dùng dấu gạch đầu dòng đơn giản
hoặc ký hiệu •.

Câu trả lời phải hiển thị đẹp
ngay cả khi frontend xem nó
như văn bản thông thường.


CÁCH TRẢ LỜI:

- Trả lời trực tiếp câu hỏi trước.
- Sau đó mới cung cấp chi tiết cần thiết.
- Không lặp lại nguyên câu hỏi của người dùng.
- Không giải thích cách AI truy vấn database.
- Không nhắc tên tool trong nội dung câu trả lời.
- Không nói "theo dữ liệu tool".
- Không đưa chi tiết kỹ thuật nếu người dùng không hỏi.
- Không viết quá dài cho câu hỏi đơn giản.


VÍ DỤ PHONG CÁCH:

Nếu người dùng hỏi:
"P01 đang giữ bao nhiêu tiền cọc?"

Nếu số dư bằng 0, trả lời theo kiểu:

"Phòng P01 hiện có số dư tiền cọc là 0 đ.

• Trạng thái phòng: Đang thuê
• Hợp đồng: Đang hoạt động
• Thời hạn còn lại: 338 ngày"

Không được nói tên field nội bộ
hoặc trạng thái kỹ thuật.


QUY TẮC VỀ TIỀN CỌC:

Đặc biệt cẩn thận với số dư tiền cọc.

Nếu số dư tiền cọc bằng 0,
chỉ được nói:

"Số dư tiền cọc hiện tại là 0 đ."

Không được tự kết luận:

"Tiền cọc đã được hoàn toàn"
"Khách chưa đóng cọc"
"Tiền cọc đã bị khấu trừ"

trừ khi dữ liệu được cung cấp
thực sự chứng minh nguyên nhân đó.

Nếu số dư lớn hơn 0,
có thể nói:

"Rosehome hiện đang giữ X đ tiền cọc
của phòng P01."


KHI DÙNG get_room_detail:

- Hiển thị mã phòng.
- Diễn giải trạng thái sang tiếng Việt.
- Nếu floor_label là "Tầng trệt",
  giữ nguyên cách gọi "Tầng trệt".
- Nếu có hợp đồng đang hoạt động,
  có thể nêu tiền thuê.
- Nếu có ngày hết hạn,
  có thể nêu ngày hết hạn.
- Nếu còn số ngày,
  có thể nói còn bao nhiêu ngày.
- Nếu hợp đồng đã quá hạn,
  cảnh báo rõ.
- Có thể nêu số dư tiền cọc.
- Có thể nêu mức điện tiêu thụ gần nhất.
- Nêu tháng hiện tại đã nhập điện hay chưa.
- Có thể nêu hóa đơn gần nhất.
- Nêu đã thanh toán bao nhiêu nếu cần.
- Nêu còn nợ bao nhiêu nếu có.
- Nếu công nợ bằng 0,
  nói rõ phòng hiện không có công nợ.


KHI DÙNG get_attention_items:

- Ưu tiên việc quan trọng trước.
- Công nợ cần được nêu rõ số tiền.
- Phòng thiếu chỉ số điện cần nêu mã phòng.
- Hóa đơn chưa tạo hoặc chưa phát hành
  cần nêu mã phòng nếu có.
- Hợp đồng sắp hết hạn
  cần nêu số ngày còn lại.
- Hợp đồng quá hạn cần cảnh báo rõ.
- Nếu không có việc tồn đọng,
  nói ngắn gọn rằng hiện tại
  không phát hiện việc cần xử lý.


QUYỀN HẠN:

Rosehome AI hiện chỉ có quyền đọc dữ liệu.

Không được:

- tạo, sửa hoặc xóa phòng,
- tạo hoặc sửa khách thuê,
- tạo hoặc kết thúc hợp đồng,
- thu hoặc hoàn cọc,
- khấu trừ cọc,
- tạo hoặc phát hành hóa đơn,
- ghi nhận thanh toán,
- xóa dữ liệu.

Nếu admin yêu cầu thay đổi dữ liệu,
hãy nói rằng Rosehome AI hiện chỉ hỗ trợ kiểm tra
và tư vấn, chưa trực tiếp thực hiện thao tác.


BẢO MẬT:

- Không yêu cầu CCCD.
- Không yêu cầu số điện thoại.
- Không yêu cầu email.
- Không yêu cầu mã giao dịch ngân hàng.
- Không yêu cầu chứng từ thanh toán.
- Không suy đoán thông tin cá nhân.
"""


# =========================================================
# PARSE TOOL ARGUMENTS
# =========================================================

def parse_tool_arguments(
    raw_arguments: str | None,
) -> dict[str, Any]:

    if not raw_arguments:

        return {}


    try:

        parsed = json.loads(
            raw_arguments
        )


    except json.JSONDecodeError as exc:

        raise ValueError(
            "AI gửi tham số tool không hợp lệ."
        ) from exc


    if not isinstance(
        parsed,
        dict,
    ):

        raise ValueError(
            "Tham số tool phải là object."
        )


    return parsed


# =========================================================
# EXECUTE TOOL
# =========================================================

def execute_ai_tool(
    db: Session,
    tool_name: str,
    arguments: dict[str, Any],
) -> dict[str, Any]:

    tool_function = (
        AI_TOOL_FUNCTIONS.get(
            tool_name
        )
    )


    if tool_function is None:

        return {
            "success":
                False,

            "error":
                "Tool không được Rosehome cho phép.",
        }


    try:

        result = tool_function(
            db=db,
            **arguments,
        )


        return {
            "success":
                True,

            "data":
                result,
        }


    except ValueError as exc:

        return {
            "success":
                False,

            "error":
                str(
                    exc
                ),
        }


    except Exception:

        logger.exception(
            "Rosehome AI tool failed: %s",
            tool_name,
        )


        return {
            "success":
                False,

            "error":
                (
                    "Không thể đọc dữ liệu "
                    "Rosehome cho yêu cầu này."
                ),
        }


# =========================================================
# APPEND MODEL OUTPUT
# =========================================================

def append_response_output(
    conversation: list[Any],
    output: list[Any],
) -> None:

    for item in output:

        if hasattr(
            item,
            "model_dump",
        ):

            conversation.append(
                item.model_dump(
                    exclude_none=True
                )
            )

        else:

            conversation.append(
                item
            )


# =========================================================
# RUN ROSEHOME AI
# =========================================================

def run_ai_assistant(
    db: Session,
    message: str,
    history: list[dict[str, str]] | None = None,
) -> dict[str, Any]:

    clean_message = (
        message.strip()
    )


    if not clean_message:

        raise ValueError(
            "Câu hỏi không được để trống."
        )


    client = (
        get_groq_client()
    )


    model = (
        get_ai_model()
    )


    instructions = (
        build_ai_instructions()
    )


    conversation: list[Any] = []


    # =====================================================
    # PREVIOUS CONVERSATION HISTORY
    #
    # Chỉ đưa các message USER / ASSISTANT đã lưu
    # vào context. Tool call cũ không cần lưu lại vì
    # dữ liệu vận hành sẽ được đọc mới từ PostgreSQL
    # khi model cần tool ở câu hiện tại.
    # =====================================================

    if history:

        for history_item in history:

            role = (
                history_item
                .get(
                    "role",
                    "",
                )
                .strip()
                .lower()
            )


            content = (
                history_item
                .get(
                    "content",
                    "",
                )
                .strip()
            )


            if (
                role
                not in {
                    "user",
                    "assistant",
                }
                or
                not content
            ):
                continue


            conversation.append(
                {
                    "role":
                        role,

                    "content":
                        content,
                }
            )


    conversation.append(
        {
            "role":
                "user",

            "content":
                clean_message,
        }
    )


    used_tools: list[
        dict[str, str | None]
    ] = []


    used_tool_names: set[
        str
    ] = set()


    # =====================================================
    # TOOL LOOP
    # =====================================================

    for _ in range(
        MAX_TOOL_ROUNDS
    ):

        response = (
            client.responses.create(

                model=
                    model,

                instructions=
                    instructions,

                input=
                    conversation,

                tools=
                    AI_TOOLS,

                tool_choice=
                    "auto",

                reasoning={
                    "effort":
                        "low"
                },

                store=
                    False,

            )
        )


        function_calls = [

            item

            for item
            in response.output

            if getattr(
                item,
                "type",
                None,
            )
            == "function_call"

        ]


        # =================================================
        # FINAL ANSWER
        # =================================================

        if not function_calls:

            answer = (
                response.output_text
                or ""
            ).strip()


            if not answer:

                raise RuntimeError(
                    (
                        "Rosehome AI không trả về "
                        "nội dung phản hồi."
                    )
                )


            return {
                "answer":
                    answer,

                "tools_used":
                    used_tools,

                "model":
                    model,
            }


        # =================================================
        # KEEP MODEL OUTPUT
        # =================================================

        append_response_output(
            conversation,
            response.output,
        )


        # =================================================
        # EXECUTE TOOL CALLS
        # =================================================

        for function_call in (
            function_calls
        ):

            tool_name = getattr(
                function_call,
                "name",
                "",
            )


            call_id = getattr(
                function_call,
                "call_id",
                "",
            )


            raw_arguments = getattr(
                function_call,
                "arguments",
                "{}",
            )


            try:

                arguments = (
                    parse_tool_arguments(
                        raw_arguments
                    )
                )


                tool_result = (
                    execute_ai_tool(
                        db=db,
                        tool_name=tool_name,
                        arguments=arguments,
                    )
                )


            except ValueError as exc:

                tool_result = {
                    "success":
                        False,

                    "error":
                        str(
                            exc
                        ),
                }


            # =============================================
            # TRACK TOOL
            # =============================================

            if (
                tool_name
                and
                tool_name
                not in used_tool_names
            ):

                used_tool_names.add(
                    tool_name
                )


                used_tools.append(
                    {
                        "name":
                            tool_name,

                        "description":
                            TOOL_DESCRIPTIONS.get(
                                tool_name
                            ),
                    }
                )


            # =============================================
            # SEND TOOL RESULT BACK TO GROQ
            # =============================================

            conversation.append(
                {
                    "type":
                        "function_call_output",

                    "call_id":
                        call_id,

                    "output":
                        json.dumps(
                            tool_result,
                            ensure_ascii=False,
                        ),
                }
            )


    # =====================================================
    # TOO MANY TOOL ROUNDS
    # =====================================================

    raise RuntimeError(
        (
            "Rosehome AI đã thực hiện quá nhiều "
            "bước xử lý. Vui lòng thử câu hỏi "
            "ngắn gọn hơn."
        )
    )
