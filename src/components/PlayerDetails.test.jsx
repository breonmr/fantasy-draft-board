import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlayerDetails } from "./PlayerDetails.jsx";

function renderDetails(selected, extra = {}) {
  return render(
    <PlayerDetails
      dark={false}
      selected={selected}
      positionRank={1}
      adp={{}}
      stats={{}}
      openAdp={() => {}}
      openStats={() => {}}
      statsFileRef={createRef()}
      adpFileRef={createRef()}
      onRefreshPlayerData={() => {}}
      sleeperRefreshState="idle"
      sleeperRefreshError=""
      {...extra}
    />
  );
}

describe("PlayerDetails metadata presentation", () => {
  it("keeps collapsed details useful without external metadata", () => {
    renderDetails({ id: "a", name: "Known Player", pos: "WR", team: "MIN", rank: 4, starred: false });

    expect(screen.getByText("Known Player")).toBeInTheDocument();
    expect(screen.getByText("Overall #5")).toBeInTheDocument();
    expect(screen.getByText("WR1")).toBeInTheDocument();
    expect(screen.getByText("☆ Not starred")).toBeInTheDocument();
    expect(screen.queryByText(/Age \d+/)).not.toBeInTheDocument();
  });

  it("shows compact profile and injury metadata when a Sleeper match is present", () => {
    renderDetails({
      id: "a",
      name: "Known Player",
      pos: "WR",
      team: "MIN",
      rank: 4,
      starred: true,
      sleeper: {
        status: "matched",
        age: 26,
        height: "6'1\"",
        weight: "205",
        college: "LSU",
        yearsExp: 4,
        injuryStatus: "Questionable",
      },
    });

    expect(screen.getByText("Age 26")).toBeInTheDocument();
    expect(screen.getByText("205 lb")).toBeInTheDocument();
    expect(screen.getByText("LSU")).toBeInTheDocument();
    expect(screen.getByText(/Injury: Questionable/)).toBeInTheDocument();
  });

  it("keeps a refresh failure nonintrusive", () => {
    renderDetails({ id: "a", name: "Known Player", pos: "WR", team: "MIN", rank: 4 }, { sleeperRefreshError: "offline" });

    expect(screen.getByRole("status")).toHaveTextContent("Player data refresh failed");
  });
});
