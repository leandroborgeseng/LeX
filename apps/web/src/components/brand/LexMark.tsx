import { cn } from '@/lib/utils';

type Props = { className?: string; withWordmark?: boolean };

/** Marca LeX — gradiente azul → verde no ícone; wordmark tricolor. */
export function LexMark({ className, withWordmark = true }: Props) {
  return (
    <div className={cn('flex items-center gap-2', className)} aria-hidden={!withWordmark}>
      <svg
        viewBox="0 0 40 40"
        className="h-9 w-9 shrink-0 drop-shadow-[0_0_16px_rgba(14,165,233,0.5)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="lex-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="45%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="12" fill="url(#lex-logo-grad)" />
        <path
          d="M11 28V12h4.2l4.8 9.2L24.8 12H29v16h-3.8v-9.2L20.4 28h-2.8l-4.8-9.2V28H11z"
          fill="#ffffff"
          fillOpacity="0.96"
        />
      </svg>
      {withWordmark && (
        <span className="bg-gradient-to-r from-sky-400 via-white to-emerald-400 bg-clip-text text-xl font-bold tracking-tight text-transparent drop-shadow-sm">
          LeX
        </span>
      )}
    </div>
  );
}
