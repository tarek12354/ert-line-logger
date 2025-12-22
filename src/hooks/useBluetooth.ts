import { useState, useCallback, useRef, useEffect } from 'react';

interface BluetoothState {
  isConnected: boolean;
  isConnecting: boolean;
  deviceName: string | null;
  error: string | null;
}

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

// Dynamic import for Capacitor modules
const getCapacitorModules = async () => {
  try {
    const [{ Capacitor }, { BleClient }] = await Promise.all([
      import('@capacitor/core'),
      import('@capacitor-community/bluetooth-le'),
    ]);
    return { Capacitor, BleClient, isAvailable: true };
  } catch {
    return { Capacitor: null, BleClient: null, isAvailable: false };
  }
};

export const useBluetooth = () => {
  const [state, setState] = useState<BluetoothState>({
    isConnected: false,
    isConnecting: false,
    deviceName: null,
    error: null,
  });

  const [isNative, setIsNative] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bleClientRef = useRef<any>(null);
  const deviceIdRef = useRef<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webDeviceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webCharacteristicRef = useRef<any>(null);
  const onDataCallbackRef = useRef<((data: string) => void) | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
  const isWebBluetoothSupported = nav && 'bluetooth' in nav;
  const isSupported = isNative || isWebBluetoothSupported;

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      const { Capacitor, BleClient, isAvailable } = await getCapacitorModules();
      if (isAvailable && Capacitor?.isNativePlatform()) {
        setIsNative(true);
        bleClientRef.current = BleClient;
        try {
          await BleClient?.initialize({ androidNeverForLocation: true });
        } catch (e) {
          console.error('BLE init error:', e);
        }
      }
    };
    init();
  }, []);

  const connectNative = useCallback(async () => {
    const BleClient = bleClientRef.current;
    if (!BleClient) return false;

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Request device via modal
      const device = await BleClient.requestDevice({
        services: [SERVICE_UUID],
        namePrefix: 'ESP32',
      });

      deviceIdRef.current = device.deviceId;

      // Connect to device
      await BleClient.connect(device.deviceId, () => {
        setState({
          isConnected: false,
          isConnecting: false,
          deviceName: null,
          error: null,
        });
        deviceIdRef.current = null;
      });

      // Start notifications
      await BleClient.startNotifications(
        device.deviceId,
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        (value: DataView) => {
          const decoder = new TextDecoder();
          const data = decoder.decode(value);
          if (onDataCallbackRef.current) {
            onDataCallbackRef.current(data);
          }
        }
      );

      setState({
        isConnected: true,
        isConnecting: false,
        deviceName: device.name || 'ESP32_ERT',
        error: null,
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de connexion';
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: errorMessage,
      }));
      return false;
    }
  }, []);

  const connectWeb = useCallback(async () => {
    if (!isWebBluetoothSupported) {
      setState(prev => ({ ...prev, error: 'Web Bluetooth non supporté' }));
      return false;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const device = await nav.bluetooth.requestDevice({
        filters: [{ name: 'ESP32_ERT' }],
        optionalServices: [SERVICE_UUID],
      });

      webDeviceRef.current = device;

      device.addEventListener('gattserverdisconnected', () => {
        setState({
          isConnected: false,
          isConnecting: false,
          deviceName: null,
          error: null,
        });
        webCharacteristicRef.current = null;
      });

      const server = await device.gatt?.connect();
      if (!server) throw new Error('Impossible de se connecter au serveur GATT');

      const service = await server.getPrimaryService(SERVICE_UUID);
      const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
      webCharacteristicRef.current = characteristic;

      await characteristic.startNotifications();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target?.value;
        if (value && onDataCallbackRef.current) {
          const decoder = new TextDecoder();
          const data = decoder.decode(value);
          onDataCallbackRef.current(data);
        }
      });

      setState({
        isConnected: true,
        isConnecting: false,
        deviceName: device.name || 'ESP32_ERT',
        error: null,
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de connexion';
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: errorMessage,
      }));
      return false;
    }
  }, [isWebBluetoothSupported, nav]);

  const connect = useCallback(async () => {
    if (isNative) {
      return connectNative();
    }
    return connectWeb();
  }, [isNative, connectNative, connectWeb]);

  const disconnect = useCallback(async () => {
    if (isNative && deviceIdRef.current && bleClientRef.current) {
      try {
        await bleClientRef.current.stopNotifications(deviceIdRef.current, SERVICE_UUID, CHARACTERISTIC_UUID);
        await bleClientRef.current.disconnect(deviceIdRef.current);
      } catch (e) {
        console.error('Disconnect error:', e);
      }
    } else if (webDeviceRef.current?.gatt?.connected) {
      webDeviceRef.current.gatt.disconnect();
    }

    deviceIdRef.current = null;
    webDeviceRef.current = null;
    webCharacteristicRef.current = null;

    setState({
      isConnected: false,
      isConnecting: false,
      deviceName: null,
      error: null,
    });
  }, [isNative]);

  const send = useCallback(async (command: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(command + '\n');

    try {
      if (isNative && deviceIdRef.current && bleClientRef.current) {
        await bleClientRef.current.write(
          deviceIdRef.current,
          SERVICE_UUID,
          CHARACTERISTIC_UUID,
          new DataView(data.buffer)
        );
      } else if (webCharacteristicRef.current) {
        await webCharacteristicRef.current.writeValue(data);
      } else {
        setState(prev => ({ ...prev, error: 'Non connecté' }));
        return false;
      }
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur d\'envoi';
      setState(prev => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [isNative]);

  const setOnDataCallback = useCallback((callback: (data: string) => void) => {
    onDataCallbackRef.current = callback;
  }, []);

  return {
    ...state,
    isSupported,
    isNative,
    connect,
    disconnect,
    send,
    setOnDataCallback,
  };
};
