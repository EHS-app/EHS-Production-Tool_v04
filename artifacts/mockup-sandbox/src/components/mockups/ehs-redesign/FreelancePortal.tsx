import {
  Activity,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Command,
  Download,
  HelpCircle,
  Inbox,
  MapPin,
  MoreHorizontal,
  Search,
  Share2,
  Star,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ehsLogo from "./ehs-logo.png";

const SIDEBAR_BG = "#1C1C24";
const SURFACE = "#25252F";
const PURPLE = "#7B5BFF";

const NAV = [
  { id: "hub", label: "Hub", icon: Activity, badge: null as number | null },
  { id: "briefs", label: "Forespørsler", icon: Inbox, badge: 3 },
  { id: "gigs", label: "Oppdrag", icon: Calendar, badge: 7 },
  { id: "availability", label: "Tilgjengelighet", icon: Clock, badge: null },
  { id: "earnings", label: "Inntekter", icon: Wallet, badge: null },
  { id: "profile", label: "Profil", icon: User, badge: null },
  { id: "help", label: "Hjelp", icon: HelpCircle, badge: null },
];

const Pill = ({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "success" | "warning" | "danger" | "neutral" | "purple";
}) => {
  const map = {
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    danger: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    purple: "bg-[#7B5BFF]/12 text-[#A48BFF] border-[#7B5BFF]/25",
    neutral: "bg-white/5 text-gray-300 border-white/10",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border",
        map[tone],
      )}
    >
      {children}
    </span>
  );
};

const Card = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "rounded-xl border border-white/5 overflow-hidden",
      className,
    )}
    style={{ background: SURFACE }}
  >
    {children}
  </div>
);

export function FreelancePortal() {
  return (
    <div
      className="min-h-screen flex text-gray-200"
      style={{
        background: "#161620",
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* SIDEBAR */}
      <aside
        className="w-[240px] flex flex-col border-r border-white/5"
        style={{ background: SIDEBAR_BG }}
      >
        {/* Workspace block */}
        <div className="relative flex flex-col items-center justify-center px-4 pt-5 pb-4 border-b border-white/5">
          <div className="w-[132px] h-[52px] flex items-center justify-center">
            <img
              src={ehsLogo}
              alt="EHS"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="mt-2.5 text-[12.5px] font-semibold tracking-wide text-gray-100">
            Freelance Portal
          </div>
          <ChevronDown
            size={14}
            className="absolute top-3.5 right-3 text-gray-500"
          />
        </div>

        {/* Quick actions */}
        <div className="px-3 pt-3 space-y-1">
          <button className="w-full h-8 px-2.5 flex items-center gap-2 rounded-md text-[12.5px] text-gray-400 hover:bg-white/[0.04] transition">
            <Search size={13} />
            <span className="flex-1 text-left">Søk i oppdrag</span>
            <span className="flex items-center gap-0.5">
              <kbd className="px-1 h-4 flex items-center rounded bg-white/5 border border-white/10 text-[10px]">
                <Command size={9} />
              </kbd>
              <kbd className="px-1 h-4 flex items-center rounded bg-white/5 border border-white/10 text-[10px]">
                K
              </kbd>
            </span>
          </button>
          <button className="w-full h-8 px-2.5 flex items-center gap-2 rounded-md text-[12.5px] text-gray-400 hover:bg-white/[0.04] transition">
            <Calendar size={13} />
            <span className="flex-1 text-left">Marker tilgjengelig</span>
            <kbd className="px-1 h-4 flex items-center rounded bg-white/5 border border-white/10 text-[10px]">
              T
            </kbd>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 mt-4 overflow-y-auto">
          <div className="text-[10px] font-semibold tracking-[0.08em] text-gray-500 uppercase px-2.5 mb-1.5">
            Arbeid
          </div>
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.id === "hub";
            return (
              <button
                key={item.id}
                className={cn(
                  "w-full h-8 px-2.5 flex items-center gap-2.5 rounded-md text-[13px] transition",
                  active
                    ? "text-[#A48BFF]"
                    : "text-gray-300 hover:bg-white/[0.03]",
                )}
                style={
                  active
                    ? { background: "rgba(123,91,255,0.12)" }
                    : undefined
                }
              >
                <Icon size={15} strokeWidth={1.75} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge != null && item.badge > 0 ? (
                  <span className="text-[11px] text-gray-400">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className="mx-3 mb-3 mt-2 p-2 rounded-lg flex items-center gap-2 border border-white/5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
            style={{ background: PURPLE }}
          >
            OL
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-gray-100 truncate">
              Ola Larsen
            </div>
            <div className="text-[10.5px] text-gray-500">Freelancer</div>
          </div>
          <button className="w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:bg-white/5">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header
          className="h-16 flex items-center justify-between px-6 border-b border-white/5 sticky top-0 z-10"
          style={{ background: "rgba(22,22,32,0.85)", backdropFilter: "blur(8px)" }}
        >
          <div className="flex items-center gap-2.5 text-[13px]">
            <button className="text-gray-400 hover:text-gray-200">
              Portal
            </button>
            <span className="text-gray-600">/</span>
            <span className="text-gray-100 font-medium">Hub</span>
            <Pill tone="success">
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                style={{ boxShadow: "0 0 6px rgb(52 211 153 / 0.8)" }}
              />
              Tilgjengelig denne uka
            </Pill>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-8 px-3 flex items-center gap-1.5 rounded-md text-[12.5px] text-gray-300 border border-white/10 hover:bg-white/5">
              <Download size={13} />
              CV
            </button>
            <button
              className="h-8 px-3 flex items-center gap-1.5 rounded-md text-[12.5px] text-white border"
              style={{
                background: PURPLE,
                borderColor: PURPLE,
                boxShadow: "0 0 14px rgba(123,91,255,0.28)",
              }}
            >
              <Share2 size={13} />
              Del profil
            </button>
            <button className="w-8 h-8 rounded-md flex items-center justify-center text-gray-400 hover:bg-white/5">
              <Bell size={14} />
            </button>
            <div className="ml-1 px-2 h-7 rounded border border-white/10 text-[11px] text-gray-400 flex items-center">
              NO
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 px-8 py-7 overflow-y-auto">
          <div className="max-w-[1100px] mx-auto">
            <div className="flex items-end justify-between mb-1">
              <div>
                <div className="text-[11px] uppercase tracking-[0.1em] text-gray-500">
                  God morgen, Ola
                </div>
                <h1 className="text-[28px] font-semibold text-gray-50 mt-1">
                  Din uke som freelancer
                </h1>
              </div>
              <div className="text-[12px] text-gray-500 flex items-center gap-1.5">
                <MapPin size={12} /> Oslo · Uke 19
              </div>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-4 gap-3 mt-6">
              {[
                {
                  label: "Bekreftede oppdrag",
                  value: "4",
                  sub: "denne uka",
                  tone: "success" as const,
                  icon: CheckCircle2,
                },
                {
                  label: "Forespørsler",
                  value: "3",
                  sub: "venter svar",
                  tone: "warning" as const,
                  icon: Inbox,
                },
                {
                  label: "Inntekt mai",
                  value: "kr 38 400",
                  sub: "+12 % vs april",
                  tone: "purple" as const,
                  icon: TrendingUp,
                },
                {
                  label: "Snittvurdering",
                  value: "4,9",
                  sub: "26 vurderinger",
                  tone: "neutral" as const,
                  icon: Star,
                },
              ].map((k) => {
                const Icon = k.icon;
                return (
                  <Card key={k.label} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                        {k.label}
                      </div>
                      <Icon size={14} className="text-gray-500" />
                    </div>
                    <div className="text-[22px] font-semibold text-gray-50 mt-2">
                      {k.value}
                    </div>
                    <div className="mt-1">
                      <Pill tone={k.tone}>{k.sub}</Pill>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Two columns */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              {/* Briefs / inbox */}
              <Card className="col-span-2">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Inbox size={14} className="text-gray-400" />
                    <h3 className="text-[13px] font-semibold text-gray-100">
                      Nye forespørsler
                    </h3>
                    <Pill tone="purple">3 nye</Pill>
                  </div>
                  <button className="text-[11.5px] text-gray-400 hover:text-gray-200 flex items-center gap-1">
                    Se alle <ChevronRight size={12} />
                  </button>
                </div>
                <div className="divide-y divide-white/5">
                  {[
                    {
                      client: "Sentrum Scene",
                      role: "Lyd-tekniker",
                      date: "fre 9. mai",
                      pay: "kr 4 800",
                      status: "Venter svar",
                      tone: "warning" as const,
                    },
                    {
                      client: "Oslo Konserthus",
                      role: "LED-operatør",
                      date: "lør 10. mai",
                      pay: "kr 5 200",
                      status: "Venter svar",
                      tone: "warning" as const,
                    },
                    {
                      client: "Røverstaden",
                      role: "Lys-tekniker",
                      date: "ons 14. mai",
                      pay: "kr 4 200",
                      status: "Ny",
                      tone: "purple" as const,
                    },
                  ].map((b) => (
                    <div
                      key={b.client}
                      className="flex items-center px-5 py-3.5 hover:bg-white/[0.02] cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-gray-100">
                          {b.client}
                        </div>
                        <div className="text-[11.5px] text-gray-500 mt-0.5">
                          {b.role} · {b.date}
                        </div>
                      </div>
                      <div className="text-right mr-4">
                        <div className="text-[13px] font-semibold text-gray-100">
                          {b.pay}
                        </div>
                      </div>
                      <Pill tone={b.tone}>{b.status}</Pill>
                      <ChevronRight
                        size={14}
                        className="text-gray-600 ml-3"
                      />
                    </div>
                  ))}
                </div>
              </Card>

              {/* Earnings sparkline-ish */}
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold text-gray-100">
                    Inntekter 2026
                  </h3>
                  <Pill tone="success">+12 %</Pill>
                </div>
                <div className="text-[24px] font-semibold text-gray-50 mt-3">
                  kr 184 200
                </div>
                <div className="text-[11px] text-gray-500">
                  hittil i år · 18 oppdrag
                </div>
                <div className="mt-5 flex items-end gap-1.5 h-[88px]">
                  {[28, 42, 36, 58, 49, 72, 64, 88, 76].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm"
                      style={{
                        height: `${h}%`,
                        background:
                          i === 7
                            ? PURPLE
                            : "rgba(123,91,255,0.25)",
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mt-2">
                  <span>jan</span>
                  <span>mar</span>
                  <span>mai</span>
                  <span>jul</span>
                  <span>sep</span>
                </div>
              </Card>
            </div>

            {/* Upcoming gigs */}
            <Card className="mt-4">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400" />
                  <h3 className="text-[13px] font-semibold text-gray-100">
                    Kommende oppdrag
                  </h3>
                </div>
                <button className="text-[11.5px] text-gray-400 hover:text-gray-200 flex items-center gap-1">
                  Tidsplan <ChevronRight size={12} />
                </button>
              </div>
              <div className="divide-y divide-white/5">
                {[
                  {
                    day: "MAN 5",
                    title: "Sentrum Scene — Hovedakt",
                    role: "Lyd FOH",
                    time: "16:00 – 23:30",
                    location: "Oslo",
                    status: "Bekreftet",
                    tone: "success" as const,
                  },
                  {
                    day: "ONS 7",
                    title: "Røverstaden — Klubbkveld",
                    role: "Lys-operatør",
                    time: "20:00 – 02:00",
                    location: "Oslo",
                    status: "Bekreftet",
                    tone: "success" as const,
                  },
                  {
                    day: "LØR 10",
                    title: "Oslo Konserthus — Gala",
                    role: "LED-operatør",
                    time: "14:00 – 22:00",
                    location: "Oslo",
                    status: "Tentativ",
                    tone: "warning" as const,
                  },
                ].map((g) => (
                  <div
                    key={g.day}
                    className="flex items-center px-5 py-3.5 hover:bg-white/[0.02]"
                  >
                    <div className="w-14 text-center mr-4">
                      <div className="text-[10px] uppercase tracking-wider text-gray-500">
                        {g.day.split(" ")[0]}
                      </div>
                      <div className="text-[18px] font-semibold text-gray-100 leading-none mt-0.5">
                        {g.day.split(" ")[1]}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-gray-100">
                        {g.title}
                      </div>
                      <div className="text-[11.5px] text-gray-500 mt-0.5 flex items-center gap-2">
                        <span>{g.role}</span>
                        <span className="text-gray-700">·</span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {g.time}
                        </span>
                        <span className="text-gray-700">·</span>
                        <span className="flex items-center gap-1">
                          <MapPin size={10} />
                          {g.location}
                        </span>
                      </div>
                    </div>
                    <Pill tone={g.tone}>{g.status}</Pill>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default FreelancePortal;
