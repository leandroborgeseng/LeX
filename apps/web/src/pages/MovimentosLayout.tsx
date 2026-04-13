import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';

const tabs = [
  { to: 'receitas', label: 'Receitas' },
  { to: 'despesas', label: 'Despesas' },
  { to: 'planilha', label: 'Planilha' },
] as const;

export default function MovimentosLayout() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-lex-blue/[0.06] via-card to-lex-green/[0.08] p-4 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Movimentos</h1>
        <p className="text-sm text-muted-foreground">
          Registre entradas e saídas em um só lugar — toque numa linha para editar. Na planilha vê PF e PJ juntos,
          importa do Excel e lança impostos da empresa.
        </p>
      </div>

      <div className="flex gap-2 rounded-xl border border-border bg-muted/40 p-1.5">
        {tabs.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'min-h-11 flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-all touch-manipulation',
                isActive
                  ? to === 'receitas'
                    ? 'bg-lex-green/20 text-emerald-950 shadow-sm ring-1 ring-lex-green/40'
                    : to === 'despesas'
                      ? 'bg-lex-orange/20 text-orange-950 shadow-sm ring-1 ring-lex-orange/45'
                      : 'bg-sky-100/90 text-sky-950 shadow-sm ring-1 ring-sky-300/80 dark:bg-sky-950/40 dark:text-sky-100 dark:ring-sky-800/60'
                  : 'text-foreground/70 hover:bg-card hover:text-foreground',
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  );
}
