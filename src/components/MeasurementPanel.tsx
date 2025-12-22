import { Activity, Zap } from 'lucide-react';

interface MeasurementPanelProps {
  measurements: string[];
}

export const MeasurementPanel = ({ measurements }: MeasurementPanelProps) => {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex-1 min-h-0 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Mesures</h2>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30">
          <Zap className="h-4 w-4 text-primary" />
          <span className="font-mono text-sm text-primary font-semibold">{measurements.length}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg bg-background/50 border border-border p-3 font-mono text-sm">
        {measurements.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Aucune mesure enregistrée</p>
          </div>
        ) : (
          <div className="space-y-1">
            {measurements.map((measurement, index) => (
              <div
                key={index}
                className="flex items-center gap-3 px-3 py-2 rounded-md bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <span className="text-muted-foreground w-8 text-right">
                  {String(index + 1).padStart(3, '0')}
                </span>
                <span className="text-foreground">{measurement}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
