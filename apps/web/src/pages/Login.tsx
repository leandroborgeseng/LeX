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
          setErr('E-mail ou senha incorretos.');
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
      <Card className="w-full max-w-md border-lex-blue/30 bg-card/90 shadow-xl shadow-lex-orange/10 ring-1 ring-lex-green/20 backdrop-blur-sm">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <LexMark className="justify-center" />
          </div>
          <p className="bg-gradient-to-r from-sky-300 via-orange-200 to-emerald-300 bg-clip-text text-sm font-medium text-transparent">
            Controle financeiro unificado PF + PJ
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
            <Button type="submit" className="w-full font-semibold shadow-md shadow-lex-blue/25" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
