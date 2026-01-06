import "server-only";

import Parser from "rss-parser";
import sanitizeHtml from "sanitize-html";
import { unstable_cache } from "next/cache";

export const RSS_URL = "https://news.smol.ai/rss.xml";
const PAGE_SIZE = 20;

type RawItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  content?: string;
  contentSnippet?: string;
  guid?: string;
  "content:encoded"?: string;
  description?: string;
};

export type Issue = {
  id: string;
  title: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  date: Date | null;
  dayKey: string;
  slug: string;
  summary: string;
  contentHtml: string;
};

export type IssueGroup = {
  dayKey: string;
  dayLabel: string;
  items: Issue[];
};

const parser = new Parser<unknown, RawItem>({
  customFields: {
    item: ["content:encoded"],
  },
});

function toDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDayKey(date: Date | null): string {
  if (!date) return "unknown";
  return date.toISOString().slice(0, 10);
}

export function formatDayLabel(date: Date | null): string {
  if (!date) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(date: Date | null): string {
  if (!date) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

export function formatDateTimeShort(date: Date | null): string {
  if (!date) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

function slugFromLink(link?: string): string | null {
  if (!link) return null;
  try {
    const url = new URL(link);
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (!last) return null;
    return slugify(last);
  } catch {
    return slugify(link);
  }
}

function stripHtml(value: string): string {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
}

function normalizeItem(raw: RawItem): Issue {
  const date = toDate(raw.isoDate ?? raw.pubDate);
  const dayKey = formatDayKey(date);
  const summaryRaw = raw.description ?? raw.contentSnippet ?? "";
  const summary = stripHtml(summaryRaw) || "No summary available.";
  const contentHtml = raw["content:encoded"] ?? raw.content ?? raw.description ?? "";
  const id = raw.guid ?? raw.link ?? raw.title ?? `issue-${dayKey}`;
  const title = stripHtml(raw.title ?? "Untitled issue");

  return {
    id,
    title,
    link: raw.link,
    pubDate: raw.pubDate,
    isoDate: raw.isoDate,
    date,
    dayKey,
    slug: "",
    summary,
    contentHtml,
  };
}

function buildSlug(issue: Issue): string {
  const fromLink = slugFromLink(issue.link);
  if (fromLink) return fromLink;
  if (issue.date) return formatDayKey(issue.date);
  return slugify(issue.title || "issue");
}

function ensureUniqueSlugs(items: Issue[]): Issue[] {
  const counts = new Map<string, number>();
  return items.map((issue) => {
    const base = buildSlug(issue) || "issue";
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    const slug = count === 0 ? base : `${base}-${count + 1}`;
    return { ...issue, slug };
  });
}

const fetchAllIssues = async (): Promise<Issue[]> => {
  const response = await fetch(RSS_URL, {
    next: { revalidate: 600 },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch RSS (${response.status})`);
  }

  const xml = await response.text();
  const feed = await parser.parseString(xml);
  const rawItems = (feed.items ?? []) as RawItem[];

  const normalized = rawItems.map(normalizeItem);
  normalized.sort((a, b) => {
    const timeA = a.date ? a.date.getTime() : 0;
    const timeB = b.date ? b.date.getTime() : 0;
    return timeB - timeA;
  });

  return ensureUniqueSlugs(normalized);
};

export const getAllIssues = unstable_cache(fetchAllIssues, ["rss-feed"], {
  revalidate: 600,
});

export async function getPaginatedIssues(page: number): Promise<{
  issues: Issue[];
  totalPages: number;
}> {
  const items = await getAllIssues();
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const issues = items.slice(start, start + PAGE_SIZE);
  return { issues, totalPages };
}

export function groupIssuesByDay(issues: Issue[]): IssueGroup[] {
  const groups = new Map<string, IssueGroup>();
  issues.forEach((issue) => {
    const dayKey = issue.dayKey;
    const group = groups.get(dayKey);
    if (group) {
      group.items.push(issue);
    } else {
      groups.set(dayKey, {
        dayKey,
        dayLabel: formatDayLabel(issue.date),
        items: [issue],
      });
    }
  });
  return Array.from(groups.values());
}

function normalizeSlugInput(slug: string): string {
  try {
    return decodeURIComponent(slug).toLowerCase();
  } catch {
    return slug.toLowerCase();
  }
}

function expandTwoDigitYearSlug(slug: string): string | null {
  const match = slug.match(/^(\d{2})-(\d{2})-(\d{2})(-.+)?$/);
  if (!match) return null;
  const [, yy, mm, dd, rest] = match;
  return `20${yy}-${mm}-${dd}${rest ?? ""}`;
}

function extractDayKeyFromSlug(slug: string): string | null {
  const match = slug.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const short = slug.match(/^(\d{2})-(\d{2})-(\d{2})/);
  if (short) return `20${short[1]}-${short[2]}-${short[3]}`;
  return null;
}

export async function getIssueBySlug(slug: string): Promise<Issue | null> {
  const items = await getAllIssues();
  const normalized = normalizeSlugInput(slug);
  const expanded = expandTwoDigitYearSlug(normalized);
  const dayKeyFromSlug = extractDayKeyFromSlug(normalized);

  const directMatch = items.find(
    (issue) =>
      issue.slug === normalized || (expanded ? issue.slug === expanded : false)
  );
  if (directMatch) return directMatch;

  return (
    items.find((issue) => {
      const candidates = [
        issue.slug,
        issue.dayKey,
        slugify(issue.title),
        slugFromLink(issue.link) ?? "",
      ];
      return candidates.some(
        (candidate) => candidate === normalized || candidate === expanded
      ) || (dayKeyFromSlug ? issue.dayKey === dayKeyFromSlug : false);
    }) ?? null
  );
}

export function sanitizeIssueHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "hr",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "blockquote",
      "strong",
      "em",
      "b",
      "i",
      "a",
      "pre",
      "code",
      "span",
      "div",
      "img",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      "*": ["class"],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
      img: sanitizeHtml.simpleTransform("img", { loading: "lazy" }),
    },
  });
}

export { PAGE_SIZE };
