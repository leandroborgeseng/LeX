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
  name: string;
  role: string | null;
  salary: string;
  totalMonthly: string;
  active: boolean;
};

export default function Funcionarios() {
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [salary, setSalary] = useState('');
  const [charges, setCharges] = useState('0');
  const [benefits, setBenefits] = useState('0');
  const [totalMonthly, setTotalMonthly] = useState('');

  async function load() {
    const { data } = await api.get<Row[]>('/employees');
    setRows(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const s = parseFloat(salary.replace(',', '.')) || 0;
    const ch = parseFloat(charges.replace(',', '.')) || 0;
    const b = parseFloat(benefits.replace(',', '.')) || 0;
    const tot = totalMonthly ? parseFloat(totalMonthly.replace(',', '.')) : s + ch + b;
    await api.post('/employees', {
      name,
      role: role || undefined,
      salary: s,
      charges: ch,
      benefits: b,
      totalMonthly: tot,
    });
    setName('');
    setRole('');
    setSalary('');
    setTotalMonthly('');
    await load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Funcionários e folha</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo funcionário</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Salário</Label>
              <Input value={salary} onChange={(e) => setSalary(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Encargos</Label>
              <Input value={charges} onChange={(e) => setCharges(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Benefícios</Label>
              <Input value={benefits} onChange={(e) => setBenefits(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Custo total mensal (vazio = salário + encargos + benefícios)</Label>
              <Input value={totalMonthly} onChange={(e) => setTotalMonthly(e.target.value)} />
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
                <TH>Nome</TH>
                <TH>Cargo</TH>
                <TH>Salário</TH>
                <TH>Custo total</TH>
                <TH>Ativo</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD>{r.name}</TD>
                  <TD>{r.role ?? '—'}</TD>
                  <TD>{brl(parseFloat(r.salary))}</TD>
                  <TD>{brl(parseFloat(r.totalMonthly))}</TD>
                  <TD>{r.active ? 'Sim' : 'Não'}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
