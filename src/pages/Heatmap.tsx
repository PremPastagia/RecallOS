import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ReviewHistoryTracker } from '../lib/reviewSession';

// Build a 52-week (364-day) grid ending today
function buildGrid() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: { date: string; label: string }[] = [];
  for (let i = 363; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    });
  }
  return days;
}

function cellColor(count: number): string {
  if (count === 0) return 'var(--color-border)';
  if (count <= 2) return 'rgba(200, 100, 56, 0.25)';
  if (count <= 5) return 'rgba(200, 100, 56, 0.50)';
  if (count <= 10) return 'rgba(200, 100, 56, 0.75)';
  return 'var(--color-accent-terracotta)';
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export function Heatmap() {
  const records = useMemo(() => ReviewHistoryTracker.getAll(), []);
  const countMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of records) m[r.date] = r.count;
    return m;
  }, [records]);

  const grid = useMemo(() => buildGrid(), []);
  const total = useMemo(() => records.reduce((s, r) => s + r.count, 0), [records]);
  const streak = useMemo(() => {
    let s = 0;
    const today = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      if (countMap[ds]) s++;
      else if (ds !== today) break;
    }
    return s;
  }, [countMap]);

  // Group days into week columns (each column = 7 days, starting Sunday)
  const startDow = new Date(grid[0].date).getDay(); // 0=Sun
  const paddedGrid = [...Array(startDow).fill(null), ...grid];
  const weeks: (typeof grid[0] | null)[][] = [];
  for (let i = 0; i < paddedGrid.length; i += 7) {
    weeks.push(paddedGrid.slice(i, i + 7) as (typeof grid[0] | null)[]);
  }

  // Month labels: find first day of each month in weeks
  const monthLabels: { col: number; label: string }[] = [];
  weeks.forEach((week, col) => {
    week.forEach(day => {
      if (day && day.date.endsWith('-01')) {
        const m = new Date(day.date).getMonth();
        monthLabels.push({ col, label: MONTHS[m] });
      }
    });
  });

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', paddingTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: '0 0 0.4rem 0', fontSize: '1.8rem' }}>Memory Heatmap</h2>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
            Your recall consistency over the past 52 weeks
          </p>
        </div>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <Stat label="Total Reviews" value={total.toString()} />
          <Stat label="Current Streak" value={`${streak}d`} highlight={streak >= 3} />
          <Stat label="Active Days" value={records.filter(r => r.count > 0).length.toString()} />
        </div>
      </div>

      {total === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-secondary)' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>No review history yet.</p>
          <Link to="/review" style={{ color: 'var(--color-accent-terracotta)', textDecoration: 'none', fontWeight: 500 }}>
            Start your first review session →
          </Link>
        </div>
      ) : (
        <>
          {/* Month row */}
          <div style={{ display: 'flex', marginLeft: '32px', marginBottom: '4px', gap: '2px' }}>
            {weeks.map((_, col) => {
              const ml = monthLabels.find(m => m.col === col);
              return (
                <div key={col} style={{ width: '14px', fontSize: '0.65rem', color: 'var(--color-text-secondary)', textAlign: 'center', overflow: 'visible', whiteSpace: 'nowrap' }}>
                  {ml ? ml.label : ''}
                </div>
              );
            })}
          </div>

          {/* Grid: DOW rows × week columns */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Day-of-week labels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', justifyContent: 'space-around', paddingTop: '2px' }}>
              {DOW_LABELS.map((d, i) => (
                <div key={i} style={{ height: '14px', width: '24px', fontSize: '0.6rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center' }}>
                  {i % 2 === 1 ? d : ''}
                </div>
              ))}
            </div>

            {/* Weeks */}
            <div style={{ display: 'flex', gap: '2px', overflowX: 'auto' }}>
              {weeks.map((week, col) => (
                <div key={col} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {week.map((day, row) => {
                    if (!day) return <div key={row} style={{ width: '14px', height: '14px' }} />;
                    const count = countMap[day.date] || 0;
                    return (
                      <div
                        key={row}
                        title={`${day.label}: ${count} review${count !== 1 ? 's' : ''}`}
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '3px',
                          backgroundColor: cellColor(count),
                          cursor: 'default',
                          transition: 'transform 0.1s'
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.3)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1rem', justifyContent: 'flex-end', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            <span>Less</span>
            {[0, 2, 5, 10, 15].map(n => (
              <div key={n} style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: cellColor(n) }} />
            ))}
            <span>More</span>
          </div>

          {/* Recent activity */}
          {records.length > 0 && (
            <div style={{ marginTop: '3rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>Recent Activity</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[...records].reverse().slice(0, 14).map(r => (
                  <div key={r.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 1rem', backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                      {new Date(r.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem' }}>
                      <GradePill label="Again" count={r.grades.again} color="#B91C1C" bg="#FEE2E2" />
                      <GradePill label="Hard" count={r.grades.hard} color="#92400E" bg="#FEF3C7" />
                      <GradePill label="Good" count={r.grades.good} color="#4D7C0F" bg="#ECFCCB" />
                      <GradePill label="Easy" count={r.grades.easy} color="#1E40AF" bg="#DBEAFE" />
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '0.9rem' }}>{r.count} reviewed</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1.8rem', fontWeight: 600, color: highlight ? 'var(--color-accent-terracotta)' : 'var(--color-text)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  );
}

function GradePill({ label, count, color, bg }: { label: string; count: number; color: string; bg: string }) {
  if (count === 0) return null;
  return (
    <span style={{ backgroundColor: bg, color, padding: '0.15rem 0.5rem', borderRadius: '1rem', fontWeight: 500 }}>
      {count} {label}
    </span>
  );
}
