import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageLoading } from '@/components/layout/PageLoading';
import { PwaUpdatePrompt } from '@/components/layout/PwaUpdatePrompt';
import Login from '@/pages/Login';
import * as Pages from '@/pages/lazy-pages';
import { RedirectToMovimentosDespesas, RedirectToMovimentosReceitas } from '@/routes/redirects';
import { PreferencesProvider } from '@/lib/preferences';

function Protected({ children }: { children: ReactNode }) {
  const t = localStorage.getItem('lex_token');
  if (!t) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <PwaUpdatePrompt />
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <Protected>
                <PreferencesProvider>
                  <AppShell />
                </PreferencesProvider>
              </Protected>
            }
          >
            <Route path="/" element={<Pages.Dashboard />} />
            <Route path="/estrutura" element={<Pages.Estrutura />} />
            <Route path="/entidades" element={<Pages.Entidades />} />
            <Route path="/contas" element={<Pages.Contas />} />
            <Route path="/cartoes" element={<Pages.Cartoes />} />
            <Route path="/cartoes/:cardId" element={<Pages.CartaoLancamentos />} />
            <Route path="/membros" element={<Pages.Membros />} />
            <Route path="/categorias" element={<Pages.Categorias />} />
            <Route path="/fontes" element={<Pages.Fontes />} />
            <Route path="/movimentos" element={<Pages.MovimentosLayout />}>
              <Route index element={<Navigate to="receitas" replace />} />
              <Route path="receitas" element={<Pages.Receitas />} />
              <Route path="despesas" element={<Pages.Despesas />} />
              <Route path="planilha" element={<Pages.MovimentosPlanilha />} />
            </Route>
            <Route path="/receitas" element={<RedirectToMovimentosReceitas />} />
            <Route path="/despesas" element={<RedirectToMovimentosDespesas />} />
            <Route path="/contratos" element={<Pages.Contratos />} />
            <Route path="/funcionarios" element={<Pages.Funcionarios />} />
            <Route path="/financiamentos" element={<Pages.Financiamentos />} />
            <Route path="/transferencias" element={<Pages.Transferencias />} />
            <Route path="/cartao-lancamentos" element={<Navigate to="/cartoes" replace />} />
            <Route path="/relatorios" element={<Pages.Relatorios />} />
            <Route path="/liquidez-mensal" element={<Pages.LiquidezMensal />} />
            <Route path="/historico" element={<Pages.HistoricoFinanceiro />} />
            <Route path="/cdb" element={<Pages.Cdb />} />
            <Route path="/projecoes" element={<Pages.Projecoes />} />
            <Route path="/perfil" element={<Pages.Perfil />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
