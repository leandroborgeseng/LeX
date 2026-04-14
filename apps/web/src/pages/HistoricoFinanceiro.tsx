import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { brl, formatDateBr, todayDateInputValue } from '@/lib/format';
import { usePreferences } from '@/lib/preferences';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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

type SnapshotRow = {
  id: string;
  createdAt: string;
  referenceDate: string;
  note: string | null;
  consolidatedBalance: string | null;
  resultYearConsolidated: string | null;
  financingOutstanding: string | null;
  cdbPrincipalSum: string | null;
  cdbProjectedNet5y: string | null;
  financialEntity: { id: string; name: string; type: string } | null;
};

type SnapshotDetail = SnapshotRow & { payload: unknown };

function num(s: string | null | undefined): number {
  if (s == null || s === '') return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export default function HistoricoFinanceiro() {
  const { entityFilterId } = usePreferences();
  const [rows, setRows] = useState<SnapshotRow[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [note, setNote] = useState('');
  const [refDate, setRefDate] = useState(() => todayDateInputValue());
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState('');
  const [detail, setDetail] = useState<SnapshotDetail | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const p = new URLSearchParams();
    if (entityFilterId) p.set('financialEntityId', entityFilterId);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    const qs = p.toString();
    const { data } = await api.get<SnapshotRow[]>(
      qs ? `/financial-history/snapshots?${qs}` : '/financial-history/snapshots',
    );
    setRows(data);
  }, [entityFilterId, from, to]);

  useEffect(() => {
    void load().catch(() => setHint('Não foi possível carregar o histórico.'));
  }, [load]);

  async function saveSnapshot() {
    setSaving(true);
    setHint('');
    try {
      await api.post('/financial-history/snapshots', {
        financialEntityId: entityFilterId || undefined,
        note: note.trim() || undefined,
        referenceDate: new Date(refDate + 'T12:00:00').toISOString(),
      });
      setNote('');
      setHint('Instantâneo guardado. Volte daqui a meses para comparar.');
      await load();
    } catch {
      setHint('Não foi possível guardar o instantâneo.');
    } finally {
      setSaving(false);
    }
  }

  async function openDetail(id: string) {
    try {
      const { data } = await api.get<SnapshotDetail>(`/financial-history/snapshots/${id}`);
      setDetail(data);
    } catch {
      setHint('Não foi possível abrir o detalhe.');
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Eliminar este instantâneo do histórico?')) return;
    setDeletingId(id);
    setHint('');
    try {
      await api.delete(`/financial-history/snapshots/${id}`);
      if (detail?.id === id) setDetail(null);
      await load();
    } catch {
      setHint('Não foi possível eliminar.');
    } finally {
      setDeletingId(null);
    }
  }

  const chartData = useMemo(
    () =>
      [...rows]
        .sort((a, b) => new Date(a.referenceDate).getTime() - new Date(b.referenceDate).getTime())
        .map((r) => ({
          label: r.referenceDate.slice(0, 7),
          saldo: num(r.consolidatedBalance),
        })),
    [rows],
  );

  return (
    <div className="space-y-6 pb-6">
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden" showClose>
          <h2 className="text-lg font-semibold">Detalhe do instantâneo</h2>
          {detail && (
            <div className="space-y-3 overflow-y-auto pr-1 text-sm">
              <p className="text-muted-foreground">
                Referência: <strong className="text-foreground">{formatDateBr(detail.referenceDate)}</strong> ·
                Guardado em {formatDateBr(detail.createdAt)}
                {detail.financialEntity ? (
                  <>
                    {' '}
                    · <strong>{detail.financialEntity.name}</strong> ({detail.financialEntity.type})
                  </>
                ) : (
                  <> · <strong>Visão consolidada</strong></>
                )}
              </p>
              {detail.note && <p className="rounded-md bg-muted/60 px-3 py-2">Nota: {detail.note}</p>}
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded border border-border p-2">
                  <div className="text-xs text-muted-foreground">Patrimônio total (contas + bens)</div>
                  <div className="font-semibold">{brl(num(detail.consolidatedBalance))}</div>
                </div>
                <div className="rounded border border-border p-2">
                  <div className="text-xs text-muted-foreground">Resultado no ano (competência)</div>
                  <div className="font-semibold">{brl(num(detail.resultYearConsolidated))}</div>
                </div>
                <div className="rounded border border-border p-2">
                  <div className="text-xs text-muted-foreground">Financiamentos (principal)</div>
                  <div className="font-semibold">{brl(num(detail.financingOutstanding))}</div>
                </div>
                <div className="rounded border border-border p-2">
                  <div className="text-xs text-muted-foreground">CDB · principal / líquido fim 5a (est.)</div>
                  <div className="font-semibold">
                    {brl(num(detail.cdbPrincipalSum))} · {brl(num(detail.cdbProjectedNet5y))}
                  </div>
                </div>
              </div>
              <Label className="text-xs">Payload completo (JSON)</Label>
              <pre className="max-h-52 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs leading-relaxed">
                {JSON.stringify(detail.payload, null, 2)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Histórico financeiro</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Guarde instantâneos do resumo do dashboard (saldo, resultado no ano, dívidas, CDB) para comparar ao longo do
          tempo. Os valores gravados são sempre os <strong className="text-foreground">do momento em que guarda</strong>
          ; a <strong className="text-foreground">data de referência</strong> e a nota servem para organizar (ex.:
          “fecho jan/2024”). Para comparar com janeiro do ano passado, convém criar o hábito de um instantâneo nessa
          altura — ou gravar hoje com a data/nota que preferir.
        </p>
        {entityFilterId && (
          <p className="mt-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            Os instantâneos gravados aqui usam o <strong>filtro de entidade</strong> atual do topo da aplicação. Para
            consolidado, limpe o filtro antes de guardar.
          </p>
        )}
      </div>

      {hint && (
        <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">{hint}</p>
      )}

      <Card className="border-violet-200/60 bg-violet-50/30 dark:border-violet-900/40 dark:bg-violet-950/20">
        <CardHeader>
          <CardTitle className="text-base">Novo instantâneo</CardTitle>
          <p className="text-sm text-muted-foreground">
            Captura o estado <strong>agora</strong> (mesmos números que vê no dashboard). Use a data de referência para
            marcar o período que pretende lembrar (ex.: último dia do mês).
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-1">
            <Label>Data de referência</Label>
            <Input type="date" value={refDate} onChange={(e) => setRefDate(e.target.value)} />
          </div>
          <div className="min-w-[12rem] flex-1 space-y-1">
            <Label>Nota (opcional)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex.: Fecho jan/2025 antes de investir no CDB X"
            />
          </div>
          <Button type="button" disabled={saving} onClick={() => void saveSnapshot()} className="touch-manipulation">
            {saving ? 'A guardar…' : 'Guardar instantâneo'}
          </Button>
          <Button asChild variant="outline" size="sm" className="touch-manipulation">
            <Link to="/">Ir ao dashboard</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtrar lista</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Referência desde</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">até</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Aplicar
          </Button>
        </CardContent>
      </Card>

      {chartData.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução do saldo consolidado (instantâneos)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 88%)" />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => brl(v)} />
                <Legend />
                <Line type="monotone" dataKey="saldo" name="Patrimônio total" stroke="var(--chart-blue)" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Instantâneos guardados ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-2">
          <Table>
            <THead>
              <TR>
                <TH>Ref.</TH>
                <TH>Guardado</TH>
                <TH>Âmbito</TH>
                <TH className="text-right">Patrim. total</TH>
                <TH className="text-right">Res. ano</TH>
                <TH className="text-right">Financ.</TH>
                <TH>Nota</TH>
                <TH className="text-right"> </TH>
              </TR>
            </THead>
            <TBody>
              {rows.length === 0 ? (
                <TR>
                  <TD colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    Ainda não há instantâneos. Guarde o primeiro no bloco acima — por exemplo no fim de cada mês.
                  </TD>
                </TR>
              ) : (
                rows.map((r) => (
                  <TR key={r.id}>
                    <TD>{formatDateBr(r.referenceDate)}</TD>
                    <TD className="text-xs text-muted-foreground">{formatDateBr(r.createdAt)}</TD>
                    <TD>{r.financialEntity ? `${r.financialEntity.name} (${r.financialEntity.type})` : 'Consolidado'}</TD>
                    <TD className="text-right font-medium">{brl(num(r.consolidatedBalance))}</TD>
                    <TD className="text-right">{brl(num(r.resultYearConsolidated))}</TD>
                    <TD className="text-right">{brl(num(r.financingOutstanding))}</TD>
                    <TD className="max-w-[180px] truncate text-xs">{r.note ?? '—'}</TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button type="button" variant="outline" size="sm" onClick={() => void openDetail(r.id)}>
                          Ver
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          disabled={deletingId === r.id}
                          onClick={() => void remove(r.id)}
                        >
                          {deletingId === r.id ? '…' : 'Apagar'}
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
