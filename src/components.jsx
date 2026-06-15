// Shared presentational pieces, built on the shadcn/ui primitives.
import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { Minus, Plus, Home, Clock, Users, PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useStore } from './store.jsx';

Chart.register(...registerables);

export function PageHead({ title, sub, right }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {sub && <p className="text-muted-foreground mt-0.5 text-[13px]">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

const ICONBOX = {
  green: 'bg-brand-green/12 text-brand-green',
  purple: 'bg-brand-purple/12 text-brand-purple',
  blue: 'bg-brand-blue/12 text-brand-blue',
  orange: 'bg-brand-orange/15 text-brand-orange',
};

export function IconBox({ color = 'green', children, className }) {
  return (
    <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', ICONBOX[color], className)}>
      {children}
    </div>
  );
}

export function Stepper({ value, onChange, min = 0, max = Infinity, step = 1 }) {
  const set = (v) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div className="border-input bg-card inline-flex items-center overflow-hidden rounded-lg border">
      <button
        type="button"
        className="bg-muted/60 hover:bg-muted flex size-9 items-center justify-center disabled:opacity-40"
        onClick={() => set(value - step)}
        disabled={value <= min}
        aria-label="decrease"
      >
        <Minus className="size-4" />
      </button>
      <span className="w-11 text-center text-sm font-bold tabular-nums">{value}</span>
      <button
        type="button"
        className="bg-muted/60 hover:bg-muted flex size-9 items-center justify-center disabled:opacity-40"
        onClick={() => set(value + step)}
        disabled={value >= max}
        aria-label="increase"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export function Empty({ icon = '🏸', title, sub }) {
  return (
    <div className="text-muted-foreground py-10 text-center">
      <div className="mb-2 text-4xl">{icon}</div>
      <div className="text-foreground font-semibold">{title}</div>
      {sub && <div className="mt-1 text-sm">{sub}</div>}
    </div>
  );
}

export function Toast() {
  const { toast } = useStore();
  if (!toast) return null;
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
      {toast}
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
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'history', icon: Clock, label: 'History' },
  { id: 'new', icon: Plus, label: 'New Session', fab: true },
  { id: 'friends', icon: Users, label: 'Friends' },
  { id: 'stats', icon: PieChart, label: 'Stats' },
];

export function BottomNav() {
  const { tab, navigate } = useStore();
  return (
    <nav className="bg-card sticky bottom-0 z-20 grid grid-cols-5 items-center border-t px-1.5 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2">
      {NAV.map((n) => {
        const Icon = n.icon;
        if (n.fab) {
          return (
            <button key={n.id} className="relative flex flex-col items-center gap-1 text-[11px] text-muted-foreground" onClick={() => navigate('new')}>
              <span className="bg-primary border-background -mt-7 flex size-14 items-center justify-center rounded-full border-4 text-primary-foreground shadow-lg shadow-primary/40">
                <Plus className="size-7" />
              </span>
              <span>{n.label}</span>
            </button>
          );
        }
        const active = tab === n.id;
        return (
          <button
            key={n.id}
            className={cn('flex flex-col items-center gap-1 py-1 text-[11px]', active ? 'text-primary font-semibold' : 'text-muted-foreground')}
            onClick={() => navigate(n.id)}
          >
            <Icon className="size-5" />
            <span>{n.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
