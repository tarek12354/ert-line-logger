import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBluetooth } from '@/hooks/useBluetooth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { StatusIndicator } from '@/components/StatusIndicator';
import { Header } from '@/components/Header';
import { ControlPanel } from '@/components/ControlPanel';
import { MeasurementPanel } from '@/components/MeasurementPanel';
import { ResistivityChart } from '@/components/ResistivityChart';
import { LiveMonitor } from '@/components/LiveMonitor';
import { AboutModal } from '@/components/AboutModal';
import { exportToCSV, exportToKML } from '@/utils/exportUtils';
import { MeasurementData } from '@/types/measurement';
import { toast } from 'sonner';
import { AlertTriangle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

type ArrayType = 'wenner' | 'schlumberger';

const Index = () => {
  const navigate = useNavigate();
  const [measurements, setMeasurements] = useState<MeasurementData[]>([]);
  const [aValue, setAValue] = useState(5.0);
  const [lValue, setLValue] = useState(15.0); // For Schlumberger: L = AB/2
  const [showChart, setShowChart] = useState(false);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [surveyName, setSurveyName] = useState('ERT_Survey_001');
  const [arrayType, setArrayType] = useState<ArrayType>('wenner');
  
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
    batteryVoltage,
  } = useBluetooth();

  const { getCurrentPosition, error: gpsError } = useGeolocation();

  // Calculate ρa based on array type
  const calculateRhoA = (R: number): number => {
    if (arrayType === 'wenner') {
      // Wenner: ρa = 2πaR
      return 2 * Math.PI * aValue * R;
    } else {
      // Schlumberger: ρa = π * ((L² - a²) / 2a) * R
      return Math.PI * ((lValue * lValue - aValue * aValue) / (2 * aValue)) * R;
    }
  };

  // Get current ρa for live display
  const currentRhoA = liveValue !== null ? calculateRhoA(liveValue).toFixed(2) : null;

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
    
    const rhoA = calculateRhoA(valueToSave).toFixed(2);
    const gpsInfo = latitude && longitude ? ` (GPS OK)` : '';
    toast.success(`#${measurements.length + 1}: R=${valueToSave.toFixed(2)}Ω, ρa=${rhoA}Ω·m${gpsInfo}`);
    
    // Passive listener - don't send NEXT command
  };

  // Res2DInv DAT export format
  const handleExportRes2DInv = async () => {
    if (measurements.length === 0) {
      toast.error('Aucune mesure à exporter');
      return;
    }

    const arrayCode = arrayType === 'wenner' ? 3 : 7;
    
    // Build Res2DInv format
    let content = '';
    content += `${surveyName}\n`;           // Line 1: Survey name
    content += `${aValue.toFixed(2)}\n`;    // Line 2: Electrode spacing
    content += `${arrayCode}\n`;            // Line 3: Array code (3=Wenner, 7=Schlumberger)
    content += `${measurements.length}\n`;  // Line 4: Total measurements
    content += `0\n`;                        // Line 5: Type of x-location
    content += `0\n`;                        // Line 6: IP data flag

    // Lines 7+: Data rows [x-position] [spacing] [ρa]
    measurements.forEach((m, index) => {
      const R = parseFloat(m.value);
      const rhoA = calculateRhoA(R);
      const xPosition = (index + 1) * aValue; // x-position based on electrode spacing
      const spacing = aValue;
      content += `${xPosition.toFixed(2)}\t${spacing.toFixed(2)}\t${rhoA.toFixed(4)}\n`;
    });

    content += `0\n0\n0\n0`; // End markers

    const filename = `${surveyName}_${Date.now()}.dat`;

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Filesystem.writeFile({
          path: filename,
          data: content,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({
          title: 'Export Res2DInv',
          text: `${surveyName} - ${measurements.length} points`,
          url: result.uri,
          dialogTitle: 'Partager le fichier DAT',
        });
        toast.success(`DAT exporté (Res2DInv format)`);
      } catch (error) {
        console.error('Export error:', error);
        toast.error('Erreur lors de l\'export');
      }
    } else {
      // Web fallback
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`DAT exporté (Res2DInv format)`);
    }
  };

  // Full CSV export with resistivity calculations - Android compatible
  const handleExport = async () => {
    if (measurements.length === 0) {
      toast.error('Aucune mesure à exporter');
      return;
    }

    const headers = ['N', 'R (Ω)', 'ρa (Ωm)', 'Prof (m)', 'Array', 'Lat', 'Lon', 'Timestamp'];
    const rows = measurements.map((m, index) => {
      const R = parseFloat(m.value);
      const rhoA = calculateRhoA(R).toFixed(2);
      const depth = (aValue * 0.5).toFixed(2);
      const lat = m.latitude?.toFixed(6) || '';
      const lon = m.longitude?.toFixed(6) || '';
      const ts = new Date(m.timestamp).toISOString();
      return [index + 1, m.value, rhoA, depth, arrayType, lat, lon, ts].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const filename = `${surveyName}_${Date.now()}.csv`;

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
          text: `${surveyName} - ${measurements.length} points`,
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

    const gpsPoints = measurements.filter(m => m.latitude !== null && m.longitude !== null);
    let kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${surveyName}</name>
    <description>a = ${aValue}m, ${arrayType}, ${gpsPoints.length} points</description>`;

    gpsPoints.forEach((m, i) => {
      const R = parseFloat(m.value);
      const rhoA = calculateRhoA(R).toFixed(2);
      kmlContent += `
    <Placemark>
      <name>Point ${i + 1}</name>
      <description>R: ${m.value} Ω, ρa: ${rhoA} Ωm</description>
      <Point>
        <coordinates>${m.longitude},${m.latitude},0</coordinates>
      </Point>
    </Placemark>`;
    });

    kmlContent += `
  </Document>
</kml>`;

    const filename = `${surveyName}_gps_${Date.now()}.kml`;

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
          text: `${surveyName} GPS Data - ${gpsPoints.length} points`,
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
        <Header
          onOpenDiagnostic={() => navigate('/diagnostic')}
          batteryVoltage={batteryVoltage}
        />

        {/* Survey Configuration */}
        <div className="glass-card rounded-xl p-4 mb-4 border border-primary/20">
          <div className="space-y-3">
            {/* Survey Name */}
            <div>
              <Label htmlFor="surveyName" className="text-xs text-muted-foreground">Nom du Sondage</Label>
              <Input
                id="surveyName"
                value={surveyName}
                onChange={(e) => setSurveyName(e.target.value)}
                placeholder="ERT_Survey_001"
                className="h-9 text-sm"
              />
            </div>
            
            {/* Array Type Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Configuration</Label>
                <Select value={arrayType} onValueChange={(v: ArrayType) => setArrayType(v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wenner">Wenner</SelectItem>
                    <SelectItem value="schlumberger">Schlumberger</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* L Value for Schlumberger */}
              {arrayType === 'schlumberger' && (
                <div>
                  <Label htmlFor="lValue" className="text-xs text-muted-foreground">L (AB/2) en m</Label>
                  <Input
                    id="lValue"
                    type="number"
                    value={lValue}
                    onChange={(e) => setLValue(parseFloat(e.target.value) || 15)}
                    className="h-9 text-sm"
                    step="0.5"
                    min="1"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

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

        {/* Live Monitoring - displays R and ρa */}
        <LiveMonitor 
          liveValue={liveValue !== null ? liveValue.toFixed(2) : null} 
          isConnected={isConnected}
          rhoA={currentRhoA}
          arrayType={arrayType}
          batteryVoltage={batteryVoltage}
        />

        {/* Measurements Panel with auto-scroll ref */}
        <MeasurementPanel 
          measurements={measurements.map(m => m.value)} 
          scrollRef={measurementsEndRef}
        />

        {/* Export Buttons */}
        {measurements.length > 0 && (
          <div className="mt-3 mb-2 space-y-2">
            <Button 
              onClick={handleExportRes2DInv}
              className="w-full bg-primary hover:bg-primary/80 text-primary-foreground"
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter DAT (Res2DInv)
            </Button>
            <Button 
              onClick={handleExport}
              variant="outline"
              className="w-full"
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
              <span className="text-primary">Raw BLE:</span>{' '}
              {rawBluetoothData ? (() => {
                const [rRaw, vRaw] = rawBluetoothData.split(',');
                const r = Number.parseFloat((rRaw ?? '').trim());
                const v = Number.parseFloat((vRaw ?? '').trim());
                const rText = Number.isFinite(r) ? `${r.toFixed(2)}Ω` : (rRaw ?? '').trim();
                const vText = Number.isFinite(v) ? `${v.toFixed(1)}V` : (vRaw ?? '').trim();
                return `R=${rText}${vRaw !== undefined ? `, V=${vText}` : ''}`;
              })() : 'Receiving...'}
            </p>
          </div>
        )}

        <footer className="text-center py-4 text-muted-foreground text-xs font-mono">
          <p className="font-semibold text-foreground mb-1">Par Tarek Attia</p>
          <p>v1.3.0 • {isNative ? 'Native Mode' : 'Web Mode'} • {isConnected ? 'Capteur Connecté' : 'Non connecté'}</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
