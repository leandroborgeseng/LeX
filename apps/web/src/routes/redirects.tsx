import { Navigate, useLocation } from 'react-router-dom';

export function RedirectToMovimentosReceitas() {
  const { search } = useLocation();
  return <Navigate to={`/movimentos/receitas${search}`} replace />;
}

export function RedirectToMovimentosDespesas() {
  const { search } = useLocation();
  return <Navigate to={`/movimentos/despesas${search}`} replace />;
}
