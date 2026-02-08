export interface MeasurementData {
  value: string;
  aValue: number; // Electrode spacing used for this measurement
  xLocation: number; // X = 1.5 × a for VES with fixed C1
  rhoA: number; // Calculated apparent resistivity
  latitude: number | null;
  longitude: number | null;
  timestamp: number;
}

export interface DataPoint {
  index: number;
  resistance: number;
  resistivity: number;
  depth: number;
  classification: 'void' | 'water' | 'normal';
  label: string;
  latitude: number | null;
  longitude: number | null;
}

export const RESISTIVITY_THRESHOLDS = {
  VOID: 800,  // > 800 Ω·m = Void/Cave (Red)
  WATER: 50,  // < 50 Ω·m = Water/Moisture (Blue)
} as const;

export const classifyResistivity = (rhoA: number): { classification: 'void' | 'water' | 'normal'; label: string } => {
  if (rhoA > RESISTIVITY_THRESHOLDS.VOID) {
    return { classification: 'void', label: 'Vide/Cavité potentielle' };
  } else if (rhoA < RESISTIVITY_THRESHOLDS.WATER) {
    return { classification: 'water', label: 'Eau/Humidité élevée' };
  }
  return { classification: 'normal', label: 'Sol normal' };
};

export const getClassificationColor = (classification: 'void' | 'water' | 'normal'): string => {
  switch (classification) {
    case 'void': return 'hsl(0, 84%, 60%)'; // Red
    case 'water': return 'hsl(210, 100%, 50%)'; // Blue
    case 'normal': return 'hsl(142, 76%, 36%)'; // Green
  }
};
