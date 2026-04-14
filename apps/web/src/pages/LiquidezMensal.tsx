import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { brl, formatDateBr } from '@/lib/format';
import { usePreferences } from '@/lib/preferences';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EditExpenseModal, type ExpenseRow } from '@/components/movimentos/EditExpenseModal';
import { EditRevenueModal, type RevenueRow } from '@/components/movimentos/EditRevenueModal';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Scope = 'PF' | 'PJ' | 'CONSOLIDADO';

type LiquidityMonth = {
  month: number;
  monthKey: string;
  receitas: number;
  receitasCdb: number;
  despesas: number;
  despesasFinanciamento: number;
  despesasCdb: number;
  despesasOutras: number;
  sobraLivre: number;
};

type LiquidityResponse = {
  scope: Scope;
  year: number;
  financialEntityId: string | null;
  months: LiquidityMonth[];
  totals: {
    receitas: number;
    receitasCdb: number;
    despesas: number;
    despesasFinanciamento: number;
    despesasCdb: number;
    despesasOutras: number;
    sobraLivre: number;
  };
  nota?: string;
};

type DetailState =
  | { month: number; side: 'revenues'; segment: 'all' | 'cdb' }
  | { month: number; side: 'expenses'; segment: 'all' | 'financing' | 'cdb' | 'other' };

type Entity = { id: string; name: string };
type Cat = { id: string; name: string };
type Member = { id: string; name: string };
type Account = { id: string; name: string };
type CardRow = { id: string; name: string };
type Payer = { id: string; name: string };

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function iso(d: string | Date): string {
  if (typeof d === 'string') return d;
  return d.toISOString();
}

function expenseApiToRow(e: {
  id: string;
  financialEntityId: string;
  description: string;
  type: string;
  amount: string | number;
  competenceDate: string | Date;
  dueDate: string | Date;
  status: string;
  paymentMethod: string;
  categoryId: string | null;
  originatorId: string | null;
  bankAccountId: string | null;
  creditCardId: string | null;
  paidAt?: string | Date | null;
}): ExpenseRow {
  return {
    id: e.id,
    financialEntityId: e.financialEntityId,
    description: e.description,
    type: e.type,
    amount: String(e.amount),
    competenceDate: iso(e.competenceDate),
    dueDate: iso(e.dueDate),
    status: e.status,
    paymentMethod: e.paymentMethod,
    categoryId: e.categoryId,
    originatorId: e.originatorId,
    bankAccountId: e.bankAccountId,
    creditCardId: e.creditCardId,
    paidAt: e.paidAt ? iso(e.paidAt) : null,
  };
}

function revenueApiToRow(r: {
  id: string;
  financialEntityId: string;
  description: string;
  type: string;
  grossAmount: string | number;
  taxDiscount: string | number | null;
  netAmount: string | number;
  competenceDate: string | Date;
  dueDate: string | Date;
  status: string;
  categoryId: string | null;
  payerSourceId: string | null;
  destinationAccountId: string | null;
  receivedAt?: string | Date | null;
}): RevenueRow {
  return {
    id: r.id,
    financialEntityId: r.financialEntityId,
    description: r.description,
    type: r.type,
    grossAmount: String(r.grossAmount),
    taxDiscount: String(r.taxDiscount ?? 0),
    netAmount: String(r.netAmount),
    competenceDate: iso(r.competenceDate),
    dueDate: iso(r.dueDate),
    status: r.status,
    categoryId: r.categoryId,
    payerSourceId: r.payerSourceId,
    destinationAccountId: r.destinationAccountId,
    receivedAt: r.receivedAt ? iso(r.receivedAt) : null,
  };
}

function ClickCell({
  value,
  className,
  onClick,
}: {
  value: string;
  className?: string;
  onClick: () => void;
}) {
  return (
    <TD className={cn('text-right tabular-nums', className)}>
      <button
        type="button"
        onClick={onClick}
        className="max-w-full rounded px-1 py-0.5 text-right underline decoration-dotted underline-offset-2 hover:bg-muted/80 hover:text-primary"
      >
        {value}
      </button>
    </TD>
  );
}

export default function LiquidezMensal() {
  const { entityFilterId } = usePreferences();
  const currentY = new Date().getFullYear();
  const [scope, setScope] = useState<Scope>('CONSOLIDADO');
  const [year, setYear] = useState(currentY);
  const [data, setData] = useState<LiquidityResponse | null>(null);

  const [entities, setEntities] = useState<Entity[]>([]);
  const [catsExpense, setCatsExpense] = useState<Cat[]>([]);
  const [catsRevenue, setCatsRevenue] = useState<Cat[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [payers, setPayers] = useState<Payer[]>([]);

  const [detail, setDetail] = useState<DetailState | null>(null);
  const [linesLoading, setLinesLoading] = useState(false);
  const [expenseLines, setExpenseLines] = useState<ExpenseRow[]>([]);
  const [revenueLines, setRevenueLines] = useState<RevenueRow[]>([]);

  const [editExpOpen, setEditExpOpen] = useState(false);
  const [editRevOpen, setEditRevOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<ExpenseRow | null>(null);
  const [editingRev, setEditingRev] = useState<RevenueRow | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set('year', String(year));
    p.set('scope', scope);
    if (entityFilterId) p.set('financialEntityId', entityFilterId);
    return p.toString();
  }, [year, scope, entityFilterId]);

  const loadSummary = useCallback(() => {
    return api.get<LiquidityResponse>(`/reports/monthly-liquidity?${query}`).then((r) => setData(r.data));
  }, [query]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    void Promise.all([
      api.get<Entity[]>('/financial-entities').then((r) => setEntities(r.data)),
      api.get<Cat[]>('/categories?kind=EXPENSE').then((r) => setCatsExpense(r.data)),
      api.get<Cat[]>('/categories?kind=REVENUE').then((r) => setCatsRevenue(r.data)),
      api.get<Member[]>('/household-members').then((r) => setMembers(r.data)),
      api.get<Account[]>('/bank-accounts').then((r) => setAccounts(r.data)),
      api.get<CardRow[]>('/credit-cards').then((r) => setCards(r.data)),
      api.get<Payer[]>('/payer-sources').then((r) => setPayers(r.data)),
    ]);
  }, []);

  const loadLines = useCallback(async () => {
    if (!detail) {
      setExpenseLines([]);
      setRevenueLines([]);
      return;
    }
    setLinesLoading(true);
    const p = new URLSearchParams(query);
    p.set('month', String(detail.month));
    p.set('side', detail.side);
    p.set('segment', detail.segment);
    try {
      const r = await api.get<{ rows: unknown[] }>(`/reports/monthly-liquidity-lines?${p.toString()}`);
      const rows = r.data.rows ?? [];
      if (detail.side === 'expenses') {
        setExpenseLines(rows.map((x) => expenseApiToRow(x as Parameters<typeof expenseApiToRow>[0])));
        setRevenueLines([]);
      } else {
        setRevenueLines(rows.map((x) => revenueApiToRow(x as Parameters<typeof revenueApiToRow>[0])));
        setExpenseLines([]);
      }
    } finally {
      setLinesLoading(false);
    }
  }, [detail, query]);

  useEffect(() => {
    void loadLines();
  }, [loadLines]);

  const refreshAll = useCallback(async () => {
    await loadSummary();
    await loadLines();
  }, [loadSummary, loadLines]);

  const syncMoviments = useCallback(async () => {
    setSyncMsg('');
    setSyncing(true);
    try {
      const p = new URLSearchParams();
      p.set('scope', scope);
      if (entityFilterId) p.set('financialEntityId', entityFilterId);
      const r = await api.post<{ synced: { cdbApplications: number; financings: number } }>(
        `/reports/sync-liquidity-moviments?${p.toString()}`,
      );
      const { cdbApplications, financings } = r.data.synced;
      setSyncMsg(
        `Atualizado: ${cdbApplications} aplicação(ões) CDB e ${financings} contrato(s) de financiamento/empréstimo. Os totais abaixo foram recalculados.`,
      );
      await loadSummary();
      await loadLines();
    } catch {
      setSyncMsg('Não foi possível atualizar. Verifique a sessão e tente de novo.');
    } finally {
      setSyncing(false);
    }
  }, [scope, entityFilterId, loadSummary, loadLines]);

  const chartData =
    data?.months.map((m) => ({
      label: MESES[m.month - 1],
      Receitas: m.receitas,
      'Desp. contrato': m.despesasFinanciamento,
      'Desp. CDB': m.despesasCdb,
      'Outras desp.': m.despesasOutras,
      'Sobra livre': m.sobraLivre,
    })) ?? [];

  function detailTitle(d: DetailState): string {
    const mes = MESES[d.month - 1];
    if (d.side === 'revenues') {
      if (d.segment === 'cdb') return `Receitas CDB (${mes})`;
      return `Receitas (${mes})`;
    }
    const map: Record<string, string> = {
      all: `Despesas (${mes})`,
      financing: `Despesas — contrato (${mes})`,
      cdb: `Despesas — CDB (${mes})`,
      other: `Despesas — outras (${mes})`,
    };
    return map[d.segment] ?? `Despesas (${mes})`;
  }

  return (
    <div className="space-y-6">
      <EditExpenseModal
        open={editExpOpen}
        onOpenChange={setEditExpOpen}
        row={editingExp}
        entities={entities}
        cats={catsExpense}
        members={members}
        accounts={accounts}
        cards={cards}
        onSaved={() => void refreshAll()}
      />
      <EditRevenueModal
        open={editRevOpen}
        onOpenChange={setEditRevOpen}
        row={editingRev}
        entities={entities}
        cats={catsRevenue}
        payers={payers}
        accounts={accounts}
        onSaved={() => void refreshAll()}
      />

      <Dialog open={detail != null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail ? detailTitle(detail) : ''}</DialogTitle>
          </DialogHeader>
          {detail && (
            <p className="text-sm text-muted-foreground">
              Clique em <strong>Editar</strong> para alterar ou excluir o lançamento (o mesmo fluxo de Movimentos).
            </p>
          )}
          {linesLoading ? (
            <p className="text-sm text-muted-foreground">A carregar…</p>
          ) : detail?.side === 'revenues' ? (
            revenueLines.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem lançamentos neste filtro.</p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Descrição</TH>
                    <TH className="text-right">Líquido</TH>
                    <TH>Competência</TH>
                    <TH>Estado</TH>
                    <TH />
                  </TR>
                </THead>
                <TBody>
                  {revenueLines.map((row) => (
                    <TR key={row.id}>
                      <TD className="max-w-[200px] truncate">{row.description}</TD>
                      <TD className="text-right tabular-nums">{brl(parseFloat(row.netAmount))}</TD>
                      <TD className="text-muted-foreground">{formatDateBr(row.competenceDate)}</TD>
                      <TD>{row.status}</TD>
                      <TD className="text-right">
                        <Button type="button" size="sm" variant="outline" onClick={() => { setEditingRev(row); setEditRevOpen(true); }}>
                          Editar
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )
          ) : expenseLines.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem lançamentos neste filtro.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Descrição</TH>
                  <TH className="text-right">Valor</TH>
                  <TH>Competência</TH>
                  <TH>Estado</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {expenseLines.map((row) => (
                  <TR key={row.id}>
                    <TD className="max-w-[200px] truncate">{row.description}</TD>
                    <TD className="text-right tabular-nums">{brl(parseFloat(row.amount))}</TD>
                    <TD className="text-muted-foreground">{formatDateBr(row.competenceDate)}</TD>
                    <TD>{row.status}</TD>
                    <TD className="text-right">
                      <Button type="button" size="sm" variant="outline" onClick={() => { setEditingExp(row); setEditExpOpen(true); }}>
                        Editar
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      <div>
        <h1 className="text-2xl font-semibold">Sobra livre no mês</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Receitas e despesas na mesma base da DRE (competência). Inclui parcelas de{' '}
          <strong>financiamento/empréstimo</strong> geradas pela app, rendimentos CDB como receitas e aportes mensais
          configurados no cadastro CDB como despesas automáticas (categoria Aportes CDB), além de despesas com
          &quot;cdb&quot; no texto. Clique nos valores da tabela para ver e editar os lançamentos.
          Cadastro CDB:{' '}
          <Link to="/cdb" className="font-medium text-primary underline-offset-4 hover:underline">
            CDB / CDI
          </Link>
          ; contratos:{' '}
          <Link to="/financiamentos" className="font-medium text-primary underline-offset-4 hover:underline">
            Financiamentos
          </Link>
          .
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="min-w-[10rem] space-y-2">
          <Label>Entidade (escopo)</Label>
          <select
            className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
            value={scope}
            onChange={(e) => setScope(e.target.value as Scope)}
            disabled={!!entityFilterId}
          >
            <option value="PF">Pessoa física</option>
            <option value="PJ">Empresa</option>
            <option value="CONSOLIDADO">Consolidado</option>
          </select>
          {entityFilterId && (
            <p className="text-xs text-muted-foreground">
              O filtro de entidade no topo restringe os dados; o escopo acima fica indisponível enquanto estiver ativo.
            </p>
          )}
        </div>
        <div className="min-w-[8rem] space-y-2">
          <Label>Ano</Label>
          <input
            type="number"
            className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
            value={year}
            min={2000}
            max={2100}
            onChange={(e) => setYear(parseInt(e.target.value, 10) || currentY)}
          />
        </div>
        <div className="flex min-w-[12rem] flex-col justify-end gap-2">
          <Label className="sr-only">Sincronizar</Label>
          <Button
            type="button"
            className="touch-manipulation"
            disabled={syncing}
            onClick={() => void syncMoviments()}
          >
            {syncing ? 'A atualizar…' : 'Atualizar CDB e contratos'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Gera de novo as receitas estimadas do CDB, as despesas de aporte mensal (se configuradas) e as despesas das
            parcelas dos financiamentos, para o mesmo filtro de entidade desta página.
          </p>
        </div>
      </div>

      {syncMsg && (
        <p
          className={cn(
            'rounded-md border px-3 py-2 text-sm',
            syncMsg.startsWith('Atualizado') ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-orange-200 bg-orange-50 text-orange-900',
          )}
        >
          {syncMsg}
        </p>
      )}

      {data?.nota && <p className="text-xs text-muted-foreground">{data.nota}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receitas, despesas por tipo e sobra livre (linha)</CardTitle>
        </CardHeader>
        <CardContent className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => brl(v)} width={72} />
              <Tooltip formatter={(v: number) => brl(v)} />
              <Legend />
              <Bar dataKey="Receitas" fill="var(--chart-green)" name="Receitas" />
              <Bar dataKey="Desp. contrato" stackId="desp" fill="var(--chart-orange)" name="Desp. contrato" />
              <Bar dataKey="Desp. CDB" stackId="desp" fill="#92400e" name="Desp. CDB" />
              <Bar dataKey="Outras desp." stackId="desp" fill="#64748b" name="Outras desp." />
              <Line
                type="monotone"
                dataKey="Sobra livre"
                stroke="var(--chart-blue)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--chart-blue)' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tabela — {data?.year ?? year}</CardTitle>
          <p className="text-xs text-muted-foreground">
            Valores sublinhados abrem o detalhe; use <strong>Editar</strong> no painel para alterar ou apagar.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Mês</TH>
                <TH className="text-right">Receitas</TH>
                <TH className="text-right">Receitas CDB</TH>
                <TH className="text-right">Desp. contrato</TH>
                <TH className="text-right">Desp. CDB</TH>
                <TH className="text-right">Outras desp.</TH>
                <TH className="text-right">Σ Despesas</TH>
                <TH className="text-right">Sobra livre</TH>
              </TR>
            </THead>
            <TBody>
              {data?.months.map((m) => (
                <TR key={m.monthKey}>
                  <TD>{MESES[m.month - 1]}</TD>
                  <ClickCell
                    value={brl(m.receitas)}
                    onClick={() => setDetail({ month: m.month, side: 'revenues', segment: 'all' })}
                  />
                  <ClickCell
                    value={brl(m.receitasCdb)}
                    className="text-muted-foreground"
                    onClick={() => setDetail({ month: m.month, side: 'revenues', segment: 'cdb' })}
                  />
                  <ClickCell
                    value={brl(m.despesasFinanciamento)}
                    className="text-muted-foreground"
                    onClick={() => setDetail({ month: m.month, side: 'expenses', segment: 'financing' })}
                  />
                  <ClickCell
                    value={brl(m.despesasCdb)}
                    className="text-muted-foreground"
                    onClick={() => setDetail({ month: m.month, side: 'expenses', segment: 'cdb' })}
                  />
                  <ClickCell
                    value={brl(m.despesasOutras)}
                    className="text-muted-foreground"
                    onClick={() => setDetail({ month: m.month, side: 'expenses', segment: 'other' })}
                  />
                  <ClickCell
                    value={brl(m.despesas)}
                    onClick={() => setDetail({ month: m.month, side: 'expenses', segment: 'all' })}
                  />
                  <TD
                    className={cn(
                      'text-right tabular-nums font-medium',
                      m.sobraLivre >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive',
                    )}
                  >
                    {brl(m.sobraLivre)}
                  </TD>
                </TR>
              ))}
              {data && (
                <TR className="border-t-2 font-medium">
                  <TD>Total ano</TD>
                  <TD className="text-right tabular-nums">{brl(data.totals.receitas)}</TD>
                  <TD className="text-right tabular-nums text-muted-foreground">{brl(data.totals.receitasCdb)}</TD>
                  <TD className="text-right tabular-nums text-muted-foreground">{brl(data.totals.despesasFinanciamento)}</TD>
                  <TD className="text-right tabular-nums text-muted-foreground">{brl(data.totals.despesasCdb)}</TD>
                  <TD className="text-right tabular-nums text-muted-foreground">{brl(data.totals.despesasOutras)}</TD>
                  <TD className="text-right tabular-nums">{brl(data.totals.despesas)}</TD>
                  <TD
                    className={cn(
                      'text-right tabular-nums',
                      data.totals.sobraLivre >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive',
                    )}
                  >
                    {brl(data.totals.sobraLivre)}
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
