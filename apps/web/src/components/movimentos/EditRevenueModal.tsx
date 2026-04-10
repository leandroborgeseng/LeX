import { useEffect, useState } from 'react';
import axios from 'axios';
import api from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';
import { brl, dateInputFromIso, todayDateInputValue } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type RevenueRow = {
  id: string;
  financialEntityId: string;
  description: string;
  type: string;
  grossAmount: string;
  taxDiscount: string;
  netAmount: string;
  competenceDate: string;
  dueDate: string;
  status: string;
  categoryId: string | null;
  payerSourceId: string | null;
  destinationAccountId: string | null;
  receivedAt?: string | null;
};

type Entity = { id: string; name: string; type?: string };
type Cat = { id: string; name: string };
type Payer = { id: string; name: string };
type Account = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: RevenueRow | null;
  entities: Entity[];
  cats: Cat[];
  payers: Payer[];
  accounts: Account[];
  onSaved: () => void;
};

export function EditRevenueModal({
  open,
  onOpenChange,
  row,
  entities,
  cats,
  payers,
  accounts,
  onSaved,
}: Props) {
  const [financialEntityId, setFinancialEntityId] = useState('');
  const [description, setDescription] = useState('');
  const [gross, setGross] = useState('');
  const [tax, setTax] = useState('0');
  const [net, setNet] = useState('');
  const [competence, setCompetence] = useState('');
  const [due, setDue] = useState('');
  const [type, setType] = useState<'RECORRENTE' | 'ESPORADICA'>('ESPORADICA');
  const [status, setStatus] = useState('PREVISTO');
  const [categoryId, setCategoryId] = useState('');
  const [payerId, setPayerId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [receivedAtInput, setReceivedAtInput] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!row || !open) return;
    setFinancialEntityId(row.financialEntityId);
    setDescription(row.description);
    setGross(String(parseFloat(row.grossAmount)));
    setTax(String(parseFloat(row.taxDiscount ?? '0')));
    setNet(String(parseFloat(row.netAmount)));
    setCompetence(dateInputFromIso(row.competenceDate));
    setDue(dateInputFromIso(row.dueDate));
    setType(row.type === 'RECORRENTE' ? 'RECORRENTE' : 'ESPORADICA');
    setStatus(row.status);
    setCategoryId(row.categoryId ?? '');
    setPayerId(row.payerSourceId ?? '');
    setAccountId(row.destinationAccountId ?? '');
    setReceivedAtInput(row.receivedAt ? dateInputFromIso(row.receivedAt) : '');
    setErr('');
  }, [row, open]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!row) return;
    setErr('');
    setSaving(true);
    const g = parseFloat(gross.replace(',', '.')) || 0;
    const t = parseFloat(tax.replace(',', '.')) || 0;
    const n = net ? parseFloat(net.replace(',', '.')) : g - t;
    try {
      const body: Record<string, unknown> = {
        financialEntityId,
        description,
        type,
        grossAmount: g,
        taxDiscount: t,
        netAmount: n,
        competenceDate: new Date(competence).toISOString(),
        dueDate: new Date(due).toISOString(),
        status,
        categoryId: categoryId || null,
        payerSourceId: payerId || null,
        destinationAccountId: accountId || null,
      };
      if (status === 'RECEBIDO' && receivedAtInput) {
        body.receivedAt = new Date(receivedAtInput + 'T12:00:00').toISOString();
      }
      await api.patch(`/revenues/${row.id}`, body);
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        setErr(apiErrorMessage(error.response?.data));
      } else {
        setErr('Não foi possível guardar.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,720px)] max-w-2xl overflow-y-auto" showClose>
        <div className="space-y-1 pr-6">
          <h2 className="text-lg font-semibold text-emerald-300">Editar receita</h2>
          {row && (
            <p className="text-sm text-muted-foreground">
              Líquido atual: <span className="font-medium text-foreground">{brl(parseFloat(row.netAmount))}</span>
            </p>
          )}
        </div>
        {row && (
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={save}>
            <p className="sm:col-span-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs leading-relaxed text-emerald-100/90">
              <strong>Orçamento:</strong> em <strong>Previsto</strong> o valor entra nas projeções; em{' '}
              <strong>Recebido (realizado)</strong> o líquido passa a contar no <strong>saldo da conta destino</strong>.
              Ajuste bruto, impostos ou líquido antes de guardar se o valor real for diferente.
            </p>
            <div className="space-y-2 sm:col-span-2">
              <Label>Entidade</Label>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
                value={financialEntityId}
                onChange={(e) => setFinancialEntityId(e.target.value)}
              >
                {entities.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                    {x.type ? ` (${x.type})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
                value={type}
                onChange={(e) => setType(e.target.value as 'RECORRENTE' | 'ESPORADICA')}
              >
                <option value="ESPORADICA">Esporádica</option>
                <option value="RECORRENTE">Recorrente</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Situação (orçamento)</Label>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
                value={status}
                onChange={(e) => {
                  const v = e.target.value;
                  setStatus(v);
                  if (v === 'RECEBIDO' && !receivedAtInput) setReceivedAtInput(todayDateInputValue());
                  if (v !== 'RECEBIDO') setReceivedAtInput('');
                }}
              >
                <option value="PREVISTO">Previsto (planeado)</option>
                <option value="RECEBIDO">Recebido (realizado — saldo da conta)</option>
                <option value="ATRASADO">Atrasado</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
            {status === 'RECEBIDO' && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Data do recebimento</Label>
                <Input
                  type="date"
                  value={receivedAtInput}
                  onChange={(e) => setReceivedAtInput(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Ajuste se o dinheiro entrou noutro dia. Ao mudar de previsto para recebido, sugerimos hoje automaticamente.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Valor bruto</Label>
              <Input value={gross} onChange={(e) => setGross(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Impostos / descontos</Label>
              <Input value={tax} onChange={(e) => setTax(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Valor líquido (vazio = bruto − impostos)</Label>
              <Input value={net} onChange={(e) => setNet(e.target.value)} placeholder="opcional" />
            </div>
            <div className="space-y-2">
              <Label>Competência</Label>
              <Input type="date" value={competence} onChange={(e) => setCompetence(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">—</option>
                {cats.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Fonte pagadora</Label>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
              >
                <option value="">—</option>
                {payers.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Conta destino</Label>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                <option value="">—</option>
                {accounts.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </div>
            {err && <p className="sm:col-span-2 text-sm text-destructive">{err}</p>}
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" disabled={saving} className="touch-manipulation">
                {saving ? 'A guardar…' : 'Guardar alterações'}
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="touch-manipulation">
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
