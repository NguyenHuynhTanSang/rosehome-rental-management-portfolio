import NotificationBell
  from "../NotificationBell";


type MobileHeaderProps = {

  userEmail:
    string;

  userInitial:
    string;

};


function MobileHeader({
  userEmail,
  userInitial,
}: MobileHeaderProps) {

  return (

    <header
      className="
        md:hidden
        sticky
        top-0
        z-40
        flex
        items-center
        justify-between
        border-b
        border-slate-200
        bg-white/95
        px-4
        py-3
        backdrop-blur
      "
    >

      {/* ==========================
          BRAND
      ========================== */}

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
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            overflow-hidden
            rounded-xl
            border
            border-slate-200
            bg-white
          "
        >

          <img
            src="/Rosehome.png"
            alt="Rosehome Apartment"
            className="
              h-full
              w-full
              object-contain
              p-1
            "
          />

        </div>


        <div
          className="
            min-w-0
          "
        >

          <div
            className="
              truncate
              text-sm
              font-bold
              text-slate-900
            "
          >
            Rosehome Apartment
          </div>


          <div
            className="
              truncate
              text-xs
              text-slate-500
            "
          >
            {userEmail}
          </div>

        </div>

      </div>


      {/* ==========================
          RIGHT
      ========================== */}

      <div
        className="
          flex
          shrink-0
          items-center
          gap-2
        "
      >

        <NotificationBell />


        <div
          className="
            flex
            h-9
            w-9
            items-center
            justify-center
            rounded-full
            border
            border-rose-200
            bg-rose-50
            text-sm
            font-bold
            text-rose-600
          "
          title={userEmail}
        >
          {userInitial}
        </div>

      </div>

    </header>

  );

}


export default MobileHeader;