import { Link } from "@/i18n/navigation";

export function CircuitHeader({ circuit }: { circuit: any }) {
  return (
    <div className="border-b border-white/10 pb-6">
      <Link href="/f1/circuits" className="text-[#E10600] text-sm hover:underline font-mono mb-4 inline-block">
        ← ALL CIRCUITS
      </Link>
      <div className="flex items-center gap-4">
        <h1 className="font-display text-5xl font-bold">{circuit.name}</h1>
      </div>
      <div className="text-white/50 mt-2">{circuit.location}, {circuit.country}</div>
    </div>
  );
}
