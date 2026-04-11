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
  const [scope, setScope] = useState<Scope>('CONSOLIDADO');
  const [year, setYear] = useState(currentY);
  const [dreMonthly, setDreMonthly] = useState<{
    months: DreMonth[];
    totals: { receitaLiquida: number; despesas: number; resultado: number };
    nota?: string;
  } | null>(null);
  const [expCat, setExpCat] = useState<{ category: string; total: number }[]>([]);

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
  }, [scope, year]);

  const chartData =
    dreMonthly?.months.map((m) => ({
      label: MESES[m.month - 1],
      Receita: m.receitaLiquida,
      Despesas: m.despesas,
      Resultado: m.resultado,
    })) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Relatórios</h1>
      <p className="text-sm text-muted-foreground">
        Investimentos:{' '}
        <Link to="/cdb" className="font-medium text-primary underline-offset-4 hover:underline">
          CDB / CDI
        </Link>{' '}
        — cadastro, % do CDI (100% ou 110%), IR regressivo e projeção de 5 anos.
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
          <Label>Ano (DRE mensal)</Label>
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

      <p className="text-xs text-muted-foreground">
        Outros relatórios (fluxo mensal, receitas por fonte, evolução de dívidas, margem de contratos) estão disponíveis
        na documentação Swagger em <code className="rounded bg-muted px-1">/api/docs</code>.
      </p>
    </div>
  );
}
