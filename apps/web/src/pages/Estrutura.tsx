import { Link } from 'react-router-dom';
import {
  Building2,
  CreditCard,
  Landmark,
  PieChart,
  Users,
  Wallet,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const sections = [
  {
    to: '/entidades',
    title: 'Entidades PF/PJ',
    description: 'Pessoas físicas e jurídicas do seu planejamento.',
    icon: Building2,
  },
  {
    to: '/contas',
    title: 'Contas bancárias',
    description: 'Contas corrente, poupança e saldos por entidade.',
    icon: Landmark,
  },
  {
    to: '/cartoes',
    title: 'Cartões de crédito',
    description: 'Cadastro de cartões, limites e datas de fechamento.',
    icon: CreditCard,
  },
  {
    to: '/membros',
    title: 'Membros / originadores',
    description: 'Quem gera ou participa das despesas da casa.',
    icon: Users,
  },
  {
    to: '/categorias',
    title: 'Categorias',
    description: 'Classificação de receitas e despesas.',
    icon: PieChart,
  },
  {
    to: '/fontes',
    title: 'Fontes pagadoras',
    description: 'Quem paga as suas receitas (empregador, clientes, etc.).',
    icon: Wallet,
  },
];

export default function Estrutura() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Estrutura</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastros base: configure entidades, contas e classificações antes de lançar receitas e despesas.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map(({ to, title, description, icon: Icon }) => (
          <Link key={to} to={to} className="group block touch-manipulation">
            <Card className="h-full transition-colors hover:border-primary/40 hover:bg-muted/30">
              <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="flex items-center gap-1 text-base font-semibold">
                    <span className="truncate">{title}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Lançamentos no cartão e transferências continuam no menu principal, junto com receitas e despesas.
      </p>
    </div>
  );
}
