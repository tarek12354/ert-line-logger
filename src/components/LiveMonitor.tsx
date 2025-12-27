import { useState, useEffect, useRef } from 'react';
import { Activity, CheckCircle2, Loader2 } from 'lucide-react';

interface LiveMonitorProps {
  liveValue: string | null;
  isConnected: boolean;
}

export const LiveMonitor = ({ liveValue, isConnected }: LiveMonitorProps) => {
  const [isStable, setIsStable] = useState(false);
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const stabilityTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timer when value changes
    if (stabilityTimerRef.current) {
      clearTimeout(stabilityTimerRef.current);
      stabilityTimerRef.current = null;
    }

    // If value changed, mark as unstable
    if (liveValue !== previousValue) {
      setIsStable(false);
      setPreviousValue(liveValue);

      // Start 2-second stability timer if we have a value
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

  // Reset stability when disconnected
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
        </div>
        
        {/* Stability Indicator */}
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

      {/* Live Value Display */}
      <div className="bg-background/50 rounded-lg p-4 text-center">
        {!isConnected ? (
          <div className="text-muted-foreground text-sm">
            Connect to ESP32 to see live data
          </div>
        ) : liveValue ? (
          <div>
            <div className="text-4xl font-mono font-bold text-primary mb-1">
              {liveValue}
            </div>
            <div className="text-xs text-muted-foreground">
              Current Resistance (R)
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">
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
