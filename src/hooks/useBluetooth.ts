import { useState, useCallback, useRef, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { BleClient, numberToUUID } from '@capacitor-community/bluetooth-le';

interface BluetoothState {
  isConnected: boolean;
  isConnecting: boolean;
  deviceName: string | null;
  deviceId: string | null;
  error: string | null;
  permissionStatus: string | null;
}

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

export const useBluetooth = () => {
  const [state, setState] = useState<BluetoothState>({
    isConnected: false,
    isConnecting: false,
    deviceName: null,
    deviceId: null,
    error: null,
    permissionStatus: null,
  });

  const onDataCallbackRef = useRef<((data: string) => void) | null>(null);
  const isNative = Capacitor.isNativePlatform();

  // Initialize BLE on native platform
  useEffect(() => {
    if (isNative) {
      BleClient.initialize({ androidNeverForLocation: false })
        .then(() => {
          console.log('BLE Client initialized');
          setState(prev => ({ ...prev, permissionStatus: 'initialized' }));
        })
        .catch((err) => {
          console.error('BLE init error:', err);
          setState(prev => ({ ...prev, error: 'Erreur initialisation BLE: ' + err.message }));
        });
    }
  }, [isNative]);

  const requestPermissions = useCallback(async () => {
    if (!isNative) return true;
    
    try {
      // Request Bluetooth permissions (Android 12+)
      await BleClient.requestLEScan({ services: [] }, () => {});
      await BleClient.stopLEScan();
      setState(prev => ({ ...prev, permissionStatus: 'granted' }));
      return true;
    } catch (error) {
      console.error('Permission error:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Permissions Bluetooth refusées. Activez Bluetooth et Localisation.',
        permissionStatus: 'denied'
      }));
      return false;
    }
  }, [isNative]);

  const connect = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      if (isNative) {
        // Native Capacitor BLE
        console.log('Starting native BLE scan...');
        
        // Request device - this shows native picker
        const device = await BleClient.requestDevice({
          services: [SERVICE_UUID],
          optionalServices: [],
        });

        console.log('Device selected:', device);

        if (!device) {
          throw new Error('Aucun appareil sélectionné');
        }

        // Connect to device
        await BleClient.connect(device.deviceId, (deviceId) => {
          console.log('Device disconnected:', deviceId);
          setState({
            isConnected: false,
            isConnecting: false,
            deviceName: null,
            deviceId: null,
            error: null,
            permissionStatus: state.permissionStatus,
          });
        });

        console.log('Connected to device');

        // Start notifications
        await BleClient.startNotifications(
          device.deviceId,
          SERVICE_UUID,
          CHARACTERISTIC_UUID,
          (value) => {
            const decoder = new TextDecoder();
            const data = decoder.decode(value);
            console.log('Received data:', data);
            if (onDataCallbackRef.current) {
              onDataCallbackRef.current(data);
            }
          }
        );

        console.log('Notifications started');

        setState({
          isConnected: true,
          isConnecting: false,
          deviceName: device.name || 'ESP32_ERT',
          deviceId: device.deviceId,
          error: null,
          permissionStatus: 'granted',
        });

        return true;
      } else {
        // Web Bluetooth (for browser testing)
        const nav = navigator as any;
        if (!nav.bluetooth) {
          throw new Error('Web Bluetooth non supporté');
        }

        const device = await nav.bluetooth.requestDevice({
          filters: [{ services: [SERVICE_UUID] }],
          optionalServices: [SERVICE_UUID],
        });

        device.addEventListener('gattserverdisconnected', () => {
          setState(prev => ({
            ...prev,
            isConnected: false,
            deviceName: null,
            deviceId: null,
          }));
        });

        const server = await device.gatt?.connect();
        if (!server) throw new Error('Impossible de se connecter au serveur GATT');

        const service = await server.getPrimaryService(SERVICE_UUID);
        const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

        await characteristic.startNotifications();
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
          deviceId: device.id,
          error: null,
          permissionStatus: 'granted',
        });

        return true;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de connexion';
      console.error('Connection error:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: errorMessage,
      }));
      return false;
    }
  }, [isNative, state.permissionStatus]);

  const disconnect = useCallback(async () => {
    try {
      if (isNative && state.deviceId) {
        await BleClient.stopNotifications(state.deviceId, SERVICE_UUID, CHARACTERISTIC_UUID);
        await BleClient.disconnect(state.deviceId);
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }
    
    setState(prev => ({
      ...prev,
      isConnected: false,
      deviceName: null,
      deviceId: null,
      error: null,
    }));
  }, [isNative, state.deviceId]);

  const send = useCallback(async (command: string) => {
    if (!state.deviceId) {
      setState(prev => ({ ...prev, error: 'Non connecté' }));
      return false;
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(command + '\n');

      if (isNative) {
        await BleClient.write(
          state.deviceId,
          SERVICE_UUID,
          CHARACTERISTIC_UUID,
          new DataView(data.buffer)
        );
      }
      
      console.log('Sent command:', command);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur d'envoi";
      console.error('Send error:', error);
      setState(prev => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [isNative, state.deviceId]);

  const setOnDataCallback = useCallback((callback: (data: string) => void) => {
    onDataCallbackRef.current = callback;
  }, []);

  return {
    ...state,
    isNative,
    isSupported: isNative || (typeof navigator !== 'undefined' && 'bluetooth' in navigator),
    connect,
    disconnect,
    send,
    setOnDataCallback,
    requestPermissions,
  };
};
