import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Row = { id: string; name: string; kind: string };

export default function Categorias() {
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'REVENUE' | 'EXPENSE'>('EXPENSE');

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [eName, setEName] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await api.get<Row[]>('/categories');
    setRows(data);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (editing && editOpen) setEName(editing.name);
  }, [editing, editOpen]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.post('/categories', { name, kind });
    setName('');
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
      await api.patch(`/categories/${editing.id}`, { name: eName });
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
          <h2 className="text-lg font-semibold">Editar categoria</h2>
          {editing && (
            <form onSubmit={saveEdit} className="grid gap-4">
              <p className="text-sm text-muted-foreground">
                Tipo atual: <strong>{editing.kind === 'REVENUE' ? 'Receita' : 'Despesa'}</strong> (alterar tipo
                entre receita/despesa não é suportado para não quebrar lançamentos existentes).
              </p>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={eName} onChange={(e) => setEName(e.target.value)} required />
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

      <h1 className="text-2xl font-semibold">Categorias</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova categoria</CardTitle>
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
                value={kind}
                onChange={(e) => setKind(e.target.value as 'REVENUE' | 'EXPENSE')}
              >
                <option value="EXPENSE">Despesa</option>
                <option value="REVENUE">Receita</option>
              </select>
            </div>
            <Button type="submit">Salvar</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="mb-3 text-sm text-muted-foreground">Clique numa linha para editar o nome.</p>
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
                  <TD>{r.kind}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
