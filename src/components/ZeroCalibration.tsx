import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Target, RotateCcw, CheckCircle2 } from 'lucide-react';

interface ZeroCalibrationProps {
  isCalibrated: boolean;
  zeroOffset: number;
  onCalibrate: () => void;
  onReset: () => void;
  isConnected: boolean;
}

export const ZeroCalibration = ({
  isCalibrated,
  zeroOffset,
  onCalibrate,
  onReset,
  isConnected,
}: ZeroCalibrationProps) => {
  return (
    <div className="glass-card rounded-xl p-3 mb-4 border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className={`h-4 w-4 ${isCalibrated ? 'text-green-500' : 'text-muted-foreground'}`} />
          <Label className="text-sm font-medium">Zero Calibration</Label>
          {isCalibrated && (
            <span className="flex items-center gap-1 text-xs text-green-500">
              <CheckCircle2 className="h-3 w-3" />
              Active
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {isCalibrated && (
            <span className="text-xs font-mono text-muted-foreground">
              Offset: {zeroOffset.toFixed(6)}V
            </span>
          )}
          
          {isCalibrated ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onReset}
              className="h-7 text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          ) : (
            <Button
              size="sm"
              variant="default"
              onClick={onCalibrate}
              disabled={!isConnected}
              className="h-7 text-xs"
            >
              <Target className="h-3 w-3 mr-1" />
              Set Zero
            </Button>
          )}
        </div>
      </div>
      
      {!isCalibrated && (
        <p className="text-xs text-muted-foreground mt-2">
          Disconnect electrodes from ground, then press "Set Zero" to compensate AD620 offset
        </p>
      )}
    </div>
  );
};
