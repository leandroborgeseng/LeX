import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { brl } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Row = {
  id: string;
  name: string;
  role: string | null;
  salary: string;
  charges: string;
  benefits: string;
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

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [eName, setEName] = useState('');
  const [eRole, setERole] = useState('');
  const [eSalary, setESalary] = useState('');
  const [eCharges, setECharges] = useState('0');
  const [eBenefits, setEBenefits] = useState('0');
  const [eTotal, setETotal] = useState('');
  const [eActive, setEActive] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await api.get<Row[]>('/employees');
    setRows(data);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (editing && editOpen) {
      setEName(editing.name);
      setERole(editing.role ?? '');
      setESalary(String(parseFloat(editing.salary)));
      setECharges(String(parseFloat(editing.charges ?? '0')));
      setEBenefits(String(parseFloat(editing.benefits ?? '0')));
      setETotal(String(parseFloat(editing.totalMonthly)));
      setEActive(editing.active);
    }
  }, [editing, editOpen]);

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

  function openEdit(r: Row) {
    setEditing(r);
    setEditOpen(true);
  }

  async function saveEdit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const s = parseFloat(eSalary.replace(',', '.')) || 0;
      const ch = parseFloat(eCharges.replace(',', '.')) || 0;
      const b = parseFloat(eBenefits.replace(',', '.')) || 0;
      const tot = eTotal ? parseFloat(eTotal.replace(',', '.')) : s + ch + b;
      await api.patch(`/employees/${editing.id}`, {
        name: eName,
        role: eRole || undefined,
        salary: s,
        charges: ch,
        benefits: b,
        totalMonthly: tot,
        active: eActive,
      });
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
        <DialogContent className="max-w-lg" onOpenAutoFocus={(ev) => ev.preventDefault()}>
          <h2 className="text-lg font-semibold">Editar funcionário</h2>
          {editing && (
            <form onSubmit={saveEdit} className="grid gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={eName} onChange={(e) => setEName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input value={eRole} onChange={(e) => setERole(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Salário</Label>
                <Input value={eSalary} onChange={(e) => setESalary(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Encargos</Label>
                <Input value={eCharges} onChange={(e) => setECharges(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Benefícios</Label>
                <Input value={eBenefits} onChange={(e) => setEBenefits(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Custo total mensal (vazio = salário + encargos + benefícios)</Label>
                <Input value={eTotal} onChange={(e) => setETotal(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="emp-active"
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={eActive}
                  onChange={(e) => setEActive(e.target.checked)}
                />
                <Label htmlFor="emp-active" className="font-normal">
                  Ativo
                </Label>
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
          <p className="mb-3 text-sm text-muted-foreground">Clique numa linha para editar.</p>
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
                <TR
                  key={r.id}
                  className={cn('cursor-pointer hover:bg-muted/40')}
                  onClick={() => openEdit(r)}
                >
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
