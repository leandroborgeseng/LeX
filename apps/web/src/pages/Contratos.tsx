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
  startDate: string | null;
  endDate: string | null;
};

export default function Contratos() {
  const [rows, setRows] = useState<Row[]>([]);
  const [clientName, setClientName] = useState('');
  const [monthlyGross, setMonthlyGross] = useState('0');
  const [estimatedTax, setEstimatedTax] = useState('0');
  const [estimatedOpCost, setEstimatedOpCost] = useState('0');
  const [estimatedNet, setEstimatedNet] = useState('');
  const [status, setStatus] = useState<'PROSPECT' | 'ATIVO'>('PROSPECT');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  async function load() {
    const { data } = await api.get<Row[]>('/contracts');
    setRows(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const gross = parseFloat(monthlyGross.replace(',', '.')) || 0;
    const tax = parseFloat(estimatedTax.replace(',', '.')) || 0;
    const op = parseFloat(estimatedOpCost.replace(',', '.')) || 0;
    const netValue = estimatedNet ? parseFloat(estimatedNet.replace(',', '.')) : gross - tax - op;

    await api.post('/contracts', {
      clientName,
      monthlyGross: gross,
      estimatedTax: tax,
      estimatedOpCost: op,
      estimatedNet: netValue,
      status,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
    setClientName('');
    setMonthlyGross('0');
    setEstimatedTax('0');
    setEstimatedOpCost('0');
    setEstimatedNet('');
    setStatus('PROSPECT');
    setStartDate('');
    setEndDate('');
    await load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Contratos e prospects</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo contrato ou prospect</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Valor mensal bruto</Label>
              <Input value={monthlyGross} onChange={(e) => setMonthlyGross(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Impostos estimados</Label>
              <Input value={estimatedTax} onChange={(e) => setEstimatedTax(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Custos operacionais estimados</Label>
              <Input value={estimatedOpCost} onChange={(e) => setEstimatedOpCost(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Líquido estimado (opcional)</Label>
              <Input value={estimatedNet} onChange={(e) => setEstimatedNet(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'PROSPECT' | 'ATIVO')}
              >
                <option value="PROSPECT">Prospect</option>
                <option value="ATIVO">Ativo</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Início (opcional)</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fim (opcional)</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button type="submit">Salvar</Button>
            </div>
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
                <TH>Início</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD>{r.clientName}</TD>
                  <TD>{brl(parseFloat(r.monthlyGross))}</TD>
                  <TD>{brl(parseFloat(r.estimatedNet))}</TD>
                  <TD>{r.status}</TD>
                  <TD>{r.startDate ? new Date(r.startDate).toLocaleDateString('pt-BR') : '—'}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
