const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "src");
const publicDir = path.join(root, "public");
const latestVersion = "v1";
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

const copySchemas = (files, sourceRoot, targetDir) => {
  ensureDir(targetDir);
  for (const file of files) {
    const srcPath = path.join(sourceRoot, file);
    const destPath = path.join(targetDir, file);
    ensureDir(path.dirname(destPath));
    fs.copyFileSync(srcPath, destPath);
  }
};

const readVersions = () =>
  fs
    .readdirSync(srcDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("v"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

const parseVersionNumber = (version) => {
  const match = /^v(\d+)$/.exec(version);
  return match ? Number(match[1]) : Number.NaN;
};

const compareVersions = (a, b) => {
  const aNum = parseVersionNumber(a);
  const bNum = parseVersionNumber(b);
  if (Number.isNaN(aNum) || Number.isNaN(bNum)) {
    return a.localeCompare(b);
  }
  return aNum - bNum;
};


const renderIndex = (latestFiles, latestByFile, versions, versionFiles) => `<!doctype html>
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
${latestFiles
  .map(
    (file) =>
      `      <li><a href="/${file}">${file}</a> <span>(${latestByFile[file]})</span></li>`
  )
  .join("\n")}
    </ul>
${versions
  .map(
    (version) => `
    <h2>Versioned (${version})</h2>
    <ul>
${(versionFiles[version] ?? [])
  .map((file) => `      <li><a href="/${version}/${file}">${file}</a></li>`)
  .join("\n")}
    </ul>`
  )
  .join("\n")}
    <p>Base URL: <code>${baseUrl}</code></p>
  </body>
</html>
`;

const writeIndex = (latestFiles, latestByFile, versions, versionFiles) => {
  const html = renderIndex(latestFiles, latestByFile, versions, versionFiles);
  fs.writeFileSync(path.join(publicDir, "index.html"), html, "utf8");
};

const versions = readVersions().sort(compareVersions);
const versionFiles = {};
const latestByFile = {};

for (const version of versions) {
  const versionDir = path.join(srcDir, version);
  const files = readSchemaFiles(versionDir);
  versionFiles[version] = files;
  copySchemas(files, versionDir, path.join(publicDir, version));
}

for (const version of versions) {
  const files = versionFiles[version] ?? [];
  for (const file of files) {
    latestByFile[file] = version;
  }
}

const latestFiles = Object.keys(latestByFile).sort((a, b) => a.localeCompare(b));
for (const file of latestFiles) {
  const version = latestByFile[file];
  const sourceDir = path.join(srcDir, version);
  copySchemas([file], sourceDir, publicDir);
}

if (latestFiles.length === 0 && fs.existsSync(path.join(srcDir, latestVersion))) {
  const fallbackFiles = readSchemaFiles(path.join(srcDir, latestVersion));
  for (const file of fallbackFiles) {
    latestByFile[file] = latestVersion;
  }
  copySchemas(fallbackFiles, path.join(srcDir, latestVersion), publicDir);
}

writeIndex(latestFiles, latestByFile, versions, versionFiles);
console.log(`Generated ${latestFiles.length} schemas in ${publicDir}`);
