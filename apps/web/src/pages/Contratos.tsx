import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { brl } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';

type Row = {
  id: string;
  clientName: string;
  monthlyGross: string;
  estimatedNet: string;
  status: string;
};

export default function Contratos() {
  const [rows, setRows] = useState<Row[]>([]);
  const [clientName, setClientName] = useState('');
  const [monthlyGross, setMonthlyGross] = useState('0');

  async function load() {
    const { data } = await api.get<Row[]>('/contracts');
    setRows(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.post('/contracts', {
      clientName,
      monthlyGross: parseFloat(monthlyGross.replace(',', '.')) || 0,
    });
    setClientName('');
    setMonthlyGross('0');
    await load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Contratos da empresa</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo contrato / cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Valor mensal bruto</Label>
              <Input value={monthlyGross} onChange={(e) => setMonthlyGross(e.target.value)} />
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
                <TH>Cliente</TH>
                <TH>Bruto mensal</TH>
                <TH>Líquido est.</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD>{r.clientName}</TD>
                  <TD>{brl(parseFloat(r.monthlyGross))}</TD>
                  <TD>{brl(parseFloat(r.estimatedNet))}</TD>
                  <TD>{r.status}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
