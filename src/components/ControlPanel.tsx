import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Play, SkipForward, Bluetooth, Power, MapPin } from 'lucide-react';

interface ControlPanelProps {
  isConnected: boolean;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onStartLine: (a: number) => void;
  onNextMeasure: () => void;
  gpsEnabled: boolean;
  onGpsToggle: (enabled: boolean) => void;
}

export const ControlPanel = ({
  isConnected,
  isConnecting,
  onConnect,
  onDisconnect,
  onStartLine,
  onNextMeasure,
  gpsEnabled,
  onGpsToggle,
}: ControlPanelProps) => {
  const [aValue, setAValue] = useState('5.0');

  const handleStartLine = () => {
    const value = parseFloat(aValue);
    if (!isNaN(value) && value > 0) {
      onStartLine(value);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      {/* GPS Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center gap-2">
          <MapPin className={`h-4 w-4 ${gpsEnabled ? 'text-green-500' : 'text-muted-foreground'}`} />
          <Label htmlFor="gps-toggle" className="text-sm font-medium cursor-pointer">
            📍 GPS
          </Label>
        </div>
        <Switch
          id="gps-toggle"
          checked={gpsEnabled}
          onCheckedChange={onGpsToggle}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="a-value" className="text-sm text-muted-foreground">
          Espacement (a) en mètres
        </Label>
        <Input
          id="a-value"
          type="number"
          step="0.1"
          min="0.1"
          value={aValue}
          onChange={(e) => setAValue(e.target.value)}
          className="font-mono bg-background border-border"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {!isConnected ? (
          <Button
            variant="default"
            className="col-span-2"
            onClick={onConnect}
            disabled={isConnecting}
          >
            <Bluetooth className="h-4 w-4" />
            {isConnecting ? 'Connexion...' : 'Connexion Bluetooth'}
          </Button>
        ) : (
          <Button
            variant="destructive"
            className="col-span-2"
            onClick={onDisconnect}
          >
            <Power className="h-4 w-4" />
            Déconnecter
          </Button>
        )}

        <Button
          variant="success"
          onClick={handleStartLine}
          disabled={!isConnected}
        >
          <Play className="h-4 w-4" />
          Démarrer
        </Button>

        <Button
          variant="accent"
          onClick={onNextMeasure}
          disabled={!isConnected}
        >
          <SkipForward className="h-4 w-4" />
          Suivante
        </Button>

      </div>
    </div>
  );
};
