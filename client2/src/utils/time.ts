import dayjs from "dayjs";

export const toLocalTime = (utc: string | Date): string => {
  return dayjs(utc).format("YYYY-MM-DD HH:mm");
};

export const toLocalDate = (utc: string | Date): string => {
  return dayjs(utc).format("YYYY-MM-DD");
};

export const toLocalClock = (utc: string | Date): string => {
  return dayjs(utc).format("HH:mm");
};

export const toUtcIsoMinute = (value: string | Date): string => {
  const d = new Date(value);
  d.setSeconds(0, 0);
  return d.toISOString();
};

export const ymdToUtcIso = (ymd: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) {
    return toUtcIsoMinute(ymd);
  }
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0)).toISOString();
};
