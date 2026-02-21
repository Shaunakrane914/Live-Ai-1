"""
preprocess_data.py — AegisGrid DDPG Training Data Sanitizer
===========================================================
Merges two real-world datasets into a single, mathematically pure
30-minute time-series ready for PyTorch DDPG training.

DATA SOURCES (auto-detected from ../dataset/):
  Solar:  dataset/archive (4)/Plant_1_Generation_Data.csv
          Columns: DATE_TIME, SOURCE_KEY, DC_POWER, AC_POWER
          Resolution: 15-minute intervals, multiple inverter rows per timestamp
          → Aggregated to total AC_POWER across all inverters

  Load:   dataset/individual+household+electric+power+consumption/
          household_power_consumption.txt
          Columns: Date;Time;Global_active_power (semicolon-delimited)
          Resolution: 1-minute intervals
          Unit: kilowatts

  Weather: dataset/archive (4)/Plant_1_Weather_Sensor_Data.csv
          Columns: DATE_TIME, AMBIENT_TEMPERATURE, IRRADIATION
          Resolution: 15-minute intervals

OUTPUT:
  ai-engine/aegis_training_data.csv
  Columns: timestamp, solar_kw, load_kw, irradiation, ambient_temp
  Resolution: Strict 30-minute intervals
  Guarantee: Zero NaNs, solar_kw ≥ 0.0

Usage:
  cd ai-engine && python preprocess_data.py
"""

import os
import sys
import pandas as pd
import numpy as np

# ── Path resolution ──────────────────────────────────────────────────────────
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.join(SCRIPT_DIR, "..")

SOLAR_PATH   = os.path.join(PROJECT_ROOT, "dataset", "archive (4)", "Plant_1_Generation_Data.csv")
LOAD_PATH    = os.path.join(PROJECT_ROOT, "dataset", "individual+household+electric+power+consumption", "household_power_consumption.txt")
WEATHER_PATH = os.path.join(PROJECT_ROOT, "dataset", "archive (4)", "Plant_1_Weather_Sensor_Data.csv")
OUTPUT_PATH  = os.path.join(SCRIPT_DIR, "aegis_training_data.csv")


def separator(title):
    print(f"\n{'─'*55}")
    print(f"  {title}")
    print('─'*55)


# ════════════════════════════════════════════════════════════
# STEP 1 — SOLAR GENERATION (Plant_1_Generation_Data.csv)
# ════════════════════════════════════════════════════════════
separator("STEP 1 › Loading Solar Generation Data")

solar_raw = pd.read_csv(SOLAR_PATH)
print(f"  Raw rows:    {len(solar_raw):,}")
print(f"  Raw columns: {list(solar_raw.columns)}")

# Parse the DATE_TIME column (format: '15-05-2020 00:00')
solar_raw['timestamp'] = pd.to_datetime(solar_raw['DATE_TIME'], dayfirst=True)

# Aggregate: sum AC_POWER across all inverters for each timestamp
# This gives total plant output in kW
solar_agg = (
    solar_raw
    .groupby('timestamp')['AC_POWER']
    .sum()
    .rename('solar_kw')
    .reset_index()
    .set_index('timestamp')
    .sort_index()
)

print(f"  Unique timestamps (15-min): {len(solar_agg):,}")
print(f"  Date range: {solar_agg.index.min()} → {solar_agg.index.max()}")
print(f"  Solar min/max before clip: {solar_agg['solar_kw'].min():.3f} / {solar_agg['solar_kw'].max():.3f} kW")

# Resample to 30-min intervals
solar_30 = solar_agg.resample('30T').mean()
print(f"  After 30-min resample: {len(solar_30):,} rows")

# ─ Physics constraint: Clip nighttime negatives ──────────────
neg_before = (solar_30['solar_kw'] < 0).sum()
solar_30['solar_kw'] = solar_30['solar_kw'].clip(lower=0.0)
print(f"  Nighttime negatives clipped: {neg_before} values set to 0.0")


# ════════════════════════════════════════════════════════════
# STEP 2 — HOUSEHOLD LOAD (household_power_consumption.txt)
# ════════════════════════════════════════════════════════════
separator("STEP 2 › Loading Household Load Data")

load_raw = pd.read_csv(
    LOAD_PATH,
    sep=';',
    na_values=['?'],   # Missing readings logged as '?'
    usecols=['Date', 'Time', 'Global_active_power'],
    dtype={'Global_active_power': 'float32'},
    low_memory=False
)

print(f"  Raw rows:    {len(load_raw):,}")
print(f"  NaN count before fill: {load_raw['Global_active_power'].isna().sum():,}")

# Combine Date + Time into a single datetime index
load_raw['timestamp'] = pd.to_datetime(
    load_raw['Date'] + ' ' + load_raw['Time'],
    format='%d/%m/%Y %H:%M:%S'
)
load_raw = load_raw.drop(columns=['Date', 'Time']).set_index('timestamp').sort_index()

# Resample from 1-minute to 30-minute intervals via mean
load_30 = load_raw['Global_active_power'].resample('30T').mean().rename('load_kw')
print(f"  After 30-min resample: {len(load_30):,} rows")
print(f"  Date range: {load_30.index.min()} → {load_30.index.max()}")


# ════════════════════════════════════════════════════════════
# STEP 3 — WEATHER DATA (Plant_1_Weather_Sensor_Data.csv)
# ════════════════════════════════════════════════════════════
separator("STEP 3 › Loading Weather / Irradiation Data")

weather_raw = pd.read_csv(WEATHER_PATH)
print(f"  Raw rows:    {len(weather_raw):,}")
print(f"  Raw columns: {list(weather_raw.columns)}")

weather_raw['timestamp'] = pd.to_datetime(weather_raw['DATE_TIME'])
weather_agg = (
    weather_raw
    .groupby('timestamp')[['AMBIENT_TEMPERATURE', 'IRRADIATION']]
    .mean()
    .rename(columns={'AMBIENT_TEMPERATURE': 'ambient_temp', 'IRRADIATION': 'irradiation'})
    .sort_index()
)

weather_30 = weather_agg.resample('30T').mean()
print(f"  After 30-min resample: {len(weather_30):,} rows")


# ════════════════════════════════════════════════════════════
# STEP 4 — MERGE & TIME-ALIGN
# ════════════════════════════════════════════════════════════
separator("STEP 4 › Merging Datasets")

# Solar + Weather share the same date range (May–Jun 2020)
# Load dataset starts 2006 — we'll merge on index positions (cyclic reuse)
# Strategy: use solar/weather as the master timeline, then tile load data

# First merge solar + weather (same source, same timeline)
df = pd.concat([solar_30, weather_30], axis=1).sort_index()
df = df.loc[df.index.notnull()]

print(f"  Solar+Weather combined rows: {len(df):,}")

# The load dataset has ~4 years of 1-min data → much longer than solar.
# We extract a matching-length slice from load data to align.
n_rows_needed = len(df)
load_values = load_30.values  # numpy array for fast cycling

if len(load_values) >= n_rows_needed:
    # Load has enough data: take a direct slice
    load_aligned = load_values[:n_rows_needed]
    print(f"  Load slice taken: first {n_rows_needed:,} rows of {len(load_values):,} available")
else:
    # Cycle load data (tiling) to fill the solar timeline
    repeats = int(np.ceil(n_rows_needed / len(load_values)))
    load_aligned = np.tile(load_values, repeats)[:n_rows_needed]
    print(f"  Load tiled {repeats}× to cover {n_rows_needed:,} rows")

df['load_kw'] = load_aligned

print(f"  Final merged rows: {len(df):,}")


# ════════════════════════════════════════════════════════════
# STEP 5 — MISSING DATA HANDLING
# ════════════════════════════════════════════════════════════
separator("STEP 5 › Handling NaN Values")

nan_before = df.isna().sum()
print("  NaN counts before fill:")
print(nan_before.to_string(header=False))

# Forward fill for short gaps (sensor dropout)
df = df.ffill()
# Backfill any remaining NaNs at the very start
df = df.bfill()
# Final safety: fill any column that is still empty with 0
df = df.fillna(0.0)

nan_after = df.isna().sum().sum()
print(f"\n  NaN count after fill: {nan_after}  {'✅ CLEAN' if nan_after == 0 else '❌ STILL DIRTY'}")


# ════════════════════════════════════════════════════════════
# STEP 6 — PHYSICS CONSTRAINT RE-CHECK
# ════════════════════════════════════════════════════════════
separator("STEP 6 › Physics Constraints")

# Solar: strictly non-negative (inverter drain bug)
neg_solar = (df['solar_kw'] < 0).sum()
df['solar_kw'] = df['solar_kw'].clip(lower=0.0)
print(f"  solar_kw negatives clipped: {neg_solar}")

# Load: strictly positive (cannot have negative consumption)
neg_load = (df['load_kw'] < 0).sum()
df['load_kw'] = df['load_kw'].clip(lower=0.0)
print(f"  load_kw  negatives clipped: {neg_load}")

# Irradiation: non-negative
df['irradiation'] = df['irradiation'].clip(lower=0.0)


# ════════════════════════════════════════════════════════════
# STEP 7 — NORMALIZE FOR DDPG (MinMax to [0, 1])
# Stored as separate columns so PhysicsOracle can invert them
# ════════════════════════════════════════════════════════════
separator("STEP 7 › Adding Normalized Columns")

solar_max  = df['solar_kw'].max()
load_max   = df['load_kw'].max()
irrad_max  = df['irradiation'].max() if df['irradiation'].max() > 0 else 1.0
temp_max   = df['ambient_temp'].max()
temp_min   = df['ambient_temp'].min()

df['solar_norm']    = (df['solar_kw'] / solar_max).clip(0, 1)
df['load_norm']     = (df['load_kw']  / load_max).clip(0, 1)
df['irrad_norm']    = (df['irradiation'] / irrad_max).clip(0, 1)
df['temp_norm']     = ((df['ambient_temp'] - temp_min) / max(temp_max - temp_min, 1)).clip(0, 1)

print(f"  solar_kw  → max= {solar_max:.2f} kW")
print(f"  load_kw   → max= {load_max:.2f} kW")
print(f"  irradiat  → max= {irrad_max:.4f}")
print(f"  ambient_t → range [{temp_min:.1f}, {temp_max:.1f}] °C")

# Save normalization constants as a small JSON for inference-time use
import json
norm_constants = {
    "solar_max_kw":   round(float(solar_max),  4),
    "load_max_kw":    round(float(load_max),   4),
    "irrad_max":      round(float(irrad_max),  6),
    "temp_min_c":     round(float(temp_min),   4),
    "temp_max_c":     round(float(temp_max),   4),
}
norm_path = os.path.join(SCRIPT_DIR, "norm_constants.json")
with open(norm_path, "w") as f:
    json.dump(norm_constants, f, indent=2)
print(f"\n  Normalization constants saved → norm_constants.json")


# ════════════════════════════════════════════════════════════
# STEP 8 — FINAL EXPORT
# ════════════════════════════════════════════════════════════
separator("STEP 8 › Exporting aegis_training_data.csv")

# Column order (matches what ddpg_agent.py will read)
col_order = [
    'solar_kw', 'load_kw', 'irradiation', 'ambient_temp',
    'solar_norm', 'load_norm', 'irrad_norm', 'temp_norm'
]
df = df[col_order]
df.index.name = 'timestamp'

df.to_csv(OUTPUT_PATH)
print(f"  Output path:  {OUTPUT_PATH}")
print(f"  Rows written: {len(df):,}")
print(f"  Columns:      {list(df.columns)}")
print(f"  Time range:   {df.index.min()} → {df.index.max()}")


# ════════════════════════════════════════════════════════════
# STEP 9 — FINAL HEALTH CHECK
# ════════════════════════════════════════════════════════════
separator("STEP 9 › Final Data Health Report")

remaining_nan = df.isna().sum().sum()
neg_solar_final = (df['solar_kw'] < 0).sum()
neg_load_final  = (df['load_kw']  < 0).sum()
interval_check  = df.index.to_series().diff().dropna().value_counts()

print(f"\n  {'Metric':<35} {'Value':<20} {'Status'}")
print(f"  {'─'*65}")
print(f"  {'Total rows':<35} {len(df):<20} ✅")
print(f"  {'Remaining NaNs':<35} {remaining_nan:<20} {'✅ ZERO' if remaining_nan == 0 else '❌ FIX NEEDED'}")
print(f"  {'Negative solar values':<35} {neg_solar_final:<20} {'✅ ZERO' if neg_solar_final == 0 else '❌ FIX NEEDED'}")
print(f"  {'Negative load values':<35} {neg_load_final:<20} {'✅ ZERO' if neg_load_final == 0 else '❌ FIX NEEDED'}")
dominant_interval = interval_check.idxmax()
expected_interval = pd.Timedelta('30min')
interval_ok = dominant_interval == expected_interval
print(f"  {'Dominant time interval':<35} {str(dominant_interval):<20} {'✅ 30-min' if interval_ok else '⚠️  CHECK'}")
print(f"  {'solar_kw range':<35} [{df['solar_kw'].min():.2f}, {df['solar_kw'].max():.2f}] kW")
print(f"  {'load_kw range':<35} [{df['load_kw'].min():.2f}, {df['load_kw'].max():.2f}] kW")

print("\n")
if remaining_nan == 0 and neg_solar_final == 0 and neg_load_final == 0 and interval_ok:
    print("  ✅ DATASET IS MATHEMATICALLY PURE. Ready for DDPG Phase 3 training.")
else:
    print("  ❌ ISSUES DETECTED. Review the health report above before training.")
print("")
