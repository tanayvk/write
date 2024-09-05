import moment from "moment";

const pluralize = (val: number, s: string) =>
  `${val} ${s}${val === 1 ? "" : "s"}`;

export function showDuration(timeMs: number | string, noZero = false) {
  try {
    const parsedTime = typeof timeMs === "string" ? parseInt(timeMs) : timeMs;
    if (isNaN(parsedTime)) return "";
    if (noZero && !parsedTime) return "a few seconds";
    const time = parsedTime;
    const hours = moment.duration(time).hours();
    const minutes = moment.duration(time).minutes();
    const seconds = moment.duration(time).seconds();
    const ms = moment.duration(time).milliseconds();
    let duration = [];
    if (hours > 0) duration.push(pluralize(hours, "hour"));
    if (minutes > 0) duration.push(pluralize(minutes, "minute"));
    if (seconds > 0) duration.push(pluralize(seconds, "second"));
    if (duration.length === 0) duration.push(`${ms} ms`);
    return duration.join(" ");
  } catch {
    return "";
  }
}
