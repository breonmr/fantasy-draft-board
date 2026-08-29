import { describe, expect, it } from "vitest";
import { destinationTierAtPointer } from "./tierDrop.js";

const players = [
  { id: "a", tier: 2, top: 20, bottom: 40, mid: 30 },
  { id: "b", tier: 2, top: 45, bottom: 65, mid: 55 },
  { id: "c", tier: 3, top: 90, bottom: 110, mid: 100 },
  { id: "d", tier: 3, top: 115, bottom: 135, mid: 125 },
];
const dividers = [{ index: 2, tier: 3, top: 70, bottom: 80 }];

describe("destinationTierAtPointer", () => {
  it("keeps a drop above a divider in the preceding tier", () => {
    expect(destinationTierAtPointer(68, players, dividers, "d")).toBe(2);
  });

  it("assigns the divider tier when the pointer crosses into the next section", () => {
    expect(destinationTierAtPointer(85, players, dividers, "a")).toBe(3);
  });

  it("assigns Tier 1 when dropping above the first player in that section", () => {
    expect(destinationTierAtPointer(
      5,
      [{ id: "a", tier: 1, top: 30, bottom: 50, mid: 40 }],
      [{ index: 0, tier: 1, top: 10, bottom: 20 }],
      "dragged"
    )).toBe(1);
  });

  it("does not assign a tier for an untiered destination", () => {
    expect(destinationTierAtPointer(
      30,
      [{ id: "untiered", top: 20, bottom: 40, mid: 30 }],
      [],
      "dragged"
    )).toBeNull();
  });
});
