// Server-side knowledge base for the site assistant.
//
// Courses and blog posts are managed in the admin panel, so the bot reads them
// from Supabase rather than from the static fallback in data/siteContent.js.
// If Supabase is unavailable the static entries are used, exactly like the
// public pages fall back today.

import { getSupabaseServerClient } from './supabaseServer.js';
import { fetchPublishedPosts } from './blog.js';
import {
  baseEntries,
  staticCourseEntries,
  staticBlogEntries,
  buildCourseEntry,
  buildBlogEntry,
  buildCourseListEntry,
  resolveCourseSlug,
} from '../data/chatbotKnowledge.js';
import { courses as staticCourses } from '../data/siteContent.js';

const CACHE_MS = 5 * 60 * 1000;
let cache = { entries: null, expires: 0, source: 'none' };

// Keeps the static entry for anything the database does not cover, so removing a
// row never silently loses an answer the site still shows.
function mergeById(dbEntries, fallbackEntries) {
  const byId = new Map(fallbackEntries.map((entry) => [entry.id, entry]));
  for (const entry of dbEntries) byId.set(entry.id, entry);
  return [...byId.values()];
}

// The database row carries the authoritative title and duration; the static
// course (when there is one for the same slug) adds modules and outcomes that
// the `courses` table has no column for.
function mergeCourseSources(row) {
  const slug = resolveCourseSlug(row);
  const fallback = staticCourses.find((course) => course.slug === slug);
  if (!fallback) return row;
  return {
    ...fallback,
    ...row,
    slug,
    summary: row.description || fallback.summary,
  };
}

async function loadCourses(supabase) {
  const { data, error } = await supabase.from('courses').select('*');
  if (error || !Array.isArray(data) || !data.length) return null;

  const active = data
    // A deactivated course should not be advertised by the assistant.
    .filter((row) => (row.status || 'active') !== 'inactive')
    .map(mergeCourseSources);

  return { courses: active, entries: active.map(buildCourseEntry).filter(Boolean) };
}

async function loadBlogEntries() {
  const posts = await fetchPublishedPosts();
  if (!Array.isArray(posts) || !posts.length) return null;
  return posts.map(buildBlogEntry).filter(Boolean);
}

/**
 * Returns the knowledge base the assistant answers from, cached for 5 minutes.
 * Never throws: any failure falls back to the static entries.
 */
export async function getKnowledgeBase({ force = false } = {}) {
  const now = Date.now();
  if (!force && cache.entries && now < cache.expires) return cache.entries;

  const fallback = [...baseEntries, ...staticCourseEntries, ...staticBlogEntries];
  let entries = fallback;
  let source = 'static';

  try {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const [courseData, blogEntries] = await Promise.all([
        loadCourses(supabase),
        loadBlogEntries(),
      ]);
      if (courseData || blogEntries) {
        // "What courses do you offer?" must name the live course list.
        const listEntry = courseData ? buildCourseListEntry(courseData.courses) : null;
        entries = [
          ...(listEntry ? baseEntries.map((e) => (e.id === 'courses-list' ? listEntry : e)) : baseEntries),
          ...mergeById(courseData?.entries || [], staticCourseEntries),
          ...mergeById(blogEntries || [], staticBlogEntries),
        ];
        source = 'supabase';
      }
    }
  } catch (error) {
    console.error('[chatbot] knowledge base fell back to static content:', error?.message || error);
    entries = fallback;
    source = 'static';
  }

  cache = { entries, expires: now + CACHE_MS, source };
  return entries;
}

export function getKnowledgeSource() {
  return cache.source;
}

export function clearKnowledgeCache() {
  cache = { entries: null, expires: 0, source: 'none' };
}
