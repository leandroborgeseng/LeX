import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { brl } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';

type Entity = { id: string; name: string; type: string };
type CardRow = {
  id: string;
  name: string;
  bank: string | null;
  limitAmount: string | null;
  closingDay: number | null;
  dueDay: number | null;
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cartões de crédito</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Toque no nome do cartão para lançar compras e ver o extrato consolidado.
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
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
