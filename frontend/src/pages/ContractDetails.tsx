import CheckoutSettlementAction from "../components/CheckoutSettlementAction";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BadgeDollarSign,
  Building2,
  CalendarClock,
  FileText,
  History,
  MinusCircle,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Undo2,
  UserPlus,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import {
  apiDelete,
  apiGet,
  apiPost,
} from "../api/api";

import DepositTransactionModal
  from "../components/DepositTransactionModal";

import EndContractModal
  from "../components/EndContractModal";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type {
  Contract,
} from "../types/contract";

import type {
  Room,
} from "../types/room";

import type {
  Tenant,
} from "../types/tenant";

import type {
  DepositSummary,
  DepositTransaction,
  DepositTransactionType,
  ManualDepositTransactionType,
} from "../types/deposit";


type ContractTenantMember = {
  id: number;
  full_name: string;
  phone: string | null;
  email: string | null;
  citizen_id: string | null;
  note: string | null;
  role: string;
};


type AddContractOccupantPayload = {
  tenant_id: number;
};


// =========================================================
// HELPERS
// =========================================================

function formatMoney(
  value: number
) {

  return (
    new Intl.NumberFormat(
      "vi-VN"
    ).format(value)
    +
    " đ"
  );

}


function formatDate(
  value: string | null
) {

  if (!value) {
    return "-";
  }


  const datePart =
    value.split("T")[0];


  const parts =
    datePart.split("-");


  if (
    parts.length !== 3
  ) {
    return value;
  }


  return (
    `${parts[2]}/${parts[1]}/${parts[0]}`
  );

}


function formatFloor(
  floor:
    number
    |
    null
    |
    undefined
) {

  if (
    floor === null
    ||
    floor === undefined
  ) {
    return "-";
  }


  if (
    floor === 0
  ) {
    return "Tầng trệt";
  }


  return `Tầng ${floor}`;

}


function getDaysUntil(
  endDate: string | null
) {

  if (
    !endDate
  ) {
    return null;
  }


  const today =
    new Date();


  today.setHours(
    0,
    0,
    0,
    0
  );


  const target =
    new Date(
      `${endDate}T00:00:00`
    );


  if (
    Number.isNaN(
      target.getTime()
    )
  ) {
    return null;
  }


  return Math.ceil(
    (
      target.getTime()
      -
      today.getTime()
    )
    /
    (
      1000
      *
      60
      *
      60
      *
      24
    )
  );

}


function getExpiryText(
  endDate: string | null
) {

  const days =
    getDaysUntil(
      endDate
    );


  if (
    days === null
  ) {
    return "Không thời hạn";
  }


  if (
    days < 0
  ) {
    return (
      `Quá hạn ${Math.abs(days)} ngày`
    );
  }


  if (
    days === 0
  ) {
    return "Hết hạn hôm nay";
  }


  if (
    days === 1
  ) {
    return "Còn 1 ngày";
  }


  return `Còn ${days} ngày`;

}


function getTransactionLabel(
  type: DepositTransactionType
) {

  if (
    type === "COLLECT"
  ) {
    return "Thu cọc";
  }


  if (
    type === "REFUND"
  ) {
    return "Hoàn cọc";
  }


  if (
    type === "FORFEIT"
  ) {
    return "Mất cọc";
  }


  return "Khấu trừ";

}


// =========================================================
// CONTRACT DETAILS
// =========================================================

function ContractDetails() {

  const {
    contractId,
  } = useParams();


  const [
    contract,
    setContract,
  ] = useState<
    Contract | null
  >(null);


  const [
    room,
    setRoom,
  ] = useState<
    Room | null
  >(null);


  const [
    tenant,
    setTenant,
  ] = useState<
    Tenant | null
  >(null);


  const [
    contractTenants,
    setContractTenants,
  ] = useState<
    ContractTenantMember[]
  >([]);


  const [
    allTenants,
    setAllTenants,
  ] = useState<
    Tenant[]
  >([]);


  const [
    showAddOccupantModal,
    setShowAddOccupantModal,
  ] = useState(
    false
  );


  const [
    selectedOccupantTenantId,
    setSelectedOccupantTenantId,
  ] = useState("");


  const [
    occupantSearch,
    setOccupantSearch,
  ] = useState("");


  const [
    occupantProcessing,
    setOccupantProcessing,
  ] = useState(
    false
  );


  const [
    actionError,
    setActionError,
  ] = useState("");


  const [
    actionSuccess,
    setActionSuccess,
  ] = useState("");


  const [
    deposit,
    setDeposit,
  ] = useState<
    DepositSummary | null
  >(null);


  const [
    transactions,
    setTransactions,
  ] = useState<
    DepositTransaction[]
  >([]);


  const [
    transactionType,
    setTransactionType,
  ] = useState<
    ManualDepositTransactionType | null
  >(null);


  const [
    showEndModal,
    setShowEndModal,
  ] = useState(
    false
  );


  const [
    hasPreparedCheckout,
    setHasPreparedCheckout,
  ] = useState<
    boolean | null
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
  ] = useState("");


  // =========================================================
  // LOAD DATA
  // =========================================================

  async function loadData() {

    if (
      !contractId
    ) {

      setError(
        "Contract ID không hợp lệ."
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


      setError("");


      // Backend hiện lấy hợp đồng
      // thông qua danh sách /contracts.

      const contracts =
        await apiGet<Contract[]>(
          "/contracts"
        );


      const foundContract =
        contracts.find(
          (
            item
          ) =>
            item.id
            ===
            Number(
              contractId
            )
        );


      if (
        !foundContract
      ) {

        throw new Error(
          "Không tìm thấy hợp đồng."
        );

      }


      setContract(
        foundContract
      );


      const [
        roomData,
        tenantData,
        depositData,
        transactionData,
        contractTenantData,
        allTenantData,
      ] =
        await Promise.all([

          apiGet<Room>(
            `/rooms/${foundContract.room_id}`
          ),

          apiGet<Tenant>(
            `/tenants/${foundContract.tenant_id}`
          ),

          apiGet<DepositSummary>(
            `/contracts/${foundContract.id}/deposit-summary`
          ),

          apiGet<DepositTransaction[]>(
            `/contracts/${foundContract.id}/deposits`
          ),

          apiGet<ContractTenantMember[]>(
            `/contracts/${foundContract.id}/tenants`
          ),

          apiGet<Tenant[]>(
            "/tenants"
          ),

        ]);


      setRoom(
        roomData
      );


      setTenant(
        tenantData
      );


      setDeposit(
        depositData
      );


      setTransactions(
        transactionData
      );


      setContractTenants(
        contractTenantData
      );


      setAllTenants(
        allTenantData
      );


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
          "Không thể tải chi tiết hợp đồng."
        );

      }


    } finally {

      setLoading(
        false
      );

    }

  }


  useEffect(
    () => {

      loadData();

    },
    [
      contractId,
    ]
  );


  // =========================================================
  // OPEN ADD OCCUPANT
  // =========================================================

  function handleOpenAddOccupant() {

    setSelectedOccupantTenantId(
      ""
    );


    setOccupantSearch(
      ""
    );


    setActionError("");
    setActionSuccess("");


    setShowAddOccupantModal(
      true
    );

  }


  // =========================================================
  // ADD OCCUPANT
  // =========================================================

  async function handleAddOccupant() {

    if (
      !contract
      ||
      !selectedOccupantTenantId
    ) {
      return;
    }


    const tenantId =
      Number(
        selectedOccupantTenantId
      );


    if (
      !Number.isInteger(
        tenantId
      )
      ||
      tenantId <= 0
    ) {

      setActionError(
        "Khách thuê được chọn không hợp lệ."
      );

      return;

    }


    try {

      setOccupantProcessing(
        true
      );


      setActionError("");
      setActionSuccess("");


      const addedTenant =
        await apiPost<
          ContractTenantMember,
          AddContractOccupantPayload
        >(
          `/contracts/${contract.id}/occupants`,
          {
            tenant_id:
              tenantId,
          }
        );


      setShowAddOccupantModal(
        false
      );


      setSelectedOccupantTenantId(
        ""
      );


      setOccupantSearch(
        ""
      );


      setActionSuccess(
        `Đã thêm ${addedTenant.full_name} vào phòng.`
      );


      await loadData();


    } catch (err) {

      console.error(
        err
      );


      if (
        err instanceof Error
      ) {

        setActionError(
          err.message
        );

      } else {

        setActionError(
          "Không thể thêm người ở cùng."
        );

      }


    } finally {

      setOccupantProcessing(
        false
      );

    }

  }


  // =========================================================
  // REMOVE OCCUPANT
  // =========================================================

  async function handleRemoveOccupant(
    member: ContractTenantMember
  ) {

    if (
      !contract
      ||
      member.role
      !== "OCCUPANT"
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        `Xóa ${member.full_name} khỏi phòng?\n\n`
        +
        "Hồ sơ khách vẫn được giữ lại. "
        +
        "Chỉ trạng thái ở cùng trong hợp đồng này được kết thúc."
      );


    if (
      !confirmed
    ) {
      return;
    }


    try {

      setOccupantProcessing(
        true
      );


      setActionError("");
      setActionSuccess("");


      await apiDelete<{
        message: string;
        contract_id: number;
        tenant_id: number;
      }>(
        `/contracts/${contract.id}/occupants/${member.id}`
      );


      setActionSuccess(
        `Đã xóa ${member.full_name} khỏi phòng.`
      );


      await loadData();


    } catch (err) {

      console.error(
        err
      );


      if (
        err instanceof Error
      ) {

        setActionError(
          err.message
        );

      } else {

        setActionError(
          "Không thể xóa người ở cùng."
        );

      }


    } finally {

      setOccupantProcessing(
        false
      );

    }

  }


  // =========================================================
  // DEPOSIT MISSING
  // =========================================================

  const depositMissing =
    useMemo(
      () => {

        if (
          !contract
          ||
          !deposit
        ) {
          return 0;
        }


        return Math.max(
          0,
          contract.deposit_required
          -
          deposit.current_balance
        );

      },
      [
        contract,
        deposit,
      ]
    );


  // =========================================================
  // OCCUPANT OPTIONS
  // =========================================================

  const contractTenantIds =
    useMemo(
      () =>
        new Set(
          contractTenants.map(
            (
              item
            ) =>
              item.id
          )
        ),
      [
        contractTenants,
      ]
    );


  const availableOccupantTenants =
    useMemo(
      () =>
        allTenants.filter(
          (
            item
          ) =>
            !contractTenantIds.has(
              item.id
            )
        ),
      [
        allTenants,
        contractTenantIds,
      ]
    );


  const filteredAvailableOccupantTenants =
    useMemo(
      () => {

        const keyword =
          occupantSearch
            .trim()
            .toLowerCase();


        if (
          keyword === ""
        ) {
          return availableOccupantTenants;
        }


        return availableOccupantTenants.filter(
          (
            item
          ) => {

            const name =
              item.full_name
                ?.toLowerCase()
              ??
              "";


            const phone =
              item.phone
                ?.toLowerCase()
              ??
              "";


            const citizenId =
              item.citizen_id
                ?.toLowerCase()
              ??
              "";


            return (
              name.includes(
                keyword
              )
              ||
              phone.includes(
                keyword
              )
              ||
              citizenId.includes(
                keyword
              )
            );

          }
        );

      },
      [
        availableOccupantTenants,
        occupantSearch,
      ]
    );


  // =========================================================
  // DEPOSIT TRANSACTION CREATED
  // =========================================================

  function handleTransactionCreated(
    newTransaction:
      DepositTransaction
  ) {

    setTransactions(
      (
        current
      ) => [
        newTransaction,
        ...current,
      ]
    );


    setTransactionType(
      null
    );


    loadData();

  }


  // =========================================================
  // CONTRACT ENDED
  // =========================================================

  function handleContractEnded(
    endedContract: Contract
  ) {

    setContract(
      endedContract
    );


    setRoom(
      (
        currentRoom
      ) => {

        if (
          !currentRoom
        ) {
          return currentRoom;
        }


        return {
          ...currentRoom,
          status:
            "VACANT",
        };

      }
    );


    setShowEndModal(
      false
    );

  }


  // =========================================================
  // LOADING
  // =========================================================

  if (
    loading
  ) {

    return (

      <div
        className="
          flex
          min-h-[320px]
          items-center
          justify-center
        "
      >

        <div
          className="
            text-center
          "
        >

          <div
            className="
              mx-auto
              mb-3
              flex
              h-12
              w-12
              animate-pulse
              items-center
              justify-center
              rounded-xl
              bg-[#f5eddc]
              text-[#9a762f]
            "
          >

            <FileText
              size={21}
            />

          </div>


          <p
            className="
              text-sm
              text-slate-500
            "
          >
            Đang tải chi tiết hợp đồng...
          </p>

        </div>

      </div>

    );

  }


  // =========================================================
  // ERROR
  // =========================================================

  if (
    error
    ||
    !contract
    ||
    !room
    ||
    !tenant
    ||
    !deposit
  ) {

    return (

      <div
        className="
          space-y-5
        "
      >

        <Link
          to="/contracts"
          className="
            inline-flex
            items-center
            gap-2
            text-sm
            font-medium
            text-slate-500
            transition
            hover:text-[#122033]
          "
        >

          <ArrowLeft
            size={16}
          />

          Quay lại danh sách hợp đồng

        </Link>


        <Card
          className="
            rounded-2xl
            border-red-200
            bg-red-50
          "
        >

          <CardContent
            className="
              flex
              min-h-40
              items-center
              justify-center
              text-sm
              text-red-700
            "
          >

            {error
              ||
              "Không thể tải hợp đồng."}

          </CardContent>

        </Card>

      </div>

    );

  }


  // =========================================================
  // CALCULATED
  // =========================================================

  const isActive =
    contract.status
    === "ACTIVE";


  const expiryDays =
    getDaysUntil(
      contract.end_date
    );


  const shouldShowExpiryWarning =
    isActive
    &&
    expiryDays !== null
    &&
    expiryDays <= 30;


  // =========================================================
  // UI
  // =========================================================

  return (

    <div
      className="
        pb-10
      "
    >

      <CheckoutSettlementAction
        contract={contract}
        roomCode={room.room_code}
        tenantName={tenant.full_name}
        onEnded={
          handleContractEnded
        }
        onSettlementPresenceChange={
          setHasPreparedCheckout
        }
      />

      {/* =====================================================
          MOBILE
      ===================================================== */}

      <div
        className="
          space-y-4
          md:hidden
        "
      >

        {/* BACK */}

        <div
          className="
            flex
            items-center
            justify-between
            gap-3
          "
        >

          <Link
            to="/contracts"
            className="
              inline-flex
              h-10
              items-center
              gap-2
              rounded-xl
              border
              border-[#e7e1d7]
              bg-white
              px-3
              text-sm
              font-semibold
              text-[#172033]
            "
          >

            <ArrowLeft
              size={16}
            />

            Hợp đồng

          </Link>


          <span
            className={
              isActive

                ? `
                  inline-flex
                  items-center
                  rounded-full
                  bg-[#fcecef]
                  px-3
                  py-1.5
                  text-xs
                  font-semibold
                  text-[#b92f49]
                `

                : `
                  inline-flex
                  items-center
                  rounded-full
                  bg-slate-100
                  px-3
                  py-1.5
                  text-xs
                  font-semibold
                  text-slate-600
                `
            }
          >

            {isActive
              ? "Đang hoạt động"
              : "Đã kết thúc"}

          </span>

        </div>


        {/* HERO */}

        <section
          className="
            overflow-hidden
            rounded-3xl
            bg-[#122033]
            p-5
            text-white
            shadow-[0_14px_35px_rgba(18,32,51,0.15)]
          "
        >

          <div
            className="
              text-[11px]
              font-semibold
              uppercase
              tracking-[0.16em]
              text-[#d6a64c]
            "
          >
            Hợp đồng #{contract.id}
          </div>


          <div
            className="
              mt-3
              flex
              items-start
              justify-between
              gap-4
            "
          >

            <div
              className="min-w-0"
            >

              <h1
                className="
                  truncate
                  text-2xl
                  font-bold
                  tracking-tight
                "
              >
                Phòng {room.room_code}
              </h1>


              <div
                className="
                  mt-1
                  truncate
                  text-sm
                  text-slate-300
                "
              >
                {tenant.full_name}
              </div>

            </div>


            <div
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-2xl
                bg-white/10
                text-[#d6a64c]
              "
            >

              <FileText
                size={20}
              />

            </div>

          </div>


          <div
            className="
              mt-5
              grid
              grid-cols-2
              gap-2
            "
          >

            <div
              className="
                rounded-2xl
                bg-white/7
                px-3
                py-3
              "
            >

              <div
                className="
                  text-[11px]
                  text-slate-400
                "
              >
                Tiền thuê / tháng
              </div>


              <strong
                className="
                  mt-1
                  block
                  text-base
                  text-white
                "
              >
                {formatMoney(
                  contract.monthly_rent
                )}
              </strong>

            </div>


            <div
              className="
                rounded-2xl
                bg-white/7
                px-3
                py-3
              "
            >

              <div
                className="
                  text-[11px]
                  text-slate-400
                "
              >
                Cọc đang giữ
              </div>


              <strong
                className="
                  mt-1
                  block
                  text-base
                  text-[#efd38f]
                "
              >
                {formatMoney(
                  deposit.current_balance
                )}
              </strong>

            </div>

          </div>


          <div
            className="
              mt-3
              flex
              items-center
              justify-between
              gap-3
              border-t
              border-white/10
              pt-3
              text-xs
            "
          >

            <span className="text-slate-400">
              {formatDate(
                contract.start_date
              )}
              {" → "}
              {formatDate(
                contract.end_date
              )}
            </span>


            <strong
              className={
                depositMissing > 0
                  ? "text-red-300"
                  : "text-emerald-300"
              }
            >
              {depositMissing > 0
                ? `Thiếu cọc ${formatMoney(depositMissing)}`
                : "Đã đủ cọc"}
            </strong>

          </div>

        </section>


        {/* EXPIRY WARNING */}

        {shouldShowExpiryWarning && (

          <div
            className={
              expiryDays !== null
              &&
              expiryDays <= 7

                ? `
                  flex
                  items-start
                  gap-3
                  rounded-2xl
                  border
                  border-red-200
                  bg-red-50
                  px-4
                  py-3.5
                `

                : `
                  flex
                  items-start
                  gap-3
                  rounded-2xl
                  border
                  border-amber-200
                  bg-amber-50
                  px-4
                  py-3.5
                `
            }
          >

            <AlertTriangle
              size={18}
              className={
                expiryDays !== null
                &&
                expiryDays <= 7
                  ? "mt-0.5 shrink-0 text-red-600"
                  : "mt-0.5 shrink-0 text-amber-700"
              }
            />


            <div
              className="min-w-0"
            >

              <div
                className={
                  expiryDays !== null
                  &&
                  expiryDays <= 7
                    ? "text-sm font-semibold text-red-700"
                    : "text-sm font-semibold text-amber-800"
                }
              >
                Hợp đồng cần chú ý
              </div>


              <div
                className="
                  mt-1
                  text-xs
                  leading-5
                  text-slate-600
                "
              >
                {getExpiryText(
                  contract.end_date
                )}
                {" • "}
                Kết thúc {formatDate(
                  contract.end_date
                )}
              </div>

            </div>

          </div>

        )}


        {actionError && (

          <div
            className="
              rounded-2xl
              border
              border-red-200
              bg-red-50
              px-4
              py-3
              text-sm
              text-red-700
            "
          >
            {actionError}
          </div>

        )}


        {actionSuccess && (

          <div
            className="
              rounded-2xl
              border
              border-emerald-200
              bg-emerald-50
              px-4
              py-3
              text-sm
              text-emerald-700
            "
          >
            {actionSuccess}
          </div>

        )}


        {/* CONTRACT INFO */}

        <Card
          className="
            rounded-2xl
            border-[#e9e2d8]
            shadow-sm
          "
        >

          <CardContent
            className="p-4"
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

              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >

                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#eef1f5]
                    text-[#20334d]
                  "
                >

                  <FileText
                    size={17}
                  />

                </div>


                <div>

                  <div
                    className="
                      text-sm
                      font-bold
                      text-[#172033]
                    "
                  >
                    Thông tin hợp đồng
                  </div>


                  <div
                    className="
                      text-[11px]
                      text-slate-500
                    "
                  >
                    HĐ #{contract.id}
                  </div>

                </div>

              </div>


              <span
                className="
                  rounded-full
                  bg-[#fffaf0]
                  px-2.5
                  py-1
                  text-[11px]
                  font-semibold
                  text-[#8a6726]
                "
              >
                {contract.occupant_count} người
              </span>

            </div>


            <div
              className="
                divide-y
                divide-[#f0ece5]
              "
            >

              <ContractDetailRow
                label="Phòng"
                value={
                  room.room_code
                }
              />


              <ContractDetailRow
                label="Vị trí"
                value={
                  formatFloor(
                    room.floor
                  )
                }
              />


              <ContractDetailRow
                label="Khách thuê"
                value={
                  tenant.full_name
                }
              />


              <ContractDetailRow
                label="Ngày bắt đầu"
                value={
                  formatDate(
                    contract.start_date
                  )
                }
              />


              <ContractDetailRow
                label="Ngày kết thúc"
                value={
                  formatDate(
                    contract.end_date
                  )
                }
              />

            </div>


            <div
              className="
                mt-4
                grid
                grid-cols-2
                gap-2
              "
            >

              <Link
                to={
                  `/rooms/${room.id}`
                }
                className="
                  inline-flex
                  min-h-11
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-[#ddd8ce]
                  bg-white
                  px-3
                  text-sm
                  font-semibold
                  text-[#172033]
                "
              >

                <Building2
                  size={16}
                />

                Phòng

              </Link>


              <Link
                to={
                  `/tenants/${tenant.id}`
                }
                className="
                  inline-flex
                  min-h-11
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-[#efced4]
                  bg-[#fcecef]
                  px-3
                  text-sm
                  font-semibold
                  text-[#b92f49]
                "
              >

                <UserRound
                  size={16}
                />

                Khách thuê

              </Link>

            </div>

          </CardContent>

        </Card>


        {/* TENANTS IN CONTRACT */}

        <Card
          className="
            rounded-2xl
            border-[#e9e2d8]
            shadow-sm
          "
        >

          <CardContent
            className="p-4"
          >

            <div
              className="
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
                    font-bold
                    text-[#172033]
                  "
                >
                  Khách đang ở
                </div>


                <div
                  className="
                    mt-0.5
                    text-[11px]
                    text-slate-500
                  "
                >
                  {contractTenants.length}
                  {" "}
                  hồ sơ khách trong hợp đồng
                </div>

              </div>


              {isActive && (

                <button
                  type="button"
                  disabled={
                    occupantProcessing
                  }
                  onClick={
                    handleOpenAddOccupant
                  }
                  className="
                    inline-flex
                    h-9
                    items-center
                    justify-center
                    gap-1.5
                    rounded-xl
                    bg-[#122033]
                    px-3
                    text-xs
                    font-semibold
                    text-white
                    disabled:opacity-50
                  "
                >

                  <UserPlus
                    size={14}
                  />

                  Thêm

                </button>

              )}

            </div>


            <div
              className="
                mt-4
                space-y-2
              "
            >

              {contractTenants.map(
                (
                  member
                ) => (

                  <div
                    key={
                      `${member.role}-${member.id}`
                    }
                    className="
                      rounded-xl
                      border
                      border-[#eee9df]
                      bg-[#fffdf9]
                      p-3
                    "
                  >

                    <div
                      className="
                        flex
                        items-start
                        justify-between
                        gap-3
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

                          <Link
                            to={
                              `/tenants/${member.id}`
                            }
                            className="
                              truncate
                              text-sm
                              font-semibold
                              text-[#172033]
                              hover:text-[#b92f49]
                            "
                          >
                            {member.full_name}
                          </Link>


                          <span
                            className={
                              member.role
                              === "PRIMARY"

                                ? `
                                  rounded-full
                                  bg-[#fcecef]
                                  px-2
                                  py-0.5
                                  text-[10px]
                                  font-semibold
                                  text-[#b92f49]
                                `

                                : `
                                  rounded-full
                                  bg-[#fff8e9]
                                  px-2
                                  py-0.5
                                  text-[10px]
                                  font-semibold
                                  text-[#8a6726]
                                `
                            }
                          >
                            {member.role
                              === "PRIMARY"
                                ? "Khách chính"
                                : "Người ở cùng"}
                          </span>

                        </div>


                        <div
                          className="
                            mt-1
                            text-xs
                            text-slate-500
                          "
                        >
                          {member.phone
                            ||
                            "Chưa có số điện thoại"}
                        </div>

                      </div>


                      {isActive
                        &&
                        member.role
                        === "OCCUPANT"
                        &&
                        (

                          <button
                            type="button"
                            disabled={
                              occupantProcessing
                            }
                            onClick={
                              () =>
                                handleRemoveOccupant(
                                  member
                                )
                            }
                            className="
                              inline-flex
                              h-8
                              w-8
                              shrink-0
                              items-center
                              justify-center
                              rounded-lg
                              border
                              border-red-200
                              bg-white
                              text-red-600
                              disabled:opacity-50
                            "
                            aria-label={
                              `Xóa ${member.full_name} khỏi phòng`
                            }
                          >

                            <Trash2
                              size={14}
                            />

                          </button>

                        )}

                    </div>

                  </div>

                )
              )}

            </div>

          </CardContent>

        </Card>


        {/* DEPOSIT */}

        <Card
          className="
            overflow-hidden
            rounded-2xl
            border-[#e9e2d8]
            shadow-sm
          "
        >

          <div
            className="
              h-1
              bg-[#d6a64c]
            "
          />


          <CardContent
            className="p-4"
          >

            <div
              className="
                flex
                items-center
                justify-between
                gap-3
              "
            >

              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >

                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#f5eddc]
                    text-[#9a762f]
                  "
                >

                  <ShieldCheck
                    size={17}
                  />

                </div>


                <div>

                  <div
                    className="
                      text-sm
                      font-bold
                      text-[#172033]
                    "
                  >
                    Tiền cọc
                  </div>


                  <div
                    className="
                      text-[11px]
                      text-slate-500
                    "
                  >
                    Theo dõi số dư cọc
                  </div>

                </div>

              </div>


              <strong
                className="
                  text-base
                  text-[#172033]
                "
              >
                {formatMoney(
                  deposit.current_balance
                )}
              </strong>

            </div>


            <div
              className="
                mt-4
                grid
                grid-cols-2
                gap-2
              "
            >

              <MobileDepositStat
                label="Yêu cầu"
                value={
                  formatMoney(
                    deposit.required_amount
                  )
                }
              />


              <MobileDepositStat
                label="Đã thu"
                value={
                  formatMoney(
                    deposit.total_collected
                  )
                }
              />


              <MobileDepositStat
                label="Đã hoàn"
                value={
                  formatMoney(
                    deposit.total_refunded
                  )
                }
              />


              <MobileDepositStat
                label="Khấu trừ"
                value={
                  formatMoney(
                    deposit.total_deducted
                  )
                }
              />

            </div>


            {isActive && (

              <div
                className="
                  mt-4
                  grid
                  grid-cols-3
                  gap-2
                "
              >

                <button
                  type="button"
                  onClick={
                    () =>
                      setTransactionType(
                        "COLLECT"
                      )
                  }
                  className="
                    inline-flex
                    min-h-12
                    flex-col
                    items-center
                    justify-center
                    gap-1
                    rounded-xl
                    bg-[#122033]
                    px-2
                    text-xs
                    font-semibold
                    text-white
                  "
                >

                  <PlusCircle
                    size={17}
                  />

                  Thu cọc

                </button>


                <button
                  type="button"
                  disabled={
                    deposit.current_balance
                    <= 0
                  }
                  onClick={
                    () =>
                      setTransactionType(
                        "REFUND"
                      )
                  }
                  className="
                    inline-flex
                    min-h-12
                    flex-col
                    items-center
                    justify-center
                    gap-1
                    rounded-xl
                    border
                    border-[#ead9b7]
                    bg-[#fffaf0]
                    px-2
                    text-xs
                    font-semibold
                    text-[#8a6726]
                    disabled:opacity-40
                  "
                >

                  <Undo2
                    size={17}
                  />

                  Hoàn cọc

                </button>


                <button
                  type="button"
                  disabled={
                    deposit.current_balance
                    <= 0
                  }
                  onClick={
                    () =>
                      setTransactionType(
                        "DEDUCTION"
                      )
                  }
                  className="
                    inline-flex
                    min-h-12
                    flex-col
                    items-center
                    justify-center
                    gap-1
                    rounded-xl
                    border
                    border-red-200
                    bg-red-50
                    px-2
                    text-xs
                    font-semibold
                    text-red-600
                    disabled:opacity-40
                  "
                >

                  <MinusCircle
                    size={17}
                  />

                  Khấu trừ

                </button>

              </div>

            )}

          </CardContent>

        </Card>


        {/* DEPOSIT HISTORY */}

        <section
          className="
            space-y-3
          "
        >

          <div
            className="
              flex
              items-center
              justify-between
              gap-3
            "
          >

            <div>

              <h2
                className="
                  text-base
                  font-bold
                  text-[#172033]
                "
              >
                Lịch sử tiền cọc
              </h2>


              <p
                className="
                  mt-0.5
                  text-xs
                  text-slate-500
                "
              >
                {transactions.length} giao dịch
              </p>

            </div>


            <History
              size={18}
              className="text-[#9a762f]"
            />

          </div>


          {transactions.length === 0 ? (

            <div
              className="
                rounded-2xl
                border
                border-[#e9e2d8]
                bg-white
                px-4
                py-8
                text-center
              "
            >

              <WalletCards
                size={22}
                className="
                  mx-auto
                  text-slate-400
                "
              />


              <div
                className="
                  mt-3
                  text-sm
                  font-semibold
                  text-[#172033]
                "
              >
                Chưa có giao dịch tiền cọc
              </div>


              <div
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                Giao dịch thu, hoàn hoặc khấu trừ sẽ hiển thị tại đây.
              </div>

            </div>

          ) : (

            <div
              className="
                space-y-2
              "
            >

              {transactions.map(
                (
                  transaction
                ) => (

                  <article
                    key={
                      transaction.id
                    }
                    className="
                      rounded-2xl
                      border
                      border-[#e9e2d8]
                      bg-white
                      p-4
                    "
                  >

                    <div
                      className="
                        flex
                        items-start
                        justify-between
                        gap-3
                      "
                    >

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

                          <TransactionBadge
                            type={
                              transaction.transaction_type
                            }
                          />


                          <span
                            className="
                              text-xs
                              text-slate-400
                            "
                          >
                            #{transaction.id}
                          </span>

                        </div>


                        <strong
                          className="
                            mt-3
                            block
                            text-lg
                            text-[#172033]
                          "
                        >
                          {formatMoney(
                            transaction.amount
                          )}
                        </strong>

                      </div>


                      <div
                        className="
                          flex
                          items-center
                          gap-1
                          whitespace-nowrap
                          text-xs
                          text-slate-500
                        "
                      >

                        <CalendarClock
                          size={13}
                        />

                        {formatDate(
                          transaction.created_at
                        )}

                      </div>

                    </div>


                    {transaction.note && (

                      <div
                        className="
                          mt-3
                          rounded-xl
                          bg-[#fcfbf8]
                          px-3
                          py-2.5
                          text-xs
                          leading-5
                          text-slate-600
                        "
                      >
                        {transaction.note}
                      </div>

                    )}

                  </article>

                )
              )}

            </div>

          )}

        </section>


        {/* QUICK LINKS */}

        <div
          className="
            grid
            grid-cols-2
            gap-2
          "
        >

          <Link
            to={
              `/rooms/${room.id}`
            }
            className="
              flex
              min-h-14
              items-center
              justify-between
              rounded-2xl
              border
              border-[#e9e2d8]
              bg-white
              px-4
              text-sm
              font-semibold
              text-[#172033]
            "
          >

            <span
              className="
                flex
                items-center
                gap-2
              "
            >
              <Building2
                size={16}
              />

              {room.room_code}
            </span>


            <ArrowUpRight
              size={15}
            />

          </Link>


          <Link
            to={
              `/tenants/${tenant.id}`
            }
            className="
              flex
              min-h-14
              items-center
              justify-between
              rounded-2xl
              border
              border-[#efced4]
              bg-[#fcecef]
              px-4
              text-sm
              font-semibold
              text-[#b92f49]
            "
          >

            <span
              className="
                min-w-0
                truncate
              "
            >
              {tenant.full_name}
            </span>


            <ArrowUpRight
              size={15}
              className="shrink-0"
            />

          </Link>

        </div>


        {isActive && hasPreparedCheckout === false && (

          <button
            type="button"
            onClick={
              () =>
                setShowEndModal(
                  true
                )
            }
            className="
              inline-flex
              min-h-12
              w-full
              items-center
              justify-center
              gap-2
              rounded-2xl
              border
              border-red-200
              bg-red-50
              px-4
              text-sm
              font-semibold
              text-red-600
            "
          >

            <FileText
              size={17}
            />

            Kết thúc hợp đồng

          </button>

        )}

      </div>


      {/* =====================================================
          DESKTOP
      ===================================================== */}

      <div
        className="
          hidden
          space-y-6
          md:block
        "
      >

      {/* =====================================================
          BACK
      ===================================================== */}

      <Link
        to="/contracts"
        className="
          inline-flex
          items-center
          gap-2
          text-sm
          font-medium
          text-slate-500
          transition
          hover:text-[#122033]
        "
      >

        <ArrowLeft
          size={16}
        />

        Quay lại danh sách hợp đồng

      </Link>


      {/* =====================================================
          HERO
      ===================================================== */}

      <section
        className="
          relative
          overflow-hidden
          rounded-2xl
          border
          border-[#26384f]
          bg-[#122033]
          px-6
          py-6
          text-white
          shadow-[0_18px_50px_rgba(15,31,51,0.14)]
          md:px-8
        "
      >

        <div
          className="
            absolute
            -right-16
            -top-20
            h-56
            w-56
            rounded-full
            bg-[#e44763]/10
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
            md:flex-row
            md:items-center
            md:justify-between
          "
        >

          <div>

            <div
              className="
                mb-2
                flex
                items-center
                gap-2
                text-xs
                font-semibold
                uppercase
                tracking-[0.22em]
                text-[#d6a64c]
              "
            >

              <FileText
                size={16}
              />

              Chi tiết hợp đồng

            </div>


            <h1
              className="
                text-2xl
                font-semibold
                tracking-tight
                md:text-3xl
              "
            >
              Hợp đồng #{contract.id}
            </h1>


            <p
              className="
                mt-2
                text-sm
                text-slate-300
              "
            >
              Phòng {room.room_code}
              {" • "}
              {tenant.full_name}
            </p>


            <div
              className="
                mt-4
                flex
                flex-wrap
                gap-2
              "
            >

              <Badge
                variant="outline"
                className="
                  border-white/15
                  bg-white/5
                  text-slate-200
                "
              >

                <Building2 />

                {room.room_code}

              </Badge>


              <Badge
                variant="outline"
                className="
                  border-[#d6a64c]/40
                  bg-[#d6a64c]/10
                  text-[#efd38f]
                "
              >

                {formatFloor(
                  room.floor
                )}

              </Badge>


              <Badge
                variant="outline"
                className="
                  border-white/15
                  bg-white/5
                  text-slate-200
                "
              >

                <UserRound />

                {tenant.full_name}

              </Badge>

            </div>

          </div>


          <span
            className={
              isActive

                ? `
                  inline-flex
                  w-fit
                  items-center
                  rounded-full
                  border
                  border-[#e44763]/40
                  bg-[#e44763]/15
                  px-4
                  py-2
                  text-sm
                  font-semibold
                  text-[#ffb7c4]
                `

                : `
                  inline-flex
                  w-fit
                  items-center
                  rounded-full
                  border
                  border-[#d6a64c]/40
                  bg-[#d6a64c]/15
                  px-4
                  py-2
                  text-sm
                  font-semibold
                  text-[#efd38f]
                `
            }
          >

            <span
              className={
                isActive

                  ? `
                    mr-2
                    h-2
                    w-2
                    rounded-full
                    bg-[#e44763]
                  `

                  : `
                    mr-2
                    h-2
                    w-2
                    rounded-full
                    bg-[#d6a64c]
                  `
              }
            />


            {isActive
              ? "Đang hoạt động"
              : "Đã kết thúc"}

          </span>

        </div>

      </section>


      {/* =====================================================
          EXPIRY WARNING
      ===================================================== */}

      {shouldShowExpiryWarning && (

        <div
          className={
            expiryDays !== null
            &&
            expiryDays <= 7

              ? `
                flex
                flex-col
                gap-4
                rounded-2xl
                border
                border-red-200
                bg-red-50
                px-5
                py-4
                sm:flex-row
                sm:items-center
                sm:justify-between
              `

              : `
                flex
                flex-col
                gap-4
                rounded-2xl
                border
                border-amber-200
                bg-amber-50
                px-5
                py-4
                sm:flex-row
                sm:items-center
                sm:justify-between
              `
          }
        >

          <div
            className="
              flex
              items-start
              gap-3
            "
          >

            <div
              className={
                expiryDays !== null
                &&
                expiryDays <= 7

                  ? `
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-red-100
                    text-red-600
                  `

                  : `
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-amber-100
                    text-amber-700
                  `
              }
            >

              <AlertTriangle
                size={19}
              />

            </div>


            <div>

              <strong
                className={
                  expiryDays !== null
                  &&
                  expiryDays <= 7

                    ? "text-sm text-red-700"

                    : "text-sm text-amber-800"
                }
              >
                Hợp đồng cần chú ý
              </strong>


              <p
                className="
                  mt-1
                  text-sm
                  text-slate-600
                "
              >
                Ngày kết thúc:{" "}
                {formatDate(
                  contract.end_date
                )}
              </p>

            </div>

          </div>


          <strong
            className={
              expiryDays !== null
              &&
              expiryDays <= 7

                ? `
                  whitespace-nowrap
                  text-sm
                  text-red-700
                `

                : `
                  whitespace-nowrap
                  text-sm
                  text-amber-700
                `
            }
          >

            {getExpiryText(
              contract.end_date
            )}

          </strong>

        </div>

      )}


      {actionError && (

        <div
          className="
            rounded-2xl
            border
            border-red-200
            bg-red-50
            px-5
            py-4
            text-sm
            text-red-700
          "
        >
          {actionError}
        </div>

      )}


      {actionSuccess && (

        <div
          className="
            rounded-2xl
            border
            border-emerald-200
            bg-emerald-50
            px-5
            py-4
            text-sm
            text-emerald-700
          "
        >
          {actionSuccess}
        </div>

      )}


      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <div
        className="
          grid
          grid-cols-1
          gap-4
          sm:grid-cols-2
          xl:grid-cols-4
        "
      >

        <ContractDetailStat
          title="Tiền thuê / tháng"
          value={
            formatMoney(
              contract.monthly_rent
            )
          }
          subtitle="Theo hợp đồng hiện tại"
          icon={
            WalletCards
          }
        />


        <ContractDetailStat
          title="Cọc yêu cầu"
          value={
            formatMoney(
              contract.deposit_required
            )
          }
          subtitle="Mức cọc theo hợp đồng"
          icon={
            BadgeDollarSign
          }
          accent="gold"
        />


        <ContractDetailStat
          title="Cọc đang giữ"
          value={
            formatMoney(
              deposit.current_balance
            )
          }
          subtitle="Số dư cọc hiện tại"
          icon={
            ShieldCheck
          }
          accent="rose"
        />


        <ContractDetailStat
          title="Cọc còn thiếu"
          value={
            formatMoney(
              depositMissing
            )
          }
          subtitle={
            depositMissing > 0
              ? "Chưa đủ mức yêu cầu"
              : "Đã đủ tiền cọc"
          }
          icon={
            AlertTriangle
          }
          danger={
            depositMissing > 0
          }
        />

      </div>


      {/* =====================================================
          MAIN INFO
      ===================================================== */}

      <div
        className="
          grid
          grid-cols-1
          gap-5
          xl:grid-cols-2
        "
      >

        {/* ===================================================
            CONTRACT INFORMATION
        =================================================== */}

        <Card
          className="
            rounded-2xl
            border-[#e9e2d8]
            shadow-sm
          "
        >

          <CardHeader
            className="
              border-b
              border-[#eeeae2]
            "
          >

            <CardTitle
              className="
                flex
                items-center
                gap-2
                text-base
              "
            >

              <FileText
                size={18}
                className=
                  "text-[#d6a64c]"
              />

              Thông tin hợp đồng

            </CardTitle>


            <CardDescription>
              Phòng, khách thuê và thời hạn hợp đồng.
            </CardDescription>

          </CardHeader>


          <CardContent
            className="p-5"
          >

            <div
              className="space-y-1"
            >

              <ContractDetailRow
                label="Phòng"
                value={
                  room.room_code
                }
              />


              <ContractDetailRow
                label="Vị trí"
                value={
                  formatFloor(
                    room.floor
                  )
                }
              />


              <ContractDetailRow
                label="Khách thuê"
                value={
                  tenant.full_name
                }
              />


              <ContractDetailRow
                label="Ngày bắt đầu"
                value={
                  formatDate(
                    contract.start_date
                  )
                }
              />


              <ContractDetailRow
                label="Ngày kết thúc"
                value={
                  formatDate(
                    contract.end_date
                  )
                }
              />


              <ContractDetailRow
                label="Số người ở"
                value={
                  String(
                    contract.occupant_count
                  )
                }
              />


              <ContractDetailRow
                label="Tiền thuê"
                value={
                  formatMoney(
                    contract.monthly_rent
                  )
                }
              />

            </div>


            <div
              className="
                mt-5
                grid
                grid-cols-2
                gap-2
              "
            >

              <Link
                to={
                  `/rooms/${room.id}`
                }
                className="
                  inline-flex
                  h-10
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-[#ddd8ce]
                  bg-white
                  px-4
                  text-sm
                  font-semibold
                  text-[#172033]
                  transition
                  hover:border-[#d6a64c]
                  hover:bg-[#fffaf1]
                "
              >

                <Building2
                  size={16}
                />

                Xem phòng

              </Link>


              <Link
                to={
                  `/tenants/${tenant.id}`
                }
                className="
                  inline-flex
                  h-10
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-[#efced4]
                  bg-[#fcecef]
                  px-4
                  text-sm
                  font-semibold
                  text-[#b92f49]
                  transition
                  hover:border-[#e44763]
                "
              >

                <UserRound
                  size={16}
                />

                Xem khách

              </Link>

            </div>


            {isActive && hasPreparedCheckout === false && (

              <Button
                type="button"
                variant="outline"
                onClick={
                  () =>
                    setShowEndModal(
                      true
                    )
                }
                className="
                  mt-3
                  h-10
                  w-full
                  rounded-xl
                  border-red-200
                  bg-white
                  text-red-600
                  hover:bg-red-50
                  hover:text-red-700
                "
              >

                <FileText />

                Kết thúc hợp đồng

              </Button>

            )}

          </CardContent>

        </Card>


        {/* ===================================================
            DEPOSIT
        =================================================== */}

        <Card
          className="
            rounded-2xl
            border-[#e9e2d8]
            shadow-sm
          "
        >

          <CardHeader
            className="
              border-b
              border-[#eeeae2]
            "
          >

            <CardTitle
              className="
                flex
                items-center
                gap-2
                text-base
              "
            >

              <BadgeDollarSign
                size={18}
                className=
                  "text-[#d6a64c]"
              />

              Tiền cọc

            </CardTitle>


            <CardDescription>
              Theo dõi các khoản thu, hoàn và khấu trừ cọc.
            </CardDescription>

          </CardHeader>


          <CardContent
            className="p-5"
          >

            <div
              className="space-y-1"
            >

              <ContractDetailRow
                label="Cọc yêu cầu"
                value={
                  formatMoney(
                    deposit.required_amount
                  )
                }
              />


              <ContractDetailRow
                label="Tổng đã thu"
                value={
                  formatMoney(
                    deposit.total_collected
                  )
                }
              />


              <ContractDetailRow
                label="Tổng đã hoàn"
                value={
                  formatMoney(
                    deposit.total_refunded
                  )
                }
              />


              <ContractDetailRow
                label="Tổng khấu trừ"
                value={
                  formatMoney(
                    deposit.total_deducted
                  )
                }
              />


              <ContractDetailRow
                label="Tổng mất cọc"
                value={
                  formatMoney(
                    deposit.total_forfeited
                  )
                }
              />

            </div>


            <div
              className="
                mt-4
                flex
                items-center
                justify-between
                gap-4
                rounded-xl
                border
                border-[#ead9b7]
                bg-[#fffaf0]
                px-4
                py-4
              "
            >

              <div>

                <div
                  className="
                    text-xs
                    font-medium
                    text-[#8a6726]
                  "
                >
                  Cọc đang giữ
                </div>


                <strong
                  className="
                    mt-1
                    block
                    text-xl
                    text-[#172033]
                  "
                >
                  {formatMoney(
                    deposit.current_balance
                  )}
                </strong>

              </div>


              <div
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  bg-[#f5eddc]
                  text-[#9a762f]
                "
              >

                <ShieldCheck
                  size={19}
                />

              </div>

            </div>


            {isActive && (

              <div
                className="
                  mt-5
                  grid
                  grid-cols-1
                  gap-2
                  sm:grid-cols-3
                "
              >

                <Button
                  type="button"
                  onClick={
                    () =>
                      setTransactionType(
                        "COLLECT"
                      )
                  }
                  className="
                    h-10
                    rounded-xl
                    bg-[#122033]
                    text-white
                    hover:bg-[#20334d]
                  "
                >

                  <PlusCircle />

                  Thu cọc

                </Button>


                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    deposit.current_balance
                    <= 0
                  }
                  onClick={
                    () =>
                      setTransactionType(
                        "REFUND"
                      )
                  }
                  className="
                    h-10
                    rounded-xl
                    border-[#ead9b7]
                    text-[#8a6726]
                    hover:bg-[#fffaf0]
                  "
                >

                  <Undo2 />

                  Hoàn cọc

                </Button>


                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    deposit.current_balance
                    <= 0
                  }
                  onClick={
                    () =>
                      setTransactionType(
                        "DEDUCTION"
                      )
                  }
                  className="
                    h-10
                    rounded-xl
                    border-red-200
                    text-red-600
                    hover:bg-red-50
                    hover:text-red-700
                  "
                >

                  <MinusCircle />

                  Khấu trừ

                </Button>

              </div>

            )}

          </CardContent>

        </Card>

      </div>


      {/* =====================================================
          TENANTS IN CONTRACT
      ===================================================== */}

      <Card
        className="
          rounded-2xl
          border-[#e9e2d8]
          shadow-sm
        "
      >

        <CardHeader
          className="
            border-b
            border-[#eeeae2]
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

            <div>

              <CardTitle
                className="
                  flex
                  items-center
                  gap-2
                  text-base
                "
              >

                <UserRound
                  size={18}
                  className=
                    "text-[#e44763]"
                />

                Khách đang ở

              </CardTitle>


              <CardDescription>
                Khách chính và người ở cùng trong hợp đồng #{contract.id}.
              </CardDescription>

            </div>


            {isActive && (

              <Button
                type="button"
                disabled={
                  occupantProcessing
                }
                onClick={
                  handleOpenAddOccupant
                }
                className="
                  h-10
                  rounded-xl
                  bg-[#122033]
                  text-white
                  hover:bg-[#20334d]
                "
              >

                <UserPlus />

                Thêm người ở cùng

              </Button>

            )}

          </div>

        </CardHeader>


        <CardContent
          className="p-5"
        >

          <div
            className="
              grid
              grid-cols-1
              gap-3
              lg:grid-cols-2
            "
          >

            {contractTenants.map(
              (
                member
              ) => (

                <article
                  key={
                    `${member.role}-${member.id}`
                  }
                  className="
                    rounded-xl
                    border
                    border-[#ebe6dd]
                    bg-[#fffdf9]
                    p-4
                  "
                >

                  <div
                    className="
                      flex
                      items-start
                      justify-between
                      gap-4
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

                        <Link
                          to={
                            `/tenants/${member.id}`
                          }
                          className="
                            truncate
                            text-sm
                            font-semibold
                            text-[#172033]
                            transition
                            hover:text-[#b92f49]
                          "
                        >
                          {member.full_name}
                        </Link>


                        <Badge
                          variant="outline"
                          className={
                            member.role
                            === "PRIMARY"

                              ? `
                                border-[#efced4]
                                bg-[#fcecef]
                                text-[#b92f49]
                              `

                              : `
                                border-[#ead9b7]
                                bg-[#fffaf0]
                                text-[#8a6726]
                              `
                          }
                        >
                          {member.role
                            === "PRIMARY"
                              ? "Khách chính"
                              : "Người ở cùng"}
                        </Badge>

                      </div>


                      <div
                        className="
                          mt-3
                          space-y-1
                          text-xs
                          text-slate-500
                        "
                      >

                        <div>
                          Điện thoại:{" "}
                          <strong
                            className="
                              font-semibold
                              text-[#172033]
                            "
                          >
                            {member.phone
                              ||
                              "-"}
                          </strong>
                        </div>


                        <div>
                          CCCD:{" "}
                          <strong
                            className="
                              font-semibold
                              text-[#172033]
                            "
                          >
                            {member.citizen_id
                              ||
                              "-"}
                          </strong>
                        </div>

                      </div>

                    </div>


                    <div
                      className="
                        flex
                        shrink-0
                        gap-2
                      "
                    >

                      <Link
                        to={
                          `/tenants/${member.id}`
                        }
                        className="
                          inline-flex
                          h-9
                          items-center
                          justify-center
                          rounded-lg
                          border
                          border-[#ddd8ce]
                          bg-white
                          px-3
                          text-xs
                          font-semibold
                          text-[#172033]
                          transition
                          hover:border-[#d6a64c]
                          hover:bg-[#fffaf1]
                        "
                      >
                        Xem
                      </Link>


                      {isActive
                        &&
                        member.role
                        === "OCCUPANT"
                        &&
                        (

                          <button
                            type="button"
                            disabled={
                              occupantProcessing
                            }
                            onClick={
                              () =>
                                handleRemoveOccupant(
                                  member
                                )
                            }
                            className="
                              inline-flex
                              h-9
                              items-center
                              justify-center
                              gap-1.5
                              rounded-lg
                              border
                              border-red-200
                              bg-white
                              px-3
                              text-xs
                              font-semibold
                              text-red-600
                              transition
                              hover:bg-red-50
                              disabled:opacity-50
                            "
                          >

                            <Trash2
                              size={13}
                            />

                            Xóa khỏi phòng

                          </button>

                        )}

                    </div>

                  </div>

                </article>

              )
            )}

          </div>


          <div
            className="
              mt-4
              rounded-xl
              border
              border-[#eee9df]
              bg-[#fcfbf8]
              px-4
              py-3
              text-xs
              leading-5
              text-slate-500
            "
          >
            Khách chính là người đứng tên hợp đồng.
            Người ở cùng có hồ sơ khách riêng nhưng không tạo thêm hợp đồng mới cho cùng phòng.
          </div>

        </CardContent>

      </Card>


      {/* =====================================================
          DEPOSIT HISTORY
      ===================================================== */}

      <Card
        className="
          overflow-hidden
          rounded-2xl
          border-[#e9e2d8]
          shadow-sm
        "
      >

        <CardHeader
          className="
            border-b
            border-[#eeeae2]
          "
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

              <CardTitle
                className="
                  flex
                  items-center
                  gap-2
                  text-base
                "
              >

                <History
                  size={18}
                  className=
                    "text-[#d6a64c]"
                />

                Lịch sử tiền cọc

              </CardTitle>


              <CardDescription>
                Toàn bộ giao dịch cọc của hợp đồng #{contract.id}.
              </CardDescription>

            </div>


            <Badge
              variant="outline"
              className="
                border-[#e5dccb]
                bg-[#fffaf2]
                text-[#8a6726]
              "
            >
              {transactions.length} giao dịch
            </Badge>

          </div>

        </CardHeader>


        <CardContent
          className="p-0"
        >

          {transactions.length === 0 ? (

            <div
              className="
                flex
                min-h-48
                flex-col
                items-center
                justify-center
                px-5
                text-center
              "
            >

              <div
                className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-xl
                  bg-[#f5eddc]
                  text-[#9a762f]
                "
              >

                <WalletCards
                  size={21}
                />

              </div>


              <strong
                className="
                  mt-4
                  text-sm
                  text-[#172033]
                "
              >
                Chưa có giao dịch tiền cọc
              </strong>


              <p
                className="
                  mt-1
                  text-sm
                  text-slate-500
                "
              >
                Các giao dịch thu, hoàn hoặc khấu trừ sẽ xuất hiện ở đây.
              </p>

            </div>

          ) : (

            <div
              className="
                overflow-x-auto
              "
            >

              <table
                className="
                  w-full
                  min-w-[760px]
                  border-collapse
                  text-sm
                "
              >

                <thead
                  className="
                    bg-[#faf9f6]
                  "
                >

                  <tr
                    className="
                      border-b
                      border-[#eeeae2]
                    "
                  >

                    <th
                      className="
                        px-5
                        py-3
                        text-left
                        text-xs
                        font-semibold
                        uppercase
                        tracking-[0.08em]
                        text-slate-500
                      "
                    >
                      Mã
                    </th>


                    <th
                      className="
                        px-5
                        py-3
                        text-left
                        text-xs
                        font-semibold
                        uppercase
                        tracking-[0.08em]
                        text-slate-500
                      "
                    >
                      Loại
                    </th>


                    <th
                      className="
                        px-5
                        py-3
                        text-left
                        text-xs
                        font-semibold
                        uppercase
                        tracking-[0.08em]
                        text-slate-500
                      "
                    >
                      Số tiền
                    </th>


                    <th
                      className="
                        px-5
                        py-3
                        text-left
                        text-xs
                        font-semibold
                        uppercase
                        tracking-[0.08em]
                        text-slate-500
                      "
                    >
                      Ghi chú
                    </th>


                    <th
                      className="
                        px-5
                        py-3
                        text-left
                        text-xs
                        font-semibold
                        uppercase
                        tracking-[0.08em]
                        text-slate-500
                      "
                    >
                      Thời gian
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {transactions.map(
                    (
                      transaction
                    ) => (

                      <tr
                        key={
                          transaction.id
                        }
                        className="
                          border-b
                          border-[#f0ece5]
                          transition
                          last:border-0
                          hover:bg-[#fcfbf8]
                        "
                      >

                        <td
                          className="
                            px-5
                            py-4
                            font-semibold
                            text-[#172033]
                          "
                        >
                          #{transaction.id}
                        </td>


                        <td
                          className="
                            px-5
                            py-4
                          "
                        >

                          <TransactionBadge
                            type={
                              transaction.transaction_type
                            }
                          />

                        </td>


                        <td
                          className="
                            px-5
                            py-4
                            font-semibold
                            text-[#172033]
                          "
                        >
                          {formatMoney(
                            transaction.amount
                          )}
                        </td>


                        <td
                          className="
                            max-w-[280px]
                            px-5
                            py-4
                            text-slate-600
                          "
                        >
                          {transaction.note
                            ??
                            "-"}
                        </td>


                        <td
                          className="
                            whitespace-nowrap
                            px-5
                            py-4
                            text-slate-600
                          "
                        >

                          <span
                            className="
                              inline-flex
                              items-center
                              gap-1.5
                            "
                          >

                            <CalendarClock
                              size={14}
                              className=
                                "text-slate-400"
                            />

                            {formatDate(
                              transaction.created_at
                            )}

                          </span>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </CardContent>

      </Card>


      {/* =====================================================
          QUICK LINKS
      ===================================================== */}

      <Card
        className="
          rounded-2xl
          border-[#e9e2d8]
          shadow-sm
        "
      >

        <CardContent
          className="
            grid
            grid-cols-1
            gap-3
            p-5
            sm:grid-cols-3
          "
        >

          <Link
            to={
              `/rooms/${room.id}`
            }
            className="
              flex
              items-center
              justify-between
              rounded-xl
              border
              border-[#ebe6dd]
              px-4
              py-4
              transition
              hover:border-[#d6a64c]
              hover:bg-[#fffaf1]
            "
          >

            <div
              className="
                flex
                items-center
                gap-3
              "
            >

              <Building2
                size={18}
                className=
                  "text-[#9a762f]"
              />

              <span
                className="
                  text-sm
                  font-semibold
                  text-[#172033]
                "
              >
                Phòng {room.room_code}
              </span>

            </div>


            <ArrowUpRight
              size={16}
            />

          </Link>


          <Link
            to={
              `/tenants/${tenant.id}`
            }
            className="
              flex
              items-center
              justify-between
              rounded-xl
              border
              border-[#ebe6dd]
              px-4
              py-4
              transition
              hover:border-[#e44763]
              hover:bg-[#fcecef]
            "
          >

            <div
              className="
                flex
                items-center
                gap-3
              "
            >

              <UserRound
                size={18}
                className=
                  "text-[#b92f49]"
              />

              <span
                className="
                  truncate
                  text-sm
                  font-semibold
                  text-[#172033]
                "
              >
                {tenant.full_name}
              </span>

            </div>


            <ArrowUpRight
              size={16}
            />

          </Link>


          <Link
            to="/contracts"
            className="
              flex
              items-center
              justify-between
              rounded-xl
              border
              border-[#ebe6dd]
              px-4
              py-4
              transition
              hover:border-[#d6a64c]
              hover:bg-[#fffaf1]
            "
          >

            <div
              className="
                flex
                items-center
                gap-3
              "
            >

              <FileText
                size={18}
                className=
                  "text-[#20334d]"
              />

              <span
                className="
                  text-sm
                  font-semibold
                  text-[#172033]
                "
              >
                Danh sách hợp đồng
              </span>

            </div>


            <ArrowUpRight
              size={16}
            />

          </Link>

        </CardContent>

      </Card>



      </div>


      {/* =====================================================
          ADD OCCUPANT MODAL
      ===================================================== */}

      {showAddOccupantModal && (

        <div
          className="
            fixed
            inset-0
            z-[110]
            flex
            items-end
            justify-center
            bg-slate-950/45
            sm:items-center
            sm:p-4
          "
        >

          <div
            className="
              flex
              max-h-[72vh]
              w-full
              max-w-lg
              flex-col
              overflow-hidden
              rounded-t-3xl
              border
              border-[#e9e2d8]
              bg-white
              shadow-2xl
              sm:rounded-2xl
            "
          >

            <div
              className="
                shrink-0
                border-b
                border-[#eeeae2]
                px-4
                py-4
                sm:px-5
              "
            >

              <div
                className="
                  mx-auto
                  mb-3
                  h-1
                  w-10
                  rounded-full
                  bg-slate-200
                  sm:hidden
                "
              />


              <div
                className="
                  flex
                  items-start
                  justify-between
                  gap-4
                "
              >

                <div className="min-w-0">

                  <h2
                    className="
                      text-base
                      font-semibold
                      text-[#172033]
                      sm:text-lg
                    "
                  >
                    Thêm người ở cùng
                  </h2>


                  <p
                    className="
                      mt-1
                      text-xs
                      text-slate-500
                      sm:text-sm
                    "
                  >
                    Chọn khách để thêm vào phòng {room.room_code}.
                  </p>

                </div>


                <button
                  type="button"
                  disabled={
                    occupantProcessing
                  }
                  onClick={
                    () => {

                      setShowAddOccupantModal(
                        false
                      );

                      setSelectedOccupantTenantId(
                        ""
                      );

                      setOccupantSearch(
                        ""
                      );

                    }
                  }
                  className="
                    shrink-0
                    rounded-lg
                    px-2
                    py-1
                    text-sm
                    font-semibold
                    text-slate-500
                    transition
                    hover:bg-slate-100
                    hover:text-[#172033]
                    disabled:opacity-50
                  "
                >
                  Đóng
                </button>

              </div>

            </div>


            <div
              className="
                min-h-0
                flex-1
                space-y-3
                overflow-hidden
                px-4
                py-4
                sm:px-5
              "
            >

              {availableOccupantTenants.length === 0 ? (

                <div
                  className="
                    rounded-xl
                    border
                    border-amber-200
                    bg-amber-50
                    px-4
                    py-4
                    text-sm
                    leading-6
                    text-amber-800
                  "
                >
                  Không còn khách thuê nào trong danh sách để thêm.
                  Hãy tạo hồ sơ khách mới ở mục Khách thuê trước.
                </div>

              ) : (

                <>

                  <div className="relative">

                    <Search
                      size={17}
                      className="
                        pointer-events-none
                        absolute
                        left-3
                        top-1/2
                        -translate-y-1/2
                        text-slate-400
                      "
                    />


                    <input
                      type="search"
                      value={
                        occupantSearch
                      }
                      onChange={
                        (
                          event
                        ) => {

                          setOccupantSearch(
                            event.target.value
                          );

                          setSelectedOccupantTenantId(
                            ""
                          );

                        }
                      }
                      placeholder="Tìm tên, SĐT hoặc CCCD..."
                      autoComplete="off"
                      className="
                        h-11
                        w-full
                        rounded-xl
                        border
                        border-[#ddd9cf]
                        bg-white
                        pl-10
                        pr-3
                        text-base
                        text-[#172033]
                        outline-none
                        focus:border-[#d6a64c]
                      "
                    />

                  </div>


                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      gap-3
                      text-[11px]
                      text-slate-500
                    "
                  >

                    <span>
                      {filteredAvailableOccupantTenants.length}
                      {" "}
                      khách phù hợp
                    </span>


                    {selectedOccupantTenantId && (

                      <button
                        type="button"
                        onClick={
                          () =>
                            setSelectedOccupantTenantId(
                              ""
                            )
                        }
                        className="
                          font-semibold
                          text-[#b92f49]
                        "
                      >
                        Bỏ chọn
                      </button>

                    )}

                  </div>


                  <div
                    className="
                      max-h-[300px]
                      overflow-y-auto
                      rounded-xl
                      border
                      border-[#eee9df]
                      bg-[#fcfbf8]
                    "
                  >

                    {filteredAvailableOccupantTenants.length === 0 ? (

                      <div
                        className="
                          px-4
                          py-8
                          text-center
                          text-sm
                          text-slate-500
                        "
                      >
                        Không tìm thấy khách phù hợp.
                      </div>

                    ) : (

                      filteredAvailableOccupantTenants.map(
                        (
                          item
                        ) => {

                          const selected =
                            selectedOccupantTenantId
                            ===
                            String(
                              item.id
                            );


                          return (

                            <button
                              key={
                                item.id
                              }
                              type="button"
                              onClick={
                                () =>
                                  setSelectedOccupantTenantId(
                                    String(
                                      item.id
                                    )
                                  )
                              }
                              className={
                                selected

                                  ? `
                                    flex
                                    w-full
                                    items-center
                                    gap-3
                                    border-b
                                    border-[#eee9df]
                                    bg-[#fff8e9]
                                    px-3
                                    py-3
                                    text-left
                                    last:border-b-0
                                  `

                                  : `
                                    flex
                                    w-full
                                    items-center
                                    gap-3
                                    border-b
                                    border-[#eee9df]
                                    bg-white
                                    px-3
                                    py-3
                                    text-left
                                    transition
                                    last:border-b-0
                                    hover:bg-[#fffdf9]
                                  `
                              }
                            >

                              <span
                                className={
                                  selected

                                    ? `
                                      flex
                                      h-5
                                      w-5
                                      shrink-0
                                      items-center
                                      justify-center
                                      rounded-full
                                      border
                                      border-[#d6a64c]
                                    `

                                    : `
                                      flex
                                      h-5
                                      w-5
                                      shrink-0
                                      items-center
                                      justify-center
                                      rounded-full
                                      border
                                      border-slate-300
                                    `
                                }
                              >

                                {selected && (

                                  <span
                                    className="
                                      h-2.5
                                      w-2.5
                                      rounded-full
                                      bg-[#d6a64c]
                                    "
                                  />

                                )}

                              </span>


                              <span
                                className="
                                  min-w-0
                                  flex-1
                                "
                              >

                                <span
                                  className="
                                    block
                                    truncate
                                    text-sm
                                    font-semibold
                                    text-[#172033]
                                  "
                                >
                                  {item.full_name}
                                </span>


                                <span
                                  className="
                                    mt-0.5
                                    block
                                    truncate
                                    text-xs
                                    text-slate-500
                                  "
                                >
                                  {item.phone
                                    ||
                                    "Chưa có SĐT"}

                                  {item.citizen_id
                                    ? ` • CCCD ${item.citizen_id}`
                                    : ""}
                                </span>

                              </span>

                            </button>

                          );

                        }
                      )

                    )}

                  </div>


                  <div
                    className="
                      rounded-xl
                      border
                      border-[#eee9df]
                      bg-[#fffdf9]
                      px-3
                      py-2.5
                      text-[11px]
                      leading-5
                      text-slate-500
                    "
                  >
                    Khách đang thuộc một hợp đồng ACTIVE khác sẽ bị backend chặn.
                  </div>

                </>

              )}

            </div>


            <div
              className="
                flex
                shrink-0
                justify-end
                gap-2
                border-t
                border-[#eeeae2]
                bg-[#fcfbf8]
                px-4
                py-3
                sm:px-5
                sm:py-4
              "
            >

              <Button
                type="button"
                variant="outline"
                disabled={
                  occupantProcessing
                }
                onClick={
                  () => {

                    setShowAddOccupantModal(
                      false
                    );

                    setSelectedOccupantTenantId(
                      ""
                    );

                    setOccupantSearch(
                      ""
                    );

                  }
                }
                className="
                  h-10
                  rounded-xl
                  border-[#ddd8ce]
                "
              >
                Hủy
              </Button>


              <Button
                type="button"
                disabled={
                  occupantProcessing
                  ||
                  availableOccupantTenants.length === 0
                  ||
                  !selectedOccupantTenantId
                }
                onClick={
                  handleAddOccupant
                }
                className="
                  h-10
                  rounded-xl
                  bg-[#122033]
                  text-white
                  hover:bg-[#20334d]
                "
              >

                {occupantProcessing ? (

                  <RefreshCw
                    className="animate-spin"
                  />

                ) : (

                  <UserPlus />

                )}


                {occupantProcessing
                  ? "Đang thêm..."
                  : "Thêm vào phòng"}

              </Button>

            </div>

          </div>

        </div>

      )}


      {/* =====================================================
          SHARED MODALS
      ===================================================== */}

      {transactionType && (

        <DepositTransactionModal
          open={true}
          contractId={
            contract.id
          }
          transactionType={
            transactionType
          }
          currentBalance={
            deposit.current_balance
          }
          onClose={
            () =>
              setTransactionType(
                null
              )
          }
          onCreated={
            handleTransactionCreated
          }
        />

      )}


      <EndContractModal
        open={
          showEndModal
        }
        contract={
          contract
        }
        depositBalance={
          deposit.current_balance
        }
        onClose={
          () =>
            setShowEndModal(
              false
            )
        }
        onEnded={
          handleContractEnded
        }
      />

    </div>

  );

}


// =========================================================
// MOBILE DEPOSIT STAT
// =========================================================

function MobileDepositStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {

  return (

    <div
      className="
        rounded-xl
        border
        border-[#eee9df]
        bg-[#fffdf9]
        px-3
        py-3
      "
    >

      <div
        className="
          text-[11px]
          text-slate-500
        "
      >
        {label}
      </div>


      <strong
        className="
          mt-1
          block
          text-sm
          text-[#172033]
        "
      >
        {value}
      </strong>

    </div>

  );

}



// =========================================================
// STAT CARD
// =========================================================

function ContractDetailStat({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
  danger = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  accent?:
    | "rose"
    | "gold";
  danger?: boolean;
}) {

  return (

    <Card
      className="
        rounded-2xl
        border-[#e9e2d8]
        shadow-sm
      "
    >

      <CardContent
        className="
          flex
          items-center
          justify-between
          gap-4
          p-5
        "
      >

        <div
          className="min-w-0"
        >

          <div
            className="
              text-sm
              text-slate-500
            "
          >
            {title}
          </div>


          <div
            className={
              danger

                ? `
                  mt-2
                  truncate
                  text-xl
                  font-semibold
                  text-red-600
                `

                : `
                  mt-2
                  truncate
                  text-xl
                  font-semibold
                  text-[#172033]
                `
            }
          >
            {value}
          </div>


          <div
            className="
              mt-2
              truncate
              text-xs
              text-slate-500
            "
          >
            {subtitle}
          </div>

        </div>


        <div
          className={
            danger

              ? `
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-red-50
                text-red-600
              `

              : accent
                === "rose"

                ? `
                  flex
                  h-11
                  w-11
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-[#fcecef]
                  text-[#b92f49]
                `

                : accent
                  === "gold"

                  ? `
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#f5eddc]
                    text-[#9a762f]
                  `

                  : `
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#eef1f5]
                    text-[#20334d]
                  `
          }
        >

          <Icon
            size={21}
          />

        </div>

      </CardContent>

    </Card>

  );

}


// =========================================================
// DETAIL ROW
// =========================================================

function ContractDetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {

  return (

    <div
      className="
        flex
        items-center
        justify-between
        gap-4
        border-b
        border-[#f0ece5]
        py-3
        last:border-0
      "
    >

      <span
        className="
          text-sm
          text-slate-500
        "
      >
        {label}
      </span>


      <strong
        className="
          max-w-[60%]
          break-words
          text-right
          text-sm
          font-semibold
          text-[#172033]
        "
      >
        {value}
      </strong>

    </div>

  );

}


// =========================================================
// TRANSACTION BADGE
// =========================================================

function TransactionBadge({
  type,
}: {
  type:
    DepositTransactionType;
}) {

  if (
    type === "COLLECT"
  ) {

    return (

      <Badge
        variant="outline"
        className="
          border-emerald-200
          bg-emerald-50
          text-emerald-700
        "
      >
        <PlusCircle />

        {getTransactionLabel(
          type
        )}
      </Badge>

    );

  }


  if (
    type === "REFUND"
  ) {

    return (

      <Badge
        variant="outline"
        className="
          border-[#ead9b7]
          bg-[#fffaf0]
          text-[#8a6726]
        "
      >
        <Undo2 />

        {getTransactionLabel(
          type
        )}
      </Badge>

    );

  }


  return (

    <Badge
      variant="outline"
      className="
        border-red-200
        bg-red-50
        text-red-700
      "
    >
      <MinusCircle />

      {getTransactionLabel(
        type
      )}
    </Badge>

  );

}


export default ContractDetails;