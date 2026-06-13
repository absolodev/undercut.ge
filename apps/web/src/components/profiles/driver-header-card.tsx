import { DriverAvatar } from "@/components/ui/driver-avatar";

export function DriverHeaderCard({ driver }: { driver: any }) {
  return (
    <div className="flex justify-between items-end border-b border-white/10 pb-6">
      <div className="flex items-end gap-5">
        <DriverAvatar
          driverRef={driver.driver_ref}
          name={driver.full_name}
          headshotUrl={driver.headshot_url}
          size={80}
        />
        <div>
          <div className="flex items-center gap-4">
            <h1 className="font-display text-5xl font-bold">{driver.full_name}</h1>
            {driver.number && (
              <span className="font-mono text-4xl text-white/30 font-bold">{driver.number}</span>
            )}
          </div>
          <div className="text-white/50 mt-2">
            {driver.nationality} • DOB:{" "}
            {driver.date_of_birth ? new Date(driver.date_of_birth).toLocaleDateString() : "N/A"}
          </div>
        </div>
      </div>
    </div>
  );
}
