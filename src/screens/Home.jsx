import { all, one } from '../db.js';
import { fmt, money, time12, monthShort, dayNum } from '../format.js';
import { useStore } from '../store.jsx';
import { PageHead, Empty } from '../components.jsx';
import { Settings, Pencil, CalendarDays, Wallet, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

export default function Home() {
  const { version, navigate } = useStore();
  void version;

  const inv = one('SELECT COALESCE(SUM(remaining),0) AS left, COALESCE(SUM(pcs_per_tube),0) AS total FROM tubes') || { left: 0, total: 0 };
  const pctLeft = inv.total ? Math.round((inv.left / inv.total) * 100) : 0;
  const used = inv.total - inv.left;

  const last = one('SELECT * FROM sessions ORDER BY date DESC, id DESC LIMIT 1');
  const owedTotal = one(`SELECT COALESCE(SUM(amount),0) AS owed FROM session_people WHERE is_payer = 0 AND paid = 0`).owed;
  const lastOwed = last
    ? one(`SELECT COALESCE(SUM(amount),0) AS owed FROM session_people WHERE session_id = ? AND is_payer = 0 AND paid = 0`, [last.id]).owed
    : 0;
  const lastPerPerson = last && last.num_people ? last.total_cost / last.num_people : 0;

  return (
    <>
      <PageHead
        title="Sport Session 🏸"
        sub="Track shuttlecocks and split costs easily"
        right={
          <Button variant="outline" size="icon" onClick={() => navigate('settings')} aria-label="Settings">
            <Settings className="size-[18px]" />
          </Button>
        }
      />

      {/* Inventory */}
      <Card className="mb-3.5 gap-3 bg-gradient-to-b from-brand-green/8 to-card">
        <CardContent>
          <div className="mb-1 flex items-center justify-between">
            <div className="text-brand-green flex items-center gap-2 font-bold">🏸 Shuttlecock Left</div>
            <Button variant="ghost" size="sm" className="text-primary h-7 gap-1 px-2" onClick={() => navigate('settings')}>
              <Pencil className="size-3.5" /> Manage
            </Button>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-brand-green text-4xl font-extrabold">{inv.left}</span>
            <span className="text-muted-foreground">pcs left</span>
          </div>
          <div className="text-muted-foreground text-[13px]">out of {inv.total} pcs</div>
          <Progress value={pctLeft} className="my-2.5" />
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-muted-foreground">Used {used} pcs</span>
            <span className="text-brand-green font-bold">{100 - pctLeft}% used</span>
          </div>
        </CardContent>
      </Card>

      {/* Latest session */}
      <Card className="mb-3.5 gap-3">
        <CardContent>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-brand-purple flex items-center gap-2 font-bold"><CalendarDays className="size-[18px]" /> Latest Session</div>
            <Button variant="ghost" size="sm" className="text-brand-purple h-7 px-2" onClick={() => navigate('history')}>View all</Button>
          </div>
          {!last ? (
            <Empty title="No sessions yet" sub="Tap + to log your first one." />
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="bg-brand-purple/12 w-14 shrink-0 rounded-xl py-1.5 text-center">
                  <div className="text-brand-purple text-[11px] font-bold">{monthShort(last.date)}</div>
                  <div className="text-lg font-extrabold leading-tight">{dayNum(last.date)}</div>
                </div>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{last.location || 'Session'}</div>
                  <div className="text-muted-foreground text-xs">{time12(last.time)} · {last.num_people} people</div>
                </div>
              </div>
              <Separator className="my-3" />
              <Row label="Court Rental" value={money(last.court_rental)} />
              <Row label="Shuttlecock" value={money(last.shuttle_cost)} />
              {last.other_expenses > 0 && <Row label="Other" value={money(last.other_expenses)} />}
              <Separator className="my-3" />
              <div className="flex items-center justify-between">
                <strong>Total Cost</strong>
                <span className="text-brand-purple text-lg font-extrabold">{money(last.total_cost)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-muted-foreground">Cost per person</span>
                <span className="text-brand-blue font-bold">{money(lastPerPerson)}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="gap-3">
        <CardContent>
          <div className="text-brand-orange mb-3 flex items-center gap-2 font-bold"><Wallet className="size-[18px]" /> Summary</div>
          {last && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">You're owed from latest</span>
              <span className="font-bold">{fmt(lastOwed)}</span>
            </div>
          )}
          <div className="bg-brand-green/10 mt-3 flex gap-2.5 rounded-xl p-3">
            <span>💰</span>
            <div>
              <div className="text-brand-green text-lg font-extrabold">You're owed (total) {fmt(owedTotal)}</div>
              <div className="text-muted-foreground mt-0.5 text-sm">Remind your friends to settle up! 😉</div>
            </div>
          </div>
          <Button className="mt-3.5 h-12 w-full text-base" onClick={() => navigate('new')}>
            <Plus className="size-5" /> New Session
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="mt-2 flex items-center justify-between first:mt-0">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
