import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Timer } from 'lucide-react';

interface CountdownTimerProps {
  chocksOnTime: string | null;
  lastHandBagTime: string | null;
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
  lastHandBagTime,
  durationMinutes = 40,
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [stoppedDisplay, setStoppedDisplay] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!chocksOnTime || !/^\d{2}:\d{2}$/.test(chocksOnTime)) {
      setRemainingSeconds(null);
      setStoppedDisplay(null);
      return;
    }

    const startDate = parseTimeToDate(chocksOnTime);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

    // If lastHandBag is filled, freeze the timer at that moment
    if (lastHandBagTime && /^\d{2}:\d{2}$/.test(lastHandBagTime)) {
      const stopDate = parseTimeToDate(lastHandBagTime);
      const frozen = Math.max(0, Math.floor((endDate.getTime() - stopDate.getTime()) / 1000));
      setStoppedDisplay(frozen);
      setRemainingSeconds(null);
      return;
    }

    setStoppedDisplay(null);

    const tick = () => {
      const now = new Date();
      const diff = Math.floor((endDate.getTime() - now.getTime()) / 1000);
      // Stop at 0
      if (diff <= 0) {
        setRemainingSeconds(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      setRemainingSeconds(diff);
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [chocksOnTime, lastHandBagTime, durationMinutes]);

  const displaySeconds = stoppedDisplay !== null ? stoppedDisplay : remainingSeconds;

  if (displaySeconds === null) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-sm font-mono">
        <Timer className="h-4 w-4" />
        <span>--:--</span>
      </div>
    );
  }

  const isStopped = stoppedDisplay !== null;
  const isExpired = displaySeconds <= 0;
  const isWarning = !isExpired && !isStopped && displaySeconds <= 300;
  const mins = Math.floor(displaySeconds / 60);
  const secs = displaySeconds % 60;
  const display = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono font-bold',
        isStopped && 'bg-primary/20 text-primary',
        isExpired && !isStopped && 'bg-destructive/20 text-destructive',
        isWarning && 'bg-warning/20 text-warning',
        !isExpired && !isWarning && !isStopped && 'bg-success/20 text-success'
      )}
    >
      <Timer className="h-4 w-4" />
      <span>{display}</span>
    </div>
  );
};
