import { useState, useEffect, useRef } from 'react';
import { Activity, CheckCircle2, Loader2, BatteryLow, BatteryMedium, BatteryFull, BatteryWarning, Zap, Gauge } from 'lucide-react';

interface SensorData {
  currentMA: number;
  voltageV: number;
  realVoltage: number;
  batteryV: number;
  resistance: number;
}

interface LiveMonitorProps {
  liveValue: number | null;
  averagedValue: number | null;
  isConnected: boolean;
  rhoA: string | null;
  arrayType: 'wenner' | 'schlumberger';
  batteryVoltage: number | null;
  sensorData: SensorData | null;
}

// Calculate battery percentage: 18V = 100%, 15V = 0%
const getBatteryPercentage = (voltage: number): number => {
  const minV = 15;
  const maxV = 18;
  const percentage = ((voltage - minV) / (maxV - minV)) * 100;
  return Math.max(0, Math.min(100, percentage));
};

const BatteryIndicator = ({ voltage }: { voltage: number | null }) => {
  if (voltage === null) return null;
  
  const percentage = getBatteryPercentage(voltage);
  
  // Color logic: >17V green, 16-17V yellow, <16V red with blinking
  const getColorClasses = () => {
    if (voltage > 17) {
      return {
        bg: 'bg-green-500/20',
        text: 'text-green-400',
        border: 'border-green-500/30',
        blink: false
      };
    } else if (voltage >= 16) {
      return {
        bg: 'bg-yellow-500/20',
        text: 'text-yellow-400',
        border: 'border-yellow-500/30',
        blink: false
      };
    } else {
      return {
        bg: 'bg-destructive/20',
        text: 'text-destructive',
        border: 'border-destructive/30',
        blink: true
      };
    }
  };
  
  const getBatteryIcon = () => {
    if (percentage <= 10) return BatteryWarning;
    if (percentage <= 25) return BatteryLow;
    if (percentage <= 75) return BatteryMedium;
    return BatteryFull;
  };
  
  const colors = getColorClasses();
  const BatteryIcon = getBatteryIcon();
  
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border} ${colors.blink ? 'animate-pulse' : ''}`}>
      <BatteryIcon className={`h-4 w-4 ${colors.text}`} />
      <span className="font-mono">{voltage.toFixed(1)}V</span>
      <span className="text-[10px] opacity-70">({Math.round(percentage)}%)</span>
    </div>
  );
};

export const LiveMonitor = ({ 
  liveValue, 
  averagedValue,
  isConnected, 
  rhoA, 
  arrayType, 
  batteryVoltage,
  sensorData 
}: LiveMonitorProps) => {
  const [isStable, setIsStable] = useState(false);
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const stabilityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Use averaged value for display if available, otherwise raw
  const displayR = averagedValue ?? liveValue;

  useEffect(() => {
    if (stabilityTimerRef.current) {
      clearTimeout(stabilityTimerRef.current);
      stabilityTimerRef.current = null;
    }

    if (displayR !== previousValue) {
      setIsStable(false);
      setPreviousValue(displayR);

      if (displayR !== null) {
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
  }, [displayR, previousValue]);

  useEffect(() => {
    if (!isConnected) {
      setIsStable(false);
      setPreviousValue(null);
    }
  }, [isConnected]);

  // Format number with 4 decimal places for high precision
  const formatPrecision = (value: number | null): string => {
    if (value === null) return '—';
    return value.toFixed(4);
  };

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
        
        <div className="flex items-center gap-2">
          {isConnected && <BatteryIndicator voltage={batteryVoltage} />}
          
          {isConnected && displayR !== null && (
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
      </div>

      <div className="bg-background/50 rounded-lg p-4">
        {!isConnected ? (
          <div className="text-muted-foreground text-sm text-center">
            Connect to ESP32 to see live data
          </div>
        ) : displayR !== null ? (
          <div className="space-y-4">
            {/* Main R and ρa display - 4 decimal precision */}
            <div className="grid grid-cols-2 gap-4">
              {/* Resistance R */}
              <div className="text-center">
                <div className="text-2xl font-mono font-bold text-primary mb-1">
                  {formatPrecision(displayR)}
                </div>
                <div className="text-xs text-muted-foreground">
                  R (Ω) <span className="text-[10px] opacity-70">avg</span>
                </div>
              </div>
              
              {/* Resistivity ρa */}
              <div className="text-center">
                <div className="text-2xl font-mono font-bold text-accent mb-1">
                  {rhoA || '—'}
                </div>
                <div className="text-xs text-muted-foreground">
                  ρa (Ω·m)
                </div>
              </div>
            </div>

            {/* Sensor details - Current and Voltage */}
            {sensorData && (
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/50">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Zap className="h-3 w-3" />
                    <span className="text-[10px]">I (mA)</span>
                  </div>
                  <div className="text-sm font-mono text-foreground">
                    {sensorData.currentMA.toFixed(2)}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Gauge className="h-3 w-3" />
                    <span className="text-[10px]">V (raw)</span>
                  </div>
                  <div className="text-sm font-mono text-foreground">
                    {sensorData.voltageV.toFixed(4)}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Gauge className="h-3 w-3" />
                    <span className="text-[10px]">V (real)</span>
                  </div>
                  <div className="text-sm font-mono text-foreground">
                    {sensorData.realVoltage.toFixed(4)}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground text-sm text-center">
            Waiting for data from ESP32...
          </div>
        )}
      </div>

      {isConnected && displayR !== null && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Press "Suivante" to save this value • Moving avg: 5 samples
        </p>
      )}
    </div>
  );
};
