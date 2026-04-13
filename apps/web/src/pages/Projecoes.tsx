import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { brl, parseBrlInput } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Row = { month: string; projectedBalance: number; inflow: number; outflow: number };

type FinOption = {
  id: string;
  name: string;
  installments: { status: string; payment: string }[];
};

type EarlyPayoffOk = {
  financingId: string;
  payoffAmount: number;
  futureInstallmentsSum: number;
  estimatedInterestAvoided: number;
  insuranceTotalPremium?: number;
  insuranceRemainingMonths?: number;
  insuranceContractMonths?: number;
  insuranceProportionalRefund?: number;
  totalEstimatedBenefit?: number;
};

type EarlyPayoffErr = { error: string };

function futurePrevistoSum(f: FinOption): number {
  return f.installments
    .filter((i) => i.status === 'PREVISTO')
    .reduce((s, i) => s + parseFloat(i.payment), 0);
}

export default function Projecoes() {
  const [base, setBase] = useState<Row[]>([]);
  const [cons, setCons] = useState<Row[]>([]);

  const [simMonths, setSimMonths] = useState(24);
  const [contractDeltaInput, setContractDeltaInput] = useState('5000');
  const [shockExtraInput, setShockExtraInput] = useState('2000');

  const [baseSim, setBaseSim] = useState<Row[]>([]);
  const [contractSim, setContractSim] = useState<Row[]>([]);
  const [shockSim, setShockSim] = useState<Row[]>([]);

  const [financings, setFinancings] = useState<FinOption[]>([]);
  const [payoffFinId, setPayoffFinId] = useState('');
  const [payoffAmountInput, setPayoffAmountInput] = useState('');
  const [payoffResult, setPayoffResult] = useState<EarlyPayoffOk | EarlyPayoffErr | null>(null);
  const [payoffLoading, setPayoffLoading] = useState(false);

  const contractDelta = parseFloat(contractDeltaInput.replace(',', '.')) || 0;
  const shockExtra = parseFloat(shockExtraInput.replace(',', '.')) || 0;

  useEffect(() => {
    api.get<{ months: Row[] }>('/projections/base?months=60').then((r) => setBase(r.data.months));
    api
      .get<{ months: Row[] }>('/projections/conservative?months=60')
      .then((r) => setCons(r.data.months));
  }, []);

  useEffect(() => {
    const m = simMonths;
    const d = contractDelta;
    const x = shockExtra;
    void Promise.all([
      api.get<{ months: Row[] }>(`/projections/base?months=${m}`),
      api.get<{ months: Row[] }>(
        `/projections/contract-impact?months=${m}&monthlyNetDelta=${encodeURIComponent(String(d))}`,
      ),
      api.get<{ months: Row[] }>(
        `/projections/expense-shock?months=${m}&extraMonthly=${encodeURIComponent(String(x))}`,
      ),
    ]).then(([b, c, s]) => {
      setBaseSim(b.data.months);
      setContractSim(c.data.months);
      setShockSim(s.data.months);
    });
  }, [simMonths, contractDelta, shockExtra]);

  useEffect(() => {
    api.get<FinOption[]>('/financings').then((r) => setFinancings(r.data));
  }, []);

  useEffect(() => {
    const f = financings.find((x) => x.id === payoffFinId);
    if (f) {
      const sum = futurePrevistoSum(f);
      if (sum > 0) {
        setPayoffAmountInput(
          sum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        );
      } else setPayoffAmountInput('');
    } else {
      setPayoffAmountInput('');
    }
  }, [payoffFinId, financings]);

  const merged = base.map((b, i) => ({
    month: b.month,
    base: b.projectedBalance,
    conservative: cons[i]?.projectedBalance ?? b.projectedBalance,
  }));

  const contractChart = useMemo(
    () =>
      baseSim.map((b, i) => ({
        month: b.month,
        base: b.projectedBalance,
        comImpacto: contractSim[i]?.projectedBalance ?? b.projectedBalance,
      })),
    [baseSim, contractSim],
  );

  const shockChart = useMemo(
    () =>
      baseSim.map((b, i) => ({
        month: b.month,
        base: b.projectedBalance,
        comChoque: shockSim[i]?.projectedBalance ?? b.projectedBalance,
      })),
    [baseSim, shockSim],
  );

  async function runPayoff() {
    if (!payoffFinId) return;
    const amt = parseBrlInput(payoffAmountInput);
    setPayoffLoading(true);
    setPayoffResult(null);
    try {
      const r = await api.get<EarlyPayoffOk | EarlyPayoffErr>(
        `/projections/early-payoff?financingId=${encodeURIComponent(payoffFinId)}&payoffAmount=${encodeURIComponent(String(amt))}`,
      );
      setPayoffResult(r.data);
    } finally {
      setPayoffLoading(false);
    }
  }

  const tooltipStyle = {
    background: '#ffffff',
    border: '1px solid hsl(214 32% 88%)',
    color: '#0f172a',
    borderRadius: '8px',
  };

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
              <Tooltip formatter={(v: number) => brl(v)} contentStyle={tooltipStyle} />
              <Legend />
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

      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card/40 p-4">
        <div className="min-w-[10rem] flex-1 space-y-2">
          <Label>Horizonte das simulações (meses)</Label>
          <select
            className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
            value={simMonths}
            onChange={(e) => setSimMonths(parseInt(e.target.value, 10))}
          >
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={36}>36</option>
            <option value={60}>60</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Impacto de contrato (receita líquida extra)</CardTitle>
            <p className="text-xs text-muted-foreground">
              Simula um aumento constante de saldo a cada mês (ex.: novo contrato com mesmo líquido mensal). Usa a mesma
              base da projeção; o efeito acumula no saldo projetado.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contract-delta">Delta líquido mensal (R$)</Label>
              <Input
                id="contract-delta"
                inputMode="decimal"
                value={contractDeltaInput}
                onChange={(e) => setContractDeltaInput(e.target.value)}
                placeholder="5000"
              />
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={contractChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 88%)" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => brl(v)} contentStyle={tooltipStyle} />
                  <Legend />
                  <Line type="monotone" dataKey="base" name="Base" stroke="var(--chart-blue)" dot={false} />
                  <Line
                    type="monotone"
                    dataKey="comImpacto"
                    name="Com impacto"
                    stroke="var(--chart-green)"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Choque de despesa</CardTitle>
            <p className="text-xs text-muted-foreground">
              Despesa adicional fixa por mês (ex.: inflação, novo custo recorrente). Reduz o saldo projetado de forma
              linear ao longo do horizonte.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shock-extra">Despesa extra mensal (R$)</Label>
              <Input
                id="shock-extra"
                inputMode="decimal"
                value={shockExtraInput}
                onChange={(e) => setShockExtraInput(e.target.value)}
                placeholder="2000"
              />
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={shockChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 88%)" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => brl(v)} contentStyle={tooltipStyle} />
                  <Legend />
                  <Line type="monotone" dataKey="base" name="Base" stroke="var(--chart-blue)" dot={false} />
                  <Line
                    type="monotone"
                    dataKey="comChoque"
                    name="Com choque"
                    stroke="var(--chart-orange)"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quitação antecipada de financiamento</CardTitle>
          <p className="text-xs text-muted-foreground">
            Compara o valor que você pagaria de uma vez com a soma das parcelas futuras previstas (apenas status
            PREVISTO). A API estima quanto você deixaria de pagar no total se a quitação for menor que esse somatório.
            Se cadastrou o <strong>prémio total do seguro</strong> no contrato, inclui também a{' '}
            <strong>devolução proporcional</strong> do seguro (parcelas em aberto ÷ total de parcelas), como referência
            — não substitui o contrato nem o credor.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Financiamento</Label>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
                value={payoffFinId}
                onChange={(e) => setPayoffFinId(e.target.value)}
              >
                <option value="">Selecione…</option>
                {financings.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payoff-amt">Valor da quitação (R$)</Label>
              <Input
                id="payoff-amt"
                inputMode="decimal"
                value={payoffAmountInput}
                onChange={(e) => setPayoffAmountInput(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>
          <Button type="button" onClick={() => void runPayoff()} disabled={!payoffFinId || payoffLoading}>
            {payoffLoading ? 'Calculando…' : 'Calcular simulação'}
          </Button>

          {payoffResult && 'error' in payoffResult && (
            <p className="text-sm text-destructive">{payoffResult.error}</p>
          )}

          {payoffResult && !('error' in payoffResult) && (
            <div className="grid gap-3 rounded-md border border-border bg-muted/30 p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <div className="text-xs text-muted-foreground">Parcelas futuras (soma)</div>
                <div className="font-medium">{brl(payoffResult.futureInstallmentsSum)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Valor da quitação informado</div>
                <div className="font-medium">{brl(payoffResult.payoffAmount)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Economia vs soma das parcelas</div>
                <div className="font-medium text-emerald-800">{brl(payoffResult.estimatedInterestAvoided)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Prémio total do seguro (cadastro)</div>
                <div className="font-medium">{brl(payoffResult.insuranceTotalPremium ?? 0)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Seguro proporcional (estimativa)</div>
                <div className="font-medium text-emerald-800">{brl(payoffResult.insuranceProportionalRefund ?? 0)}</div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {payoffResult.insuranceRemainingMonths ?? 0} em aberto ÷ {payoffResult.insuranceContractMonths ?? 0}{' '}
                  parcelas do contrato
                </p>
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <div className="text-xs text-muted-foreground">Benefício total estimado</div>
                <div className="font-semibold text-emerald-900">
                  {brl(
                    payoffResult.totalEstimatedBenefit ??
                      payoffResult.estimatedInterestAvoided + (payoffResult.insuranceProportionalRefund ?? 0),
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Economia nas parcelas + devolução proporcional do seguro (referência; sem desconto de taxas do
                  credor).
                </p>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Cadastre e acompanhe parcelas em{' '}
            <Link to="/financiamentos" className="font-medium text-primary underline-offset-4 hover:underline">
              Financiamentos / empréstimos
            </Link>
            . Ao escolher um financiamento, o campo de quitação é preenchido com a soma das parcelas PREVISTO (você
            pode alterar).
          </p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        API: <code className="rounded bg-muted px-1">GET /api/projections/contract-impact</code>,{' '}
        <code className="rounded bg-muted px-1">expense-shock</code>, <code className="rounded bg-muted px-1">early-payoff</code>
        — documentação em <code className="rounded bg-muted px-1">/api/docs</code>.
      </p>
    </div>
  );
}
