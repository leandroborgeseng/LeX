import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';
import { brl, formatDateBr, todayDateInputValue } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { EditExpenseModal, type ExpenseRow } from '@/components/movimentos/EditExpenseModal';
import { EditRevenueModal, type RevenueRow } from '@/components/movimentos/EditRevenueModal';
import { cn } from '@/lib/utils';

type Entity = { id: string; name: string; type: string };
type CatE = { id: string; name: string };
type CatR = { id: string; name: string };
type Member = { id: string; name: string };
type Account = { id: string; name: string };
type CardRow = { id: string; name: string };
type Payer = { id: string; name: string };

type RevApi = RevenueRow & { category?: { name: string } | null; financialEntity?: { name: string; type: string } };
type ExpApi = ExpenseRow & { category?: { name: string } | null; financialEntity?: { name: string; type: string } };

type UnifiedKind = 'R' | 'D';

type UnifiedRow = {
  key: string;
  kind: UnifiedKind;
  id: string;
  competenceDate: string;
  dueDate: string;
  description: string;
  categoryName: string;
  amountLabel: string;
  amountNum: number;
  status: string;
  entityName: string;
  entityType: string;
  rawRev: RevApi | null;
  rawExp: ExpApi | null;
};

const IMPPJ_CATEGORY = 'Impostos e contribuições (PJ)';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/** month0 = 0..11 (JavaScript) */
function boundsForMonth(year: number, month0: number): { from: string; to: string } {
  const from = `${year}-${pad2(month0 + 1)}-01`;
  const last = new Date(year, month0 + 1, 0).getDate();
  const to = `${year}-${pad2(month0 + 1)}-${pad2(last)}`;
  return { from, to };
}

function parseMoney(s: string): number {
  const t = s.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : NaN;
}

function parseFlexibleDate(s: string): Date | null {
  const t = s.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const d = new Date(t + 'T12:00:00');
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const dd = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const yy = parseInt(m[3], 10);
    const d = new Date(yy, mo, dd, 12, 0, 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function entityByPfPj(entities: Entity[], token: string): Entity | undefined {
  const u = token.trim().toUpperCase();
  if (u === 'PF') return entities.find((e) => e.type === 'PF');
  if (u === 'PJ') return entities.find((e) => e.type === 'PJ');
  return entities.find((e) => e.name.toLowerCase().includes(token.toLowerCase()));
}

export default function MovimentosPlanilha() {
  const [viewYm, setViewYm] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m0: d.getMonth() };
  });
  const { from, to } = useMemo(() => boundsForMonth(viewYm.y, viewYm.m0), [viewYm]);
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(viewYm.y, viewYm.m0, 1)),
    [viewYm],
  );
  const [scope, setScope] = useState<'ALL' | 'PF' | 'PJ'>('ALL');

  const [entities, setEntities] = useState<Entity[]>([]);
  const [catsE, setCatsE] = useState<CatE[]>([]);
  const [catsR, setCatsR] = useState<CatR[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [payers, setPayers] = useState<Payer[]>([]);
  const [revs, setRevs] = useState<RevApi[]>([]);
  const [exps, setExps] = useState<ExpApi[]>([]);
  const [loadErr, setLoadErr] = useState('');
  const [importText, setImportText] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [importBusy, setImportBusy] = useState(false);

  const [editExpOpen, setEditExpOpen] = useState(false);
  const [editRevOpen, setEditRevOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<ExpenseRow | null>(null);
  const [editingRev, setEditingRev] = useState<RevenueRow | null>(null);

  const [taxEntityId, setTaxEntityId] = useState('');
  const [taxDesc, setTaxDesc] = useState('DARF / IRPJ / CSLL (PJ)');
  const [taxAmount, setTaxAmount] = useState('');
  const [taxComp, setTaxComp] = useState(() => todayDateInputValue());
  const [taxDue, setTaxDue] = useState(() => todayDateInputValue());
  const [taxBusy, setTaxBusy] = useState(false);
  const [taxMsg, setTaxMsg] = useState('');

  const [draftRows, setDraftRows] = useState(
    () =>
      Array.from({ length: 8 }, () => ({
        tipo: '' as '' | 'R' | 'D',
        entityScope: '' as '' | 'PF' | 'PJ',
        competence: '',
        due: '',
        description: '',
        amount: '',
      })),
  );
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftMsg, setDraftMsg] = useState('');
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadErr('');
    const p = new URLSearchParams();
    p.set('from', from);
    p.set('to', to);
    const qs = p.toString();
    try {
      const [e, ce, cr, m, a, cd, pay, r, x] = await Promise.all([
        api.get<Entity[]>('/financial-entities'),
        api.get<CatE[]>('/categories?kind=EXPENSE'),
        api.get<CatR[]>('/categories?kind=REVENUE'),
        api.get<Member[]>('/household-members'),
        api.get<Account[]>('/bank-accounts'),
        api.get<CardRow[]>('/credit-cards'),
        api.get<Payer[]>('/payer-sources'),
        api.get<RevApi[]>(`/revenues?${qs}`),
        api.get<ExpApi[]>(`/expenses?${qs}`),
      ]);
      setEntities(e.data);
      setCatsE(ce.data);
      setCatsR(cr.data);
      setMembers(m.data);
      setAccounts(a.data);
      setCards(cd.data);
      setPayers(pay.data);
      setRevs(r.data);
      setExps(x.data);
    } catch {
      setLoadErr('Não foi possível carregar os movimentos.');
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const pjs = entities.filter((e) => e.type === 'PJ');
    if (!pjs.length) return;
    setTaxEntityId((cur) => (cur && pjs.some((e) => e.id === cur) ? cur : pjs[0].id));
  }, [entities]);

  const merged = useMemo(() => {
    const out: UnifiedRow[] = [];
    for (const r of revs) {
      const net = parseFloat(r.netAmount);
      out.push({
        key: `R-${r.id}`,
        kind: 'R',
        id: r.id,
        competenceDate: r.competenceDate,
        dueDate: r.dueDate,
        description: r.description,
        categoryName: r.category?.name ?? '—',
        amountLabel: brl(net),
        amountNum: net,
        status: r.status,
        entityName: r.financialEntity?.name ?? '—',
        entityType: r.financialEntity?.type ?? '',
        rawRev: r,
        rawExp: null,
      });
    }
    for (const x of exps) {
      const amt = parseFloat(x.amount);
      out.push({
        key: `D-${x.id}`,
        kind: 'D',
        id: x.id,
        competenceDate: x.competenceDate,
        dueDate: x.dueDate,
        description: x.description,
        categoryName: x.category?.name ?? '—',
        amountLabel: brl(amt),
        amountNum: -amt,
        status: x.status,
        entityName: x.financialEntity?.name ?? '—',
        entityType: x.financialEntity?.type ?? '',
        rawRev: null,
        rawExp: x,
      });
    }
    out.sort((a, b) => new Date(b.competenceDate).getTime() - new Date(a.competenceDate).getTime());
    return out;
  }, [revs, exps]);

  const filtered = useMemo(() => {
    if (scope === 'ALL') return merged;
    return merged.filter((row) => row.entityType === scope);
  }, [merged, scope]);

  const saldo = useMemo(() => filtered.reduce((s, r) => s + r.amountNum, 0), [filtered]);

  function openRow(row: UnifiedRow) {
    if (row.kind === 'R' && row.rawRev) {
      setEditingRev(row.rawRev);
      setEditRevOpen(true);
    } else if (row.kind === 'D' && row.rawExp) {
      setEditingExp(row.rawExp);
      setEditExpOpen(true);
    }
  }

  function goPrevMonth() {
    setViewYm(({ y, m0 }) => (m0 > 0 ? { y, m0: m0 - 1 } : { y: y - 1, m0: 11 }));
  }

  function goNextMonth() {
    setViewYm(({ y, m0 }) => (m0 < 11 ? { y, m0: m0 + 1 } : { y: y + 1, m0: 0 }));
  }

  async function deleteRow(ev: React.MouseEvent, row: UnifiedRow) {
    ev.stopPropagation();
    const tipo = row.kind === 'R' ? 'receita' : 'despesa';
    if (!window.confirm(`Eliminar ${tipo} «${row.description}» (${formatDateBr(row.competenceDate)})?`)) return;
    setDeletingKey(row.key);
    try {
      if (row.kind === 'R') await api.delete(`/revenues/${row.id}`);
      else await api.delete(`/expenses/${row.id}`);
      await load();
    } catch (e) {
      setImportMsg(apiErrorMessage((e as { response?: { data?: unknown } })?.response?.data) || 'Não foi possível eliminar.');
    } finally {
      setDeletingKey(null);
    }
  }

  async function copyTsv() {
    const header = ['tipo', 'competencia', 'vencimento', 'entidade', 'pf_pj', 'descricao', 'categoria', 'valor', 'status'].join('\t');
    const lines = filtered.map((r) =>
      [
        r.kind,
        r.competenceDate.slice(0, 10),
        r.dueDate.slice(0, 10),
        r.entityName,
        r.entityType,
        r.description.replace(/\t/g, ' '),
        r.categoryName.replace(/\t/g, ' '),
        String(Math.abs(r.amountNum)).replace('.', ','),
        r.status,
      ].join('\t'),
    );
    const tsv = [header, ...lines].join('\n');
    try {
      await navigator.clipboard.writeText(tsv);
      setImportMsg('Tabela copiada para a área de transferência (cole no Excel).');
    } catch {
      setImportMsg('Não foi possível copiar; selecione e copie manualmente a área de importação após colar o resultado.');
    }
  }

  async function runImport() {
    setImportMsg('');
    setImportBusy(true);
    const lines = importText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let ok = 0;
    let fail = 0;
    const errs: string[] = [];
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (line.startsWith('#')) continue;
      const parts = line.split(/\t|;/).map((c) => c.trim());
      if (parts.length < 4) {
        fail += 1;
        errs.push(`Linha ${i + 1}: precisa tipo;data;descrição;valor (e opcionalmente PF ou PJ).`);
        continue;
      }
      const [tipoRaw, dataRaw, descRaw, valRaw, scopeRaw] = parts;
      const tipo = tipoRaw.toUpperCase();
      if (tipo !== 'R' && tipo !== 'D') {
        fail += 1;
        errs.push(`Linha ${i + 1}: tipo deve ser R ou D.`);
        continue;
      }
      const dt = parseFlexibleDate(dataRaw);
      if (!dt) {
        fail += 1;
        errs.push(`Linha ${i + 1}: data inválida (${dataRaw}). Use AAAA-MM-DD ou DD/MM/AAAA.`);
        continue;
      }
      const val = parseMoney(valRaw);
      if (!Number.isFinite(val) || val <= 0) {
        fail += 1;
        errs.push(`Linha ${i + 1}: valor inválido.`);
        continue;
      }
      const ent =
        scopeRaw && scopeRaw.trim()
          ? entityByPfPj(entities, scopeRaw)
          : entities[0];
      if (!ent) {
        fail += 1;
        errs.push(`Linha ${i + 1}: entidade não encontrada (PF/PJ).`);
        continue;
      }
      const iso = dt.toISOString();
      try {
        if (tipo === 'D') {
          await api.post('/expenses', {
            financialEntityId: ent.id,
            description: descRaw || 'Despesa (importação)',
            type: 'ESPORADICA',
            amount: val,
            competenceDate: iso,
            dueDate: iso,
            paymentMethod: 'TRANSFERENCIA',
          });
        } else {
          await api.post('/revenues', {
            financialEntityId: ent.id,
            description: descRaw || 'Receita (importação)',
            type: 'ESPORADICA',
            grossAmount: val,
            taxDiscount: 0,
            netAmount: val,
            competenceDate: iso,
            dueDate: iso,
          });
        }
        ok += 1;
      } catch (e) {
        fail += 1;
        errs.push(`Linha ${i + 1}: ${apiErrorMessage((e as { response?: { data?: unknown } })?.response?.data)}`);
      }
    }
    setImportMsg(
      `Importação: ${ok} criados, ${fail} falharam.${errs.length ? ` Detalhes: ${errs.slice(0, 5).join(' ')}` : ''}`,
    );
    setImportBusy(false);
    await load();
  }

  async function saveDraftRows() {
    setDraftMsg('');
    setDraftBusy(true);
    let n = 0;
    for (const row of draftRows) {
      if (!row.tipo || !row.description.trim() || !row.amount.trim()) continue;
      const val = parseMoney(row.amount);
      if (!Number.isFinite(val) || val <= 0) {
        setDraftMsg('Valores inválidos nas linhas preenchidas.');
        setDraftBusy(false);
        return;
      }
      const ent = row.entityScope ? entityByPfPj(entities, row.entityScope) : entities[0];
      if (!ent) {
        setDraftMsg('Selecione PF ou PJ na linha ou cadastre entidades.');
        setDraftBusy(false);
        return;
      }
      const comp = row.competence || todayDateInputValue();
      const due = row.due || comp;
      const isoC = new Date(comp + 'T12:00:00').toISOString();
      const isoD = new Date(due + 'T12:00:00').toISOString();
      try {
        if (row.tipo === 'D') {
          await api.post('/expenses', {
            financialEntityId: ent.id,
            description: row.description.trim(),
            type: 'ESPORADICA',
            amount: val,
            competenceDate: isoC,
            dueDate: isoD,
            paymentMethod: 'TRANSFERENCIA',
          });
        } else {
          await api.post('/revenues', {
            financialEntityId: ent.id,
            description: row.description.trim(),
            type: 'ESPORADICA',
            grossAmount: val,
            taxDiscount: 0,
            netAmount: val,
            competenceDate: isoC,
            dueDate: isoD,
          });
        }
        n += 1;
      } catch {
        setDraftMsg('Erro ao gravar uma das linhas. Verifique os dados.');
        setDraftBusy(false);
        return;
      }
    }
    setDraftBusy(false);
    setDraftMsg(n ? `${n} lançamento(s) gravados.` : 'Nenhuma linha completa (tipo, descrição, valor).');
    setDraftRows(
      Array.from({ length: 8 }, () => ({
        tipo: '' as '' | 'R' | 'D',
        entityScope: '' as '' | 'PF' | 'PJ',
        competence: '',
        due: '',
        description: '',
        amount: '',
      })),
    );
    await load();
  }

  async function saveTax() {
    setTaxMsg('');
    const pj = entities.find((e) => e.id === taxEntityId && e.type === 'PJ');
    if (!pj) {
      setTaxMsg('Selecione uma entidade PJ.');
      return;
    }
    const val = parseMoney(taxAmount);
    if (!Number.isFinite(val) || val <= 0) {
      setTaxMsg('Informe o valor do imposto.');
      return;
    }
    setTaxBusy(true);
    try {
      let cat = catsE.find((c) => c.name === IMPPJ_CATEGORY);
      if (!cat) {
        const created = await api.post<CatE>('/categories', { name: IMPPJ_CATEGORY, kind: 'EXPENSE' });
        cat = created.data;
        setCatsE((prev) => [...prev, cat!]);
      }
      await api.post('/expenses', {
        financialEntityId: pj.id,
        description: taxDesc.trim() || 'Imposto (PJ)',
        type: 'ESPORADICA',
        amount: val,
        competenceDate: new Date(taxComp + 'T12:00:00').toISOString(),
        dueDate: new Date(taxDue + 'T12:00:00').toISOString(),
        paymentMethod: 'TRANSFERENCIA',
        categoryId: cat.id,
        mandatory: true,
      });
      setTaxAmount('');
      setTaxMsg('Imposto lançado como despesa da PJ.');
      await load();
    } catch (e) {
      setTaxMsg(apiErrorMessage((e as { response?: { data?: unknown } })?.response?.data) || 'Erro ao gravar.');
    } finally {
      setTaxBusy(false);
    }
  }

  const pjEntities = entities.filter((e) => e.type === 'PJ');

  return (
    <div className="space-y-8 pb-6">
      <EditExpenseModal
        open={editExpOpen}
        onOpenChange={setEditExpOpen}
        row={editingExp}
        entities={entities}
        cats={catsE}
        members={members}
        accounts={accounts}
        cards={cards}
        onSaved={() => void load()}
      />
      <EditRevenueModal
        open={editRevOpen}
        onOpenChange={setEditRevOpen}
        row={editingRev}
        entities={entities}
        cats={catsR}
        payers={payers}
        accounts={accounts}
        onSaved={() => void load()}
      />

      <div>
        <h2 className="text-lg font-semibold">Planilha de movimentos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão única de receitas e despesas (PF e PJ). Navegue <strong>mês a mês</strong> para rever e eliminar
          lançamentos errados; importe linhas no formato abaixo ou use a grelha rápida para criar novos.
        </p>
      </div>

      {loadErr && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadErr}
        </p>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mês de competência</CardTitle>
          <p className="text-xs text-muted-foreground">
            Intervalo carregado: <strong className="text-foreground">{from}</strong> a{' '}
            <strong className="text-foreground">{to}</strong>
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="touch-manipulation" onClick={goPrevMonth}>
                ← Mês anterior
              </Button>
              <span className="min-w-[10rem] text-center text-sm font-semibold capitalize text-foreground">
                {monthLabel}
              </span>
              <Button type="button" variant="outline" size="sm" className="touch-manipulation" onClick={goNextMonth}>
                Mês seguinte →
              </Button>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Ano</Label>
                <Input
                  type="number"
                  className="w-24"
                  value={viewYm.y}
                  onChange={(e) =>
                    setViewYm((v) => ({
                      ...v,
                      y: Math.max(2000, Math.min(2100, parseInt(e.target.value, 10) || v.y)),
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Mês</Label>
                <select
                  className="min-h-10 min-w-[8rem] rounded-md border border-input bg-card px-2 py-2 text-sm"
                  value={viewYm.m0}
                  onChange={(e) => setViewYm((v) => ({ ...v, m0: parseInt(e.target.value, 10) }))}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>
                      {new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(2000, i, 1))}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-4 border-t border-border pt-4">
            <div className="space-y-1">
              <Label className="text-xs">Entidade</Label>
              <select
                className="min-h-10 min-w-[10rem] rounded-md border border-input bg-card px-2 py-2 text-sm"
                value={scope}
                onChange={(e) => setScope(e.target.value as 'ALL' | 'PF' | 'PJ')}
              >
                <option value="ALL">PF + PJ</option>
                <option value="PF">Só pessoa física</option>
                <option value="PJ">Só empresa (PJ)</option>
              </select>
            </div>
            <Button type="button" variant="secondary" onClick={() => void load()}>
              Atualizar
            </Button>
            <Button type="button" variant="outline" onClick={() => void copyTsv()}>
              Copiar para Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tabela ({filtered.length} linhas)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Toque ou clique numa linha para editar. Receitas em verde, despesas em laranja. Saldo líquido no período
            filtrado: <strong className="text-foreground">{brl(saldo)}</strong>
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-2">
          <Table>
            <THead>
              <TR>
                <TH>Tipo</TH>
                <TH>Entidade</TH>
                <TH>PF/PJ</TH>
                <TH>Competência</TH>
                <TH>Vencimento</TH>
                <TH>Descrição</TH>
                <TH>Categoria</TH>
                <TH className="text-right">Valor</TH>
                <TH>Status</TH>
                <TH className="w-[100px] text-center">Ações</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((r) => (
                <TR
                  key={r.key}
                  className={cn(
                    'cursor-pointer touch-manipulation',
                    r.kind === 'R' ? 'bg-emerald-50/50 dark:bg-emerald-950/15' : 'bg-orange-50/40 dark:bg-orange-950/15',
                  )}
                  onClick={() => openRow(r)}
                >
                  <TD className="font-medium">{r.kind === 'R' ? 'Receita' : 'Despesa'}</TD>
                  <TD>{r.entityName}</TD>
                  <TD>{r.entityType}</TD>
                  <TD>{formatDateBr(r.competenceDate)}</TD>
                  <TD>{formatDateBr(r.dueDate)}</TD>
                  <TD className="max-w-[200px] truncate">{r.description}</TD>
                  <TD className="max-w-[140px] truncate text-muted-foreground">{r.categoryName}</TD>
                  <TD
                    className={cn(
                      'text-right font-medium tabular-nums',
                      r.amountNum >= 0 ? 'text-emerald-800 dark:text-emerald-200' : 'text-orange-900 dark:text-orange-200',
                    )}
                  >
                    {r.amountNum >= 0 ? '+' : ''}
                    {brl(Math.abs(r.amountNum))}
                  </TD>
                  <TD className="text-xs">{r.status}</TD>
                  <TD className="text-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 touch-manipulation text-destructive hover:bg-destructive/10"
                      disabled={deletingKey === r.key}
                      onClick={(ev) => void deleteRow(ev, r)}
                    >
                      {deletingKey === r.key ? '…' : 'Eliminar'}
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhum movimento neste período.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Importar do Excel (colar)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Cole linhas separadas por tabulação ou ponto e vírgula. Formato:{' '}
            <code className="rounded bg-muted px-1">tipo</code>,{' '}
            <code className="rounded bg-muted px-1">data</code>,{' '}
            <code className="rounded bg-muted px-1">descrição</code>,{' '}
            <code className="rounded bg-muted px-1">valor</code>, opcionalmente{' '}
            <code className="rounded bg-muted px-1">PF</code> ou <code className="rounded bg-muted px-1">PJ</code>.
            Tipo <strong>R</strong> receita, <strong>D</strong> despesa. Ex.:{' '}
            <code className="block max-w-full truncate rounded bg-muted px-1 text-xs">
              D	2026-04-10	Aluguel escritório	3500	PJ
            </code>
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            className="min-h-[120px] w-full rounded-md border border-input bg-card p-3 font-mono text-sm"
            placeholder={'D\t2026-04-01\tInternet\t89,90\tPF\nR\t2026-04-05\tNota fiscal 12\t15000\tPJ'}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={importBusy || !importText.trim()} onClick={() => void runImport()}>
              {importBusy ? 'Importando…' : 'Importar para o sistema'}
            </Button>
          </div>
          {importMsg && <p className="text-sm text-muted-foreground">{importMsg}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grelha rápida (novas linhas)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Preencha tipo (R/D), PF ou PJ, datas, descrição e valor; depois grave todas de uma vez.
          </p>
        </CardHeader>
        <CardContent className="space-y-3 overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH className="w-16">Tipo</TH>
                <TH className="w-20">PF/PJ</TH>
                <TH>Comp.</TH>
                <TH>Venc.</TH>
                <TH>Descrição</TH>
                <TH className="w-28">Valor (R$)</TH>
              </TR>
            </THead>
            <TBody>
              {draftRows.map((row, idx) => (
                <TR key={idx}>
                  <TD>
                    <select
                      className="w-full min-w-0 rounded border border-input bg-card px-1 py-1 text-sm"
                      value={row.tipo}
                      onChange={(e) =>
                        setDraftRows((rs) =>
                          rs.map((r, i) => (i === idx ? { ...r, tipo: e.target.value as 'R' | 'D' | '' } : r)),
                        )
                      }
                    >
                      <option value="">—</option>
                      <option value="R">R</option>
                      <option value="D">D</option>
                    </select>
                  </TD>
                  <TD>
                    <select
                      className="w-full min-w-0 rounded border border-input bg-card px-1 py-1 text-sm"
                      value={row.entityScope}
                      onChange={(e) =>
                        setDraftRows((rs) =>
                          rs.map((r, i) =>
                            i === idx ? { ...r, entityScope: e.target.value as '' | 'PF' | 'PJ' } : r,
                          ),
                        )
                      }
                    >
                      <option value="">(1ª)</option>
                      <option value="PF">PF</option>
                      <option value="PJ">PJ</option>
                    </select>
                  </TD>
                  <TD>
                    <Input
                      type="date"
                      className="min-w-[9rem]"
                      value={row.competence}
                      onChange={(e) =>
                        setDraftRows((rs) => rs.map((r, i) => (i === idx ? { ...r, competence: e.target.value } : r)))
                      }
                    />
                  </TD>
                  <TD>
                    <Input
                      type="date"
                      className="min-w-[9rem]"
                      value={row.due}
                      onChange={(e) =>
                        setDraftRows((rs) => rs.map((r, i) => (i === idx ? { ...r, due: e.target.value } : r)))
                      }
                    />
                  </TD>
                  <TD>
                    <Input
                      value={row.description}
                      onChange={(e) =>
                        setDraftRows((rs) =>
                          rs.map((r, i) => (i === idx ? { ...r, description: e.target.value } : r)),
                        )
                      }
                      placeholder="Descrição"
                    />
                  </TD>
                  <TD>
                    <Input
                      value={row.amount}
                      onChange={(e) =>
                        setDraftRows((rs) => rs.map((r, i) => (i === idx ? { ...r, amount: e.target.value } : r)))
                      }
                      placeholder="0,00"
                      inputMode="decimal"
                    />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Button type="button" variant="secondary" disabled={draftBusy} onClick={() => void saveDraftRows()}>
            {draftBusy ? 'A gravar…' : 'Gravar linhas preenchidas'}
          </Button>
          {draftMsg && <p className="text-sm text-muted-foreground">{draftMsg}</p>}
        </CardContent>
      </Card>

      <Card className="border-violet-200/80 bg-violet-50/30 dark:border-violet-900/40 dark:bg-violet-950/20">
        <CardHeader>
          <CardTitle className="text-base">Impostos da empresa (PJ)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Lança uma <strong>despesa</strong> na entidade PJ com a categoria &quot;{IMPPJ_CATEGORY}&quot; (criada
            automaticamente se ainda não existir). Use para DARF, IRPJ estimado, PIS/COFINS/CSLL, etc.
          </p>
        </CardHeader>
        <CardContent>
          {pjEntities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Cadastre uma entidade <strong>PJ</strong> em Estrutura → Entidades para lançar impostos da empresa aqui.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                <Label>Empresa (PJ)</Label>
                <select
                  className="min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                  value={taxEntityId}
                  onChange={(e) => setTaxEntityId(e.target.value)}
                >
                  {pjEntities.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 lg:col-span-2">
                <Label>Descrição (ex.: DARF IRPJ 04/2026)</Label>
                <Input value={taxDesc} onChange={(e) => setTaxDesc(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Valor (R$)</Label>
                <Input value={taxAmount} onChange={(e) => setTaxAmount(e.target.value)} inputMode="decimal" />
              </div>
              <div className="space-y-1">
                <Label>Competência</Label>
                <Input type="date" value={taxComp} onChange={(e) => setTaxComp(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Vencimento / pagamento</Label>
                <Input type="date" value={taxDue} onChange={(e) => setTaxDue(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button type="button" disabled={taxBusy} onClick={() => void saveTax()}>
                  {taxBusy ? 'A gravar…' : 'Lançar imposto'}
                </Button>
              </div>
              {taxMsg && <p className="text-sm sm:col-span-2 lg:col-span-3 text-muted-foreground">{taxMsg}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
