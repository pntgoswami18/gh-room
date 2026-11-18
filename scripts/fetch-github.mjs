#!/usr/bin/env node
// Fetches GitHub profile data at build time -> public/github.json
// Usage:
//   GITHUB_TOKEN=xxx node scripts/fetch-github.mjs [login]   (GraphQL: pinned + contribution calendar)
//   node scripts/fetch-github.mjs [login]                    (REST fallback: no pinned/calendar)
//   node scripts/fetch-github.mjs --sample                   (offline sample data)
// On failure, keeps the existing file and exits 0 so deploys never break.

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const OUT = new URL('../public/github.json', import.meta.url);
const args = process.argv.slice(2);
const SAMPLE = args.includes('--sample');
const login = args.find((a) => !a.startsWith('--')) || process.env.GH_LOGIN || 'pntgoswami18';
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

const QUERY = `
query($login: String!) {
  user(login: $login) {
    name login bio avatarUrl url websiteUrl location company
    followers { totalCount }
    following { totalCount }
    pinnedItems(first: 6, types: REPOSITORY) {
      nodes { ... on Repository {
        name description url stargazerCount forkCount
        primaryLanguage { name color }
      } }
    }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC,
                 orderBy: { field: STARGAZERS, direction: DESC }) {
      totalCount
      nodes {
        name description url stargazerCount forkCount updatedAt
        primaryLanguage { name color }
      }
    }
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

const repo = (r) => ({
  name: r.name,
  description: r.description || '',
  url: r.url || r.html_url,
  stars: r.stargazerCount ?? r.stargazers_count ?? 0,
  forks: r.forkCount ?? r.forks_count ?? 0,
  language: r.primaryLanguage?.name ?? r.language ?? null,
  color: r.primaryLanguage?.color ?? null,
  updatedAt: r.updatedAt ?? r.updated_at ?? null,
});

async function viaGraphQL() {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'gh-room' },
    body: JSON.stringify({ query: QUERY, variables: { login } }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors || json));
  const u = json.data.user;
  const cal = u.contributionsCollection.contributionCalendar;
  return {
    profile: {
      name: u.name, login: u.login, bio: u.bio, avatarUrl: u.avatarUrl, url: u.url,
      website: u.websiteUrl, location: u.location, company: u.company,
      followers: u.followers.totalCount, following: u.following.totalCount,
      publicRepos: u.repositories.totalCount,
    },
    pinned: u.pinnedItems.nodes.map(repo),
    repos: u.repositories.nodes.map(repo),
    calendar: {
      total: cal.totalContributions,
      weeks: cal.weeks.map((w) => w.contributionDays.map((d) => ({ d: d.date, c: d.contributionCount }))),
    },
  };
}

async function viaREST() {
  const h = { 'User-Agent': 'gh-room', Accept: 'application/vnd.github+json' };
  const [u, rs] = await Promise.all([
    fetch(`https://api.github.com/users/${login}`, { headers: h }).then((r) => r.json()),
    fetch(`https://api.github.com/users/${login}/repos?per_page=100&type=owner&sort=updated`, { headers: h }).then((r) => r.json()),
  ]);
  if (!u.login || !Array.isArray(rs)) throw new Error(u.message || 'REST fetch failed');
  const repos = rs.filter((r) => !r.fork).map(repo).sort((a, b) => b.stars - a.stars);
  return {
    profile: {
      name: u.name, login: u.login, bio: u.bio, avatarUrl: u.avatar_url, url: u.html_url,
      website: u.blog, location: u.location, company: u.company,
      followers: u.followers, following: u.following, publicRepos: u.public_repos,
    },
    pinned: repos.slice(0, 6), // REST has no pinned endpoint; use top-starred
    repos,
    calendar: { total: 0, weeks: [] },
  };
}

function sample() {
  const langs = [['JavaScript', '#f1e05a'], ['TypeScript', '#3178c6'], ['Python', '#3572A5'], ['Java', '#b07219'], ['Shell', '#89e051'], ['HTML', '#e34c26']];
  const repos = Array.from({ length: 34 }, (_, i) => {
    const [language, color] = langs[i % langs.length];
    return { name: `sample-repo-${i + 1}`, description: `Sample project #${i + 1} (replace by running npm run data)`, url: 'https://github.com/', stars: Math.max(0, Math.round(60 / (i + 1)) - 1), forks: i % 4, language, color, updatedAt: new Date().toISOString() };
  });
  const weeks = [];
  const start = new Date(); start.setDate(start.getDate() - 52 * 7);
  for (let w = 0; w < 53; w++) {
    weeks.push(Array.from({ length: 7 }, (_, d) => {
      const dt = new Date(start); dt.setDate(start.getDate() + w * 7 + d);
      const c = Math.random() < 0.35 ? 0 : Math.floor(Math.random() ** 2 * 14);
      return { d: dt.toISOString().slice(0, 10), c };
    }));
  }
  return {
    _sample: true,
    profile: { name: 'Sample User', login: 'sample', bio: 'Sample data. Run `npm run data` to load your real profile.', avatarUrl: null, url: 'https://github.com/', followers: 42, following: 7, publicRepos: repos.length },
    pinned: repos.slice(0, 6),
    repos,
    calendar: { total: weeks.flat().reduce((s, x) => s + x.c, 0), weeks },
  };
}

try {
  const data = SAMPLE ? sample() : token ? await viaGraphQL() : await viaREST();
  data.fetchedAt = new Date().toISOString();
  await mkdir(new URL('../public/', import.meta.url), { recursive: true });
  await writeFile(OUT, JSON.stringify(data, null, 2));
  console.log(`wrote public/github.json (${SAMPLE ? 'sample' : token ? 'graphql' : 'rest'}; ${data.repos.length} repos)`);
} catch (e) {
  console.error('fetch failed:', e.message);
  if (existsSync(OUT)) console.error('keeping existing public/github.json');
  else process.exitCode = 1;
}
