export function showTime(time) {
  const hours = time.get("hours");
  const minutes = time.get("minutes");
  const seconds = time.get("seconds");
  return `${hours > 0 ? hours.toString().padStart(2, "0") + ":" : ""}${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
