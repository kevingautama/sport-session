import { useState, useMemo } from 'react';
import { all, tx, getSetting } from '../db.js';
import { money, currencySymbol, todayISO, nowHHMM } from '../format.js';
import { useStore } from '../store.jsx';
import { PageHead, Stepper, IconBox } from '../components.jsx';
import { LandPlot, Tag, Users, Plus, Trash2, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DateTimePicker } from '@/components/date-time-picker';

const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0);

export default function NewSession() {
  const { navigate, refresh, showToast } = useStore();

  const tubes = useMemo(() => all('SELECT * FROM tubes ORDER BY bought_date DESC, id DESC'), []);
  const friends = useMemo(() => all('SELECT * FROM friends ORDER BY name'), []);
  const playerName = getSetting('player_name', 'You');

  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState(nowHHMM());
  const [location, setLocation] = useState('');
  const [duration, setDuration] = useState('');
  const [court, setCourt] = useState('');
  const [other, setOther] = useState('');

  const [usage, setUsage] = useState(() => Object.fromEntries(tubes.map((t) => [t.id, 0])));
  const [showAdd, setShowAdd] = useState(false);
  const [visibleTubes, setVisibleTubes] = useState(() => tubes.slice(0, 3).map((t) => t.id));

  const [people, setPeople] = useState([{ name: playerName, isPayer: true }, { name: 'Friend 1' }, { name: 'Friend 2' }, { name: 'Friend 3' }]);

  const shown = tubes.filter((t) => visibleTubes.includes(t.id));
  const shuttleCost = shown.reduce((s, t) => s + (usage[t.id] || 0) * (t.price / t.pcs_per_tube), 0);
  const total = num(court) + num(other) + shuttleCost;
  const perPerson = people.length ? total / people.length : 0;
  const youReceive = total - perPerson;
  const sym = currencySymbol();

  const setUse = (id, v) => setUsage((u) => ({ ...u, [id]: v }));
  const addTube = (id) => { setVisibleTubes((v) => (v.includes(id) ? v : [...v, id])); setShowAdd(false); };
  const removeTube = (id) => { setVisibleTubes((v) => v.filter((x) => x !== id)); setUse(id, 0); };

  const setCount = (n) => setPeople((p) => {
    if (n < 1) return p;
    if (n < p.length) return p.slice(0, n);
    const next = [...p];
    while (next.length < n) next.push({ name: `Friend ${next.length}` });
    return next;
  });
  const setPersonName = (i, name) => setPeople((p) => p.map((x, idx) => (idx === i ? { ...x, name } : x)));

  const clearAll = () => {
    setCourt(''); setOther(''); setLocation(''); setDuration('');
    setUsage(Object.fromEntries(tubes.map((t) => [t.id, 0])));
  };

  const save = () => {
    if (total <= 0) { showToast('Add a cost before saving'); return; }
    tx(({ exec, lastId }) => {
      exec(
        `INSERT INTO sessions(date,time,location,court_rental,other_expenses,duration_hr,num_people,shuttle_cost,total_cost,created_at)
         VALUES(?,?,?,?,?,?,?,?,?,?)`,
        [date, time, location || null, num(court), num(other), num(duration), people.length, shuttleCost, total, new Date().toISOString()]
      );
      const sid = lastId();
      for (const t of shown) {
        const pcs = usage[t.id] || 0;
        if (pcs > 0) {
          const cost = pcs * (t.price / t.pcs_per_tube);
          exec(`INSERT INTO session_shuttles(session_id,tube_id,brand,pcs_used,cost) VALUES(?,?,?,?,?)`, [sid, t.id, t.brand, pcs, cost]);
          exec(`UPDATE tubes SET remaining = MAX(0, remaining - ?) WHERE id = ?`, [pcs, t.id]);
        }
      }
      people.forEach((p) => exec(
        `INSERT INTO session_people(session_id,name,is_payer,amount,paid) VALUES(?,?,?,?,?)`,
        [sid, p.name, p.isPayer ? 1 : 0, perPerson, p.isPayer ? 1 : 0]
      ));
    });
    refresh();
    showToast('Session saved ✓');
    navigate('history');
  };

  const available = tubes.filter((t) => !visibleTubes.includes(t.id));

  return (
    <>
      <PageHead
        title="New Session"
        sub="Track your play and split the cost"
        right={<Button variant="ghost" size="sm" className="text-primary" onClick={clearAll}>Clear All</Button>}
      />

      {/* Court rental */}
      <Card className="mb-3.5">
        <CardContent className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <IconBox color="green"><LandPlot className="size-5" /></IconBox>
            <div>
              <div className="font-semibold">Court Rental</div>
              <div className="text-muted-foreground text-xs">Cost of the court</div>
            </div>
          </div>
          <Input type="number" inputMode="decimal" placeholder="0.00" value={court} onChange={(e) => setCourt(e.target.value)} className="w-28 text-right font-bold" />
        </CardContent>
      </Card>

      {/* When / where */}
      <Card className="mb-3.5">
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input type="text" placeholder="Badminton Centre - Court 1" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="flex gap-2.5">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label>Date &amp; time</Label>
              <DateTimePicker date={date} time={time} onDateChange={setDate} onTimeChange={setTime} />
            </div>
            <div className="w-20 space-y-1.5"><Label>Hours</Label><Input type="number" inputMode="decimal" placeholder="2.0" value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      {/* Shuttlecock usage */}
      <Card className="mb-3.5">
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold">🏸 Shuttlecock Usage</div>
            {available.length > 0 && (
              <Button variant="ghost" size="sm" className="text-brand-purple h-7 gap-1 px-2" onClick={() => setShowAdd(true)}>
                <Plus className="size-4" /> Add Usage
              </Button>
            )}
          </div>
          <p className="text-muted-foreground mb-3 text-xs">Track by shuttlecocks from your inventory</p>

          {shown.length === 0 && <p className="text-muted-foreground text-sm">No tubes selected. Tap “Add Usage”.</p>}

          {shown.map((t) => {
            const pcs = usage[t.id] || 0;
            const cost = pcs * (t.price / t.pcs_per_tube);
            return (
              <div key={t.id} className="mb-2.5 rounded-xl border p-3">
                <div className="flex gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">{t.brand}</div>
                    <div className="text-muted-foreground text-xs">Bought on {t.bought_date}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Badge variant="purple">{sym}{money(t.price)} / tube</Badge>
                      <span className="text-muted-foreground text-xs">{t.pcs_per_tube} pcs per tube</span>
                    </div>
                    <div className="text-muted-foreground mt-1.5 text-xs">{t.remaining} remaining before this session</div>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-dashed pt-2.5">
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs">Used</div>
                    <Stepper value={pcs} min={0} max={t.remaining} onChange={(v) => setUse(t.id, v)} />
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground text-xs">Cost</div>
                    <div className="text-brand-purple text-lg font-extrabold">{money(cost)}</div>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => removeTube(t.id)} aria-label="Remove"><Trash2 className="size-4" /></Button>
                </div>
              </div>
            );
          })}

          <div className="bg-brand-purple/8 text-brand-purple flex gap-2.5 rounded-lg p-3 text-[12.5px]">
            <Info className="mt-0.5 size-4 shrink-0" />
            <span>Cost is calculated from the price you paid for the tube. You can use pieces from multiple tubes in one session.</span>
          </div>

          <div className="mt-3 flex items-center justify-between border-t pt-3">
            <strong>Total Shuttlecock Cost</strong>
            <span className="text-brand-purple text-lg font-extrabold">{money(shuttleCost)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Other expenses */}
      <Card className="mb-3.5">
        <CardContent className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <IconBox color="orange"><Tag className="size-5" /></IconBox>
            <div>
              <div className="font-semibold">Other Expenses <span className="text-muted-foreground text-xs">(Optional)</span></div>
              <div className="text-muted-foreground text-xs">Drinks, parking, etc.</div>
            </div>
          </div>
          <Input type="number" inputMode="decimal" placeholder="0.00" value={other} onChange={(e) => setOther(e.target.value)} className="w-28 text-right font-bold" />
        </CardContent>
      </Card>

      {/* People */}
      <Card className="mb-3.5">
        <CardContent>
          <div className="mb-3 flex items-center gap-2 font-bold"><Users className="size-[18px]" /> People</div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Number of People</span>
            <Stepper value={people.length} min={1} onChange={setCount} />
          </div>
          <Separator className="my-3" />
          <ul className="space-y-3">
            {people.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="bg-brand-purple/12 text-brand-purple flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold">{i + 1}</div>
                  {p.isPayer ? (
                    <div className="font-semibold">{p.name} <span className="text-muted-foreground text-xs">(Payer)</span></div>
                  ) : (
                    <Input list="friend-names" value={p.name} onChange={(e) => setPersonName(i, e.target.value)} className="h-9 max-w-40" />
                  )}
                </div>
                {p.isPayer ? (
                  <Badge variant="green">Paid</Badge>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge variant="orange">Owes</Badge>
                    <span className="font-bold tabular-nums">{money(perPerson)}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <datalist id="friend-names">{friends.map((f) => <option value={f.name} key={f.id} />)}</datalist>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="from-brand-green/10 grid grid-cols-4 gap-2 rounded-2xl border bg-gradient-to-b to-card px-2 py-3.5">
        {[['Total Cost', total], ['Per Person', perPerson], ['You Paid', total], ['You receive', youReceive]].map(([k, v]) => (
          <div key={k} className="text-center">
            <div className="text-muted-foreground text-[11px]">{k}</div>
            <div className="text-brand-green text-base font-extrabold tabular-nums">{money(v)}</div>
            <div className="text-muted-foreground text-[10px]">{sym}</div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 -mx-4 mt-2 bg-gradient-to-t from-background to-transparent px-4 pt-3 pb-[calc(8px+env(safe-area-inset-bottom))]">
        <Button className="h-12 w-full text-base" onClick={save}>Save Session</Button>
      </div>

      {/* Add tube dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add shuttlecock from inventory</DialogTitle></DialogHeader>
          {available.length === 0 && <p className="text-muted-foreground text-sm">All tubes are already added.</p>}
          {available.map((t) => (
            <button key={t.id} className="hover:bg-accent flex w-full items-center justify-between rounded-xl border p-3 text-left" onClick={() => addTube(t.id)}>
              <div>
                <div className="font-semibold">{t.brand}</div>
                <div className="text-muted-foreground text-xs">{t.remaining} left · {sym}{money(t.price)}/tube</div>
              </div>
              <span className="text-brand-purple font-bold">Add</span>
            </button>
          ))}
        </DialogContent>
      </Dialog>
    </>
  );
}
