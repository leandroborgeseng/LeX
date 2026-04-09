import { NavLink, Outlet } from 'react-router-dom';
import {
  Building2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Repeat,
  Users,
  Wallet,
  FileText,
  Briefcase,
  Landmark,
  ArrowLeftRight,
  PieChart,
  LineChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/entidades', label: 'Entidades PF/PJ', icon: Building2 },
  { to: '/contas', label: 'Contas bancárias', icon: Landmark },
  { to: '/cartoes', label: 'Cartões', icon: CreditCard },
  { to: '/membros', label: 'Membros / originadores', icon: Users },
  { to: '/categorias', label: 'Categorias', icon: PieChart },
  { to: '/fontes', label: 'Fontes pagadoras', icon: Wallet },
  { to: '/receitas', label: 'Receitas', icon: Wallet },
  { to: '/despesas', label: 'Despesas', icon: Repeat },
  { to: '/contratos', label: 'Contratos', icon: Briefcase },
  { to: '/funcionarios', label: 'Folha / funcionários', icon: Users },
  { to: '/financiamentos', label: 'Financiamentos', icon: Landmark },
  { to: '/transferencias', label: 'Transferências internas', icon: ArrowLeftRight },
  { to: '/cartao-lancamentos', label: 'Lançamentos no cartão', icon: CreditCard },
  { to: '/relatorios', label: 'Relatórios', icon: FileText },
  { to: '/projecoes', label: 'Projeções', icon: LineChart },
];

export function AppShell() {
  function logout() {
    localStorage.removeItem('lex_token');
    window.location.href = '/login';
  }

  return (
    <div className="flex min-h-screen">
      <aside className="relative hidden w-60 shrink-0 border-r border-border bg-card/50 md:block">
        <div className="flex h-14 items-center border-b border-border px-4 font-semibold tracking-tight">
          LeX Finance
        </div>
        <nav className="max-h-[calc(100vh-7rem)] space-y-0.5 overflow-y-auto p-2">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted',
                  isActive && 'bg-primary/15 text-primary',
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 hidden w-60 border-t border-border p-2 md:block">
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border md:hidden">
          <div className="flex h-12 items-center justify-between px-3">
            <span className="font-semibold">LeX</span>
            <Button variant="outline" size="sm" onClick={logout}>
              Sair
            </Button>
          </div>
          <div className="flex gap-1 overflow-x-auto px-2 pb-2 text-xs">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'shrink-0 rounded-full border border-border px-2 py-1',
                    isActive && 'border-primary bg-primary/15 text-primary',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
