import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CountInputProps {
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Campo de cantidad (tránsitos, maletas facturadas, cuerdas, anillas).
 *
 * Son recuentos de la hoja de Control de Rampa, no horas: por eso no llevan el
 * botón del reloj. Se guardan como texto, igual que el resto de la escala, para
 * no tener que tocar nada al leer escalas antiguas donde el campo no existía.
 */
export const CountInput: React.FC<CountInputProps> = ({
  value, onChange, label, className, disabled = false, placeholder = '—',
}) => {
  const [local, setLocal] = useState(value ?? '');
  useEffect(() => { setLocal(value ?? ''); }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Sólo cifras: un recuento con letras no se puede sumar ni imprimir bien.
    const limpio = e.target.value.replace(/[^0-9]/g, '').slice(0, 5);
    setLocal(limpio);
    onChange(limpio === '' ? null : limpio);
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</label>
      )}
      <Input
        type="text"
        inputMode="numeric"
        value={local}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className="input-operational flex-1 text-center font-mono"
      />
    </div>
  );
};

export default CountInput;
