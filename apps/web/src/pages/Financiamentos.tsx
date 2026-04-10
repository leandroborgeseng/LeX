import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { brl, formatDateBr } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Dialog, DialogContent } from '@/components/ui/dialog';

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
  name: string;
  creditor: string | null;
  originalValue: string;
  currentBalance: string;
  installments: Inst[];
};

export default function Financiamentos() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [rows, setRows] = useState<Fin[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [creditor, setCreditor] = useState('');
  const [originalValue, setOriginalValue] = useState('');
  const [monthlyRate, setMonthlyRate] = useState('0.8');
  const [installmentsCount, setInstallmentsCount] = useState('24');
  const [amortSystem, setAmortSystem] = useState<'PRICE' | 'SAC'>('PRICE');
  const [startDate, setStartDate] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Fin | null>(null);
  const [eEntityId, setEEntityId] = useState('');
  const [eName, setEName] = useState('');
  const [eCreditor, setECreditor] = useState('');
  const [saving, setSaving] = useState(false);

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
      setEName(editing.name);
      setECreditor(editing.creditor ?? '');
    }
  }, [editing, editOpen]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.post('/financings', {
      name,
      creditor: creditor || undefined,
      originalValue: parseFloat(originalValue.replace(',', '.')) || 0,
      monthlyRate: parseFloat(monthlyRate.replace(',', '.')) || 0,
      installmentsCount: parseInt(installmentsCount, 10) || 1,
      amortSystem,
      startDate: new Date(startDate).toISOString(),
    });
    setName('');
    setCreditor('');
    setOriginalValue('');
    await load();
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
        creditor: eCreditor.trim() ? eCreditor : null,
        financialEntityId: eEntityId || null,
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
          <h2 className="text-lg font-semibold">Editar financiamento</h2>
          <p className="text-sm text-muted-foreground">
            Ajuste nome, credor e entidade. Valor, taxa e parcelas mantêm-se na tabela gerada; use regeneração na API
            se precisar de novo cronograma.
          </p>
          {editing && (
            <form onSubmit={saveEdit} className="grid gap-4">
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

      <h1 className="text-2xl font-semibold">Financiamentos</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo financiamento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
            <div className="flex items-end">
              <Button type="submit">Gerar tabela</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-4 pt-6">
          {rows.map((f) => (
            <div key={f.id} className="rounded-md border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{f.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {f.creditor ?? '—'} · Saldo: {brl(parseFloat(f.currentBalance))}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(f)}>
                    Editar
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setExpanded(expanded === f.id ? null : f.id)}>
                    {expanded === f.id ? 'Ocultar parcelas' : 'Ver parcelas'}
                  </Button>
                </div>
              </div>
              {expanded === f.id && (
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
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
