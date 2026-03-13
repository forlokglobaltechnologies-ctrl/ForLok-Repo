import fs from 'fs';
import path from 'path';

const FUEL_PAGES = [
  { key: 'petrol', label: 'Petrol', url: 'https://www.mypetrolprice.com/petrol-price-in-india.aspx' },
  { key: 'diesel', label: 'Diesel', url: 'https://www.mypetrolprice.com/diesel-price-in-india.aspx' },
  { key: 'cng', label: 'CNG', url: 'https://www.mypetrolprice.com/cng-price-in-india.aspx' },
  { key: 'autogas', label: 'AutoGas', url: 'https://www.mypetrolprice.com/autogas-autolpg-price-in-india.aspx' },
  { key: 'lpg', label: 'LPG', url: 'https://www.mypetrolprice.com/lpg-price-in-india.aspx' },
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeStateName(name) {
  return String(name || '')
    .replace(/\s+/g, ' ')
    .replace(/&amp;/gi, '&')
    .trim();
}

function cleanCityName(name) {
  return String(name || '')
    .replace(/\s+/g, ' ')
    .replace(/&amp;/gi, '&')
    .trim();
}

function parsePage(html, fuelLabel) {
  const summaryMatch = html.match(/last updated on ([^<.]+?) and is usually updated ([^<.]+)\./i);
  const pageMeta = {
    lastUpdatedText: summaryMatch ? summaryMatch[1].trim() : null,
    updateFrequencyText: summaryMatch ? summaryMatch[2].trim() : null,
  };

  const stateHeadingRegex = /<h2><a [^>]*>(.*?)<\/a><\/h2>/g;
  const stateMatches = [...html.matchAll(stateHeadingRegex)];

  const states = {};
  const errors = [];
  let totalCities = 0;

  for (let i = 0; i < stateMatches.length; i += 1) {
    const stateName = normalizeStateName(stateMatches[i][1]);
    const blockStart = stateMatches[i].index + stateMatches[i][0].length;
    const blockEnd = i + 1 < stateMatches.length ? stateMatches[i + 1].index : html.length;
    const stateBlock = html.slice(blockStart, blockEnd);

    const cityRegex =
      /<a href="([^"]*?-price-in-[^"]+)"[^>]*>([^<]+)<\/a>\s*<span class="Arrow[^"]*">[^<]*<\/span>[\s\S]*?<b>\s*₹\s*([0-9.]+)\s*<\/b>\s*\(([-+0-9.]+)\)/gi;
    const cityMatches = [...stateBlock.matchAll(cityRegex)];
    if (cityMatches.length === 0) {
      continue;
    }

    states[stateName] = cityMatches.map((m) => {
      const city = cleanCityName(m[2]);
      const price = Number(m[3]);
      const change = Number(m[4]);
      if (!Number.isFinite(price)) {
        errors.push(`Invalid price parsed for ${fuelLabel}/${stateName}/${city}`);
      }
      if (!Number.isFinite(change)) {
        errors.push(`Invalid change parsed for ${fuelLabel}/${stateName}/${city}`);
      }
      totalCities += 1;
      return {
        city,
        price: Number.isFinite(price) ? price : null,
        change: Number.isFinite(change) ? change : null,
        currency: 'INR',
        sourceUrl: m[1].startsWith('http') ? m[1] : `https://www.mypetrolprice.com${m[1]}`,
      };
    });
  }

  return {
    ...pageMeta,
    states,
    totalStates: Object.keys(states).length,
    totalCities,
    parseErrors: errors,
  };
}

async function fetchPage(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ForLokFuelSync/1.0; +https://forlok.com)',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  return response.text();
}

async function main() {
  const startedAt = new Date().toISOString();
  const output = {
    source: 'mypetrolprice.com',
    generatedAt: startedAt,
    pages: {},
    stats: {
      fuelTypesRequested: FUEL_PAGES.length,
      fuelTypesSucceeded: 0,
      fuelTypesFailed: 0,
      totalStates: 0,
      totalCities: 0,
    },
    failures: [],
  };

  for (const [idx, fuel] of FUEL_PAGES.entries()) {
    try {
      const html = await fetchPage(fuel.url);
      const parsed = parsePage(html, fuel.label);
      output.pages[fuel.key] = {
        fuel: fuel.label,
        url: fuel.url,
        ...parsed,
      };
      output.stats.fuelTypesSucceeded += 1;
      output.stats.totalStates += parsed.totalStates;
      output.stats.totalCities += parsed.totalCities;
      console.log(
        `[ok] ${fuel.label}: states=${parsed.totalStates}, cities=${parsed.totalCities}, updated=${parsed.lastUpdatedText || 'unknown'}`
      );
    } catch (error) {
      output.stats.fuelTypesFailed += 1;
      output.failures.push({
        fuel: fuel.label,
        url: fuel.url,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`[fail] ${fuel.label}: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Short pacing delay to avoid hammering the site.
    if (idx < FUEL_PAGES.length - 1) {
      await delay(450);
    }
  }

  const rootOutputPath = path.resolve(process.cwd(), '..', 'fuel_rates_scraped_all_types.json');
  const backendOutputPath = path.resolve(process.cwd(), 'fuel_rates_scraped_all_types.json');

  fs.writeFileSync(rootOutputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf-8');
  fs.writeFileSync(backendOutputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf-8');

  console.log(`\nSaved JSON:\n- ${rootOutputPath}\n- ${backendOutputPath}`);
  console.log(
    `Summary: succeeded=${output.stats.fuelTypesSucceeded}/${output.stats.fuelTypesRequested}, totalCities=${output.stats.totalCities}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
