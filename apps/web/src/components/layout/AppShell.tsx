import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  CreditCard,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Repeat,
  Users,
  Wallet,
  FileText,
  Briefcase,
  Landmark,
  ArrowLeftRight,
  LineChart,
  Menu,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { OfflineBar } from '@/components/layout/OfflineBar';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/estrutura', label: 'Estrutura', icon: LayoutGrid },
  { to: '/receitas', label: 'Receitas', icon: Wallet },
  { to: '/despesas', label: 'Despesas', icon: Repeat },
  { to: '/contratos', label: 'Contratos', icon: Briefcase },
  { to: '/funcionarios', label: 'Folha / funcionários', icon: Users },
  { to: '/financiamentos', label: 'Financiamentos', icon: Landmark },
  { to: '/transferencias', label: 'Transferências internas', icon: ArrowLeftRight },
  { to: '/cartao-lancamentos', label: 'Lançamentos no cartão', icon: CreditCard },
  { to: '/relatorios', label: 'Relatórios', icon: FileText },
  { to: '/cdb', label: 'CDB / CDI', icon: TrendingUp },
  { to: '/projecoes', label: 'Projeções', icon: LineChart },
];

const bottomNav = [
  { to: '/', label: 'Início', icon: LayoutDashboard, end: true },
  { to: '/receitas', label: 'Receitas', icon: Wallet },
  { to: '/despesas', label: 'Despesas', icon: Repeat },
  { to: '/relatorios', label: 'Relatórios', icon: FileText },
];

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);

  function logout() {
    localStorage.removeItem('lex_token');
    window.location.href = '/login';
  }

  return (
    <div className="flex min-h-screen min-h-[100dvh]">
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
                  'flex min-h-[44px] items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted touch-manipulation',
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
          <Button variant="ghost" className="w-full min-h-11 justify-start gap-2 touch-manipulation" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
          <div className="flex h-12 items-center justify-between gap-2 px-3 pt-[env(safe-area-inset-top)]">
            <span className="truncate font-semibold">LeX Finance</span>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 touch-manipulation"
                aria-label="Abrir menu"
                onClick={() => setMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="sm" className="min-h-10 touch-manipulation" onClick={logout}>
                Sair
              </Button>
            </div>
          </div>
        </header>

        <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
          <DialogContent
            showClose
            className="fixed inset-0 left-0 top-0 flex h-[100dvh] max-h-none w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 p-0"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="font-semibold">Menu</span>
            </div>
            <nav className="flex-1 overflow-y-auto p-2">
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-[48px] items-center gap-3 rounded-lg px-4 py-3 text-base transition-colors hover:bg-muted touch-manipulation',
                      isActive && 'bg-primary/15 text-primary',
                    )
                  }
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </DialogContent>
        </Dialog>

        <div className="flex-1 overflow-auto px-3 py-4 md:px-6 md:py-6">
          <OfflineBar />
          <div className="mt-3 md:mt-4">
            <Outlet />
          </div>
        </div>

        <nav
          className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
          aria-label="Navegação principal"
        >
          {bottomNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[10px] font-medium touch-manipulation',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            className="flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[10px] font-medium text-muted-foreground touch-manipulation"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
            Mais
          </button>
        </nav>
      </div>
    </div>
  );
}
