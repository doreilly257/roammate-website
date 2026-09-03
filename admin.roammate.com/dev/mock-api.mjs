/**
 * Mock of the roammate Worker API, for running the console without production
 * data. Every response shape mirrors api/src/routes/admin-console.ts.
 *
 * This exists because the admin endpoints live on an unmerged branch, so there
 * is no deployed API to point at yet. It is also the right way to work on the
 * console generally: no credentials, no risk of a stray eject landing on a real
 * account, and the data is shaped to exercise the edge cases (an ejected user,
 * a soft-deleted excursion, an overdue report, a report with no target user).
 *
 * Start with:  npm run demo
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.MOCK_PORT || 8788);
const KEY = process.env.MOCK_ADMIN_KEY || 'demo-key';

const now = Date.now();
const iso = (msAgo) => new Date(now - msAgo).toISOString().slice(0, 19).replace('T', ' ');
const pick = (a, i) => a[i % a.length];

const NAMES = ['Amara Okafor', 'Jonas Berg', 'Priya Raman', 'Tom Whitfield', 'Sofia Marchetti', 'Kwame Mensah', 'Lena Fischer', 'Diego Alvarez'];
const CITIES = ['Lisbon, Portugal', 'Chiang Mai, Thailand', 'Medellín, Colombia', 'Tbilisi, Georgia', 'Split, Croatia', 'Da Nang, Vietnam'];
const TITLES = ['Sunset hike up Monte Brasil', 'Night market crawl', 'Free walking tour + coffee', 'Sunrise kayak', 'Rooftop drinks with the hostel crew', 'Day trip to the waterfalls'];

const users = Array.from({ length: 47 }, (_, i) => ({
  id: `usr_${String(i + 1).padStart(4, '0')}`,
  email: `traveller${i + 1}@example.com`,
  username: `roamer${i + 1}`,
  name: pick(NAMES, i),
  headline: i % 3 === 0 ? 'Backpacking through SE Asia' : null,
  location: pick(CITIES, i),
  profile_image_url: null,
  is_verified: i % 3 === 0 ? 1 : 0,
  is_ejected: i === 5 ? 1 : 0,
  ejected_at: i === 5 ? iso(86400000 * 3) : null,
  ejection_reason: i === 5 ? 'Repeated harassment reports' : null,
  followers_count: (i * 7) % 40,
  vouches_count: i % 5,
  auth_provider: pick(['apple', 'google', 'email'], i),
  last_seen_at: iso(3600000 * (i % 200)),
  created_at: iso(86400000 * (i % 60) + 3600000),
}));

const excursions = Array.from({ length: 23 }, (_, i) => ({
  id: `exc_${String(i + 1).padStart(4, '0')}`,
  title: pick(TITLES, i),
  description: 'Meeting outside the hostel at six. Bring water and something warm for later.',
  date: iso(-86400000 * ((i % 10) - 3)),
  end_date: null,
  location_name: pick(CITIES, i),
  location_address: 'Rua da Bica 12',
  status: 'active',
  is_deleted: i === 4 ? 1 : 0,
  min_pax: 2,
  max_pax: 8,
  cover_image_url: null,
  created_at: iso(86400000 * (i % 30)),
  host_id: users[i % users.length].id,
  host_name: users[i % users.length].name,
  host_verified: users[i % users.length].is_verified,
  participant_count: (i * 3) % 8,
}));

const reports = Array.from({ length: 4 }, (_, i) => ({
  id: `rep_${i + 1}`,
  reporter_id: users[(i + 2) % users.length].id,
  reporter_name: users[(i + 2) % users.length].name,
  target_type: pick(['message', 'excursion', 'user', 'album_media'], i),
  target_id: i % 2 ? excursions[i].id : users[i].id,
  target_user_id: users[i].id,
  target_user_name: users[i].name,
  target_ejected: 0,
  reason: pick(['harassment', 'spam', 'inappropriate_content', 'safety_concern'], i),
  details: 'Kept messaging after being asked to stop, then created a duplicate account.',
  status: 'open',
  action_due_at: iso(86400000 * (i === 0 ? 1 : -1)),
  created_at: iso(3600000 * (i + 2)),
  reviewed_at: null,
  resolved_by: null,
  resolution_notes: null,
}));

const media = Array.from({ length: 30 }, (_, i) => ({
  id: `med_${i + 1}`,
  url: `https://picsum.photos/seed/${i}/600/600`,
  thumbnail_url: `https://picsum.photos/seed/${i}/300/300`,
  type: 'photo',
  caption: i % 3 ? pick(['Sunset from the ridge', 'Best noodles of the trip', 'The whole crew'], i) : null,
  location_name: pick(CITIES, i),
  likes_count: (i * 5) % 24,
  comments_count: i % 6,
  created_at: iso(3600000 * i * 3),
  user_id: users[i % users.length].id,
  user_name: users[i % users.length].name,
  is_verified: users[i % users.length].is_verified,
  album_id: `alb_${(i % 6) + 1}`,
  album_name: `Trip album ${(i % 6) + 1}`,
  is_public: i % 4 === 0 ? 1 : 0,
}));

const KINDS = ['signup', 'excursion_created', 'excursion_join', 'media_upload', 'report', 'sos', 'verification', 'moderation'];
const events = Array.from({ length: 140 }, (_, i) => ({
  kind: pick(KINDS, i),
  entity_id: pick(excursions, i).id,
  actor_id: users[i % users.length].id,
  actor_name: users[i % users.length].name,
  detail: pick([...TITLES, 'harassment', 'approved', 'eject_user', 'Sunset from the ridge'], i),
  at: iso(1800000 * i),
}));

const routes = {
  '/overview': () => ({
    generatedAt: new Date().toISOString(),
    users: { total: users.length, verified: users.filter((u) => u.is_verified).length, ejected: 1, new7d: 6, new30d: 19, active7d: 14 },
    excursions: { total: 22, upcoming: 9, deleted: 1, new7d: 4, participants: 61 },
    content: { albums: 6, media: media.length, messages7d: 412 },
    queues: { reportsOpen: reports.length, sosOpen: 1, verificationPending: 3 },
  }),
  '/timeseries': () => ({
    days: 30,
    points: Array.from({ length: 30 }, (_, i) => ({
      day: new Date(now - (29 - i) * 86400000).toISOString().slice(0, 10),
      signups: Math.round(3 + 3 * Math.sin(i / 3)),
      excursions: Math.round(2 + 2 * Math.cos(i / 4)),
      joins: Math.round(5 + 4 * Math.sin(i / 2)),
      messages: Math.round(40 + 25 * Math.sin(i / 5)),
      reports: i % 7 === 0 ? 1 : 0,
    })),
  }),
  '/activity': (q) => {
    const limit = Number(q.get('limit') || 50);
    const kinds = (q.get('kinds') || '').split(',').filter(Boolean);
    const filtered = kinds.length ? events.filter((e) => kinds.includes(e.kind)) : events;
    const slice = filtered.slice(0, limit);
    return { events: slice, nextCursor: filtered.length > limit ? slice[slice.length - 1].at : null, kinds };
  },
  '/users': (q) => {
    const qq = (q.get('q') || '').toLowerCase();
    const filter = q.get('filter') || 'all';
    let rows = users;
    if (qq) rows = rows.filter((u) => `${u.name} ${u.username} ${u.email} ${u.location}`.toLowerCase().includes(qq));
    if (filter === 'verified') rows = rows.filter((u) => u.is_verified);
    if (filter === 'unverified') rows = rows.filter((u) => !u.is_verified);
    if (filter === 'ejected') rows = rows.filter((u) => u.is_ejected);
    const offset = Number(q.get('offset') || 0);
    return { users: rows.slice(offset, offset + Number(q.get('limit') || 50)), total: rows.length };
  },
  '/excursions': (q) => {
    const filter = q.get('filter') || 'active';
    let rows = excursions;
    if (filter === 'active') rows = rows.filter((e) => !e.is_deleted);
    if (filter === 'deleted') rows = rows.filter((e) => e.is_deleted);
    const offset = Number(q.get('offset') || 0);
    return { excursions: rows.slice(offset, offset + Number(q.get('limit') || 50)), total: rows.length };
  },
  '/media': (q) => {
    const offset = Number(q.get('offset') || 0);
    return { media: media.slice(offset, offset + Number(q.get('limit') || 60)), total: media.length };
  },
  '/reports': (q) => ({ reports: q.get('status') === 'open' ? reports : [] }),
  '/moderation-log': () => ({
    actions: [
      { id: 'ma_1', report_id: 'rep_9', action_type: 'remove_content_and_eject_user', actor_id: 'daniel@roammate.com', target_user_id: users[5].id, target_user_name: users[5].name, target_type: 'report', target_id: 'rep_9', notes: 'Repeated harassment after warning', created_at: iso(86400000 * 3) },
      { id: 'ma_2', report_id: null, action_type: 'remove_excursion', actor_id: 'daniel@roammate.com', target_user_id: null, target_type: 'excursion', target_id: excursions[4].id, notes: 'Duplicate listing', created_at: iso(86400000 * 5) },
    ],
  }),
  // Insights. Numbers are shaped to tell this product's ACTUAL story rather than
  // a flattering one: acquisition is fine, activation is not, and the supply side
  // is where it breaks. A demo full of healthy metrics would teach the wrong
  // thing about what the page is for.
  '/insights/activation': () => ({
    basis: 'state',
    note: 'Stage counts are current state for the signup cohort, not an ordered event funnel. Within a track a user may have done the steps in a different order; across tracks there is no order at all.',
    windowDays: 90, suspectExcluded: 14, entryCount: 47,
    tracks: [
      { key: 'onboarding', label: 'Getting set up', sequential: true, stages: [
        { key: 'signed_up', label: 'Signed up', count: 47 },
        { key: 'added_photo', label: 'Added a photo', count: 31 },
        { key: 'profile_complete', label: 'Completed profile', count: 18 },
        { key: 'verified', label: 'Verified identity', count: 16 } ] },
      { key: 'joiner', label: 'As a joiner', sequential: true, stages: [
        { key: 'joined', label: 'Joined an excursion', count: 9 },
        { key: 'joined_repeat', label: 'Joined twice or more', count: 3 } ] },
      { key: 'host', label: 'As a host', sequential: true, stages: [
        { key: 'hosted', label: 'Hosted an excursion', count: 7 },
        { key: 'hosted_repeat', label: 'Hosted twice or more', count: 1 } ] },
    ],
  }),
  '/insights/supply': () => ({
    basis: 'state', windowDays: 90,
    excursionsCreated: 23, excursionsWithAtLeastOneJoin: 9, excursionsFilled: 2,
    hosts: 7, repeatHosts: 1, hostsWhoNeverGotAJoin: 4, medianHoursToFirstJoin: 31.5,
    weekly: [], 
    note: 'A host who never got a join is the clearest churn signal on the supply side - they did the work and got nothing back. Repeat hosts are the number to move.',
  }),
  '/insights/geography': () => ({
    basis: 'state',
    cities: [
      { city: 'Lisbon, Portugal', users: 11, excursions: 4, hosts: 2, usersPerExcursion: 2.8 },
      { city: 'Chiang Mai, Thailand', users: 9, excursions: 0, hosts: 0, usersPerExcursion: null },
      { city: 'Medellin, Colombia', users: 7, excursions: 1, hosts: 1, usersPerExcursion: 7 },
      { city: 'Tbilisi, Georgia', users: 6, excursions: 0, hosts: 0, usersPerExcursion: null },
      { city: 'Split, Croatia', users: 5, excursions: 3, hosts: 2, usersPerExcursion: 1.7 },
      { city: 'Da Nang, Vietnam', users: 4, excursions: 0, hosts: 0, usersPerExcursion: null },
      { city: 'Oaxaca, Mexico', users: 3, excursions: 1, hosts: 1, usersPerExcursion: 3 },
      { city: 'Tirana, Albania', users: 2, excursions: 0, hosts: 0, usersPerExcursion: null },
    ],
    note: 'users.location is self-reported and often a home city rather than where someone is now, so treat this as where people SAY they are. A city with users and no excursions is the supply gap worth seeding.',
  }),
  '/insights/verification': () => ({
    basis: 'state', windowDays: 90,
    byStatus: [{ status: 'verified', n: 16 }, { status: 'pending', n: 3 }, { status: 'failed', n: 5 }],
    usersWhoStarted: 24, usersWhoCompleted: 21, eligibleUsers: 47, verifiedUsers: 16,
    medianMinutesToComplete: 4.2,
    note: 'Verification is OPTIONAL while verification_gate_enabled is off, so a low start rate is the expected outcome of the current design, not a broken flow. Read the abandon rate (started minus completed) rather than the take-up rate.',
  }),
  '/insights/survival': () => ({
    basis: 'state', kind: 'survival-snapshot',
    note: 'NOT a retention curve. last_seen_at is overwritten on every visit, so there is one observation per user and no history. This says how many of each signup cohort have been seen RECENTLY, which is a survival snapshot. Real week-N retention needs an event store.',
    weeks: 12,
    cohorts: [
      { cohort: '2026-35', signed_up: 6, seen_7d: 5, seen_30d: 6, ever_joined: 2 },
      { cohort: '2026-34', signed_up: 8, seen_7d: 4, seen_30d: 7, ever_joined: 3 },
      { cohort: '2026-33', signed_up: 5, seen_7d: 1, seen_30d: 3, ever_joined: 1 },
      { cohort: '2026-32', signed_up: 9, seen_7d: 2, seen_30d: 4, ever_joined: 2 },
      { cohort: '2026-31', signed_up: 7, seen_7d: 1, seen_30d: 2, ever_joined: 1 },
      { cohort: '2026-30', signed_up: 12, seen_7d: 1, seen_30d: 2, ever_joined: 0 },
    ],
  }),
  '/insights/engagement': () => ({
    basis: 'state', windowDays: 30,
    activeSenders: 12, messages: 412, conversations: 19, messagesPerSender: 34.3,
    joinedButNeverMessaged: 5,
    note: 'joinedButNeverMessaged counts people who joined an excursion and have never sent a single message. On a social product that is the sharpest activation failure this schema can detect.',
  }),
  // ---- data quality --------------------------------------------------------
  '/quality/tables': () => ({ tables: [
    {table:'users',rows:751},{table:'excursions',rows:23},{table:'excursion_participants',rows:0},
    {table:'messages',rows:118},{table:'conversations',rows:19},{table:'albums',rows:513},
    {table:'album_media',rows:129},{table:'content_reports',rows:4},{table:'moderation_actions',rows:2},
    {table:'sos_alerts',rows:3},{table:'verification_sessions',rows:24},{table:'activities',rows:402},
    {table:'user_blocks',rows:1},{table:'user_follows',rows:37},{table:'badges',rows:12},
  ]}),
  '/quality/columns': () => ({ profiles: [
    { table:'users', rows:751, columns:[
      {column:'email',filled:749,blank:2,distinct:742},{column:'username',filled:751,blank:0,distinct:751},
      {column:'name',filled:733,blank:18,distinct:null},{column:'headline',filled:96,blank:655,distinct:null},
      {column:'bio',filled:88,blank:663,distinct:null},{column:'profile_image_url',filled:214,blank:537,distinct:null},
      {column:'location',filled:311,blank:440,distinct:74},{column:'latitude',filled:302,blank:449,distinct:null},
      {column:'interests',filled:104,blank:647,distinct:null},{column:'languages',filled:91,blank:660,distinct:null},
      {column:'travel_style',filled:77,blank:674,distinct:null},{column:'auth_provider',filled:751,blank:0,distinct:3},
      {column:'last_seen_at',filled:388,blank:363,distinct:null},
    ]},
    { table:'excursions', rows:23, columns:[
      {column:'title',filled:23,blank:0,distinct:null},{column:'description',filled:21,blank:2,distinct:null},
      {column:'cover_image_url',filled:9,blank:14,distinct:null},{column:'date',filled:23,blank:0,distinct:null},
      {column:'end_date',filled:6,blank:17,distinct:null},{column:'location_name',filled:22,blank:1,distinct:14},
      {column:'location_address',filled:11,blank:12,distinct:null},{column:'latitude',filled:20,blank:3,distinct:null},
      {column:'host_id',filled:23,blank:0,distinct:7},{column:'min_pax',filled:23,blank:0,distinct:null},
      {column:'max_pax',filled:23,blank:0,distinct:null},{column:'status',filled:23,blank:0,distinct:2},
    ]},
    { table:'album_media', rows:129, columns:[
      {column:'url',filled:129,blank:0,distinct:129},{column:'thumbnail_url',filled:121,blank:8,distinct:null},
      {column:'type',filled:129,blank:0,distinct:2},{column:'caption',filled:44,blank:85,distinct:null},
      {column:'location_name',filled:31,blank:98,distinct:null},{column:'taken_at',filled:58,blank:71,distinct:null},
    ]},
  ]}),
  '/quality/integrity': () => ({ checks: [
    {id:'exc_no_host',label:'Excursions whose host no longer exists',count:0,level:'ok',why:'The excursion renders with no host.'},
    {id:'part_no_user',label:'Participants whose user no longer exists',count:0,level:'ok',why:'Inflates participant counts.'},
    {id:'part_no_exc',label:'Participants pointing at a missing excursion',count:0,level:'ok',why:'Orphaned join rows.'},
    {id:'media_no_album',label:'Media pointing at a missing album',count:3,level:'warn',why:'The photo exists but nothing can display it.'},
    {id:'media_no_user',label:'Media whose uploader no longer exists',count:0,level:'ok',why:'Unattributable content.'},
    {id:'msg_no_convo',label:'Messages with no conversation',count:0,level:'ok',why:'Unreachable messages.'},
    {id:'report_no_reporter',label:'Reports whose reporter no longer exists',count:0,level:'ok',why:'Cannot follow up.'},
    {id:'verif_no_user',label:'Verification sessions with no user',count:0,level:'ok',why:'eKYC results applied to nobody.'},
    {id:'empty_albums',label:'Albums containing no media',count:441,level:'bad',why:'An album per excursion or conversation is created eagerly, so a high count here is expected rather than broken. Read it as how much of the album table is scaffolding.'},
  ]}),
  '/quality/anomalies': () => ({ userTotal: 751, anomalies: [
    {id:'dup_email',label:'Duplicate email addresses',count:7,level:'bad',why:'Two accounts share an address. Sign-in depends on which row is found first.'},
    {id:'dup_username',label:'Duplicate usernames',count:0,level:'ok',why:'Profile URLs become ambiguous.'},
    {id:'blank_email',label:'Accounts with no email',count:2,level:'warn',why:'Cannot be contacted, cannot reset a password.'},
    {id:'test_emails',label:'Test-looking accounts',count:189,level:'bad',why:'Counted in every headline number unless a report excludes them. 25% of all accounts.'},
    {id:'no_last_seen',label:'Accounts never seen',count:363,level:'bad',why:'Registered and never opened the app, or last_seen_at is not being written.'},
    {id:'future_created',label:'Accounts created in the future',count:0,level:'ok',why:'A clock or timezone bug. Any value here is wrong.'},
    {id:'seen_before_created',label:'Last seen before account was created',count:0,level:'ok',why:'Impossible ordering.'},
    {id:'end_before_start',label:'Excursions ending before they start',count:0,level:'ok',why:'Impossible dates.'},
    {id:'max_lt_min',label:'Excursions with max capacity below min',count:1,level:'warn',why:'Nobody can ever join.'},
    {id:'null_island',label:'Excursions at coordinates 0,0',count:3,level:'warn',why:'Null Island: a missing location stored as zero rather than null.'},
  ]}),
  '/quality/freshness': () => ({ sources: [
    {id:'users',label:'Newest account',latest:iso(3600000*2)},
    {id:'excursions',label:'Newest excursion',latest:iso(86400000*2)},
    {id:'participants',label:'Newest join',latest:null},
    {id:'messages',label:'Newest message',latest:iso(86400000*4)},
    {id:'media',label:'Newest media upload',latest:iso(86400000*1)},
    {id:'reports',label:'Newest report',latest:iso(3600000*5)},
    {id:'verification',label:'Newest verification session',latest:iso(86400000*9)},
    {id:'sos',label:'Newest SOS alert',latest:iso(86400000*41)},
  ]}),
  '/quality/distribution': (q) => {
    const field = q.get('field') || 'auth_provider';
    const sets = {
      auth_provider: { table:'users', column:'auth_provider', total:751,
        values:[{value:'apple',n:402},{value:'google',n:238},{value:'email',n:111}] },
      location: { table:'users', column:'location', total:751,
        values:[{value:'(blank)',n:440},{value:'Lisbon, Portugal',n:61},{value:'Chiang Mai, Thailand',n:49},
                {value:'Medellin, Colombia',n:38},{value:'Tbilisi, Georgia',n:31},{value:'Split, Croatia',n:26},
                {value:'Da Nang, Vietnam',n:21},{value:'Oaxaca, Mexico',n:18},{value:'Tirana, Albania',n:14},
                {value:'Porto, Portugal',n:12},{value:'Bali, Indonesia',n:11},{value:'Mexico City, Mexico',n:9},
                {value:'Bangkok, Thailand',n:8},{value:'Kyoto, Japan',n:7},{value:'Cape Town, South Africa',n:6}] },
      travel_style: { table:'users', column:'travel_style', total:751,
        values:[{value:'(blank)',n:674},{value:'solo',n:41},{value:'duo',n:22},{value:'group',n:14}] },
      excursion_city: { table:'excursions', column:'location_name', total:23,
        values:[{value:'Lisbon, Portugal',n:6},{value:'Split, Croatia',n:4},{value:'Medellin, Colombia',n:3},
                {value:'Oaxaca, Mexico',n:3},{value:'Porto, Portugal',n:2},{value:'Da Nang, Vietnam',n:2},
                {value:'(blank)',n:1},{value:'Tbilisi, Georgia',n:1},{value:'Kyoto, Japan',n:1}] },
      excursion_status: { table:'excursions', column:'status', total:23,
        values:[{value:'active',n:22},{value:'cancelled',n:1}] },
      participant_status: { table:'excursion_participants', column:'status', total:0, values:[] },
      verification_status: { table:'verification_sessions', column:'status', total:24,
        values:[{value:'verified',n:4},{value:'failed',n:12},{value:'pending',n:8}] },
      report_reason: { table:'content_reports', column:'reason', total:4,
        values:[{value:'harassment',n:1},{value:'spam',n:1},{value:'inappropriate_content',n:1},{value:'safety_concern',n:1}] },
      media_type: { table:'album_media', column:'type', total:129,
        values:[{value:'photo',n:121},{value:'video',n:8}] },
    };
    return { field, ...(sets[field] || sets.auth_provider) };
  },
  '/flags': () => ({
    flags: {
      proximity_enabled: true, ai_concierge_enabled: false, trip_memory_enabled: true,
      tonight_push_enabled: false, notifications_canonical_shadow: true,
      notifications_canonical_active: false, matchmaking_enabled: true,
      verification_gate_enabled: false,
    },
  }),
};

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname.replace(/^\/v1\/admin/, '');
  res.setHeader('content-type', 'application/json');

  if (req.headers['x-admin-key'] !== KEY) {
    res.writeHead(401); return res.end(JSON.stringify({ error: 'Unauthorized' }));
  }
  if (req.method === 'POST' || req.method === 'PUT') {
    res.writeHead(200); return res.end(JSON.stringify({ ok: true, flags: routes['/flags']().flags }));
  }

  const userDetail = path.match(/^\/users\/(.+)$/);
  if (userDetail) {
    const u = users.find((x) => x.id === userDetail[1]) || users[0];
    res.writeHead(200);
    return res.end(JSON.stringify({
      user: u,
      hostedExcursions: excursions.slice(0, 3).map((e) => ({ id: e.id, title: e.title, date: e.date, status: e.status, is_deleted: e.is_deleted, created_at: e.created_at })),
      joinedExcursions: excursions.slice(3, 6).map((e) => ({ id: e.id, title: e.title, date: e.date, status: 'joined', created_at: e.created_at })),
      media: media.slice(0, 6),
      reportsAgainst: reports.slice(0, 2),
      reportsBy: reports.slice(2, 3).map((r) => ({ id: r.id, target_type: r.target_type, reason: r.reason, status: r.status, created_at: r.created_at })),
      verificationSessions: [{ session_id: 'vs_1', level: 'id_document', status: u.is_verified ? 'approved' : 'pending', created_at: iso(86400000 * 4), completed_at: null }],
    }));
  }

  const target = path.match(/^\/reports\/(.+)\/target$/);
  if (target) {
    const r = reports.find((x) => x.id === target[1]) || reports[0];
    const byType = {
      message: { id: 'msg_1', sender_id: users[0].id, content: 'you keep ignoring me. i know which hostel you are staying at.', image_url: null, is_deleted: 0, created_at: iso(7200000) },
      excursion: { id: excursions[1].id, title: excursions[1].title, description: 'BUY FOLLOWERS CHEAP >>> click link in bio <<<', cover_image_url: null, host_id: users[1].id, is_deleted: 0, created_at: iso(86400000) },
      user: { ...users[2] },
      album_media: { id: 'med_9', url: 'https://picsum.photos/seed/9/600/600', thumbnail_url: 'https://picsum.photos/seed/9/300/300', caption: 'reported photo', user_id: users[3].id, created_at: iso(3600000) },
    };
    res.writeHead(200);
    return res.end(JSON.stringify({ targetType: r.target_type, target: byType[r.target_type] ?? null }));
  }

  const excDetail = path.match(/^\/excursions\/(.+)$/);
  if (excDetail) {
    const e = excursions.find((x) => x.id === excDetail[1]) || excursions[0];
    res.writeHead(200);
    return res.end(JSON.stringify({
      excursion: { ...e, host_username: 'roamer1' },
      participants: users.slice(0, 5).map((u) => ({ user_id: u.id, status: 'joined', created_at: iso(86400000), name: u.name, username: u.username, profile_image_url: null, is_verified: u.is_verified })),
      reports: reports.slice(0, 1),
      albums: [{ id: 'alb_1', name: 'Trip album 1', is_public: 1, media_count: 12 }],
    }));
  }

  const handler = routes[path];
  if (!handler) { res.writeHead(404); return res.end(JSON.stringify({ error: `No mock for ${path}` })); }
  res.writeHead(200);
  res.end(JSON.stringify(handler(url.searchParams)));
}).listen(PORT, () => console.log(`[mock-api] listening on http://localhost:${PORT}`));
