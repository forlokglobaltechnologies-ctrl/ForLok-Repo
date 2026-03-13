# Pricing Data Dictionary (Pooling Engine Prep)

This data pack is designed to make the next pricing architecture deterministic, auditable, and fallback-safe.

## Files

- `vehicle_mileage_data.csv`
  - Original source data (kept unchanged).
- `vehicle_mileage_pricing_master.csv`
  - Normalized vehicle-level pricing input table (model, fuel, age bucket, real-world mileage, estimated cost/km).
- `fuel_price_by_city.csv`
  - City/tier-specific fuel and electricity rates with default fallback row.
- `pricing_multipliers.csv`
  - Runtime multiplier table for time, supply, city tier, traffic profile, age, confidence, and guardrails.

## Fallback Order (recommended)

1. `model_exact`: `brand + model + fuel + age_bucket + transmission`
2. `brand_fallback`: `brand + fuel + vehicle_category`
3. `category_fallback`: generic rows in `vehicle_mileage_pricing_master.csv`
4. Static emergency fallback: current hardcoded pooling base rates

## Critical Columns

### `vehicle_mileage_pricing_master.csv`

- `Real_World_Mileage_Avg`: use this value first for fuel-cost normalization.
- `Energy_Unit_Price_INR`: should come from city table at runtime; current values are seed defaults.
- `Estimated_Cost_Per_Km_INR`: precomputed baseline for easier migration and validation.
- `Confidence_Score`: use with `confidence_adjustment` multiplier to control uncertainty.
- `Pricing_Eligible`: skip rows with `N`.

### `fuel_price_by_city.csv`

- `DEFAULT` row is mandatory and must always exist.
- Effective city mapping should normalize names before lookup.

### `pricing_multipliers.csv`

- `guardrail` rows should be enforced after composing all multipliers.
- `Priority` can be used if you later support override layers (admin, campaign, incident-mode).

## Notes on Seed Data

- Seed values are intentionally conservative and meant for architectural rollout, not final production calibration.
- EV rows include estimated conversions and should be recalibrated with measured kWh data when available.
- Some models in source were projected/estimated; confidence scores reflect that uncertainty.
