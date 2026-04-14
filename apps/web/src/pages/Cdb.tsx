import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { brl, dateInputFromIso } from '@/lib/format';
import { apiErrorMessage } from '@/lib/api-error';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

type Entity = { id: string; name: string; type: string };
type AppRow = {
  id: string;
  name: string;
  institution: string | null;
  principal: string;
  applicationDate: string;
  maturityDate: string | null;
  indexerPercentOfCdi: string;
  assumedCdiAnnualPercent: string;
  active: boolean;
  financialEntityId: string | null;
  notes: string | null;
  recurrenceEnabled: boolean;
  recurrenceEndDate: string | null;
  revenueSyncHorizonMonths: number;
  monthlyAporteAmount?: string | number;
  financialEntity: { name: string } | null;
};

type ProjMonth = {
  month: string;
  totalPrincipal: number;
  totalGross: number;
  totalGain: number;
  totalIr: number;
  totalNet: number;
};

export default function Cdb() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [rows, setRows] = useState<AppRow[]>([]);
  const [proj, setProj] = useState<ProjMonth[]>([]);
  const [methodology, setMethodology] = useState('');
  const [lastNet, setLastNet] = useState<number | null>(null);
  const [hint, setHint] = useState('');
  const [entityId, setEntityId] = useState('');

  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [principal, setPrincipal] = useState('');
  const [applicationDate, setApplicationDate] = useState('');
  const [maturityDate, setMaturityDate] = useState('');
  const [pctCdi, setPctCdi] = useState('110');
  const [cdiAa, setCdiAa] = useState('10.5');
  const [formEntity, setFormEntity] = useState('');
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [revenueSyncHorizonMonths, setRevenueSyncHorizonMonths] = useState('36');
  const [monthlyAporte, setMonthlyAporte] = useState('0');

  const [projTick, setProjTick] = useState(0);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<AppRow | null>(null);
  const [eEntityId, setEEntityId] = useState('');
  const [eName, setEName] = useState('');
  const [eInst, setEInst] = useState('');
  const [ePrincipal, setEPrincipal] = useState('');
  const [eAppDate, setEAppDate] = useState('');
  const [eMatDate, setEMatDate] = useState('');
  const [ePct, setEPct] = useState('');
  const [eCdi, setECdi] = useState('');
  const [eActive, setEActive] = useState(true);
  const [eNotes, setENotes] = useState('');
  const [eRecurrence, setERecurrence] = useState(false);
  const [eRecEnd, setERecEnd] = useState('');
  const [eHorizon, setEHorizon] = useState('36');
  const [eMonthlyAporte, setEMonthlyAporte] = useState('0');
  const [cdbSaving, setCdbSaving] = useState(false);
  const [syncBusyId, setSyncBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [e, a] = await Promise.all([api.get<Entity[]>('/financial-entities'), api.get<AppRow[]>('/cdb-applications')]);
    setEntities(e.data);
    setRows(a.data);
    setFormEntity((prev) => prev || (e.data[0]?.id ?? ''));
  }, []);

  const fetchProjection = useCallback(async () => {
    const q = entityId ? `?years=5&financialEntityId=${encodeURIComponent(entityId)}` : '?years=5';
    const p = await api.get<{ months: ProjMonth[]; methodology: string; lastMonth: ProjMonth }>(
      `/cdb-applications/projection/summary${q}`,
    );
    setProj(p.data.months);
    setMethodology(p.data.methodology);
    setLastNet(p.data.lastMonth?.totalNet ?? null);
  }, [entityId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchProjection();
  }, [fetchProjection, projTick]);

  useEffect(() => {
    if (!editing || !editOpen) return;
    setEEntityId(editing.financialEntityId ?? '');
    setEName(editing.name);
    setEInst(editing.institution ?? '');
    setEPrincipal(String(parseFloat(editing.principal)));
    setEAppDate(dateInputFromIso(editing.applicationDate));
    setEMatDate(editing.maturityDate ? dateInputFromIso(editing.maturityDate) : '');
    setEPct(String(parseFloat(editing.indexerPercentOfCdi)));
    setECdi(String(parseFloat(editing.assumedCdiAnnualPercent)));
    setEActive(editing.active);
    setENotes(editing.notes ?? '');
    setERecurrence(editing.recurrenceEnabled ?? false);
    setERecEnd(editing.recurrenceEndDate ? dateInputFromIso(editing.recurrenceEndDate) : '');
    setEHorizon(String(editing.revenueSyncHorizonMonths ?? 36));
    setEMonthlyAporte(String(parseFloat(String(editing.monthlyAporteAmount ?? 0)) || 0));
  }, [editing, editOpen]);

  function openCdbEdit(r: AppRow) {
    setEditing(r);
    setEditOpen(true);
  }

  async function saveCdbEdit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!editing) return;
    setCdbSaving(true);
    setHint('');
    try {
      await api.patch(`/cdb-applications/${editing.id}`, {
        financialEntityId: eEntityId || null,
        name: eName,
        institution: eInst.trim() ? eInst : null,
        principal: parseFloat(ePrincipal.replace(',', '.')) || 0,
        applicationDate: new Date(eAppDate).toISOString(),
        maturityDate: eMatDate ? new Date(eMatDate).toISOString() : null,
        indexerPercentOfCdi: parseFloat(ePct.replace(',', '.')) || 100,
        assumedCdiAnnualPercent: parseFloat(eCdi.replace(',', '.')) || 10.5,
        active: eActive,
        notes: eNotes.trim() ? eNotes : null,
        recurrenceEnabled: eRecurrence,
        recurrenceEndDate: eRecEnd ? new Date(eRecEnd).toISOString() : null,
        revenueSyncHorizonMonths: Math.min(120, Math.max(1, parseInt(eHorizon, 10) || 36)),
        monthlyAporteAmount: Math.max(0, parseFloat(eMonthlyAporte.replace(',', '.')) || 0),
      });
      setEditOpen(false);
      setEditing(null);
      await load();
      setProjTick((t) => t + 1);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        setHint(apiErrorMessage(err.response?.data));
      } else {
        setHint('Erro ao atualizar CDB.');
      }
    } finally {
      setCdbSaving(false);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setHint('');
    const p = parseFloat(principal.replace(',', '.')) || 0;
    const pct = parseFloat(pctCdi.replace(',', '.')) || 100;
    const cdi = parseFloat(cdiAa.replace(',', '.')) || 10.5;
    try {
      await api.post('/cdb-applications', {
        name,
        institution: institution || undefined,
        financialEntityId: formEntity || undefined,
        principal: p,
        applicationDate: new Date(applicationDate).toISOString(),
        maturityDate: maturityDate ? new Date(maturityDate).toISOString() : undefined,
        indexerPercentOfCdi: pct,
        assumedCdiAnnualPercent: cdi,
        recurrenceEnabled,
        recurrenceEndDate: recurrenceEndDate
          ? new Date(recurrenceEndDate).toISOString()
          : undefined,
        revenueSyncHorizonMonths: Math.min(
          120,
          Math.max(1, parseInt(revenueSyncHorizonMonths, 10) || 36),
        ),
        monthlyAporteAmount: Math.max(0, parseFloat(monthlyAporte.replace(',', '.')) || 0),
      });
      setName('');
      setInstitution('');
      setPrincipal('');
      setMaturityDate('');
      await load();
      setProjTick((t) => t + 1);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        setHint(apiErrorMessage(err.response?.data));
      } else {
        setHint('Erro ao salvar.');
      }
    }
  }

  const chartData = proj.map((m) => ({
    month: m.month,
    líquido: m.totalNet,
    bruto: m.totalGross,
    ir: m.totalIr,
  }));

  return (
    <div className="space-y-6 pb-4">
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto" onOpenAutoFocus={(ev) => ev.preventDefault()}>
          <h2 className="text-lg font-semibold">Editar CDB</h2>
          {editing && (
            <form onSubmit={saveCdbEdit} className="grid gap-4">
              <div className="space-y-2">
                <Label>Entidade (opcional)</Label>
                <select
                  className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
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
                <Label>Banco / emissor</Label>
                <Input value={eInst} onChange={(e) => setEInst(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Valor aplicado (R$)</Label>
                <Input value={ePrincipal} onChange={(e) => setEPrincipal(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Data da aplicação</Label>
                <Input type="date" value={eAppDate} onChange={(e) => setEAppDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Vencimento (opcional)</Label>
                <Input type="date" value={eMatDate} onChange={(e) => setEMatDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>% do CDI</Label>
                <Input value={ePct} onChange={(e) => setEPct(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>CDI anual assumido (% a.a.)</Label>
                <Input value={eCdi} onChange={(e) => setECdi(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Input value={eNotes} onChange={(e) => setENotes(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="cdb-active"
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={eActive}
                  onChange={(e) => setEActive(e.target.checked)}
                />
                <Label htmlFor="cdb-active" className="font-normal">
                  Ativo na projeção
                </Label>
              </div>
              <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <input
                    id="cdb-rec-edit"
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={eRecurrence}
                    onChange={(e) => setERecurrence(e.target.checked)}
                  />
                  <Label htmlFor="cdb-rec-edit" className="font-normal">
                    Lançar receitas estimadas na DRE (mensal)
                  </Label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Fim da série (opcional)</Label>
                    <Input type="date" value={eRecEnd} onChange={(e) => setERecEnd(e.target.value)} disabled={!eRecurrence} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Meses à frente (1–120)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={120}
                      value={eHorizon}
                      onChange={(e) => setEHorizon(e.target.value)}
                      disabled={!eRecurrence}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Aporte mensal (R$) — liquidez / despesas CDB</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={eMonthlyAporte}
                      onChange={(e) => setEMonthlyAporte(e.target.value)}
                      disabled={!eRecurrence}
                      placeholder="0 = não gera despesa automática"
                    />
                    <p className="text-xs text-muted-foreground">
                      Mesmo calendário das receitas DRE; exige entidade. Use &quot;Sincronizar receitas DRE&quot; ou
                      salve para materializar.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancelar
                </Button>
                {eEntityId && eRecurrence && (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={cdbSaving || syncBusyId === editing?.id}
                    onClick={() => {
                      if (!editing) return;
                      setSyncBusyId(editing.id);
                      setHint('');
                      void api
                        .post(`/cdb-applications/${editing.id}/sync-revenues`)
                        .then(async () => {
                          setHint('Receitas DRE sincronizadas com a projeção atual.');
                          await load();
                        })
                        .catch(() => setHint('Não foi possível sincronizar receitas.'))
                        .finally(() => setSyncBusyId(null));
                    }}
                  >
                    {syncBusyId === editing?.id ? 'Sincronizando…' : 'Sincronizar receitas DRE'}
                  </Button>
                )}
                <Button type="submit" disabled={cdbSaving}>
                  {cdbSaving ? 'Salvando…' : 'Salvar'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <div>
        <h1 className="text-xl font-semibold md:text-2xl">CDB (% CDI)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre aplicações em CDB com rendimento em <strong>% do CDI</strong> (ex.: 100% ou 110%). A projeção usa o{' '}
          <strong>CDI anual assumido</strong> por aplicação, capitalização equivalente a 365 dias, e o{' '}
          <strong>IR regressivo</strong> sobre o ganho (22,5% até 180 dias; 20% até 360; 17,5% até 720; 15% acima). Com{' '}
          <strong>recorrência na DRE</strong>, o sistema gera receitas <strong>PREVISTO</strong> mês a mês (acréscimo
          patrimonial líquido estimado) na categoria Rendimentos CDB, alinhadas à mesma metodologia da projeção. Com{' '}
          <strong>aporte mensal</strong> (valor opcional), gera também despesas <strong>PREVISTO</strong> na categoria
          Aportes CDB — aparecem na liquidez mensal em “Desp. CDB”.
        </p>
      </div>

      {hint && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {hint}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova aplicação</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Entidade (opcional)</Label>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base md:text-sm touch-manipulation"
                value={formEntity}
                onChange={(e) => setFormEntity(e.target.value)}
              >
                <option value="">—</option>
                {entities.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Nome / título do CDB</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex.: CDB Liquidez Diária" />
            </div>
            <div className="space-y-2">
              <Label>Banco / emissor</Label>
              <Input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="space-y-2">
              <Label>Valor aplicado (R$)</Label>
              <Input value={principal} onChange={(e) => setPrincipal(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Data da aplicação</Label>
              <Input type="date" value={applicationDate} onChange={(e) => setApplicationDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Vencimento (opcional)</Label>
              <Input type="date" value={maturityDate} onChange={(e) => setMaturityDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>% do CDI</Label>
              <Input value={pctCdi} onChange={(e) => setPctCdi(e.target.value)} required placeholder="100 ou 110" />
            </div>
            <div className="space-y-2">
              <Label>CDI anual assumido (% a.a.)</Label>
              <Input value={cdiAa} onChange={(e) => setCdiAa(e.target.value)} required placeholder="Ex.: 10,5" />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-3 rounded-md border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2">
                <input
                  id="cdb-rec-new"
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={recurrenceEnabled}
                  onChange={(e) => setRecurrenceEnabled(e.target.checked)}
                />
                <Label htmlFor="cdb-rec-new" className="font-normal">
                  Lançar receitas estimadas na DRE (mensal)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Requer entidade financeira. Os valores são estimativas de acréscimo líquido no mês; marque como
                recebido na tela de receitas quando houver crédito real.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Fim da série (opcional)</Label>
                  <Input
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    disabled={!recurrenceEnabled}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Meses à frente (1–120)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={revenueSyncHorizonMonths}
                    onChange={(e) => setRevenueSyncHorizonMonths(e.target.value)}
                    disabled={!recurrenceEnabled}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Aporte mensal (R$) — liquidez / despesas CDB</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={monthlyAporte}
                    onChange={(e) => setMonthlyAporte(e.target.value)}
                    disabled={!recurrenceEnabled}
                    placeholder="0 = não gera despesa automática"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <Button type="submit" className="min-h-11 w-full touch-manipulation sm:w-auto">
                Salvar aplicação
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Projeção 5 anos (ativas)</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-muted-foreground">Filtrar entidade</Label>
            <select
              className="min-h-10 rounded-md border border-input bg-card px-2 py-1 text-sm"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
            >
              <option value="">Todas</option>
              {entities.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {lastNet != null && (
            <p className="text-sm">
              No <strong>último mês</strong> da projeção (60º mês), patrimônio líquido estimado:{' '}
              <strong className="text-primary">{brl(lastNet)}</strong>
            </p>
          )}
          <div className="h-72 w-full md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 88%)" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} interval={5} />
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
                <Line type="monotone" dataKey="líquido" name="Líquido (após IR)" stroke="var(--chart-blue)" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="bruto" name="Bruto" stroke="var(--chart-green)" dot={false} strokeWidth={1} />
                <Line type="monotone" dataKey="ir" name="IR (acum.)" stroke="hsl(0 72% 51%)" dot={false} strokeWidth={1} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground">{methodology}</p>
          <div className="max-h-80 overflow-auto rounded-md border border-border md:max-h-96">
            <Table>
              <THead>
                <TR>
                  <TH>Mês</TH>
                  <TH className="text-right">Principal</TH>
                  <TH className="text-right">Bruto</TH>
                  <TH className="text-right">Ganho</TH>
                  <TH className="text-right">IR</TH>
                  <TH className="text-right">Líquido</TH>
                </TR>
              </THead>
              <TBody>
                {proj.map((m) => (
                  <TR key={m.month}>
                    <TD>{m.month}</TD>
                    <TD className="text-right">{brl(m.totalPrincipal)}</TD>
                    <TD className="text-right">{brl(m.totalGross)}</TD>
                    <TD className="text-right">{brl(m.totalGain)}</TD>
                    <TD className="text-right">{brl(m.totalIr)}</TD>
                    <TD className="text-right font-medium">{brl(m.totalNet)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aplicações cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH>Nome</TH>
                  <TH>Banco</TH>
                  <TH>Entidade</TH>
                  <TH className="text-right">Principal</TH>
                  <TH>% CDI</TH>
                  <TH>CDI a.a.</TH>
                  <TH>Aplicação</TH>
                  <TH>Ativo</TH>
                  <TH>DRE</TH>
                  <TH className="text-right">Aporte/mês</TH>
                  <TH className="w-[88px]"> </TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.id}>
                    <TD>{r.name}</TD>
                    <TD>{r.institution ?? '—'}</TD>
                    <TD>{r.financialEntity?.name ?? '—'}</TD>
                    <TD className="text-right">{brl(parseFloat(r.principal))}</TD>
                    <TD>{r.indexerPercentOfCdi}%</TD>
                    <TD>{r.assumedCdiAnnualPercent}%</TD>
                    <TD>{r.applicationDate.slice(0, 10)}</TD>
                    <TD>{r.active ? 'Sim' : 'Não'}</TD>
                    <TD>{r.recurrenceEnabled && r.financialEntityId ? 'Sim' : '—'}</TD>
                    <TD className="text-right">
                      {parseFloat(String(r.monthlyAporteAmount ?? 0)) > 0
                        ? brl(parseFloat(String(r.monthlyAporteAmount)))
                        : '—'}
                    </TD>
                    <TD>
                      <Button type="button" variant="outline" size="sm" onClick={() => openCdbEdit(r)}>
                        Editar
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
          <ul className="space-y-2 md:hidden">
            {rows.map((r) => (
              <li key={r.id} className="rounded-lg border border-border px-3 py-3 text-sm">
                <p className="font-medium">{r.name}</p>
                <p className="text-muted-foreground">
                  {r.institution ?? '—'} · {r.indexerPercentOfCdi}% CDI · CDI {r.assumedCdiAnnualPercent}% a.a.
                </p>
                <p className="mt-1">{brl(parseFloat(r.principal))}</p>
                {r.recurrenceEnabled && r.financialEntityId && (
                  <p className="text-xs text-muted-foreground">Receitas na DRE: sim</p>
                )}
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => openCdbEdit(r)}>
                  Editar
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
