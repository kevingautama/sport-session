// Shared presentational components.
import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { useStore } from './store.jsx';

Chart.register(...registerables);

export function PageHead({ title, sub, right }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <div className="page-sub">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function Stepper({ value, onChange, min = 0, max = Infinity, step = 1 }) {
  const set = (v) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div className="stepper">
      <button type="button" onClick={() => set(value - step)} aria-label="decrease">−</button>
      <span className="val">{value}</span>
      <button type="button" onClick={() => set(value + step)} aria-label="increase">+</button>
    </div>
  );
}

export function Pill({ kind = 'gray', children }) {
  return <span className={`pill pill-${kind}`}>{children}</span>;
}

export function Empty({ icon = '🏸', title, sub }) {
  return (
    <div className="empty">
      <div className="e-ic">{icon}</div>
      <div style={{ fontWeight: 700 }}>{title}</div>
      {sub && <div style={{ marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function Toast() {
  const { toast } = useStore();
  if (!toast) return null;
  return <div className="toast">{toast}</div>;
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  );
}

/** Generic Chart.js canvas. Rebuilds when `config` identity changes. */
export function ChartView({ config, height = 200 }) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    const ctx = ref.current.getContext('2d');
    chartRef.current = new Chart(ctx, config);
    return () => chartRef.current && chartRef.current.destroy();
  }, [config]);
  return <canvas ref={ref} style={{ height, maxHeight: height }} />;
}

const NAV = [
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'history', icon: '📊', label: 'History' },
  { id: 'new', icon: '+', label: 'New Session', fab: true },
  { id: 'friends', icon: '👥', label: 'Friends' },
  { id: 'stats', icon: '📈', label: 'Stats' },
];

export function BottomNav() {
  const { tab, navigate } = useStore();
  return (
    <nav className="tabbar">
      {NAV.map((n) =>
        n.fab ? (
          <button key={n.id} className="tab tab-fab" onClick={() => navigate('new')}>
            <span className="fab">+</span>
            <span style={{ marginTop: 2 }}>{n.label}</span>
          </button>
        ) : (
          <button
            key={n.id}
            className={`tab ${tab === n.id ? 'on' : ''}`}
            onClick={() => navigate(n.id)}
          >
            <span className="ti">{n.icon}</span>
            <span>{n.label}</span>
          </button>
        )
      )}
    </nav>
  );
}
