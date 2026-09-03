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
