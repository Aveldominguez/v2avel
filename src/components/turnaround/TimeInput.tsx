import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ClockColor = 'default' | 'green' | 'red';

interface TimeInputProps {
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
  clockColor?: ClockColor;
}

const getCurrentTime = (): string => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const isValidTime = (time: string): boolean => {
  if (!time) return true;
  const regex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
  return regex.test(time);
};

export const TimeInput: React.FC<TimeInputProps> = ({
  value,
  onChange,
  label,
  error,
  className,
  disabled = false,
  clockColor = 'default',
}) => {
  const [localValue, setLocalValue] = useState(value || '');

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Auto-format: add colon after 2 digits
    if (newValue.length === 2 && !newValue.includes(':') && localValue.length < 2) {
      newValue = newValue + ':';
    }
    
    // Limit to 5 characters (HH:MM)
    if (newValue.length > 5) return;
    
    setLocalValue(newValue);
    
    if (newValue === '') {
      onChange(null);
    } else if (isValidTime(newValue)) {
      onChange(newValue);
    }
  };

  const handleNowClick = () => {
    const now = getCurrentTime();
    setLocalValue(now);
    onChange(now);
  };

  const handleBlur = () => {
    if (localValue && !isValidTime(localValue)) {
      setLocalValue(value || '');
    }
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="flex gap-1.5">
        <Input
          type="text"
          inputMode="numeric"
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="--:--"
          disabled={disabled}
          className={cn(
            'input-operational input-time flex-1',
            error && 'border-destructive focus:border-destructive focus:ring-destructive/20'
          )}
        />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={handleNowClick}
          disabled={disabled}
          className={cn(
            'h-12 w-12 shrink-0',
            clockColor === 'green' && 'bg-emerald-600 hover:bg-emerald-700 text-white',
            clockColor === 'red' && 'bg-red-600 hover:bg-red-700 text-white',
            clockColor === 'default' && 'bg-accent hover:bg-accent/90 text-accent-foreground'
          )}
          title="Poner hora actual"
        >
          <Clock className="h-5 w-5" />
        </Button>
      </div>
      {error && (
        <span className="text-xs text-destructive font-medium">{error}</span>
      )}
    </div>
  );
};
