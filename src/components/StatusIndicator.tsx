import { Bluetooth, BluetoothConnected, BluetoothOff, Loader2 } from 'lucide-react';

interface StatusIndicatorProps {
  isConnected: boolean;
  isConnecting: boolean;
  deviceName: string | null;
}

export const StatusIndicator = ({ isConnected, isConnecting, deviceName }: StatusIndicatorProps) => {
  if (isConnecting) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary border border-border">
        <Loader2 className="h-5 w-5 text-primary animate-spin" />
        <span className="text-muted-foreground font-mono text-sm">Recherche ESP32...</span>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-success/10 border border-success/30 glow-success">
        <BluetoothConnected className="h-5 w-5 text-success" />
        <div className="flex flex-col">
          <span className="text-success font-semibold text-sm">Connecté</span>
          <span className="text-success/70 font-mono text-xs">{deviceName}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary border border-border">
      <BluetoothOff className="h-5 w-5 text-muted-foreground" />
      <span className="text-muted-foreground font-mono text-sm">Non connecté</span>
    </div>
  );
};
