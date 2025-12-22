import { useState, useCallback, useRef } from 'react';

interface BluetoothState {
  isConnected: boolean;
  isConnecting: boolean;
  deviceName: string | null;
  error: string | null;
}

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

export const useBluetooth = () => {
  const [state, setState] = useState<BluetoothState>({
    isConnected: false,
    isConnecting: false,
    deviceName: null,
    error: null,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deviceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const characteristicRef = useRef<any>(null);
  const onDataCallbackRef = useRef<((data: string) => void) | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
  const isSupported = Boolean(nav && 'bluetooth' in nav);

  const connect = useCallback(async () => {
    if (!isSupported || !nav) {
      setState(prev => ({ ...prev, error: 'Web Bluetooth non supporté sur ce navigateur' }));
      return false;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const device = await nav.bluetooth.requestDevice({
        filters: [{ name: 'ESP32_ERT' }],
        optionalServices: [SERVICE_UUID],
      });

      deviceRef.current = device;

      device.addEventListener('gattserverdisconnected', () => {
        setState({
          isConnected: false,
          isConnecting: false,
          deviceName: null,
          error: null,
        });
        characteristicRef.current = null;
      });

      const server = await device.gatt?.connect();
      if (!server) throw new Error('Impossible de se connecter au serveur GATT');

      const service = await server.getPrimaryService(SERVICE_UUID);
      const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
      
      characteristicRef.current = characteristic;

      // Setup notifications for receiving data
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
  }, [isSupported, nav]);

  const disconnect = useCallback(async () => {
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    deviceRef.current = null;
    characteristicRef.current = null;
    setState({
      isConnected: false,
      isConnecting: false,
      deviceName: null,
      error: null,
    });
  }, []);

  const send = useCallback(async (command: string) => {
    if (!characteristicRef.current) {
      setState(prev => ({ ...prev, error: 'Non connecté' }));
      return false;
    }

    try {
      const encoder = new TextEncoder();
      await characteristicRef.current.writeValue(encoder.encode(command + '\n'));
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur d\'envoi';
      setState(prev => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, []);

  const setOnDataCallback = useCallback((callback: (data: string) => void) => {
    onDataCallbackRef.current = callback;
  }, []);

  return {
    ...state,
    isSupported,
    isNative: false,
    connect,
    disconnect,
    send,
    setOnDataCallback,
  };
};
