import { useMemo, useState } from "react";
import {
  getDeviceTimeZone,
  getTimeZone,
  hasTimeZoneOverride,
  listTimeZones,
  setTimeZone,
} from "@/lib/dayKey";

interface Props {
  /** Fired after the stored zone changes, with the newly active zone. */
  onChange?: (tz: string) => void;
}

const DEVICE_VALUE = "__device__";

/** Select for the zone that day boundaries are resolved in. */
const TimeZonePicker = ({ onChange }: Props) => {
  const device = getDeviceTimeZone();
  const zones = useMemo(() => listTimeZones(), []);
  const [value, setValue] = useState(() =>
    hasTimeZoneOverride() ? getTimeZone() : DEVICE_VALUE,
  );

  const apply = (next: string) => {
    setValue(next);
    setTimeZone(next === DEVICE_VALUE ? null : next);
    onChange?.(getTimeZone());
  };

  return (
    <div>
      <label htmlFor="timezone-select" className="text-[11px] text-muted-foreground">
        Time zone
      </label>
      <select
        id="timezone-select"
        value={value}
        onChange={(e) => apply(e.target.value)}
        className="mt-1 w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
      >
        <option value={DEVICE_VALUE}>Use device setting ({device.replace(/_/g, " ")})</option>
        {zones.map((tz) => (
          <option key={tz} value={tz}>
            {tz.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </div>
  );
};

export default TimeZonePicker;
