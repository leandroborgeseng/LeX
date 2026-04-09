import { useEffect, useState } from 'react';
import axios from 'axios';
import api from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';
import { brl, formatDateBr } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';

type Entity = { id: string; name: string; type: string };
type Cat = { id: string; name: string };
type Payer = { id: string; name: string };
type Account = { id: string; name: string };
type Rev = {
  id: string;
  description: string;
  netAmount: string;
  competenceDate: string;
  dueDate: string;
  status: string;
  type: string;
};

export default function Receitas() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [payers, setPayers] = useState<Payer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [rows, setRows] = useState<Rev[]>([]);

  const [financialEntityId, setFinancialEntityId] = useState('');
  const [description, setDescription] = useState('');
  const [gross, setGross] = useState('');
  const [tax, setTax] = useState('0');
  const [net, setNet] = useState('');
  const [competence, setCompetence] = useState('');
  const [due, setDue] = useState('');
  const [type, setType] = useState<'RECORRENTE' | 'ESPORADICA'>('ESPORADICA');
  const [categoryId, setCategoryId] = useState('');
  const [payerId, setPayerId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [recFreq, setRecFreq] = useState<'MONTHLY' | 'YEARLY' | 'CUSTOM'>('MONTHLY');
  const [future, setFuture] = useState('12');
  const [queueHint, setQueueHint] = useState('');

  async function load() {
    const [e, c, p, a, r] = await Promise.all([
      api.get<Entity[]>('/financial-entities'),
      api.get<Cat[]>('/categories?kind=REVENUE'),
      api.get<Payer[]>('/payer-sources'),
      api.get<Account[]>('/bank-accounts'),
      api.get<Rev[]>('/revenues'),
    ]);
    setEntities(e.data);
    setCats(c.data);
    setPayers(p.data);
    setAccounts(a.data);
    setRows(r.data);
    if (!financialEntityId && e.data[0]) setFinancialEntityId(e.data[0].id);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setQueueHint('');
    const g = parseFloat(gross.replace(',', '.')) || 0;
    const t = parseFloat(tax.replace(',', '.')) || 0;
    const n = net ? parseFloat(net.replace(',', '.')) : g - t;
    const body: Record<string, unknown> = {
      financialEntityId,
      description,
      type,
      grossAmount: g,
      taxDiscount: t,
      netAmount: n,
      competenceDate: new Date(competence).toISOString(),
      dueDate: new Date(due).toISOString(),
      categoryId: categoryId || undefined,
      payerSourceId: payerId || undefined,
      destinationAccountId: accountId || undefined,
    };
    if (type === 'RECORRENTE') {
      body.recurrenceFrequency = recFreq;
      body.futureOccurrences = parseInt(future, 10) || 12;
    }
    try {
      await api.post('/revenues', body);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'lexQueued' in err && (err as { lexQueued?: boolean }).lexQueued) {
        setQueueHint('Sem rede: receita guardada na fila e será enviada quando voltar a internet.');
        setDescription('');
        setGross('');
        setNet('');
        return;
      }
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        setQueueHint(apiErrorMessage(err.response?.data));
        return;
      }
      throw err;
    }
    setDescription('');
    setGross('');
    setNet('');
    await load();
  }

  return (
    <div className="space-y-6 pb-2">
      <h1 className="text-xl font-semibold md:text-2xl">Receitas</h1>
      {queueHint && (
        <p className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">{queueHint}</p>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova receita</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Entidade</Label>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base md:text-sm touch-manipulation"
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
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base md:text-sm touch-manipulation"
                value={type}
                onChange={(e) => setType(e.target.value as 'RECORRENTE' | 'ESPORADICA')}
              >
                <option value="ESPORADICA">Esporádica</option>
                <option value="RECORRENTE">Recorrente</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Valor bruto</Label>
              <Input value={gross} onChange={(e) => setGross(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Impostos / descontos</Label>
              <Input value={tax} onChange={(e) => setTax(e.target.value)} />
            </div>
            <div className="space-y-2">
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
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base md:text-sm touch-manipulation"
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
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base md:text-sm touch-manipulation"
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
            <div className="space-y-2">
              <Label>Conta destino</Label>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base md:text-sm touch-manipulation"
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
            {type === 'RECORRENTE' && (
              <>
                <div className="space-y-2">
                  <Label>Recorrência</Label>
                  <select
                    className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base md:text-sm touch-manipulation"
                    value={recFreq}
                    onChange={(e) =>
                      setRecFreq(e.target.value as 'MONTHLY' | 'YEARLY' | 'CUSTOM')
                    }
                  >
                    <option value="MONTHLY">Mensal</option>
                    <option value="YEARLY">Anual</option>
                    <option value="CUSTOM">Personalizada (mensal no MVP)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Ocorrências futuras</Label>
                  <Input value={future} onChange={(e) => setFuture(e.target.value)} />
                </div>
              </>
            )}
            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <Button type="submit" className="min-h-11 w-full touch-manipulation sm:w-auto">
                Salvar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimas receitas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH>Descrição</TH>
                  <TH>Competência</TH>
                  <TH>Vencimento</TH>
                  <TH>Líquido</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {rows.slice(0, 40).map((r) => (
                  <TR key={r.id}>
                    <TD>{r.description}</TD>
                    <TD>{formatDateBr(r.competenceDate)}</TD>
                    <TD>{formatDateBr(r.dueDate)}</TD>
                    <TD>{brl(parseFloat(r.netAmount))}</TD>
                    <TD>{r.status}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
          <ul className="space-y-2 md:hidden">
            {rows.slice(0, 40).map((r) => (
              <li
                key={r.id}
                className="rounded-lg border border-border bg-card/80 px-3 py-3 text-sm shadow-sm"
              >
                <p className="font-medium leading-snug">{r.description}</p>
                <p className="mt-1 text-muted-foreground">
                  {formatDateBr(r.competenceDate)} · venc. {formatDateBr(r.dueDate)}
                </p>
                <p className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-base font-semibold text-foreground">{brl(parseFloat(r.netAmount))}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{r.status}</span>
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
