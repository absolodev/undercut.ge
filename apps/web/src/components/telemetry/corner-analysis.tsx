"use client";

export function CornerAnalysis({ sessionId, driverA, driverB }: any) {
  const corners = [
    { num: 1, name: "Turn 1", diff: -0.150 },
    { num: 2, name: "Turn 2", diff: -0.050 },
    { num: 3, name: "Turn 3", diff: 0.200 },
    { num: 4, name: "Turn 4", diff: 0.100 },
    { num: 8, name: "Turn 8", diff: -0.300 },
    { num: 10, name: "Hairpin", diff: -0.400 },
    { num: 13, name: "Turn 13", diff: 0.050 },
    { num: 14, name: "Final Corner", diff: -0.100 },
  ];

  return (
    <div className="bg-[#111] border border-white/10 rounded-lg p-6 flex flex-col h-[400px]">
      <div className="flex justify-between items-end mb-4">
        <h3 className="font-display text-sm font-bold uppercase">Corner Analysis</h3>
        <div className="text-[10px] font-mono text-white/50">Delta relative to Driver A</div>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <table className="w-full text-left text-sm font-mono">
          <thead className="text-[10px] text-white/30 sticky top-0 bg-[#111] border-b border-white/10">
            <tr>
              <th className="py-2">CORNER</th>
              <th className="py-2 text-right">TIME GAIN/LOSS</th>
            </tr>
          </thead>
          <tbody>
            {corners.map((c) => (
              <tr key={c.num} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-3">
                  <span className="font-bold text-white mr-2">T{c.num}</span>
                  <span className="text-white/50 text-xs hidden sm:inline">{c.name}</span>
                </td>
                <td className="py-3 text-right">
                  <span className={c.diff > 0 ? "text-[#00FF00]" : "text-[#E10600]"}>
                    {c.diff > 0 ? "+" : ""}{c.diff.toFixed(3)}s
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-xs font-mono">
        <div>
          <div className="text-white/50 text-[10px] mb-1">STRONGEST CORNER (A)</div>
          <div className="text-white font-bold">T10 Hairpin</div>
        </div>
        <div>
          <div className="text-white/50 text-[10px] mb-1">STRONGEST CORNER (B)</div>
          <div className="text-white font-bold">T3</div>
        </div>
      </div>
    </div>
  );
}
