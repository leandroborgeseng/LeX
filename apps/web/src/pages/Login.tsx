import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '@/lib/api';
import { LexMark } from '@/components/brand/LexMark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('lex_token', data.access_token);
      nav('/');
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const status = e.response?.status;
        const raw = e.response?.data?.message;
        const first = Array.isArray(raw) ? raw[0] : raw;
        if (status === 401) {
          const m = typeof first === 'string' ? first.trim() : '';
          setErr(
            m && m !== 'Credenciais inválidas' && m !== 'Unauthorized'
              ? m
              : 'E-mail ou senha incorretos.',
          );
        } else if (status === 400) {
          setErr(
            typeof first === 'string'
              ? first
              : 'Dados inválidos. Confirme o formato do e-mail.',
          );
        } else if (!e.response) {
          setErr('Sem resposta do servidor. Em dev, confirme que a API está em :3000 e o proxy do Vite ativo.');
        } else {
          setErr('Não foi possível entrar. Tente de novo.');
        }
      } else {
        setErr('Erro inesperado. Tente de novo.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-sky-200 bg-white shadow-xl shadow-sky-200/40 ring-1 ring-orange-100">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center px-2">
            <LexMark className="justify-center [&_img]:h-14" />
          </div>
          <p className="text-sm font-medium text-slate-600">
            Controle financeiro unificado <span className="text-sky-700">PF</span> +{' '}
            <span className="text-emerald-700">PJ</span>
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              Conta criada pelo seed (Docker/Railway): e-mail por defeito{' '}
              <span className="font-mono text-slate-600">leandro.borges@me.com</span>
              {' — '}
              confira também <span className="font-mono">LEX_SEED_EMAIL</span> no servidor. A senha é a de{' '}
              <span className="font-mono">LEX_SEED_PASSWORD</span> (no Railway ou após correr o workflow do GitHub),
              não o secret sozinho no GitHub.
            </p>
            <Button type="submit" className="w-full font-semibold shadow-md shadow-sky-300/40" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
