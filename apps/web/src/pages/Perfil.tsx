import { useEffect, useState } from 'react';
import axios from 'axios';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Me = { id: string; email: string; name: string | null };

export default function Perfil() {
  const [me, setMe] = useState<Me | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function loadMe() {
    const { data } = await api.get<Me>('/auth/me');
    setMe(data);
    setName(data.name ?? '');
    setEmail(data.email);
  }

  useEffect(() => {
    void loadMe();
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setMsg('');
    try {
      const { data } = await api.patch<Me>('/auth/me', { name, email });
      setMe(data);
      setName(data.name ?? '');
      setEmail(data.email);
      setMsg('Perfil atualizado com sucesso.');
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setErr(typeof error.response?.data?.message === 'string' ? error.response?.data?.message : 'Não foi possível atualizar o perfil.');
      } else {
        setErr('Não foi possível atualizar o perfil.');
      }
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setMsg('');
    try {
      await api.patch('/auth/me/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setMsg('Senha alterada com sucesso.');
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setErr(typeof error.response?.data?.message === 'string' ? error.response?.data?.message : 'Não foi possível alterar a senha.');
      } else {
        setErr('Não foi possível alterar a senha.');
      }
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Minha conta</h1>
      {me && (
        <p className="text-sm text-muted-foreground">
          Utilizador atual: <strong>{me.email}</strong>
        </p>
      )}
      {msg && <p className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">{msg}</p>}
      {err && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:max-w-xl" onSubmit={saveProfile}>
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Button type="submit">Salvar perfil</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alterar senha</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:max-w-xl" onSubmit={savePassword}>
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha atual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div>
              <Button type="submit" variant="secondary">Salvar nova senha</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
