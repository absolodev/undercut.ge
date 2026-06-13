export function CornerGuide({ corners }: { corners: any }) {
  if (!corners || !corners.length) {
    return <div className="text-text-muted text-sm text-center py-8">No corner data available</div>;
  }

  return (
    <div className="overflow-y-auto max-h-[400px]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#222] font-mono text-[10px] text-white/50 sticky top-0">
          <tr>
            <th className="p-2">TURN</th>
            <th className="p-2">NAME</th>
          </tr>
        </thead>
        <tbody>
          {corners.map((c: any, i: number) => (
            <tr key={i} className="border-b border-white/5 hover:bg-white/5">
              <td className="p-2 font-mono font-bold text-white/70">T{c.number}</td>
              <td className="p-2 text-white/90">{c.name || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
