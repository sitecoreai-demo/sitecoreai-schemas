const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "src");
const publicDir = path.join(root, "public");
const baseUrl = process.env.SCHEMA_BASE_URL || "https://schemas.sitecoreai.dev/";

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

const readSchemaFiles = (dir, prefix = "") => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    const relativePath = path.join(prefix, entry.name);
    if (entry.isDirectory()) {
      results.push(...readSchemaFiles(entryPath, relativePath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".json")) {
      results.push(relativePath.replace(/\\/g, "/"));
    }
  }
  return results.sort((a, b) => a.localeCompare(b));
};

const copySchemas = (files) => {
  ensureDir(publicDir);
  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(publicDir, file);
    ensureDir(path.dirname(destPath));
    fs.copyFileSync(srcPath, destPath);
  }
};


const renderIndex = (files) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SitecoreAI Schemas</title>
    <style>
      body {
        font-family: Arial, Helvetica, sans-serif;
        margin: 2rem;
        max-width: 720px;
        line-height: 1.5;
      }
      code {
        background: #f6f8fa;
        padding: 0.1rem 0.25rem;
        border-radius: 4px;
      }
    </style>
  </head>
  <body>
    <h1>SitecoreAI Schemas</h1>
    <p>Public JSON schema documents for SitecoreAI tools.</p>
    <ul>
${files.map((file) => `      <li><a href="/${file}">${file}</a></li>`).join("\n")}
    </ul>
    <p>Base URL: <code>${baseUrl}</code></p>
  </body>
</html>
`;

const writeIndex = (files) => {
  const html = renderIndex(files);
  fs.writeFileSync(path.join(publicDir, "index.html"), html, "utf8");
};

const files = readSchemaFiles(srcDir);
copySchemas(files);
writeIndex(files);
console.log(`Generated ${files.length} schemas in ${publicDir}`);
