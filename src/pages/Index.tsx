import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBluetooth } from '@/hooks/useBluetooth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { StatusIndicator } from '@/components/StatusIndicator';
import { ControlPanel } from '@/components/ControlPanel';
import { MeasurementPanel } from '@/components/MeasurementPanel';
import { ResistivityChart } from '@/components/ResistivityChart';
import { LiveMonitor } from '@/components/LiveMonitor';
import { exportToCSV, exportToKML } from '@/utils/exportUtils';
import { MeasurementData } from '@/types/measurement';
import { toast } from 'sonner';
import { Zap, AlertTriangle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const navigate = useNavigate();
  const [measurements, setMeasurements] = useState<MeasurementData[]>([]);
  const [aValue, setAValue] = useState(5.0);
  const [showChart, setShowChart] = useState(false);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [liveValue, setLiveValue] = useState<string | null>(null);
  
  const pendingSaveRef = useRef(false);

  const {
    isConnected,
    isConnecting,
    deviceName,
    error,
    isSupported,
    isNative,
    connect,
    disconnect,
    send,
    setOnDataCallback,
  } = useBluetooth();

  const { getCurrentPosition, error: gpsError } = useGeolocation();

  // Handle incoming Bluetooth data - update live value
  const handleData = useCallback(async (data: string) => {
    const line = data.trim();
    if (line) {
      // Always update live value for real-time display
      setLiveValue(line);

      // Only save to measurements if "Suivante" was pressed
      if (pendingSaveRef.current) {
        let latitude: number | null = null;
        let longitude: number | null = null;

        if (gpsEnabled) {
          const position = await getCurrentPosition();
          if (position) {
            latitude = position.latitude;
            longitude = position.longitude;
          }
        }

        const newMeasurement: MeasurementData = {
          value: line,
          latitude,
          longitude,
          timestamp: Date.now(),
        };

        setMeasurements(prev => [...prev, newMeasurement]);
        
        const gpsInfo = latitude && longitude 
          ? ` (GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)})` 
          : '';
        toast.success(`Mesure #${measurements.length + 1} enregistrée${gpsInfo}`);
        
        pendingSaveRef.current = false;
      }
    }
  }, [measurements.length, gpsEnabled, getCurrentPosition]);

  useEffect(() => {
    setOnDataCallback(handleData);
  }, [handleData, setOnDataCallback]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (gpsError) {
      toast.error(gpsError);
    }
  }, [gpsError]);

  const handleConnect = async () => {
    const success = await connect();
    if (success) {
      toast.success('Connecté à ESP32_ERT');
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    toast.info('Déconnecté');
  };

  const handleStartLine = async (a: number) => {
    setMeasurements([]);
    setLiveValue(null);
    setAValue(a);
    await send(`A=${a}`);
    await send('RESET');
    toast.success(`Nouvelle ligne démarrée (a = ${a}m)`);
  };

  const handleNextMeasure = async () => {
    // If we have a live value, save it immediately
    if (liveValue) {
      let latitude: number | null = null;
      let longitude: number | null = null;

      if (gpsEnabled) {
        const position = await getCurrentPosition();
        if (position) {
          latitude = position.latitude;
          longitude = position.longitude;
        }
      }

      const newMeasurement: MeasurementData = {
        value: liveValue,
        latitude,
        longitude,
        timestamp: Date.now(),
      };

      setMeasurements(prev => [...prev, newMeasurement]);
      
      const gpsInfo = latitude && longitude 
        ? ` (GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)})` 
        : '';
      toast.success(`Mesure #${measurements.length + 1} enregistrée${gpsInfo}`);
    } else {
      // No live value yet, set flag to save next incoming data
      pendingSaveRef.current = true;
      await send('NEXT');
      toast.info('En attente de données...');
    }
  };

  const handleExport = () => {
    exportToCSV(measurements, aValue);
    toast.success(`Fichier CSV exporté (${measurements.length} mesures)`);
  };

  const handleExportKML = () => {
    const hasGps = measurements.some(m => m.latitude !== null && m.longitude !== null);
    if (!hasGps) {
      toast.error('Aucune donnée GPS disponible pour l\'export KML');
      return;
    }
    exportToKML(measurements, aValue);
    toast.success('Fichier KML exporté pour Google Earth');
  };

  const hasGpsData = measurements.some(m => m.latitude !== null && m.longitude !== null);

  return (
    <div className="min-h-screen bg-background bg-grid">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative min-h-screen flex flex-col p-4 max-w-lg mx-auto">
        {/* Header */}
        <header className="text-center py-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/30">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-gradient-primary">
              ERT App
            </h1>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/diagnostic')}
              className="ml-2"
              title="Diagnostic Bluetooth"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-muted-foreground text-sm font-mono">
            Tomographie de Résistivité Électrique
          </p>
        </header>

        {/* Browser Support Warning */}
        {!isSupported && (
          <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-destructive font-semibold text-sm">
                Web Bluetooth non supporté
              </p>
              <p className="text-destructive/70 text-xs mt-1">
                Utilisez Chrome ou Edge sur Android/Windows/Mac pour la connexion Bluetooth.
              </p>
            </div>
          </div>
        )}

        {/* Status */}
        <div className="mb-4">
          <StatusIndicator
            isConnected={isConnected}
            isConnecting={isConnecting}
            deviceName={deviceName}
          />
        </div>

        {/* Controls */}
        <div className="mb-4">
          <ControlPanel
            isConnected={isConnected}
            isConnecting={isConnecting}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onStartLine={handleStartLine}
            onNextMeasure={handleNextMeasure}
            onExport={handleExport}
            onExportKML={handleExportKML}
            onAnalyse={() => setShowChart(!showChart)}
            hasMeasurements={measurements.length > 0}
            gpsEnabled={gpsEnabled}
            onGpsToggle={setGpsEnabled}
            hasGpsData={hasGpsData}
          />
        </div>

        {/* Live Monitoring */}
        <LiveMonitor liveValue={liveValue} isConnected={isConnected} />

        {/* Saved Measurements */}
        <MeasurementPanel measurements={measurements.map(m => m.value)} />

        {/* Resistivity Analysis Chart */}
        {showChart && <ResistivityChart measurements={measurements} aValue={aValue} />}

        {/* Footer */}
        <footer className="text-center py-4 text-muted-foreground text-xs font-mono">
          <p>v1.0.0 • {isNative ? 'Native BLE' : 'Web Bluetooth'}</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
