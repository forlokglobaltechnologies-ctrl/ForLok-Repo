import PricingFuelRate from '../models/PricingFuelRate';

type FuelKey = 'petrol' | 'diesel' | 'cng' | 'autogas' | 'lpg';

const FUEL_PAGES: Array<{ key: FuelKey; label: string; url: string }> = [
  { key: 'petrol', label: 'Petrol', url: 'https://www.mypetrolprice.com/petrol-price-in-india.aspx' },
  { key: 'diesel', label: 'Diesel', url: 'https://www.mypetrolprice.com/diesel-price-in-india.aspx' },
  { key: 'cng', label: 'CNG', url: 'https://www.mypetrolprice.com/cng-price-in-india.aspx' },
  { key: 'autogas', label: 'AutoGas', url: 'https://www.mypetrolprice.com/autogas-autolpg-price-in-india.aspx' },
  { key: 'lpg', label: 'LPG', url: 'https://www.mypetrolprice.com/lpg-price-in-india.aspx' },
];

const normalizeStateName = (name?: string) => String(name || '').replace(/\s+/g, ' ').replace(/&amp;/gi, '&').trim();
const cleanCityName = (name?: string) => String(name || '').replace(/\s+/g, ' ').replace(/&amp;/gi, '&').trim();
const cityToKey = (city: string) => city.trim().toUpperCase().replace(/\s+/g, '_');

interface ParsedFuelPage {
  fuel: FuelKey;
  label: string;
  url: string;
  lastUpdatedText: string | null;
  updateFrequencyText: string | null;
  states: Record<string, Array<{ city: string; price: number; change: number; sourceUrl: string }>>;
  totalStates: number;
  totalCities: number;
}

const parseFuelPage = (html: string, fuel: FuelKey, label: string, url: string): ParsedFuelPage => {
  const summaryMatch = html.match(/last updated on ([^<.]+?) and is usually updated ([^<.]+)\./i);
  const stateHeadingRegex = /<h2><a [^>]*>(.*?)<\/a><\/h2>/g;
  const stateMatches = [...html.matchAll(stateHeadingRegex)];
  const states: ParsedFuelPage['states'] = {};
  let totalCities = 0;

  for (let i = 0; i < stateMatches.length; i += 1) {
    const stateName = normalizeStateName(stateMatches[i][1]);
    const blockStart = (stateMatches[i].index || 0) + stateMatches[i][0].length;
    const blockEnd = i + 1 < stateMatches.length ? (stateMatches[i + 1].index || html.length) : html.length;
    const block = html.slice(blockStart, blockEnd);
    const cityRegex =
      /<a href="([^"]*?-price-in-[^"]+)"[^>]*>([^<]+)<\/a>\s*<span class="Arrow[^"]*">[^<]*<\/span>[\s\S]*?<b>\s*₹\s*([0-9.]+)\s*<\/b>\s*\(([-+0-9.]+)\)/gi;
    const cityMatches = [...block.matchAll(cityRegex)];
    if (cityMatches.length === 0) continue;
    states[stateName] = cityMatches.map((m) => {
      totalCities += 1;
      return {
        city: cleanCityName(m[2]),
        price: Number(m[3]),
        change: Number(m[4]),
        sourceUrl: m[1].startsWith('http') ? m[1] : `https://www.mypetrolprice.com${m[1]}`,
      };
    });
  }

  return {
    fuel,
    label,
    url,
    lastUpdatedText: summaryMatch ? summaryMatch[1].trim() : null,
    updateFrequencyText: summaryMatch ? summaryMatch[2].trim() : null,
    states,
    totalStates: Object.keys(states).length,
    totalCities,
  };
};

const fetchFuelPage = async (url: string): Promise<string> => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ForLokFuelSync/1.0)',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
  return response.text();
};

export class FuelSyncService {
  async syncMyPetrolPrice(adminId?: string) {
    const pages: ParsedFuelPage[] = [];
    const failures: Array<{ fuel: FuelKey; url: string; error: string }> = [];
    for (const page of FUEL_PAGES) {
      try {
        const html = await fetchFuelPage(page.url);
        pages.push(parseFuelPage(html, page.key, page.label, page.url));
      } catch (error) {
        failures.push({
          fuel: page.key,
          url: page.url,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const fuelMap = new Map<
      string,
      {
        city: string;
        state: string;
        petrol?: number;
        diesel?: number;
        cng?: number;
        sourceUrls: string[];
      }
    >();

    for (const page of pages) {
      for (const [stateName, cities] of Object.entries(page.states)) {
        for (const row of cities) {
          const key = cityToKey(row.city);
          const existing = fuelMap.get(key) || {
            city: row.city,
            state: stateName,
            sourceUrls: [],
          };
          if (page.fuel === 'petrol') existing.petrol = row.price;
          if (page.fuel === 'diesel') existing.diesel = row.price;
          if (page.fuel === 'cng') existing.cng = row.price;
          existing.sourceUrls.push(row.sourceUrl);
          fuelMap.set(key, existing);
        }
      }
    }

    const now = new Date().toISOString().slice(0, 10);
    const docs = [...fuelMap.entries()].map(([cityKey, value]) => ({
      cityKey,
      city: value.city,
      state: value.state,
      petrol: value.petrol,
      diesel: value.diesel,
      cng: value.cng,
      source: 'scrape_mypetrolprice' as const,
      effectiveDate: now,
      isActive: true,
      updatedBy: adminId,
      trafficProfile: 'medium',
      cityTier: 'mixed',
    }));

    if (docs.length > 0) {
      await PricingFuelRate.bulkWrite(
        docs.map((row) => ({
          updateOne: {
            filter: { cityKey: row.cityKey },
            update: { $set: row },
            upsert: true,
          },
        })),
        { ordered: false }
      );
    }

    const defaultExists = await PricingFuelRate.exists({ cityKey: 'DEFAULT' });
    if (!defaultExists) {
      await PricingFuelRate.create({
        cityKey: 'DEFAULT',
        city: 'DEFAULT',
        state: 'NA',
        cityTier: 'mixed',
        petrol: 105,
        diesel: 92,
        cng: 85,
        electricity: 12,
        trafficProfile: 'medium',
        source: 'manual',
        effectiveDate: now,
        isActive: true,
        updatedBy: adminId,
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      pages: pages.map((p) => ({
        fuel: p.fuel,
        totalStates: p.totalStates,
        totalCities: p.totalCities,
        lastUpdatedText: p.lastUpdatedText,
        updateFrequencyText: p.updateFrequencyText,
      })),
      updatedCities: docs.length,
      failures,
    };
  }
}

export const fuelSyncService = new FuelSyncService();
export default fuelSyncService;
