"use client";
import { useSyncExternalStore } from "react";

const clock = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Kolkata",
});
const subscribe = (tick: () => void) => {
  const id = setInterval(tick, 10_000);
  return () => clearInterval(id);
};
const now = () => clock.format(new Date());
const server = () => "";

/** Server HTML says where; once the client runs, it also says what time it is there. */
export default function LocalTime() {
  const time = useSyncExternalStore(subscribe, now, server);
  return (
    <span className="local-time">
      BENGALURU{time ? <> · <time>{time}</time> IST</> : ", INDIA"}
    </span>
  );
}
