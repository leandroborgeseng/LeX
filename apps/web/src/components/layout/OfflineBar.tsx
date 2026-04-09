import { useCallback, useEffect, useState } from 'react';
import { WifiOff, RefreshCw, CloudUpload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { outboxCount } from '@/lib/offline-queue';
import { syncOutboxNow } from '@/lib/api';

export function OfflineBar() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshCount = useCallback(async () => {
    setPending(await outboxCount());
  }, []);

  useEffect(() => {
    void refreshCount();
    const onOutbox = () => void refreshCount();
    window.addEventListener('lex-outbox', onOutbox);
    return () => window.removeEventListener('lex-outbox', onOutbox);
  }, [refreshCount]);

  useEffect(() => {
    if (navigator.onLine) {
      void syncOutboxNow().finally(() => void refreshCount());
    }
  }, [refreshCount]);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  async function onSync() {
    setSyncing(true);
    try {
      await syncOutboxNow();
    } finally {
      setSyncing(false);
    }
  }

  if (online && pending === 0) return null;

  return (
    <div
      className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-amber-950/90 px-3 py-2 text-sm text-amber-50 backdrop-blur-sm md:rounded-md md:border md:px-4"
      role="status"
    >
      <div className="flex items-center gap-2 min-w-0">
        {!online && (
          <>
            <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
            <span className="font-medium">Sem rede</span>
            <span className="text-amber-200/90">
              Alterações ficam na fila e enviamos quando voltar a internet.
            </span>
          </>
        )}
        {online && pending > 0 && (
          <>
            <CloudUpload className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              {pending} {pending === 1 ? 'alteração na fila' : 'alterações na fila'}
            </span>
          </>
        )}
      </div>
      {online && pending > 0 && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="shrink-0 touch-manipulation gap-1 bg-amber-100 text-amber-950 hover:bg-amber-200"
          disabled={syncing}
          onClick={() => void onSync()}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
          Sincronizar
        </Button>
      )}
    </div>
  );
}
