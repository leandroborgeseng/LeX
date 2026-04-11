import { cn } from '@/lib/utils';

type Props = { className?: string; /** @deprecated Compatibilidade; o SVG já é só “LeX”. */ withWordmark?: boolean };

const LOGO_SRC = '/logo.svg';

/**
 * Marca LeX — texto “LeX” com cores da marca (`/public/logo.svg`, fundo transparente).
 */
export function LexMark({ className }: Props) {
  return (
    <div className={cn('flex items-center bg-transparent', className)}>
      <img
        src={LOGO_SRC}
        alt="LeX"
        className="h-10 w-auto max-w-[min(100%,240px)] object-contain object-left bg-transparent"
        width={200}
        height={100}
        decoding="async"
      />
    </div>
  );
}
