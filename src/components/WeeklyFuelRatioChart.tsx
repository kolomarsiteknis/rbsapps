import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Fuel,
  Target,
  Layers,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Info,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { WeeklyFuelTrend } from '../types';

interface WeeklyFuelRatioChartProps {
  trends: WeeklyFuelTrend[];
  selectedClientId: string;
  clientName?: string;
}

export const WeeklyFuelRatioChart: React.FC<WeeklyFuelRatioChartProps> = ({
  trends,
  selectedClientId,
  clientName,
}) => {
  const [timeRange, setTimeRange] = useState<'all' | 'recent4'>('all');
  const [chartMode, setChartMode] = useState<'ratioOnly' | 'composed'>('composed');
  const [activeWeekId, setActiveWeekId] = useState<string | null>(null);

  // Filter trends by selected time range
  const displayedTrends = timeRange === 'recent4' ? trends.slice(-4) : trends;

  // Calculate high-level summary KPIs
  const benchmark = trends[0]?.benchmarkLimit || 420;
  const totalFuelSum = displayedTrends.reduce((acc, t) => acc + t.totalFuelLiters, 0);
  const totalHaSum = displayedTrends.reduce((acc, t) => acc + t.totalClearedHa, 0);
  const overallAvgRatio = totalHaSum > 0 ? Number((totalFuelSum / totalHaSum).toFixed(1)) : 0;

  const latestWeek = displayedTrends[displayedTrends.length - 1];
  const previousWeek = displayedTrends.length > 1 ? displayedTrends[displayedTrends.length - 2] : null;

  const weekOverWeekDelta = previousWeek && latestWeek
    ? Number((Number(latestWeek.fuelRatioPerHa || 0) - Number(previousWeek.fuelRatioPerHa || 0)).toFixed(1))
    : 0;

  const selectedWeekDetail = trends.find((t) => t.weekId === activeWeekId) || latestWeek;

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: WeeklyFuelTrend = payload[0].payload;
      const valRatio = Number(data?.fuelRatioPerHa || 0);
      const valBench = Number(data?.benchmarkLimit || benchmark);
      const isOver = valRatio > valBench;
      const diff = Number((valRatio - valBench).toFixed(1));

      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700 p-3.5 rounded-2xl shadow-2xl text-xs space-y-2 min-w-[240px]">
          <div className="border-b border-slate-800 pb-2">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-amber-400">{data.weekLabel}</span>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                  isOver ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {data.status}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">{data.dateRange}</p>
          </div>

          <div className="space-y-1.5 font-mono">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-300 font-sans font-medium text-xs">Rasio Konsumsi BBM:</span>
              <strong className={`font-black ${isOver ? 'text-rose-400' : 'text-amber-400'}`}>
                {Number(data?.fuelRatioPerHa || 0).toFixed(1)} L/Ha
              </strong>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-300">
              <span className="font-sans">Batas Standar Direktur:</span>
              <span>{Number(data?.benchmarkLimit || benchmark).toFixed(1)} L/Ha</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="font-sans text-slate-400">Deviasi Efisiensi:</span>
              <span className={diff <= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {diff <= 0 ? `${Math.abs(diff)} L/Ha Lebih Hemat` : `+${diff} L/Ha Di Atas Standar`}
              </span>
            </div>

            <div className="pt-1.5 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
              <span>Volume Solar:</span>
              <span className="text-white font-bold">{data.totalFuelLiters.toLocaleString('id-ID')} Liter</span>
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span>Luas Terbuka (Clearing):</span>
              <span className="text-white font-bold">{data.totalClearedHa} Ha</span>
            </div>
          </div>

          {data.notes && (
            <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-300 font-sans italic">
              "{data.notes}"
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xl border border-slate-200 space-y-5">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 flex items-center gap-1">
              <Fuel className="w-3 h-3 text-slate-950" /> Ringkasan Kontrol Bahan Bakar
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Metode Zero Burning (Mekanis Tanpa Bakar)
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Ringkasan Kontrol Bahan Bakar (Tren Rasio Liter / Ha Mingguan)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {selectedClientId !== 'ALL' && clientName
              ? `Pengawasan efisiensi pemakaian solar terhadap luasan lahan terbuka pada proyek ${clientName}.`
              : 'Konsolidasi efisiensi penggunaan solar seluruh proyek land clearing perkebunan (Multi-Klien) di Riau.'}
          </p>
        </div>

        {/* INTERACTIVE CONTROLS */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setChartMode('composed')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                chartMode === 'composed'
                  ? 'bg-slate-900 text-amber-400 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Komparasi (Rasio & Volume)
            </button>
            <button
              type="button"
              onClick={() => setChartMode('ratioOnly')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                chartMode === 'ratioOnly'
                  ? 'bg-slate-900 text-amber-400 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Fokus Rasio (L/Ha)
            </button>
          </div>

          {/* Time Range Filter */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                timeRange === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sepanjang Proyek ({trends.length} Minggu)
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('recent4')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                timeRange === 'recent4'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              4 Minggu Terakhir
            </button>
          </div>
        </div>
      </div>

      {/* TOP 4 EXECUTIVE SUMMARY TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Rata-rata Rasio */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase">
            <span>Rata-Rata Rasio Periode</span>
            <Target className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {overallAvgRatio.toFixed(1)}
            </span>
            <span className="text-xs font-bold text-slate-500">L / Ha</span>
          </div>
          <div className="text-[11px] mt-1 text-slate-500 flex items-center gap-1">
            <span>Standar Toleransi:</span>
            <strong className="text-slate-700 font-mono">{benchmark.toFixed(1)} L/Ha</strong>
          </div>
        </div>

        {/* Metric 2: Rasio Minggu Berjalan */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase">
            <span>Rasio Minggu Aktif ({latestWeek?.shortLabel})</span>
            <Fuel className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span
              className={`text-2xl font-black font-mono ${
                latestWeek && latestWeek.fuelRatioPerHa > benchmark ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {latestWeek ? Number(latestWeek.fuelRatioPerHa || 0).toFixed(1) : 0}
            </span>
            <span className="text-xs font-bold text-slate-500">L / Ha</span>
          </div>
          <div className="text-[11px] mt-1 flex items-center gap-1 font-semibold">
            {weekOverWeekDelta <= 0 ? (
              <span className="text-emerald-600 flex items-center gap-0.5">
                <TrendingDown className="w-3 h-3" />
                {Math.abs(weekOverWeekDelta)} L/Ha lebih hemat vs mgg lalu
              </span>
            ) : (
              <span className="text-rose-600 flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />
                +{weekOverWeekDelta} L/Ha kenaikan vs mgg lalu
              </span>
            )}
          </div>
        </div>

        {/* Metric 3: Total BBM Digunakan */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase">
            <span>Total BBM Terpakai</span>
            <Layers className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {totalFuelSum.toLocaleString('id-ID')}
            </span>
            <span className="text-xs font-bold text-slate-500">Liter</span>
          </div>
          <div className="text-[11px] mt-1 text-slate-500">
            Solar Industri B50 Non-Subsidi
          </div>
        </div>

        {/* Metric 4: Luas Lahan Terbuka */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase">
            <span>Total Hasil Clearing</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-700 font-mono">
              {totalHaSum.toFixed(1)}
            </span>
            <span className="text-xs font-bold text-slate-500">Hektar (Ha)</span>
          </div>
          <div className="text-[11px] mt-1 text-slate-500">
            Rabas, Cincang & Rumpuk Siap Tanam
          </div>
        </div>
      </div>

      {/* RECHARTS COMPONENT */}
      <div className="pt-2">
        <div className="h-72 sm:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={displayedTrends}
              margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload.length) {
                  setActiveWeekId(e.activePayload[0].payload.weekId);
                }
              }}
            >
              <defs>
                <linearGradient id="ratioGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.4} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

              <XAxis
                dataKey="shortLabel"
                stroke="#64748b"
                tick={{ fontSize: 11, fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />

              {/* Left Y Axis: Rasio L/Ha */}
              <YAxis
                yAxisId="left"
                stroke="#d97706"
                domain={[340, 480]}
                tick={{ fontSize: 11, fontWeight: 700 }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                unit=" L/Ha"
              />

              {/* Right Y Axis: Volume Luas Ha (shown in composed mode) */}
              {chartMode === 'composed' && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#3b82f6"
                  domain={[0, 40]}
                  tick={{ fontSize: 11, fontWeight: 600 }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  unit=" Ha"
                />
              )}

              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 'bold' }}
              />

              {/* Dotted Reference Line: Batas Standar Toleransi Direktur */}
              <ReferenceLine
                yAxisId="left"
                y={benchmark}
                stroke="#ef4444"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: `Batas Standar Direktur (${benchmark} L/Ha)`,
                  position: 'insideTopLeft',
                  fill: '#b91c1c',
                  fontSize: 11,
                  fontWeight: 800,
                  offset: 5,
                }}
              />

              {/* Optional Volume Bar (Luas Ha) in composed mode */}
              {chartMode === 'composed' && (
                <Bar
                  yAxisId="right"
                  dataKey="totalClearedHa"
                  name="Luas Lahan Terbuka (Ha)"
                  fill="url(#barGradient)"
                  radius={[6, 6, 0, 0]}
                  barSize={24}
                />
              )}

              {/* Area fill for Ratio */}
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="fuelRatioPerHa"
                name="Rasio Konsumsi BBM (L/Ha)"
                stroke="#f59e0b"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#ratioGradient)"
              />

              {/* Line on top with prominent dots */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="fuelRatioPerHa"
                stroke="#b45309"
                strokeWidth={3}
                dot={{ r: 5, fill: '#f59e0b', stroke: '#78350f', strokeWidth: 2 }}
                activeDot={{ r: 8, fill: '#f59e0b', stroke: '#fff', strokeWidth: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* WEEKLY BREAKDOWN INTERACTION CARD */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-xs font-black text-slate-900 uppercase">
              Detail Analisis Mingguan Terpilih: {selectedWeekDetail.weekLabel} ({selectedWeekDetail.dateRange})
            </span>
          </div>
          <span
            className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 self-start sm:self-auto ${
              selectedWeekDetail.fuelRatioPerHa > benchmark
                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}
          >
            {selectedWeekDetail.fuelRatioPerHa > benchmark ? (
              <AlertCircle className="w-3 h-3 text-rose-700" />
            ) : (
              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            )}
            Status: {selectedWeekDetail.status}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[10px]">Rasio Realisasi:</span>
            <strong className="text-sm font-mono text-slate-900">
              {selectedWeekDetail.fuelRatioPerHa.toFixed(1)} L/Ha
            </strong>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[10px]">Total Solar Terpakai:</span>
            <strong className="text-sm font-mono text-slate-900">
              {selectedWeekDetail.totalFuelLiters.toLocaleString('id-ID')} Liter
            </strong>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[10px]">Luas Clearing:</span>
            <strong className="text-sm font-mono text-slate-900">
              {selectedWeekDetail.totalClearedHa} Ha
            </strong>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[10px]">Jam Kerja Mesin (HM):</span>
            <strong className="text-sm font-mono text-slate-900">
              {selectedWeekDetail.totalHm} Jam
            </strong>
          </div>
        </div>

        {/* Operational Note for the week */}
        <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
          <div>
            <strong className="text-slate-900 font-bold">Catatan Operasional Lapangan: </strong>
            <span>{selectedWeekDetail.notes}</span>
          </div>
        </div>

        {/* Horizontal Mini-Pills for quick selecting other weeks */}
        <div className="pt-2 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <span className="text-slate-400 font-bold shrink-0">Pilih Minggu:</span>
          {trends.map((t) => {
            const isSelected = (selectedWeekDetail.weekId === t.weekId);
            const isOver = t.fuelRatioPerHa > benchmark;
            return (
              <button
                key={t.weekId}
                type="button"
                onClick={() => setActiveWeekId(t.weekId)}
                className={`px-2.5 py-1 rounded-lg font-bold font-mono transition cursor-pointer shrink-0 border ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                    : isOver
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {t.shortLabel}: {t.fuelRatioPerHa.toFixed(1)} L/Ha
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
