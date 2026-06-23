import { Router } from 'express';
import { getCache, setCache } from '../cache.js';
import db from '../db.js';

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

// Christian holy days 2026–2030 (Easter-derived movable feasts + fixed days)
// Easter dates: 2026-04-05, 2027-03-28, 2028-04-16, 2029-04-01, 2030-04-21
export const CHRISTIAN_HOLIDAYS = [
  // 2026
  { date: '2026-01-06', name: 'Epiphany',         calendarId: 'christian' },
  { date: '2026-02-18', name: 'Ash Wednesday',     calendarId: 'christian' },
  { date: '2026-04-03', name: 'Good Friday',       calendarId: 'christian' },
  { date: '2026-04-04', name: 'Holy Saturday',     calendarId: 'christian' },
  { date: '2026-04-05', name: 'Easter Sunday',     calendarId: 'christian' },
  { date: '2026-04-06', name: 'Easter Monday',     calendarId: 'christian' },
  { date: '2026-05-14', name: 'Ascension Day',     calendarId: 'christian' },
  { date: '2026-05-24', name: 'Pentecost',         calendarId: 'christian' },
  { date: '2026-11-01', name: 'All Saints Day',    calendarId: 'christian' },
  { date: '2026-12-25', name: 'Christmas Day',     calendarId: 'christian' },
  { date: '2026-12-26', name: 'St. Stephen\'s Day',calendarId: 'christian' },
  // 2027
  { date: '2027-01-06', name: 'Epiphany',         calendarId: 'christian' },
  { date: '2027-02-10', name: 'Ash Wednesday',     calendarId: 'christian' },
  { date: '2027-03-26', name: 'Good Friday',       calendarId: 'christian' },
  { date: '2027-03-27', name: 'Holy Saturday',     calendarId: 'christian' },
  { date: '2027-03-28', name: 'Easter Sunday',     calendarId: 'christian' },
  { date: '2027-03-29', name: 'Easter Monday',     calendarId: 'christian' },
  { date: '2027-05-06', name: 'Ascension Day',     calendarId: 'christian' },
  { date: '2027-05-16', name: 'Pentecost',         calendarId: 'christian' },
  { date: '2027-11-01', name: 'All Saints Day',    calendarId: 'christian' },
  { date: '2027-12-25', name: 'Christmas Day',     calendarId: 'christian' },
  { date: '2027-12-26', name: 'St. Stephen\'s Day',calendarId: 'christian' },
  // 2028
  { date: '2028-01-06', name: 'Epiphany',         calendarId: 'christian' },
  { date: '2028-03-01', name: 'Ash Wednesday',     calendarId: 'christian' },
  { date: '2028-04-14', name: 'Good Friday',       calendarId: 'christian' },
  { date: '2028-04-15', name: 'Holy Saturday',     calendarId: 'christian' },
  { date: '2028-04-16', name: 'Easter Sunday',     calendarId: 'christian' },
  { date: '2028-04-17', name: 'Easter Monday',     calendarId: 'christian' },
  { date: '2028-05-25', name: 'Ascension Day',     calendarId: 'christian' },
  { date: '2028-06-04', name: 'Pentecost',         calendarId: 'christian' },
  { date: '2028-11-01', name: 'All Saints Day',    calendarId: 'christian' },
  { date: '2028-12-25', name: 'Christmas Day',     calendarId: 'christian' },
  { date: '2028-12-26', name: 'St. Stephen\'s Day',calendarId: 'christian' },
  // 2029
  { date: '2029-01-06', name: 'Epiphany',         calendarId: 'christian' },
  { date: '2029-02-14', name: 'Ash Wednesday',     calendarId: 'christian' },
  { date: '2029-03-30', name: 'Good Friday',       calendarId: 'christian' },
  { date: '2029-03-31', name: 'Holy Saturday',     calendarId: 'christian' },
  { date: '2029-04-01', name: 'Easter Sunday',     calendarId: 'christian' },
  { date: '2029-04-02', name: 'Easter Monday',     calendarId: 'christian' },
  { date: '2029-05-10', name: 'Ascension Day',     calendarId: 'christian' },
  { date: '2029-05-20', name: 'Pentecost',         calendarId: 'christian' },
  { date: '2029-11-01', name: 'All Saints Day',    calendarId: 'christian' },
  { date: '2029-12-25', name: 'Christmas Day',     calendarId: 'christian' },
  { date: '2029-12-26', name: 'St. Stephen\'s Day',calendarId: 'christian' },
  // 2030
  { date: '2030-01-06', name: 'Epiphany',         calendarId: 'christian' },
  { date: '2030-03-06', name: 'Ash Wednesday',     calendarId: 'christian' },
  { date: '2030-04-19', name: 'Good Friday',       calendarId: 'christian' },
  { date: '2030-04-20', name: 'Holy Saturday',     calendarId: 'christian' },
  { date: '2030-04-21', name: 'Easter Sunday',     calendarId: 'christian' },
  { date: '2030-04-22', name: 'Easter Monday',     calendarId: 'christian' },
  { date: '2030-05-30', name: 'Ascension Day',     calendarId: 'christian' },
  { date: '2030-06-09', name: 'Pentecost',         calendarId: 'christian' },
  { date: '2030-11-01', name: 'All Saints Day',    calendarId: 'christian' },
  { date: '2030-12-25', name: 'Christmas Day',     calendarId: 'christian' },
  { date: '2030-12-26', name: 'St. Stephen\'s Day',calendarId: 'christian' },
];

// Jain holy days 2026–2030 (Vikram Samvat lunar calendar, dates per almanac)
// Note: exact dates can shift ±1 day depending on regional Panchang
export const JAIN_HOLIDAYS = [
  // 2026
  { date: '2026-04-02', name: 'Mahavir Jayanti',              calendarId: 'jain' },
  { date: '2026-04-22', name: 'Akshaya Tritiya',              calendarId: 'jain' },
  { date: '2026-07-10', name: 'Guru Purnima (Jain)',          calendarId: 'jain' },
  { date: '2026-08-30', name: 'Paryushana Samvatsari',        calendarId: 'jain' },
  { date: '2026-09-01', name: 'Das Lakshana (end)',           calendarId: 'jain' },
  { date: '2026-10-20', name: 'Jain Diwali — Mahavir Nirvana', calendarId: 'jain' },
  { date: '2026-10-21', name: 'Jain New Year',                calendarId: 'jain' },
  { date: '2026-11-05', name: 'Kartiki Purnima (Jain)',       calendarId: 'jain' },
  // 2027
  { date: '2027-03-22', name: 'Mahavir Jayanti',              calendarId: 'jain' },
  { date: '2027-05-10', name: 'Akshaya Tritiya',              calendarId: 'jain' },
  { date: '2027-09-17', name: 'Paryushana Samvatsari',        calendarId: 'jain' },
  { date: '2027-09-19', name: 'Das Lakshana (end)',           calendarId: 'jain' },
  { date: '2027-11-09', name: 'Jain Diwali — Mahavir Nirvana', calendarId: 'jain' },
  { date: '2027-11-10', name: 'Jain New Year',                calendarId: 'jain' },
  // 2028
  { date: '2028-04-09', name: 'Mahavir Jayanti',              calendarId: 'jain' },
  { date: '2028-04-29', name: 'Akshaya Tritiya',              calendarId: 'jain' },
  { date: '2028-09-05', name: 'Paryushana Samvatsari',        calendarId: 'jain' },
  { date: '2028-09-07', name: 'Das Lakshana (end)',           calendarId: 'jain' },
  { date: '2028-10-28', name: 'Jain Diwali — Mahavir Nirvana', calendarId: 'jain' },
  { date: '2028-10-29', name: 'Jain New Year',                calendarId: 'jain' },
  // 2029
  { date: '2029-03-30', name: 'Mahavir Jayanti',              calendarId: 'jain' },
  { date: '2029-05-19', name: 'Akshaya Tritiya',              calendarId: 'jain' },
  { date: '2029-09-24', name: 'Paryushana Samvatsari',        calendarId: 'jain' },
  { date: '2029-09-26', name: 'Das Lakshana (end)',           calendarId: 'jain' },
  { date: '2029-10-18', name: 'Jain Diwali — Mahavir Nirvana', calendarId: 'jain' },
  { date: '2029-10-19', name: 'Jain New Year',                calendarId: 'jain' },
  // 2030
  { date: '2030-04-18', name: 'Mahavir Jayanti',              calendarId: 'jain' },
  { date: '2030-05-08', name: 'Akshaya Tritiya',              calendarId: 'jain' },
  { date: '2030-09-14', name: 'Paryushana Samvatsari',        calendarId: 'jain' },
  { date: '2030-09-16', name: 'Das Lakshana (end)',           calendarId: 'jain' },
  { date: '2030-11-06', name: 'Jain Diwali — Mahavir Nirvana', calendarId: 'jain' },
  { date: '2030-11-07', name: 'Jain New Year',                calendarId: 'jain' },
];

// Hindu festival calendar 2026–2030 (religious observances, Vikram Samvat dates)
const HINDU_HOLIDAYS = [
  // 2026
  { date: '2026-01-14', name: 'Makar Sankranti' },
  { date: '2026-02-03', name: 'Basant Panchami' },
  { date: '2026-02-26', name: 'Maha Shivaratri' },
  { date: '2026-04-06', name: 'Ram Navami' },
  { date: '2026-04-22', name: 'Akshaya Tritiya' },
  { date: '2026-04-25', name: 'Hanuman Jayanti' },
  { date: '2026-07-10', name: 'Guru Purnima' },
  { date: '2026-08-16', name: 'Janmashtami' },
  { date: '2026-08-19', name: 'Ganesh Chaturthi' },
  { date: '2026-10-15', name: 'Navratri begins' },
  { date: '2026-10-18', name: 'Dhanteras' },
  { date: '2026-10-20', name: 'Diwali' },
  { date: '2026-10-22', name: 'Bhai Dooj' },
  { date: '2026-10-24', name: 'Dussehra' },
  { date: '2026-10-29', name: 'Karva Chauth' },
  // 2027
  { date: '2027-01-14', name: 'Makar Sankranti' },
  { date: '2027-01-22', name: 'Basant Panchami' },
  { date: '2027-02-17', name: 'Maha Shivaratri' },
  { date: '2027-03-26', name: 'Ram Navami' },
  { date: '2027-04-13', name: 'Hanuman Jayanti' },
  { date: '2027-05-10', name: 'Akshaya Tritiya' },
  { date: '2027-07-29', name: 'Guru Purnima' },
  { date: '2027-08-10', name: 'Janmashtami' },
  { date: '2027-09-02', name: 'Ganesh Chaturthi' },
  { date: '2027-10-04', name: 'Navratri begins' },
  { date: '2027-10-13', name: 'Dussehra' },
  { date: '2027-10-28', name: 'Karva Chauth' },
  { date: '2027-11-07', name: 'Dhanteras' },
  { date: '2027-11-09', name: 'Diwali' },
  { date: '2027-11-11', name: 'Bhai Dooj' },
  // 2028
  { date: '2028-01-15', name: 'Makar Sankranti' },
  { date: '2028-02-10', name: 'Basant Panchami' },
  { date: '2028-03-07', name: 'Maha Shivaratri' },
  { date: '2028-04-14', name: 'Ram Navami' },
  { date: '2028-04-29', name: 'Akshaya Tritiya' },
  { date: '2028-07-17', name: 'Guru Purnima' },
  { date: '2028-08-30', name: 'Janmashtami' },
  { date: '2028-09-22', name: 'Ganesh Chaturthi' },
  { date: '2028-10-22', name: 'Navratri begins' },
  { date: '2028-11-01', name: 'Dussehra' },
  { date: '2028-10-26', name: 'Dhanteras' },
  { date: '2028-10-28', name: 'Diwali' },
  { date: '2028-10-30', name: 'Bhai Dooj' },
  // 2029
  { date: '2029-01-14', name: 'Makar Sankranti' },
  { date: '2029-01-30', name: 'Basant Panchami' },
  { date: '2029-02-25', name: 'Maha Shivaratri' },
  { date: '2029-04-04', name: 'Ram Navami' },
  { date: '2029-05-19', name: 'Akshaya Tritiya' },
  { date: '2029-07-06', name: 'Guru Purnima' },
  { date: '2029-08-20', name: 'Janmashtami' },
  { date: '2029-09-11', name: 'Ganesh Chaturthi' },
  { date: '2029-10-10', name: 'Navratri begins' },
  { date: '2029-10-19', name: 'Dussehra' },
  { date: '2029-10-16', name: 'Dhanteras' },
  { date: '2029-10-18', name: 'Diwali' },
  { date: '2029-10-20', name: 'Bhai Dooj' },
  // 2030
  { date: '2030-01-14', name: 'Makar Sankranti' },
  { date: '2030-02-18', name: 'Basant Panchami' },
  { date: '2030-03-16', name: 'Maha Shivaratri' },
  { date: '2030-03-24', name: 'Ram Navami' },
  { date: '2030-05-08', name: 'Akshaya Tritiya' },
  { date: '2030-07-25', name: 'Guru Purnima' },
  { date: '2030-09-09', name: 'Janmashtami' },
  { date: '2030-09-30', name: 'Ganesh Chaturthi' },
  { date: '2030-10-28', name: 'Navratri begins' },
  { date: '2030-11-07', name: 'Dussehra' },
  { date: '2030-11-04', name: 'Dhanteras' },
  { date: '2030-11-06', name: 'Diwali' },
  { date: '2030-11-08', name: 'Bhai Dooj' },
];

// Sikh / Nanakshahi calendar 2026–2030 (Gurpurabs & cultural dates)
const SIKH_HOLIDAYS = [
  // 2026
  { date: '2026-01-05', name: 'Guru Gobind Singh Ji Gurpurab' },
  { date: '2026-01-14', name: 'Maghi (Muktsar Sahibi)' },
  { date: '2026-03-14', name: 'Hola Mohalla' },
  { date: '2026-04-14', name: 'Vaisakhi / Khalsa Sajna Diwas' },
  { date: '2026-06-16', name: 'Guru Arjan Dev Ji Shaheedi Diwas' },
  { date: '2026-10-20', name: 'Bandi Chhor Divas' },
  { date: '2026-11-05', name: 'Guru Nanak Dev Ji Gurpurab' },
  // 2027
  { date: '2027-01-05', name: 'Guru Gobind Singh Ji Gurpurab' },
  { date: '2027-03-04', name: 'Hola Mohalla' },
  { date: '2027-04-14', name: 'Vaisakhi / Khalsa Sajna Diwas' },
  { date: '2027-06-06', name: 'Guru Arjan Dev Ji Shaheedi Diwas' },
  { date: '2027-11-09', name: 'Bandi Chhor Divas' },
  { date: '2027-11-25', name: 'Guru Nanak Dev Ji Gurpurab' },
  // 2028
  { date: '2028-01-05', name: 'Guru Gobind Singh Ji Gurpurab' },
  { date: '2028-03-22', name: 'Hola Mohalla' },
  { date: '2028-04-14', name: 'Vaisakhi / Khalsa Sajna Diwas' },
  { date: '2028-06-24', name: 'Guru Arjan Dev Ji Shaheedi Diwas' },
  { date: '2028-10-28', name: 'Bandi Chhor Divas' },
  { date: '2028-11-13', name: 'Guru Nanak Dev Ji Gurpurab' },
  // 2029
  { date: '2029-01-05', name: 'Guru Gobind Singh Ji Gurpurab' },
  { date: '2029-03-12', name: 'Hola Mohalla' },
  { date: '2029-04-14', name: 'Vaisakhi / Khalsa Sajna Diwas' },
  { date: '2029-06-13', name: 'Guru Arjan Dev Ji Shaheedi Diwas' },
  { date: '2029-10-18', name: 'Bandi Chhor Divas' },
  { date: '2029-11-03', name: 'Guru Nanak Dev Ji Gurpurab' },
  // 2030
  { date: '2030-01-05', name: 'Guru Gobind Singh Ji Gurpurab' },
  { date: '2030-03-02', name: 'Hola Mohalla' },
  { date: '2030-04-14', name: 'Vaisakhi / Khalsa Sajna Diwas' },
  { date: '2030-06-03', name: 'Guru Arjan Dev Ji Shaheedi Diwas' },
  { date: '2030-11-06', name: 'Bandi Chhor Divas' },
  { date: '2030-11-22', name: 'Guru Nanak Dev Ji Gurpurab' },
];

// Islamic calendar 2026–2030 (approximate — exact dates depend on moon sighting)
const ISLAMIC_HOLIDAYS = [
  // 2026
  { date: '2026-03-20', name: 'Start of Ramadan (approx)' },
  { date: '2026-03-30', name: 'Eid ul-Fitr (approx)' },
  { date: '2026-06-07', name: 'Eid ul-Adha (approx)' },
  { date: '2026-06-27', name: 'Islamic New Year / Muharram 1 (approx)' },
  { date: '2026-07-06', name: 'Ashura / Muharram 10 (approx)' },
  { date: '2026-09-05', name: 'Mawlid al-Nabi (approx)' },
  // 2027
  { date: '2027-03-09', name: 'Start of Ramadan (approx)' },
  { date: '2027-03-19', name: 'Eid ul-Fitr (approx)' },
  { date: '2027-05-27', name: 'Eid ul-Adha (approx)' },
  { date: '2027-06-17', name: 'Islamic New Year / Muharram 1 (approx)' },
  { date: '2027-06-26', name: 'Ashura / Muharram 10 (approx)' },
  { date: '2027-08-25', name: 'Mawlid al-Nabi (approx)' },
  // 2028
  { date: '2028-02-26', name: 'Start of Ramadan (approx)' },
  { date: '2028-03-07', name: 'Eid ul-Fitr (approx)' },
  { date: '2028-05-15', name: 'Eid ul-Adha (approx)' },
  { date: '2028-06-05', name: 'Islamic New Year / Muharram 1 (approx)' },
  { date: '2028-06-14', name: 'Ashura / Muharram 10 (approx)' },
  { date: '2028-08-13', name: 'Mawlid al-Nabi (approx)' },
  // 2029
  { date: '2029-02-14', name: 'Start of Ramadan (approx)' },
  { date: '2029-02-24', name: 'Eid ul-Fitr (approx)' },
  { date: '2029-05-04', name: 'Eid ul-Adha (approx)' },
  { date: '2029-05-25', name: 'Islamic New Year / Muharram 1 (approx)' },
  { date: '2029-06-03', name: 'Ashura / Muharram 10 (approx)' },
  { date: '2029-08-02', name: 'Mawlid al-Nabi (approx)' },
  // 2030
  { date: '2030-02-03', name: 'Start of Ramadan (approx)' },
  { date: '2030-02-13', name: 'Eid ul-Fitr (approx)' },
  { date: '2030-04-24', name: 'Eid ul-Adha (approx)' },
  { date: '2030-05-15', name: 'Islamic New Year / Muharram 1 (approx)' },
  { date: '2030-05-24', name: 'Ashura / Muharram 10 (approx)' },
  { date: '2030-07-22', name: 'Mawlid al-Nabi (approx)' },
];

// Thai Buddhist holy days 2026–2030 (lunar calendar, approximate)
const THAI_BUDDHIST_HOLIDAYS = [
  // 2026
  { date: '2026-02-12', name: 'Makha Bucha Day' },
  { date: '2026-05-11', name: 'Visakha Bucha Day' },
  { date: '2026-07-10', name: 'Asalha Bucha Day' },
  { date: '2026-07-11', name: 'Khao Phansa (Buddhist Lent begins)' },
  { date: '2026-10-08', name: 'Ok Phansa (Buddhist Lent ends)' },
  // 2027
  { date: '2027-03-03', name: 'Makha Bucha Day' },
  { date: '2027-05-30', name: 'Visakha Bucha Day' },
  { date: '2027-07-29', name: 'Asalha Bucha Day' },
  { date: '2027-07-30', name: 'Khao Phansa (Buddhist Lent begins)' },
  { date: '2027-10-26', name: 'Ok Phansa (Buddhist Lent ends)' },
  // 2028
  { date: '2028-02-21', name: 'Makha Bucha Day' },
  { date: '2028-05-18', name: 'Visakha Bucha Day' },
  { date: '2028-07-17', name: 'Asalha Bucha Day' },
  { date: '2028-07-18', name: 'Khao Phansa (Buddhist Lent begins)' },
  { date: '2028-10-14', name: 'Ok Phansa (Buddhist Lent ends)' },
  // 2029
  { date: '2029-03-12', name: 'Makha Bucha Day' },
  { date: '2029-06-06', name: 'Visakha Bucha Day' },
  { date: '2029-08-05', name: 'Asalha Bucha Day' },
  { date: '2029-08-06', name: 'Khao Phansa (Buddhist Lent begins)' },
  { date: '2029-11-02', name: 'Ok Phansa (Buddhist Lent ends)' },
  // 2030
  { date: '2030-03-01', name: 'Makha Bucha Day' },
  { date: '2030-05-26', name: 'Visakha Bucha Day' },
  { date: '2030-07-25', name: 'Asalha Bucha Day' },
  { date: '2030-07-26', name: 'Khao Phansa (Buddhist Lent begins)' },
  { date: '2030-10-22', name: 'Ok Phansa (Buddhist Lent ends)' },
];

const PACK_DATA = {
  christian:       CHRISTIAN_HOLIDAYS,
  jain:            JAIN_HOLIDAYS,
  hindu:           HINDU_HOLIDAYS,
  sikh:            SIKH_HOLIDAYS,
  islamic:         ISLAMIC_HOLIDAYS,
  'thai-buddhist': THAI_BUDDHIST_HOLIDAYS,
};

const CUSTOM_BY_COUNTRY = { IN: INDIA_CUSTOM, TH: THAI_CUSTOM };

// GET /multi?year=2026&calendars=IN,TH,christian,jain
router.get('/multi', async (req, res) => {
  const { year, calendars } = req.query;
  if (!year || !calendars) return res.status(400).json({ error: 'year and calendars required' });
  const calList = calendars.split(',').map(c => c.trim()).filter(Boolean);
  const y = String(parseInt(year, 10));
  if (y === 'NaN') return res.status(400).json({ error: 'Invalid year' });

  const cacheKey = `holidays-multi-${y}-${[...calList].sort().join(',')}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  const results = [];

  for (const calId of calList) {
    if (['christian', 'jain', 'hindu', 'sikh', 'islamic', 'thai-buddhist'].includes(calId)) {
      try {
        const { rows } = await db.query(
          `SELECT name, event_date::text AS date FROM festivals
           WHERE calendar = $1 AND event_date >= $2 AND event_date <= $3`,
          [calId, `${y}-01-01`, `${y}-12-31`]
        );
        results.push(
          ...rows.map(h => ({
            date: h.date,
            name: h.name,
            nameEn: h.name,
            calendarId: calId,
            country: null
          }))
        );
      } catch (e) {
        console.error('[holidays/multi] DB error:', e);
      }
      continue;
    }
    const cc = calId.toUpperCase();
    if (!/^[A-Z]{2}$/.test(cc)) continue;
    try {
      let official = [];
      try {
        const r = await fetch(
          `https://date.nager.at/api/v3/PublicHolidays/${y}/${cc}`,
          { signal: AbortSignal.timeout(8000) }
        );
        if (r.ok) {
          const raw = await r.json();
          official = raw.map(h => ({ date: h.date, name: h.localName, nameEn: h.name, country: cc, calendarId: cc }));
        }
      } catch {}
      
      const dbCalName = cc === 'IN' ? 'indian' : (cc === 'TH' ? 'thai' : cc.toLowerCase());
      let custom = [];
      try {
        const { rows } = await db.query(
          `SELECT name, event_date::text AS date FROM festivals
           WHERE calendar = $1 AND event_date >= $2 AND event_date <= $3`,
          [dbCalName, `${y}-01-01`, `${y}-12-31`]
        );
        custom = rows.map(h => ({
          date: h.date,
          name: h.name,
          nameEn: h.name,
          country: cc,
          calendarId: cc
        }));
      } catch (e) {
        console.error('[holidays/multi] DB error:', e);
      }

      const offKeys = new Set(official.map(h => `${h.date}:${h.nameEn.toLowerCase().slice(0, 12)}`));
      const extra = custom
        .filter(h => !offKeys.has(`${h.date}:${(h.nameEn || '').toLowerCase().slice(0, 12)}`))
        .map(h => ({ ...h, calendarId: cc }));
      results.push(...official, ...extra);
    } catch {}
  }

  results.sort((a, b) => a.date.localeCompare(b.date));
  setCache(cacheKey, results, 24 * 60 * 60 * 1000);
  res.json(results);
});

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

    const dbCalName = cc === 'IN' ? 'indian' : (cc === 'TH' ? 'thai' : cc.toLowerCase());
    let custom = [];
    try {
      const { rows } = await db.query(
        `SELECT name, event_date::text AS date FROM festivals
         WHERE calendar = $1 AND event_date >= $2 AND event_date <= $3`,
        [dbCalName, `${year}-01-01`, `${year}-12-31`]
      );
      custom = rows.map(h => ({
        date: h.date,
        name: h.name,
        nameEn: h.name,
        country: cc
      }));
    } catch (e) {
      console.error('[holidays/:year/:country] DB error:', e);
    }

    // Deduplicate: skip custom entries that already have the same date+name in official
    const officialKeys = new Set(official.map(h => `${h.date}:${h.nameEn.toLowerCase().slice(0, 12)}`));
    const extra = custom.filter(h => !officialKeys.has(`${h.date}:${(h.nameEn||'').toLowerCase().slice(0, 12)}`));

    const data = [...official, ...extra].sort((a, b) => a.date.localeCompare(b.date));

    setCache(key, data, TTL);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router;
