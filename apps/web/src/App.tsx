import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Entidades from '@/pages/Entidades';
import Contas from '@/pages/Contas';
import Cartoes from '@/pages/Cartoes';
import Membros from '@/pages/Membros';
import Categorias from '@/pages/Categorias';
import Fontes from '@/pages/Fontes';
import Receitas from '@/pages/Receitas';
import Despesas from '@/pages/Despesas';
import Contratos from '@/pages/Contratos';
import Funcionarios from '@/pages/Funcionarios';
import Financiamentos from '@/pages/Financiamentos';
import Transferencias from '@/pages/Transferencias';
import CartaoLancamentos from '@/pages/CartaoLancamentos';
import Relatorios from '@/pages/Relatorios';
import Projecoes from '@/pages/Projecoes';
import Cdb from '@/pages/Cdb';
import Estrutura from '@/pages/Estrutura';

function Protected({ children }: { children: ReactNode }) {
  const t = localStorage.getItem('lex_token');
  if (!t) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <Protected>
              <AppShell />
            </Protected>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/estrutura" element={<Estrutura />} />
          <Route path="/entidades" element={<Entidades />} />
          <Route path="/contas" element={<Contas />} />
          <Route path="/cartoes" element={<Cartoes />} />
          <Route path="/membros" element={<Membros />} />
          <Route path="/categorias" element={<Categorias />} />
          <Route path="/fontes" element={<Fontes />} />
          <Route path="/receitas" element={<Receitas />} />
          <Route path="/despesas" element={<Despesas />} />
          <Route path="/contratos" element={<Contratos />} />
          <Route path="/funcionarios" element={<Funcionarios />} />
          <Route path="/financiamentos" element={<Financiamentos />} />
          <Route path="/transferencias" element={<Transferencias />} />
          <Route path="/cartao-lancamentos" element={<CartaoLancamentos />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/cdb" element={<Cdb />} />
          <Route path="/projecoes" element={<Projecoes />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
