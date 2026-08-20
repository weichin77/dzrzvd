import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

import { parseShopeeExport } from "../lib/catalog/parse-shopee-export.ts";

function usage() {
  console.error(
    "Usage: npm run catalog:sync -- <shopee-export.xlsx> [output.json]",
  );
}

const [, , inputArgument, outputArgument] = process.argv;

if (!inputArgument) {
  usage();
  process.exitCode = 1;
} else {
  const inputPath = resolve(inputArgument);
  const outputPath = resolve(outputArgument || "data/dzrzvd-catalog.json");
  const parsed = parseShopeeExport(await readFile(inputPath));

  if (parsed.stats.included === 0) {
    throw new Error("No DZRZVD products were found; refusing to write output.");
  }

  const artifact = {
    generatedAt: new Date().toISOString(),
    sourceFilename: basename(inputPath),
    ...parsed,
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

  console.log(`Catalog written to ${outputPath}`);
  console.log(
    `Rows: ${parsed.stats.totalRows}; included: ${parsed.stats.included}; ` +
      `excluded: ${parsed.stats.excludedNotDzrzvd + parsed.stats.excludedMissingField}; ` +
      `categories: ${parsed.categories.length}`,
  );

  if (parsed.missingTranslations.length) {
    console.warn(
      `Missing category translations: ${parsed.missingTranslations.join(", ")}`,
    );
  }
}
