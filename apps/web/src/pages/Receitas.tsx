import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import api from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';
import { usePreferences } from '@/lib/preferences';
import { brl, formatDateBr, isDueWithinDaysFromToday, todayDateInputValue } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { EditRevenueModal, type RevenueRow } from '@/components/movimentos/EditRevenueModal';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

type Entity = { id: string; name: string; type: string };
type Cat = { id: string; name: string };
type Payer = { id: string; name: string };
type Account = { id: string; name: string };

type ListFilters = {
  q: string;
  status: string;
  from: string;
  to: string;
  categoryId: string;
  payerSourceId: string;
};

const emptyListFilters: ListFilters = {
  q: '',
  status: '',
  from: '',
  to: '',
  categoryId: '',
  payerSourceId: '',
};

export default function Receitas() {
  const { entityFilterId } = usePreferences();
  const [searchParams, setSearchParams] = useSearchParams();
  const listFilter = searchParams.get('filter');

  const [entities, setEntities] = useState<Entity[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [payers, setPayers] = useState<Payer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [rows, setRows] = useState<RevenueRow[]>([]);

  const [draftFilters, setDraftFilters] = useState<ListFilters>(emptyListFilters);
  const [activeFilters, setActiveFilters] = useState<ListFilters>(emptyListFilters);

  const [financialEntityId, setFinancialEntityId] = useState('');
  const [description, setDescription] = useState('');
  const [gross, setGross] = useState('');
  const [tax, setTax] = useState('0');
  const [net, setNet] = useState('');
  const [competence, setCompetence] = useState(() => todayDateInputValue());
  const [due, setDue] = useState(() => todayDateInputValue());
  const [type, setType] = useState<'RECORRENTE' | 'ESPORADICA'>('ESPORADICA');
  const [categoryId, setCategoryId] = useState('');
  const [payerId, setPayerId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [recFreq, setRecFreq] = useState<'MONTHLY' | 'YEARLY' | 'CUSTOM'>('MONTHLY');
  const [future, setFuture] = useState('12');
  const [queueHint, setQueueHint] = useState('');
  const [listActionMsg, setListActionMsg] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<RevenueRow | null>(null);

  const load = useCallback(async () => {
    const p = new URLSearchParams();
    if (entityFilterId) p.set('financialEntityId', entityFilterId);
    if (activeFilters.q.trim()) p.set('q', activeFilters.q.trim());
    if (activeFilters.status) p.set('status', activeFilters.status);
    if (activeFilters.from) p.set('from', activeFilters.from);
    if (activeFilters.to) p.set('to', activeFilters.to);
    if (activeFilters.categoryId) p.set('categoryId', activeFilters.categoryId);
    if (activeFilters.payerSourceId) p.set('payerSourceId', activeFilters.payerSourceId);
    const qs = p.toString();
    const revPath = qs ? `/revenues?${qs}` : '/revenues';

    const [e, c, pay, a, r] = await Promise.all([
      api.get<Entity[]>('/financial-entities'),
      api.get<Cat[]>('/categories?kind=REVENUE'),
      api.get<Payer[]>('/payer-sources'),
      api.get<Account[]>('/bank-accounts'),
      api.get<RevenueRow[]>(revPath),
    ]);
    setEntities(e.data);
    setCats(c.data);
    setPayers(pay.data);
    setAccounts(a.data);
    setRows(r.data);
    if (entityFilterId && e.data.some((x) => x.id === entityFilterId)) {
      setFinancialEntityId(entityFilterId);
    } else if (e.data[0]) {
      setFinancialEntityId(e.data[0].id);
    }
  }, [entityFilterId, activeFilters]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayRows = useMemo(() => {
    if (listFilter !== 'proximos') return rows;
    return rows.filter(
      (r) =>
        (r.status === 'PREVISTO' || r.status === 'ATRASADO') && isDueWithinDaysFromToday(r.dueDate, 30),
    );
  }, [rows, listFilter]);

  function openEdit(r: RevenueRow) {
    setEditing(r);
    setEditOpen(true);
  }

  async function markAsReceived(id: string) {
    setListActionMsg('');
    try {
      await api.patch(`/revenues/${id}`, { status: 'RECEBIDO' });
      await load();
      setListActionMsg('Marcada como recebida (realizado). Abra o registo para ajustar valores ou data se precisar.');
    } catch {
      setListActionMsg('Não foi possível marcar como recebida. Tente pelo editor.');
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setQueueHint('');
    const g = parseFloat(gross.replace(',', '.')) || 0;
    const t = parseFloat(tax.replace(',', '.')) || 0;
    const n = net ? parseFloat(net.replace(',', '.')) : g - t;
    const body: Record<string, unknown> = {
      financialEntityId,
      description,
      type,
      grossAmount: g,
      taxDiscount: t,
      netAmount: n,
      competenceDate: new Date(competence).toISOString(),
      dueDate: new Date(due).toISOString(),
      categoryId: categoryId || undefined,
      payerSourceId: payerId || undefined,
      destinationAccountId: accountId || undefined,
    };
    if (type === 'RECORRENTE') {
      body.recurrenceFrequency = recFreq;
      body.futureOccurrences = parseInt(future, 10) || 12;
    }
    try {
      await api.post('/revenues', body);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'lexQueued' in err && (err as { lexQueued?: boolean }).lexQueued) {
        setQueueHint('Sem rede: receita guardada na fila e será enviada quando voltar a internet.');
        setDescription('');
        setGross('');
        setNet('');
        setCompetence(todayDateInputValue());
        setDue(todayDateInputValue());
        return;
      }
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        setQueueHint(apiErrorMessage(err.response?.data));
        return;
      }
      throw err;
    }
    setDescription('');
    setGross('');
    setNet('');
    setCompetence(todayDateInputValue());
    setDue(todayDateInputValue());
    await load();
  }

  return (
    <div className="space-y-6 pb-2">
      <EditRevenueModal
        open={editOpen}
        onOpenChange={setEditOpen}
        row={editing}
        entities={entities}
        cats={cats}
        payers={payers}
        accounts={accounts}
        onSaved={() => void load()}
      />

      {listFilter === 'proximos' && (
        <div className="flex flex-col gap-2 rounded-xl border border-lex-green/30 bg-lex-green/10 px-3 py-3 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Mostrando apenas receitas <strong>previstas ou atrasadas</strong> com vencimento nos próximos{' '}
            <strong>30 dias</strong>.
          </span>
          <Button type="button" variant="outline" size="sm" className="shrink-0 touch-manipulation" onClick={() => setSearchParams({})}>
            Ver todas
          </Button>
        </div>
      )}
      {queueHint && (
        <p className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">{queueHint}</p>
      )}
      {listActionMsg && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{listActionMsg}</p>
      )}

      <Card className="border border-primary/20 shadow-sm">
        <CardHeader className="rounded-t-xl border-b border-border bg-gradient-to-r from-lex-green/[0.1] via-card to-lex-blue/[0.06]">
          <CardTitle className="text-base text-foreground">Filtros da lista</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label>Buscar na descrição</Label>
            <Input
              value={draftFilters.q}
              onChange={(e) => setDraftFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="Ex.: salário, cliente…"
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <select
              className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
              value={draftFilters.status}
              onChange={(e) => setDraftFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="">Todos</option>
              <option value="PREVISTO">Previsto</option>
              <option value="RECEBIDO">Recebido</option>
              <option value="ATRASADO">Atrasado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <select
              className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
              value={draftFilters.categoryId}
              onChange={(e) => setDraftFilters((f) => ({ ...f, categoryId: e.target.value }))}
            >
              <option value="">Todas</option>
              {cats.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Fonte pagadora</Label>
            <select
              className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
              value={draftFilters.payerSourceId}
              onChange={(e) => setDraftFilters((f) => ({ ...f, payerSourceId: e.target.value }))}
            >
              <option value="">Todas</option>
              {payers.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Competência desde</Label>
            <Input
              type="date"
              value={draftFilters.from}
              onChange={(e) => setDraftFilters((f) => ({ ...f, from: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Competência até</Label>
            <Input
              type="date"
              value={draftFilters.to}
              onChange={(e) => setDraftFilters((f) => ({ ...f, to: e.target.value }))}
            />
          </div>
          <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3">
            <Button type="button" className="touch-manipulation" onClick={() => setActiveFilters({ ...draftFilters })}>
              Aplicar filtros
            </Button>
            <Button
              type="button"
              variant="outline"
              className="touch-manipulation"
              onClick={() => {
                setDraftFilters(emptyListFilters);
                setActiveFilters(emptyListFilters);
              }}
            >
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-primary/20 shadow-sm">
        <CardHeader className="rounded-t-xl border-b border-border bg-gradient-to-r from-lex-green/[0.1] via-card to-lex-blue/[0.08]">
          <CardTitle className="text-base text-foreground">Nova receita</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={create} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Entidade</Label>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base md:text-sm touch-manipulation"
                value={financialEntityId}
                onChange={(e) => setFinancialEntityId(e.target.value)}
              >
                {entities.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base md:text-sm touch-manipulation"
                value={type}
                onChange={(e) => setType(e.target.value as 'RECORRENTE' | 'ESPORADICA')}
              >
                <option value="ESPORADICA">Esporádica</option>
                <option value="RECORRENTE">Recorrente</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Valor bruto</Label>
              <Input value={gross} onChange={(e) => setGross(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Impostos / descontos</Label>
              <Input value={tax} onChange={(e) => setTax(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Valor líquido (vazio = bruto − impostos)</Label>
              <Input value={net} onChange={(e) => setNet(e.target.value)} placeholder="opcional" />
            </div>
            <div className="space-y-2">
              <Label>Competência</Label>
              <Input type="date" value={competence} onChange={(e) => setCompetence(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base md:text-sm touch-manipulation"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">—</option>
                {cats.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Fonte pagadora</Label>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base md:text-sm touch-manipulation"
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
              >
                <option value="">—</option>
                {payers.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Conta destino</Label>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base md:text-sm touch-manipulation"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                <option value="">—</option>
                {accounts.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </div>
            {type === 'RECORRENTE' && (
              <>
                <div className="space-y-2">
                  <Label>Recorrência</Label>
                  <select
                    className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base md:text-sm touch-manipulation"
                    value={recFreq}
                    onChange={(e) =>
                      setRecFreq(e.target.value as 'MONTHLY' | 'YEARLY' | 'CUSTOM')
                    }
                  >
                    <option value="MONTHLY">Mensal</option>
                    <option value="YEARLY">Anual</option>
                    <option value="CUSTOM">Personalizada (mensal no MVP)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Ocorrências futuras</Label>
                  <Input value={future} onChange={(e) => setFuture(e.target.value)} />
                </div>
              </>
            )}
            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <Button type="submit" className="min-h-11 w-full touch-manipulation sm:w-auto">
                Salvar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border border-primary/20 shadow-sm">
        <CardHeader className="rounded-t-xl border-b border-border bg-gradient-to-r from-lex-blue/[0.08] via-card to-lex-green/[0.1]">
          <CardTitle className="text-base text-foreground">
            {listFilter === 'proximos' ? 'Receitas a vencer (filtro)' : 'Receitas'}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              — clique para editar; ✓ marca como recebido sem abrir o editor
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {listFilter === 'proximos' && displayRows.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma receita corresponde a este filtro.</p>
          )}
          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH className="w-12 text-center">✓</TH>
                  <TH>Descrição</TH>
                  <TH>Competência</TH>
                  <TH>Vencimento</TH>
                  <TH>Líquido</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {displayRows.slice(0, 80).map((r) => (
                  <TR
                    key={r.id}
                    className={cn('cursor-pointer transition-colors hover:bg-emerald-50/90')}
                    onClick={() => openEdit(r)}
                  >
                    <TD className="text-center" onClick={(e) => e.stopPropagation()}>
                      {(r.status === 'PREVISTO' || r.status === 'ATRASADO') ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-9 w-9 touch-manipulation border-lex-green/50"
                          title="Marcar como recebido (realizado)"
                          onClick={(e) => {
                            e.stopPropagation();
                            void markAsReceived(r.id);
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4 text-lex-green" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TD>
                    <TD>{r.description}</TD>
                    <TD>{formatDateBr(r.competenceDate)}</TD>
                    <TD>{formatDateBr(r.dueDate)}</TD>
                    <TD className="font-medium text-emerald-700">{brl(parseFloat(r.netAmount))}</TD>
                    <TD>
                      <span className="rounded-full bg-muted/80 px-2 py-0.5 text-xs">{r.status}</span>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
          <ul className="space-y-2 md:hidden">
            {displayRows.slice(0, 80).map((r) => (
              <li key={r.id} className="flex gap-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 rounded-xl border border-lex-green/25 bg-gradient-to-br from-card to-lex-green/[0.06] px-3 py-3 text-left text-sm shadow-sm transition hover:border-primary/35 hover:shadow-md"
                  onClick={() => openEdit(r)}
                >
                  <p className="font-medium leading-snug text-foreground">{r.description}</p>
                  <p className="mt-1 text-muted-foreground">
                    {formatDateBr(r.competenceDate)} · venc. {formatDateBr(r.dueDate)}
                  </p>
                  <p className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-base font-semibold text-emerald-700">{brl(parseFloat(r.netAmount))}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{r.status}</span>
                  </p>
                </button>
                {(r.status === 'PREVISTO' || r.status === 'ATRASADO') && (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-11 w-11 shrink-0 self-center touch-manipulation border-lex-green/50"
                    title="Recebido"
                    onClick={() => void markAsReceived(r.id)}
                  >
                    <CheckCircle2 className="h-5 w-5 text-lex-green" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
