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
    ? `\n                <p class="lesson-desc">${escapeHtml(
        lesson.description
      )}</p>`
    : "";
  return `            <a class="lesson" href="${escapeHtml(lesson.href)}">
                <h3 class="lesson-title">${escapeHtml(lesson.title)}</h3>${desc}
                <span class="lesson-cta">Open lesson <span aria-hidden="true">&rarr;</span></span>
            </a>`;
}

function renderSection(section) {
  return `        <section class="section">
            <h2 class="section-title">${escapeHtml(section.title)}</h2>
            <div class="lessons">
${section.lessons.map(renderLesson).join("\n")}
            </div>
        </section>`;
}

function renderIndex(sections) {
  const body = sections.length
    ? sections.map(renderSection).join("\n\n")
    : `        <p class="empty">No lessons found yet. Drop an .html file into a subfolder and rerun the generator.</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teaching Materials</title>
    <meta name="description" content="A wiki of interactive teaching materials and explanations.">
    <style>
        :root {
            color-scheme: light;
            --cp-bg: #f7f4ef;
            --cp-bg-elevated: #fcfbf8;
            --cp-surface: #ffffff;
            --cp-surface-soft: #f5f5f5;
            --cp-border: #dedede;
            --cp-border-strong: #919191;
            --cp-text: #242424;
            --cp-text-muted: #5c5c5c;
            --cp-text-soft: #6f6f6f;
            --cp-accent: #b11f4b;
            --cp-accent-hover: #9a1a41;
            --cp-accent-soft: rgba(177, 31, 75, 0.08);
            --cp-accent-fg: #ffffff;
            --cp-shadow: 0 18px 48px rgba(0, 0, 0, 0.12);
        }
        @media (prefers-color-scheme: dark) {
            :root {
                color-scheme: dark;
                --cp-bg: #3d3b3a;
                --cp-bg-elevated: #343231;
                --cp-surface: #292929;
                --cp-surface-soft: #2e2e2e;
                --cp-border: #474747;
                --cp-border-strong: #5f5f5f;
                --cp-text: #dedede;
                --cp-text-muted: #919191;
                --cp-text-soft: #b0b0b0;
                --cp-accent: #fd8ea1;
                --cp-accent-hover: #fb7b91;
                --cp-accent-soft: rgba(253, 142, 161, 0.14);
                --cp-accent-fg: #1a1a1a;
                --cp-shadow: 0 18px 48px rgba(0, 0, 0, 0.32);
            }
        }

        * { box-sizing: border-box; }
        html, body {
            margin: 0;
            padding: 0;
            background: var(--cp-bg);
            color: var(--cp-text);
            font-family: "Segoe UI", Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif;
            line-height: 1.5;
            min-height: 100vh;
        }
        .wrap {
            max-width: 880px;
            margin: 0 auto;
            padding: 64px 24px 96px;
        }
        header {
            margin-bottom: 48px;
        }
        .eyebrow {
            color: var(--cp-accent);
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin: 0 0 8px;
        }
        h1 {
            font-size: 2.2rem;
            margin: 0 0 12px;
            letter-spacing: -0.01em;
        }
        .lede {
            color: var(--cp-text-muted);
            margin: 0;
            font-size: 1.05rem;
            max-width: 60ch;
        }

        .section + .section {
            margin-top: 48px;
        }
        .section-title {
            margin: 0 0 16px;
            font-size: 0.85rem;
            color: var(--cp-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-weight: 600;
        }
        .lessons {
            display: grid;
            gap: 12px;
        }
        a.lesson {
            display: block;
            position: relative;
            padding: 20px 22px;
            background: var(--cp-surface);
            border: 1px solid var(--cp-border);
            border-radius: 16px;
            color: var(--cp-text);
            text-decoration: none;
            box-shadow: 0 0 2px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.08);
            transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }
        a.lesson:hover,
        a.lesson:focus-visible {
            border-color: var(--cp-accent);
            background: var(--cp-accent-soft);
            transform: translateY(-1px);
            box-shadow: var(--cp-shadow);
            outline: none;
        }
        .lesson-title {
            margin: 0 0 6px;
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--cp-text);
        }
        .lesson-desc {
            margin: 0 0 10px;
            color: var(--cp-text-muted);
            font-size: 0.95rem;
        }
        .lesson-cta {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            color: var(--cp-accent);
            font-size: 0.85rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        a.lesson:hover .lesson-cta span[aria-hidden="true"] {
            transform: translateX(2px);
        }
        .lesson-cta span[aria-hidden="true"] {
            transition: transform 0.15s ease;
        }

        .empty {
            color: var(--cp-text-muted);
            background: var(--cp-surface-soft);
            border: 1px dashed var(--cp-border);
            border-radius: 12px;
            padding: 24px;
        }
    </style>
</head>
<body>
    <div class="wrap">
        <header>
            <p class="eyebrow">Teaching Materials</p>
            <h1>Interactive explanations &amp; demos</h1>
            <p class="lede">A small wiki of hands-on lessons. Pick a topic to dive in.</p>
        </header>

${body}
    </div>
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
