import React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PasswordChecks {
  length: boolean;
  lower: boolean;
  upper: boolean;
  number: boolean;
  symbol: boolean;
}

export const evaluatePassword = (pw: string): PasswordChecks => ({
  length: pw.length >= 8,
  lower: /[a-z]/.test(pw),
  upper: /[A-Z]/.test(pw),
  number: /\d/.test(pw),
  symbol: /[^A-Za-z0-9]/.test(pw),
});

export const passwordScore = (c: PasswordChecks) =>
  Number(c.length) + Number(c.lower) + Number(c.upper) + Number(c.number) + Number(c.symbol);

export const isPasswordStrong = (c: PasswordChecks) =>
  c.length && c.lower && c.upper && c.number && c.symbol;

const LABELS = ['Muy débil', 'Muy débil', 'Débil', 'Aceptable', 'Buena', 'Fuerte'];
const COLORS = [
  'bg-destructive',
  'bg-destructive',
  'bg-orange-500',
  'bg-yellow-500',
  'bg-lime-500',
  'bg-green-500',
];

export const generateStrongPassword = (length = 14): string => {
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums = '23456789';
  const syms = '!@#$%&*?-_+=';
  const all = lower + upper + nums + syms;
  const rand = (set: string) => set[crypto.getRandomValues(new Uint32Array(1))[0] % set.length];
  const chars = [rand(lower), rand(upper), rand(nums), rand(syms)];
  for (let i = chars.length; i < length; i++) chars.push(rand(all));
  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
};

const Item: React.FC<{ ok: boolean; children: React.ReactNode }> = ({ ok, children }) => (
  <li className={cn('flex items-center gap-2 text-xs', ok ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground')}>
    {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
    <span>{children}</span>
  </li>
);

export const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
  const checks = evaluatePassword(password);
  const score = passwordScore(checks);
  if (!password) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full transition-all', COLORS[score])}
            style={{ width: `${(score / 5) * 100}%` }}
          />
        </div>
        <span className="text-xs font-medium tabular-nums w-20 text-right">{LABELS[score]}</span>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
        <Item ok={checks.length}>Al menos 8 caracteres</Item>
        <Item ok={checks.upper}>Una mayúscula (A-Z)</Item>
        <Item ok={checks.lower}>Una minúscula (a-z)</Item>
        <Item ok={checks.number}>Un número (0-9)</Item>
        <Item ok={checks.symbol}>Un símbolo (!@#$…)</Item>
      </ul>
    </div>
  );
};
