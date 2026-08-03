"use client";

import { useSyncExternalStore, useMemo, useCallback } from "react";
import { getMonthRange, addMonths } from "./formatters";

const STORAGE_KEY = "spent.selectedMonth";

function formatMonthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function parseMonthKey(key: string): { year: number; month: number } | null {
  if (!key || typeof key !== "string") return null;
  const parts = key.split("-");
  if (parts.length !== 2) return null;
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11) {
    return null;
  }
  return { year, month };
}

function getCurrentMonthKey(): string {
  const now = new Date();
  return formatMonthKey(now.getFullYear(), now.getMonth());
}

function readFromStorage(): string {
  if (typeof window === "undefined") return getCurrentMonthKey();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && parseMonthKey(raw)) {
      return raw;
    }
    return getCurrentMonthKey();
  } catch {
    return getCurrentMonthKey();
  }
}

function writeToStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // Storage may be unavailable in private mode or quota exceeded
  }
}

let memValue: string = readFromStorage();
const listeners = new Set<() => void>();

function notify(): void {
  for (const fn of listeners) {
    fn();
  }
}

export function getSelectedMonthKeySync(): string {
  return memValue;
}

export function getSelectedDateSync(): Date {
  const parsed = parseMonthKey(memValue) ?? parseMonthKey(getCurrentMonthKey())!;
  return new Date(parsed.year, parsed.month, 1);
}

export function setSelectedMonthKey(key: string): void {
  const parsed = parseMonthKey(key);
  if (!parsed) return;
  const normalizedKey = formatMonthKey(parsed.year, parsed.month);
  if (memValue === normalizedKey) return;
  memValue = normalizedKey;
  writeToStorage(normalizedKey);
  notify();
}

export function setSelectedMonth(year: number, month: number): void {
  setSelectedMonthKey(formatMonthKey(year, month));
}

export function setSelectedDate(
  updater: Date | ((prevDate: Date) => Date)
): void {
  const currentDate = getSelectedDateSync();
  const nextDate =
    typeof updater === "function" ? updater(currentDate) : updater;
  setSelectedMonth(nextDate.getFullYear(), nextDate.getMonth());
}

export function goToPrevMonth(): void {
  const current = getSelectedDateSync();
  const prev = addMonths(current, -1);
  setSelectedMonth(prev.getFullYear(), prev.getMonth());
}

export function goToNextMonth(): void {
  const current = getSelectedDateSync();
  const next = addMonths(current, 1);
  setSelectedMonth(next.getFullYear(), next.getMonth());
}

export function resetToCurrentMonth(): void {
  setSelectedMonthKey(getCurrentMonthKey());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useSelectedMonth() {
  const monthKey = useSyncExternalStore(
    subscribe,
    () => memValue,
    () => getCurrentMonthKey()
  );

  const { year, month } = useMemo(() => {
    return parseMonthKey(monthKey) ?? parseMonthKey(getCurrentMonthKey())!;
  }, [monthKey]);

  const selectedDate = useMemo(() => new Date(year, month, 1), [year, month]);

  const { from, to } = useMemo(() => getMonthRange(selectedDate), [selectedDate]);

  const handleSetSelectedDate = useCallback(
    (updater: Date | ((prevDate: Date) => Date)) => {
      setSelectedDate(updater);
    },
    []
  );

  const handleSetMonth = useCallback((y: number, m: number) => {
    setSelectedMonth(y, m);
  }, []);

  return {
    selectedDate,
    year,
    month,
    monthKey,
    from,
    to,
    setSelectedDate: handleSetSelectedDate,
    setMonth: handleSetMonth,
    goToPrevMonth,
    goToNextMonth,
    resetToCurrentMonth,
  };
}
