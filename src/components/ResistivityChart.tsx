import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Scatter, ComposedChart, Cell } from 'recharts';
import { BarChart3 } from 'lucide-react';

interface ResistivityChartProps {
  measurements: string[];
  aValue: number;
}

interface DataPoint {
  index: number;
  resistance: number;
  resistivity: number;
  depth: number;
  classification: 'void' | 'water' | 'normal';
  label: string;
}

const classifyResistivity = (rhoA: number): { classification: 'void' | 'water' | 'normal'; label: string } => {
  if (rhoA > 1000) {
    return { classification: 'void', label: 'Potential Void/Cave' };
  } else if (rhoA < 50) {
    return { classification: 'water', label: 'High Moisture/Water' };
  }
  return { classification: 'normal', label: 'Normal Soil' };
};

const getClassificationColor = (classification: 'void' | 'water' | 'normal'): string => {
  switch (classification) {
    case 'void': return 'hsl(0, 84%, 60%)'; // Red
    case 'water': return 'hsl(210, 100%, 50%)'; // Blue
    case 'normal': return 'hsl(142, 76%, 36%)'; // Green
  }
};

export const ResistivityChart = ({ measurements, aValue }: ResistivityChartProps) => {

  const chartData = useMemo<DataPoint[]>(() => {
    return measurements.map((m, index) => {
      // Parse resistance value from measurement string
      const resistance = parseFloat(m.replace(',', '.')) || 0;
      
      // Wenner formula: ρa = 2 × π × a × R
      const resistivity = 2 * Math.PI * aValue * resistance;
      
      // Depth calculation: depth = a × 0.5
      const depth = aValue * 0.5 * (index + 1);
      
      const { classification, label } = classifyResistivity(resistivity);
      
      return {
        index: index + 1,
        resistance,
        resistivity: Math.round(resistivity * 100) / 100,
        depth: Math.round(depth * 100) / 100,
        classification,
        label,
      };
    });
  }, [measurements, aValue]);

  const stats = useMemo(() => {
    const voids = chartData.filter(d => d.classification === 'void').length;
    const water = chartData.filter(d => d.classification === 'water').length;
    const normal = chartData.filter(d => d.classification === 'normal').length;
    return { voids, water, normal };
  }, [chartData]);

  if (measurements.length === 0) return null;

  return (
    <Card className="glass-card mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Analyse de Résistivité
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-4">
          {/* Statistics Summary */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline" className="border-red-500/50 text-red-500">
              Vides/Cavités: {stats.voids}
            </Badge>
            <Badge variant="outline" className="border-blue-500/50 text-blue-500">
              Eau/Humidité: {stats.water}
            </Badge>
            <Badge variant="outline" className="border-green-500/50 text-green-500">
              Sol Normal: {stats.normal}
            </Badge>
          </div>

          {/* Chart */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  type="number" 
                  dataKey="resistivity"
                  label={{ value: 'ρa (Ω·m)', position: 'bottom', offset: -5 }}
                  className="text-xs fill-muted-foreground"
                />
                <YAxis 
                  type="number"
                  dataKey="depth"
                  reversed
                  label={{ value: 'Profondeur (m)', angle: -90, position: 'insideLeft' }}
                  className="text-xs fill-muted-foreground"
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as DataPoint;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold text-foreground">Point #{data.index}</p>
                          <p className="text-sm text-muted-foreground">R: {data.resistance} Ω</p>
                          <p className="text-sm text-muted-foreground">ρa: {data.resistivity} Ω·m</p>
                          <p className="text-sm text-muted-foreground">Profondeur: {data.depth} m</p>
                          <p 
                            className="text-sm font-medium mt-1"
                            style={{ color: getClassificationColor(data.classification) }}
                          >
                            {data.label}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine x={50} stroke="hsl(210, 100%, 50%)" strokeDasharray="5 5" />
                <ReferenceLine x={1000} stroke="hsl(0, 84%, 60%)" strokeDasharray="5 5" />
                <Area 
                  type="monotone" 
                  dataKey="resistivity"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.2)"
                  strokeWidth={2}
                />
                <Scatter 
                  dataKey="resistivity" 
                  name="Measurements"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getClassificationColor(entry.classification)}
                      stroke={getClassificationColor(entry.classification)}
                      strokeWidth={2}
                    />
                  ))}
                </Scatter>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-muted-foreground">{'>'} 1000 Ω·m (Vide)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">{'<'} 50 Ω·m (Eau)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Normal</span>
            </div>
          </div>

          {/* Data Table */}
          <div className="mt-4 max-h-40 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b border-border">
                  <th className="text-left p-2 text-muted-foreground">#</th>
                  <th className="text-left p-2 text-muted-foreground">R (Ω)</th>
                  <th className="text-left p-2 text-muted-foreground">ρa (Ω·m)</th>
                  <th className="text-left p-2 text-muted-foreground">Profondeur</th>
                  <th className="text-left p-2 text-muted-foreground">Type</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((point) => (
                  <tr key={point.index} className="border-b border-border/50">
                    <td className="p-2">{point.index}</td>
                    <td className="p-2">{point.resistance}</td>
                    <td className="p-2">{point.resistivity}</td>
                    <td className="p-2">{point.depth} m</td>
                    <td className="p-2">
                      <span 
                        className="font-medium"
                        style={{ color: getClassificationColor(point.classification) }}
                      >
                        {point.classification === 'void' ? 'Vide' : 
                         point.classification === 'water' ? 'Eau' : 'Normal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
    </Card>
  );
};
