import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

if (!script) {
  throw new Error("Could not find inline script in index.html");
}

function fakeEl() {
  return {
    classList: { toggle() {}, add() {}, remove() {} },
    textContent: "",
    innerHTML: "",
    value: "",
    addEventListener() {},
    querySelector() { return fakeEl(); },
    querySelectorAll() { return []; },
    appendChild() {},
    click() {},
    remove() {}
  };
}

const context = {
  console,
  document: { querySelector: fakeEl, createElement: fakeEl, body: fakeEl() },
  localStorage: { getItem() { return null; }, setItem() {} },
  window: { open() { return {}; }, addEventListener() {} },
  navigator: {},
  Blob: function Blob() {},
  URL: { createObjectURL() { return ""; }, revokeObjectURL() {} },
  setTimeout,
  Math,
  Date,
  encodeURIComponent
};

vm.createContext(context);
vm.runInContext(script, context);

const samples = fs.readdirSync(dirname)
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(fs.readFileSync(path.join(dirname, file), "utf8")));

let failed = false;

for (const sample of samples) {
  const pois = context.parsePois(sample.input, sample.city || "");
  const names = pois.map((poi) => poi.name);
  const missing = sample.expectedPois.filter((name) => !names.includes(name));
  const unexpected = sample.unexpectedPois.filter((name) => names.includes(name));
  const extras = names.filter((name) => !sample.expectedPois.includes(name));
  const urls = pois.map((poi) => context.mapUrl(poi));
  const forbiddenMapTerms = sample.forbiddenMapTerms || [];
  const forbiddenUrls = forbiddenMapTerms.filter((term) => {
    const encoded = encodeURIComponent(term);
    return urls.some((url) => url.includes(term) || url.includes(encoded));
  });

  if (missing.length || unexpected.length || extras.length || forbiddenUrls.length) {
    failed = true;
    console.error(`FAIL ${sample.name}`);
    if (missing.length) console.error(`  Missing: ${missing.join(", ")}`);
    if (unexpected.length) console.error(`  Unexpected: ${unexpected.join(", ")}`);
    if (extras.length) console.error(`  Extras: ${extras.join(", ")}`);
    if (forbiddenUrls.length) console.error(`  Forbidden map terms: ${forbiddenUrls.join(", ")}`);
    console.error(`  Actual: ${names.join(", ")}`);
  } else {
    console.log(`PASS ${sample.name}: ${names.length} POIs`);
  }
}

if (failed) process.exitCode = 1;
