import { Zap, Fuel } from 'lucide-react';

interface Props {
  isCharging: boolean;
  isFuel?: boolean;
  onToggle: () => void;
}

const ChargingButton = ({ isCharging, isFuel = false, onToggle }: Props) => {
  const Icon = isFuel ? Fuel : Zap;
  return (
    <button
      onClick={onToggle}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded transition-colors ${
        isCharging ? 'text-success animate-pulse' : 'text-muted-foreground hover:text-foreground'
      }`}
      aria-label={isCharging ? 'Detener carga' : isFuel ? 'Repostar' : 'Iniciar carga'}
    >
      <Icon size={18} fill={isCharging ? 'currentColor' : 'none'} strokeWidth={isCharging ? 0 : 2} />
    </button>
  );
};
export default ChargingButton;
