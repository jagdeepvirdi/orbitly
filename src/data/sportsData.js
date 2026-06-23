export const F1_CALENDAR = [
  { round: 9, gp: 'Canadian Grand Prix', circuit: 'Circuit Gilles-Villeneuve', date: '14 Jun 2026', year: 2026, month: 5, day: 14 },
  { round: 10, gp: 'Spanish Grand Prix', circuit: 'Circuit de Barcelona-Catalunya', date: '28 Jun 2026', year: 2026, month: 5, day: 28 },
  { round: 11, gp: 'Austrian Grand Prix', circuit: 'Red Bull Ring', date: '5 Jul 2026', year: 2026, month: 6, day: 5 },
  { round: 12, gp: 'British Grand Prix', circuit: 'Silverstone', date: '19 Jul 2026', year: 2026, month: 6, day: 19 },
  { round: 13, gp: 'Hungarian Grand Prix', circuit: 'Hungaroring', date: '2 Aug 2026', year: 2026, month: 7, day: 2 },
  { round: 14, gp: 'Belgian Grand Prix', circuit: 'Circuit de Spa-Francorchamps', date: '30 Aug 2026', year: 2026, month: 7, day: 30 },
];

export const F1_DRIVERS = [
  { pos: 1, name: 'Max Verstappen',  team: 'Red Bull',  pts: 186, wins: 5, color: '#0600ef' },
  { pos: 2, name: 'Charles Leclerc', team: 'Ferrari',   pts: 172, wins: 2, color: '#dc143c' },
  { pos: 3, name: 'Lando Norris',    team: 'McLaren',   pts: 163, wins: 1, color: '#ff8000' },
  { pos: 4, name: 'Carlos Sainz',    team: 'Ferrari',   pts: 141, wins: 0, color: '#dc143c' },
  { pos: 5, name: 'George Russell',  team: 'Mercedes',  pts: 128, wins: 0, color: '#00d2be' },
  { pos: 6, name: 'Oscar Piastri',   team: 'McLaren',   pts:  84, wins: 0, color: '#ff8000' },
  { pos: 7, name: 'Fernando Alonso', team: 'Aston Martin', pts: 68, wins: 0, color: '#006f62' },
  { pos: 8, name: 'Sergio Pérez',    team: 'Red Bull',  pts:  62, wins: 0, color: '#0600ef' },
  { pos: 9, name: 'Lewis Hamilton',  team: 'Ferrari',   pts:  55, wins: 0, color: '#dc143c' },
  { pos:10, name: 'Lance Stroll',    team: 'Aston Martin', pts: 34, wins: 0, color: '#006f62' },
];

export const F1_CONSTRUCTORS = [
  { pos: 1, name: 'Ferrari',       pts: 368, wins: 2, color: '#dc143c' },
  { pos: 2, name: 'Red Bull',      pts: 248, wins: 5, color: '#0600ef' },
  { pos: 3, name: 'McLaren',       pts: 247, wins: 1, color: '#ff8000' },
  { pos: 4, name: 'Mercedes',      pts: 183, wins: 0, color: '#00d2be' },
  { pos: 5, name: 'Aston Martin',  pts: 102, wins: 0, color: '#006f62' },
  { pos: 6, name: 'Alpine',        pts:  48, wins: 0, color: '#0090ff' },
  { pos: 7, name: 'Williams',      pts:  22, wins: 0, color: '#005aff' },
  { pos: 8, name: 'Haas F1 Team',  pts:  14, wins: 0, color: '#b6babd' },
];

// Last 3 completed race winners (seed data — replaced by live API)
export const F1_RACE_RESULTS = [
  { round: 8, gp: 'Monaco Grand Prix',        date: '25 May 2026', winner: 'Max Verstappen',  team: 'Red Bull', color: '#0600ef', flag: '🇲🇨' },
  { round: 7, gp: 'Emilia Romagna Grand Prix', date: '18 May 2026', winner: 'Charles Leclerc', team: 'Ferrari',  color: '#dc143c', flag: '🇮🇹' },
  { round: 6, gp: 'Miami Grand Prix',          date: '4 May 2026',  winner: 'Lando Norris',    team: 'McLaren',  color: '#ff8000', flag: '🇺🇸' },
];

export const CRICKET_MATCHES = [
  { id: 'cr1', match: 'India vs England', series: '5-Test Series', venue: 'Edgbaston, Birmingham', date: '12 Jun 2026', year: 2026, month: 5, day: 12, status: 'live', score: 'IND 245/4 (78 ov)' },
  { id: 'cr2', match: 'India vs England', series: '3rd Test', venue: 'Headingley, Leeds', date: '26 Jun 2026', year: 2026, month: 5, day: 26, status: 'upcoming', score: '' },
  { id: 'cr3', match: 'IPL 2026 Final', series: 'Indian Premier League', venue: 'Narendra Modi Stadium', date: '25 May 2026', year: 2026, month: 4, day: 25, status: 'done', score: 'MI beat CSK by 6 wkts' },
];

export const FOOTBALL_FIXTURES = [
  { id: 'fb1', match: 'FIFA World Cup 2026', stage: 'Group A · Matchday 1', teams: 'Argentina vs Morocco', date: '11 Jun 2026', year: 2026, month: 5, day: 11, status: 'done' },
  { id: 'fb2', match: 'FIFA World Cup 2026', stage: 'Group B · Matchday 1', teams: 'France vs Uruguay', date: '12 Jun 2026', year: 2026, month: 5, day: 12, status: 'upcoming' },
  { id: 'fb3', match: 'FIFA World Cup 2026', stage: 'Group C · Matchday 1', teams: 'England vs Tunisia', date: '13 Jun 2026', year: 2026, month: 5, day: 13, status: 'upcoming' },
];

export const NBA_FIXTURES = [
  { id: 'nba1', match: 'Boston Celtics vs Dallas Mavericks', stage: 'NBA Finals - Game 1', teams: 'Celtics vs Mavericks', date: '18 Jun 2026', year: 2026, month: 5, day: 18, status: 'upcoming', homeTeam: 'Boston Celtics', awayTeam: 'Dallas Mavericks', score: '' },
  { id: 'nba2', match: 'Boston Celtics vs Dallas Mavericks', stage: 'NBA Finals - Game 2', teams: 'Celtics vs Mavericks', date: '21 Jun 2026', year: 2026, month: 5, day: 21, status: 'upcoming', homeTeam: 'Boston Celtics', awayTeam: 'Dallas Mavericks', score: '' },
  { id: 'nba3', match: 'Boston Celtics vs Dallas Mavericks', stage: 'NBA Finals - Game 3', teams: 'Celtics vs Mavericks', date: '24 Jun 2026', year: 2026, month: 5, day: 24, status: 'upcoming', homeTeam: 'Boston Celtics', awayTeam: 'Dallas Mavericks', score: '' }
];

export const TENNIS_TOURNAMENTS = [
  { id: 'ten1', name: 'Australian Open', venue: 'Melbourne, Australia', date: '12 Jan – 25 Jan 2026', status: 'done', winner: 'Jannik Sinner / Aryna Sabalenka' },
  { id: 'ten2', name: 'Roland Garros (French Open)', venue: 'Paris, France', date: '24 May – 7 Jun 2026', status: 'done', winner: 'Carlos Alcaraz / Iga Swiatek' },
  { id: 'ten3', name: 'Wimbledon', venue: 'London, United Kingdom', date: '29 Jun – 12 Jul 2026', status: 'upcoming' },
  { id: 'ten4', name: 'US Open', venue: 'New York, USA', date: '31 Aug – 13 Sep 2026', status: 'upcoming' }
];

