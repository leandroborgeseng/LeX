import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { brl, dateInputFromIso } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Row = {
  id: string;
  clientName: string;
  monthlyGross: string;
  estimatedTax: string;
  estimatedOpCost: string;
  estimatedNet: string;
  status: string;
  recurrence: string;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
};

export default function Contratos() {
  const [rows, setRows] = useState<Row[]>([]);
  const [clientName, setClientName] = useState('');
  const [monthlyGross, setMonthlyGross] = useState('0');
  const [estimatedTax, setEstimatedTax] = useState('0');
  const [estimatedOpCost, setEstimatedOpCost] = useState('0');
  const [estimatedNet, setEstimatedNet] = useState('');
  const [status, setStatus] = useState<'PROSPECT' | 'ATIVO'>('PROSPECT');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [eClient, setEClient] = useState('');
  const [eGross, setEGross] = useState('0');
  const [eTax, setETax] = useState('0');
  const [eOp, setEOp] = useState('0');
  const [eNet, setENet] = useState('');
  const [eStatus, setEStatus] = useState<string>('ATIVO');
  const [eRecurrence, setERecurrence] = useState('MONTHLY');
  const [eStart, setEStart] = useState('');
  const [eEnd, setEEnd] = useState('');
  const [eNotes, setENotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await api.get<Row[]>('/contracts');
    setRows(data);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (editing && editOpen) {
      setEClient(editing.clientName);
      setEGross(String(parseFloat(editing.monthlyGross)));
      setETax(String(parseFloat(editing.estimatedTax ?? '0')));
      setEOp(String(parseFloat(editing.estimatedOpCost ?? '0')));
      setENet(String(parseFloat(editing.estimatedNet)));
      setEStatus(editing.status);
      setERecurrence(editing.recurrence || 'MONTHLY');
      setEStart(editing.startDate ? dateInputFromIso(editing.startDate) : '');
      setEEnd(editing.endDate ? dateInputFromIso(editing.endDate) : '');
      setENotes(editing.notes ?? '');
    }
  }, [editing, editOpen]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const gross = parseFloat(monthlyGross.replace(',', '.')) || 0;
    const tax = parseFloat(estimatedTax.replace(',', '.')) || 0;
    const op = parseFloat(estimatedOpCost.replace(',', '.')) || 0;
    const netValue = estimatedNet ? parseFloat(estimatedNet.replace(',', '.')) : gross - tax - op;

    await api.post('/contracts', {
      clientName,
      monthlyGross: gross,
      estimatedTax: tax,
      estimatedOpCost: op,
      estimatedNet: netValue,
      status,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
    setClientName('');
    setMonthlyGross('0');
    setEstimatedTax('0');
    setEstimatedOpCost('0');
    setEstimatedNet('');
    setStatus('PROSPECT');
    setStartDate('');
    setEndDate('');
    await load();
  }

  function openEdit(r: Row) {
    setEditing(r);
    setEditOpen(true);
  }

  async function saveEdit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const gross = parseFloat(eGross.replace(',', '.')) || 0;
      const tax = parseFloat(eTax.replace(',', '.')) || 0;
      const op = parseFloat(eOp.replace(',', '.')) || 0;
      const netVal = eNet ? parseFloat(eNet.replace(',', '.')) : gross - tax - op;
      await api.patch(`/contracts/${editing.id}`, {
        clientName: eClient,
        monthlyGross: gross,
        estimatedTax: tax,
        estimatedOpCost: op,
        estimatedNet: netVal,
        status: eStatus as 'PROSPECT' | 'ATIVO' | 'ENCERRADO' | 'SUSPENSO',
        recurrence: eRecurrence as 'MONTHLY' | 'YEARLY' | 'CUSTOM',
        startDate: eStart || null,
        endDate: eEnd || null,
        notes: eNotes.trim() ? eNotes : null,
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
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto" onOpenAutoFocus={(ev) => ev.preventDefault()}>
          <h2 className="text-lg font-semibold">Editar contrato / prospect</h2>
          {editing && (
            <form onSubmit={saveEdit} className="grid gap-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input value={eClient} onChange={(e) => setEClient(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Valor mensal bruto</Label>
                <Input value={eGross} onChange={(e) => setEGross(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Impostos estimados</Label>
                <Input value={eTax} onChange={(e) => setETax(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Custos operacionais estimados</Label>
                <Input value={eOp} onChange={(e) => setEOp(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Líquido estimado (opcional)</Label>
                <Input value={eNet} onChange={(e) => setENet(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Recorrência</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                  value={eRecurrence}
                  onChange={(e) => setERecurrence(e.target.value)}
                >
                  <option value="MONTHLY">Mensal</option>
                  <option value="YEARLY">Anual</option>
                  <option value="CUSTOM">Personalizada</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                  value={eStatus}
                  onChange={(e) => setEStatus(e.target.value)}
                >
                  <option value="PROSPECT">Prospect</option>
                  <option value="ATIVO">Ativo</option>
                  <option value="ENCERRADO">Encerrado</option>
                  <option value="SUSPENSO">Suspenso</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Início</Label>
                <Input type="date" value={eStart} onChange={(e) => setEStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input type="date" value={eEnd} onChange={(e) => setEEnd(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Input value={eNotes} onChange={(e) => setENotes(e.target.value)} />
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

      <h1 className="text-2xl font-semibold">Contratos e prospects</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo contrato ou prospect</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Valor mensal bruto</Label>
              <Input value={monthlyGross} onChange={(e) => setMonthlyGross(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Impostos estimados</Label>
              <Input value={estimatedTax} onChange={(e) => setEstimatedTax(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Custos operacionais estimados</Label>
              <Input value={estimatedOpCost} onChange={(e) => setEstimatedOpCost(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Líquido estimado (opcional)</Label>
              <Input value={estimatedNet} onChange={(e) => setEstimatedNet(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'PROSPECT' | 'ATIVO')}
              >
                <option value="PROSPECT">Prospect</option>
                <option value="ATIVO">Ativo</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Início (opcional)</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fim (opcional)</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="mb-3 text-sm text-muted-foreground">Clique numa linha para editar.</p>
          <Table>
            <THead>
              <TR>
                <TH>Cliente</TH>
                <TH>Bruto mensal</TH>
                <TH>Líquido est.</TH>
                <TH>Status</TH>
                <TH>Início</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR
                  key={r.id}
                  className={cn('cursor-pointer hover:bg-muted/40')}
                  onClick={() => openEdit(r)}
                >
                  <TD>{r.clientName}</TD>
                  <TD>{brl(parseFloat(r.monthlyGross))}</TD>
                  <TD>{brl(parseFloat(r.estimatedNet))}</TD>
                  <TD>{r.status}</TD>
                  <TD>{r.startDate ? new Date(r.startDate).toLocaleDateString('pt-BR') : '—'}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
