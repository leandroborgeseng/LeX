import { useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { Button } from '@/components/ui/button';

/**
 * Com registerType: 'prompt', pede confirmação antes de ativar o novo service worker
 * (evita perder trabalho em formulários abertos).
 */
export function PwaUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | undefined>(undefined);

  useEffect(() => {
    const update = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        /* opcional: toast “pronto para uso offline” */
      },
    });
    updateSWRef.current = update;
  }, []);

  if (!needRefresh) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-border bg-card/98 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur-md md:left-auto md:right-4 md:bottom-4 md:max-w-md md:rounded-lg md:border"
      role="status"
    >
      <p className="mb-2 text-sm font-medium text-foreground">Nova versão do LeX disponível</p>
      <p className="mb-3 text-xs text-muted-foreground">
        Atualize para receber correções e melhorias. Guarde alterações em aberto antes de recarregar.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="touch-manipulation"
          onClick={() => {
            void updateSWRef.current?.(true);
          }}
        >
          Atualizar agora
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setNeedRefresh(false)}>
          Depois
        </Button>
      </div>
    </div>
  );
}
