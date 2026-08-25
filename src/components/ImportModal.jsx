import { Button } from "./ui.jsx";

export function ImportModal({
  dark,
  importText,
  onImportTextChange,
  onClose,
  onImportText,
  onOpenPlayersFile,
  onOpenAdpFile,
  onOpenStatsFile,
  fileInputRef,
  adpFileRef,
  statsFileRef,
  onPlayersFileChange,
  onAdpFileChange,
  onStatsFileChange,
}) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`${dark ? "bg-zinc-700 text-zinc-100" : "bg-white"} w-full max-w-3xl rounded-2xl shadow p-4`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">Import</h3>
          <Button className="bg-blue-500 text-white" onClick={onClose}>
            Done
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="font-semibold text-sm mb-1">Players (replace list)</div>
            <p className="text-xs opacity-70 mb-2">
              Paste free text (<code>Tier, POS, Team, Name[, Target]</code>) or upload CSV with headers in any order:
              <code> tier</code> (ignored in UI), <code> pos/position</code>, <code> team</code>, <code> name</code>, <code> target</code>.
            </p>
            <textarea
              rows={8}
              className={`w-full rounded-lg border px-2 py-1.5 text-sm ${
                dark ? "bg-zinc-800 border-zinc-600" : ""
              }`}
              placeholder={`Examples:\n1, WR, LAR, Puka Nacua, 2\n1, RB, NYJ, Breece Hall, 3\n2, TE, DET, Sam LaPorta`}
              value={importText}
              onChange={(event) => onImportTextChange(event.target.value)}
            />
            <div className="mt-2 flex gap-2">
              <Button className="bg-orange-300 text-black" onClick={onImportText}>
                Import from Text
              </Button>
              <Button className="bg-orange-300 text-black" onClick={onOpenPlayersFile}>
                Choose CSV…
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={onPlayersFileChange}
              />
            </div>
          </div>

          <div>
            <div className="font-semibold text-sm mb-1">ADP (merge)</div>
            <p className="text-xs opacity-70 mb-2">
              Upload a CSV with columns <code>name</code> (or <code>player</code>), <code>adp</code>, and
              <code> source</code> (e.g. <em>yahoo</em>, <em>fantasypros</em>). This won’t change your player list.
            </p>
            <div className="mt-2 flex gap-2">
              <Button className="bg-orange-300 text-black" onClick={onOpenAdpFile}>
                Choose ADP CSV…
              </Button>
              <input
                ref={adpFileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={onAdpFileChange}
              />
            </div>

            <div className="font-semibold text-sm mt-4 mb-1">Stats (merge, last 3 seasons)</div>
            <p className="text-xs opacity-70 mb-2">
              CSV with flexible headers (e.g., <code>name</code>, <code>year</code>, <code>targets</code>, <code>rec</code>,
              <code>rec_yds</code>, <code>rec_td</code>, <code>rush_att</code>, <code>rush_yds</code>, <code>rush_td</code>,
              <code>pass_att</code>, <code>pass_yds</code>, <code>pass_td</code>).
            </p>
            <div className="mt-2 flex gap-2">
              <Button className="bg-orange-300 text-black" onClick={onOpenStatsFile}>
                Choose Stats CSV…
              </Button>
              <input
                ref={statsFileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={onStatsFileChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
