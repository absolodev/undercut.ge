import { DnfTicker } from "./dnf-ticker";
import { SpeedTrapWidget } from "./speed-trap-widget";
import { PaceSparkline } from "./pace-sparkline";
import { TireStrategyMini } from "./tire-strategy-mini";
import { WeatherWidget } from "./weather-widget";

export function BottomBar() {
  return (
    <div className="h-full flex items-center gap-4 px-4 overflow-x-auto">
      <DnfTicker />
      <Divider />
      <SpeedTrapWidget />
      <Divider />
      <TireStrategyMini />
      <Divider />
      <WeatherWidget />
      <Divider />
      <PaceSparkline />
    </div>
  );
}

function Divider() {
  return <div className="w-px h-8 bg-border-default shrink-0" />;
}
