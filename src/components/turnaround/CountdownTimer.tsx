import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Timer } from 'lucide-react';

interface CountdownTimerProps {
  chocksOnTime: string | null;
  durationMinutes?: number;
}

const parseTimeToDate = (timeStr: string): Date => {
  const [h, m] = timeStr.split(':').map(Number);
  const now = new Date();
  now.setHours(h, m, 0, 0);
  return now;
};

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  chocksOnTime,
  durationMinutes = 40,
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!chocksOnTime || !/^\d{2}:\d{2}$/.test(chocksOnTime)) {
      setRemainingSeconds(null);
      return;
    }

    const startDate = parseTimeToDate(chocksOnTime);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

    const tick = () => {
      const now = new Date();
      const diff = Math.floor((endDate.getTime() - now.getTime()) / 1000);
      setRemainingSeconds(diff);
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [chocksOnTime, durationMinutes]);

  if (remainingSeconds === null) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-sm font-mono">
        <Timer className="h-4 w-4" />
        <span>--:--</span>
      </div>
    );
  }

  const isExpired = remainingSeconds <= 0;
  const isWarning = !isExpired && remainingSeconds <= 300; // 5 min warning
  const absSeconds = Math.abs(remainingSeconds);
  const mins = Math.floor(absSeconds / 60);
  const secs = absSeconds % 60;
  const display = `${isExpired ? '-' : ''}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono font-bold',
        isExpired && 'bg-destructive/20 text-destructive animate-pulse',
        isWarning && 'bg-warning/20 text-warning',
        !isExpired && !isWarning && 'bg-success/20 text-success'
      )}
    >
      <Timer className="h-4 w-4" />
      <span>{display}</span>
    </div>
  );
};
