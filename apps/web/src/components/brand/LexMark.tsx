import { cn } from '@/lib/utils';

type Props = { className?: string; /** @deprecated Compatibilidade. */ withWordmark?: boolean };

const LOGO_SRC = '/lex-logo.png';

/**
 * Marca LeX — logótipo oficial (LeX + swoosh), ficheiro em `/public/lex-logo.png`.
 */
export function LexMark({ className }: Props) {
  return (
    <div className={cn('flex items-center bg-transparent', className)}>
      <img
        src={LOGO_SRC}
        alt="LeX"
        className="h-10 w-auto max-w-[min(100%,240px)] object-contain object-left bg-transparent"
        width={200}
        height={56}
        decoding="async"
      />
    </div>
  );
}
