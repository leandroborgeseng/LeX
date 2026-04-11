import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'lex_onboarding_dismissed';

export function OnboardingCard() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [hasEntity, setHasEntity] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    Promise.all([api.get<unknown[]>('/financial-entities'), api.get<unknown[]>('/bank-accounts')])
      .then(([ent, acc]) => {
        setHasEntity(ent.data.length > 0);
        setHasAccount(acc.data.length > 0);
      })
      .finally(() => setReady(true));
  }, [dismissed]);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  if (dismissed || !ready) return null;

  const steps = [
    { ok: hasEntity, label: 'Criar pelo menos uma entidade (PF ou PJ)', to: '/estrutura' },
    { ok: hasAccount, label: 'Cadastrar uma conta bancária', to: '/contas' },
  ];
  const allDone = steps.every((s) => s.ok);
  if (allDone) return null;

  return (
    <Card className="border-sky-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50/80 shadow-sm ring-1 ring-orange-100">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Primeiros passos</CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          aria-label="Dispensar checklist"
          onClick={dismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">
          Complete os itens abaixo para usar o LeX com mais conforto. Em seguida, abra <strong>Movimentos</strong> para
          lançar receitas e despesas. Pode fechar este cartão a qualquer momento.
        </p>
        <ul className="space-y-2">
          {steps.map((s) => (
            <li key={s.label}>
              <Link
                to={s.to}
                className={cn(
                  'flex items-start gap-2 rounded-md py-1 transition-colors hover:text-primary',
                  s.ok && 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                    s.ok ? 'border-primary bg-primary/15 text-primary' : 'border-border',
                  )}
                >
                  {s.ok ? <Check className="h-3 w-3" /> : null}
                </span>
                <span className={s.ok ? 'line-through' : ''}>{s.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
