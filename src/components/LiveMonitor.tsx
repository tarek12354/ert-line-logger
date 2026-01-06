import { useState, useEffect, useRef } from 'react';
import { Activity, CheckCircle2, Loader2 } from 'lucide-react';

interface LiveMonitorProps {
  liveValue: string | null;
  isConnected: boolean;
  rhoA: string | null;
  arrayType: 'wenner' | 'schlumberger';
}

export const LiveMonitor = ({ liveValue, isConnected, rhoA, arrayType }: LiveMonitorProps) => {
  const [isStable, setIsStable] = useState(false);
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const stabilityTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (stabilityTimerRef.current) {
      clearTimeout(stabilityTimerRef.current);
      stabilityTimerRef.current = null;
    }

    if (liveValue !== previousValue) {
      setIsStable(false);
      setPreviousValue(liveValue);

      if (liveValue) {
        stabilityTimerRef.current = setTimeout(() => {
          setIsStable(true);
        }, 2000);
      }
    }

    return () => {
      if (stabilityTimerRef.current) {
        clearTimeout(stabilityTimerRef.current);
      }
    };
  }, [liveValue, previousValue]);

  useEffect(() => {
    if (!isConnected) {
      setIsStable(false);
      setPreviousValue(null);
    }
  }, [isConnected]);

  return (
    <div className="glass-card rounded-xl p-4 mb-4 border-2 border-primary/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Live Monitoring</h3>
          <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
            {arrayType === 'wenner' ? 'Wenner' : 'Schlumberger'}
          </span>
        </div>
        
        {isConnected && liveValue && (
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
            isStable 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
          }`}>
            {isStable ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Stable
              </>
            ) : (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Stabilizing...
              </>
            )}
          </div>
        )}
      </div>

      <div className="bg-background/50 rounded-lg p-4">
        {!isConnected ? (
          <div className="text-muted-foreground text-sm text-center">
            Connect to ESP32 to see live data
          </div>
        ) : liveValue ? (
          <div className="grid grid-cols-2 gap-4">
            {/* Resistance R */}
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-primary mb-1">
                {liveValue}
              </div>
              <div className="text-xs text-muted-foreground">
                R (Ω)
              </div>
            </div>
            
            {/* Resistivity ρa */}
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-accent mb-1">
                {rhoA || '—'}
              </div>
              <div className="text-xs text-muted-foreground">
                ρa (Ω·m)
              </div>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground text-sm text-center">
            Waiting for data from ESP32...
          </div>
        )}
      </div>

      {isConnected && liveValue && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Press "Suivante" to save this value
        </p>
      )}
    </div>
  );
};
