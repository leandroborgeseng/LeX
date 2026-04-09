import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { brl, formatDateBr } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';

type Entity = { id: string; name: string };
type Account = { id: string; name: string; financialEntityId: string };
type Row = {
  id: string;
  type: string;
  amount: string;
  date: string;
  description: string | null;
};

export default function Transferencias() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [rows, setRows] = useState<Row[]>([]);

  const [type, setType] = useState('PF_PARA_PJ');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [fromEntityId, setFromEntityId] = useState('');
  const [toEntityId, setToEntityId] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');

  async function load() {
    const [e, a, t] = await Promise.all([
      api.get<Entity[]>('/financial-entities'),
      api.get<Account[]>('/bank-accounts'),
      api.get<Row[]>('/internal-transfers'),
    ]);
    setEntities(e.data);
    setAccounts(a.data);
    setRows(t.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(ev: React.FormEvent) {
    ev.preventDefault();
    await api.post('/internal-transfers', {
      type,
      amount: parseFloat(amount.replace(',', '.')) || 0,
      date: new Date(date).toISOString(),
      description: description || undefined,
      fromEntityId: fromEntityId || undefined,
      toEntityId: toEntityId || undefined,
      fromAccountId: fromAccountId || undefined,
      toAccountId: toAccountId || undefined,
    });
    setAmount('');
    setDescription('');
    await load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Transferências internas</h1>
      <p className="text-sm text-muted-foreground">
        Não entram como receita/despesa operacional; ajustam saldos das contas vinculadas.
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova transferência</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="PF_PARA_PJ">PF → PJ</option>
                <option value="PJ_PARA_PF">PJ → PF</option>
                <option value="APORTE">Aporte</option>
                <option value="PRO_LABORE">Pró-labore</option>
                <option value="REEMBOLSO">Reembolso</option>
                <option value="AJUSTE">Ajuste</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Entidade origem</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={fromEntityId}
                onChange={(e) => setFromEntityId(e.target.value)}
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
              <Label>Entidade destino</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={toEntityId}
                onChange={(e) => setToEntityId(e.target.value)}
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
              <Label>Conta origem</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
              >
                <option value="">—</option>
                {accounts.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Conta destino</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
              >
                <option value="">—</option>
                {accounts.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit">Registrar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <THead>
              <TR>
                <TH>Data</TH>
                <TH>Tipo</TH>
                <TH>Valor</TH>
                <TH>Descrição</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD>{formatDateBr(r.date)}</TD>
                  <TD>{r.type}</TD>
                  <TD>{brl(parseFloat(r.amount))}</TD>
                  <TD>{r.description ?? '—'}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
