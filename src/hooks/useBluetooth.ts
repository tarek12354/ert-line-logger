import { useState, useCallback, useRef, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { BleClient } from '@capacitor-community/bluetooth-le';

interface BluetoothState {
  isConnected: boolean;
  isConnecting: boolean;
  deviceName: string | null;
  deviceId: string | null;
  error: string | null;
  permissionStatus: string | null;
}

// تعديل المعرفات لتطابق ESP32 الخاص بك
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

  useEffect(() => {
    if (isNative) {
      BleClient.initialize({ androidNeverForLocation: false })
        .then(() => {
          setState(prev => ({ ...prev, permissionStatus: 'initialized' }));
        })
        .catch((err) => {
          setState(prev => ({ ...prev, error: 'Erreur BLE: ' + err.message }));
        });
    }
  }, [isNative]);

  const requestPermissions = useCallback(async () => {
    if (!isNative) return true;
    try {
      await BleClient.requestLEScan({ services: [] }, () => {});
      await BleClient.stopLEScan();
      setState(prev => ({ ...prev, permissionStatus: 'granted' }));
      return true;
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Activez Bluetooth et GPS', permissionStatus: 'denied' }));
      return false;
    }
  }, [isNative]);

  const connect = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));
    try {
      if (isNative) {
        // تعديل هائل: جعل البحث يظهر كل الأجهزة لضمان ظهور ESP32_ERT
        const device = await BleClient.requestDevice({
          optionalServices: [SERVICE_UUID]
        });

        if (!device) throw new Error('Aucun appareil sélectionné');

        await BleClient.connect(device.deviceId, (deviceId) => {
          setState(prev => ({ ...prev, isConnected: false, deviceName: null }));
        });

        await BleClient.startNotifications(
          device.deviceId,
          SERVICE_UUID,
          CHARACTERISTIC_UUID,
          (value) => {
            const data = new TextDecoder().decode(value);
            if (onDataCallbackRef.current) onDataCallbackRef.current(data);
          }
        );

        setState({
          isConnected: true,
          isConnecting: false,
          deviceName: device.name || 'ESP32_ERT',
          deviceId: device.deviceId,
          error: null,
          permissionStatus: 'granted',
        });
        return true;
      }
      return false;
    } catch (error: any) {
      setState(prev => ({ ...prev, isConnecting: false, error: error.message }));
      return false;
    }
  }, [isNative]);

  const disconnect = useCallback(async () => {
    try {
      if (isNative && state.deviceId) {
        await BleClient.stopNotifications(state.deviceId, SERVICE_UUID, CHARACTERISTIC_UUID);
        await BleClient.disconnect(state.deviceId);
      }
    } catch (error) {}
    setState(prev => ({ ...prev, isConnected: false, deviceName: null, deviceId: null }));
  }, [isNative, state.deviceId]);

  const send = useCallback(async (command: string) => {
    if (!state.deviceId) return false;
    try {
      const data = new TextEncoder().encode(command + '\n');
      await BleClient.write(state.deviceId, SERVICE_UUID, CHARACTERISTIC_UUID, new DataView(data.buffer));
      return true;
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      return false;
    }
  }, [isNative, state.deviceId]);

  const setOnDataCallback = useCallback((callback: (data: string) => void) => {
    onDataCallbackRef.current = callback;
  }, []);

  // Check Web Bluetooth support for browsers
  const isSupported = isNative || (typeof navigator !== 'undefined' && 'bluetooth' in navigator);

  return { ...state, isNative, isSupported, connect, disconnect, send, setOnDataCallback, requestPermissions };
};
