import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
    api.get<{ months: Row[] }>('/projections/base?months=60').then((r) => setBase(r.data.months));
    api
      .get<{ months: Row[] }>('/projections/conservative?months=60')
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
        Saldo consolidado projetado mês a mês para os próximos <strong>5 anos</strong>, considerando receitas/despesas
        previstas e contratos ativos/prospects cadastrados. Cenário conservador aplica receitas −5% e despesas +5%.
        Para projeção específica de <strong>CDB (% CDI)</strong> com IR regressivo, use{' '}
        <Link to="/cdb" className="font-medium text-primary underline-offset-4 hover:underline">
          CDB / CDI
        </Link>
        .
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saldo previsto (60 meses)</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={merged}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 88%)" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
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
              <Line type="monotone" dataKey="base" name="Cenário base" stroke="var(--chart-blue)" dot={false} />
              <Line
                type="monotone"
                dataKey="conservative"
                name="Conservador"
                stroke="var(--chart-green)"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Simulações avançadas (impacto de contrato, choque de despesa, quitação antecipada de financiamento) existem na
        API para integrações; a interface dedicada a esses cenários pode ser acrescentada numa próxima versão.
      </p>
    </div>
  );
}
