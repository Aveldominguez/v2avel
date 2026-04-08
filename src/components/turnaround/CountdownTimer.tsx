import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Timer, SprayCan, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CountdownTimerProps {
  chocksOnTime: string | null;
  loadingEndTime: string | null;
  chocksOffTime: string | null;
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

type TimerStatus = 'running' | 'warning' | 'on-time' | 'overtime' | 'expired';

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  chocksOnTime,
  loadingEndTime,
  chocksOffTime,
  durationMinutes = 40,
  cleaningMinutes,
  departureTime,
  onDepartureTimeChange,
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [delaySeconds, setDelaySeconds] = useState<number | null>(null);
  const [frozenDelay, setFrozenDelay] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const delayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<Date | null>(null);
  const reachedZeroRef = useRef(false);

  const useDepartureMode = !!departureTime && /^\d{2}:\d{2}$/.test(departureTime);
  const hasLoadingEnd = !!loadingEndTime && /^\d{2}:\d{2}$/.test(loadingEndTime);
  const hasChocksOff = !!chocksOffTime && /^\d{2}:\d{2}$/.test(chocksOffTime);

  // Compute the target end date
  useEffect(() => {
    if (useDepartureMode) {
      endDateRef.current = parseTimeToDate(departureTime!);
    } else if (chocksOnTime && /^\d{2}:\d{2}$/.test(chocksOnTime)) {
      const startDate = parseTimeToDate(chocksOnTime);
      endDateRef.current = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
    } else {
      endDateRef.current = null;
    }
  }, [chocksOnTime, durationMinutes, useDepartureMode, departureTime]);

  // Freeze countdown when loadingEnd is filled
  useEffect(() => {
    const wasEmpty = !prevLoadingEndRef.current || !/^\d{2}:\d{2}$/.test(prevLoadingEndRef.current);
    const isFilled = hasLoadingEnd;

    if (wasEmpty && isFilled && endDateRef.current) {
      // Calculate remaining at the moment loadingEnd was set
      const endMs = endDateRef.current.getTime();
      const nowMs = Date.now();
      const diff = Math.ceil((endMs - nowMs) / 1000);
      const clamped = Math.max(0, diff);
      setFrozenRemaining(clamped);
      // Stop main countdown
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else if (!isFilled) {
      setFrozenRemaining(null);
    }

    prevLoadingEndRef.current = loadingEndTime;
  }, [loadingEndTime, hasLoadingEnd]);

  // Main countdown timer
  useEffect(() => {
    if (frozenRemaining !== null) return; // frozen, no ticking
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!endDateRef.current) {
      setRemainingSeconds(null);
      reachedZeroRef.current = false;
      return;
    }

    const endMs = endDateRef.current.getTime();

    const tick = () => {
      const nowMs = Date.now();
      const diffMs = endMs - nowMs;
      const diff = Math.ceil(diffMs / 1000);
      const clamped = Math.max(0, diff);
      setRemainingSeconds(clamped);
      if (clamped <= 0) {
        reachedZeroRef.current = true;
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
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
  }, [chocksOnTime, durationMinutes, useDepartureMode, departureTime, frozenRemaining]);

  // Delay counter: starts when countdown reaches 0 and chocksOff is not set
  useEffect(() => {
    if (delayIntervalRef.current) clearInterval(delayIntervalRef.current);

    // If chocksOff is filled, freeze delay
    if (hasChocksOff && endDateRef.current) {
      const chocksOffDate = parseTimeToDate(chocksOffTime!);
      const delayMs = chocksOffDate.getTime() - endDateRef.current.getTime();
      const delaySecs = Math.max(0, Math.floor(delayMs / 1000));
      setFrozenDelay(delaySecs);
      setDelaySeconds(null);
      return;
    }

    setFrozenDelay(null);

    // Start delay counter only if countdown has reached zero and loadingEnd is not what stopped it
    const mainDisplay = frozenRemaining !== null ? frozenRemaining : remainingSeconds;
    const isAtZero = mainDisplay === 0 && !hasLoadingEnd;
    // Also start if loadingEnd was filled but after zero (frozenRemaining === 0)
    const isLoadingEndAfterZero = frozenRemaining === 0;

    if ((isAtZero || (reachedZeroRef.current && !hasChocksOff)) && endDateRef.current) {
      const endMs = endDateRef.current.getTime();

      const tick = () => {
        const nowMs = Date.now();
        const diff = Math.max(0, Math.floor((nowMs - endMs) / 1000));
        setDelaySeconds(diff);
      };

      tick();
      delayIntervalRef.current = setInterval(tick, 1000);

      return () => {
        if (delayIntervalRef.current) clearInterval(delayIntervalRef.current);
      };
    } else {
      setDelaySeconds(null);
    }
  }, [remainingSeconds, frozenRemaining, hasChocksOff, chocksOffTime, hasLoadingEnd]);

  // Determine status
  const getStatus = (): TimerStatus => {
    const display = frozenRemaining !== null ? frozenRemaining : remainingSeconds;
    if (display === null) return 'running';

    if (hasLoadingEnd) {
      if (frozenRemaining === 0) return 'overtime'; // red - filled after 0:00
      if (frozenRemaining !== null && frozenRemaining <= 300) return 'warning'; // orange - ≤5 min
      return 'on-time'; // green
    }

    if (display <= 0) return 'expired';
    if (display <= 300) return 'warning';
    return 'running';
  };

  const status = getStatus();

  // Edit handlers
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
      const [h, m] = editValue.split(':');
      const normalized = `${h.padStart(2, '0')}:${m}`;
      onDepartureTimeChange(normalized);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEditCommit();
    if (e.key === 'Escape') setEditing(false);
  };

  // Format seconds to MM:SS
  const formatTime = (secs: number): string => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const displaySeconds = frozenRemaining !== null ? frozenRemaining : remainingSeconds;
  const showDelay = (frozenDelay !== null ? frozenDelay : delaySeconds);
  const showDelayCounter = showDelay !== null && showDelay > 0;

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

  return (
    <div className="flex items-center gap-2">
      {/* Main countdown */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono font-bold',
          status === 'on-time' && 'bg-success/20 text-success',
          status === 'warning' && 'bg-warning/20 text-warning',
          status === 'overtime' && 'bg-destructive/20 text-destructive',
          status === 'expired' && 'bg-destructive/20 text-destructive',
          status === 'running' && 'bg-success/20 text-success',
          onDepartureTimeChange && 'cursor-pointer hover:opacity-80 active:scale-95 transition-transform'
        )}
        onClick={handleTimerClick}
      >
        <Timer className="h-4 w-4" />
        <span>{formatTime(displaySeconds)}</span>
      </div>

      {/* Delay counter (red, counts up from 0:00 until chocksOff) */}
      {showDelayCounter && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-destructive/20 text-destructive text-sm font-mono font-bold animate-pulse">
          <AlertTriangle className="h-4 w-4" />
          <span>+{formatTime(showDelay)}</span>
        </div>
      )}

      {/* Cleaning badge */}
      {cleaningMinutes != null && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent/20 text-accent-foreground text-xs font-semibold">
          <SprayCan className="h-3.5 w-3.5" />
          <span>{cleaningMinutes}'</span>
        </div>
      )}
    </div>
  );
};
