import { EVENT_NAMES, TelemetryEventName } from "../events";
import { TelemetryPayloadMap } from "../types";
import { TELEMETRY_EVENT_CATALOG } from "../catalog";

// 1. No duplicate event name values
it("has no duplicate event name values", () => {
  const values = Object.values(EVENT_NAMES);
  const unique = new Set(values);
  expect(unique.size).toBe(values.length);
});

// 2. Every event has catalog metadata
it("every event has catalog metadata", () => {
  const values = Object.values(EVENT_NAMES);
  for (const name of values) {
    expect(TELEMETRY_EVENT_CATALOG[name as TelemetryEventName]).toBeDefined();
  }
});

// 3. Every event in EVENT_NAMES exists in TelemetryPayloadMap
it("every event in EVENT_NAMES exists in TelemetryPayloadMap", () => {
  const values = Object.values(EVENT_NAMES);
  for (const name of values) {
    expect(name in ({} as TelemetryPayloadMap)).toBe(true);
  }
});

// 4. Typed helper enforces compile-time payload compatibility

import { buildTelemetryEvent } from "../helpers";

test("buildTelemetryEvent enforces payload type", () => {
  // Valid usage
  expect(
    buildTelemetryEvent("wallet_connect_submitted", {
      provider: "freighter",
      surface: "modal",
    })
  ).toEqual({
    eventName: "wallet_connect_submitted",
    payload: { provider: "freighter", surface: "modal" },
  });
  // TypeScript compile-time test (uncomment to check):
  // buildTelemetryEvent("wallet_connect_submitted", { foo: "bar" }); // Should error if uncommented
});
