import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { brl } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

type Row = { month: string; projectedBalance: number; inflow: number; outflow: number };

export default function Projecoes() {
  const [base, setBase] = useState<Row[]>([]);
  const [cons, setCons] = useState<Row[]>([]);

  useEffect(() => {
    api.get<{ months: Row[] }>('/projections/base?months=12').then((r) => setBase(r.data.months));
    api
      .get<{ months: Row[] }>('/projections/conservative?months=12')
      .then((r) => setCons(r.data.months));
  }, []);

  const merged = base.map((b, i) => ({
    month: b.month,
    base: b.projectedBalance,
    conservative: cons[i]?.projectedBalance ?? b.projectedBalance,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Projeções</h1>
      <p className="text-sm text-muted-foreground">
        Saldo consolidado projetado mês a mês com base em receitas/despesas previstas cadastradas. Cenário
        conservador aplica receitas −5% e despesas +5%.
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saldo previsto (12 meses)</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={merged}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
              <XAxis dataKey="month" tick={{ fill: 'hsl(215 20% 65%)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'hsl(215 20% 65%)', fontSize: 11 }} />
              <Tooltip
                formatter={(v: number) => brl(v)}
                contentStyle={{ background: 'hsl(222 40% 10%)', border: '1px solid hsl(217 33% 20%)' }}
              />
              <Line type="monotone" dataKey="base" name="Cenário base" stroke="hsl(199 89% 48%)" dot={false} />
              <Line
                type="monotone"
                dataKey="conservative"
                name="Conservador"
                stroke="hsl(172 66% 40%)"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Simulações de impacto de contrato, choque de despesa e quitação antecipada de financiamento: endpoints{' '}
        <code className="rounded bg-muted px-1">/api/projections/contract-impact</code>,{' '}
        <code className="rounded bg-muted px-1">expense-shock</code> e{' '}
        <code className="rounded bg-muted px-1">early-payoff</code> na API.
      </p>
    </div>
  );
}
