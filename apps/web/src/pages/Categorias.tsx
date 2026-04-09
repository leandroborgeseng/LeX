import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';

type Row = { id: string; name: string; kind: string };

export default function Categorias() {
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'REVENUE' | 'EXPENSE'>('EXPENSE');

  async function load() {
    const { data } = await api.get<Row[]>('/categories');
    setRows(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.post('/categories', { name, kind });
    setName('');
    await load();
  }

  return (
    <div className="space-y-6">
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
          <Table>
            <THead>
              <TR>
                <TH>Nome</TH>
                <TH>Tipo</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
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
