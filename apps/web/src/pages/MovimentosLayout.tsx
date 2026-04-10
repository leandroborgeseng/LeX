import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';

const tabs = [
  { to: 'receitas', label: 'Receitas' },
  { to: 'despesas', label: 'Despesas' },
] as const;

export default function MovimentosLayout() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-lex-blue/25 bg-gradient-to-br from-lex-blue/12 via-card to-lex-green/12 p-4 shadow-lg shadow-lex-orange/10 ring-1 ring-lex-orange/15">
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
                    ? 'bg-lex-green/20 text-green-200 shadow-inner ring-1 ring-lex-green/35'
                    : 'bg-lex-orange/20 text-orange-100 shadow-inner ring-1 ring-lex-orange/40'
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
