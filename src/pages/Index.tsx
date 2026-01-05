import { useState, useEffect, useRef } from 'react';
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
import { Zap, AlertTriangle, Settings, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
const Index = () => {
  const navigate = useNavigate();
  const [measurements, setMeasurements] = useState<MeasurementData[]>([]);
  const [aValue, setAValue] = useState(5.0);
  const [showChart, setShowChart] = useState(false);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  
  const measurementsEndRef = useRef<HTMLDivElement>(null);

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
    rawBluetoothData,
    liveValue,
  } = useBluetooth();

  const { getCurrentPosition, error: gpsError } = useGeolocation();


  // Auto-scroll to latest measurement
  useEffect(() => {
    measurementsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [measurements]);

  // Error alerts
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    if (gpsError) toast.error(gpsError);
  }, [gpsError]);

  const handleConnect = async () => {
    const success = await connect();
    if (success) toast.success('Connecté à ESP32_ERT');
  };

  const handleDisconnect = async () => {
    await disconnect();
    toast.info('Déconnecté');
  };

  const handleStartLine = async (a: number) => {
    setMeasurements([]);
    setAValue(a);
    await send(`A=${a}`);
    await send('RESET');
    toast.success(`Nouvelle ligne démarrée (a = ${a}m)`);
  };

  // Suivante button: Capture current sensor value instantly - no blocking
  const handleNextMeasure = async () => {
    // Get current value - use liveValue if available, otherwise show warning
    const valueToSave = liveValue;
    
    if (valueToSave === null || Number.isNaN(valueToSave)) {
      toast.warning('En attente de données BLE...');
      return;
    }

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
      value: valueToSave.toFixed(2),
      latitude,
      longitude,
      timestamp: Date.now(),
    };

    setMeasurements(prev => [...prev, newMeasurement]);
    
    const gpsInfo = latitude && longitude ? ` (GPS OK)` : '';
    toast.success(`Mesure #${measurements.length + 1}: ${valueToSave.toFixed(2)} Ω${gpsInfo}`);
    
    // Send NEXT command to ESP32 if connected
    if (isConnected) {
      await send('NEXT');
    }
  };

  // Export measurements list as simple CSV - Android compatible
  const handleExportSimpleCSV = async () => {
    if (measurements.length === 0) {
      toast.error('Aucune mesure à exporter');
      return;
    }

    const headers = ['ID', 'Value (Ω)', 'Timestamp'];
    const rows = measurements.map((m, index) => {
      const date = new Date(m.timestamp);
      const timestamp = date.toISOString();
      return [index + 1, m.value, timestamp].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const filename = `mesures_${Date.now()}.csv`;

    // Check if running on native platform (Android/iOS)
    if (Capacitor.isNativePlatform()) {
      try {
        // Write to Cache directory (no permissions needed on Android 11+)
        const result = await Filesystem.writeFile({
          path: filename,
          data: csvContent,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        // Share the file immediately
        await Share.share({
          title: 'Export CSV',
          text: `ERT Mesures - ${measurements.length} points`,
          url: result.uri,
          dialogTitle: 'Partager le fichier CSV',
        });

        toast.success(`CSV exporté (${measurements.length} mesures)`);
      } catch (error) {
        console.error('Export error:', error);
        toast.error('Erreur lors de l\'export');
      }
    } else {
      // Web fallback - use blob download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`CSV exporté (${measurements.length} mesures)`);
    }
  };

  // Full CSV export with resistivity calculations - Android compatible
  const handleExport = async () => {
    if (measurements.length === 0) {
      toast.error('Aucune mesure à exporter');
      return;
    }

    const headers = ['N', 'R (Ω)', 'ρ (Ωm)', 'Prof (m)', 'Lat', 'Lon', 'Timestamp'];
    const rows = measurements.map((m, index) => {
      const R = parseFloat(m.value);
      const rho = (2 * Math.PI * aValue * R).toFixed(2);
      const depth = (aValue * 0.5).toFixed(2);
      const lat = m.latitude?.toFixed(6) || '';
      const lon = m.longitude?.toFixed(6) || '';
      const ts = new Date(m.timestamp).toISOString();
      return [index + 1, m.value, rho, depth, lat, lon, ts].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const filename = `ert_data_${Date.now()}.csv`;

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Filesystem.writeFile({
          path: filename,
          data: csvContent,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({
          title: 'Export ERT CSV',
          text: `ERT Data - ${measurements.length} points`,
          url: result.uri,
          dialogTitle: 'Partager le fichier CSV',
        });
        toast.success(`CSV exporté (${measurements.length} mesures)`);
      } catch (error) {
        console.error('Export error:', error);
        toast.error('Erreur lors de l\'export');
      }
    } else {
      exportToCSV(measurements, aValue);
      toast.success(`Fichier CSV exporté (${measurements.length} mesures)`);
    }
  };

  // KML export - Android compatible with Share sheet
  const handleExportKML = async () => {
    const hasGps = measurements.some(m => m.latitude !== null && m.longitude !== null);
    if (!hasGps) {
      toast.error('Aucune donnée GPS disponible');
      return;
    }

    // Generate KML content
    const gpsPoints = measurements.filter(m => m.latitude !== null && m.longitude !== null);
    let kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>ERT Measurements</name>
    <description>a = ${aValue}m, ${gpsPoints.length} points</description>`;

    gpsPoints.forEach((m, i) => {
      const R = parseFloat(m.value);
      const rho = (2 * Math.PI * aValue * R).toFixed(2);
      kmlContent += `
    <Placemark>
      <name>Point ${i + 1}</name>
      <description>R: ${m.value} Ω, ρ: ${rho} Ωm</description>
      <Point>
        <coordinates>${m.longitude},${m.latitude},0</coordinates>
      </Point>
    </Placemark>`;
    });

    kmlContent += `
  </Document>
</kml>`;

    const filename = `ert_gps_${Date.now()}.kml`;

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Filesystem.writeFile({
          path: filename,
          data: kmlContent,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({
          title: 'Export KML',
          text: `ERT GPS Data - ${gpsPoints.length} points`,
          url: result.uri,
          dialogTitle: 'Partager le fichier KML',
        });
        toast.success('Fichier KML exporté');
      } catch (error) {
        console.error('KML export error:', error);
        toast.error('Erreur lors de l\'export KML');
      }
    } else {
      exportToKML(measurements, aValue);
      toast.success('Fichier KML exporté');
    }
  };

  const hasGpsData = measurements.some(m => m.latitude !== null && m.longitude !== null);

  return (
    <div className="min-h-screen bg-background bg-grid">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative min-h-screen flex flex-col p-4 max-w-lg mx-auto">
        <header className="text-center py-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/30">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-gradient-primary">ERT App</h1>
            <Button variant="ghost" size="icon" onClick={() => navigate('/diagnostic')} className="ml-2">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-muted-foreground text-sm font-mono">Tomographie de Résistivité Électrique</p>
        </header>

        {!isSupported && (
          <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-destructive font-semibold text-sm">Web Bluetooth non supporté</p>
          </div>
        )}

        <div className="mb-4">
          <StatusIndicator isConnected={isConnected} isConnecting={isConnecting} deviceName={deviceName} />
        </div>

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

        {/* Live Monitoring - updates every 500ms */}
        <LiveMonitor 
          liveValue={liveValue !== null ? liveValue.toFixed(2) : null} 
          isConnected={isConnected} 
        />

        {/* Measurements Panel with auto-scroll ref */}
        <MeasurementPanel 
          measurements={measurements.map(m => m.value)} 
          scrollRef={measurementsEndRef}
        />

        {/* Export CSV Button */}
        {measurements.length > 0 && (
          <div className="mt-3 mb-2">
            <Button 
              onClick={handleExportSimpleCSV}
              className="w-full bg-accent hover:bg-accent/80 text-accent-foreground"
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter CSV ({measurements.length} mesures)
            </Button>
          </div>
        )}

        {showChart && <ResistivityChart measurements={measurements} aValue={aValue} />}

        {isConnected && (
          <div className="glass-card rounded-lg p-2 mb-2 border border-muted/30">
            <p className="text-xs text-muted-foreground font-mono">
              <span className="text-primary">Raw BLE:</span> {rawBluetoothData || 'Receiving...'}
            </p>
          </div>
        )}

        <footer className="text-center py-4 text-muted-foreground text-xs font-mono">
          <p>v1.2.0 • {isNative ? 'Native Mode' : 'Web Mode'} • {isConnected ? 'Capteur Connecté' : 'Non connecté'}</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
