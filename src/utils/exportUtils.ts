import { MeasurementData, DataPoint, classifyResistivity, getClassificationColor, RESISTIVITY_THRESHOLDS } from '@/types/measurement';

export const exportToCSV = (
  measurements: MeasurementData[],
  aValue: number
): void => {
  const headers = ['#', 'Résistance (Ω)', 'Résistivité (Ω·m)', 'Profondeur (m)', 'Classification', 'Latitude', 'Longitude'];
  
  const rows = measurements.map((m, index) => {
    const resistance = parseFloat(m.value.replace(',', '.')) || 0;
    const resistivity = 2 * Math.PI * aValue * resistance;
    const depth = aValue * 0.5 * (index + 1);
    const { classification } = classifyResistivity(resistivity);
    
    return [
      index + 1,
      resistance.toFixed(2),
      resistivity.toFixed(2),
      depth.toFixed(2),
      classification,
      m.latitude?.toFixed(6) || '',
      m.longitude?.toFixed(6) || '',
    ].join(',');
  });

  const content = [headers.join(','), ...rows].join('\n');
  downloadFile(content, `ert_data_${Date.now()}.csv`, 'text/csv');
};

export const exportToTXT = (
  measurements: MeasurementData[],
  aValue: number
): void => {
  const content = [
    'ERT LINE',
    String(aValue),
    String(measurements.length),
    ...measurements.map(m => m.value.replace(',', ' ')),
  ].join('\n');

  downloadFile(content, `ert_line_${Date.now()}.txt`, 'text/plain');
};

export const exportToKML = (
  measurements: MeasurementData[],
  aValue: number
): void => {
  const dataPoints: DataPoint[] = measurements.map((m, index) => {
    const resistance = parseFloat(m.value.replace(',', '.')) || 0;
    const resistivity = 2 * Math.PI * aValue * resistance;
    const depth = aValue * 0.5 * (index + 1);
    const { classification, label } = classifyResistivity(resistivity);
    
    return {
      index: index + 1,
      resistance,
      resistivity: Math.round(resistivity * 100) / 100,
      depth: Math.round(depth * 100) / 100,
      classification,
      label,
      latitude: m.latitude,
      longitude: m.longitude,
    };
  });

  const getKMLColor = (classification: 'void' | 'water' | 'normal'): string => {
    // KML colors are in AABBGGRR format
    switch (classification) {
      case 'void': return 'ff0000ff'; // Red
      case 'water': return 'ffff0000'; // Blue
      case 'normal': return 'ff00ff00'; // Green
    }
  };

  const getIconUrl = (classification: 'void' | 'water' | 'normal'): string => {
    switch (classification) {
      case 'void': return 'http://maps.google.com/mapfiles/kml/paddle/red-circle.png';
      case 'water': return 'http://maps.google.com/mapfiles/kml/paddle/blu-circle.png';
      case 'normal': return 'http://maps.google.com/mapfiles/kml/paddle/grn-circle.png';
    }
  };

  const placemarks = dataPoints
    .filter(p => p.latitude !== null && p.longitude !== null)
    .map(point => `
    <Placemark>
      <name>Point #${point.index}</name>
      <description><![CDATA[
        <b>Résistance:</b> ${point.resistance} Ω<br/>
        <b>Résistivité:</b> ${point.resistivity} Ω·m<br/>
        <b>Profondeur:</b> ${point.depth} m<br/>
        <b>Classification:</b> ${point.label}
      ]]></description>
      <Style>
        <IconStyle>
          <color>${getKMLColor(point.classification)}</color>
          <scale>1.2</scale>
          <Icon>
            <href>${getIconUrl(point.classification)}</href>
          </Icon>
        </IconStyle>
      </Style>
      <Point>
        <coordinates>${point.longitude},${point.latitude},0</coordinates>
      </Point>
    </Placemark>`).join('\n');

  const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>ERT Survey - ${new Date().toLocaleDateString()}</name>
    <description>
      Electrical Resistivity Tomography Survey Data
      Espacement (a): ${aValue} m
      Seuils: Vide > ${RESISTIVITY_THRESHOLDS.VOID} Ω·m (Rouge), Eau < ${RESISTIVITY_THRESHOLDS.WATER} Ω·m (Bleu)
    </description>
    
    <Style id="void">
      <IconStyle>
        <color>ff0000ff</color>
        <scale>1.2</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href></Icon>
      </IconStyle>
    </Style>
    <Style id="water">
      <IconStyle>
        <color>ffff0000</color>
        <scale>1.2</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/paddle/blu-circle.png</href></Icon>
      </IconStyle>
    </Style>
    <Style id="normal">
      <IconStyle>
        <color>ff00ff00</color>
        <scale>1.2</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/paddle/grn-circle.png</href></Icon>
      </IconStyle>
    </Style>
    
    <Folder>
      <name>Mesures ERT</name>
      ${placemarks}
    </Folder>
  </Document>
</kml>`;

  downloadFile(kmlContent, `ert_survey_${Date.now()}.kml`, 'application/vnd.google-earth.kml+xml');
};

const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
