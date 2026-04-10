import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { brl } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Entity = { id: string; name: string; type: string };
type Account = {
  id: string;
  name: string;
  bank: string | null;
  type: string;
  initialBalance: string;
  financialEntityId: string;
  active?: boolean;
};

export default function Contas() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [rows, setRows] = useState<Account[]>([]);
  const [entityId, setEntityId] = useState('');
  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [type, setType] = useState('CORRENTE');
  const [initialBalance, setInitialBalance] = useState('0');

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [eEntityId, setEEntityId] = useState('');
  const [eName, setEName] = useState('');
  const [eBank, setEBank] = useState('');
  const [eType, setEType] = useState('CORRENTE');
  const [eInitial, setEInitial] = useState('0');
  const [eActive, setEActive] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [e, a] = await Promise.all([
      api.get<Entity[]>('/financial-entities'),
      api.get<Account[]>('/bank-accounts'),
    ]);
    setEntities(e.data);
    setRows(a.data);
    if (!entityId && e.data[0]) setEntityId(e.data[0].id);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (editing && editOpen) {
      setEEntityId(editing.financialEntityId);
      setEName(editing.name);
      setEBank(editing.bank ?? '');
      setEType(editing.type);
      setEInitial(String(parseFloat(editing.initialBalance)));
      setEActive(editing.active !== false);
    }
  }, [editing, editOpen]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.post('/bank-accounts', {
      financialEntityId: entityId,
      name,
      bank: bank || undefined,
      type,
      initialBalance: parseFloat(initialBalance.replace(',', '.')) || 0,
    });
    setName('');
    setBank('');
    await load();
  }

  function openEdit(r: Account) {
    setEditing(r);
    setEditOpen(true);
  }

  async function saveEdit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await api.patch(`/bank-accounts/${editing.id}`, {
        financialEntityId: eEntityId,
        name: eName,
        bank: eBank || undefined,
        type: eType,
        initialBalance: parseFloat(eInitial.replace(',', '.')) || 0,
        active: eActive,
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
        <DialogContent className="max-w-lg" onOpenAutoFocus={(ev) => ev.preventDefault()}>
          <h2 className="text-lg font-semibold">Editar conta</h2>
          {editing && (
            <form onSubmit={saveEdit} className="grid gap-4">
              <div className="space-y-2">
                <Label>Entidade</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                  value={eEntityId}
                  onChange={(e) => setEEntityId(e.target.value)}
                >
                  {entities.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} ({x.type})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={eName} onChange={(e) => setEName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Banco</Label>
                <Input value={eBank} onChange={(e) => setEBank(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                  value={eType}
                  onChange={(e) => setEType(e.target.value)}
                >
                  <option value="CORRENTE">Corrente</option>
                  <option value="POUPANCA">Poupança</option>
                  <option value="INVESTIMENTO">Investimento</option>
                  <option value="OUTROS">Outros</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Saldo inicial (BRL)</Label>
                <Input value={eInitial} onChange={(e) => setEInitial(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="acc-active"
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={eActive}
                  onChange={(e) => setEActive(e.target.checked)}
                />
                <Label htmlFor="acc-active" className="font-normal">
                  Conta ativa
                </Label>
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

      <h1 className="text-2xl font-semibold">Contas bancárias</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova conta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Entidade</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
              >
                {entities.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name} ({x.type})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Banco</Label>
              <Input value={bank} onChange={(e) => setBank(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="CORRENTE">Corrente</option>
                <option value="POUPANCA">Poupança</option>
                <option value="INVESTIMENTO">Investimento</option>
                <option value="OUTROS">Outros</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Saldo inicial (BRL)</Label>
              <Input value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contas</CardTitle>
          <p className="text-sm text-muted-foreground">Clique numa linha para editar.</p>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Nome</TH>
                <TH>Banco</TH>
                <TH>Tipo</TH>
                <TH>Saldo inicial</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR
                  key={r.id}
                  className={cn('cursor-pointer hover:bg-muted/40')}
                  onClick={() => openEdit(r)}
                >
                  <TD>{r.name}</TD>
                  <TD>{r.bank ?? '—'}</TD>
                  <TD>{r.type}</TD>
                  <TD>{brl(parseFloat(r.initialBalance))}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
