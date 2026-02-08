import { Ruler } from 'lucide-react';

interface CurrentSpacingDisplayProps {
  currentA: number;
  measurementNumber: number;
}

export const CurrentSpacingDisplay = ({ currentA, measurementNumber }: CurrentSpacingDisplayProps) => {
  return (
    <div className="glass-card rounded-xl p-4 mb-4 border-2 border-primary bg-primary/10">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Ruler className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">
            Écartement Cible (Mesure #{measurementNumber + 1})
          </span>
        </div>
        <div className="text-5xl font-bold text-primary font-mono">
          a = {currentA.toFixed(1)} m
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          X-Location: <span className="font-mono font-semibold text-foreground">{(1.5 * currentA).toFixed(2)} m</span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          ⚡ Déplacez les électrodes à {currentA.toFixed(1)}m avant le prochain pulse
        </p>
      </div>
    </div>
  );
};
