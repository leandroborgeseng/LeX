import { lazy } from 'react';

/** Code-splitting por rota (PWA / primeira carga). Login permanece eager em App. */
export const Dashboard = lazy(() => import('@/pages/Dashboard'));
export const Entidades = lazy(() => import('@/pages/Entidades'));
export const Contas = lazy(() => import('@/pages/Contas'));
export const Cartoes = lazy(() => import('@/pages/Cartoes'));
export const Membros = lazy(() => import('@/pages/Membros'));
export const Categorias = lazy(() => import('@/pages/Categorias'));
export const Fontes = lazy(() => import('@/pages/Fontes'));
export const Receitas = lazy(() => import('@/pages/Receitas'));
export const Despesas = lazy(() => import('@/pages/Despesas'));
export const MovimentosPlanilha = lazy(() => import('@/pages/MovimentosPlanilha'));
export const MovimentosLayout = lazy(() => import('@/pages/MovimentosLayout'));
export const Contratos = lazy(() => import('@/pages/Contratos'));
export const Funcionarios = lazy(() => import('@/pages/Funcionarios'));
export const Financiamentos = lazy(() => import('@/pages/Financiamentos'));
export const Transferencias = lazy(() => import('@/pages/Transferencias'));
export const CartaoLancamentos = lazy(() => import('@/pages/CartaoLancamentos'));
export const Relatorios = lazy(() => import('@/pages/Relatorios'));
export const LiquidezMensal = lazy(() => import('@/pages/LiquidezMensal'));
export const HistoricoFinanceiro = lazy(() => import('@/pages/HistoricoFinanceiro'));
export const Projecoes = lazy(() => import('@/pages/Projecoes'));
export const Cdb = lazy(() => import('@/pages/Cdb'));
export const Estrutura = lazy(() => import('@/pages/Estrutura'));
export const Perfil = lazy(() => import('@/pages/Perfil'));
