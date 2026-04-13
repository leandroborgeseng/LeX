import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { brl, formatDateBr, parseBrlInput } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Dialog, DialogContent } from '@/components/ui/dialog';

type FinancingKind = 'FINANCIAMENTO' | 'EMPRESTIMO';

type Entity = { id: string; name: string };
type Inst = {
  id: string;
  number: number;
  dueDate: string;
  payment: string;
  interest: string;
  amortization: string;
  balanceAfter: string;
  status: string;
};
type Fin = {
  id: string;
  financialEntityId: string | null;
  kind?: FinancingKind;
  name: string;
  creditor: string | null;
  originalValue: string;
  monthlyRate: string;
  installmentsCount: number;
  currentBalance: string;
  insuranceTotalPremium?: string;
  installments: Inst[];
};

function kindLabel(k: string | undefined): string {
  return k === 'EMPRESTIMO' ? 'Empréstimo' : 'Financiamento';
}

/** Estimativa: prémio total × (parcelas PREVISTO ÷ prazo total em parcelas), alinhado à regra de proporcionalidade. */
function insuranceProportionalEstimate(
  totalPremium: number,
  installmentsCount: number,
  previstoCount: number,
): number {
  if (totalPremium <= 0 || installmentsCount <= 0 || previstoCount <= 0) return 0;
  return Math.round(totalPremium * (previstoCount / installmentsCount) * 100) / 100;
}

function SeguroPrestamistaInfo() {
  return (
    <Card className="border-sky-200/80 bg-sky-50/40 dark:border-sky-900/40 dark:bg-sky-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Seguro (ex.: prestamista) e quitação antecipada</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          Em contratos com <strong className="text-foreground">seguro vinculado</strong> (morte, invalidez e, em
          alguns casos, desemprego), ao <strong className="text-foreground">quitar antes do prazo</strong> costuma-se
          pedir a <strong className="text-foreground">devolução proporcional</strong> do seguro correspondente ao
          período não utilizado — por exemplo, em 24 meses com 12 parcelas ainda em aberto, uma referência comum é
          cerca de <strong className="text-foreground">50%</strong> do prémio (descontando encargos administrativos,
          conforme o contrato e o credor).
        </p>
        <p>
          Neste cadastro, informe o <strong className="text-foreground">prémio total do seguro</strong> do contrato; o
          sistema estima a restituição multiplicando esse valor pela fração{' '}
          <strong className="text-foreground">parcelas em aberto ÷ total de parcelas do contrato</strong>.
        </p>
        <ul className="list-inside list-disc space-y-1 pl-1">
          <li>
            Em geral, não se paga por cobertura não utilizada (orientação consumerista; normas da SUSEP e princípios do
            CDC costumam ser invocados em discussões com bancos como Santander, Itaú, Bradesco etc.).
          </li>
          <li>
            Pode não haver devolução se o seguro não foi discriminado, se o contrato prevê prémio único não reembolsável
            (interpretação discutível) ou se o cancelamento foge das regras do produto.
          </li>
        </ul>
        <p className="text-xs">
          Isto é <strong className="text-foreground">apenas simulação e organização</strong>, não assessoria jurídica
          nem cálculo oficial do banco/seguradora.
        </p>
      </CardContent>
    </Card>
  );
}

function RepricePanel({ fin, onDone }: { fin: Fin; onDone: () => Promise<void> }) {
  const [rate, setRate] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setRate(String(parseFloat(fin.monthlyRate)));
    setMsg(null);
  }, [fin.id, fin.monthlyRate]);

  async function apply() {
    const v = parseFloat(rate.replace(',', '.'));
    if (!Number.isFinite(v) || v < 0) {
      setMsg('Informe uma taxa válida (% ao mês).');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await api.post(`/financings/${fin.id}/reprice`, { monthlyRate: v });
      setMsg('Taxa atualizada e parcelas em aberto recalculadas com o saldo atual.');
      await onDone();
    } catch {
      setMsg('Não foi possível recalcular. Verifique a sessão e tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-amber-200/80 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/25">
      <h3 className="text-sm font-semibold text-amber-950 dark:text-amber-100">Corrigir taxa de juros</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Ajuste a taxa mensal (% a.m.) se tiver cadastrado errado. As parcelas <strong>PREVISTO</strong> são apagadas e
        geradas de novo com o <strong>saldo atual</strong> e a nova taxa; parcelas <strong>PAGO</strong> não mudam.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[8rem] flex-1 space-y-1">
          <Label className="text-xs">Taxa mensal (% a.m.)</Label>
          <Input value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" />
        </div>
        <Button type="button" variant="secondary" disabled={busy} onClick={() => void apply()}>
          {busy ? 'Recalculando…' : 'Aplicar e refazer tabela'}
        </Button>
      </div>
      {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}

function AntecipacaoTools({ fin }: { fin: Fin }) {
  const premioTotalSeguro = parseFloat(fin.insuranceTotalPremium ?? '0') || 0;

  const previstas = useMemo(
    () => [...fin.installments].filter((i) => i.status === 'PREVISTO').sort((a, b) => a.number - b.number),
    [fin.installments],
  );

  const totais = useMemo(
    () =>
      previstas.reduce(
        (acc, i) => ({
          parcela: acc.parcela + parseFloat(i.payment),
          juros: acc.juros + parseFloat(i.interest),
          amort: acc.amort + parseFloat(i.amortization),
        }),
        { parcela: 0, juros: 0, amort: 0 },
      ),
    [previstas],
  );

  const proporcionalSeguro = insuranceProportionalEstimate(
    premioTotalSeguro,
    fin.installmentsCount || 1,
    previstas.length,
  );

  const maxN = previstas.length;
  const [nStr, setNStr] = useState('1');
  const n = maxN === 0 ? 0 : Math.min(Math.max(parseInt(nStr, 10) || 1, 1), maxN);
  const slice = maxN === 0 ? [] : previstas.slice(0, n);
  const sub = slice.reduce(
    (acc, i) => ({
      parcela: acc.parcela + parseFloat(i.payment),
      juros: acc.juros + parseFloat(i.interest),
      amort: acc.amort + parseFloat(i.amortization),
    }),
    { parcela: 0, juros: 0, amort: 0 },
  );

  const [quitacao, setQuitacao] = useState('');
  const quitVal = parseBrlInput(quitacao);
  const economia = totais.parcela > 0 ? Math.max(0, totais.parcela - quitVal) : 0;
  const beneficioComSeguro = economia + proporcionalSeguro;

  const [discPct, setDiscPct] = useState('0');
  const disc = parseFloat(String(discPct).replace(',', '.')) || 0;
  const r = disc / 100;
  const vp =
    maxN === 0 ? 0 : r > 0
      ? previstas.reduce((s, inst, idx) => s + parseFloat(inst.payment) / Math.pow(1 + r, idx + 1), 0)
      : totais.parcela;

  function preencherQuitacaoTotal() {
    if (totais.parcela <= 0) return;
    setQuitacao(
      totais.parcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    );
  }

  if (maxN === 0) {
    return (
      <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/20 p-4">
        <h3 className="text-sm font-semibold">Ferramentas — antecipação e quitação</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Não há parcelas em aberto (PREVISTO). Quando existirem, você poderá simular antecipação em lote e quitação
          negociada aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6 rounded-lg border border-dashed border-border bg-muted/20 p-4">
      <div>
        <h3 className="text-sm font-semibold">Ferramentas — antecipação e quitação</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Cálculos locais com base na tabela cadastrada (parcelas PREVISTO). Não substituem condições contratuais nem
          descontos do credor; use para cenários e negociação.
        </p>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-border bg-card/60 p-3">
          <div className="text-xs text-muted-foreground">Parcelas em aberto</div>
          <div className="text-lg font-semibold">{maxN}</div>
        </div>
        <div className="rounded-md border border-border bg-card/60 p-3">
          <div className="text-xs text-muted-foreground">Soma das parcelas (nominal)</div>
          <div className="text-lg font-semibold">{brl(totais.parcela)}</div>
        </div>
        <div className="rounded-md border border-border bg-card/60 p-3">
          <div className="text-xs text-muted-foreground">Juros embutidos (soma)</div>
          <div className="font-medium">{brl(totais.juros)}</div>
        </div>
        <div className="rounded-md border border-border bg-card/60 p-3">
          <div className="text-xs text-muted-foreground">Amortização (soma)</div>
          <div className="font-medium">{brl(totais.amort)}</div>
        </div>
        {premioTotalSeguro > 0 && (
          <div className="rounded-md border border-emerald-200/80 bg-emerald-50/50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20 sm:col-span-2 lg:col-span-1">
            <div className="text-xs text-muted-foreground">Prémio total do seguro (contrato)</div>
            <div className="font-semibold text-emerald-900 dark:text-emerald-100">{brl(premioTotalSeguro)}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Devolução proporcional estimada agora:{' '}
              <span className="font-medium text-foreground">{brl(proporcionalSeguro)}</span>
              <span className="block pt-0.5">
                ({previstas.length} em aberto ÷ {fin.installmentsCount} parcelas do contrato)
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2 rounded-md border border-border bg-card/40 p-3">
          <Label className="text-sm font-medium">Valor presente das parcelas futuras</Label>
          <p className="text-xs text-muted-foreground">
            Desconta cada parcela pela taxa mensal informada (ex.: custo de oportunidade ou desconto bancário). Com
            taxa 0%, coincide com a soma nominal.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[8rem] flex-1 space-y-1">
              <Label className="text-xs">Taxa de desconto (% a.m.)</Label>
              <Input value={discPct} onChange={(e) => setDiscPct(e.target.value)} inputMode="decimal" placeholder="0" />
            </div>
            <div className="rounded-md bg-muted px-3 py-2 text-sm">
              <span className="text-muted-foreground">VP: </span>
              <span className="font-semibold">{brl(vp)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2 rounded-md border border-border bg-card/40 p-3">
          <Label className="text-sm font-medium">Antecipar as próximas N parcelas (em ordem)</Label>
          <p className="text-xs text-muted-foreground">
            Soma capital + juros das primeiras N parcelas ainda não pagas (conforme a tabela).
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[6rem] space-y-1">
              <Label className="text-xs">N parcelas</Label>
              <Input
                type="number"
                min={1}
                max={maxN}
                value={nStr}
                onChange={(e) => setNStr(e.target.value)}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Total a pagar</span>
                <span className="font-medium">{brl(sub.parcela)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Juros (parcelas escolhidas)</span>
                <span>{brl(sub.juros)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Amortização</span>
                <span>{brl(sub.amort)}</span>
              </div>
            </div>
          </div>
          {slice.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Inclui parcelas nº {slice[0].number} a {slice[slice.length - 1].number} (venc.{' '}
              {formatDateBr(slice[0].dueDate)} — {formatDateBr(slice[slice.length - 1].dueDate)}).
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-md border border-border bg-card/40 p-3">
        <Label className="text-sm font-medium">Quitação total negociada</Label>
        <p className="text-xs text-muted-foreground">
          Informe o valor único acordado para encerrar todas as parcelas PREVISTO. A diferença em relação à soma nominal
          das parcelas é uma estimativa de economia (mesma lógica de{' '}
          <code className="rounded bg-muted px-1">GET /projections/early-payoff</code> na API).
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[12rem] flex-1 space-y-1">
            <Label className="text-xs">Valor de quitação (R$)</Label>
            <Input value={quitacao} onChange={(e) => setQuitacao(e.target.value)} inputMode="decimal" placeholder="0,00" />
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={preencherQuitacaoTotal}>
            Usar soma nominal
          </Button>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Economia estimada vs soma das parcelas: </span>
            <span className="font-semibold text-emerald-800">{brl(economia)}</span>
          </div>
          {premioTotalSeguro > 0 && (
            <div className="w-full space-y-1 rounded-md border border-border bg-card/50 p-3 text-xs">
              <p>
                <span className="text-muted-foreground">Devolução proporcional do seguro (estimativa): </span>
                <span className="font-medium text-emerald-800">{brl(proporcionalSeguro)}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Benefício conjunto (economia nas parcelas + seguro): </span>
                <span className="font-semibold text-emerald-900">{brl(beneficioComSeguro)}</span>
              </p>
              <p className="text-muted-foreground">
                Proporção = prémio total × parcelas PREVISTO ÷ total de parcelas. Encargos do credor não estão
                descontados; valide no contrato e com o banco/seguradora.
              </p>
            </div>
          )}
          {quitVal > totais.parcela && (
            <p className="text-xs text-amber-800">
              Valor acima da soma das parcelas: não há “economia” nominal neste modelo; confira valores com o credor.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Financiamentos() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [rows, setRows] = useState<Fin[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [kind, setKind] = useState<FinancingKind>('FINANCIAMENTO');
  const [name, setName] = useState('');
  const [creditor, setCreditor] = useState('');
  const [originalValue, setOriginalValue] = useState('');
  const [monthlyRate, setMonthlyRate] = useState('0.8');
  const [installmentsCount, setInstallmentsCount] = useState('24');
  const [amortSystem, setAmortSystem] = useState<'PRICE' | 'SAC'>('PRICE');
  const [startDate, setStartDate] = useState('');
  const [insuranceCreate, setInsuranceCreate] = useState('0');
  const [createEntityId, setCreateEntityId] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Fin | null>(null);
  const [eEntityId, setEEntityId] = useState('');
  const [eKind, setEKind] = useState<FinancingKind>('FINANCIAMENTO');
  const [eName, setEName] = useState('');
  const [eCreditor, setECreditor] = useState('');
  const [eInsurance, setEInsurance] = useState('0');
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  async function load() {
    const [e, f] = await Promise.all([api.get<Entity[]>('/financial-entities'), api.get<Fin[]>('/financings')]);
    setEntities(e.data);
    setRows(f.data);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (editing && editOpen) {
      setEEntityId(editing.financialEntityId ?? '');
      setEKind(editing.kind ?? 'FINANCIAMENTO');
      setEName(editing.name);
      setECreditor(editing.creditor ?? '');
      setEInsurance(String(parseFloat(editing.insuranceTotalPremium ?? '0') || 0));
    }
  }, [editing, editOpen]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.post('/financings', {
      kind,
      name,
      financialEntityId: createEntityId || undefined,
      creditor: creditor || undefined,
      originalValue: parseFloat(originalValue.replace(',', '.')) || 0,
      monthlyRate: parseFloat(monthlyRate.replace(',', '.')) || 0,
      installmentsCount: parseInt(installmentsCount, 10) || 1,
      amortSystem,
      startDate: new Date(startDate).toISOString(),
      insuranceTotalPremium: parseFloat(insuranceCreate.replace(',', '.')) || 0,
    });
    setName('');
    setCreditor('');
    setOriginalValue('');
    setCreateEntityId('');
    await load();
  }

  async function syncExpenses(id: string) {
    setSyncingId(id);
    try {
      await api.post(`/financings/${id}/sync-expenses`);
      await load();
    } finally {
      setSyncingId(null);
    }
  }

  function openEdit(f: Fin) {
    setEditing(f);
    setEditOpen(true);
  }

  async function saveEdit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await api.patch(`/financings/${editing.id}`, {
        name: eName,
        kind: eKind,
        creditor: eCreditor.trim() ? eCreditor : null,
        financialEntityId: eEntityId || null,
        insuranceTotalPremium: parseFloat(eInsurance.replace(',', '.')) || 0,
      });
      setEditOpen(false);
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md" onOpenAutoFocus={(ev) => ev.preventDefault()}>
          <h2 className="text-lg font-semibold">Editar contrato</h2>
          <p className="text-sm text-muted-foreground">
            Ajuste tipo, nome, credor, seguro e entidade. Para corrigir a <strong>taxa de juros</strong> e refazer as
            parcelas em aberto, use a área &quot;Corrigir taxa de juros&quot; ao expandir o contrato.
          </p>
          {editing && (
            <form onSubmit={saveEdit} className="grid gap-4">
              <div className="space-y-2">
                <Label>Tipo de contrato</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                  value={eKind}
                  onChange={(e) => setEKind(e.target.value as FinancingKind)}
                >
                  <option value="FINANCIAMENTO">Financiamento</option>
                  <option value="EMPRESTIMO">Empréstimo</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Entidade (opcional)</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                  value={eEntityId}
                  onChange={(e) => setEEntityId(e.target.value)}
                >
                  <option value="">—</option>
                  {entities.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={eName} onChange={(e) => setEName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Credor</Label>
                <Input value={eCreditor} onChange={(e) => setECreditor(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Prémio total do seguro — contrato (R$)</Label>
                <Input
                  value={eInsurance}
                  onChange={(e) => setEInsurance(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Valor total do seguro referente ao prazo completo; a devolução na quitação antecipada é estimada de
                  forma proporcional às parcelas em aberto.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando…' : 'Salvar'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <div>
        <h1 className="text-2xl font-semibold">Financiamentos e empréstimos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registe cada contrato como <strong>financiamento</strong> ou <strong>empréstimo</strong>, acompanhe parcelas
          e use as ferramentas de antecipação e quitação ao expandir um contrato.
        </p>
      </div>

      <SeguroPrestamistaInfo />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo contrato</CardTitle>
          <p className="text-xs text-muted-foreground">
            Com <strong>entidade (PF/PJ)</strong> selecionada, cada parcela em aberto gera automaticamente uma{' '}
            <strong>despesa PREVISTO</strong> na categoria &quot;Cartão / Financiamentos&quot;, com vencimento igual ao
            da parcela, para aparecer em Movimentos → Despesas.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <Label>Entidade (recomendado para despesas automáticas)</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={createEntityId}
                onChange={(e) => setCreateEntityId(e.target.value)}
              >
                <option value="">— Nenhuma (sem lançamento em despesas)</option>
                {entities.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={kind}
                onChange={(e) => setKind(e.target.value as FinancingKind)}
              >
                <option value="FINANCIAMENTO">Financiamento</option>
                <option value="EMPRESTIMO">Empréstimo</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Credor</Label>
              <Input value={creditor} onChange={(e) => setCreditor(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Valor original</Label>
              <Input value={originalValue} onChange={(e) => setOriginalValue(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Taxa mensal (%)</Label>
              <Input value={monthlyRate} onChange={(e) => setMonthlyRate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Parcelas</Label>
              <Input value={installmentsCount} onChange={(e) => setInstallmentsCount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Sistema</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={amortSystem}
                onChange={(e) => setAmortSystem(e.target.value as 'PRICE' | 'SAC')}
              >
                <option value="PRICE">PRICE (parcela fixa)</option>
                <option value="SAC">SAC</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Data inicial</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <Label>Prémio total do seguro — contrato (R$)</Label>
              <Input
                value={insuranceCreate}
                onChange={(e) => setInsuranceCreate(e.target.value)}
                inputMode="decimal"
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Opcional. Informe o prémio total do seguro (ex.: prestamista) para o prazo total; a restituição na
                quitação antecipada será estimada de forma proporcional.
              </p>
            </div>
            <div className="flex items-end">
              <Button type="submit">Gerar tabela</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          {rows.map((f) => {
            const fk = f.kind ?? 'FINANCIAMENTO';
            const premioSeg = parseFloat(f.insuranceTotalPremium ?? '0') || 0;
            const nPrev = f.installments.filter((i) => i.status === 'PREVISTO').length;
            const segProp = insuranceProportionalEstimate(premioSeg, f.installmentsCount || 1, nPrev);
            return (
              <div key={f.id} className="rounded-md border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        fk === 'EMPRESTIMO' ? 'bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200' : 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200'
                      }`}
                    >
                      {kindLabel(fk)}
                    </span>
                    <div>
                      <p className="font-medium">{f.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {f.creditor ?? '—'} · Saldo: {brl(parseFloat(f.currentBalance))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Taxa: {parseFloat(f.monthlyRate)}% a.m.
                        {premioSeg > 0 ? (
                          <>
                            {' '}
                            · Seguro (prémio total): {brl(premioSeg)}
                            {nPrev > 0 ? <> · Est. proporcional agora: {brl(segProp)}</> : null}
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(f)}>
                      Editar
                    </Button>
                    {f.financialEntityId ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={syncingId === f.id}
                        onClick={() => void syncExpenses(f.id)}
                      >
                        {syncingId === f.id ? 'Sincronizando…' : 'Sincronizar despesas'}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setExpanded(expanded === f.id ? null : f.id)}
                    >
                      {expanded === f.id ? 'Ocultar parcelas e ferramentas' : 'Ver parcelas e ferramentas'}
                    </Button>
                  </div>
                </div>
                {expanded === f.id && (
                  <>
                    <RepricePanel fin={f} onDone={load} />
                    <Table>
                      <THead>
                        <TR>
                          <TH>Nº</TH>
                          <TH>Vencimento</TH>
                          <TH>Parcela</TH>
                          <TH>Juros</TH>
                          <TH>Amort.</TH>
                          <TH>Saldo</TH>
                          <TH>Status</TH>
                        </TR>
                      </THead>
                      <TBody>
                        {f.installments.map((i) => (
                          <TR key={i.id}>
                            <TD>{i.number}</TD>
                            <TD>{formatDateBr(i.dueDate)}</TD>
                            <TD>{brl(parseFloat(i.payment))}</TD>
                            <TD>{brl(parseFloat(i.interest))}</TD>
                            <TD>{brl(parseFloat(i.amortization))}</TD>
                            <TD>{brl(parseFloat(i.balanceAfter))}</TD>
                            <TD>{i.status}</TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                    <AntecipacaoTools key={f.id} fin={f} />
                  </>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
