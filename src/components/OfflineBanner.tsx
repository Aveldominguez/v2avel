import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineBanner = () => {
  const { isOnline } = useOnlineStatus();
  if (isOnline) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-black px-3 py-1.5 text-xs font-mono font-semibold flex items-center justify-center gap-2 shadow">
      <WifiOff className="h-3.5 w-3.5" />
      <span>SIN CONEXIÓN — Los cambios se guardan localmente y se sincronizan al volver online</span>
    </div>
  );
};
