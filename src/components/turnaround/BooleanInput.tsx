import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface BooleanInputProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
  className?: string;
  disabled?: boolean;
}

export const BooleanInput: React.FC<BooleanInputProps> = ({
  value,
  onChange,
  label,
  className,
  disabled = false,
}) => {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label className="text-xs font-semibold text-foreground uppercase tracking-wide">
        {label}
      </Label>
      <div className="flex items-center gap-3 h-12 px-3 bg-input rounded-md border-2 border-border">
        <Switch
          checked={value}
          onCheckedChange={onChange}
          disabled={disabled}
          className="data-[state=checked]:bg-success"
        />
        <span className={cn(
          'text-lg font-semibold uppercase tracking-wide',
          value ? 'text-success' : 'text-muted-foreground'
        )}>
          {value ? 'Sí' : 'No'}
        </span>
      </div>
    </div>
  );
};
