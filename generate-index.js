#!/usr/bin/env node
/**
 * Generates index.html by scanning the project root for subfolders
 * containing .html files.
 *
 * - Each subfolder becomes a section (folder name -> "Title Case").
 * - Each .html file becomes a card linking to it.
 * - Card title comes from <title>, description from <meta name="description">.
 *
 * Run: node generate-index.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUTPUT = path.join(ROOT, "index.html");
const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".netlify",
  ".vscode",
  ".idea",
]);

// --- helpers ---------------------------------------------------------------

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function extractTag(html, regex) {
  const match = html.match(regex);
  return match ? decodeEntities(match[1]).trim() : null;
}

function readMeta(filePath) {
  const html = fs.readFileSync(filePath, "utf8");
  const title =
    extractTag(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ||
    path.basename(filePath, ".html");
  const description =
    extractTag(
      html,
      /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i
    ) ||
    extractTag(
      html,
      /<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i
    ) ||
    "";
  return { title, description };
}

function titleCase(slug) {
  return slug
    .split(/[-_\s]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function listHtmlFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".html"))
    .map((e) => e.name)
    .sort();
}

function listSections(root) {
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter(
      (e) =>
        e.isDirectory() &&
        !e.name.startsWith(".") &&
        !IGNORE_DIRS.has(e.name)
    )
    .map((e) => e.name)
    .sort()
    .map((name) => {
      const files = listHtmlFiles(path.join(root, name));
      return {
        name,
        title: titleCase(name),
        lessons: files.map((file) => {
          const meta = readMeta(path.join(root, name, file));
          return {
            href: `${name}/${file}`,
            title: meta.title,
            description: meta.description,
          };
        }),
      };
    })
    .filter((section) => section.lessons.length > 0);
}

// --- template --------------------------------------------------------------

function renderLesson(lesson) {
  const desc = lesson.description
    ? `\n                <div class="lesson-desc">${escapeHtml(
        lesson.description
      )}</div>`
    : "";
  return `            <a class="lesson" href="${escapeHtml(lesson.href)}">
                <div class="lesson-title">${escapeHtml(lesson.title)}</div>${desc}
            </a>`;
}

function renderSection(section) {
  return `        <h2>${escapeHtml(section.title)}</h2>
        <div class="lessons">
${section.lessons.map(renderLesson).join("\n")}
        </div>`;
}

function renderIndex(sections) {
  const body = sections.length
    ? sections.map(renderSection).join("\n\n")
    : `        <p class="subtitle">No lessons found yet. Drop an .html file into a subfolder and rerun the generator.</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teaching Materials</title>
    <meta name="description" content="A wiki of interactive teaching materials and explanations.">
    <style>
        :root {
            color-scheme: light dark;
            --bg: #f7f7f8;
            --fg: #1a1a1a;
            --muted: #666;
            --card: #fff;
            --border: #e5e5e7;
            --accent: #5b3fd9;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --bg: #131316;
                --fg: #f0f0f2;
                --muted: #9a9aa3;
                --card: #1c1c20;
                --border: #2a2a30;
                --accent: #9d86ff;
            }
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
            background: var(--bg);
            color: var(--fg);
            line-height: 1.5;
            min-height: 100vh;
        }
        main {
            max-width: 720px;
            margin: 0 auto;
            padding: 4rem 1.5rem;
        }
        h1 {
            font-size: 2rem;
            margin: 0 0 0.5rem;
            letter-spacing: -0.02em;
        }
        .subtitle {
            color: var(--muted);
            margin: 0 0 3rem;
        }
        h2 {
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--muted);
            margin: 2.5rem 0 1rem;
            font-weight: 600;
        }
        .lessons {
            display: grid;
            gap: 0.75rem;
        }
        a.lesson {
            display: block;
            padding: 1.25rem 1.5rem;
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            color: var(--fg);
            text-decoration: none;
            transition: transform 0.15s ease, border-color 0.15s ease;
        }
        a.lesson:hover {
            border-color: var(--accent);
            transform: translateY(-1px);
        }
        .lesson-title {
            font-weight: 600;
            font-size: 1.05rem;
            margin-bottom: 0.25rem;
        }
        .lesson-desc {
            color: var(--muted);
            font-size: 0.9rem;
        }
        footer {
            margin-top: 4rem;
            color: var(--muted);
            font-size: 0.8rem;
        }
    </style>
</head>
<body>
    <main>
        <h1>Teaching Materials</h1>
        <p class="subtitle">Interactive demos and explanations.</p>

${body}
    </main>
</body>
</html>
`;
}

// --- main ------------------------------------------------------------------

const sections = listSections(ROOT);
fs.writeFileSync(OUTPUT, renderIndex(sections));

const total = sections.reduce((sum, s) => sum + s.lessons.length, 0);
console.log(
  `Generated index.html: ${sections.length} section(s), ${total} lesson(s).`
);
for (const s of sections) {
  console.log(`  ${s.title}:`);
  for (const l of s.lessons) console.log(`    - ${l.title}  (${l.href})`);
}
