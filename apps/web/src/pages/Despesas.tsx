import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { brl, formatDateBr, isDueWithinDaysFromToday, todayDateInputValue } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';

type Entity = { id: string; name: string };
type Cat = { id: string; name: string };
type Member = { id: string; name: string };
type Account = { id: string; name: string };
type CardRow = { id: string; name: string };
type Exp = {
  id: string;
  description: string;
  amount: string;
  competenceDate: string;
  dueDate: string;
  status: string;
  paymentMethod: string;
};

export default function Despesas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const listFilter = searchParams.get('filter');

  const [entities, setEntities] = useState<Entity[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [rows, setRows] = useState<Exp[]>([]);

  const [financialEntityId, setFinancialEntityId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [competence, setCompetence] = useState(() => todayDateInputValue());
  const [due, setDue] = useState(() => todayDateInputValue());
  const [type, setType] = useState<'RECORRENTE' | 'ESPORADICA'>('ESPORADICA');
  const [paymentMethod, setPaymentMethod] = useState('CONTA_BANCARIA');
  const [categoryId, setCategoryId] = useState('');
  const [originatorId, setOriginatorId] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [creditCardId, setCreditCardId] = useState('');
  const [recFreq, setRecFreq] = useState<'MONTHLY' | 'YEARLY' | 'CUSTOM'>('MONTHLY');
  const [future, setFuture] = useState('12');

  async function load() {
    const [e, c, m, a, cd, ex] = await Promise.all([
      api.get<Entity[]>('/financial-entities'),
      api.get<Cat[]>('/categories?kind=EXPENSE'),
      api.get<Member[]>('/household-members'),
      api.get<Account[]>('/bank-accounts'),
      api.get<CardRow[]>('/credit-cards'),
      api.get<Exp[]>('/expenses'),
    ]);
    setEntities(e.data);
    setCats(c.data);
    setMembers(m.data);
    setAccounts(a.data);
    setCards(cd.data);
    setRows(ex.data);
    if (!financialEntityId && e.data[0]) setFinancialEntityId(e.data[0].id);
  }

  useEffect(() => {
    load();
  }, []);

  const displayRows = useMemo(() => {
    if (listFilter !== 'proximos') return rows;
    return rows.filter(
      (r) =>
        (r.status === 'PREVISTO' || r.status === 'ATRASADO') && isDueWithinDaysFromToday(r.dueDate, 30),
    );
  }, [rows, listFilter]);

  async function create(ev: React.FormEvent) {
    ev.preventDefault();
    const body: Record<string, unknown> = {
      financialEntityId,
      description,
      type,
      amount: parseFloat(amount.replace(',', '.')) || 0,
      competenceDate: new Date(competence).toISOString(),
      dueDate: new Date(due).toISOString(),
      paymentMethod,
      categoryId: categoryId || undefined,
      originatorId: originatorId || undefined,
      bankAccountId:
        paymentMethod === 'CONTA_BANCARIA' || paymentMethod === 'TRANSFERENCIA'
          ? bankAccountId || undefined
          : undefined,
      creditCardId: paymentMethod === 'CARTAO_CREDITO' ? creditCardId || undefined : undefined,
    };
    if (type === 'RECORRENTE') {
      body.recurrenceFrequency = recFreq;
      body.futureOccurrences = parseInt(future, 10) || 12;
    }
    await api.post('/expenses', body);
    setDescription('');
    setAmount('');
    setCompetence(todayDateInputValue());
    setDue(todayDateInputValue());
    await load();
  }

  return (
    <div className="space-y-6">
      {listFilter === 'proximos' && (
        <div className="flex flex-col gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>
            A mostrar apenas despesas <strong>previstas ou atrasadas</strong> com vencimento nos próximos{' '}
            <strong>30 dias</strong>.
          </span>
          <Button type="button" variant="outline" size="sm" className="shrink-0 touch-manipulation" onClick={() => setSearchParams({})}>
            Ver todas
          </Button>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova despesa</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Entidade</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
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
            <div className="space-y-2 md:col-span-2">
              <Label>Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value as 'RECORRENTE' | 'ESPORADICA')}
              >
                <option value="ESPORADICA">Esporádica</option>
                <option value="RECORRENTE">Recorrente</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Meio de pagamento</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
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
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
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
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
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
              <div className="space-y-2">
                <Label>Conta</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
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
              <div className="space-y-2">
                <Label>Cartão</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
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
            {type === 'RECORRENTE' && (
              <>
                <div className="space-y-2">
                  <Label>Recorrência</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                    value={recFreq}
                    onChange={(e) =>
                      setRecFreq(e.target.value as 'MONTHLY' | 'YEARLY' | 'CUSTOM')
                    }
                  >
                    <option value="MONTHLY">Mensal</option>
                    <option value="YEARLY">Anual</option>
                    <option value="CUSTOM">Personalizada</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Ocorrências futuras</Label>
                  <Input value={future} onChange={(e) => setFuture(e.target.value)} />
                </div>
              </>
            )}
            <div className="flex items-end">
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {listFilter === 'proximos' ? 'Despesas a vencer (filtro)' : 'Últimas despesas'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {listFilter === 'proximos' && displayRows.length === 0 && (
            <p className="mb-3 text-sm text-muted-foreground">Nenhuma despesa corresponde a este filtro.</p>
          )}
          <Table>
            <THead>
              <TR>
                <TH>Descrição</TH>
                <TH>Competência</TH>
                <TH>Vencimento</TH>
                <TH>Valor</TH>
                <TH>Meio</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {displayRows.slice(0, 40).map((r) => (
                <TR key={r.id}>
                  <TD>{r.description}</TD>
                  <TD>{formatDateBr(r.competenceDate)}</TD>
                  <TD>{formatDateBr(r.dueDate)}</TD>
                  <TD>{brl(parseFloat(r.amount))}</TD>
                  <TD>{r.paymentMethod}</TD>
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
