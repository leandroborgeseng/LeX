import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { brl } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Scope = 'PF' | 'PJ' | 'CONSOLIDADO';

type DreMonth = {
  month: number;
  monthKey: string;
  receitaLiquida: number;
  despesas: number;
  resultado: number;
  detalhe: { receitaBruta: number; impostosDescontos: number };
};

type CashflowRevRow = {
  id: string;
  description: string;
  netAmount: string | number;
  competenceDate: string;
  payerSource?: { name: string } | null;
  category?: { name: string } | null;
  status: string;
};

type CashflowExpRow = {
  id: string;
  description: string;
  amount: string | number;
  competenceDate: string;
  category?: { name: string } | null;
  originator?: { name: string } | null;
  status: string;
};

type CashflowMonthly = {
  period: { year: number; month: number };
  revenues: CashflowRevRow[];
  expenses: CashflowExpRow[];
  totalRev: number;
  totalExp: number;
  net: number;
};

type DebtPoint = { year: number; month: number; outstanding: number };

type ContractMarginRow = {
  id: string;
  client: string;
  monthlyGross: number;
  estimatedTax: number;
  estimatedOpCost: number;
  estimatedNet: number;
  marginPct: number;
};

function money(v: string | number) {
  return typeof v === 'number' ? v : parseFloat(v);
}

const MESES = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export default function Relatorios() {
  const currentY = new Date().getFullYear();
  const currentM = new Date().getMonth() + 1;
  const [scope, setScope] = useState<Scope>('CONSOLIDADO');
  const [year, setYear] = useState(currentY);
  const [cfMonth, setCfMonth] = useState(currentM);
  const [dreMonthly, setDreMonthly] = useState<{
    months: DreMonth[];
    totals: { receitaLiquida: number; despesas: number; resultado: number };
    nota?: string;
  } | null>(null);
  const [expCat, setExpCat] = useState<{ category: string; total: number }[]>([]);
  const [revSrc, setRevSrc] = useState<{ source: string; total: number }[]>([]);
  const [cashflow, setCashflow] = useState<CashflowMonthly | null>(null);
  const [debtMonths, setDebtMonths] = useState(12);
  const [debtSeries, setDebtSeries] = useState<DebtPoint[]>([]);
  const [contractsMargin, setContractsMargin] = useState<ContractMarginRow[]>([]);

  useEffect(() => {
    const from = `${year}-01-01T00:00:00.000Z`;
    const to = `${year}-12-31T23:59:59.999Z`;
    api
      .get<{ months: DreMonth[]; totals: { receitaLiquida: number; despesas: number; resultado: number }; nota?: string }>(
        `/reports/dre-monthly?scope=${scope}&year=${year}`,
      )
      .then((r) => setDreMonthly(r.data));
    api
      .get<{ category: string; total: number }[]>(
        `/reports/expenses-by-category?scope=${scope}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      )
      .then((r) => setExpCat(r.data));
    api
      .get<{ source: string; total: number }[]>(
        `/reports/revenues-by-source?scope=${scope}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      )
      .then((r) => setRevSrc([...r.data].sort((a, b) => b.total - a.total)));
  }, [scope, year]);

  useEffect(() => {
    api
      .get<CashflowMonthly>(
        `/reports/cashflow-monthly?scope=${scope}&year=${year}&month=${cfMonth}`,
      )
      .then((r) => setCashflow(r.data));
  }, [scope, year, cfMonth]);

  useEffect(() => {
    api.get<DebtPoint[]>(`/reports/debt-evolution?months=${debtMonths}`).then((r) => setDebtSeries(r.data));
  }, [debtMonths]);

  useEffect(() => {
    api.get<ContractMarginRow[]>(`/reports/contracts-margin`).then((r) => setContractsMargin(r.data));
  }, []);

  const chartData =
    dreMonthly?.months.map((m) => ({
      label: MESES[m.month - 1],
      Receita: m.receitaLiquida,
      Despesas: m.despesas,
      Resultado: m.resultado,
    })) ?? [];

  const cashflowBar =
    cashflow != null
      ? [
          {
            label: `${MESES[cashflow.period.month - 1]}/${cashflow.period.year}`,
            Receitas: cashflow.totalRev,
            Despesas: cashflow.totalExp,
            Saldo: cashflow.net,
          },
        ]
      : [];

  const debtChart =
    debtSeries.map((d) => ({
      label: `${MESES[d.month - 1]}/${String(d.year).slice(-2)}`,
      SaldoDevedor: d.outstanding,
    })) ?? [];

  const revSrcChart = revSrc.map((x) => ({
    source: x.source.length > 28 ? `${x.source.slice(0, 26)}…` : x.source,
    total: x.total,
    fullSource: x.source,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Relatórios</h1>
      <p className="text-sm text-muted-foreground">
        Investimentos:{' '}
        <Link to="/cdb" className="font-medium text-primary underline-offset-4 hover:underline">
          CDB / CDI
        </Link>{' '}
        — cadastro, % do CDI (100% ou 110%), IR regressivo e projeção de 5 anos. Ver também{' '}
        <Link to="/liquidez-mensal" className="font-medium text-primary underline-offset-4 hover:underline">
          sobra livre mês a mês
        </Link>
        .
      </p>

      <div className="flex flex-wrap gap-4">
        <div className="min-w-[10rem] space-y-2">
          <Label>Entidade</Label>
          <select
            className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
            value={scope}
            onChange={(e) => setScope(e.target.value as Scope)}
          >
            <option value="PF">Pessoa física</option>
            <option value="PJ">Empresa</option>
            <option value="CONSOLIDADO">Consolidado</option>
          </select>
        </div>
        <div className="min-w-[8rem] space-y-2">
          <Label>Ano (DRE e agregados)</Label>
          <select
            className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
          >
            {[currentY + 1, currentY, currentY - 1, currentY - 2].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[10rem] space-y-2">
          <Label>Mês (fluxo de caixa)</Label>
          <select
            className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
            value={cfMonth}
            onChange={(e) => setCfMonth(parseInt(e.target.value, 10))}
          >
            {MESES.map((nome, i) => (
              <option key={nome} value={i + 1}>
                {nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">DRE — totais do ano {year}</CardTitle>
            <p className="text-xs text-muted-foreground">
              Mesmas regras da DRE simplificada: receitas em PREVISTO + RECEBIDO; despesas em PREVISTO + PAGO (por
              competência em cada mês).
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {dreMonthly && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Receita líquida (soma 12 meses)</span>
                  <span>{brl(dreMonthly.totals.receitaLiquida)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Despesas</span>
                  <span>{brl(dreMonthly.totals.despesas)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-medium">
                  <span>Resultado</span>
                  <span>{brl(dreMonthly.totals.resultado)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Despesas por categoria ({year})</CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 space-y-2 overflow-y-auto text-sm">
            {expCat.map((x) => (
              <div key={x.category} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{x.category}</span>
                <span className="shrink-0">{brl(x.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">DRE mensal — {year}</CardTitle>
          {dreMonthly?.nota && <p className="text-xs text-muted-foreground">{dreMonthly.nota}</p>}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="h-64 w-full md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 88%)" />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => brl(v)}
                  contentStyle={{
                  background: '#ffffff',
                  border: '1px solid hsl(214 32% 88%)',
                  color: '#0f172a',
                  borderRadius: '8px',
                }}
                />
                <Legend />
                <Bar dataKey="Receita" fill="var(--chart-green)" />
                <Bar dataKey="Despesas" fill="var(--chart-orange)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto rounded-md border border-border md:hidden">
            <Table>
              <THead>
                <TR>
                  <TH>Mês</TH>
                  <TH className="text-right">Rec.</TH>
                  <TH className="text-right">Desp.</TH>
                  <TH className="text-right">Res.</TH>
                </TR>
              </THead>
              <TBody>
                {dreMonthly?.months.map((m) => (
                  <TR key={m.monthKey}>
                    <TD>{MESES[m.month - 1]}</TD>
                    <TD className="text-right">{brl(m.receitaLiquida)}</TD>
                    <TD className="text-right">{brl(m.despesas)}</TD>
                    <TD className="text-right font-medium">{brl(m.resultado)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH>Mês</TH>
                  <TH className="text-right">Receita líquida</TH>
                  <TH className="text-right">Receita bruta</TH>
                  <TH className="text-right">Impostos / desc.</TH>
                  <TH className="text-right">Despesas</TH>
                  <TH className="text-right">Resultado</TH>
                </TR>
              </THead>
              <TBody>
                {dreMonthly?.months.map((m) => (
                  <TR key={m.monthKey}>
                    <TD>
                      {MESES[m.month - 1]} ({m.monthKey})
                    </TD>
                    <TD className="text-right">{brl(m.receitaLiquida)}</TD>
                    <TD className="text-right">{brl(m.detalhe.receitaBruta)}</TD>
                    <TD className="text-right">{brl(m.detalhe.impostosDescontos)}</TD>
                    <TD className="text-right">{brl(m.despesas)}</TD>
                    <TD className="text-right font-medium">{brl(m.resultado)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fluxo de caixa (mês)</CardTitle>
            <p className="text-xs text-muted-foreground">
              Todas as receitas e despesas com competência em{' '}
              <span className="font-medium text-foreground">
                {MESES[(cashflow?.period.month ?? cfMonth) - 1]}/{cashflow?.period.year ?? year}
              </span>
              , sem filtrar por status (diferente da DRE).
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {cashflow && (
              <>
                <div className="grid gap-2 text-sm sm:grid-cols-3">
                  <div className="rounded-md border border-border bg-card/50 p-3">
                    <div className="text-xs text-muted-foreground">Receitas</div>
                    <div className="font-medium text-emerald-800">{brl(cashflow.totalRev)}</div>
                  </div>
                  <div className="rounded-md border border-border bg-card/50 p-3">
                    <div className="text-xs text-muted-foreground">Despesas</div>
                    <div className="font-medium text-orange-800">{brl(cashflow.totalExp)}</div>
                  </div>
                  <div className="rounded-md border border-border bg-card/50 p-3">
                    <div className="text-xs text-muted-foreground">Saldo</div>
                    <div className="font-medium">{brl(cashflow.net)}</div>
                  </div>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashflowBar}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 88%)" />
                      <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(v: number) => brl(v)}
                        contentStyle={{
                          background: '#ffffff',
                          border: '1px solid hsl(214 32% 88%)',
                          color: '#0f172a',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="Receitas" fill="var(--chart-green)" />
                      <Bar dataKey="Despesas" fill="var(--chart-orange)" />
                      <Bar dataKey="Saldo" fill="var(--chart-blue)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Receitas ({cashflow.revenues.length})</h3>
                  <div className="max-h-52 overflow-auto rounded-md border border-border">
                    <Table>
                      <THead>
                        <TR>
                          <TH>Descrição</TH>
                          <TH>Fonte</TH>
                          <TH className="text-right">Líquido</TH>
                        </TR>
                      </THead>
                      <TBody>
                        {cashflow.revenues.map((row) => (
                          <TR key={row.id}>
                            <TD className="max-w-[10rem] truncate text-xs" title={row.description}>
                              {row.description}
                            </TD>
                            <TD className="text-xs text-muted-foreground">{row.payerSource?.name ?? '—'}</TD>
                            <TD className="text-right text-xs">{brl(money(row.netAmount))}</TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Despesas ({cashflow.expenses.length})</h3>
                  <div className="max-h-52 overflow-auto rounded-md border border-border">
                    <Table>
                      <THead>
                        <TR>
                          <TH>Descrição</TH>
                          <TH>Categoria</TH>
                          <TH className="text-right">Valor</TH>
                        </TR>
                      </THead>
                      <TBody>
                        {cashflow.expenses.map((row) => (
                          <TR key={row.id}>
                            <TD className="max-w-[10rem] truncate text-xs" title={row.description}>
                              {row.description}
                            </TD>
                            <TD className="text-xs text-muted-foreground">{row.category?.name ?? '—'}</TD>
                            <TD className="text-right text-xs">{brl(money(row.amount))}</TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receitas por fonte ({year})</CardTitle>
            <p className="text-xs text-muted-foreground">Soma do valor líquido por pagador no ano selecionado.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {revSrc.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma receita com competência neste ano.</p>
            ) : (
              <>
                <div className="h-[min(22rem,50vh)] w-full min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={revSrcChart} margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 88%)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis
                        type="category"
                        dataKey="source"
                        width={112}
                        tick={{ fill: '#64748b', fontSize: 10 }}
                      />
                      <Tooltip
                        formatter={(v: number) => brl(v)}
                        labelFormatter={(_, payload) => {
                          const p = payload?.[0]?.payload as { fullSource?: string };
                          return p?.fullSource ?? '';
                        }}
                        contentStyle={{
                          background: '#ffffff',
                          border: '1px solid hsl(214 32% 88%)',
                          color: '#0f172a',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="total" name="Total líquido" fill="var(--chart-green)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="max-h-48 space-y-2 overflow-y-auto text-sm">
                  {revSrc.map((x) => (
                    <div key={x.source} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{x.source}</span>
                      <span className="shrink-0">{brl(x.total)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-base">Evolução do saldo devedor (financiamentos)</CardTitle>
            <p className="text-xs text-muted-foreground">
              Valor original total menos amortizações pagas até o fim de cada mês (estoque aproximado).
            </p>
          </div>
          <div className="flex min-w-[10rem] flex-col gap-2">
            <Label>Histórico</Label>
            <select
              className="min-h-11 rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
              value={debtMonths}
              onChange={(e) => setDebtMonths(parseInt(e.target.value, 10))}
            >
              <option value={12}>12 meses</option>
              <option value={24}>24 meses</option>
              <option value={36}>36 meses</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={debtChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 88%)" />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => brl(v)}
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid hsl(214 32% 88%)',
                    color: '#0f172a',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="SaldoDevedor"
                  name="Saldo devedor"
                  stroke="var(--chart-orange)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'var(--chart-orange)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Margem de contratos ativos</CardTitle>
          <p className="text-xs text-muted-foreground">
            Estimativa mensal: bruto, impostos, custo operacional, líquido e margem líquida sobre o bruto.
          </p>
        </CardHeader>
        <CardContent>
          {contractsMargin.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum contrato ativo.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Cliente</TH>
                    <TH className="text-right">Bruto / mês</TH>
                    <TH className="text-right">Impostos (est.)</TH>
                    <TH className="text-right">Custo op. (est.)</TH>
                    <TH className="text-right">Líquido (est.)</TH>
                    <TH className="text-right">Margem</TH>
                  </TR>
                </THead>
                <TBody>
                  {contractsMargin.map((c) => (
                    <TR key={c.id}>
                      <TD className="max-w-[14rem] truncate font-medium" title={c.client}>
                        {c.client}
                      </TD>
                      <TD className="text-right">{brl(c.monthlyGross)}</TD>
                      <TD className="text-right text-muted-foreground">{brl(c.estimatedTax)}</TD>
                      <TD className="text-right text-muted-foreground">{brl(c.estimatedOpCost)}</TD>
                      <TD className="text-right text-emerald-800">{brl(c.estimatedNet)}</TD>
                      <TD className="text-right font-medium">{c.marginPct.toFixed(1)}%</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Endpoints equivalentes na API:{' '}
        <code className="rounded bg-muted px-1">GET /api/reports/cashflow-monthly</code>,{' '}
        <code className="rounded bg-muted px-1">revenues-by-source</code>,{' '}
        <code className="rounded bg-muted px-1">debt-evolution</code>,{' '}
        <code className="rounded bg-muted px-1">contracts-margin</code>. Documentação interativa em{' '}
        <code className="rounded bg-muted px-1">/api/docs</code>.
      </p>
    </div>
  );
}
