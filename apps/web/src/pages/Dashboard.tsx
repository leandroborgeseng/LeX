import { useEffect, useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Summary = {
  balances: { pf: number; pj: number; consolidated: number };
  revenuesMonth: { pf: number; pj: number; consolidated: number };
  expensesMonth: { pf: number; pj: number; consolidated: number };
  resultForecast: { pf: number; pj: number; consolidated: number };
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
};

export default function Dashboard() {
  const [s, setS] = useState<Summary | null>(null);

  useEffect(() => {
    api.get<Summary>('/dashboard/summary').then((r) => setS(r.data));
  }, []);

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
      </div>

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

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Mês atual</CardTitle>
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
              Contratos ativos: {s.activeContracts.length} · Próximos vencimentos listados abaixo na API (resumo).
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
                <XAxis dataKey="label" tick={{ fill: 'hsl(215 20% 65%)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'hsl(215 20% 65%)', fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => brl(v)}
                  contentStyle={{ background: 'hsl(222 40% 10%)', border: '1px solid hsl(217 33% 20%)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="net" name="Saldo líquido mês" stroke="hsl(199 89% 48%)" dot={false} />
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
                <XAxis dataKey="name" tick={{ fill: 'hsl(215 20% 65%)', fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={70} />
                <YAxis tick={{ fill: 'hsl(215 20% 65%)', fontSize: 11 }} />
                <Tooltip formatter={(v: number) => brl(v)} />
                <Bar dataKey="value" fill="hsl(172 66% 40%)" name="Valor" />
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
                <XAxis dataKey="name" tick={{ fill: 'hsl(215 20% 65%)', fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={70} />
                <YAxis tick={{ fill: 'hsl(215 20% 65%)', fontSize: 11 }} />
                <Tooltip formatter={(v: number) => brl(v)} />
                <Bar dataKey="value" fill="hsl(199 89% 48%)" name="Valor" />
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
