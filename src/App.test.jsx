import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEY } from "./data/draftDefaults.js";
import App from "./App.jsx";

describe("Fantasy Draft Board", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the board with its starter rankings", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Fantasy Draft Board" })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Draft" })).toHaveLength(10);
  });

  it("moves a drafted player from the rankings to the draft board", () => {
    render(<App />);

    expect(screen.getByText("Round 1 · Pick 1")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Draft" })[0]);

    expect(screen.getAllByRole("button", { name: "Draft" })).toHaveLength(9);
    expect(screen.getByText("Ja'Marr Chase")).toBeInTheDocument();
    expect(screen.getByText("Round 1 · Pick 2")).toBeInTheDocument();
  });

  it("keeps pick numbers right-aligned in empty and occupied slots", () => {
    const { container } = render(<App />);

    expect(container.querySelector('[data-pick-number="1"]')).toHaveClass("right-1", "top-1/2", "-translate-y-1/2");
    fireEvent.click(screen.getAllByRole("button", { name: "Draft" })[0]);
    expect(container.querySelector('[data-pick-number="1"]')).toHaveClass("right-1", "top-1/2", "-translate-y-1/2");
  });

  it("selects and persists My Team while team names are edited", () => {
    const { unmount } = render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Teams" }));
    fireEvent.click(screen.getByRole("button", { name: "Set Team 3 as My Team" }));
    fireEvent.change(screen.getByDisplayValue("Team 3"), { target: { value: "My Squad" } });
    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved.settings.myTeam).toBe(2);
    expect(saved.settings.teamNames[2]).toBe("My Squad");
    expect(screen.getByText("MY")).toBeInTheDocument();

    unmount();
    render(<App />);
    expect(screen.getByText("My Squad")).toBeInTheDocument();
    expect(screen.getByText("MY")).toBeInTheDocument();
  });

  it("uses a single neutral segmented filter control", () => {
    render(<App />);

    const allFilter = screen.getByRole("button", { name: "ALL" });
    const runningBackFilter = screen.getByRole("button", { name: "RB" });
    expect(allFilter).toHaveClass("bg-teal-400");
    expect(runningBackFilter).toHaveClass("bg-slate-800");
    ["ALL", "QB", "RB", "WR", "TE", "FLEX", "K", "DEF"].forEach((label) => {
      const filter = screen.getByRole("button", { name: label });
      expect(filter).toBeInTheDocument();
      expect(filter).not.toHaveClass("truncate");
    });

    fireEvent.click(runningBackFilter);
    expect(screen.getAllByRole("button", { name: "Draft" })).toHaveLength(4);
    expect(runningBackFilter).toHaveClass("bg-teal-400");
  });

  it("renders explicit tier dividers in normal and edit modes", () => {
    render(<App />);

    expect(screen.getByText("Tier 1")).toBeInTheDocument();
    expect(screen.getByText("Tier 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit", exact: true }));
    expect(screen.getByText("Tier 1")).toBeInTheDocument();
    expect(screen.getByText("Tier 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Increase Jonathan Taylor tier" }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).players.find((player) => player.name === "Jonathan Taylor").tier).toBe(3);
    fireEvent.click(screen.getByRole("button", { name: "Clear Jonathan Taylor tier" }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).players.find((player) => player.name === "Jonathan Taylor").tier).toBeUndefined();
  });

  it("clears a player search with the clear control", () => {
    render(<App />);

    const search = screen.getByPlaceholderText("Search by name / team");
    fireEvent.change(search, { target: { value: "Jefferson" } });

    expect(screen.getByRole("button", { name: "Clear search" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Draft" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(search).toHaveValue("");
    expect(screen.getAllByRole("button", { name: "Draft" })).toHaveLength(10);
  });

  it("edits, persists, and clears a player target round", () => {
    const view = render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Increase Ja'Marr Chase target round" }));

    expect(screen.getAllByTitle("Target round 1")).toHaveLength(3);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).players[0].targetRound).toBe(1);

    view.unmount();
    render(<App />);
    expect(screen.getAllByTitle("Target round 1")).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear Ja'Marr Chase target round" }));
    expect(screen.queryByTitle("Target round 1")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).players[0].targetRound).toBeNull();
  });

  it("keeps target-round controls in fixed slots while the round changes", () => {
    const { container } = render(<App />);
    const firstRow = container.querySelector("li[data-id]");

    fireEvent.click(screen.getByRole("button", { name: "Edit", exact: true }));
    const controls = within(firstRow).getByLabelText("Ja'Marr Chase target round controls");
    const increase = within(firstRow).getByRole("button", { name: "Increase Ja'Marr Chase target round" });
    expect(controls).toHaveClass("grid-cols-4");
    expect(controls.children[3]).toBe(increase);

    fireEvent.click(increase);
    expect(controls.children[3]).toBe(within(firstRow).getByRole("button", { name: "Increase Ja'Marr Chase target round" }));
    expect(controls.children[0]).toBe(within(firstRow).getByRole("button", { name: "Clear Ja'Marr Chase target round" }));

    fireEvent.click(within(firstRow).getByRole("button", { name: "Clear Ja'Marr Chase target round" }));
    expect(controls.children[3]).toBe(within(firstRow).getByRole("button", { name: "Increase Ja'Marr Chase target round" }));
    expect(controls.children[0]).toHaveClass("invisible");
  });

  it("uses one target-or-favorite control immediately before Draft", () => {
    const { container } = render(<App />);
    const firstRow = container.querySelector("li[data-id]");
    const starButton = within(firstRow).getByRole("button", { name: "Add Ja'Marr Chase to watchlist" });

    fireEvent.click(starButton);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Increase Ja'Marr Chase target round" }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(within(firstRow).getByTitle("Target round 1")).toBeInTheDocument();
    expect(within(firstRow).queryByRole("button", { name: /Ja'Marr Chase.*watchlist/ })).not.toBeInTheDocument();
    expect(firstRow.lastElementChild.lastElementChild).toHaveTextContent("Draft");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).players[0].starred).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear Ja'Marr Chase target round" }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(within(firstRow).getByRole("button", { name: "Remove Ja'Marr Chase from watchlist" })).toBeInTheDocument();
  });

  it("removes drafted favorites from Targets", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Add Ja'Marr Chase to watchlist" }));
    const targets = screen.getByRole("heading", { name: "Targets" }).closest("section");
    expect(within(targets).getByText("Ja'Marr Chase")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Draft" })[0]);
    expect(within(targets).queryByText("Ja'Marr Chase")).not.toBeInTheDocument();
  });

  it("shows each target's favorite and target-round states in Targets", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Add Ja'Marr Chase to watchlist" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Increase Ja'Marr Chase target round" }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    const targets = screen.getByRole("heading", { name: "Targets" }).closest("section");
    expect(within(targets).getByLabelText("Favorite target")).toBeInTheDocument();
    expect(within(targets).getByTitle("Target round 1")).toBeInTheDocument();
  });

  it("keeps a long Targets list inside the desktop scrollable workspace", () => {
    const { container } = render(<App />);

    screen.getAllByRole("button", { name: /Add .* to watchlist/ }).forEach((button) => {
      fireEvent.click(button);
    });

    const app = container.firstElementChild;
    const rankings = screen.getByRole("heading", { name: "Overall Rankings" }).closest("section");
    const rankingsList = rankings.querySelector("ul");
    const assistance = screen.getByLabelText("Draft assistance");
    const targets = screen.getByRole("heading", { name: "Targets" }).closest("section");
    const targetList = within(targets).getByRole("list", { name: "Actionable targets" });

    expect(within(targets).getAllByRole("listitem")).toHaveLength(10);
    expect(app).toHaveClass("md:h-screen", "md:min-h-0", "md:overflow-hidden");
    expect(rankings).toHaveClass("md:h-full", "md:overflow-hidden");
    expect(rankingsList).toHaveClass("flex-1", "min-h-0", "overflow-y-auto");
    expect(assistance).toHaveClass("md:flex-1", "md:min-h-0", "md:grid-rows-[minmax(0,1fr)]", "md:overflow-hidden");
    expect(targets).toHaveClass("md:min-h-0", "md:overflow-hidden");
    expect(targetList).toHaveClass("md:flex-1", "md:min-h-0", "md:overflow-y-auto");
  });
});
