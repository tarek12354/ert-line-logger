import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  Bluetooth,
  BluetoothSearching,
  CheckCircle,
  XCircle,
  AlertCircle,
  Wifi,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LogEntry {
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

interface DeviceInfo {
  deviceId: string;
  name: string | undefined;
  rssi: number | undefined;
}

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';

export default function BluetoothDiagnostic() {
  const navigate = useNavigate();
  const [isNative, setIsNative] = useState(false);
  const [bleInitialized, setBleInitialized] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [permissions, setPermissions] = useState({
    bluetooth: 'unknown',
    location: 'unknown',
  });

  // Web Bluetooth needs the actual device object for GATT connect
  const webDevicesRef = useRef<Record<string, any>>({});

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogs((prev) => [...prev, { timestamp: new Date(), type, message }]);
  }, []);

  // Check platform
  useEffect(() => {
    const native = Capacitor.isNativePlatform();
    setIsNative(native);
    addLog('info', `Plateforme: ${native ? 'Native (Capacitor)' : 'Web Browser'}`);
    addLog('info', `Platform: ${Capacitor.getPlatform()}`);
  }, [addLog]);

  // Initialize BLE
  useEffect(() => {
    if (!isNative) {
      addLog('warning', 'Web Bluetooth: disponibilité limitée');
      addLog('info', 'Requis: Chrome/Edge + HTTPS (ou localhost), et clic utilisateur');

      if (typeof window !== 'undefined' && !window.isSecureContext) {
        addLog('error', 'Contexte non sécurisé: Web Bluetooth nécessite HTTPS (ou localhost)');
      }

      if (navigator && 'bluetooth' in navigator) {
        addLog('success', 'Web Bluetooth API disponible');
        setPermissions((prev) => ({ ...prev, bluetooth: 'available' }));
      } else {
        addLog('error', 'Web Bluetooth API non disponible');
        setPermissions((prev) => ({ ...prev, bluetooth: 'unavailable' }));
      }
      return;
    }

    const initBle = async () => {
      try {
        addLog('info', 'Initialisation BLE Client...');
        await BleClient.initialize({ androidNeverForLocation: false });
        setBleInitialized(true);
        addLog('success', 'BLE Client initialisé avec succès');
        setPermissions((prev) => ({ ...prev, bluetooth: 'granted' }));
      } catch (error) {
        addLog(
          'error',
          `Erreur init BLE: ${error instanceof Error ? error.message : String(error)}`,
        );
        setPermissions((prev) => ({ ...prev, bluetooth: 'error' }));
      }
    };

    initBle();
  }, [isNative, addLog]);

  const checkPermissions = async () => {
    addLog('info', 'Vérification des permissions...');

    if (!isNative) {
      addLog('warning', 'Vérification permissions non disponible sur Web');
      return;
    }

    try {
      await BleClient.requestLEScan({ services: [] }, () => {});
      await BleClient.stopLEScan();
      setPermissions({ bluetooth: 'granted', location: 'granted' });
      addLog('success', 'Permissions Bluetooth et Localisation accordées');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      addLog('error', `Permissions refusées: ${msg}`);
      setPermissions({ bluetooth: 'denied', location: 'denied' });
    }
  };

  const startScan = async () => {
    if (isScanning) return;

    setDevices([]);
    setIsScanning(true);
    addLog('info', 'Démarrage du scan BLE...');
    addLog('info', `Service UUID cible: ${SERVICE_UUID}`);

    try {
      if (isNative) {
        await BleClient.requestLEScan(
          {
            services: [SERVICE_UUID],
            allowDuplicates: false,
          },
          (result: ScanResult) => {
            addLog(
              'success',
              `Appareil trouvé: ${result.device.name || 'Sans nom'} (${result.device.deviceId})`,
            );
            setDevices((prev) => {
              const exists = prev.some((d) => d.deviceId === result.device.deviceId);
              if (exists) return prev;
              return [
                ...prev,
                {
                  deviceId: result.device.deviceId,
                  name: result.device.name,
                  rssi: result.rssi,
                },
              ];
            });
          },
        );

        // Stop after 10 seconds
        setTimeout(async () => {
          try {
            await BleClient.stopLEScan();
            setIsScanning(false);
            addLog('info', 'Scan terminé');
          } catch (e) {
            console.error('Stop scan error:', e);
          }
        }, 10000);
      } else {
        // Web Bluetooth: pas de vrai "scan". On ouvre le sélecteur.
        addLog('info', 'Ouverture du sélecteur Web Bluetooth...');

        const nav = navigator as any;
        if (!nav.bluetooth) {
          addLog('error', 'Web Bluetooth non supporté par ce navigateur');
          setIsScanning(false);
          return;
        }

        try {
          // NOTE: filter services exige que l'ESP32 annonce ce service dans l'advertising.
          // Ici on laisse choisir un appareil puis on vérifie le service ensuite.
          const device = await nav.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [SERVICE_UUID],
          });

          addLog('success', `Appareil sélectionné: ${device.name || device.id}`);
          webDevicesRef.current[device.id] = device;
          setDevices([{ deviceId: device.id, name: device.name, rssi: undefined }]);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          addLog('warning', `Sélection annulée / aucun appareil: ${msg}`);
        } finally {
          setIsScanning(false);
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      addLog('error', `Erreur scan: ${msg}`);
      setIsScanning(false);
    }
  };

  const stopScan = async () => {
    if (!isScanning) return;

    try {
      if (isNative) {
        await BleClient.stopLEScan();
      }
      setIsScanning(false);
      addLog('info', 'Scan arrêté manuellement');
    } catch (error) {
      addLog('error', `Erreur arrêt scan: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const testConnection = async (deviceId: string, name?: string) => {
    addLog('info', `Tentative de connexion à ${name || deviceId}...`);

    try {
      if (isNative) {
        await BleClient.connect(deviceId, (disconnectedId) => {
          addLog('warning', `Déconnecté de ${disconnectedId}`);
        });
        addLog('success', `Connecté à ${name || deviceId}`);

        addLog('info', 'Découverte des services...');
        const services = await BleClient.getServices(deviceId);
        addLog('success', `${services.length} service(s) trouvé(s)`);

        services.forEach((service) => {
          addLog('info', `Service: ${service.uuid}`);
          service.characteristics?.forEach((char) => {
            addLog('info', `  └ Caractéristique: ${char.uuid}`);
          });
        });

        await BleClient.disconnect(deviceId);
        addLog('info', 'Déconnexion réussie');
      } else {
        const device = webDevicesRef.current[deviceId];
        if (!device) {
          addLog('error', 'Appareil Web introuvable (relancez le sélecteur)');
          return;
        }

        addLog('info', 'Connexion GATT (Web)...');
        const server = await device.gatt?.connect();
        if (!server) throw new Error('Impossible de se connecter au serveur GATT');

        addLog('success', 'Connecté (Web)');
        addLog('info', `Test service UUID: ${SERVICE_UUID}`);

        try {
          const service = await server.getPrimaryService(SERVICE_UUID);
          addLog('success', `Service trouvé: ${service.uuid}`);
          const characteristics = await service.getCharacteristics();
          addLog('success', `${characteristics.length} caractéristique(s) trouvée(s)`);
          characteristics.forEach((c: any) => addLog('info', `  └ ${c.uuid}`));
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          addLog(
            'error',
            `Service non accessible en Web (souvent: non annoncé / optionalServices manquant). (${msg})`,
          );
        }

        device.gatt?.disconnect();
        addLog('info', 'Déconnexion (Web)');
      }
    } catch (error) {
      addLog('error', `Erreur connexion: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'granted':
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'denied':
      case 'unavailable':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <header className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Retour">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold flex items-center gap-2">Diagnostic Bluetooth</h1>
        </header>

        <main className="space-y-4">
          <section aria-label="Plateforme">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Plateforme</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Badge variant={isNative ? 'default' : 'secondary'}>
                    {isNative ? 'Native (Capacitor)' : 'Web Browser'}
                  </Badge>
                  <Badge variant={bleInitialized ? 'default' : 'outline'}>BLE: {bleInitialized ? 'Prêt' : '—'}</Badge>
                </div>
              </CardContent>
            </Card>
          </section>

          <section aria-label="Permissions">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  Permissions
                  <Button size="sm" variant="outline" onClick={checkPermissions}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Vérifier
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Bluetooth className="h-4 w-4" />
                      Bluetooth
                    </span>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(permissions.bluetooth)}
                      {permissions.bluetooth}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Wifi className="h-4 w-4" />
                      Localisation
                    </span>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(permissions.location)}
                      {permissions.location}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section aria-label="Appareils">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  Scanner les appareils
                  <div className="flex gap-2">
                    {isScanning ? (
                      <Button size="sm" variant="destructive" onClick={stopScan}>
                        Arrêter
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={startScan}
                        disabled={!isNative && !(navigator as any)?.bluetooth}
                      >
                        <BluetoothSearching className="h-3 w-3 mr-1" />
                        Scanner
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-2">UUID cible: {SERVICE_UUID}</p>

                {devices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun appareil détecté</p>
                ) : (
                  <div className="space-y-2">
                    {devices.map((device) => (
                      <div
                        key={device.deviceId}
                        className="flex items-center justify-between p-2 bg-muted rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-sm">{device.name || 'Sans nom'}</p>
                          <p className="text-xs text-muted-foreground font-mono">{device.deviceId}</p>
                          {device.rssi !== undefined && (
                            <p className="text-xs text-muted-foreground">Signal: {device.rssi} dBm</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testConnection(device.deviceId, device.name)}
                        >
                          Tester
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section aria-label="Logs">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  Logs ({logs.length})
                  <Button size="sm" variant="ghost" onClick={() => setLogs([])}>
                    Effacer
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 rounded border bg-black/50 p-2">
                  <div className="space-y-1 font-mono text-xs">
                    {logs.map((log, i) => (
                      <div key={i} className={getLogColor(log.type)}>
                        <span className="text-muted-foreground">[{log.timestamp.toLocaleTimeString()}]</span>{' '}
                        {log.message}
                      </div>
                    ))}
                    {logs.length === 0 && <p className="text-muted-foreground">Aucun log</p>}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}
