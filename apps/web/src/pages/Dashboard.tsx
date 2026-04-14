import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
import api from '@/lib/api';
import { LEX_MOVIMENTS_CHANGED } from '@/lib/moviments-events';
import { brl } from '@/lib/format';
import { usePreferences } from '@/lib/preferences';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { OnboardingCard } from '@/components/layout/OnboardingCard';

function debtKindLabel(k: string) {
  return k === 'EMPRESTIMO' ? 'Empréstimo' : 'Financiamento';
}

type CdbProjMonth = {
  month: string;
  totalPrincipal: number;
  totalGross: number;
  totalGain: number;
  totalIr: number;
  totalNet: number;
};

type CdbProjection5y = {
  methodology: string;
  summary: { applicationCount: number; totalPrincipalNow: number };
  months: CdbProjMonth[];
  lastMonth?: CdbProjMonth;
};

type Summary = {
  balances: { pf: number; pj: number; consolidated: number };
  patrimonyAssets: { pf: number; pj: number; consolidated: number };
  patrimonyTotal: { pf: number; pj: number; consolidated: number };
  month: { year: number; month: number };
  revenuesMonth: { pf: number; pj: number; consolidated: number };
  expensesMonth: { pf: number; pj: number; consolidated: number };
  resultForecast: { pf: number; pj: number; consolidated: number };
  annualYear: number;
  revenuesYear: { pf: number; pj: number; consolidated: number };
  expensesYear: { pf: number; pj: number; consolidated: number };
  resultYear: { pf: number; pj: number; consolidated: number };
  financingOutstanding: number;
  creditCardsDebtTotal: number;
  debtsFinancing: {
    id: string;
    name: string;
    creditor: string | null;
    kind: string;
    currentBalance: number;
    installmentsPrevisto: number;
    sumPrevistoPayments: number;
    financialEntityName: string | null;
  }[];
  debtProjectionYears: {
    year: number;
    financingOutstanding: number;
    creditCardsSnapshot: number;
    totalDebt: number;
  }[];
  charts: {
    cashflow12m: { year: number; month: number; net: number; inflow: number; outflow: number }[];
    expensesByCategory: { name: string; value: number }[];
    expensesByOriginator: { name: string; value: number }[];
    revenuesByPayer: { name: string; value: number }[];
  };
  upcoming: { revenues: unknown[]; expenses: unknown[] };
  activeContracts: { id: string; clientName: string }[];
  creditCards: { name: string; monthTotal: number; limit: number | null }[];
  filterEntity: { id: string; name: string; type: string } | null;
};

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

export default function Dashboard() {
  const { entityFilterId } = usePreferences();
  const [s, setS] = useState<Summary | null>(null);
  const [cdb5, setCdb5] = useState<CdbProjection5y | null>(null);
  const [cdb5Err, setCdb5Err] = useState(false);
  const [snapBusy, setSnapBusy] = useState(false);
  const [snapMsg, setSnapMsg] = useState('');

  useEffect(() => {
    setS(null);
    const q = entityFilterId ? `?financialEntityId=${encodeURIComponent(entityFilterId)}` : '';
    api.get<Summary>(`/dashboard/summary${q}`).then((r) => setS(r.data));
  }, [entityFilterId]);

  useEffect(() => {
    const q = entityFilterId ? `?financialEntityId=${encodeURIComponent(entityFilterId)}` : '';
    const reload = () => {
      api.get<Summary>(`/dashboard/summary${q}`).then((r) => setS(r.data));
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload();
    };
    window.addEventListener(LEX_MOVIMENTS_CHANGED, reload);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener(LEX_MOVIMENTS_CHANGED, reload);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [entityFilterId]);

  useEffect(() => {
    setCdb5(null);
    setCdb5Err(false);
    const q = entityFilterId ? `?years=5&financialEntityId=${encodeURIComponent(entityFilterId)}` : '?years=5';
    api
      .get<CdbProjection5y>(`/cdb-applications/projection/summary${q}`)
      .then((r) => setCdb5(r.data))
      .catch(() => setCdb5Err(true));
  }, [entityFilterId]);

  async function quickSnapshot() {
    setSnapBusy(true);
    setSnapMsg('');
    try {
      await api.post('/financial-history/snapshots', {
        financialEntityId: entityFilterId || undefined,
        referenceDate: new Date().toISOString(),
      });
      setSnapMsg('Instantâneo guardado. Abra Histórico para ver, notar ou comparar.');
    } catch {
      setSnapMsg('Não foi possível guardar o instantâneo.');
    } finally {
      setSnapBusy(false);
    }
  }

  if (!s) {
    return <p className="text-muted-foreground">Carregando dashboard…</p>;
  }

  const cf = s.charts.cashflow12m.map((x) => ({
    label: `${x.month}/${x.year}`,
    net: x.net,
    inflow: x.inflow,
    outflow: x.outflow,
  }));

  const debtYearly = s.debtProjectionYears.map((p) => ({
    label: String(p.year),
    Financiamentos: p.financingOutstanding,
    'Cartões (ref.)': p.creditCardsSnapshot,
    Total: p.totalDebt,
  }));

  const cdbChart =
    cdb5?.months?.map((m) => ({
      month: m.month,
      líquido: num(m.totalNet),
      principal: num(m.totalPrincipal),
    })) ?? [];

  const cdbFirst = cdb5?.months?.[0];
  const cdbLast = cdb5?.lastMonth ?? cdb5?.months?.[cdb5.months.length - 1];
  const cdbGain5y =
    cdbFirst && cdbLast ? Math.max(0, num(cdbLast.totalNet) - num(cdbFirst.totalNet)) : 0;
  const cdbApps = cdb5?.summary.applicationCount ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão consolidada e projeções do período</p>
        {s.filterEntity && (
          <p className="mt-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">
            Mostrando apenas a entidade <strong>{s.filterEntity.name}</strong> ({s.filterEntity.type}). Altere o seletor
            no topo da página para ver tudo.
          </p>
        )}
      </div>

      <OnboardingCard />

      <Card className="overflow-hidden border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 via-card to-sky-50/60 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/35 dark:via-card dark:to-sky-950/25">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-emerald-950 dark:text-emerald-100">
            Seu dinheiro trabalhando — projeção de investimentos (5 anos)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Com base nos <strong className="text-foreground">CDBs ativos</strong> que você cadastrou (% CDI, IR
            regressivo e CDI anual assumido por aplicação). Não é promessa de retorno: é um cenário para lembrar o
            poder dos <strong className="text-foreground">juros compostos</strong> e manter o hábito de investir.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {cdb5Err && (
            <p className="text-sm text-destructive">Não foi possível carregar a projeção de CDB. Tente atualizar a página.</p>
          )}
          {!cdb5Err && !cdb5 && <p className="text-sm text-muted-foreground">A carregar projeção…</p>}
          {cdb5 && cdbApps === 0 && (
            <div className="rounded-lg border border-dashed border-emerald-300/80 bg-card/60 px-4 py-6 text-center dark:border-emerald-800/50">
              <p className="text-sm text-foreground">
                Ainda sem aplicações em CDB no cenário ativo. <strong>Comece hoje</strong> — mesmo valores modestos,
                com consistência, mudam o gráfico com o tempo.
              </p>
              <Button asChild className="mt-4 touch-manipulation" variant="default">
                <Link to="/cdb">Cadastrar CDB e ver a primeira projeção</Link>
              </Button>
            </div>
          )}
          {cdb5 && cdbApps > 0 && cdbChart.length > 0 && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-emerald-200/60 bg-white/70 px-3 py-3 dark:border-emerald-900/50 dark:bg-card/80">
                  <p className="text-xs font-medium text-muted-foreground">Patrimônio líquido estimado (último mês)</p>
                  <p className="mt-1 text-xl font-bold text-emerald-800 dark:text-emerald-200">
                    {brl(num(cdbLast?.totalNet))}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-200/60 bg-white/70 px-3 py-3 dark:border-emerald-900/50 dark:bg-card/80">
                  <p className="text-xs font-medium text-muted-foreground">Crescimento líquido no período (estim.)</p>
                  <p className="mt-1 text-xl font-bold text-sky-800 dark:text-sky-200">{brl(cdbGain5y)}</p>
                </div>
                <div className="rounded-lg border border-emerald-200/60 bg-white/70 px-3 py-3 dark:border-emerald-900/50 dark:bg-card/80">
                  <p className="text-xs font-medium text-muted-foreground">Principal hoje (soma CDBs)</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{brl(num(cdb5.summary.totalPrincipalNow))}</p>
                </div>
              </div>
              <div className="h-72 w-full md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cdbChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 88%)" />
                    <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} interval={5} />
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
                    <Line
                      type="monotone"
                      dataKey="líquido"
                      name="Patrimônio líquido (após IR)"
                      stroke="var(--chart-green)"
                      dot={false}
                      strokeWidth={2.5}
                    />
                    <Line
                      type="monotone"
                      dataKey="principal"
                      name="Principal aplicado"
                      stroke="hsl(215 16% 47%)"
                      dot={false}
                      strokeWidth={1}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{cdb5.methodology}</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary" size="sm" className="touch-manipulation">
                  <Link to="/cdb">Ajustar CDBs e taxas</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="touch-manipulation">
                  <Link to="/projecoes">Outras projeções</Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ações rápidas</CardTitle>
          {snapMsg && <p className="mt-2 text-sm text-muted-foreground">{snapMsg}</p>}
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="default" className="touch-manipulation">
            <Link to="/movimentos/receitas">+ Nova receita</Link>
          </Button>
          <Button asChild variant="secondary" className="touch-manipulation">
            <Link to="/movimentos/despesas">+ Nova despesa</Link>
          </Button>
          <Button asChild variant="outline" className="touch-manipulation">
            <Link to="/movimentos/receitas?filter=proximos">Receitas a vencer (30 dias)</Link>
          </Button>
          <Button asChild variant="outline" className="touch-manipulation">
            <Link to="/movimentos/despesas?filter=proximos">Despesas a vencer (30 dias)</Link>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="touch-manipulation"
            disabled={snapBusy}
            onClick={() => void quickSnapshot()}
          >
            {snapBusy ? 'A guardar…' : 'Guardar instantâneo no histórico'}
          </Button>
          <Button asChild variant="outline" className="touch-manipulation">
            <Link to="/historico">Ver histórico financeiro</Link>
          </Button>
          <Button asChild variant="ghost" className="touch-manipulation">
            <Link to="/estrutura">Estrutura / cadastros</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/25 bg-primary/[0.04] lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground/80">Patrimônio total (contas + bens)</CardTitle>
            <p className="text-xs text-muted-foreground">
              Bens: imóveis e móveis com valor estimado.{' '}
              <Link to="/patrimonio-bens" className="font-medium text-primary underline-offset-4 hover:underline">
                Gerir bens
              </Link>
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-semibold tracking-tight">{brl(s.patrimonyTotal.consolidated)}</p>
            {!s.filterEntity && (
              <p className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
                <span className="mr-3">PF: {brl(s.patrimonyTotal.pf)}</span>
                <span>PJ: {brl(s.patrimonyTotal.pj)}</span>
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground/75">Só saldo em contas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{brl(s.balances.consolidated)}</CardContent>
          {!s.filterEntity && (
            <p className="mt-2 text-xs text-muted-foreground">
              PF {brl(s.balances.pf)} · PJ {brl(s.balances.pj)}
            </p>
          )}
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground/75">Bens (estimado)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{brl(s.patrimonyAssets.consolidated)}</CardContent>
          {!s.filterEntity && (
            <p className="mt-2 text-xs text-muted-foreground">
              PF {brl(s.patrimonyAssets.pf)} · PJ {brl(s.patrimonyAssets.pj)}
            </p>
          )}
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground/75">Financiamentos / empréstimos (saldo)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{brl(s.financingOutstanding)}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Dívidas — financiamentos e cartões</CardTitle>
            <p className="text-xs text-muted-foreground">
              Lista de contratos com saldo de principal e parcelas em aberto; cartões com fatura do mês atual.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <THead>
                  <TR>
                    <TH>Tipo</TH>
                    <TH>Nome</TH>
                    <TH className="text-right">Saldo / fatura</TH>
                    <TH className="text-right">Parcelas</TH>
                  </TR>
                </THead>
                <TBody>
                  {s.debtsFinancing.length === 0 && s.creditCards.length === 0 ? (
                    <TR>
                      <TD colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                        Nenhum financiamento cadastrado e nenhum cartão ativo, ou saldos zerados.
                      </TD>
                    </TR>
                  ) : (
                    <>
                      {s.debtsFinancing.map((d) => (
                        <TR key={d.id}>
                          <TD className="text-xs text-muted-foreground">{debtKindLabel(d.kind)}</TD>
                          <TD>
                            <div className="font-medium">{d.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {d.creditor ?? '—'}
                              {d.financialEntityName ? ` · ${d.financialEntityName}` : ''}
                            </div>
                          </TD>
                          <TD className="text-right font-medium">{brl(d.currentBalance)}</TD>
                          <TD className="text-right text-xs text-muted-foreground">
                            {d.installmentsPrevisto > 0 ? (
                              <>
                                {d.installmentsPrevisto} em aberto
                                <br />
                                <span className="text-[11px]">Soma prev.: {brl(d.sumPrevistoPayments)}</span>
                              </>
                            ) : (
                              '—'
                            )}
                          </TD>
                        </TR>
                      ))}
                      {s.creditCards.map((c) => (
                        <TR key={c.name}>
                          <TD className="text-xs text-muted-foreground">Cartão</TD>
                          <TD>
                            <div className="font-medium">{c.name}</div>
                            <div className="text-xs text-muted-foreground">Fatura mês atual</div>
                          </TD>
                          <TD className="text-right font-medium">{brl(c.monthTotal)}</TD>
                          <TD className="text-right text-xs text-muted-foreground">
                            {c.limit != null ? `Lim. ${brl(c.limit)}` : '—'}
                          </TD>
                        </TR>
                      ))}
                    </>
                  )}
                </TBody>
              </Table>
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-3 text-sm">
              <span className="text-muted-foreground">Total financiamentos (principal)</span>
              <span className="font-semibold">{brl(s.financingOutstanding)}</span>
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Total cartões (faturas mês)</span>
              <span className="font-semibold">{brl(s.creditCardsDebtTotal)}</span>
            </div>
            <Button asChild variant="outline" size="sm" className="touch-manipulation">
              <Link to="/financiamentos">Gerir financiamentos / empréstimos</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Projeção de quitação (6 anos)</CardTitle>
            <p className="text-xs text-muted-foreground">
              Saldo de <strong>financiamentos</strong> no fim de cada ano civil, assumindo pagamento das parcelas
              PREVISTO conforme a tabela. Linha dos <strong>cartões</strong> repete a fatura do mês atual só como
              referência (não projeta uso futuro do rotativo).
            </p>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={debtYearly}>
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
                <Line
                  type="monotone"
                  dataKey="Financiamentos"
                  stroke="var(--chart-orange)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="Cartões (ref.)"
                  stroke="var(--chart-blue)"
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line type="monotone" dataKey="Total" stroke="var(--chart-green)" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground/75">
              Receita total no ano ({s.annualYear})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-primary">{brl(s.revenuesYear.consolidated)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              PF {brl(s.revenuesYear.pf)} · PJ {brl(s.revenuesYear.pj)}
            </p>
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
              Competência no ano civil; previsto + recebido + atrasado.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground/75">
              Despesa total no ano ({s.annualYear})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-accent">{brl(s.expensesYear.consolidated)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              PF {brl(s.expensesYear.pf)} · PJ {brl(s.expensesYear.pj)}
            </p>
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
              Competência no ano civil; previsto + pago + atrasado.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground/75">
              Resultado no ano ({s.annualYear})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{brl(s.resultYear.consolidated)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              PF {brl(s.resultYear.pf)} · PJ {brl(s.resultYear.pj)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">
              Mês atual ({s.month.month}/{s.month.year})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Receitas previstas</span>
              <span>{brl(s.revenuesMonth.consolidated)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Despesas previstas</span>
              <span>{brl(s.expensesMonth.consolidated)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-medium">
              <span>Resultado previsto</span>
              <span>{brl(s.resultForecast.consolidated)}</span>
            </div>
            <p className="pt-2 text-xs text-muted-foreground">
              Contratos ativos: {s.activeContracts.length}. Use as ações rápidas acima para ver receitas e despesas com
              vencimento nos próximos 30 dias.
            </p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Fluxo de caixa projetado (12 meses)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cf}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 88%)" />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
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
                <Line type="monotone" dataKey="net" name="Saldo líquido mês" stroke="var(--chart-blue)" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Despesas por categoria (mês)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.charts.expensesByCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 88%)" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={70} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip formatter={(v: number) => brl(v)} />
                <Bar dataKey="value" fill="var(--chart-green)" name="Valor" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receitas por fonte (mês)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.charts.revenuesByPayer}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 88%)" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={70} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip formatter={(v: number) => brl(v)} />
                <Bar dataKey="value" fill="var(--chart-blue)" name="Valor" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
