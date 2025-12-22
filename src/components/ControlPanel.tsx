import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, SkipForward, Download, Bluetooth, Power } from 'lucide-react';

interface ControlPanelProps {
  isConnected: boolean;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onStartLine: (a: number) => void;
  onNextMeasure: () => void;
  onExport: () => void;
}

export const ControlPanel = ({
  isConnected,
  isConnecting,
  onConnect,
  onDisconnect,
  onStartLine,
  onNextMeasure,
  onExport,
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
          disabled={!isConnected}
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

        <Button
          variant="control"
          className="col-span-2"
          onClick={onExport}
        >
          <Download className="h-4 w-4" />
          Exporter fichier
        </Button>
      </div>
    </div>
  );
};
