import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { brl } from '@/lib/format';
import { usePreferences } from '@/lib/preferences';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
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
  despesas: number;
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
    despesas: number;
    despesasCdb: number;
    despesasOutras: number;
    sobraLivre: number;
  };
  nota?: string;
};

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function LiquidezMensal() {
  const { entityFilterId } = usePreferences();
  const currentY = new Date().getFullYear();
  const [scope, setScope] = useState<Scope>('CONSOLIDADO');
  const [year, setYear] = useState(currentY);
  const [data, setData] = useState<LiquidityResponse | null>(null);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set('year', String(year));
    p.set('scope', scope);
    if (entityFilterId) p.set('financialEntityId', entityFilterId);
    return p.toString();
  }, [year, scope, entityFilterId]);

  useEffect(() => {
    api.get<LiquidityResponse>(`/reports/monthly-liquidity?${query}`).then((r) => setData(r.data));
  }, [query]);

  const chartData =
    data?.months.map((m) => ({
      label: MESES[m.month - 1],
      Receitas: m.receitas,
      'Desp. CDB': m.despesasCdb,
      'Outras desp.': m.despesasOutras,
      'Sobra livre': m.sobraLivre,
    })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sobra livre no mês</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Após todas as despesas do mês (incluindo aportes em CDB lançados como despesa), quanto sobra de receitas
          menos despesas, mês a mês no ano. Mesma base da DRE mensal (competência). Despesas CDB são estimadas pelo
          texto &quot;cdb&quot; na descrição ou na categoria. Cadastro de CDB:{' '}
          <Link to="/cdb" className="font-medium text-primary underline-offset-4 hover:underline">
            CDB / CDI
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
              O filtro de entidade no topo da aplicação restringe estes números a uma única entidade; o escopo acima
              fica indisponível enquanto o filtro estiver ativo.
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
      </div>

      {data?.nota && <p className="text-xs text-muted-foreground">{data.nota}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receitas, despesas (CDB + outras) e sobra livre (linha)</CardTitle>
        </CardHeader>
        <CardContent className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => brl(v)} width={72} />
              <Tooltip formatter={(v: number) => brl(v)} />
              <Legend />
              <Bar dataKey="Receitas" fill="var(--chart-green)" name="Receitas" />
              <Bar dataKey="Desp. CDB" stackId="desp" fill="var(--chart-orange)" name="Desp. CDB" />
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
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Mês</TH>
                <TH className="text-right">Receitas</TH>
                <TH className="text-right">Desp. CDB</TH>
                <TH className="text-right">Outras desp.</TH>
                <TH className="text-right">Despesas (total)</TH>
                <TH className="text-right">Sobra livre</TH>
              </TR>
            </THead>
            <TBody>
              {data?.months.map((m) => (
                <TR key={m.monthKey}>
                  <TD>{MESES[m.month - 1]}</TD>
                  <TD className="text-right tabular-nums">{brl(m.receitas)}</TD>
                  <TD className="text-right tabular-nums text-muted-foreground">{brl(m.despesasCdb)}</TD>
                  <TD className="text-right tabular-nums text-muted-foreground">{brl(m.despesasOutras)}</TD>
                  <TD className="text-right tabular-nums">{brl(m.despesas)}</TD>
                  <TD
                    className={`text-right tabular-nums font-medium ${
                      m.sobraLivre >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'
                    }`}
                  >
                    {brl(m.sobraLivre)}
                  </TD>
                </TR>
              ))}
              {data && (
                <TR className="border-t-2 font-medium">
                  <TD>Total ano</TD>
                  <TD className="text-right tabular-nums">{brl(data.totals.receitas)}</TD>
                  <TD className="text-right tabular-nums">{brl(data.totals.despesasCdb)}</TD>
                  <TD className="text-right tabular-nums">{brl(data.totals.despesasOutras)}</TD>
                  <TD className="text-right tabular-nums">{brl(data.totals.despesas)}</TD>
                  <TD
                    className={`text-right tabular-nums ${
                      data.totals.sobraLivre >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'
                    }`}
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
