import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';

const tabs = [
  { to: 'receitas', label: 'Receitas' },
  { to: 'despesas', label: 'Despesas' },
] as const;

export default function MovimentosLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Movimentos</h1>
        <p className="text-sm text-muted-foreground">Registe entradas e saídas no mesmo sítio.</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                '-mb-px min-h-11 shrink-0 rounded-t-md px-4 py-2.5 text-sm font-medium transition-colors touch-manipulation',
                isActive
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground',
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
