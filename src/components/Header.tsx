import { Zap, Settings, BatteryFull, BatteryLow, BatteryMedium, BatteryWarning, Battery } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AboutModal } from '@/components/AboutModal';

type BatteryTone = 'ok' | 'warn' | 'low';

// 18V = 100%, 15V = 0%
const getBatteryPercentage = (voltage: number): number => {
  const minV = 15;
  const maxV = 18;
  const percentage = ((voltage - minV) / (maxV - minV)) * 100;
  return Math.max(0, Math.min(100, percentage));
};

const getToneFromVoltage = (voltage: number): BatteryTone => {
  if (voltage > 17) return 'ok';
  if (voltage >= 16) return 'warn';
  return 'low';
};

// Dedicated Battery Status Component - Always Visible
const BatteryStatus = ({ voltage }: { voltage: number | null }) => {
  // Always show the battery indicator, even when not connected
  if (voltage === null) {
    return (
      <div className="flex items-center gap-2 rounded-lg border-2 border-muted/40 bg-muted/20 px-3 py-1.5">
        <Battery className="h-5 w-5 text-muted-foreground" />
        <div className="flex flex-col items-start">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Battery</span>
          <span className="font-mono text-sm text-muted-foreground">-- V</span>
        </div>
      </div>
    );
  }

  const percentage = getBatteryPercentage(voltage);
  const tone = getToneFromVoltage(voltage);

  const BatteryIcon = (() => {
    if (percentage <= 10) return BatteryWarning;
    if (percentage <= 25) return BatteryLow;
    if (percentage <= 75) return BatteryMedium;
    return BatteryFull;
  })();

  // Per spec: >17V green, 16-17V yellow, <16V red + blinking
  const toneClasses =
    tone === 'ok'
      ? 'bg-green-500/20 text-green-400 border-green-500/40'
      : tone === 'warn'
        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
        : 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse';

  const iconColor =
    tone === 'ok' ? 'text-green-400' : tone === 'warn' ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className={`flex items-center gap-2 rounded-lg border-2 px-3 py-1.5 ${toneClasses}`}>
      <BatteryIcon className={`h-5 w-5 ${iconColor}`} />
      <div className="flex flex-col items-start">
        <span className="text-[10px] uppercase tracking-wide font-medium opacity-80">Battery</span>
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-sm font-bold">{voltage.toFixed(1)}V</span>
          <span className="text-[10px] opacity-70">({Math.round(percentage)}%)</span>
        </div>
      </div>
    </div>
  );
};

export const Header = ({
  onOpenDiagnostic,
  batteryVoltage,
}: {
  onOpenDiagnostic: () => void;
  batteryVoltage: number | null;
}) => {
  return (
    <header className="py-4">
      {/* Top row: Title + Battery Status */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/30">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gradient-primary">ERT App</h1>
        </div>

        {/* Battery Status - Always Visible */}
        <BatteryStatus voltage={batteryVoltage} />
      </div>

      {/* Bottom row: Subtitle + Actions */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs font-mono">Tomographie de Résistivité Électrique</p>
        <div className="flex gap-1">
          <AboutModal />
          <Button variant="ghost" size="icon" onClick={onOpenDiagnostic}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};
