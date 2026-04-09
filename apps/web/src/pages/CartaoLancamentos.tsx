import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { brl, formatDateBr } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';

type Entity = { id: string; name: string };
type CardRow = { id: string; name: string; financialEntityId: string };
type Cat = { id: string; name: string };
type Member = { id: string; name: string };
type Tx = {
  id: string;
  description: string;
  amount: string;
  purchaseDate: string;
  installmentNumber: number;
  installmentTotal: number;
};

export default function CartaoLancamentos() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedCard, setSelectedCard] = useState('');
  const [txs, setTxs] = useState<Tx[]>([]);

  const [creditCardId, setCreditCardId] = useState('');
  const [financialEntityId, setFinancialEntityId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [installments, setInstallments] = useState('1');
  const [categoryId, setCategoryId] = useState('');
  const [originatorId, setOriginatorId] = useState('');

  async function loadRefs() {
    const [e, c, cat, m] = await Promise.all([
      api.get<Entity[]>('/financial-entities'),
      api.get<CardRow[]>('/credit-cards'),
      api.get<Cat[]>('/categories?kind=EXPENSE'),
      api.get<Member[]>('/household-members'),
    ]);
    setEntities(e.data);
    setCards(c.data);
    setCats(cat.data);
    setMembers(m.data);
    if (!creditCardId && c.data[0]) {
      setCreditCardId(c.data[0].id);
      setSelectedCard(c.data[0].id);
      setFinancialEntityId(c.data[0].financialEntityId);
    }
  }

  async function loadInvoices(cardId: string) {
    if (!cardId) return;
    const { data } = await api.get<{ transactions: Tx[] }[]>(`/credit-transactions/cards/${cardId}/invoices`);
    const flat = data.flatMap((inv) => inv.transactions ?? []);
    setTxs(flat);
  }

  useEffect(() => {
    loadRefs();
  }, []);

  useEffect(() => {
    if (selectedCard) loadInvoices(selectedCard);
  }, [selectedCard]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.post('/credit-transactions/purchases', {
      creditCardId,
      financialEntityId,
      description,
      amount: parseFloat(amount.replace(',', '.')) || 0,
      purchaseDate: new Date(purchaseDate).toISOString(),
      installments: parseInt(installments, 10) || 1,
      categoryId: categoryId || undefined,
      originatorId: originatorId || undefined,
    });
    setDescription('');
    setAmount('');
    await loadInvoices(creditCardId);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Lançamentos no cartão</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova compra / parcelada</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Cartão</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={creditCardId}
                onChange={(e) => {
                  const id = e.target.value;
                  setCreditCardId(id);
                  const c = cards.find((x) => x.id === id);
                  if (c) setFinancialEntityId(c.financialEntityId);
                }}
              >
                {cards.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Entidade (PF/PJ do cartão)</Label>
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
              <Label>Valor total</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Data da compra</Label>
              <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Parcelas</Label>
              <Input value={installments} onChange={(e) => setInstallments(e.target.value)} />
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
            <div className="flex items-end">
              <Button type="submit">Lançar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Extrato por cartão (faturas consolidadas)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Filtrar cartão</Label>
            <select
              className="h-10 max-w-md rounded-md border border-input bg-card px-3 text-sm"
              value={selectedCard}
              onChange={(e) => setSelectedCard(e.target.value)}
            >
              {cards.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>Descrição</TH>
                <TH>Data</TH>
                <TH>Parcela</TH>
                <TH>Valor</TH>
              </TR>
            </THead>
            <TBody>
              {txs.slice(0, 80).map((t) => (
                <TR key={t.id}>
                  <TD>{t.description}</TD>
                  <TD>{formatDateBr(t.purchaseDate)}</TD>
                  <TD>
                    {t.installmentTotal > 1 ? `${t.installmentNumber}/${t.installmentTotal}` : '—'}
                  </TD>
                  <TD>{brl(parseFloat(t.amount))}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
