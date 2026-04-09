import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { brl } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';

type Entity = { id: string; name: string; type: string };
type Account = {
  id: string;
  name: string;
  bank: string | null;
  type: string;
  initialBalance: string;
  financialEntityId: string;
};

export default function Contas() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [rows, setRows] = useState<Account[]>([]);
  const [entityId, setEntityId] = useState('');
  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [type, setType] = useState('CORRENTE');
  const [initialBalance, setInitialBalance] = useState('0');

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

  return (
    <div className="space-y-6">
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
                <TR key={r.id}>
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
