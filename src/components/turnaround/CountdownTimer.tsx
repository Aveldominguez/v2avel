import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Timer, SprayCan } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CountdownTimerProps {
  chocksOnTime: string | null;
  loadingEndTime: string | null;
  durationMinutes?: number;
  cleaningMinutes?: number;
  departureTime?: string | null;
  onDepartureTimeChange?: (value: string | null) => void;
}

const parseTimeToDate = (timeStr: string): Date => {
  const [h, m] = timeStr.split(':').map(Number);
  const now = new Date();
  now.setHours(h, m, 0, 0);
  return now;
};

const isValidTime = (time: string): boolean => {
  if (!time) return true;
  return /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/.test(time);
};

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  chocksOnTime,
  loadingEndTime,
  durationMinutes = 40,
  cleaningMinutes,
  departureTime,
  onDepartureTimeChange,
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [stoppedDisplay, setStoppedDisplay] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveSecondsRef = useRef<number | null>(null);
  const prevLoadingEndRef = useRef<string | null>(loadingEndTime);
  const inputRef = useRef<HTMLInputElement>(null);

  // Determine if we use departureTime-based countdown or chocksOn+duration
  const useDepartureMode = !!departureTime && /^\d{2}:\d{2}$/.test(departureTime);

  // Capture freeze on loadingEndTime transition from empty to filled
  useEffect(() => {
    const wasEmpty = !prevLoadingEndRef.current || !/^\d{2}:\d{2}$/.test(prevLoadingEndRef.current);
    const isFilled = !!loadingEndTime && /^\d{2}:\d{2}$/.test(loadingEndTime);

    if (wasEmpty && isFilled && liveSecondsRef.current !== null) {
      setStoppedDisplay(liveSecondsRef.current);
      setRemainingSeconds(null);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else if (!isFilled && stoppedDisplay !== null) {
      setStoppedDisplay(null);
    }

    prevLoadingEndRef.current = loadingEndTime;
  }, [loadingEndTime]);

  useEffect(() => {
    if (stoppedDisplay !== null) return;
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Departure mode: countdown to departureTime
    if (useDepartureMode) {
      const endDate = parseTimeToDate(departureTime!);

      const tick = () => {
        const nowMs = Date.now();
        const diffMs = endDate.getTime() - nowMs;
        // Use Math.ceil so the timer shows "1:00" until the exact second boundary,
        // and reaches "0:00" precisely at the target time
        const diff = Math.ceil(diffMs / 1000);
        setRemainingSeconds(diff);
        liveSecondsRef.current = diff;
      };

      tick();
      // Align the first interval tick to the next whole second boundary for precision
      const msUntilNextSecond = 1000 - (Date.now() % 1000);
      const alignTimeout = setTimeout(() => {
        tick();
        intervalRef.current = setInterval(tick, 1000);
      }, msUntilNextSecond);

      return () => {
        clearTimeout(alignTimeout);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }

    // Default mode: chocksOn + duration
    if (!chocksOnTime || !/^\d{2}:\d{2}$/.test(chocksOnTime)) {
      setRemainingSeconds(null);
      liveSecondsRef.current = null;
      return;
    }

    const startDate = parseTimeToDate(chocksOnTime);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

    const tick = () => {
      const nowMs = Date.now();
      const diffMs = endDate.getTime() - nowMs;
      const diff = Math.ceil(diffMs / 1000);
      if (diff <= 0) {
        setRemainingSeconds(0);
        liveSecondsRef.current = 0;
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      setRemainingSeconds(diff);
      liveSecondsRef.current = diff;
    };

    tick();
    const msUntilNextSecond = 1000 - (Date.now() % 1000);
    const alignTimeout = setTimeout(() => {
      tick();
      intervalRef.current = setInterval(tick, 1000);
    }, msUntilNextSecond);

    return () => {
      clearTimeout(alignTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [chocksOnTime, durationMinutes, stoppedDisplay, useDepartureMode, departureTime]);

  const handleTimerClick = () => {
    if (!onDepartureTimeChange) return;
    setEditValue(departureTime || '');
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (val.length === 2 && !val.includes(':') && editValue.length < 2) {
      val = val + ':';
    }
    if (val.length > 5) return;
    setEditValue(val);
  };

  const handleEditCommit = () => {
    setEditing(false);
    if (!onDepartureTimeChange) return;
    if (editValue === '') {
      onDepartureTimeChange(null);
    } else if (isValidTime(editValue)) {
      // Normalize to HH:MM
      const [h, m] = editValue.split(':');
      const normalized = `${h.padStart(2, '0')}:${m}`;
      onDepartureTimeChange(normalized);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEditCommit();
    if (e.key === 'Escape') setEditing(false);
  };

  const displaySeconds = stoppedDisplay !== null ? stoppedDisplay : remainingSeconds;

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/20 border border-primary/40">
          <Timer className="h-4 w-4 text-primary" />
          <Input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={editValue}
            onChange={handleEditChange}
            onBlur={handleEditCommit}
            onKeyDown={handleEditKeyDown}
            placeholder="HH:MM"
            className="h-6 w-16 px-1 py-0 text-sm font-mono font-bold border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>
    );
  }

  if (displaySeconds === null) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-sm font-mono',
          onDepartureTimeChange && 'cursor-pointer hover:bg-muted/80 active:scale-95 transition-transform'
        )}
        onClick={handleTimerClick}
      >
        <Timer className="h-4 w-4" />
        <span>--:--</span>
      </div>
    );
  }

  const isStopped = stoppedDisplay !== null;
  const isOvertime = isStopped && displaySeconds <= 0;
  const isOnTime = isStopped && displaySeconds > 0;
  const isExpired = !isStopped && displaySeconds <= 0;
  const isWarning = !isExpired && !isStopped && displaySeconds <= 300;
  const absSecs = Math.abs(displaySeconds);
  const mins = Math.floor(absSecs / 60);
  const secs = absSecs % 60;
  const display = `${displaySeconds < 0 ? '-' : ''}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono font-bold',
          isOnTime && 'bg-success/20 text-success',
          isOvertime && 'bg-destructive/20 text-destructive',
          isExpired && 'bg-destructive/20 text-destructive',
          isWarning && 'bg-warning/20 text-warning',
          !isExpired && !isWarning && !isStopped && 'bg-success/20 text-success',
          onDepartureTimeChange && 'cursor-pointer hover:opacity-80 active:scale-95 transition-transform'
        )}
        onClick={handleTimerClick}
      >
        <Timer className="h-4 w-4" />
        <span>{display}</span>
      </div>
      {cleaningMinutes != null && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent/20 text-accent-foreground text-xs font-semibold">
          <SprayCan className="h-3.5 w-3.5" />
          <span>{cleaningMinutes}'</span>
        </div>
      )}
    </div>
  );
};
