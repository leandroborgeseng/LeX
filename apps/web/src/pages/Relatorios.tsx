import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { brl } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

type Scope = 'PF' | 'PJ' | 'CONSOLIDADO';

export default function Relatorios() {
  const [scope, setScope] = useState<Scope>('CONSOLIDADO');
  const [dre, setDre] = useState<{
    receitaLiquida: number;
    despesas: number;
    resultado: number;
  } | null>(null);
  const [expCat, setExpCat] = useState<{ category: string; total: number }[]>([]);

  useEffect(() => {
    api.get(`/reports/dre?scope=${scope}`).then((r) => setDre(r.data));
    api.get(`/reports/expenses-by-category?scope=${scope}`).then((r) => setExpCat(r.data));
  }, [scope]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Relatórios</h1>
      <p className="text-sm text-muted-foreground">
        Investimentos:{' '}
        <Link to="/cdb" className="font-medium text-primary underline-offset-4 hover:underline">
          CDB / CDI
        </Link>{' '}
        — cadastro, % do CDI (100% ou 110%), IR regressivo e projeção de 5 anos.
      </p>
      <div className="max-w-xs space-y-2">
        <Label>Entidade</Label>
        <select
          className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
          value={scope}
          onChange={(e) => setScope(e.target.value as Scope)}
        >
          <option value="PF">Pessoa física</option>
          <option value="PJ">Empresa</option>
          <option value="CONSOLIDADO">Consolidado</option>
        </select>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">DRE simplificada (mês atual)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {dre && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Receita líquida</span>
                  <span>{brl(dre.receitaLiquida)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Despesas</span>
                  <span>{brl(dre.despesas)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-medium">
                  <span>Resultado</span>
                  <span>{brl(dre.resultado)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Despesas por categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {expCat.map((x) => (
              <div key={x.category} className="flex justify-between">
                <span className="text-muted-foreground">{x.category}</span>
                <span>{brl(x.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <p className="text-xs text-muted-foreground">
        Outros relatórios (fluxo mensal, receitas por fonte, evolução de dívidas, margem de contratos) estão
        disponíveis na documentação Swagger em <code className="rounded bg-muted px-1">/api/docs</code>.
      </p>
    </div>
  );
}
