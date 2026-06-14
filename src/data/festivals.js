// Cultural festivals NOT covered by Nager.Date public holidays API.
// Indian & Thai public holidays are fetched live via useLiveHolidays(['IN','TH']).
// Sikh Gurpurabs & events are in sikhCalendar.js.
// Birthdays & anniversaries are in familyDirectory.js.
export const FESTIVALS_DATA = [
  { name: 'Raksha Bandhan', date: new Date(2026, 7, 28), cat: 'indian', emoji: '🎀', action: 'Order rakhis · prepare return gifts', reminder: '3 weeks before' },
  { name: 'Navratri begins', date: new Date(2026, 9, 15), cat: 'indian', emoji: '💃', action: '',                                   reminder: '1 week before'  },
  { name: 'Karva Chauth',    date: new Date(2026, 9, 29), cat: 'indian', emoji: '🌕', action: 'Order bangles & mehendi',            reminder: '1 week before'  },
];
