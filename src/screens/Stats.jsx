import { useMemo, useState } from 'react';
import { all, one } from '../db.js';
import { money, currencySymbol, monthShort } from '../format.js';
import { useStore } from '../store.jsx';
import { PageHead, Card, ChartView, Empty } from '../components.jsx';

const PERIODS = [
  { id: 'month', label: 'This Month' },
  { id: 'year', label: 'This Year' },
  { id: 'all', label: 'All Time' },
];

function whereFor(period) {
  const now = new Date();
  if (period === 'month') {
    const m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return { clause: "WHERE substr(date,1,7) = ?", params: [m] };
  }
  if (period === 'year') {
    return { clause: "WHERE substr(date,1,4) = ?", params: [String(now.getFullYear())] };
  }
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
         FROM sessions ${clause}`,
      params
    );
    const ids = all(`SELECT id FROM sessions ${clause}`, params).map((r) => r.id);
    const pcs = ids.length
      ? one(`SELECT COALESCE(SUM(pcs_used),0) v FROM session_shuttles WHERE session_id IN (${ids.map(() => '?').join(',')})`, ids).v
      : 0;
    const brands = ids.length
      ? all(`SELECT brand, SUM(pcs_used) pcs FROM session_shuttles WHERE session_id IN (${ids.map(() => '?').join(',')}) GROUP BY brand ORDER BY pcs DESC`, ids)
      : [];
    // monthly trend (last 6 months present in data, chronological)
    const trendRows = all(
      `SELECT substr(date,1,7) ym, SUM(total_cost) v FROM sessions ${clause} GROUP BY ym ORDER BY ym`,
      params
    );
    return { agg, pcs, brands, trend: trendRows.slice(-6) };
  }, [period, version]);

  const { agg, pcs, brands, trend } = data;
  const breakdown = [
    { label: 'Court Rental', value: agg.court, color: '#16a34a' },
    { label: 'Shuttlecock', value: agg.shuttle, color: '#6d5ce7' },
    { label: 'Others', value: agg.other, color: '#3b82f6' },
  ];
  const totalBreak = breakdown.reduce((s, b) => s + b.value, 0) || 1;
  const totalBrandPcs = brands.reduce((s, b) => s + b.pcs, 0) || 1;

  const donutConfig = useMemo(() => ({
    type: 'doughnut',
    data: {
      labels: breakdown.map((b) => b.label),
      datasets: [{ data: breakdown.map((b) => b.value), backgroundColor: breakdown.map((b) => b.color), borderWidth: 0 }],
    },
    options: { cutout: '68%', plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false },
  }), [agg.court, agg.shuttle, agg.other]);

  const lineConfig = useMemo(() => ({
    type: 'line',
    data: {
      labels: trend.map((t) => monthShort(t.ym + '-01')),
      datasets: [{
        data: trend.map((t) => t.v),
        borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,.12)',
        fill: true, tension: 0.35, pointBackgroundColor: '#16a34a', pointRadius: 4,
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, grid: { color: '#eef1f4' } }, x: { grid: { display: false } } },
      responsive: true, maintainAspectRatio: false,
    },
  }), [JSON.stringify(trend)]);

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
          <select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ width: 'auto' }}>
            {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        }
      />

      <Card>
        <div className="stat3">
          <div className="cell"><div className="ic">⬇️</div><div className="v" style={{ color: 'var(--green)' }}>{money(agg.spent)}</div><div className="k">Total Spent</div></div>
          <div className="cell"><div className="ic">👥</div><div className="v" style={{ color: 'var(--purple)' }}>{agg.cnt}</div><div className="k">Sessions</div></div>
          <div className="cell"><div className="ic">🏸</div><div className="v" style={{ color: 'var(--blue)' }}>{pcs}</div><div className="k">Shuttles Used</div></div>
        </div>
      </Card>

      {agg.cnt === 0 ? (
        <Empty title="No data for this period" sub="Try a different range or log a session." />
      ) : (
        <>
          {/* Spending overview */}
          <Card>
            <div className="card-title" style={{ marginBottom: 12 }}>Spending Overview</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
                <ChartView config={donutConfig} height={140} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div className="row-sub">Total</div>
                  <div style={{ fontWeight: 800 }}>{money(agg.spent)}</div>
                  <div className="row-sub">{sym}</div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                {breakdown.map((b) => (
                  <div className="legend-row" key={b.label}>
                    <div className="l"><span style={{ width: 12, height: 12, borderRadius: 4, background: b.color, display: 'inline-block' }} /><span>{b.label}</span></div>
                    <div className="v">{money(b.value)}<small>{Math.round((b.value / totalBreak) * 100)}%</small></div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Trend */}
          <Card>
            <div className="card-title" style={{ marginBottom: 12 }}>Spending Trend</div>
            <div style={{ height: 200 }}><ChartView config={lineConfig} height={200} /></div>
          </Card>

          {/* Brand usage */}
          <Card>
            <div className="card-title" style={{ marginBottom: 12 }}>Shuttlecock Usage by Brand</div>
            {brands.length === 0 && <div className="row-sub">No shuttlecocks logged.</div>}
            {brands.map((b) => (
              <div className="row" key={b.brand} style={{ marginTop: 10 }}>
                <div className="row-lead" style={{ width: 130 }}>
                  <span className="tube-img" style={{ width: 26, height: 32, fontSize: 14 }}>🥫</span>
                  <span className="row-sub" style={{ fontWeight: 600, color: 'var(--ink)' }}>{b.brand}</span>
                </div>
                <div className="bar" style={{ margin: '0 10px' }}><i style={{ width: `${(b.pcs / totalBrandPcs) * 100}%` }} /></div>
                <div style={{ textAlign: 'right', minWidth: 64 }}>
                  <div className="row-sub" style={{ fontWeight: 700, color: 'var(--ink)' }}>{b.pcs} pcs</div>
                  <div className="row-sub" style={{ color: 'var(--green)', fontWeight: 700 }}>{Math.round((b.pcs / totalBrandPcs) * 100)}%</div>
                </div>
              </div>
            ))}
          </Card>

          {/* Averages */}
          <Card>
            <div className="card-title" style={{ marginBottom: 12 }}>Average Per Session</div>
            <div className="avg4">
              <div className="cell"><div className="ic bx-green">💰</div><div className="v">{money(avgCost)}</div><div className="k">Cost</div><div className="u">{sym}</div></div>
              <div className="cell"><div className="ic bx-purple">👥</div><div className="v">{money(avgPer)}</div><div className="k">Per Person</div><div className="u">{sym}</div></div>
              <div className="cell"><div className="ic bx-blue">🏸</div><div className="v">{avgPcs.toFixed(1)}</div><div className="k">Shuttles</div><div className="u">pcs</div></div>
              <div className="cell"><div className="ic bx-orange">🕐</div><div className="v">{avgDur.toFixed(1)}</div><div className="k">Duration</div><div className="u">hr</div></div>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
