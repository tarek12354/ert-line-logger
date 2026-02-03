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

interface SensorData {
  currentMA: number;       // Current in mA
  voltageV: number;        // Voltage from AD620 (before gain compensation)
  realVoltage: number;     // Real Earth Voltage (after /10 gain compensation)
  batteryV: number;        // Battery voltage
  resistance: number;      // Calculated R = realVoltage / (current/1000)
}

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

const AD620_GAIN = 10; // Hardware gain of AD620 amplifier
const MOVING_AVERAGE_SIZE = 5;

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
  const [rawBluetoothData, setRawBluetoothData] = useState<string>('');
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [liveValue, setLiveValue] = useState<number | null>(null); // Resistance R
  const [batteryVoltage, setBatteryVoltage] = useState<number | null>(null);
  
  // Moving average buffer
  const resistanceBufferRef = useRef<number[]>([]);
  const [averagedResistance, setAveragedResistance] = useState<number | null>(null);
  
  // Zero calibration offset
  const [zeroOffset, setZeroOffset] = useState<number>(0);
  const [isZeroCalibrated, setIsZeroCalibrated] = useState<boolean>(false);
  
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (isNative) {
      BleClient.initialize({ androidNeverForLocation: false })
        .then(() => setState(prev => ({ ...prev, permissionStatus: 'initialized' })))
        .catch((err) => setState(prev => ({ ...prev, error: 'Erreur BLE: ' + err.message })));
    }
  }, [isNative]);

  // Calculate moving average
  const updateMovingAverage = useCallback((newValue: number) => {
    const buffer = resistanceBufferRef.current;
    buffer.push(newValue);
    
    // Keep only last N readings
    if (buffer.length > MOVING_AVERAGE_SIZE) {
      buffer.shift();
    }
    
    // Calculate average
    const sum = buffer.reduce((acc, val) => acc + val, 0);
    const avg = sum / buffer.length;
    setAveragedResistance(avg);
  }, []);

  // Zero calibration function
  const calibrateZero = useCallback(() => {
    if (sensorData) {
      setZeroOffset(sensorData.realVoltage);
      setIsZeroCalibrated(true);
      // Clear buffer on calibration
      resistanceBufferRef.current = [];
      setAveragedResistance(null);
    }
  }, [sensorData]);

  // Reset zero calibration
  const resetZeroCalibration = useCallback(() => {
    setZeroOffset(0);
    setIsZeroCalibrated(false);
    resistanceBufferRef.current = [];
    setAveragedResistance(null);
  }, []);

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
            const rawString = new TextDecoder().decode(value).trim();
            setRawBluetoothData(rawString);

            // Parse format: "Current(mA),Voltage(V),Battery(V)" (e.g., "150.5,0.85,18.2")
            const parts = rawString.split(',');
            
            if (parts.length >= 3) {
              const currentMA = parseFloat(parts[0]);
              const voltageV = parseFloat(parts[1]);
              const batteryV = parseFloat(parts[2]);
              
              if (!Number.isNaN(currentMA) && !Number.isNaN(voltageV) && !Number.isNaN(batteryV)) {
                // Apply AD620 gain compensation: Real Voltage = Measured Voltage / Gain
                const realVoltage = voltageV / AD620_GAIN;
                
                // Apply zero offset calibration
                const calibratedVoltage = realVoltage - zeroOffset;
                
                // Calculate Resistance: R = V / I (convert mA to A)
                const currentA = currentMA / 1000;
                const resistance = currentA > 0.0001 ? calibratedVoltage / currentA : 0;
                
                const data: SensorData = {
                  currentMA,
                  voltageV,
                  realVoltage: calibratedVoltage,
                  batteryV,
                  resistance: Math.abs(resistance), // Ensure positive
                };
                
                setSensorData(data);
                setLiveValue(data.resistance);
                setBatteryVoltage(batteryV);
                
                // Update moving average
                updateMovingAverage(data.resistance);
                
                if (onDataCallbackRef.current) {
                  onDataCallbackRef.current(rawString);
                }
              }
            } else if (parts.length === 2) {
              // Fallback: Legacy format "Resistance,Voltage"
              const resistance = parseFloat(parts[0]);
              const voltage = parseFloat(parts[1]);
              
              if (!Number.isNaN(resistance)) {
                setLiveValue(resistance);
                updateMovingAverage(resistance);
                
                if (!Number.isNaN(voltage)) {
                  setBatteryVoltage(voltage);
                }
                
                if (onDataCallbackRef.current) {
                  onDataCallbackRef.current(rawString);
                }
              }
            }
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
  }, [isNative, zeroOffset, updateMovingAverage]);

  const disconnect = useCallback(async () => {
    try {
      if (isNative && state.deviceId) {
        await BleClient.stopNotifications(state.deviceId, SERVICE_UUID, CHARACTERISTIC_UUID);
        await BleClient.disconnect(state.deviceId);
      }
    } catch (error) {}
    setState(prev => ({ ...prev, isConnected: false, deviceName: null, deviceId: null }));
    // Clear buffer on disconnect
    resistanceBufferRef.current = [];
    setAveragedResistance(null);
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

  const isSupported = isNative || (typeof navigator !== 'undefined' && 'bluetooth' in navigator);

  return {
    ...state,
    isNative,
    isSupported,
    connect,
    disconnect,
    send,
    setOnDataCallback,
    requestPermissions,
    rawBluetoothData,
    liveValue,
    averagedResistance,
    batteryVoltage,
    sensorData,
    // Zero calibration
    calibrateZero,
    resetZeroCalibration,
    isZeroCalibrated,
    zeroOffset,
  };
};
