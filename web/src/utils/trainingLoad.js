export function calcTrainingLoad(tssData) {
  const CTL_K = Math.exp(-1 / 42);
  const ATL_K = Math.exp(-1 / 7);
  const tssMap = {};
  tssData.forEach((d) => {
    tssMap[d.date] = { tss: d.tss, note: d.note };
  });

  const start = new Date(tssData[0].date);
  const end = new Date('2026-06-13');
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
