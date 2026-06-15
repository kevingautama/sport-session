import { useMemo, useState } from 'react';
import { all, one } from '../db.js';
import { money, currencySymbol, monthShort } from '../format.js';
import { useStore } from '../store.jsx';
import { PageHead, ChartView, Empty } from '../components.jsx';
import { ArrowDownCircle, Users, Wallet, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PERIODS = [
  { id: 'month', label: 'This Month' },
  { id: 'year', label: 'This Year' },
  { id: 'all', label: 'All Time' },
];

function whereFor(period) {
  const now = new Date();
  if (period === 'month') {
    const m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return { clause: 'WHERE substr(date,1,7) = ?', params: [m] };
  }
  if (period === 'year') return { clause: 'WHERE substr(date,1,4) = ?', params: [String(now.getFullYear())] };
  return { clause: '', params: [] };
}

export default function Stats() {
  const { version } = useStore();
  const [period, setPeriod] = useState('all');
  const sym = currencySymbol();

  const data = useMemo(() => {
    void version;
    const { clause, params } = whereFor(period);
    const agg = one(
      `SELECT COALESCE(SUM(total_cost),0) spent, COUNT(*) cnt,
              COALESCE(SUM(court_rental),0) court, COALESCE(SUM(shuttle_cost),0) shuttle,
              COALESCE(SUM(other_expenses),0) other, COALESCE(SUM(duration_hr),0) dur,
              COALESCE(SUM(num_people),0) ppl
         FROM sessions ${clause}`, params);
    const ids = all(`SELECT id FROM sessions ${clause}`, params).map((r) => r.id);
    const ph = ids.map(() => '?').join(',');
    const pcs = ids.length ? one(`SELECT COALESCE(SUM(pcs_used),0) v FROM session_shuttles WHERE session_id IN (${ph})`, ids).v : 0;
    const brands = ids.length ? all(`SELECT brand, SUM(pcs_used) pcs FROM session_shuttles WHERE session_id IN (${ph}) GROUP BY brand ORDER BY pcs DESC`, ids) : [];
    const trend = all(`SELECT substr(date,1,7) ym, SUM(total_cost) v FROM sessions ${clause} GROUP BY ym ORDER BY ym`, params).slice(-6);
    return { agg, pcs, brands, trend };
  }, [period, version]);

  const { agg, pcs, brands, trend } = data;
  const breakdown = [
    { label: 'Court Rental', value: agg.court, color: '#16a34a' },
    { label: 'Shuttlecock', value: agg.shuttle, color: '#7c5cf0' },
    { label: 'Others', value: agg.other, color: '#3b82f6' },
  ];
  const totalBreak = breakdown.reduce((s, b) => s + b.value, 0) || 1;
  const totalBrandPcs = brands.reduce((s, b) => s + b.pcs, 0) || 1;

  const donutConfig = useMemo(() => ({
    type: 'doughnut',
    data: { labels: breakdown.map((b) => b.label), datasets: [{ data: breakdown.map((b) => b.value), backgroundColor: breakdown.map((b) => b.color), borderWidth: 0 }] },
    options: { cutout: '68%', plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false },
  }), [agg.court, agg.shuttle, agg.other]);

  const dark = document.documentElement.classList.contains('dark');
  const gridColor = dark ? 'rgba(255,255,255,0.09)' : '#eef1f4';
  const tickColor = dark ? 'rgba(255,255,255,0.6)' : '#64748b';

  const lineConfig = useMemo(() => ({
    type: 'line',
    data: { labels: trend.map((t) => monthShort(t.ym + '-01')), datasets: [{ data: trend.map((t) => t.v), borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,.12)', fill: true, tension: 0.35, pointBackgroundColor: '#16a34a', pointRadius: 4 }] },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: tickColor } },
        x: { grid: { display: false }, ticks: { color: tickColor } },
      },
      responsive: true, maintainAspectRatio: false,
    },
  }), [JSON.stringify(trend), dark]);

  const avgCost = agg.cnt ? agg.spent / agg.cnt : 0;
  const avgPer = agg.ppl ? agg.spent / agg.ppl : 0;
  const avgPcs = agg.cnt ? pcs / agg.cnt : 0;
  const avgDur = agg.cnt ? agg.dur / agg.cnt : 0;

  return (
    <>
      <PageHead
        title="Stats"
        sub="Insights about your play and spending"
        right={
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{PERIODS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        }
      />

      <Card className="mb-3.5">
        <CardContent>
          <div className="grid grid-cols-3 divide-x">
            <Stat icon={<ArrowDownCircle className="size-[18px]" />} value={money(agg.spent)} label="Total Spent" tint="text-brand-green" />
            <Stat icon={<Users className="size-[18px]" />} value={agg.cnt} label="Sessions" tint="text-brand-purple" />
            <Stat icon={<span className="text-lg leading-none">🏸</span>} value={pcs} label="Shuttles Used" tint="text-brand-blue" />
          </div>
        </CardContent>
      </Card>

      {agg.cnt === 0 ? (
        <Empty title="No data for this period" sub="Try a different range or log a session." />
      ) : (
        <>
          <Card className="mb-3.5">
            <CardContent>
              <div className="mb-3 font-semibold">Spending Overview</div>
              <div className="flex items-center gap-4">
                <div className="relative size-36 shrink-0">
                  <ChartView config={donutConfig} height={144} />
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-muted-foreground text-xs">Total</div>
                    <div className="font-extrabold">{money(agg.spent)}</div>
                    <div className="text-muted-foreground text-xs">{sym}</div>
                  </div>
                </div>
                <div className="flex-1 space-y-2.5">
                  {breakdown.map((b) => (
                    <div key={b.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5"><span className="size-3 rounded" style={{ background: b.color }} /><span className="text-sm">{b.label}</span></div>
                      <div className="text-right font-bold tabular-nums">{money(b.value)}<small className="text-muted-foreground block text-[11px] font-semibold">{Math.round((b.value / totalBreak) * 100)}%</small></div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-3.5">
            <CardContent>
              <div className="mb-3 font-semibold">Spending Trend</div>
              <div className="h-50"><ChartView config={lineConfig} height={200} /></div>
            </CardContent>
          </Card>

          <Card className="mb-3.5">
            <CardContent>
              <div className="mb-3 font-semibold">Shuttlecock Usage by Brand</div>
              {brands.length === 0 && <p className="text-muted-foreground text-sm">No shuttlecocks logged.</p>}
              <div className="space-y-2.5">
                {brands.map((b) => (
                  <div key={b.brand} className="flex items-center gap-2.5">
                    <span className="w-28 shrink-0 truncate text-xs font-semibold">{b.brand}</span>
                    <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full"><div className="bg-brand-green h-full rounded-full" style={{ width: `${(b.pcs / totalBrandPcs) * 100}%` }} /></div>
                    <div className="w-14 shrink-0 text-right">
                      <div className="text-xs font-bold tabular-nums">{b.pcs} pcs</div>
                      <div className="text-brand-green text-xs font-bold">{Math.round((b.pcs / totalBrandPcs) * 100)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="mb-3 font-semibold">Average Per Session</div>
              <div className="grid grid-cols-4 gap-1.5 text-center">
                <Avg color="green" icon={<Wallet className="size-4" />} value={money(avgCost)} label="Cost" unit={sym} />
                <Avg color="purple" icon={<Users className="size-4" />} value={money(avgPer)} label="Per Person" unit={sym} />
                <Avg color="blue" icon={<span>🏸</span>} value={avgPcs.toFixed(1)} label="Shuttles" unit="pcs" />
                <Avg color="orange" icon={<Clock className="size-4" />} value={avgDur.toFixed(1)} label="Duration" unit="hr" />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}

function Stat({ icon, value, label, tint }) {
  return (
    <div className="px-1 text-center">
      <div className="flex justify-center">{icon}</div>
      <div className={`mt-1 text-xl font-extrabold tabular-nums ${tint}`}>{value}</div>
      <div className="text-muted-foreground text-[11px]">{label}</div>
    </div>
  );
}

const AVG_TINT = {
  green: 'bg-brand-green/12 text-brand-green',
  purple: 'bg-brand-purple/12 text-brand-purple',
  blue: 'bg-brand-blue/12 text-brand-blue',
  orange: 'bg-brand-orange/15 text-brand-orange',
};
function Avg({ color, icon, value, label, unit }) {
  return (
    <div>
      <div className={`mx-auto mb-1.5 flex size-9 items-center justify-center rounded-lg ${AVG_TINT[color]}`}>{icon}</div>
      <div className="font-extrabold tabular-nums">{value}</div>
      <div className="text-muted-foreground text-[10px]">{label}</div>
      <div className="text-muted-foreground text-[10px]">{unit}</div>
    </div>
  );
}
