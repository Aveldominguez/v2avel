import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Timer, SprayCan, AlertTriangle, Pause, Play } from 'lucide-react';
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

// Parse a time as a Date relative to a reference Date, handling day rollover.
// If the parsed time is more than 12h before the reference, assume it's the next day.
const parseTimeRelativeTo = (timeStr: string, reference: Date): Date => {
  const d = parseTimeToDate(timeStr);
  // Align day to reference first
  d.setFullYear(reference.getFullYear(), reference.getMonth(), reference.getDate());
  if (d.getTime() < reference.getTime() - 12 * 60 * 60 * 1000) {
    d.setDate(d.getDate() + 1);
  } else if (d.getTime() > reference.getTime() + 12 * 60 * 60 * 1000) {
    d.setDate(d.getDate() - 1);
  }
  return d;
};

const isValidTime = (time: string): boolean => {
  if (!time) return true;
  return /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/.test(time);
};

type TimerStatus = 'running' | 'warning' | 'expired' | 'completed';

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
  const [pauseShiftMs, setPauseShiftMs] = useState(0);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const isPaused = pausedAt !== null;
  const effectiveShiftMs = pauseShiftMs + (pausedAt !== null ? Date.now() - pausedAt : 0);

  const useDepartureMode = !!departureTime && /^\d{2}:\d{2}$/.test(departureTime);
  const hasChocksOff = !!chocksOffTime && /^\d{2}:\d{2}$/.test(chocksOffTime);
  const hasLoadingEnd = !!loadingEndTime && /^\d{2}:\d{2}$/.test(loadingEndTime);

  // Compute the target end date (handles midnight rollover by comparing to "now")
  useEffect(() => {
    if (useDepartureMode) {
      const dep = parseTimeToDate(departureTime!);
      // If departure time is in the past by more than 12h, assume it's tomorrow
      if (dep.getTime() < Date.now() - 12 * 60 * 60 * 1000) {
        dep.setDate(dep.getDate() + 1);
      }
      endDateRef.current = dep;
    } else if (chocksOnTime && /^\d{2}:\d{2}$/.test(chocksOnTime)) {
      const startDate = parseTimeToDate(chocksOnTime);
      // If chocksOn is "in the future" relative to now by more than 12h, it actually was yesterday
      if (startDate.getTime() > Date.now() + 12 * 60 * 60 * 1000) {
        startDate.setDate(startDate.getDate() - 1);
      }
      endDateRef.current = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
    } else {
      endDateRef.current = null;
    }
  }, [chocksOnTime, durationMinutes, useDepartureMode, departureTime]);

  // Main countdown timer - stops when chocksOff is marked or reaches 0
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!endDateRef.current) {
      setRemainingSeconds(null);
      reachedZeroRef.current = false;
      return;
    }

    const baseEndMs = endDateRef.current.getTime();

    // If chocksOff is marked, freeze the countdown to the value at chocksOff time
    if (hasChocksOff) {
      const endMs = baseEndMs + pauseShiftMs;
      const chocksOffDate = parseTimeRelativeTo(chocksOffTime!, new Date(endMs));
      const diffMs = endMs - chocksOffDate.getTime();
      const diff = Math.ceil(diffMs / 1000);
      const clamped = Math.max(0, diff);
      setRemainingSeconds(clamped);
      reachedZeroRef.current = clamped <= 0;
      return;
    }

    const tick = () => {
      const nowMs = Date.now();
      const shift = pauseShiftMs + (pausedAt !== null ? nowMs - pausedAt : 0);
      const endMs = baseEndMs + shift;
      const diffMs = endMs - nowMs;
      const diff = Math.ceil(diffMs / 1000);
      const clamped = Math.max(0, diff);
      setRemainingSeconds(clamped);
      if (clamped <= 0 && pausedAt === null) {
        reachedZeroRef.current = true;
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    };

    tick();

    // While paused, don't run a ticking interval - displayed value stays frozen
    if (pausedAt !== null) {
      return;
    }

    const msUntilNextSecond = 1000 - (Date.now() % 1000);
    const alignTimeout = setTimeout(() => {
      tick();
      intervalRef.current = setInterval(tick, 1000);
    }, msUntilNextSecond);

    return () => {
      clearTimeout(alignTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [chocksOnTime, durationMinutes, useDepartureMode, departureTime, hasChocksOff, chocksOffTime, pauseShiftMs, pausedAt]);

  // Delay counter: starts when countdown reaches 0 and chocksOff is not set
  useEffect(() => {
    if (delayIntervalRef.current) clearInterval(delayIntervalRef.current);

    // If chocksOff is filled, freeze delay (stop counting)
    if (hasChocksOff && endDateRef.current) {
      const chocksOffDate = parseTimeRelativeTo(chocksOffTime!, endDateRef.current);
      const delayMs = chocksOffDate.getTime() - endDateRef.current.getTime();
      const delaySecs = Math.max(0, Math.floor(delayMs / 1000));
      setFrozenDelay(delaySecs);
      setDelaySeconds(null);
      return;
    }

    setFrozenDelay(null);

    // Start delay counter when countdown reached zero (and not paused)
    if (reachedZeroRef.current && remainingSeconds === 0 && !hasChocksOff && !isPaused && endDateRef.current) {
      const baseEndMs = endDateRef.current.getTime();

      const tick = () => {
        const nowMs = Date.now();
        const endMs = baseEndMs + pauseShiftMs;
        const diff = Math.max(0, Math.floor((nowMs - endMs) / 1000));
        setDelaySeconds(diff);
      };

      tick();
      delayIntervalRef.current = setInterval(tick, 1000);

      return () => {
        if (delayIntervalRef.current) clearInterval(delayIntervalRef.current);
      };
    } else if (!isPaused) {
      setDelaySeconds(null);
    }
  }, [remainingSeconds, hasChocksOff, chocksOffTime, pauseShiftMs, isPaused]);

  // Determine status
  const getStatus = (): TimerStatus => {
    if (remainingSeconds === null) return 'running';

    // If chocksOff is marked: green if completed before/at deadline, red if after
    if (hasChocksOff && endDateRef.current) {
      const chocksOffDate = parseTimeRelativeTo(chocksOffTime!, endDateRef.current);
      return chocksOffDate.getTime() <= endDateRef.current.getTime() ? 'completed' : 'expired';
    }

    // If loadingEnd was marked while there was still time, keep green status
    if (hasLoadingEnd && remainingSeconds > 0) return 'completed';

    if (remainingSeconds <= 0) return 'expired';
    if (remainingSeconds <= 300) return 'warning';
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

  if (remainingSeconds === null) {
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
          status === 'warning' && 'bg-warning/20 text-warning',
          status === 'expired' && 'bg-destructive/20 text-destructive',
          status === 'running' && 'bg-success/20 text-success',
          status === 'completed' && 'bg-success/20 text-success',
          onDepartureTimeChange && 'cursor-pointer hover:opacity-80 active:scale-95 transition-transform'
        )}
        onClick={handleTimerClick}
      >
        <Timer className="h-4 w-4" />
        <span>{formatTime(remainingSeconds)}</span>
      </div>

      {/* Delay counter (red, counts up from 0:00 until chocksOff) */}
      {showDelayCounter && (
        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-destructive/20 text-destructive text-sm font-mono font-bold',
            !hasChocksOff && 'animate-pulse'
          )}
        >
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
