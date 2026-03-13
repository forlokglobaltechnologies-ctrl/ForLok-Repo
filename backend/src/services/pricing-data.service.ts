import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';
import PricingFuelRate from '../models/PricingFuelRate';
import PricingVehicleMileage from '../models/PricingVehicleMileage';
import { ValidationError } from '../utils/errors';

type VehicleType = 'car' | 'bike' | 'scooty';
type FuelType = 'Petrol' | 'Diesel' | 'Electric' | 'CNG';
type Transmission = 'Manual' | 'Automatic';

interface PricingVehicleRow {
  vehicleCategory: string;
  brand: string;
  model: string;
  fuelType: FuelType | string;
  transmission: Transmission | string;
  launchYear?: number;
  vehicleAgeBucket?: string;
  realWorldMileageAvg?: number;
  mileageUnit?: string;
  estimatedCostPerKmInr?: number;
  cityTier?: string;
  trafficProfile?: string;
  confidenceScore?: number;
  pricingEligible?: string;
  fallbackLevel?: string;
  recordStatus?: string;
}

interface CityFuelRow {
  city: string;
  state?: string;
  cityTier?: string;
  petrol?: number;
  diesel?: number;
  cng?: number;
  electricity?: number;
  trafficProfile?: string;
  recordStatus?: string;
}

interface VehicleBaseRateInput {
  vehicleType: VehicleType;
  brand?: string;
  model?: string;
  fuelType?: string;
  transmission?: string;
  year?: number;
  city?: string;
  state?: string;
}

interface RequiredGenericSpec {
  vehicleType: VehicleType;
  fuelType: string;
  ageBucket: string;
}

interface PerSeatPerKmBand {
  min: number;
  max: number;
}

interface PricingJsonPayload {
  vehicleRows?: Array<Partial<PricingVehicleRow>>;
  cityRows?: Array<Partial<CityFuelRow>>;
  multipliers?: Array<{ type?: string; key?: string; value?: number | string }>;
  aliases?: {
    brands?: Record<string, string>;
    models?: Record<string, string>;
  };
}

export interface VehicleBaseRateResult {
  usedCsv: boolean;
  baseRatePerKm: number;
  energyCostPerKm?: number;
  fallbackLevel: string;
  confidenceScore: number;
  cityTier: string;
  trafficProfile: string;
  contextMultiplier: number;
  contextLabel: string;
  matchedVehicle?: {
    category: string;
    brand: string;
    model: string;
    fuelType: string;
    transmission: string;
    launchYear?: number;
    ageBucket?: string;
    mileageUnit?: string;
    realWorldMileageAvg?: number;
  };
  cityFuelSnapshot?: {
    city: string;
    state?: string;
    requestedCity?: string;
    requestedState?: string;
    matchType?: 'exact' | 'nearest_city' | 'default';
    petrol?: number;
    diesel?: number;
    cng?: number;
    electricity?: number;
  };
}

export interface PricingDataHealthReport {
  loaded: boolean;
  loadedAt?: string;
  activeVehicleRows: number;
  activeCityRows: number;
  multipliersCount: number;
  genericCoverage: {
    required: number;
    covered: number;
    missing: RequiredGenericSpec[];
  };
  lookupStats: {
    totalRequests: number;
    byFallbackLevel: Record<string, number>;
    topFallbackVehicles: Array<{ key: string; count: number }>;
  };
  warnings: string[];
}

const typeToCategory = (vehicleType: VehicleType) => (vehicleType === 'car' ? '4-wheeler' : '2-wheeler');
const norm = (value?: string) => (value || '').trim().toLowerCase();
const compact = (value?: string) => norm(value).replace(/[^a-z0-9]/g, '');
const cityToken = (value?: string) => norm(value).replace(/[^a-z0-9]/g, '');

const textDistance = (a?: string, b?: string): number => {
  const x = cityToken(a);
  const y = cityToken(b);
  if (!x && !y) return 0;
  if (!x || !y) return Number.MAX_SAFE_INTEGER;
  const dp: number[][] = Array.from({ length: x.length + 1 }, () => Array(y.length + 1).fill(0));
  for (let i = 0; i <= x.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= y.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= x.length; i += 1) {
    for (let j = 1; j <= y.length; j += 1) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[x.length][y.length];
};

const parseNumber = (value?: string): number | undefined => {
  if (!value) return undefined;
  const m = String(value).match(/-?\d+(\.\d+)?/);
  if (!m) return undefined;
  const parsed = Number(m[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseCsvLine = (line: string): string[] => {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      out.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  out.push(current);
  return out.map((v) => v.trim());
};

class PricingDataService {
  private loaded = false;

  private vehicleRows: PricingVehicleRow[] = [];

  private cityRows: CityFuelRow[] = [];

  private multipliers: Map<string, number> = new Map();

  private brandAliases: Map<string, string> = new Map();

  private modelAliases: Map<string, string> = new Map();

  private requiredGenericSpecs: RequiredGenericSpec[] = [
    { vehicleType: 'car', fuelType: 'petrol', ageBucket: '0-2' },
    { vehicleType: 'car', fuelType: 'petrol', ageBucket: '2-4' },
    { vehicleType: 'car', fuelType: 'petrol', ageBucket: '4-6' },
    { vehicleType: 'car', fuelType: 'petrol', ageBucket: '6+' },
    { vehicleType: 'car', fuelType: 'diesel', ageBucket: '2-4' },
    { vehicleType: 'car', fuelType: 'diesel', ageBucket: '4-6' },
    { vehicleType: 'car', fuelType: 'diesel', ageBucket: '6+' },
    { vehicleType: 'car', fuelType: 'cng', ageBucket: '2-4' },
    { vehicleType: 'car', fuelType: 'cng', ageBucket: '4-6' },
    { vehicleType: 'car', fuelType: 'cng', ageBucket: '6+' },
    { vehicleType: 'car', fuelType: 'electric', ageBucket: '0-2' },
    { vehicleType: 'car', fuelType: 'electric', ageBucket: '2-4' },
    { vehicleType: 'bike', fuelType: 'petrol', ageBucket: '0-2' },
    { vehicleType: 'bike', fuelType: 'petrol', ageBucket: '2-4' },
    { vehicleType: 'bike', fuelType: 'petrol', ageBucket: '4-6' },
    { vehicleType: 'bike', fuelType: 'petrol', ageBucket: '6+' },
    { vehicleType: 'bike', fuelType: 'electric', ageBucket: '0-2' },
    { vehicleType: 'bike', fuelType: 'electric', ageBucket: '2-4' },
    { vehicleType: 'scooty', fuelType: 'petrol', ageBucket: '0-2' },
    { vehicleType: 'scooty', fuelType: 'petrol', ageBucket: '2-4' },
    { vehicleType: 'scooty', fuelType: 'petrol', ageBucket: '4-6' },
    { vehicleType: 'scooty', fuelType: 'petrol', ageBucket: '6+' },
    { vehicleType: 'scooty', fuelType: 'electric', ageBucket: '0-2' },
    { vehicleType: 'scooty', fuelType: 'electric', ageBucket: '2-4' },
  ];

  private genericCoverageMissing: RequiredGenericSpec[] = [];

  private dataValidationWarnings: string[] = [];

  private totalBaseRateLookups = 0;

  private fallbackUsageByLevel: Map<string, number> = new Map();

  private fallbackUsageByVehicleKey: Map<string, number> = new Map();

  private loadedAt?: string;

  private dbRowsLoadedAt = 0;

  private dbRowsLoading?: Promise<void>;

  private readonly dbRowsCacheTtlMs = 5 * 60 * 1000;

  private getCandidatePaths(fileName: string): string[] {
    const cwd = process.cwd();
    return [
      path.resolve(cwd, fileName),
      path.resolve(cwd, '..', fileName),
      path.resolve(cwd, '..', '..', fileName),
    ];
  }

  private resolveExistingFile(fileName: string): string | null {
    for (const filePath of this.getCandidatePaths(fileName)) {
      if (fs.existsSync(filePath)) return filePath;
    }
    return null;
  }

  private readCsv(filePath: string): Array<Record<string, string>> {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) return [];
    const headers = parseCsvLine(lines[0]);
    return lines.slice(1).map((line) => {
      const cols = parseCsvLine(line);
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = cols[idx] || '';
      });
      return row;
    });
  }

  private readJson(filePath: string): PricingJsonPayload | null {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as PricingJsonPayload;
    } catch (error) {
      logger.error(`Failed to parse pricing JSON file at ${filePath}:`, error);
      return null;
    }
  }

  private loadVehicleRows(): PricingVehicleRow[] {
    const filePath = this.resolveExistingFile('vehicle_mileage_pricing_master.csv');
    if (!filePath) return [];
    return this.readCsv(filePath).map((row) => ({
      vehicleCategory: row.Vehicle_Category,
      brand: row.Brand,
      model: row.Model,
      fuelType: row.Fuel_Type as FuelType,
      transmission: row.Transmission as Transmission,
      launchYear: parseNumber(row.Launch_Year),
      vehicleAgeBucket: row.Vehicle_Age_Bucket,
      realWorldMileageAvg: parseNumber(row.Real_World_Mileage_Avg),
      mileageUnit: row.Mileage_Unit,
      estimatedCostPerKmInr: parseNumber(row.Estimated_Cost_Per_Km_INR),
      cityTier: row.City_Tier,
      trafficProfile: row.Traffic_Profile,
      confidenceScore: parseNumber(row.Confidence_Score),
      pricingEligible: row.Pricing_Eligible,
      fallbackLevel: row.Fallback_Level,
      recordStatus: row.Record_Status,
    }));
  }

  private loadCityRows(): CityFuelRow[] {
    const filePath = this.resolveExistingFile('fuel_price_by_city.csv');
    if (!filePath) return [];
    return this.readCsv(filePath).map((row) => ({
      city: row.City,
      cityTier: row.City_Tier,
      petrol: parseNumber(row.Petrol_INR_per_litre),
      diesel: parseNumber(row.Diesel_INR_per_litre),
      cng: parseNumber(row.CNG_INR_per_kg),
      electricity: parseNumber(row.Electricity_INR_per_kWh),
      trafficProfile: row.Traffic_Profile,
      recordStatus: row.Record_Status,
    }));
  }

  private loadMultiplierRows(): Map<string, number> {
    const filePath = this.resolveExistingFile('pricing_multipliers.csv');
    const map = new Map<string, number>();
    if (!filePath) return map;
    this.readCsv(filePath).forEach((row) => {
      const type = norm(row.Multiplier_Type);
      const key = norm(row.Key);
      const value = parseNumber(row.Value);
      if (type && key && value !== undefined) {
        map.set(`${type}:${key}`, value);
      }
    });
    return map;
  }

  private async ensureDbRowsLoaded(force = false): Promise<void> {
    const isFresh = Date.now() - this.dbRowsLoadedAt < this.dbRowsCacheTtlMs;
    if (!force && isFresh && this.vehicleRows.length > 0 && this.cityRows.length > 0) return;
    if (this.dbRowsLoading) {
      await this.dbRowsLoading;
      return;
    }

    this.dbRowsLoading = (async () => {
      const fetchRows = async () => {
        const [vehicleDocs, fuelDocs] = await Promise.all([
          PricingVehicleMileage.find({ recordStatus: { $ne: 'inactive' } }).lean(),
          PricingFuelRate.find({ isActive: true }).lean(),
        ]);
        return { vehicleDocs, fuelDocs };
      };

      let { vehicleDocs, fuelDocs } = await fetchRows();

      // One-time bootstrap to DB from existing local datasets.
      if (vehicleDocs.length === 0 || fuelDocs.length === 0) {
        const now = new Date().toISOString().slice(0, 10);
        if (vehicleDocs.length === 0) {
          const legacyVehicles = this.loadVehicleRows();
          if (legacyVehicles.length > 0) {
            await PricingVehicleMileage.bulkWrite(
              legacyVehicles.map((row) => ({
                updateOne: {
                  filter: {
                    vehicleCategory: row.vehicleCategory,
                    brand: row.brand,
                    vehicleModel: row.model,
                    fuelType: row.fuelType,
                    transmission: row.transmission,
                    vehicleAgeBucket: row.vehicleAgeBucket || '',
                  },
                  update: {
                    $set: {
                      vehicleCategory: row.vehicleCategory,
                      brand: row.brand,
                      vehicleModel: row.model,
                      fuelType: row.fuelType,
                      transmission: row.transmission,
                      launchYear: row.launchYear,
                      vehicleAgeBucket: row.vehicleAgeBucket,
                      realWorldMileageAvg: row.realWorldMileageAvg,
                      mileageUnit: row.mileageUnit,
                      estimatedCostPerKmInr: row.estimatedCostPerKmInr,
                      cityTier: row.cityTier,
                      trafficProfile: row.trafficProfile,
                      confidenceScore: row.confidenceScore,
                      source: 'migration',
                      recordStatus: row.recordStatus || 'active',
                      pricingEligible: row.pricingEligible || 'Y',
                      fallbackLevel: row.fallbackLevel || 'model_exact',
                    },
                  },
                  upsert: true,
                },
              })),
              { ordered: false }
            );
            logger.info(`Pricing mileage rows migrated to DB: ${legacyVehicles.length}`);
          }
        }

        if (fuelDocs.length === 0) {
          const normalized = [{
            city: 'DEFAULT',
            cityTier: 'mixed',
            petrol: 105,
            diesel: 92,
            cng: 85,
            electricity: 12,
            trafficProfile: 'medium',
            recordStatus: 'active',
          }];
          await PricingFuelRate.bulkWrite(
            normalized.map((row) => ({
              updateOne: {
                filter: { cityKey: String(row.city || 'DEFAULT').trim().toUpperCase().replace(/\s+/g, '_') },
                update: {
                  $set: {
                    cityKey: String(row.city || 'DEFAULT').trim().toUpperCase().replace(/\s+/g, '_'),
                    city: row.city || 'DEFAULT',
                    cityTier: row.cityTier || 'mixed',
                    petrol: row.petrol,
                    diesel: row.diesel,
                    cng: row.cng,
                    electricity: row.electricity,
                    trafficProfile: row.trafficProfile || 'medium',
                    source: 'migration',
                    effectiveDate: now,
                    isActive: norm(row.recordStatus || 'active') !== 'inactive',
                  },
                },
                upsert: true,
              },
            })),
            { ordered: false }
          );
          logger.info(`Pricing fuel rows migrated to DB: ${normalized.length}`);
        }

        const refreshed = await fetchRows();
        vehicleDocs = refreshed.vehicleDocs;
        fuelDocs = refreshed.fuelDocs;
      }

      this.vehicleRows = vehicleDocs.map((row: any) => ({
        vehicleCategory: row.vehicleCategory,
        brand: row.brand,
        model: row.vehicleModel,
        fuelType: row.fuelType,
        transmission: row.transmission,
        launchYear: row.launchYear,
        vehicleAgeBucket: row.vehicleAgeBucket,
        realWorldMileageAvg: row.realWorldMileageAvg,
        mileageUnit: row.mileageUnit,
        estimatedCostPerKmInr: row.estimatedCostPerKmInr,
        cityTier: row.cityTier,
        trafficProfile: row.trafficProfile,
        confidenceScore: row.confidenceScore,
        pricingEligible: row.pricingEligible || 'Y',
        fallbackLevel: row.fallbackLevel,
        recordStatus: row.recordStatus || 'active',
      }));

      this.cityRows = fuelDocs.map((row: any) => ({
        city: row.city,
        state: row.state,
        cityTier: row.cityTier,
        petrol: row.petrol,
        diesel: row.diesel,
        cng: row.cng,
        electricity: row.electricity,
        trafficProfile: row.trafficProfile,
        recordStatus: row.isActive === false ? 'inactive' : 'active',
      }));

      if (!this.cityRows.find((row) => norm(row.city) === 'default')) {
        this.cityRows.push({
          city: 'DEFAULT',
          state: 'NA',
          cityTier: 'mixed',
          petrol: 105,
          diesel: 92,
          cng: 85,
          electricity: 12,
          trafficProfile: 'medium',
          recordStatus: 'active',
        });
      }

      this.validateGenericCoverage();
      this.dbRowsLoadedAt = Date.now();
    })();

    try {
      await this.dbRowsLoading;
    } finally {
      this.dbRowsLoading = undefined;
    }
  }

  private loadFromJson(): boolean {
    const filePath = this.resolveExistingFile('pricing_engine_data.json');
    if (!filePath) return false;

    const json = this.readJson(filePath);
    if (!json) return false;

    const vehicles = Array.isArray(json.vehicleRows)
      ? json.vehicleRows.map((row) => ({
          vehicleCategory: String(row.vehicleCategory || ''),
          brand: String(row.brand || ''),
          model: String(row.model || ''),
          fuelType: String(row.fuelType || ''),
          transmission: String(row.transmission || ''),
          launchYear: Number.isFinite(Number(row.launchYear)) ? Number(row.launchYear) : undefined,
          vehicleAgeBucket: row.vehicleAgeBucket ? String(row.vehicleAgeBucket) : undefined,
          realWorldMileageAvg: Number.isFinite(Number(row.realWorldMileageAvg))
            ? Number(row.realWorldMileageAvg)
            : undefined,
          mileageUnit: row.mileageUnit ? String(row.mileageUnit) : undefined,
          estimatedCostPerKmInr: Number.isFinite(Number(row.estimatedCostPerKmInr))
            ? Number(row.estimatedCostPerKmInr)
            : undefined,
          cityTier: row.cityTier ? String(row.cityTier) : undefined,
          trafficProfile: row.trafficProfile ? String(row.trafficProfile) : undefined,
          confidenceScore: Number.isFinite(Number(row.confidenceScore))
            ? Number(row.confidenceScore)
            : undefined,
          pricingEligible: row.pricingEligible ? String(row.pricingEligible) : 'Y',
          fallbackLevel: row.fallbackLevel ? String(row.fallbackLevel) : undefined,
          recordStatus: row.recordStatus ? String(row.recordStatus) : 'active',
        }))
      : [];

    const cities = Array.isArray(json.cityRows)
      ? json.cityRows.map((row) => ({
          city: String(row.city || 'DEFAULT'),
          state: row.state ? String(row.state) : undefined,
          cityTier: row.cityTier ? String(row.cityTier) : undefined,
          petrol: Number.isFinite(Number(row.petrol)) ? Number(row.petrol) : undefined,
          diesel: Number.isFinite(Number(row.diesel)) ? Number(row.diesel) : undefined,
          cng: Number.isFinite(Number(row.cng)) ? Number(row.cng) : undefined,
          electricity: Number.isFinite(Number(row.electricity)) ? Number(row.electricity) : undefined,
          trafficProfile: row.trafficProfile ? String(row.trafficProfile) : undefined,
          recordStatus: row.recordStatus ? String(row.recordStatus) : 'active',
        }))
      : [];

    const multiplierMap = new Map<string, number>();
    if (Array.isArray(json.multipliers)) {
      json.multipliers.forEach((m) => {
        const type = norm(m.type);
        const key = norm(m.key);
        const value = Number(m.value);
        if (type && key && Number.isFinite(value)) {
          multiplierMap.set(`${type}:${key}`, value);
        }
      });
    }

    const brandAliasMap = new Map<string, string>();
    const modelAliasMap = new Map<string, string>();
    Object.entries(json.aliases?.brands || {}).forEach(([k, v]) => {
      const nk = norm(k);
      const nv = norm(v);
      if (nk && nv) brandAliasMap.set(nk, nv);
    });
    Object.entries(json.aliases?.models || {}).forEach(([k, v]) => {
      const nk = norm(k);
      const nv = norm(v);
      if (nk && nv) modelAliasMap.set(nk, nv);
    });

    this.vehicleRows = vehicles;
    this.cityRows = cities;
    this.multipliers = multiplierMap;
    this.brandAliases = brandAliasMap;
    this.modelAliases = modelAliasMap;

    logger.info(
      `Pricing JSON loaded (${path.basename(filePath)}): vehicles=${vehicles.length}, cities=${cities.length}, multipliers=${multiplierMap.size}, brandAliases=${brandAliasMap.size}, modelAliases=${modelAliasMap.size}`
    );
    return vehicles.length > 0 && cities.length > 0 && multiplierMap.size > 0;
  }

  private canonicalBrand(value?: string): string {
    const v = norm(value);
    if (!v) return '';
    return this.brandAliases.get(v) || v;
  }

  private canonicalModel(value?: string): string {
    const v = norm(value);
    if (!v) return '';
    return this.modelAliases.get(v) || v;
  }

  private getAgeBucket(year?: number): string {
    if (!year) return '2-6';
    const age = Math.max(0, new Date().getFullYear() - year);
    if (age < 2) return '0-2';
    if (age < 4) return '2-4';
    if (age < 6) return '4-6';
    return '6+';
  }

  private isActiveEligible(row: PricingVehicleRow): boolean {
    const active = norm(row.recordStatus || 'active') === 'active';
    const eligible = norm(row.pricingEligible || 'y') === 'y';
    return active && eligible;
  }

  private getMultiplier(type: string, key: string, fallback = 1): number {
    return this.multipliers.get(`${norm(type)}:${norm(key)}`) ?? fallback;
  }

  private getGenericModelCandidates(vehicleType: VehicleType): string[] {
    if (vehicleType === 'car') return ['generic_car', 'generic'];
    if (vehicleType === 'bike') return ['generic_bike', 'generic_2w', 'generic'];
    return ['generic_scooty', 'generic_2w', 'generic'];
  }

  private parseAgeBucketRange(value?: string): { min: number; max: number } | null {
    const bucket = norm(value);
    if (!bucket) return null;
    if (bucket === '6+') return { min: 6, max: Number.POSITIVE_INFINITY };
    const m = bucket.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      const min = Number(m[1]);
      const max = Number(m[2]);
      if (Number.isFinite(min) && Number.isFinite(max) && max >= min) {
        return { min, max };
      }
    }
    return null;
  }

  private ageBucketMatches(requestedBucket: string, candidateBucket?: string): boolean {
    const req = this.parseAgeBucketRange(requestedBucket);
    const candidate = this.parseAgeBucketRange(candidateBucket);
    if (!req || !candidate) return false;
    return candidate.min <= req.max && req.min <= candidate.max;
  }

  private coverageBucketSatisfied(specBucket: string, candidateBucket?: string): boolean {
    return this.ageBucketMatches(specBucket, candidateBucket);
  }

  private getVehicleLookupKey(input: VehicleBaseRateInput): string {
    return [
      input.vehicleType,
      this.canonicalBrand(input.brand) || 'unknown_brand',
      this.canonicalModel(input.model) || 'unknown_model',
      norm(input.fuelType) || 'unknown_fuel',
      norm(input.transmission) || 'unknown_trans',
      input.year ? String(input.year) : 'unknown_year',
    ].join('|');
  }

  private recordLookupStats(level: string, input: VehicleBaseRateInput): void {
    const normalizedLevel = norm(level) || 'unknown';
    this.totalBaseRateLookups += 1;
    this.fallbackUsageByLevel.set(normalizedLevel, (this.fallbackUsageByLevel.get(normalizedLevel) || 0) + 1);
    if (normalizedLevel !== 'model_exact') {
      const key = this.getVehicleLookupKey(input);
      this.fallbackUsageByVehicleKey.set(key, (this.fallbackUsageByVehicleKey.get(key) || 0) + 1);
    }
  }

  private validateGenericCoverage(): void {
    const activeRows = this.vehicleRows.filter((row) => this.isActiveEligible(row));
    const missing: RequiredGenericSpec[] = this.requiredGenericSpecs.filter((spec) => {
      const category = typeToCategory(spec.vehicleType);
      const genericModels = this.getGenericModelCandidates(spec.vehicleType);
      return !activeRows.some((row) => {
        const rowBrand = norm(row.brand);
        const rowModel = norm(row.model);
        const rowFuel = norm(row.fuelType);
        const isGenericBrand = rowBrand === 'generic' || rowBrand === '*';
        const isGenericModel = genericModels.includes(rowModel);
        if (norm(row.vehicleCategory) !== category) return false;
        if (rowFuel !== norm(spec.fuelType)) return false;
        if (!isGenericBrand && !isGenericModel) return false;
        return this.coverageBucketSatisfied(spec.ageBucket, row.vehicleAgeBucket);
      });
    });
    this.genericCoverageMissing = missing;
    this.dataValidationWarnings = [];
    if (missing.length > 0) {
      const sample = missing.slice(0, 8).map((m) => `${m.vehicleType}/${m.fuelType}/${m.ageBucket}`).join(', ');
      const warning = `Pricing generic coverage gaps found (${missing.length} missing specs). Sample: ${sample}`;
      this.dataValidationWarnings.push(warning);
      logger.warn(warning);
    }
  }

  private hasFuelRate(row: CityFuelRow, fuelType?: string): boolean {
    const fuel = norm(fuelType);
    if (!fuel) return true;
    if (fuel === 'petrol') return Number.isFinite(Number(row.petrol)) && Number(row.petrol) > 0;
    if (fuel === 'diesel') return Number.isFinite(Number(row.diesel)) && Number(row.diesel) > 0;
    if (fuel === 'cng') return Number.isFinite(Number(row.cng)) && Number(row.cng) > 0;
    if (fuel === 'electric' || fuel === 'electricity') {
      return Number.isFinite(Number(row.electricity)) && Number(row.electricity) > 0;
    }
    return true;
  }

  private getCityFuel(city?: string, state?: string, fuelType?: string): CityFuelRow & {
    requestedCity?: string;
    requestedState?: string;
    matchType: 'exact' | 'nearest_city' | 'default';
  } {
    const active = this.cityRows.filter((row) => norm(row.recordStatus || 'active') === 'active');
    const requestedCity = String(city || '').trim();
    const requestedState = String(state || '').trim();
    const requestedCityNorm = norm(requestedCity);
    const requestedStateNorm = norm(requestedState);

    const defaultRow = active.find((row) => norm(row.city) === 'default');

    if (requestedCityNorm) {
      const exact = active.find(
        (row) => norm(row.city) === requestedCityNorm && this.hasFuelRate(row, fuelType)
      );
      if (exact) {
        return { ...exact, requestedCity, requestedState, matchType: 'exact' };
      }
    }

    const nonDefault = active.filter((row) => norm(row.city) !== 'default');
    const nonDefaultWithFuel = nonDefault.filter((row) => this.hasFuelRate(row, fuelType));
    const scopedWithFuel = requestedStateNorm
      ? nonDefaultWithFuel.filter((row) => norm(row.state) === requestedStateNorm)
      : nonDefaultWithFuel;
    const candidatesWithFuel = scopedWithFuel.length > 0 ? scopedWithFuel : nonDefaultWithFuel;

    if (candidatesWithFuel.length > 0 && requestedCityNorm) {
      const nearest = [...candidatesWithFuel].sort((a, b) => {
        const d1 = textDistance(a.city, requestedCity);
        const d2 = textDistance(b.city, requestedCity);
        if (d1 !== d2) return d1 - d2;
        return String(a.city).localeCompare(String(b.city));
      })[0];
      return { ...nearest, requestedCity, requestedState, matchType: 'nearest_city' };
    }

    if (candidatesWithFuel.length > 0) {
      return { ...candidatesWithFuel[0], requestedCity, requestedState, matchType: 'nearest_city' };
    }

    const scoped = requestedStateNorm
      ? nonDefault.filter((row) => norm(row.state) === requestedStateNorm)
      : nonDefault;
    const candidates = scoped.length > 0 ? scoped : nonDefault;
    if (candidates.length > 0 && requestedCityNorm) {
      const nearest = [...candidates].sort((a, b) => {
        const d1 = textDistance(a.city, requestedCity);
        const d2 = textDistance(b.city, requestedCity);
        if (d1 !== d2) return d1 - d2;
        return String(a.city).localeCompare(String(b.city));
      })[0];
      return { ...nearest, requestedCity, requestedState, matchType: 'nearest_city' };
    }
    if (candidates.length > 0) {
      return { ...candidates[0], requestedCity, requestedState, matchType: 'nearest_city' };
    }

    if (defaultRow) {
      return { ...defaultRow, requestedCity, requestedState, matchType: 'default' };
    }

    return {
      city: 'DEFAULT',
      state: 'NA',
      cityTier: 'mixed',
      petrol: 105,
      diesel: 92,
      cng: 85,
      electricity: 12,
      trafficProfile: 'medium',
      recordStatus: 'active',
      requestedCity,
      requestedState,
      matchType: 'default',
    };
  }

  private resolveVehicleRow(input: VehicleBaseRateInput): PricingVehicleRow | null {
    const category = typeToCategory(input.vehicleType);
    const fuel = norm(input.fuelType);
    const brand = this.canonicalBrand(input.brand);
    const model = this.canonicalModel(input.model);
    const modelCompact = compact(model);
    const transmission = norm(input.transmission);
    const ageBucket = this.getAgeBucket(input.year);

    const scoped = this.vehicleRows.filter(
      (row) =>
        this.isActiveEligible(row) &&
        norm(row.vehicleCategory) === category &&
        norm(row.fuelType) === fuel
    );

    const rowBrand = (row: PricingVehicleRow) => this.canonicalBrand(row.brand);
    const rowModel = (row: PricingVehicleRow) => this.canonicalModel(row.model);
    const isWildcardModel = (row: PricingVehicleRow) => {
      const rm = norm(row.model);
      return ['*', 'any', 'generic', 'generic_car', 'generic_bike', 'generic_scooty', 'generic_2w'].includes(rm);
    };
    const matchesTransmission = (row: PricingVehicleRow) => {
      const rowTrans = norm(row.transmission);
      return !transmission || !rowTrans || rowTrans === '*' || rowTrans === transmission;
    };
    const modelMatches = (row: PricingVehicleRow) => {
      const rm = rowModel(row);
      const rmCompact = compact(rm);
      return (
        rm === model ||
        rmCompact === modelCompact
      );
    };

    const exact = scoped
      .filter(
        (row) =>
          brand &&
          model &&
          rowBrand(row) === brand &&
          !isWildcardModel(row) &&
          modelMatches(row) &&
          matchesTransmission(row)
      )
      .sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0));

    const ageExact = exact.find((row) => norm(row.vehicleAgeBucket) === norm(ageBucket));
    if (ageExact) return ageExact;
    if (exact.length > 0) return exact[0];

    return null;
  }

  private getContextMultiplier(row: PricingVehicleRow, city: CityFuelRow, year?: number): { value: number; label: string } {
    const cityTier = norm(city.cityTier || row.cityTier || 'mixed');
    const traffic = norm(city.trafficProfile || row.trafficProfile || 'medium');
    const ageBucket = this.getAgeBucket(year);
    const confidence = row.confidenceScore || 75;

    const ageKey =
      ageBucket === '0-2'
        ? '0_2_years'
        : ageBucket === '2-4'
          ? '2_4_years'
          : ageBucket === '4-6'
            ? '4_6_years'
            : '6_plus_years';
    const confidenceKey = confidence >= 85 ? 'score_85_plus' : confidence >= 70 ? 'score_70_84' : 'score_below_70';

    // CSV estimated_cost_per_km rows are already city/traffic specific in current data pack.
    // Applying city+traffic multipliers again causes double-counting and fare inflation.
    const ageM = this.getMultiplier('vehicle_age', ageKey, 1);
    const confM = this.getMultiplier('confidence_adjustment', confidenceKey, 1);

    const rawValue = ageM * confM;
    const value = Math.max(0.95, Math.min(1.1, rawValue));
    const label = `Age ${ageBucket} x Confidence ${confidence} (city=${cityTier}, traffic=${traffic} included in base row)`;
    return { value, label };
  }

  ensureLoaded(): void {
    if (this.loaded) return;
    try {
      const loadedJson = this.loadFromJson();
      if (!loadedJson) {
        // Backward compatible CSV fallback
        this.vehicleRows = this.loadVehicleRows();
        this.cityRows = this.loadCityRows();
        this.multipliers = this.loadMultiplierRows();
      }
      this.validateGenericCoverage();
      this.loaded = true;
      this.loadedAt = new Date().toISOString();
      logger.info(
        `Pricing data loaded: vehicles=${this.vehicleRows.length}, cities=${this.cityRows.length}, multipliers=${this.multipliers.size}`
      );
    } catch (error) {
      logger.error('Failed to load pricing data:', error);
      this.vehicleRows = [];
      this.cityRows = [];
      this.multipliers = new Map();
      this.brandAliases = new Map();
      this.modelAliases = new Map();
      this.genericCoverageMissing = [];
      this.dataValidationWarnings = [];
      this.loaded = true;
    }
  }

  reload(): void {
    this.loaded = false;
    this.vehicleRows = [];
    this.cityRows = [];
    this.multipliers = new Map();
    this.brandAliases = new Map();
    this.modelAliases = new Map();
    this.genericCoverageMissing = [];
    this.dataValidationWarnings = [];
    this.ensureLoaded();
    this.dbRowsLoadedAt = 0;
    void this.ensureDbRowsLoaded(true);
  }

  async refreshFromDatabase(): Promise<void> {
    this.ensureLoaded();
    await this.ensureDbRowsLoaded(true);
  }

  getPricingHealthReport(): PricingDataHealthReport {
    this.ensureLoaded();
    const byFallbackLevel: Record<string, number> = {};
    this.fallbackUsageByLevel.forEach((value, key) => {
      byFallbackLevel[key] = value;
    });
    const topFallbackVehicles = [...this.fallbackUsageByVehicleKey.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => ({ key, count }));
    return {
      loaded: this.loaded,
      loadedAt: this.loadedAt,
      activeVehicleRows: this.vehicleRows.filter((row) => this.isActiveEligible(row)).length,
      activeCityRows: this.cityRows.filter((row) => norm(row.recordStatus || 'active') === 'active').length,
      multipliersCount: this.multipliers.size,
      genericCoverage: {
        required: this.requiredGenericSpecs.length,
        covered: this.requiredGenericSpecs.length - this.genericCoverageMissing.length,
        missing: this.genericCoverageMissing,
      },
      lookupStats: {
        totalRequests: this.totalBaseRateLookups,
        byFallbackLevel,
        topFallbackVehicles,
      },
      warnings: this.dataValidationWarnings,
    };
  }

  getTimeMultiplier(hour: number): { value: number; label: string } {
    this.ensureLoaded();
    if (hour >= 6 && hour <= 10) {
      return { value: this.getMultiplier('time_of_day', 'morning_peak_06_10', 1.1), label: 'Morning Peak' };
    }
    if (hour >= 17 && hour <= 20) {
      return { value: this.getMultiplier('time_of_day', 'evening_peak_17_20', 1.15), label: 'Evening Peak' };
    }
    if (hour >= 22 || hour <= 5) {
      return { value: this.getMultiplier('time_of_day', 'late_night_22_05', 1.2), label: 'Late Night' };
    }
    return { value: this.getMultiplier('time_of_day', 'normal_hours', 1), label: 'Normal Hours' };
  }

  getSupplyMultiplier(offersCount: number): { value: number; label: string } {
    this.ensureLoaded();
    if (offersCount >= 20) return { value: this.getMultiplier('supply_demand', 'high_supply_20_plus', 0.85), label: 'High Supply' };
    if (offersCount >= 10) return { value: this.getMultiplier('supply_demand', 'supply_10_19', 0.9), label: 'Good Supply' };
    if (offersCount >= 5) return { value: this.getMultiplier('supply_demand', 'supply_5_9', 0.95), label: 'Moderate Supply' };
    if (offersCount >= 2) return { value: this.getMultiplier('supply_demand', 'supply_2_4', 1), label: 'Normal Supply' };
    if (offersCount === 1) return { value: this.getMultiplier('supply_demand', 'supply_1', 1.15), label: 'Low Supply' };
    return { value: this.getMultiplier('supply_demand', 'supply_0', 1.25), label: 'No Supply' };
  }

  getTotalMultiplierGuardrails(): { min: number; max: number } {
    this.ensureLoaded();
    return {
      min: this.getMultiplier('guardrail', 'total_multiplier_min', 0.75),
      max: this.getMultiplier('guardrail', 'total_multiplier_max', 1.85),
    };
  }

  getPerSeatPerKmBand(vehicleType: VehicleType): PerSeatPerKmBand {
    this.ensureLoaded();
    const prefix = vehicleType === 'car' ? 'car' : vehicleType === 'bike' ? 'bike' : 'scooty';
    return {
      min: this.getMultiplier('guardrail', `per_seat_${prefix}_min_per_km`, vehicleType === 'car' ? 2.8 : 1.2),
      max: this.getMultiplier('guardrail', `per_seat_${prefix}_max_per_km`, vehicleType === 'car' ? 8.5 : vehicleType === 'bike' ? 4 : 3.6),
    };
  }

  async calculateVehicleBaseRate(input: VehicleBaseRateInput, _legacyBaseRate: number): Promise<VehicleBaseRateResult> {
    this.ensureLoaded();
    await this.ensureDbRowsLoaded();

    if (!norm(input.brand) || !norm(input.model) || !norm(input.fuelType)) {
      this.recordLookupStats('missing_vehicle_inputs', input);
      throw new ValidationError(
        'Missing vehicle pricing inputs. Brand, model, and fuel type are required for strict pricing.'
      );
    }

    const row = this.resolveVehicleRow(input);
    const city = this.getCityFuel(input.city, input.state, input.fuelType);
    if (!row) {
      this.recordLookupStats('missing_exact_vehicle_row', input);
      throw new ValidationError(
        'Vehicle pricing data not found for exact vehicle. Please add this vehicle in Vehicle Pricing Control before creating booking.'
      );
    }

    const mileage = row.realWorldMileageAvg;
    const fuel = norm(input.fuelType || row.fuelType);
    const unit = norm(row.mileageUnit);
    let energyCostPerKm: number | undefined;

    if (fuel === 'petrol' && mileage && city.petrol) energyCostPerKm = city.petrol / mileage;
    else if (fuel === 'diesel' && mileage && city.diesel) energyCostPerKm = city.diesel / mileage;
    else if (fuel === 'cng' && mileage && city.cng) energyCostPerKm = city.cng / mileage;
    else if (fuel === 'electric') {
      if (unit === 'km_per_kwh' && mileage && city.electricity) {
        energyCostPerKm = city.electricity / mileage;
      } else if (row.estimatedCostPerKmInr) {
        energyCostPerKm = row.estimatedCostPerKmInr;
      }
    }
    if (!energyCostPerKm && row.estimatedCostPerKmInr) {
      energyCostPerKm = row.estimatedCostPerKmInr;
    }

    if (!energyCostPerKm || !Number.isFinite(energyCostPerKm) || energyCostPerKm <= 0) {
      this.recordLookupStats('energy_unresolved_exact_vehicle', input);
      throw new ValidationError(
        'Exact vehicle row found, but energy cost cannot be computed. Update mileage/fuel pricing for this vehicle.'
      );
    }

    const minBase = this.getMultiplier('guardrail', 'base_rate_min_per_km', 2);
    const maxBase = this.getMultiplier('guardrail', 'base_rate_max_per_km', 18);
    const calculatedBase = energyCostPerKm * 1.45;
    const baseRate = Math.max(minBase, Math.min(maxBase, calculatedBase));
    const context = this.getContextMultiplier(row, city, input.year);
    const resolvedFallbackLevel = 'model_exact';
    this.recordLookupStats(resolvedFallbackLevel, input);

    return {
      usedCsv: true,
      baseRatePerKm: Number(baseRate.toFixed(2)),
      energyCostPerKm: Number(energyCostPerKm.toFixed(2)),
      fallbackLevel: resolvedFallbackLevel,
      confidenceScore: row.confidenceScore || 75,
      cityTier: city.cityTier || row.cityTier || 'mixed',
      trafficProfile: city.trafficProfile || row.trafficProfile || 'medium',
      contextMultiplier: Number(context.value.toFixed(4)),
      contextLabel: context.label,
      matchedVehicle: {
        category: row.vehicleCategory,
        brand: row.brand,
        model: row.model,
        fuelType: row.fuelType,
        transmission: row.transmission,
        launchYear: row.launchYear,
        ageBucket: row.vehicleAgeBucket,
        mileageUnit: row.mileageUnit,
        realWorldMileageAvg: row.realWorldMileageAvg,
      },
      cityFuelSnapshot: {
        city: city.city,
        state: city.state,
        requestedCity: city.requestedCity,
        requestedState: city.requestedState,
        matchType: city.matchType,
        petrol: city.petrol,
        diesel: city.diesel,
        cng: city.cng,
        electricity: city.electricity,
      },
    };
  }
}

export const pricingDataService = new PricingDataService();
export default pricingDataService;
