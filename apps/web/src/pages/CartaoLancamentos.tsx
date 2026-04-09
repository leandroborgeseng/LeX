import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import api from '@/lib/api';
import { brl, formatDateBr, todayDateInputValue } from '@/lib/format';
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
  const { cardId: cardIdParam } = useParams<{ cardId: string }>();

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
  const [purchaseDate, setPurchaseDate] = useState(() => todayDateInputValue());
  const [installments, setInstallments] = useState('1');
  const [categoryId, setCategoryId] = useState('');
  const [originatorId, setOriginatorId] = useState('');
  const [refsReady, setRefsReady] = useState(false);

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

    const match = c.data.find((x) => x.id === cardIdParam);
    if (match) {
      setCreditCardId(match.id);
      setSelectedCard(match.id);
      setFinancialEntityId(match.financialEntityId);
    }
    setRefsReady(true);
  }

  async function loadInvoices(cardId: string) {
    if (!cardId) return;
    const { data } = await api.get<{ transactions: Tx[] }[]>(`/credit-transactions/cards/${cardId}/invoices`);
    const flat = data.flatMap((inv) => inv.transactions ?? []);
    setTxs(flat);
  }

  useEffect(() => {
    setRefsReady(false);
    void loadRefs();
  }, [cardIdParam]);

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
    setPurchaseDate(todayDateInputValue());
    await loadInvoices(creditCardId);
  }

  if (!cardIdParam) {
    return <Navigate to="/cartoes" replace />;
  }

  const currentCard = cards.find((x) => x.id === cardIdParam);
  const cardMissing = refsReady && !currentCard;

  if (cardMissing) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Cartão não encontrado.</p>
        <Button asChild variant="outline">
          <Link to="/cartoes">Voltar aos cartões</Link>
        </Button>
      </div>
    );
  }

  const titleName = currentCard?.name ?? 'Cartão';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1 h-auto px-2 py-1 text-muted-foreground touch-manipulation">
            <Link to="/cartoes">← Cartões</Link>
          </Button>
          <h1 className="text-2xl font-semibold">{titleName}</h1>
          <p className="text-sm text-muted-foreground">Compras parceladas e extrato consolidado deste cartão.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova compra / parcelada</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <Label>Cartão</Label>
              <p className="text-sm font-medium text-foreground">{titleName}</p>
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
          <CardTitle className="text-base">Extrato (faturas consolidadas)</CardTitle>
        </CardHeader>
        <CardContent>
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
