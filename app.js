// app.js - Express app (no listen) for Vercel serverless
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import morgan from 'morgan';
import { sql } from '@vercel/postgres';
import { auth, requiresAuth } from 'express-openid-connect';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security + logging
app.use(helmet({ contentSecurityPolicy: false })); // allow Spotify/YouTube iframes
app.use(morgan('dev'));

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static assets
app.use('/public', express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Auth0 config (set env vars in Vercel)
const authConfig = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH0_SECRET || 'replace-for-local-only',
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  clientID: process.env.AUTH0_CLIENT_ID || 'your-client-id',
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL || 'https://your-tenant.us.auth0.com'
};
app.use(auth(authConfig));

// Ensure DB tables exist (idempotent)
async function ensureTables() {
  await sql`CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    author TEXT NOT NULL,
    userSub TEXT,
    body TEXT NOT NULL,
    imageUrl TEXT,
    createdAt BIGINT NOT NULL
  );`;
  await sql`CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    postId INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author TEXT NOT NULL,
    userSub TEXT,
    body TEXT NOT NULL,
    createdAt BIGINT NOT NULL
  );`;
}
ensureTables().catch(console.error);

// Helpers
const displayName = (user) =>
  user ? (user.name || user.nickname || user.email || 'User') : 'Anonymous';

// Pages
app.get('/',          (req, res) => res.render('home',      { page: 'home',      isAuthed: req.oidc.isAuthenticated(), user: req.oidc.user || null }));
app.get('/music',     (req, res) => res.render('music',     { page: 'music',     isAuthed: req.oidc.isAuthenticated(), user: req.oidc.user || null }));
app.get('/shop',      (req, res) => res.render('shop',      { page: 'shop',      isAuthed: req.oidc.isAuthenticated(), user: req.oidc.user || null,
  shopifyDomain: process.env.SHOPIFY_DOMAIN || '',
  shopifyToken: process.env.SHOPIFY_STOREFRONT_TOKEN || '',
  shopifyCollectionId: process.env.SHOPIFY_COLLECTION_ID || '' }));
app.get('/community', (req, res) => res.render('community', { page: 'community', isAuthed: req.oidc.isAuthenticated(), user: req.oidc.user || null,
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  uploadPreset: process.env.CLOUDINARY_UNSIGNED_PRESET || '' }));
app.get('/clubs',     (req, res) => res.render('clubs',     { page: 'clubs',     isAuthed: req.oidc.isAuthenticated(), user: req.oidc.user || null }));

// Profile helper (requires login)
app.get('/profile', requiresAuth(), (req, res) => res.json({ user: req.oidc.user }));

// API: list posts with comments
app.get('/api/posts', async (req, res) => {
  const { rows: posts } = await sql`SELECT id, author, userSub, body, imageUrl, createdAt FROM posts ORDER BY createdAt DESC;`;
  const { rows: comments } = await sql`SELECT id, postId, author, userSub, body, createdAt FROM comments ORDER BY createdAt ASC;`;
  const byPost = new Map();
  for (const c of comments) {
    const pid = Number(c.postid);
    if (!byPost.has(pid)) byPost.set(pid, []);
    byPost.get(pid).push({ id: c.id, author: c.author, userSub: c.usersub || null, body: c.body, createdAt: Number(c.createdat) });
  }
  const data = posts.map(p => ({
    id: p.id, author: p.author, userSub: p.usersub || null, body: p.body, imageUrl: p.imageurl || null,
    createdAt: Number(p.createdat), comments: byPost.get(p.id) || []
  }));
  res.json({ posts: data });
});

// API: create post (auth required)
app.post('/api/posts', requiresAuth(), async (req, res) => {
  const user = req.oidc.user;
  const author = displayName(user).slice(0, 80);
  const body = (req.body.body || '').toString().trim();
  const imageUrl = (req.body.imageUrl || '').toString().trim() || null;
  if (!body && !imageUrl) return res.status(400).json({ error: 'Missing post content' });
  const createdAt = Date.now();
  const { rows } = await sql`
    INSERT INTO posts (author, userSub, body, imageUrl, createdAt)
    VALUES (${author}, ${user.sub || null}, ${body}, ${imageUrl}, ${createdAt})
    RETURNING id, author, userSub, body, imageUrl, createdAt;
  `;
  const p = rows[0];
  res.status(201).json({ post: { id: p.id, author: p.author, userSub: p.usersub || null,
    body: p.body, imageUrl: p.imageurl || null, createdAt: Number(p.createdat), comments: [] } });
});

// API: add comment (auth required)
app.post('/api/comments', requiresAuth(), async (req, res) => {
  const user = req.oidc.user;
  const postId = Number(req.body.postId);
  const body = (req.body.body || '').toString().trim();
  if (!postId || !body) return res.status(400).json({ error: 'Missing postId or body' });
  const exists = await sql`SELECT 1 FROM posts WHERE id=${postId};`;
  if (!exists.rowCount) return res.status(404).json({ error: 'Post not found' });
  const createdAt = Date.now();
  const { rows } = await sql`
    INSERT INTO comments (postId, author, userSub, body, createdAt)
    VALUES (${postId}, ${displayName(user)}, ${user.sub || null}, ${body}, ${createdAt})
    RETURNING id, postId, author, userSub, body, createdAt;
  `;
  const c = rows[0];
  res.status(201).json({ comment: { id: c.id, postId: c.postid, author: c.author,
    userSub: c.usersub || null, body: c.body, createdAt: Number(c.createdat) } });
});

export default app;
