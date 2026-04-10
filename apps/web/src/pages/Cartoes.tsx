import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { brl } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Dialog, DialogContent } from '@/components/ui/dialog';

type Entity = { id: string; name: string; type: string };
type CardRow = {
  id: string;
  financialEntityId: string;
  name: string;
  bank: string | null;
  limitAmount: string | null;
  closingDay: number | null;
  dueDay: number | null;
  active?: boolean;
};

export default function Cartoes() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [rows, setRows] = useState<CardRow[]>([]);
  const [entityId, setEntityId] = useState('');
  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [limit, setLimit] = useState('');
  const [closing, setClosing] = useState('10');
  const [due, setDue] = useState('15');

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<CardRow | null>(null);
  const [eEntityId, setEEntityId] = useState('');
  const [eName, setEName] = useState('');
  const [eBank, setEBank] = useState('');
  const [eLimit, setELimit] = useState('');
  const [eClosing, setEClosing] = useState('');
  const [eDue, setEDue] = useState('');
  const [eActive, setEActive] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [e, c] = await Promise.all([
      api.get<Entity[]>('/financial-entities'),
      api.get<CardRow[]>('/credit-cards'),
    ]);
    setEntities(e.data);
    setRows(c.data);
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
      setELimit(editing.limitAmount != null ? String(parseFloat(editing.limitAmount)) : '');
      setEClosing(editing.closingDay != null ? String(editing.closingDay) : '');
      setEDue(editing.dueDay != null ? String(editing.dueDay) : '');
      setEActive(editing.active !== false);
    }
  }, [editing, editOpen]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.post('/credit-cards', {
      financialEntityId: entityId,
      name,
      bank: bank || undefined,
      limitAmount: limit ? parseFloat(limit.replace(',', '.')) : undefined,
      closingDay: parseInt(closing, 10) || undefined,
      dueDay: parseInt(due, 10) || undefined,
    });
    setName('');
    setBank('');
    setLimit('');
    await load();
  }

  function openEdit(r: CardRow) {
    setEditing(r);
    setEditOpen(true);
  }

  async function saveEdit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await api.patch(`/credit-cards/${editing.id}`, {
        financialEntityId: eEntityId,
        name: eName,
        bank: eBank || undefined,
        limitAmount: eLimit ? parseFloat(eLimit.replace(',', '.')) : undefined,
        closingDay: eClosing ? parseInt(eClosing, 10) : undefined,
        dueDay: eDue ? parseInt(eDue, 10) : undefined,
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
          <h2 className="text-lg font-semibold">Editar cartão</h2>
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
                <Label>Limite</Label>
                <Input value={eLimit} onChange={(e) => setELimit(e.target.value)} placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <Label>Dia fechamento</Label>
                <Input value={eClosing} onChange={(e) => setEClosing(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Dia vencimento</Label>
                <Input value={eDue} onChange={(e) => setEDue(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="card-active"
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={eActive}
                  onChange={(e) => setEActive(e.target.checked)}
                />
                <Label htmlFor="card-active" className="font-normal">
                  Cartão ativo
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

      <div>
        <h1 className="text-2xl font-semibold">Cartões de crédito</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Toque no nome do cartão para lançar compras e ver o extrato. Use <strong>Editar</strong> para alterar o
          cadastro.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo cartão</CardTitle>
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
              <Label>Limite</Label>
              <Input value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label>Dia fechamento</Label>
              <Input value={closing} onChange={(e) => setClosing(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Dia vencimento</Label>
              <Input value={due} onChange={(e) => setDue(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Nome</TH>
                <TH>Banco</TH>
                <TH>Limite</TH>
                <TH>Fechamento</TH>
                <TH>Vencimento</TH>
                <TH className="w-[100px]"> </TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD>
                    <Link
                      to={`/cartoes/${r.id}`}
                      className="font-medium text-primary underline-offset-4 hover:underline touch-manipulation"
                    >
                      {r.name}
                    </Link>
                  </TD>
                  <TD>{r.bank ?? '—'}</TD>
                  <TD>{r.limitAmount != null ? brl(parseFloat(r.limitAmount)) : '—'}</TD>
                  <TD>{r.closingDay ?? '—'}</TD>
                  <TD>{r.dueDay ?? '—'}</TD>
                  <TD>
                    <Button type="button" variant="outline" size="sm" onClick={() => openEdit(r)}>
                      Editar
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
