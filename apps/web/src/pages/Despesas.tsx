import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { usePreferences } from '@/lib/preferences';
import { brl, formatDateBr, isDueWithinDaysFromToday, todayDateInputValue } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { EditExpenseModal, type ExpenseRow } from '@/components/movimentos/EditExpenseModal';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

type Entity = { id: string; name: string };
type Cat = { id: string; name: string };
type Member = { id: string; name: string };
type Account = { id: string; name: string };
type CardRow = { id: string; name: string };

type ListFilters = {
  q: string;
  status: string;
  from: string;
  to: string;
  categoryId: string;
  originatorId: string;
  paymentMethod: string;
  accountId: string;
  cardId: string;
};

const emptyListFilters: ListFilters = {
  q: '',
  status: '',
  from: '',
  to: '',
  categoryId: '',
  originatorId: '',
  paymentMethod: '',
  accountId: '',
  cardId: '',
};

export default function Despesas() {
  const { entityFilterId } = usePreferences();
  const [searchParams, setSearchParams] = useSearchParams();
  const listFilter = searchParams.get('filter');

  const [entities, setEntities] = useState<Entity[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [rows, setRows] = useState<ExpenseRow[]>([]);

  const [draftFilters, setDraftFilters] = useState<ListFilters>(emptyListFilters);
  const [activeFilters, setActiveFilters] = useState<ListFilters>(emptyListFilters);

  const [financialEntityId, setFinancialEntityId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [competence, setCompetence] = useState(() => todayDateInputValue());
  const [due, setDue] = useState(() => todayDateInputValue());
  const [type, setType] = useState<'RECORRENTE' | 'ESPORADICA'>('ESPORADICA');
  const [paymentMethod, setPaymentMethod] = useState('CONTA_BANCARIA');
  const [categoryId, setCategoryId] = useState('');
  const [originatorId, setOriginatorId] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [creditCardId, setCreditCardId] = useState('');
  const [recFreq, setRecFreq] = useState<'MONTHLY' | 'YEARLY' | 'CUSTOM'>('MONTHLY');
  const [future, setFuture] = useState('12');

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [listActionMsg, setListActionMsg] = useState('');

  const load = useCallback(async () => {
    const p = new URLSearchParams();
    if (entityFilterId) p.set('financialEntityId', entityFilterId);
    if (activeFilters.q.trim()) p.set('q', activeFilters.q.trim());
    if (activeFilters.status) p.set('status', activeFilters.status);
    if (activeFilters.from) p.set('from', activeFilters.from);
    if (activeFilters.to) p.set('to', activeFilters.to);
    if (activeFilters.categoryId) p.set('categoryId', activeFilters.categoryId);
    if (activeFilters.originatorId) p.set('originatorId', activeFilters.originatorId);
    if (activeFilters.paymentMethod) p.set('paymentMethod', activeFilters.paymentMethod);
    if (activeFilters.accountId) p.set('accountId', activeFilters.accountId);
    if (activeFilters.cardId) p.set('cardId', activeFilters.cardId);
    const qs = p.toString();
    const expPath = qs ? `/expenses?${qs}` : '/expenses';

    const [e, c, m, a, cd, ex] = await Promise.all([
      api.get<Entity[]>('/financial-entities'),
      api.get<Cat[]>('/categories?kind=EXPENSE'),
      api.get<Member[]>('/household-members'),
      api.get<Account[]>('/bank-accounts'),
      api.get<CardRow[]>('/credit-cards'),
      api.get<ExpenseRow[]>(expPath),
    ]);
    setEntities(e.data);
    setCats(c.data);
    setMembers(m.data);
    setAccounts(a.data);
    setCards(cd.data);
    setRows(ex.data);
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

  function openEdit(r: ExpenseRow) {
    setEditing(r);
    setEditOpen(true);
  }

  async function markAsPaid(id: string) {
    setListActionMsg('');
    try {
      await api.patch(`/expenses/${id}`, { status: 'PAGO' });
      await load();
      setListActionMsg('Marcada como paga (realizado). Abra o registo para ajustar valores ou data se precisar.');
    } catch {
      setListActionMsg('Não foi possível marcar como paga. Tente pelo editor.');
    }
  }

  async function create(ev: React.FormEvent) {
    ev.preventDefault();
    const body: Record<string, unknown> = {
      financialEntityId,
      description,
      type,
      amount: parseFloat(amount.replace(',', '.')) || 0,
      competenceDate: new Date(competence).toISOString(),
      dueDate: new Date(due).toISOString(),
      paymentMethod,
      categoryId: categoryId || undefined,
      originatorId: originatorId || undefined,
      bankAccountId:
        paymentMethod === 'CONTA_BANCARIA' || paymentMethod === 'TRANSFERENCIA'
          ? bankAccountId || undefined
          : undefined,
      creditCardId: paymentMethod === 'CARTAO_CREDITO' ? creditCardId || undefined : undefined,
    };
    if (type === 'RECORRENTE') {
      body.recurrenceFrequency = recFreq;
      body.futureOccurrences = parseInt(future, 10) || 12;
    }
    await api.post('/expenses', body);
    setDescription('');
    setAmount('');
    setCompetence(todayDateInputValue());
    setDue(todayDateInputValue());
    await load();
  }

  return (
    <div className="space-y-6 pb-2">
      <EditExpenseModal
        open={editOpen}
        onOpenChange={setEditOpen}
        row={editing}
        entities={entities}
        cats={cats}
        members={members}
        accounts={accounts}
        cards={cards}
        onSaved={() => void load()}
      />

      {listFilter === 'proximos' && (
        <div className="flex flex-col gap-2 rounded-xl border border-orange-200 bg-orange-50/90 px-3 py-3 text-sm text-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <span>
            A mostrar apenas despesas <strong>previstas ou atrasadas</strong> com vencimento nos próximos{' '}
            <strong>30 dias</strong>.
          </span>
          <Button type="button" variant="outline" size="sm" className="shrink-0 touch-manipulation" onClick={() => setSearchParams({})}>
            Ver todas
          </Button>
        </div>
      )}
      {listActionMsg && (
        <p className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-900">{listActionMsg}</p>
      )}

      <Card className="border-orange-200/80 shadow-sm shadow-orange-500/10">
        <CardHeader className="rounded-t-xl border-b border-orange-100 bg-gradient-to-r from-orange-50 via-amber-50/80 to-sky-50">
          <CardTitle className="text-base text-slate-800">Filtros da lista</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label>Buscar na descrição</Label>
            <Input
              value={draftFilters.q}
              onChange={(e) => setDraftFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="Ex.: aluguel, luz…"
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
              <option value="PAGO">Pago</option>
              <option value="ATRASADO">Atrasado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Meio de pagamento</Label>
            <select
              className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
              value={draftFilters.paymentMethod}
              onChange={(e) => setDraftFilters((f) => ({ ...f, paymentMethod: e.target.value, accountId: '', cardId: '' }))}
            >
              <option value="">Todos</option>
              <option value="CONTA_BANCARIA">Conta bancária</option>
              <option value="CARTAO_CREDITO">Cartão de crédito</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="TRANSFERENCIA">Transferência</option>
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
            <Label>Originador</Label>
            <select
              className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
              value={draftFilters.originatorId}
              onChange={(e) => setDraftFilters((f) => ({ ...f, originatorId: e.target.value }))}
            >
              <option value="">Todos</option>
              {members.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </div>
          {(draftFilters.paymentMethod === 'CONTA_BANCARIA' || draftFilters.paymentMethod === 'TRANSFERENCIA') && (
            <div className="space-y-2">
              <Label>Conta</Label>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
                value={draftFilters.accountId}
                onChange={(e) => setDraftFilters((f) => ({ ...f, accountId: e.target.value }))}
              >
                <option value="">Todas</option>
                {accounts.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {draftFilters.paymentMethod === 'CARTAO_CREDITO' && (
            <div className="space-y-2">
              <Label>Cartão</Label>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
                value={draftFilters.cardId}
                onChange={(e) => setDraftFilters((f) => ({ ...f, cardId: e.target.value }))}
              >
                <option value="">Todos</option>
                {cards.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </div>
          )}
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

      <Card className="border-orange-200/80 shadow-md shadow-orange-500/10">
        <CardHeader className="rounded-t-xl border-b border-orange-100 bg-gradient-to-r from-orange-50 via-white to-sky-50">
          <CardTitle className="text-base text-slate-800">Nova despesa</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={create} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Entidade</Label>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
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
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
                value={type}
                onChange={(e) => setType(e.target.value as 'RECORRENTE' | 'ESPORADICA')}
              >
                <option value="ESPORADICA">Esporádica</option>
                <option value="RECORRENTE">Recorrente</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Meio de pagamento</Label>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="CONTA_BANCARIA">Conta bancária</option>
                <option value="CARTAO_CREDITO">Cartão de crédito</option>
                <option value="DINHEIRO">Dinheiro</option>
                <option value="TRANSFERENCIA">Transferência</option>
              </select>
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
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
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
              <Label>Originador</Label>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
                value={originatorId}
                onChange={(e) => setOriginatorId(e.target.value)}
              >
                <option value="">—</option>
                {members.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </div>
            {(paymentMethod === 'CONTA_BANCARIA' || paymentMethod === 'TRANSFERENCIA') && (
              <div className="space-y-2">
                <Label>Conta</Label>
                <select
                  className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                >
                  <option value="">—</option>
                  {accounts.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {paymentMethod === 'CARTAO_CREDITO' && (
              <div className="space-y-2">
                <Label>Cartão</Label>
                <select
                  className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
                  value={creditCardId}
                  onChange={(e) => setCreditCardId(e.target.value)}
                >
                  <option value="">—</option>
                  {cards.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {type === 'RECORRENTE' && (
              <>
                <div className="space-y-2">
                  <Label>Recorrência</Label>
                  <select
                    className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
                    value={recFreq}
                    onChange={(e) =>
                      setRecFreq(e.target.value as 'MONTHLY' | 'YEARLY' | 'CUSTOM')
                    }
                  >
                    <option value="MONTHLY">Mensal</option>
                    <option value="YEARLY">Anual</option>
                    <option value="CUSTOM">Personalizada</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Ocorrências futuras</Label>
                  <Input value={future} onChange={(e) => setFuture(e.target.value)} />
                </div>
              </>
            )}
            <div className="flex items-end">
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-sky-200/80 shadow-md shadow-sky-500/10">
        <CardHeader className="rounded-t-xl border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-orange-50/70">
          <CardTitle className="text-base text-slate-800">
            {listFilter === 'proximos' ? 'Despesas a vencer (filtro)' : 'Despesas'}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              — clique para editar; ✓ marca como pago sem abrir o editor
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {listFilter === 'proximos' && displayRows.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma despesa corresponde a este filtro.</p>
          )}
          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH className="w-12 text-center">✓</TH>
                  <TH>Descrição</TH>
                  <TH>Competência</TH>
                  <TH>Vencimento</TH>
                  <TH>Valor</TH>
                  <TH>Meio</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {displayRows.slice(0, 80).map((r) => (
                  <TR
                    key={r.id}
                    className={cn('cursor-pointer transition-colors hover:bg-orange-50/90')}
                    onClick={() => openEdit(r)}
                  >
                    <TD className="text-center" onClick={(e) => e.stopPropagation()}>
                      {r.status === 'PREVISTO' || r.status === 'ATRASADO' ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-9 w-9 touch-manipulation border-lex-orange/50"
                          title="Marcar como pago (realizado)"
                          onClick={(e) => {
                            e.stopPropagation();
                            void markAsPaid(r.id);
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4 text-orange-600" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TD>
                    <TD>{r.description}</TD>
                    <TD>{formatDateBr(r.competenceDate)}</TD>
                    <TD>{formatDateBr(r.dueDate)}</TD>
                    <TD className="font-medium text-orange-700">{brl(parseFloat(r.amount))}</TD>
                    <TD className="text-xs text-muted-foreground">{r.paymentMethod}</TD>
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
                  className="min-w-0 flex-1 rounded-xl border border-orange-200 bg-gradient-to-br from-white to-orange-50/50 px-3 py-3 text-left text-sm shadow-sm transition hover:border-sky-300 hover:shadow-md"
                  onClick={() => openEdit(r)}
                >
                  <p className="font-medium leading-snug text-slate-900">{r.description}</p>
                  <p className="mt-1 text-muted-foreground">
                    {formatDateBr(r.competenceDate)} · venc. {formatDateBr(r.dueDate)}
                  </p>
                  <p className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-base font-semibold text-orange-700">{brl(parseFloat(r.amount))}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{r.status}</span>
                  </p>
                </button>
                {(r.status === 'PREVISTO' || r.status === 'ATRASADO') && (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-11 w-11 shrink-0 self-center touch-manipulation border-lex-orange/50"
                    title="Pago"
                    onClick={() => void markAsPaid(r.id)}
                  >
                    <CheckCircle2 className="h-5 w-5 text-orange-600" />
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
