'use strict';

const ALLOWED_ORIGINS = ['https://smartpmo.ai', 'http://localhost:3000', 'http://localhost:5500'];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : 'https://smartpmo.ai';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function voterHash(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ua = request.headers.get('User-Agent') || 'unknown';
  const encoder = new TextEncoder();
  // SHA-256 hash of IP+UA — stable across sessions, no daily rotation
  return crypto.subtle.digest('SHA-256', encoder.encode(ip + ua))
    .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));
}

async function handleHealth(env) {
  try {
    await env.DB.prepare('SELECT 1').first();
    return Response.json({ status: 'healthy', db: 'connected' });
  } catch (e) {
    return Response.json({ status: 'unhealthy', error: e.message }, { status: 500 });
  }
}

async function handleGetVotes(articleId, request, env) {
  const hash = await voterHash(request);
  const counts = await env.DB.prepare(
    `SELECT SUM(CASE WHEN vote='up' THEN 1 ELSE 0 END) AS upvotes,
            SUM(CASE WHEN vote='down' THEN 1 ELSE 0 END) AS downvotes
     FROM article_votes WHERE article_id = ?`
  ).bind(articleId).first();

  const existing = await env.DB.prepare(
    `SELECT vote FROM article_votes WHERE article_id = ? AND voter_hash = ?`
  ).bind(articleId, hash).first();

  return Response.json({
    article_id: articleId,
    upvotes:    counts?.upvotes   || 0,
    downvotes:  counts?.downvotes || 0,
    userVote:   existing?.vote    || null
  });
}

async function handleGetVotesBatch(ids, request, env) {
  // B-76: Batch endpoint — single D1 query for all article IDs
  if (!ids.length) return Response.json({ votes: {} });
  if (ids.length > 50) return Response.json({ ok: false, error: 'Max 50 IDs per batch' }, { status: 400 });

  const hash = await voterHash(request);
  const placeholders = ids.map(() => '?').join(',');

  // Single query: counts + user votes for all requested IDs
  const rows = await env.DB.prepare(
    `SELECT article_id,
            SUM(CASE WHEN vote='up' THEN 1 ELSE 0 END) AS upvotes,
            SUM(CASE WHEN vote='down' THEN 1 ELSE 0 END) AS downvotes,
            MAX(CASE WHEN voter_hash = ? THEN vote ELSE NULL END) AS userVote
     FROM article_votes
     WHERE article_id IN (${placeholders})
     GROUP BY article_id`
  ).bind(hash, ...ids).all();

  // Build lookup: { articleId: { upvotes, downvotes, userVote } }
  const votes = {};
  for (const row of rows.results) {
    votes[row.article_id] = {
      upvotes: row.upvotes || 0,
      downvotes: row.downvotes || 0,
      userVote: row.userVote || null
    };
  }
  // Fill in missing IDs with zeroes
  for (const id of ids) {
    if (!votes[id]) {
      votes[id] = { upvotes: 0, downvotes: 0, userVote: null };
    }
  }

  return Response.json({ votes });
}

async function handlePostVote(request, env) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }); }

  const { article_id, vote } = body || {};
  const articleId = parseInt(article_id, 10);

  if (isNaN(articleId)) return Response.json({ ok: false, error: 'Invalid article_id' }, { status: 400 });
  if (!['up', 'down'].includes(vote)) return Response.json({ ok: false, error: 'Invalid vote' }, { status: 400 });

  const hash = await voterHash(request);

  const existing = await env.DB.prepare(
    `SELECT vote FROM article_votes WHERE article_id = ? AND voter_hash = ?`
  ).bind(articleId, hash).first();

  if (!existing) {
    await env.DB.prepare(
      `INSERT INTO article_votes (article_id, vote, voter_hash) VALUES (?, ?, ?)`
    ).bind(articleId, vote, hash).run();
  } else if (existing.vote === vote) {
    const counts = await env.DB.prepare(
      `SELECT SUM(CASE WHEN vote='up' THEN 1 ELSE 0 END) AS upvotes,
              SUM(CASE WHEN vote='down' THEN 1 ELSE 0 END) AS downvotes
       FROM article_votes WHERE article_id = ?`
    ).bind(articleId).first();
    return Response.json({ ok: false, error: 'Already voted', userVote: existing.vote,
      upvotes: counts?.upvotes || 0, downvotes: counts?.downvotes || 0 }, { status: 409 });
  } else {
    await env.DB.prepare(
      `UPDATE article_votes SET vote = ?, voted_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
       WHERE article_id = ? AND voter_hash = ?`
    ).bind(vote, articleId, hash).run();
  }

  const counts = await env.DB.prepare(
    `SELECT SUM(CASE WHEN vote='up' THEN 1 ELSE 0 END) AS upvotes,
            SUM(CASE WHEN vote='down' THEN 1 ELSE 0 END) AS downvotes
     FROM article_votes WHERE article_id = ?`
  ).bind(articleId).first();

  return Response.json({ ok: true, userVote: vote,
    upvotes: counts?.upvotes || 0, downvotes: counts?.downvotes || 0 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    let response;
    try {
      if (url.pathname === '/health' && request.method === 'GET') {
        response = await handleHealth(env);
      } else if (url.pathname === '/votes/batch' && request.method === 'GET') {
        const idsParam = url.searchParams.get('ids') || '';
        const ids = idsParam.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
        response = await handleGetVotesBatch(ids, request, env);
      } else if (url.pathname.startsWith('/votes/') && request.method === 'GET') {
        const articleId = parseInt(url.pathname.split('/votes/')[1], 10);
        if (isNaN(articleId)) response = Response.json({ ok: false, error: 'Invalid id' }, { status: 400 });
        else response = await handleGetVotes(articleId, request, env);
      } else if (url.pathname === '/vote' && request.method === 'POST') {
        response = await handlePostVote(request, env);
      } else {
        response = Response.json({ ok: false, error: 'Not found' }, { status: 404 });
      }
    } catch (e) {
      response = Response.json({ ok: false, error: e.message }, { status: 500 });
    }

    // Attach CORS + cache headers to every response
    const newHeaders = new Headers(response.headers);
    Object.entries(headers).forEach(([k, v]) => newHeaders.set(k, v));
    newHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return new Response(response.body, { status: response.status, headers: newHeaders });
  }
};
