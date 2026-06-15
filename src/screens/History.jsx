import { useState } from 'react';
import { all, one, run, tx } from '../db.js';
import { money, monthLabel, monthShort, dayNum, weekday, time12 } from '../format.js';
import { useStore } from '../store.jsx';
import { PageHead, Empty } from '../components.jsx';
import { ArrowDownCircle, Users, Clock, CreditCard, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function History() {
  const { version, refresh, showToast } = useStore();
  void version;
  const [open, setOpen] = useState(null);

  const sessions = all('SELECT * FROM sessions ORDER BY date DESC, id DESC');
  const totals = one('SELECT COALESCE(SUM(total_cost),0) AS spent, COUNT(*) AS cnt FROM sessions');
  const shuttlePcs = one('SELECT COALESCE(SUM(pcs_used),0) AS pcs FROM session_shuttles').pcs;

  const groups = [];
  for (const s of sessions) {
    const label = monthLabel(s.date);
    let g = groups.find((x) => x.label === label);
    if (!g) groups.push((g = { label, items: [] }));
    g.items.push(s);
  }

  const owedFor = (id) => one('SELECT COALESCE(SUM(amount),0) AS v FROM session_people WHERE session_id=? AND is_payer=0 AND paid=0', [id]).v;
  const brandFor = (id) => one('SELECT brand FROM session_shuttles WHERE session_id=? ORDER BY pcs_used DESC LIMIT 1', [id]);
  const pcsFor = (id) => one('SELECT COALESCE(SUM(pcs_used),0) AS v FROM session_shuttles WHERE session_id=?', [id]).v;

  return (
    <>
      <PageHead title="History" sub="Your past play sessions and spending" />

      <Card className="mb-3.5">
        <CardContent>
          <div className="grid grid-cols-3 divide-x">
            <Stat icon={<ArrowDownCircle className="size-[18px]" />} value={money(totals.spent)} label="Total Spent" tint="text-brand-green" />
            <Stat icon={<Users className="size-[18px]" />} value={totals.cnt} label="Sessions" tint="text-brand-purple" />
            <Stat icon={<span className="text-lg leading-none">🏸</span>} value={shuttlePcs} label="Shuttles Used" tint="text-brand-blue" />
          </div>
        </CardContent>
      </Card>

      {sessions.length === 0 && <Empty title="No history yet" sub="Saved sessions will appear here." />}

      {groups.map((g) => (
        <div key={g.label}>
          <div className="text-muted-foreground mt-2 mb-2.5 ml-0.5 text-[13px] font-bold">{g.label}</div>
          {g.items.map((s) => {
            const owed = owedFor(s.id);
            const brand = brandFor(s.id);
            const pcs = pcsFor(s.id);
            const perPerson = s.num_people ? s.total_cost / s.num_people : 0;
            return (
              <Card key={s.id} className="mb-3.5 cursor-pointer transition-colors hover:border-primary/40" onClick={() => setOpen(s.id)}>
                <CardContent className="flex gap-3">
                  <div className="bg-brand-purple/10 flex w-14 shrink-0 flex-col items-center justify-center rounded-xl px-2 py-2.5">
                    <div className="text-brand-purple text-[11px] font-bold uppercase tracking-wide">{monthShort(s.date)}</div>
                    <div className="text-2xl font-extrabold leading-none">{dayNum(s.date)}</div>
                    <div className="text-muted-foreground mt-0.5 text-[10px]">{weekday(s.date)}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold">{time12(s.time)}</div>
                      <div className="text-right">
                        <div className="font-bold tabular-nums leading-tight">{money(s.total_cost)}</div>
                        <div className="text-muted-foreground text-xs tabular-nums">{money(perPerson)} / person</div>
                      </div>
                    </div>
                    <div className="text-muted-foreground truncate text-xs">{s.location || 'Session'}</div>
                    <div className="text-muted-foreground mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      {s.duration_hr > 0 && <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {s.duration_hr} hr</span>}
                      {brand && <span>🏸 {brand.brand}</span>}
                      {pcs > 0 && <span>{pcs} pcs</span>}
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs"><Users className="size-3.5" /> {s.num_people} people</span>
                      {owed > 0 ? <Badge variant="green">You're owed {money(owed)}</Badge> : <Badge variant="muted">Settled</Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}

      {open != null && (
        <SessionDetail
          id={open}
          onClose={() => setOpen(null)}
          onChange={refresh}
          onDeleted={() => { setOpen(null); refresh(); showToast('Session deleted'); }}
        />
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

function SessionDetail({ id, onClose, onChange, onDeleted }) {
  const s = one('SELECT * FROM sessions WHERE id=?', [id]);
  const people = all('SELECT * FROM session_people WHERE session_id=? ORDER BY is_payer DESC, id', [id]);
  const shuttles = all('SELECT * FROM session_shuttles WHERE session_id=?', [id]);
  if (!s) return null;

  const togglePaid = (p) => { run('UPDATE session_people SET paid=? WHERE id=?', [p.paid ? 0 : 1, p.id]); onChange(); };
  const del = () => {
    if (!confirm('Delete this session? This cannot be undone.')) return;
    tx(({ exec }) => {
      exec('DELETE FROM session_shuttles WHERE session_id=?', [id]);
      exec('DELETE FROM session_people WHERE session_id=?', [id]);
      exec('DELETE FROM sessions WHERE id=?', [id]);
    });
    onDeleted();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{s.location || 'Session'}</DialogTitle></DialogHeader>
        <div className="text-muted-foreground -mt-2 text-sm">{monthLabel(s.date)} · {time12(s.time)}{s.duration_hr ? ` · ${s.duration_hr} hr` : ''}</div>

        <div className="space-y-2">
          <Line label="Court Rental" value={money(s.court_rental)} />
          <Line label="Shuttlecock" value={money(s.shuttle_cost)} />
          {shuttles.map((sh) => (
            <div key={sh.id} className="flex items-center justify-between pl-3 text-xs text-muted-foreground">
              <span>· {sh.brand} ({sh.pcs_used} pcs)</span><span>{money(sh.cost)}</span>
            </div>
          ))}
          {s.other_expenses > 0 && <Line label="Other" value={money(s.other_expenses)} />}
        </div>
        <Separator />
        <div className="flex items-center justify-between"><strong>Total</strong><span className="text-brand-purple text-lg font-extrabold">{money(s.total_cost)}</span></div>

        <div className="text-muted-foreground text-[13px] font-bold">Who pays what — tap to settle</div>
        <ul className="space-y-2.5">
          {people.map((p) => (
            <li key={p.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex size-9 items-center justify-center rounded-full ${p.is_payer ? 'bg-brand-green/12 text-brand-green' : 'bg-brand-purple/12 text-brand-purple'}`}>
                  {p.is_payer ? <CreditCard className="size-4" /> : <User className="size-4" />}
                </div>
                <div className="font-semibold">{p.name}{p.is_payer ? ' (Payer)' : ''}</div>
              </div>
              {p.is_payer ? (
                <Badge variant="green">Paid</Badge>
              ) : (
                <Button size="sm" variant="outline" className={p.paid ? 'text-brand-green' : 'text-brand-orange'} onClick={() => togglePaid(p)}>
                  {p.paid ? `Settled · ${money(p.amount)}` : `Owes ${money(p.amount)}`}
                </Button>
              )}
            </li>
          ))}
        </ul>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="outline" className="text-destructive" onClick={del}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Line({ label, value }) {
  return <div className="flex items-center justify-between"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>;
}
