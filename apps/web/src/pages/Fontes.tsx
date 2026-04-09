import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';

type Row = { id: string; name: string };

export default function Fontes() {
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState('');

  async function load() {
    const { data } = await api.get<Row[]>('/payer-sources');
    setRows(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.post('/payer-sources', { name });
    setName('');
    await load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Fontes pagadoras</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova fonte</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
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
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD>{r.name}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
