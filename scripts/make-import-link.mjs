// Turns a backup file (or a bare StoreData JSON) into an import link:
//   node scripts/make-import-link.mjs veri.json
// Uses the same deflate-raw + base64url format as src/lib/backup.ts.
import { readFileSync } from "node:fs";
import { deflateRawSync } from "node:zlib";

const file = process.argv[2];
if (!file) {
  console.error("Kullanım: node scripts/make-import-link.mjs <dosya.json>");
  process.exit(1);
}
const parsed = JSON.parse(readFileSync(file, "utf8"));
const data = parsed.app === "eyeson" ? parsed.data : parsed;
const code = deflateRawSync(Buffer.from(JSON.stringify(data))).toString("base64url");
const link = `https://pirus0.github.io/eyeson/#yukle=${code}`;
console.log(link);
console.error(`\n${link.length} karakter`);
