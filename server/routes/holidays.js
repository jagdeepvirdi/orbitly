import { Router } from 'express';
import { getCache, setCache } from '../cache.js';

const router = Router();
const TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Comprehensive Indian festivals (cultural/religious) not covered by Nager API
const INDIA_CUSTOM = [
  // 2026
  { date: '2026-01-01', name: 'New Year\'s Day', country: 'IN', nameEn: 'New Year\'s Day' },
  { date: '2026-01-13', name: 'Lohri', country: 'IN', nameEn: 'Lohri' },
  { date: '2026-01-14', name: 'Makar Sankranti', country: 'IN', nameEn: 'Makar Sankranti' },
  { date: '2026-01-14', name: 'Pongal', country: 'IN', nameEn: 'Pongal' },
  { date: '2026-02-26', name: 'Maha Shivaratri', country: 'IN', nameEn: 'Maha Shivaratri' },
  { date: '2026-03-14', name: 'Holi', country: 'IN', nameEn: 'Holi' },
  { date: '2026-03-30', name: 'Eid ul-Fitr (approx)', country: 'IN', nameEn: 'Eid ul-Fitr' },
  { date: '2026-04-06', name: 'Ram Navami', country: 'IN', nameEn: 'Ram Navami' },
  { date: '2026-04-14', name: 'Baisakhi', country: 'IN', nameEn: 'Baisakhi' },
  { date: '2026-04-25', name: 'Hanuman Jayanti', country: 'IN', nameEn: 'Hanuman Jayanti' },
  { date: '2026-05-12', name: 'Buddha Purnima', country: 'IN', nameEn: 'Buddha Purnima' },
  { date: '2026-06-07', name: 'Eid ul-Adha (approx)', country: 'IN', nameEn: 'Eid ul-Adha' },
  { date: '2026-07-10', name: 'Guru Purnima', country: 'IN', nameEn: 'Guru Purnima' },
  { date: '2026-08-16', name: 'Janmashtami', country: 'IN', nameEn: 'Janmashtami' },
  { date: '2026-08-19', name: 'Ganesh Chaturthi', country: 'IN', nameEn: 'Ganesh Chaturthi' },
  { date: '2026-08-28', name: 'Raksha Bandhan', country: 'IN', nameEn: 'Raksha Bandhan' },
  { date: '2026-10-15', name: 'Navratri begins', country: 'IN', nameEn: 'Navratri' },
  { date: '2026-10-18', name: 'Dhanteras', country: 'IN', nameEn: 'Dhanteras' },
  { date: '2026-10-20', name: 'Diwali', country: 'IN', nameEn: 'Diwali' },
  { date: '2026-10-22', name: 'Bhai Dooj', country: 'IN', nameEn: 'Bhai Dooj' },
  { date: '2026-10-24', name: 'Dussehra', country: 'IN', nameEn: 'Dussehra' },
  { date: '2026-10-29', name: 'Karva Chauth', country: 'IN', nameEn: 'Karva Chauth' },
  { date: '2026-11-05', name: 'Guru Nanak Jayanti', country: 'IN', nameEn: 'Guru Nanak Jayanti' },
  { date: '2026-12-25', name: 'Christmas', country: 'IN', nameEn: 'Christmas' },
  // 2027
  { date: '2027-01-01', name: 'New Year\'s Day', country: 'IN', nameEn: 'New Year\'s Day' },
  { date: '2027-01-13', name: 'Lohri', country: 'IN', nameEn: 'Lohri' },
  { date: '2027-01-14', name: 'Makar Sankranti', country: 'IN', nameEn: 'Makar Sankranti' },
  { date: '2027-03-03', name: 'Holi', country: 'IN', nameEn: 'Holi' },
  { date: '2027-04-14', name: 'Baisakhi', country: 'IN', nameEn: 'Baisakhi' },
  { date: '2027-08-28', name: 'Raksha Bandhan', country: 'IN', nameEn: 'Raksha Bandhan' },
  { date: '2027-11-09', name: 'Diwali', country: 'IN', nameEn: 'Diwali' },
  { date: '2027-12-25', name: 'Christmas', country: 'IN', nameEn: 'Christmas' },
];

// Comprehensive Thai holidays/festivals not fully covered by Nager API
const THAI_CUSTOM = [
  // 2026
  { date: '2026-01-01', name: 'วันขึ้นปีใหม่', country: 'TH', nameEn: 'New Year\'s Day' },
  { date: '2026-02-12', name: 'วันมาฆบูชา', country: 'TH', nameEn: 'Makha Bucha Day' },
  { date: '2026-04-06', name: 'วันจักรี', country: 'TH', nameEn: 'Chakri Memorial Day' },
  { date: '2026-04-13', name: 'วันสงกรานต์', country: 'TH', nameEn: 'Songkran Festival' },
  { date: '2026-04-14', name: 'วันสงกรานต์', country: 'TH', nameEn: 'Songkran Festival (Day 2)' },
  { date: '2026-04-15', name: 'วันสงกรานต์', country: 'TH', nameEn: 'Songkran Festival (Day 3)' },
  { date: '2026-05-01', name: 'วันแรงงาน', country: 'TH', nameEn: 'Labour Day' },
  { date: '2026-05-04', name: 'วันฉัตรมงคล', country: 'TH', nameEn: 'Coronation Day' },
  { date: '2026-05-11', name: 'วันวิสาขบูชา', country: 'TH', nameEn: 'Visakha Bucha Day' },
  { date: '2026-06-03', name: 'วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี', country: 'TH', nameEn: 'Queen Suthida\'s Birthday' },
  { date: '2026-07-10', name: 'วันอาสาฬหบูชา', country: 'TH', nameEn: 'Asalha Bucha Day' },
  { date: '2026-07-11', name: 'วันเข้าพรรษา', country: 'TH', nameEn: 'Buddhist Lent Day' },
  { date: '2026-07-28', name: 'วันเฉลิมพระชนมพรรษา ร.10', country: 'TH', nameEn: 'HM King Vajiralongkorn\'s Birthday' },
  { date: '2026-08-12', name: 'วันแม่แห่งชาติ', country: 'TH', nameEn: 'HM Queen Sirikit\'s Birthday / Mother\'s Day' },
  { date: '2026-10-13', name: 'วันสวรรคตพระบาทสมเด็จพระปรมินทรมหาภูมิพลอดุลยเดช', country: 'TH', nameEn: 'Passing of HM King Bhumibol Adulyadej' },
  { date: '2026-10-23', name: 'วันปิยมหาราช', country: 'TH', nameEn: 'Chulalongkorn Day' },
  { date: '2026-11-02', name: 'วันลอยกระทง', country: 'TH', nameEn: 'Loy Krathong Festival' },
  { date: '2026-12-05', name: 'วันชาติ / วันพ่อแห่งชาติ', country: 'TH', nameEn: 'National Day / Father\'s Day' },
  { date: '2026-12-10', name: 'วันรัฐธรรมนูญ', country: 'TH', nameEn: 'Constitution Day' },
  { date: '2026-12-31', name: 'วันสิ้นปี', country: 'TH', nameEn: 'New Year\'s Eve' },
  // 2027
  { date: '2027-01-01', name: 'วันขึ้นปีใหม่', country: 'TH', nameEn: 'New Year\'s Day' },
  { date: '2027-04-13', name: 'วันสงกรานต์', country: 'TH', nameEn: 'Songkran Festival' },
  { date: '2027-04-14', name: 'วันสงกรานต์', country: 'TH', nameEn: 'Songkran Festival (Day 2)' },
  { date: '2027-04-15', name: 'วันสงกรานต์', country: 'TH', nameEn: 'Songkran Festival (Day 3)' },
  { date: '2027-07-28', name: 'วันเฉลิมพระชนมพรรษา ร.10', country: 'TH', nameEn: 'HM King Vajiralongkorn\'s Birthday' },
  { date: '2027-08-12', name: 'วันแม่แห่งชาติ', country: 'TH', nameEn: 'Mother\'s Day' },
  { date: '2027-10-23', name: 'วันปิยมหาราช', country: 'TH', nameEn: 'Chulalongkorn Day' },
  { date: '2027-11-21', name: 'วันลอยกระทง', country: 'TH', nameEn: 'Loy Krathong Festival' },
  { date: '2027-12-05', name: 'วันชาติ', country: 'TH', nameEn: 'National Day' },
  { date: '2027-12-10', name: 'วันรัฐธรรมนูญ', country: 'TH', nameEn: 'Constitution Day' },
];

const CUSTOM_BY_COUNTRY = { IN: INDIA_CUSTOM, TH: THAI_CUSTOM };

router.get('/:year/:country', async (req, res) => {
  const { year, country } = req.params;
  const cc = country.toUpperCase();
  const key = `holidays-${year}-${cc}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);

  try {
    // Fetch official public holidays from Nager
    let official = [];
    try {
      const r = await fetch(
        `https://date.nager.at/api/v3/PublicHolidays/${year}/${cc}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (r.ok) {
        const raw = await r.json();
        official = raw.map(h => ({
          date: h.date,
          name: h.localName,
          nameEn: h.name,
          country: cc,
          types: h.types || [],
        }));
      }
    } catch {}

    // Merge with our custom dataset for this country
    const custom = (CUSTOM_BY_COUNTRY[cc] || []).filter(h => h.date.startsWith(year));

    // Deduplicate: skip custom entries that already have the same date+name in official
    const officialKeys = new Set(official.map(h => `${h.date}:${h.nameEn.toLowerCase().slice(0, 12)}`));
    const extra = custom.filter(h => !officialKeys.has(`${h.date}:${(h.nameEn||'').toLowerCase().slice(0, 12)}`));

    const data = [...official, ...extra].sort((a, b) => a.date.localeCompare(b.date));

    setCache(key, data, TTL);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
