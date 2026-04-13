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
import { brl } from '@/lib/format';
import { usePreferences } from '@/lib/preferences';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { OnboardingCard } from '@/components/layout/OnboardingCard';

function debtKindLabel(k: string) {
  return k === 'EMPRESTIMO' ? 'Empréstimo' : 'Financiamento';
}

type Summary = {
  balances: { pf: number; pj: number; consolidated: number };
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

export default function Dashboard() {
  const { entityFilterId } = usePreferences();
  const [s, setS] = useState<Summary | null>(null);

  useEffect(() => {
    setS(null);
    const q = entityFilterId ? `?financialEntityId=${encodeURIComponent(entityFilterId)}` : '';
    api.get<Summary>(`/dashboard/summary${q}`).then((r) => setS(r.data));
  }, [entityFilterId]);

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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ações rápidas</CardTitle>
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
          <Button asChild variant="ghost" className="touch-manipulation">
            <Link to="/estrutura">Estrutura / cadastros</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground/75">Saldo PF (contas)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{brl(s.balances.pf)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground/75">Saldo PJ (contas)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{brl(s.balances.pj)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground/75">Consolidado</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{brl(s.balances.consolidated)}</CardContent>
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
