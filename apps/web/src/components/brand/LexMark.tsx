import { cn } from '@/lib/utils';

type Props = { className?: string; withWordmark?: boolean };

/** Marca LeX — ícone + texto opcional. */
export function LexMark({ className, withWordmark = true }: Props) {
  return (
    <div className={cn('flex items-center gap-2', className)} aria-hidden={!withWordmark}>
      <svg
        viewBox="0 0 40 40"
        className="h-9 w-9 shrink-0 drop-shadow-[0_0_12px_rgba(56,189,248,0.35)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="lex-a" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="55%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="12" fill="url(#lex-a)" />
        <path
          d="M11 28V12h4.2l4.8 9.2L24.8 12H29v16h-3.8v-9.2L20.4 28h-2.8l-4.8-9.2V28H11z"
          fill="#0b1220"
          fillOpacity="0.92"
        />
      </svg>
      {withWordmark && (
        <span className="bg-gradient-to-r from-sky-300 via-violet-300 to-emerald-300 bg-clip-text text-xl font-bold tracking-tight text-transparent">
          LeX
        </span>
      )}
    </div>
  );
}
