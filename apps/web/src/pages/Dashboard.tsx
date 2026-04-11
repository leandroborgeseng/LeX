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
import { Button } from '@/components/ui/button';
import { OnboardingCard } from '@/components/layout/OnboardingCard';

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão consolidada e projeções do período</p>
        {s.filterEntity && (
          <p className="mt-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">
            A mostrar apenas a entidade <strong>{s.filterEntity.name}</strong> ({s.filterEntity.type}). Altere no seletor
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo PF (contas)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{brl(s.balances.pf)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo PJ (contas)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{brl(s.balances.pj)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Consolidado</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{brl(s.balances.consolidated)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Financiamentos (saldo)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{brl(s.financingOutstanding)}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Faturas atuais dos cartões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Cartão</th>
                  <th className="py-2 pr-4">Total mês</th>
                  <th className="py-2">Limite</th>
                </tr>
              </thead>
              <tbody>
                {s.creditCards.map((c) => (
                  <tr key={c.name} className="border-b border-border/60">
                    <td className="py-2 pr-4">{c.name}</td>
                    <td className="py-2 pr-4">{brl(c.monthTotal)}</td>
                    <td className="py-2">{c.limit != null ? brl(c.limit) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
