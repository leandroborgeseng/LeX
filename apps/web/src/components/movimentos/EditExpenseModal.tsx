import { useEffect, useState } from 'react';
import axios from 'axios';
import api from '@/lib/api';
import { brl, dateInputFromIso, todayDateInputValue } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type ExpenseRow = {
  id: string;
  financialEntityId: string;
  description: string;
  type: string;
  amount: string;
  competenceDate: string;
  dueDate: string;
  status: string;
  paymentMethod: string;
  categoryId: string | null;
  originatorId: string | null;
  bankAccountId: string | null;
  creditCardId: string | null;
  paidAt?: string | null;
};

type Entity = { id: string; name: string };
type Cat = { id: string; name: string };
type Member = { id: string; name: string };
type Account = { id: string; name: string };
type CardRow = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: ExpenseRow | null;
  entities: Entity[];
  cats: Cat[];
  members: Member[];
  accounts: Account[];
  cards: CardRow[];
  onSaved: () => void;
};

export function EditExpenseModal({
  open,
  onOpenChange,
  row,
  entities,
  cats,
  members,
  accounts,
  cards,
  onSaved,
}: Props) {
  const [financialEntityId, setFinancialEntityId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [competence, setCompetence] = useState('');
  const [due, setDue] = useState('');
  const [type, setType] = useState<'RECORRENTE' | 'ESPORADICA'>('ESPORADICA');
  const [status, setStatus] = useState('PREVISTO');
  const [paymentMethod, setPaymentMethod] = useState('CONTA_BANCARIA');
  const [categoryId, setCategoryId] = useState('');
  const [originatorId, setOriginatorId] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [creditCardId, setCreditCardId] = useState('');
  const [paidAtInput, setPaidAtInput] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!row || !open) return;
    setFinancialEntityId(row.financialEntityId);
    setDescription(row.description);
    setAmount(String(parseFloat(row.amount)));
    setCompetence(dateInputFromIso(row.competenceDate));
    setDue(dateInputFromIso(row.dueDate));
    setType(row.type === 'RECORRENTE' ? 'RECORRENTE' : 'ESPORADICA');
    setStatus(row.status);
    setPaymentMethod(row.paymentMethod);
    setCategoryId(row.categoryId ?? '');
    setOriginatorId(row.originatorId ?? '');
    setBankAccountId(row.bankAccountId ?? '');
    setCreditCardId(row.creditCardId ?? '');
    setPaidAtInput(row.paidAt ? dateInputFromIso(row.paidAt) : '');
    setErr('');
  }, [row, open]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!row) return;
    setErr('');
    setSaving(true);
    const body: Record<string, unknown> = {
      financialEntityId,
      description,
      type,
      amount: parseFloat(amount.replace(',', '.')) || 0,
      competenceDate: new Date(competence).toISOString(),
      dueDate: new Date(due).toISOString(),
      status,
      paymentMethod,
      categoryId: categoryId || null,
      originatorId: originatorId || null,
      bankAccountId:
        paymentMethod === 'CONTA_BANCARIA' || paymentMethod === 'TRANSFERENCIA'
          ? bankAccountId || null
          : null,
      creditCardId: paymentMethod === 'CARTAO_CREDITO' ? creditCardId || null : null,
    };
    if (status === 'PAGO' && paidAtInput) {
      body.paidAt = new Date(paidAtInput + 'T12:00:00').toISOString();
    }
    try {
      await api.patch(`/expenses/${row.id}`, body);
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const m = error.response?.data?.message;
        setErr(typeof m === 'string' ? m : 'Não foi possível guardar.');
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
          <h2 className="text-lg font-semibold text-rose-300">Editar despesa</h2>
          {row && (
            <p className="text-sm text-muted-foreground">
              Valor atual: <span className="font-medium text-foreground">{brl(parseFloat(row.amount))}</span>
            </p>
          )}
        </div>
        {row && (
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={save}>
            <p className="sm:col-span-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs leading-relaxed text-rose-100/90">
              <strong>Orçamento:</strong> <strong>Previsto</strong> entra nas projeções; <strong>Pago (realizado)</strong>{' '}
              confirma a saída. Em <strong>conta ou transferência</strong>, o valor pago atualiza o saldo dessa conta; em{' '}
              <strong>cartão</strong>, use o fluxo de fatura para o saldo bancário.
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
                  if (v === 'PAGO' && !paidAtInput) setPaidAtInput(todayDateInputValue());
                  if (v !== 'PAGO') setPaidAtInput('');
                }}
              >
                <option value="PREVISTO">Previsto (planeado)</option>
                <option value="PAGO">Pago (realizado — saiu do caixa / cartão)</option>
                <option value="ATRASADO">Atrasado</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
            {status === 'PAGO' && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Data do pagamento</Label>
                <Input type="date" value={paidAtInput} onChange={(e) => setPaidAtInput(e.target.value)} />
                <p className="text-[11px] text-muted-foreground">
                  Ajuste se o pagamento foi noutro dia. Ao mudar de previsto para pago, sugerimos hoje automaticamente.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Meio de pagamento</Label>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="CONTA_BANCARIA">Conta bancária</option>
                <option value="CARTAO_CREDITO">Cartão de crédito</option>
                <option value="DINHEIRO">Dinheiro</option>
                <option value="TRANSFERENCIA">Transferência</option>
              </select>
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
              <Label>Originador</Label>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
                value={originatorId}
                onChange={(e) => setOriginatorId(e.target.value)}
              >
                <option value="">—</option>
                {members.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </div>
            {(paymentMethod === 'CONTA_BANCARIA' || paymentMethod === 'TRANSFERENCIA') && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Conta</Label>
                <select
                  className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                >
                  <option value="">—</option>
                  {accounts.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {paymentMethod === 'CARTAO_CREDITO' && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Cartão</Label>
                <select
                  className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm touch-manipulation"
                  value={creditCardId}
                  onChange={(e) => setCreditCardId(e.target.value)}
                >
                  <option value="">—</option>
                  {cards.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
