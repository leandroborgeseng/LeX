import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Banknote,
  CreditCard,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Users,
  FileText,
  Briefcase,
  Landmark,
  ArrowLeftRight,
  LineChart,
  Menu,
  TrendingUp,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { OfflineBar } from '@/components/layout/OfflineBar';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { EntityFilterSelect } from '@/components/layout/EntityFilterSelect';
import { LexMark } from '@/components/brand/LexMark';

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  /** Destaca o item quando o path começa com este prefixo (ex.: /movimentos). */
  matchPrefix?: string;
};

const nav: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/estrutura', label: 'Estrutura', icon: LayoutGrid },
  { to: '/movimentos/receitas', label: 'Movimentos', icon: Banknote, matchPrefix: '/movimentos' },
  { to: '/contratos', label: 'Contratos', icon: Briefcase },
  { to: '/funcionarios', label: 'Folha / funcionários', icon: Users },
  { to: '/financiamentos', label: 'Financiamentos', icon: Landmark },
  { to: '/transferencias', label: 'Transferências internas', icon: ArrowLeftRight },
  { to: '/cartoes', label: 'Cartões', icon: CreditCard, matchPrefix: '/cartoes' },
  { to: '/relatorios', label: 'Relatórios', icon: FileText },
  { to: '/cdb', label: 'CDB / CDI', icon: TrendingUp },
  { to: '/projecoes', label: 'Projeções', icon: LineChart },
  { to: '/perfil', label: 'Minha conta', icon: UserCog },
];

const bottomNav: NavItem[] = [
  { to: '/', label: 'Início', icon: LayoutDashboard, end: true },
  { to: '/movimentos/receitas', label: 'Movimentos', icon: Banknote, matchPrefix: '/movimentos' },
  { to: '/relatorios', label: 'Relatórios', icon: FileText },
];

function ShellNavLink({
  item,
  className,
  onClick,
  iconClassName = 'h-4 w-4 shrink-0',
}: {
  item: NavItem;
  className: (active: boolean) => string;
  onClick?: () => void;
  iconClassName?: string;
}) {
  const location = useLocation();
  const prefixActive = item.matchPrefix ? location.pathname.startsWith(item.matchPrefix) : null;
  return (
    <NavLink
      to={item.to}
      end={item.end ?? false}
      onClick={onClick}
      className={({ isActive }) => className(prefixActive !== null ? prefixActive : isActive)}
    >
      <item.icon className={iconClassName} />
      {item.label}
    </NavLink>
  );
}

function ShellNavLinkBottom({
  item,
  onClick,
}: {
  item: NavItem;
  onClick?: () => void;
}) {
  const location = useLocation();
  const prefixActive = item.matchPrefix ? location.pathname.startsWith(item.matchPrefix) : null;
  return (
    <NavLink
      to={item.to}
      end={item.end ?? false}
      onClick={onClick}
      className={({ isActive }) => {
        const on = prefixActive !== null ? prefixActive : isActive;
        return cn(
          'flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[10px] font-medium touch-manipulation',
          on ? 'text-primary' : 'text-muted-foreground',
        );
      }}
    >
      <item.icon className="h-5 w-5 shrink-0" />
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  function logout() {
    localStorage.removeItem('lex_token');
    window.location.href = '/login';
  }

  return (
    <div className="flex min-h-screen min-h-[100dvh]">
      <aside className="relative hidden w-60 shrink-0 border-r border-border bg-card/50 md:block">
        <div className="flex h-14 items-center gap-2 border-b border-border px-3 font-semibold tracking-tight">
          <LexMark />
          <span className="truncate bg-gradient-to-r from-lex-blue to-lex-orange bg-clip-text text-sm font-medium text-transparent">
            Finance
          </span>
        </div>
        <nav className="max-h-[calc(100vh-7rem)] space-y-0.5 overflow-y-auto p-2">
          {nav.map((item) => (
            <ShellNavLink
              key={item.to}
              item={item}
              className={(active) =>
                cn(
                  'flex min-h-[44px] items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted touch-manipulation',
                  active && 'bg-primary/15 text-primary',
                )
              }
            />
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
          <div className="flex flex-col gap-2 px-3 pb-2 pt-[env(safe-area-inset-top)]">
            <div className="flex h-12 items-center justify-between gap-2">
              <div className="min-w-0">
                <LexMark withWordmark={false} className="scale-95" />
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-9 touch-manipulation"
                  onClick={() => setCmdOpen(true)}
                >
                  Buscar
                </Button>
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
            <EntityFilterSelect />
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
            <div className="border-b border-border px-4 py-3">
              <EntityFilterSelect className="w-full" />
              <Button
                type="button"
                variant="secondary"
                className="mt-3 w-full touch-manipulation"
                onClick={() => {
                  setMenuOpen(false);
                  setCmdOpen(true);
                }}
              >
                Buscar páginas (⌘K)
              </Button>
            </div>
            <nav className="flex-1 overflow-y-auto p-2">
              {nav.map((item) => (
                <ShellNavLink
                  key={item.to}
                  item={item}
                  iconClassName="h-5 w-5 shrink-0"
                  onClick={() => setMenuOpen(false)}
                  className={(active) =>
                    cn(
                      'flex min-h-[48px] items-center gap-3 rounded-lg px-4 py-3 text-base transition-colors hover:bg-muted touch-manipulation',
                      active && 'bg-primary/15 text-primary',
                    )
                  }
                />
              ))}
            </nav>
          </DialogContent>
        </Dialog>

        <div className="flex-1 overflow-auto px-3 py-4 md:px-6 md:py-6">
          <div className="mb-3 hidden flex-wrap items-center justify-end gap-3 md:flex">
            <EntityFilterSelect />
            <Button type="button" variant="outline" size="sm" className="touch-manipulation" onClick={() => setCmdOpen(true)}>
              Buscar… <span className="ml-1 text-[10px] text-muted-foreground">⌘K</span>
            </Button>
          </div>
          <OfflineBar />
          <div className="mt-3 md:mt-4">
            <Outlet />
          </div>
        </div>

        <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />

        <nav
          className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
          aria-label="Navegação principal"
        >
          {bottomNav.map((item) => (
            <ShellNavLinkBottom key={item.to} item={item} />
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
