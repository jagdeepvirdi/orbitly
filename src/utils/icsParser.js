function unfold(text) {
  return text.replace(/\r\n[ \t]/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function getProp(block, key) {
  const re = new RegExp(`^${key}(?:;[^:]*)?:(.+)$`, 'im');
  const m = block.match(re);
  return m ? m[1].trim() : '';
}

function parseDT(dtstr) {
  if (!dtstr) return { date: '', time: '' };
  if (/^\d{8}$/.test(dtstr))
    return { date: `${dtstr.slice(0,4)}-${dtstr.slice(4,6)}-${dtstr.slice(6,8)}`, time: '' };
  const m = dtstr.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (m) return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}` };
  return { date: '', time: '' };
}

export function parseICS(text) {
  const unfolded = unfold(text);
  const blocks = unfolded.split('BEGIN:VEVENT').slice(1);
  const events = [];

  for (const block of blocks) {
    const summary = getProp(block, 'SUMMARY');
    if (!summary) continue;
    const dtstart = getProp(block, 'DTSTART');
    const dtend   = getProp(block, 'DTEND');
    const description = getProp(block, 'DESCRIPTION');
    const location    = getProp(block, 'LOCATION');
    const uid         = getProp(block, 'UID');
    const { date, time }    = parseDT(dtstart);
    const { time: endTime } = parseDT(dtend);
    if (!date) continue;
    events.push({
      id: uid || ('ics-' + Math.random().toString(36).slice(2)),
      title:       summary,
      date,
      time,
      endTime,
      description: description.replace(/\\n/g, ' ').replace(/\\,/g, ',').trim(),
      location:    location.replace(/\\,/g, ',').trim(),
    });
  }

  return events;
}
