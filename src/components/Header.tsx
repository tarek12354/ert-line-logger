import { Zap, Settings, BatteryFull, BatteryLow, BatteryMedium, BatteryWarning } from 'lucide-react';
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

const BatteryLevel = ({ voltage }: { voltage: number | null }) => {
  if (voltage === null) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-muted/30 bg-muted/10 px-3 py-1 text-xs">
        <span className="text-muted-foreground">Battery</span>
        <span className="font-mono text-muted-foreground">—</span>
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
      ? 'bg-green-500/20 text-green-400 border-green-500/30'
      : tone === 'warn'
        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
        : 'bg-destructive/20 text-destructive border-destructive/30 animate-pulse';

  return (
    <div className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${toneClasses}`}>
      <BatteryIcon className="h-4 w-4" />
      <span className="font-semibold">Battery</span>
      <span className="font-mono">{voltage.toFixed(1)}V</span>
      <span className="text-[10px] opacity-70">({Math.round(percentage)}%)</span>
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
    <header className="text-center py-4">
      <div className="flex items-center justify-center gap-3 mb-2 flex-wrap">
        <div className="p-2 rounded-xl bg-primary/10 border border-primary/30">
          <Zap className="h-8 w-8 text-primary" />
        </div>

        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gradient-primary">ERT App</h1>
          <BatteryLevel voltage={batteryVoltage} />
        </div>

        <div className="flex gap-1">
          <AboutModal />
          <Button variant="ghost" size="icon" onClick={onOpenDiagnostic}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground text-sm font-mono">Tomographie de Résistivité Électrique</p>
    </header>
  );
};
