import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Entity = { id: string; type: string; name: string };

export default function Entidades() {
  const [rows, setRows] = useState<Entity[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<'PF' | 'PJ'>('PF');

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Entity | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'PF' | 'PJ'>('PF');
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await api.get<Entity[]>('/financial-entities');
    setRows(data);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (editing && editOpen) {
      setEditName(editing.name);
      setEditType(editing.type === 'PJ' ? 'PJ' : 'PF');
    }
  }, [editing, editOpen]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.post('/financial-entities', { name, type });
    setName('');
    await load();
  }

  function openEdit(r: Entity) {
    setEditing(r);
    setEditOpen(true);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await api.patch(`/financial-entities/${editing.id}`, { name: editName, type: editType });
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
          <h2 className="text-lg font-semibold">Editar entidade</h2>
          {editing && (
            <form onSubmit={saveEdit} className="grid gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as 'PF' | 'PJ')}
                >
                  <option value="PF">Pessoa física</option>
                  <option value="PJ">Empresa</option>
                </select>
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

      <h1 className="text-2xl font-semibold">Entidades financeiras</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova entidade</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select
                className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value as 'PF' | 'PJ')}
              >
                <option value="PF">Pessoa física</option>
                <option value="PJ">Empresa</option>
              </select>
            </div>
            <Button type="submit">Salvar</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista</CardTitle>
          <p className="text-sm text-muted-foreground">Clique numa linha para editar.</p>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Nome</TH>
                <TH>Tipo</TH>
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
                  <TD>{r.type}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
