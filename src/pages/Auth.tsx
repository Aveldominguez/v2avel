import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Plane, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { ThemeToggle } from '@/components/ThemeToggle';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'La contraseña debe tener al menos 6 caracteres');

// El registro público está desactivado: las cuentas las crea un administrador
// desde el panel de administración.
const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // Los gestores de contraseñas (iCloud, 1Password…) rellenan el DOM sin
  // disparar onChange de React: leemos el valor real del input al enviar.
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && !authLoading) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const validateInputs = (emailVal: string, passwordVal: string): boolean => {
    try {
      emailSchema.parse(emailVal);
    } catch {
      toast({
        title: 'Error de validación',
        description: 'Por favor, introduce un email válido',
        variant: 'destructive',
      });
      return false;
    }

    try {
      passwordSchema.parse(passwordVal);
    } catch {
      toast({
        title: 'Error de validación',
        description: 'La contraseña debe tener al menos 6 caracteres',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailVal = emailRef.current?.value ?? email;
    const passwordVal = passwordRef.current?.value ?? password;
    if (!validateInputs(emailVal, passwordVal)) return;

    setLoading(true);
    const { error } = await signIn(emailVal, passwordVal);
    setLoading(false);

    if (error) {
      let message = 'Error al iniciar sesión';
      if (error.message.includes('Invalid login credentials')) {
        message = 'Email o contraseña incorrectos';
      } else if (error.message.includes('Email not confirmed')) {
        message = 'Por favor, confirma tu email antes de iniciar sesión';
      }
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Plane className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Ramp Control</CardTitle>
          <CardDescription>
            Sistema de gestión de escalas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">Email</Label>
              <Input
                id="signin-email"
                ref={emailRef}
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signin-password">Contraseña</Label>
              <Input
                id="signin-password"
                ref={passwordRef}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              ¿Necesitas una cuenta? Contacta con tu administrador.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
