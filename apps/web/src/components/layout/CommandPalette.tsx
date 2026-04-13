import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type CmdItem = { to: string; label: string; keywords?: string };

const ITEMS: CmdItem[] = [
  { to: '/', label: 'Dashboard', keywords: 'inicio home' },
  { to: '/estrutura', label: 'Estrutura (cadastros)', keywords: 'entidades contas categorias' },
  { to: '/movimentos/receitas', label: 'Movimentos — Receitas', keywords: 'entrada ganho' },
  { to: '/movimentos/despesas', label: 'Movimentos — Despesas', keywords: 'saida gasto' },
  { to: '/cartoes', label: 'Cartões de crédito', keywords: 'credito fatura' },
  { to: '/contratos', label: 'Contratos' },
  { to: '/funcionarios', label: 'Folha / funcionários', keywords: 'salario rh' },
  {
    to: '/financiamentos',
    label: 'Financiamentos / empréstimos',
    keywords: 'emprestimo divida financiamento quitação antecipação parcelas',
  },
  { to: '/transferencias', label: 'Transferências internas' },
  { to: '/relatorios', label: 'Relatórios', keywords: 'dre grafico' },
  { to: '/projecoes', label: 'Projeções', keywords: 'futuro saldo' },
  { to: '/cdb', label: 'CDB / CDI', keywords: 'investimento' },
  { to: '/entidades', label: 'Entidades PF/PJ' },
  { to: '/contas', label: 'Contas bancárias' },
  { to: '/membros', label: 'Membros / originadores' },
  { to: '/categorias', label: 'Categorias' },
  { to: '/fontes', label: 'Fontes pagadoras' },
  { to: '/perfil', label: 'Minha conta / perfil', keywords: 'usuario senha email nome' },
];

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

type CommandPaletteProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function CommandPalette(props?: CommandPaletteProps) {
  const { open: controlledOpen, onOpenChange } = props ?? {};
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const openRef = useRef(open);
  openRef.current = open;
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(!openRef.current);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  const filtered = useMemo(() => {
    const nq = normalize(q.trim());
    if (!nq) return ITEMS;
    return ITEMS.filter((item) => {
      const hay = normalize(`${item.label} ${item.keywords ?? ''}`);
      return hay.includes(nq);
    });
  }, [q]);

  function go(to: string) {
    navigate(to);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg gap-3 p-0" showClose>
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Ir para…"
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filtered[0]) {
                e.preventDefault();
                go(filtered[0].to);
              }
            }}
          />
        </div>
        <ul className="max-h-[min(50vh,320px)] overflow-y-auto px-2 pb-2" role="listbox">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhum resultado</li>
          ) : (
            filtered.map((item) => (
              <li key={item.to}>
                <button
                  type="button"
                  role="option"
                  className={cn(
                    'flex w-full rounded-md px-3 py-2.5 text-left text-sm transition-colors',
                    'hover:bg-muted touch-manipulation',
                  )}
                  onClick={() => go(item.to)}
                >
                  {item.label}
                </button>
              </li>
            ))
          )}
        </ul>
        <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          <kbd className="rounded border border-border bg-muted px-1">⌘</kbd>
          <kbd className="ml-0.5 rounded border border-border bg-muted px-1">K</kbd>
          <span className="ml-1">ou Ctrl+K · Enter abre o primeiro resultado</span>
        </p>
      </DialogContent>
    </Dialog>
  );
}
