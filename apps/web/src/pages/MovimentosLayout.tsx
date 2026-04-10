import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';

const tabs = [
  { to: 'receitas', label: 'Receitas' },
  { to: 'despesas', label: 'Despesas' },
] as const;

export default function MovimentosLayout() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-sky-500/10 via-card to-emerald-500/10 p-4 shadow-lg shadow-sky-500/5">
        <h1 className="text-2xl font-semibold tracking-tight">Movimentos</h1>
        <p className="text-sm text-muted-foreground">Registe entradas e saídas num só lugar — toque numa linha para editar.</p>
      </div>

      <div className="flex gap-2 rounded-xl border border-border/80 bg-card/60 p-1.5 backdrop-blur-sm">
        {tabs.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'min-h-11 flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-all touch-manipulation',
                isActive
                  ? to === 'receitas'
                    ? 'bg-emerald-500/20 text-emerald-200 shadow-inner ring-1 ring-emerald-400/30'
                    : 'bg-rose-500/20 text-rose-100 shadow-inner ring-1 ring-rose-400/30'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
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
