import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';

type Entity = { id: string; type: string; name: string };

export default function Entidades() {
  const [rows, setRows] = useState<Entity[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<'PF' | 'PJ'>('PF');

  async function load() {
    const { data } = await api.get<Entity[]>('/financial-entities');
    setRows(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.post('/financial-entities', { name, type });
    setName('');
    await load();
  }

  return (
    <div className="space-y-6">
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
                <TR key={r.id}>
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
