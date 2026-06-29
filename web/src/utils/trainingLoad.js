export function calcTrainingLoad(tssData, endDate) {
  const CTL_K = Math.exp(-1 / 42);
  const ATL_K = Math.exp(-1 / 7);
  const tssMap = {};
  tssData.forEach((d) => {
    tssMap[d.date] = { tss: d.tss, note: d.note };
  });

  const start = new Date(tssData[0].date);
  const today = new Date().toISOString().split('T')[0];
  const lastEntry = tssData[tssData.length - 1].date;
  const resolvedEnd = endDate ?? (lastEntry > today ? lastEntry : today);
  const end = new Date(resolvedEnd);
  const results = [];
  let ctl = 0,
    atl = 0;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split('T')[0];
    const day = tssMap[key];
    const tss = day ? day.tss : 0;
    ctl = ctl * CTL_K + tss * (1 - CTL_K);
    atl = atl * ATL_K + tss * (1 - ATL_K);
    results.push({
      date: key.slice(5).replace('-', '/'),
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round((ctl - atl) * 10) / 10,
      tss,
      note: day ? day.note : '',
    });
  }
  return results;
}

export function deriveTargets(hr130Series) {
  const clean = hr130Series.filter((p) => p.type === 'actual');
  const anchor = clean.length ? clean[clean.length - 1].watts : 150;
  // UT1 = train AT the HR130 anchor (you row to HR130, watts land here).
  // UT2 = genuinely easy, ~86% of anchor. Pacer cue = anchor as early visual.
  return {
    anchor,
    ut1Low: Math.round(anchor * 0.96),
    ut1High: Math.round(anchor * 1.02),
    ut2Low: Math.round(anchor * 0.83),
    ut2High: Math.round(anchor * 0.9),
    pacerCue: anchor,
    source: clean.length
      ? `${clean.length} clean HR130 points, latest ${anchor}W`
      : 'default (no clean points)',
  };
}
