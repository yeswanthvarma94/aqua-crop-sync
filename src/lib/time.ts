import { formatInTimeZone, toZonedTime } from "date-fns-tz";

const IST_TZ = "Asia/Kolkata";

export const nowIST = () => toZonedTime(new Date(), IST_TZ);

export const formatIST = (date: Date | number, fmt: string) =>
  formatInTimeZone(date, IST_TZ, fmt);

export const cropDayFromStartIST = (startIST: Date | number): number => {
  const now = nowIST().getTime();
  const start = toZonedTime(startIST, IST_TZ).getTime();
  const day = Math.floor((now - start) / (24 * 60 * 60 * 1000)) + 1;
  return Math.max(1, day);
};
