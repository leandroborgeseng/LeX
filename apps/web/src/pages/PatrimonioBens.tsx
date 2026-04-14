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

type PatrimonyRow = {
  id: string;
  financialEntityId: string;
  kind: string;
  name: string;
  estimatedValue: string;
  acquisitionDate: string | null;
  notes: string | null;
  active: boolean;
  financialEntity?: { id: string; name: string; type: string };
};

function kindLabel(k: string) {
  return k === 'IMOVEL' ? 'Imóvel' : 'Móvel';
}

export default function PatrimonioBens() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [rows, setRows] = useState<PatrimonyRow[]>([]);
  const [entityId, setEntityId] = useState('');
  const [kind, setKind] = useState<'IMOVEL' | 'MOVEL'>('IMOVEL');
  const [name, setName] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [notes, setNotes] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<PatrimonyRow | null>(null);
  const [eEntityId, setEEntityId] = useState('');
  const [eKind, setEKind] = useState<'IMOVEL' | 'MOVEL'>('IMOVEL');
  const [eName, setEName] = useState('');
  const [eValue, setEValue] = useState('');
  const [eAcq, setEAcq] = useState('');
  const [eNotes, setENotes] = useState('');
  const [eActive, setEActive] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [e, a] = await Promise.all([
      api.get<Entity[]>('/financial-entities'),
      api.get<PatrimonyRow[]>('/patrimony-assets'),
    ]);
    setEntities(e.data);
    setRows(a.data);
    if (!entityId && e.data[0]) setEntityId(e.data[0].id);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (editing && editOpen) {
      setEEntityId(editing.financialEntityId);
      setEKind(editing.kind === 'MOVEL' ? 'MOVEL' : 'IMOVEL');
      setEName(editing.name);
      setEValue(String(parseFloat(editing.estimatedValue)));
      setEAcq(editing.acquisitionDate ? editing.acquisitionDate.slice(0, 10) : '');
      setENotes(editing.notes ?? '');
      setEActive(editing.active !== false);
    }
  }, [editing, editOpen]);

  const totalAtivos = rows.filter((r) => r.active).reduce((s, r) => s + parseFloat(r.estimatedValue), 0);

  async function create(ev: React.FormEvent) {
    ev.preventDefault();
    const v = parseFloat(estimatedValue.replace(',', '.')) || 0;
    await api.post('/patrimony-assets', {
      financialEntityId: entityId,
      kind,
      name: name.trim(),
      estimatedValue: v,
      acquisitionDate: acquisitionDate.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setName('');
    setEstimatedValue('');
    setAcquisitionDate('');
    setNotes('');
    await load();
  }

  function openEdit(r: PatrimonyRow) {
    setEditing(r);
    setEditOpen(true);
  }

  async function saveEdit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await api.patch(`/patrimony-assets/${editing.id}`, {
        financialEntityId: eEntityId,
        kind: eKind,
        name: eName.trim(),
        estimatedValue: parseFloat(eValue.replace(',', '.')) || 0,
        acquisitionDate: eAcq.trim() || null,
        notes: eNotes.trim() || null,
        active: eActive,
      });
      setEditOpen(false);
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(id: string) {
    if (!confirm('Remover este bem do cadastro?')) return;
    await api.delete(`/patrimony-assets/${id}`);
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Patrimônio — bens</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre imóveis e bens móveis com <strong>valor estimado atual</strong>. Eles entram no{' '}
          <strong>patrimônio total</strong> (junto com saldos em contas) no dashboard e nos instantâneos do histórico.
          Não geram receitas nem despesas automaticamente.
        </p>
        <p className="mt-2 text-sm">
          <Link to="/" className="font-medium text-primary underline-offset-4 hover:underline">
            Ver dashboard
          </Link>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo bem</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Entidade</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                required
              >
                {entities.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name} ({x.type})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={kind}
                onChange={(e) => setKind(e.target.value as 'IMOVEL' | 'MOVEL')}
              >
                <option value="IMOVEL">Imóvel</option>
                <option value="MOVEL">Bem móvel</option>
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Apartamento centro" required />
            </div>
            <div className="space-y-2">
              <Label>Valor estimado (R$)</Label>
              <Input
                inputMode="decimal"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Aquisição (opcional)</Label>
              <Input type="date" value={acquisitionDate} onChange={(e) => setAcquisitionDate(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notas</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Matrícula, local, etc." />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={!entityId || !name.trim()}>
                Adicionar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">Bens cadastrados</CardTitle>
            <p className="text-sm text-muted-foreground">
              Soma ativos: <span className="font-semibold text-foreground">{brl(totalAtivos)}</span>
            </p>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Entidade</TH>
                <TH>Tipo</TH>
                <TH>Nome</TH>
                <TH className="text-right">Valor est.</TH>
                <TH>Aquisição</TH>
                <TH>Ativo</TH>
                <TH className="text-right">Ações</TH>
              </TR>
            </THead>
            <TBody>
              {rows.length === 0 ? (
                <TR>
                  <TD colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum bem cadastrado.
                  </TD>
                </TR>
              ) : (
                rows.map((r) => (
                  <TR key={r.id}>
                    <TD className="text-sm">{r.financialEntity?.name ?? '—'}</TD>
                    <TD className="text-sm">{kindLabel(r.kind)}</TD>
                    <TD className="font-medium">{r.name}</TD>
                    <TD className="text-right">{brl(parseFloat(r.estimatedValue))}</TD>
                    <TD className="text-xs text-muted-foreground">
                      {r.acquisitionDate ? r.acquisitionDate.slice(0, 10) : '—'}
                    </TD>
                    <TD className="text-sm">{r.active !== false ? 'Sim' : 'Não'}</TD>
                    <TD className="text-right">
                      <Button type="button" variant="outline" size="sm" className="mr-1" onClick={() => openEdit(r)}>
                        Editar
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => void removeRow(r.id)}>
                        Excluir
                      </Button>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg" onOpenAutoFocus={(ev) => ev.preventDefault()}>
          <h2 className="text-lg font-semibold">Editar bem</h2>
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
                <Label>Tipo</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                  value={eKind}
                  onChange={(e) => setEKind(e.target.value as 'IMOVEL' | 'MOVEL')}
                >
                  <option value="IMOVEL">Imóvel</option>
                  <option value="MOVEL">Bem móvel</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={eName} onChange={(e) => setEName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Valor estimado (R$)</Label>
                <Input inputMode="decimal" value={eValue} onChange={(e) => setEValue(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Aquisição</Label>
                <Input type="date" value={eAcq} onChange={(e) => setEAcq(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Input value={eNotes} onChange={(e) => setENotes(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={eActive} onChange={(e) => setEActive(e.target.checked)} />
                Contar no patrimônio (ativo)
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'A guardar…' : 'Guardar'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
