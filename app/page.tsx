import { getSessionDestination } from "@/lib/auth/dal";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

// ── Ícones inline ────────────────────────────────────────────────────
function Ico({ children, size = 22, className = "" }: { children: React.ReactNode; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
         aria-hidden="true" className={className}>
      {children}
    </svg>
  );
}
const IcoArrowRight = (p: { size?: number }) => <Ico {...p}><path d="M4 12h15" /><path d="M13 6l6 6-6 6" /></Ico>;
const IcoArrowUpRight = (p: { size?: number }) => <Ico {...p}><path d="M7 17 17 7" /><path d="M8 7h9v9" /></Ico>;
const IcoArrowDown = (p: { size?: number }) => <Ico {...p}><path d="M12 4v15" /><path d="M6 13l6 6 6-6" /></Ico>;
const IcoCheck = (p: { size?: number }) => <Ico {...p}><path d="M4 12.5 9 17.5 20 6.5" /></Ico>;
const IcoCalendar = (p: { size?: number }) => <Ico {...p}><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></Ico>;
const IcoUsers = (p: { size?: number }) => <Ico {...p}><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16.5 5.3a3.2 3.2 0 0 1 0 5.6" /><path d="M18 14.6A6.5 6.5 0 0 1 21.5 20" /></Ico>;

// ── Logotipo ─────────────────────────────────────────────────────────
// dark  = sobre fundo escuro (usa logo-deutime-fundo-escuro.svg)
// mark  = só o ícone/escudo (usa icone-app-deutime.svg)
// light = fundo claro padrão (usa logo-deutime.svg)
function LogoDeuTime({ dark = false, mark = false, className = "" }: { dark?: boolean; mark?: boolean; className?: string }) {
  if (mark) {
    return (
      <Image
        src="/brand/icone-app-deutime.svg"
        alt="DeuTime"
        width={512}
        height={512}
        className={className}
      />
    );
  }
  return (
    <Image
      src={dark ? "/brand/logo-deutime-fundo-escuro.svg" : "/brand/logo-deutime.svg"}
      alt="DeuTime"
      width={580}
      height={140}
      priority={dark}
      className={className}
    />
  );
}

// ── Botão primário ────────────────────────────────────────────────────
function BtnPrimary({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href}
      className={"inline-flex items-center justify-center gap-2 rounded-full bg-volt px-8 py-4 " +
                 "font-display text-base font-semibold text-gramado " +
                 "hover:bg-apito hover:text-white active:scale-[.98] transition-all " +
                 "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-apito " + className}>
      {children} <IcoArrowRight size={18} />
    </Link>
  );
}

// ── Campo de futebol SVG ──────────────────────────────────────────────
const STRIPES = [
  ["60,420","1540,420","1434,344","166,344"],["166,344","1434,344","1342,278","258,278"],
  ["258,278","1342,278","1263.8,222","336.2,222"],["336.2,222","1263.8,222","1203.9,179","396.1,179"],
  ["396.1,179","1203.9,179","1153.7,143","446.3,143"],["446.3,143","1153.7,143","1111.8,113","488.2,113"],
  ["488.2,113","1111.8,113","1075.6,87","524.4,87"],["524.4,87","1075.6,87","1040.7,62","559.3,62"],
  ["559.3,62","1040.7,62","1010,40","590,40"],
];

function Field() {
  return (
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none select-none dt-field-mask w-[1500px] sm:w-[1800px] md:w-[2100px] lg:w-[2400px] max-w-none">
      <svg viewBox="0 0 1600 420" className="block w-full h-auto" aria-hidden="true">
        <defs>
          <linearGradient id="dtHaze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d2b22" stopOpacity="1" />
            <stop offset="55%" stopColor="#0d2b22" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0d2b22" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="dtGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#bdf63c" stopOpacity="0.4" />
            <stop offset="55%" stopColor="#bdf63c" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#bdf63c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="dtSweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#bdf63c" stopOpacity="0" />
            <stop offset="50%" stopColor="#e8ffb0" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#bdf63c" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="dt-pan">
          {STRIPES.map((pts, i) => (
            <polygon key={i} points={pts.join(" ")} fill={i % 2 ? "#103126" : "#153c2e"} />
          ))}
          <ellipse cx="800" cy="250" rx="440" ry="115" fill="url(#dtGlow)" className="dt-pulse-field" />
          <g className="dt-sweep">
            <rect x="0" y="30" width="420" height="400" fill="url(#dtSweep)" transform="skewX(-14)" />
          </g>
          <g fill="none" stroke="#eafcd0" strokeLinejoin="round" strokeLinecap="round">
            <polygon points="60,420 590,40 1010,40 1540,420" strokeWidth="3.5" strokeOpacity="0.5" />
            <line x1="396.1" y1="179" x2="1203.9" y2="179" strokeWidth="2.5" strokeOpacity="0.42" />
            <ellipse cx="800" cy="179" rx="152" ry="26" strokeWidth="2.5" strokeOpacity="0.42" />
            <polyline points="430,420 523,278 1077,278 1170,420" strokeWidth="3.5" strokeOpacity="0.46" />
            <polyline points="614,420 660,330 940,330 986,420" strokeWidth="3" strokeOpacity="0.4" />
            <path d="M660,330 Q800,296 940,330" strokeWidth="2.5" strokeOpacity="0.3" />
            <polyline points="640,40 655,62 945,62 960,40" strokeWidth="1.8" strokeOpacity="0.3" />
            <path d="M60,404 Q88,415 105,420" strokeWidth="2.5" strokeOpacity="0.35" />
            <path d="M1540,404 Q1512,415 1495,420" strokeWidth="2.5" strokeOpacity="0.35" />
          </g>
          <circle cx="800" cy="347" r="5" fill="#eafcd0" fillOpacity="0.5" />
          <circle cx="800" cy="179" r="3.5" fill="#eafcd0" fillOpacity="0.45" />
          <g stroke="#f7faf5" strokeOpacity="0.45" strokeWidth="3" fill="none" strokeLinecap="round">
            <path d="M735,40 V18 H865 V40" />
          </g>
        </g>
        <rect x="0" y="0" width="1600" height="235" fill="url(#dtHaze)" />
      </svg>
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────
function SiteHeader() {
  return (
    <header className="absolute top-0 left-0 right-0 z-50 px-4 py-5 sm:px-8 sm:py-7 lg:px-14">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <Link href="/" aria-label="DeuTime, página inicial" className="shrink-0">
          <LogoDeuTime dark mark className="h-9 w-auto sm:hidden" />
          <LogoDeuTime dark className="hidden sm:block h-9 md:h-10 w-auto" />
        </Link>
        <div className="flex items-center gap-1 sm:gap-4">
          <Link href="/auth/login"
            className="rounded-full px-2.5 py-2.5 sm:px-4 text-sm font-semibold text-cream/90 hover:text-volt transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt">
            Entrar
          </Link>
          <Link href="/auth/sign-up"
            className="inline-flex items-center gap-2 rounded-full bg-volt px-3.5 py-2.5 sm:px-6 sm:py-3 font-display text-sm font-semibold text-gramado whitespace-nowrap hover:bg-apito hover:text-white active:scale-[.98] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream">
            <span className="sm:hidden">Criar time</span>
            <span className="hidden sm:inline">Criar meu time</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

// ── Chat card (hero) ──────────────────────────────────────────────────
const CHAT = [
  { who: "out", text: "Bora quinta 20h? Preciso de 12 confirmados", time: "19:31" },
  { who: "in", name: "Rafa", text: "dentro", time: "19:32" },
  { who: "in", name: "Pedrão", text: "talvez… vejo depois do trampo", time: "19:34" },
  { who: "in", name: "Lipe", text: "se tiver colete eu vou", time: "19:47" },
  { who: "out", text: "gente, contei 7… quem mais??", time: "21:58" },
] as const;

function ChatCard() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      <span className="absolute -top-3 left-6 z-10 -rotate-2 rounded-full bg-apito px-3.5 py-1.5 font-display text-xs font-semibold text-white shadow-sm">
        Cena conhecida?
      </span>
      <div className="rounded-[28px] bg-white/[0.06] backdrop-blur-sm ring-1 ring-white/10 p-5 sm:p-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <span className="flex w-9 h-9 shrink-0 items-center justify-center rounded-full bg-cream/10 text-cream/80">
            <IcoUsers size={18} />
          </span>
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold text-cream truncate">Racha de Quinta</p>
            <p className="text-[11px] text-cream/50">14 no grupo · 3 responderam</p>
          </div>
        </div>
        <div className="mt-4 space-y-2.5">
          {CHAT.map((m, i) => (
            <div key={i} className={"flex " + (m.who === "out" ? "justify-end" : "justify-start")}>
              <div className={"dt-rise max-w-[85%] rounded-2xl px-3.5 py-2 " +
                              (m.who === "out" ? "rounded-br-md bg-volt text-gramado" : "rounded-bl-md bg-white/10 text-cream")}
                   style={{ animationDelay: (0.15 + i * 0.18) + "s" }}>
                {"name" in m && m.name && <p className="text-[11px] font-semibold text-volt/90">{m.name}</p>}
                <p className="text-sm leading-snug">
                  {m.text}
                  <span className={"ml-2 text-[10px] " + (m.who === "out" ? "text-gramado/50" : "text-cream/40")}>{m.time}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="dt-rise mt-5 flex items-center gap-3" style={{ animationDelay: "1.15s" }}>
          <span className="h-px flex-1 bg-white/10" />
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-cream/50">
            com o DeuTime vira <IcoArrowDown size={13} />
          </span>
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <div className="dt-rise mt-4 rounded-2xl bg-volt p-4 sm:p-5" style={{ animationDelay: "1.35s" }}>
          <div className="flex items-center gap-3">
            <LogoDeuTime mark className="h-10 w-auto shrink-0" />
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold text-gramado leading-tight">Deu time!</p>
              <p className="text-[13px] leading-snug text-gramado/70">12 confirmados · times divididos · ninguém cobrado na mão</p>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gramado/15">
            <div className="h-full w-full rounded-full bg-gramado" />
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-cream/40">Cena ilustrativa. A dor é real.</p>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative w-full overflow-hidden rounded-[28px] sm:rounded-[32px] md:rounded-[40px] shadow-sm ring-1 ring-black/5 bg-gramado dt-hero-h flex items-center justify-center">
      <Field />
      <SiteHeader />
      <div className="relative z-20 w-full max-w-6xl px-6 sm:px-10 pt-28 pb-36 md:pt-32 grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left dt-rise">
          <p className="inline-flex items-center gap-2 rounded-full border border-volt/30 bg-volt/10 px-4 py-1.5 text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-volt">
            <span className="w-1.5 h-1.5 rounded-full bg-volt dt-blink" />
            Pra quem carrega o racha nas costas
          </p>
          <h1 className="mt-7 font-display font-medium tracking-tight text-cream text-[2rem] sm:text-4xl md:text-5xl lg:text-6xl leading-[1.08]">
            Cansou de perguntar<br />
            <span className="text-volt">quem vai?</span>
          </h1>
          <p className="mt-5 max-w-md text-base sm:text-lg md:text-xl text-cream/85 leading-relaxed">
            A gente também. O DeuTime convoca a galera, cobra quem enrola e te avisa na hora que deu time. Você só marca o jogo — e joga.
          </p>
          <div className="mt-9 flex flex-col items-center lg:items-start gap-4 w-full sm:w-auto">
            <BtnPrimary href="/auth/sign-up" className="w-full sm:w-auto">Criar meu time</BtnPrimary>
            <p className="text-xs sm:text-sm text-cream/50">Leva 2 minutos. A galera entra por link, sem baixar nada.</p>
          </div>
        </div>
        <ChatCard />
      </div>
      {/* cutout invertido */}
      <div className="absolute bottom-0 right-0 z-30 bg-cream rounded-tl-[32px] md:rounded-tl-[40px] pt-6 pl-7 pb-6 pr-7 md:pt-8 md:pl-10 md:pb-8 md:pr-10">
        <div className="dt-notch absolute bottom-full right-0 w-8 h-8 md:w-10 md:h-10 pointer-events-none" />
        <div className="dt-notch absolute bottom-0 right-full w-8 h-8 md:w-10 md:h-10 pointer-events-none" />
        <Link href="/auth/sign-up" className="flex items-center gap-4 group">
          <span className="hidden sm:block text-left">
            <span className="block font-display text-lg font-medium text-gramado leading-tight">Bora dar time?</span>
            <span className="block text-sm text-gramado/60">Criar meu time agora</span>
          </span>
          <span className="w-12 h-12 shrink-0 rounded-full bg-black/5 group-hover:bg-volt transition-colors flex items-center justify-center text-gramado">
            <IcoArrowUpRight size={22} />
          </span>
        </Link>
      </div>
    </section>
  );
}

// ── Marquee ───────────────────────────────────────────────────────────
const MARQUEE_ITEMS = ["Deu time", "Tá no time", "Falta 1 pra dar time", "Deu jogo"] as const;

function MarqueeHalf() {
  return (
    <div className="flex items-center gap-10 pr-10">
      {[0, 1, 2].map((r) =>
        MARQUEE_ITEMS.map((t) => (
          <span key={r + t} className="flex items-center gap-10 whitespace-nowrap">
            <span className="flex items-center gap-2.5 font-display text-base sm:text-lg font-semibold uppercase tracking-wide text-gramado">
              {t}
              {t === "Deu time" && (
                <span className="flex w-5 h-5 items-center justify-center rounded-full bg-gramado text-volt">
                  <IcoCheck size={12} />
                </span>
              )}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-gramado/30" />
          </span>
        ))
      )}
    </div>
  );
}

function Marquee() {
  return (
    <section aria-hidden="true" className="mt-4 md:mt-6 w-full overflow-hidden rounded-[28px] sm:rounded-[32px] md:rounded-full bg-volt ring-1 ring-black/5 shadow-sm py-3.5 sm:py-4">
      <div className="flex w-max dt-marquee">
        <MarqueeHalf />
        <MarqueeHalf />
      </div>
    </section>
  );
}

// ── Como funciona ─────────────────────────────────────────────────────
const STEPS = [
  { tag: "você", n: "01", title: "Crie o time",
    text: "Dá um nome, escolhe a modalidade e joga o link no grupo. Cada um entra pelo próprio celular — você não cadastra ninguém na mão." },
  { tag: "você", n: "02", title: "Marque o jogo",
    text: "Quinta às 20h toda semana, ou o avulso de sábado. Marcou uma vez, a agenda roda sozinha." },
  { tag: "deutime", n: "03", title: "Ele convoca e cobra",
    text: "Chama todo mundo, lembra quem enrolou e mostra o placar de presença subindo em tempo real." },
  { tag: "deutime", n: "04", title: "Ele fecha e divide",
    text: "Bateu o número? Você recebe o \"deu time\" e os times saem equilibrados por nível e posição." },
] as const;

function How() {
  return (
    <section className="mt-4 md:mt-6 w-full rounded-[28px] sm:rounded-[32px] md:rounded-[40px] bg-gramado ring-1 ring-black/5 shadow-sm px-6 py-12 sm:px-10 sm:py-16 md:px-14 md:py-20">
      <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-volt">Como funciona</p>
      <h2 className="mt-4 max-w-2xl font-display text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] font-medium text-cream tracking-tight leading-[1.1]">
        Você faz duas coisas.<br />
        <span className="text-volt">O resto anda sozinho.</span>
      </h2>
      <ol className="mt-10 sm:mt-14 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ tag, n, title, text }) => (
          <li key={n} className="rounded-3xl bg-cream/[0.04] ring-1 ring-cream/10 p-6">
            <div className="flex items-center justify-between gap-3">
              <span className={"font-display text-3xl sm:text-4xl font-semibold " + (tag === "você" ? "text-volt" : "text-cream/80")}>{n}</span>
              <span className={"rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest " + (tag === "você" ? "bg-volt text-gramado" : "bg-cream/15 text-cream/90")}>
                {tag === "você" ? "Você faz" : "O DeuTime faz"}
              </span>
            </div>
            <h3 className="mt-5 font-display text-lg sm:text-xl font-medium text-cream leading-snug">{title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-cream/70">{text}</p>
          </li>
        ))}
      </ol>
      <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row items-center gap-5">
        <BtnPrimary href="/auth/sign-up" className="w-full sm:w-auto">Criar meu time</BtnPrimary>
        <p className="text-sm text-cream/55">Sua parte acaba no passo 2.</p>
      </div>
    </section>
  );
}

// ── Tela de quinta-feira ──────────────────────────────────────────────
function Stat({ n, label, accent }: { n: string; label: string; accent: string }) {
  return (
    <div className="min-w-[72px]">
      <div className={"font-display text-2xl sm:text-3xl font-semibold " + accent}>{n}</div>
      <div className="mt-1 text-[10px] sm:text-xs uppercase tracking-widest text-ink/50">{label}</div>
    </div>
  );
}

function Screen() {
  return (
    <section className="mt-4 md:mt-6 w-full rounded-[28px] sm:rounded-[32px] md:rounded-[40px] bg-white/55 ring-1 ring-black/5 shadow-sm px-6 py-12 sm:px-10 sm:py-16 md:px-14 md:py-20 lg:flex lg:items-center lg:gap-16">
      <div className="lg:w-[42%] shrink-0">
        <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-apito">Quinta-feira, 17h40</p>
        <h2 className="mt-4 font-display text-2xl sm:text-3xl md:text-4xl font-medium text-gramado tracking-tight leading-[1.1]">
          Uma olhada e você já sabe: tem jogo.
        </h2>
        <p className="mt-5 text-base sm:text-lg text-ink/70 leading-relaxed">
          O placar de presença mora na primeira tela. Ninguém te pergunta &quot;vai ter?&quot; — e você não pergunta &quot;quem vai?&quot;. O aviso de que deu time chega sozinho.
        </p>
      </div>
      <div className="mt-10 lg:mt-0 lg:flex-1">
        <div className="mx-auto max-w-md rounded-[28px] bg-white shadow-lg ring-1 ring-black/5 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink/45">Próximo jogo</p>
              <h3 className="mt-1.5 font-display text-xl sm:text-2xl font-medium text-gramado">Racha de quinta</h3>
            </div>
            <span className="shrink-0 rounded-full bg-ink/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-ink/45">Exemplo</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink/60">
            <span className="inline-flex items-center gap-1.5"><IcoCalendar size={16} /> Quinta, 20:00</span>
            <span className="inline-flex items-center gap-1.5"><IcoUsers size={16} /> Society</span>
          </div>
          <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-ink/[0.08]">
            <div className="h-full w-full rounded-full bg-volt" />
          </div>
          <div className="mt-5 flex justify-between gap-4">
            <Stat n="12" label="Confirmados" accent="text-gramado" />
            <Stat n="0" label="Faltam" accent="text-gramado" />
            <Stat n="2" label="Não vão" accent="text-ink/40" />
          </div>
          <div className="mt-7 flex items-center gap-3 rounded-2xl bg-volt/20 px-4 py-3.5">
            <span className="flex w-8 h-8 shrink-0 items-center justify-center rounded-full bg-volt text-gramado">
              <IcoCheck size={18} />
            </span>
            <p className="font-display text-base font-semibold text-gramado">
              Deu time! <span className="font-sans font-normal text-ink/60">Times já divididos.</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Perguntas e respostas ─────────────────────────────────────────────
const QA = [
  { q: "E quando alguém fura em cima da hora?",
    a: "A lista de espera puxa o próximo automaticamente. Ninguém fica de secretário às 19h50." },
  { q: "Os times saem justos?",
    a: "Divisão equilibrada por nível e posição. Acaba a lenda de que \"o outro time levou os melhores\"." },
  { q: "Vou ter que fazer todo mundo baixar app?",
    a: "Não. A galera confirma por link, no WhatsApp que já usa. Sem instalar nada, sem criar senha." },
  { q: "Quem fez gol? Quem nunca vem?",
    a: "Súmula e estatísticas da temporada: presença, gols, assistências e cartões — só de quem realmente jogou." },
  { q: "Organizo dois rachas. Vira bagunça?",
    a: "Cada time é um mundo: elenco, agenda e dados isolados. Você alterna sem misturar nada." },
  { q: "E os telefones da galera?",
    a: "Ficam trancados no seu time: isolamento no banco, trilha de auditoria e meta de verificação OWASP ASVS nível 2. Contato de amigo não vira lista." },
] as const;

function Questions() {
  return (
    <section className="mt-4 md:mt-6 w-full rounded-[28px] sm:rounded-[32px] md:rounded-[40px] bg-white/55 ring-1 ring-black/5 shadow-sm px-6 py-12 sm:px-10 sm:py-16 md:px-14 md:py-20">
      <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-apito">Papo reto</p>
      <h2 className="mt-4 max-w-2xl font-display text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] font-medium text-gramado tracking-tight leading-[1.1]">
        Você ia perguntar. A gente já responde.
      </h2>
      <div className="mt-10 sm:mt-12 grid gap-4 sm:gap-5 md:grid-cols-2">
        {QA.map(({ q, a }) => (
          <div key={q} className="flex flex-col gap-4 rounded-3xl bg-white/70 ring-1 ring-black/5 p-6">
            <p className="self-end max-w-[92%] rounded-2xl rounded-br-md bg-gramado px-4 py-2.5 text-[15px] font-medium text-cream">
              {q}
            </p>
            <div className="flex items-start gap-3">
              <LogoDeuTime mark className="h-7 w-auto shrink-0 mt-0.5" />
              <p className="text-[15px] leading-relaxed text-ink/75">{a}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── CTA final ─────────────────────────────────────────────────────────
function FinalCta() {
  return (
    <section className="mt-4 md:mt-6 w-full rounded-[28px] sm:rounded-[32px] md:rounded-[40px] bg-volt ring-1 ring-black/5 shadow-sm px-6 py-14 sm:px-10 sm:py-20 md:px-14 md:py-24 text-center">
      <h2 className="mx-auto max-w-2xl font-display text-3xl sm:text-4xl md:text-5xl font-medium text-gramado tracking-tight leading-[1.08]">
        Quinta tá chegando.
      </h2>
      <p className="mx-auto mt-5 max-w-md text-base sm:text-lg text-gramado/75 leading-relaxed">
        Cria o time hoje, manda o link no grupo e chega no campo só pra jogar.
      </p>
      <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
        <Link href="/auth/sign-up"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gramado px-8 py-4 font-display text-base font-semibold text-cream hover:bg-apito active:scale-[.98] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gramado">
          Criar meu time <IcoArrowRight size={18} />
        </Link>
        <Link href="/auth/login"
          className="inline-flex items-center justify-center rounded-full border-2 border-gramado/30 px-8 py-4 font-display text-base font-semibold text-gramado hover:border-gramado hover:bg-gramado/5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gramado">
          Já tenho conta
        </Link>
      </div>
    </section>
  );
}

// ── Rodapé ────────────────────────────────────────────────────────────
function SiteFooter() {
  return (
    <footer className="w-full px-6 sm:px-10 md:px-14 py-12 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-ink/60">
      <Link href="/" aria-label="DeuTime, página inicial">
        <LogoDeuTime className="h-8 w-auto" />
      </Link>
      <nav className="flex items-center gap-6">
        <Link href="/auth/login" className="hover:text-apito transition-colors">Entrar</Link>
        <Link href="/auth/sign-up" className="hover:text-apito transition-colors">Criar meu time</Link>
      </nav>
      <p className="text-center sm:text-right">deutime.app · Construído no Brasil</p>
    </footer>
  );
}

// ── Página principal ──────────────────────────────────────────────────
export default async function Home() {
  const sessionDestination = await getSessionDestination();
  if (sessionDestination) redirect(sessionDestination);

  return (
    <div className="min-h-screen flex flex-col items-center bg-cream p-4 md:p-6 font-sans text-ink">
      <div className="w-full max-w-[1600px]">
        <Hero />
        <Marquee />
        <How />
        <Screen />
        <Questions />
        <FinalCta />
        <SiteFooter />
      </div>
    </div>
  );
}
