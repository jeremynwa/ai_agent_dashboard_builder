/**
 * local-stats.mjs — Compute data statistics locally in Node.js (no API cost).
 *
 * Reimplements the logic of the 4 Python data-analyzer scripts:
 *   analyze_columns.py → analyzeColumns()
 *   detect_periods.py  → detectPeriods()
 *   compute_stats.py   → computeStats()
 *   suggest_charts.py  → suggestCharts()
 *
 * Runs on the FULL dataset for 100% accurate stats.
 */

// ============================================================================
// Currency / percentage column name patterns
// ============================================================================
const CURRENCY_RE = /eur|usd|\$|€|£|revenue|chiffre|ca_|montant|prix|cost|cout|budget|salaire|depense|recette/i;
const PERCENT_RE = /taux|ratio|percent|pourcentage|marge|part_|share|conversion|croissance|evolution/i;

// ============================================================================
// Month names (FR + EN) for period detection
// ============================================================================
const MONTH_NAMES_FR = {
  janvier: 1, fevrier: 2, 'février': 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, 'août': 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12, 'décembre': 12,
  jan: 1, fev: 2, 'fév': 2, mar: 3, avr: 4, jun: 6, jul: 7, aou: 8, sep: 9, oct: 10, nov: 11, dec: 12, 'déc': 12,
};
const MONTH_NAMES_EN = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};
const ALL_MONTHS = { ...MONTH_NAMES_FR, ...MONTH_NAMES_EN };

const QUARTER_RE = /^[QqTt]([1-4])(?:\s*\d{4})?$/;

// ============================================================================
// Helpers
// ============================================================================
function cleanNumeric(val) {
  if (val == null) return NaN;
  if (typeof val === 'number') return val;
  const s = String(val).replace(/[€$£%\s]/g, '').replace(',', '.');
  const n = Number(s);
  return n;
}

function isNumericValue(val) {
  return !isNaN(cleanNumeric(val));
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function median(sorted) {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function stddev(values, mean) {
  if (values.length < 2) return 0;
  const sqDiffs = values.reduce((s, v) => s + (v - mean) ** 2, 0);
  return Math.sqrt(sqDiffs / (values.length - 1));
}

// ============================================================================
// analyzeColumns — detect column types
// ============================================================================
export function analyzeColumns(data) {
  if (!data || data.length === 0) return [];
  const headers = Object.keys(data[0]);
  return headers.map(col => {
    const values = data.map(r => r[col]).filter(v => v != null && v !== '');
    if (values.length === 0) return { name: col, type: 'text', nullCount: data.length, totalCount: data.length, uniqueCount: 0 };

    // Check if numeric
    const numericCount = values.filter(v => isNumericValue(v)).length;
    const numericRatio = numericCount / values.length;

    if (numericRatio > 0.8) {
      if (CURRENCY_RE.test(col)) return colInfo(col, 'currency', data, values);
      if (PERCENT_RE.test(col)) return colInfo(col, 'percentage', data, values);
      // Check for currency/percent symbols in values
      const sample = values.slice(0, 20).join(' ');
      if (/[€$£]/.test(sample)) return colInfo(col, 'currency', data, values);
      if (/%/.test(sample)) return colInfo(col, 'percentage', data, values);
      return colInfo(col, 'numeric', data, values);
    }

    // Check month names
    const lowerVals = values.map(v => String(v).toLowerCase().trim());
    const monthMatches = lowerVals.filter(v => v in ALL_MONTHS);
    if (monthMatches.length >= 2 && monthMatches.length / lowerVals.length > 0.8) {
      return colInfo(col, 'date', data, values);
    }

    // Check quarter patterns
    const quarterMatches = lowerVals.filter(v => QUARTER_RE.test(v));
    if (quarterMatches.length >= 2 && quarterMatches.length / lowerVals.length > 0.8) {
      return colInfo(col, 'date', data, values);
    }

    // Try date parsing (simple heuristic: check first 10 non-null values)
    const dateSample = values.slice(0, 10);
    const dateCount = dateSample.filter(v => !isNaN(Date.parse(String(v)))).length;
    if (dateCount / dateSample.length > 0.8) {
      return colInfo(col, 'date', data, values);
    }

    // Categorical vs text
    const unique = new Set(values);
    if (unique.size <= 20 || (values.length > 5 && unique.size / values.length < 0.3)) {
      return colInfo(col, 'categorical', data, values);
    }

    return colInfo(col, 'text', data, values);
  });
}

function colInfo(name, type, data, values) {
  const unique = new Set(values);
  return {
    name,
    type,
    nullCount: data.length - values.length,
    totalCount: data.length,
    uniqueCount: unique.size,
    uniqueSample: [...unique].slice(0, 10).map(String),
    sample: values.slice(0, 5).map(String),
  };
}

// ============================================================================
// detectPeriods — find temporal columns and determine comparability
// ============================================================================
export function detectPeriods(data, columnsInfo) {
  const dateColumns = columnsInfo.filter(c => c.type === 'date').map(c => c.name);
  const categoricalColumns = columnsInfo.filter(c => c.type === 'categorical').map(c => c.name);
  const results = [];

  for (const colName of [...dateColumns, ...categoricalColumns]) {
    const values = data.map(r => r[colName]).filter(v => v != null && v !== '');
    if (values.length < 2) continue;

    // Try month names
    const lowerVals = values.map(v => String(v).toLowerCase().trim());
    const monthMatches = lowerVals.filter(v => v in ALL_MONTHS);
    if (monthMatches.length >= 2 && monthMatches.length / lowerVals.length > 0.8) {
      const ordered = [...new Set(lowerVals)].sort((a, b) => (ALL_MONTHS[a] || 99) - (ALL_MONTHS[b] || 99));
      results.push({ column: colName, periodType: 'monthly', periods: ordered, periodCount: ordered.length });
      continue;
    }

    // Try quarters
    const quarterVals = lowerVals.filter(v => QUARTER_RE.test(v));
    if (quarterVals.length >= 2 && quarterVals.length / lowerVals.length > 0.8) {
      const ordered = [...new Set(lowerVals)].sort();
      results.push({ column: colName, periodType: 'quarterly', periods: ordered, periodCount: ordered.length });
      continue;
    }

    // Try datetime parsing (for date-typed columns)
    if (dateColumns.includes(colName)) {
      const dates = values.map(v => new Date(String(v))).filter(d => !isNaN(d.getTime()));
      if (dates.length >= 2) {
        dates.sort((a, b) => a - b);
        const diffs = [];
        for (let i = 1; i < dates.length; i++) diffs.push((dates[i] - dates[i - 1]) / 86400000);
        const medianDays = median(diffs.sort((a, b) => a - b));
        const periodType = medianDays <= 1.5 ? 'daily' : medianDays <= 8 ? 'weekly' : medianDays <= 35 ? 'monthly' : medianDays <= 100 ? 'quarterly' : 'yearly';
        const uniqueDates = [...new Set(dates.map(d => d.toISOString().split('T')[0]))];
        results.push({ column: colName, periodType, periods: uniqueDates, periodCount: uniqueDates.length });
      }
    }
  }

  if (results.length === 0) {
    return { hasPeriods: false, periodColumn: null, periodType: null, canCompare: false, periods: [], allDetected: [] };
  }

  results.sort((a, b) => b.periodCount - a.periodCount);
  const best = results[0];
  return {
    hasPeriods: true,
    periodColumn: best.column,
    periodType: best.periodType,
    canCompare: best.periodCount >= 2,
    periods: best.periods,
    allDetected: results.map(r => ({ column: r.column, periodType: r.periodType, periodCount: r.periodCount })),
  };
}

// ============================================================================
// computeStats — compute statistics per column
// ============================================================================
export function computeStats(data, columnsInfo, periodsInfo) {
  const stats = {};

  for (const col of columnsInfo) {
    const { name, type } = col;
    const values = data.map(r => r[name]).filter(v => v != null && v !== '');

    if (type === 'numeric' || type === 'currency' || type === 'percentage') {
      const nums = values.map(cleanNumeric).filter(n => !isNaN(n));
      if (nums.length === 0) { stats[name] = { type, error: 'no numeric values' }; continue; }

      const sorted = [...nums].sort((a, b) => a - b);
      const sum = nums.reduce((s, v) => s + v, 0);
      const mean = sum / nums.length;

      const colStats = {
        type,
        min: round2(sorted[0]),
        max: round2(sorted[sorted.length - 1]),
        mean: round2(mean),
        median: round2(median(sorted)),
        sum: round2(sum),
        stddev: round2(stddev(nums, mean)),
        count: nums.length,
        quartiles: {
          Q1: round2(quantile(sorted, 0.25)),
          Q2: round2(quantile(sorted, 0.50)),
          Q3: round2(quantile(sorted, 0.75)),
        },
      };

      // Period values and variation
      if (periodsInfo.hasPeriods && periodsInfo.periodColumn) {
        const periodCol = periodsInfo.periodColumn;
        const periodValues = [];
        for (const period of periodsInfo.periods) {
          const matching = data.filter(r => String(r[periodCol]).toLowerCase().trim() === String(period).toLowerCase().trim());
          const periodNums = matching.map(r => cleanNumeric(r[name])).filter(n => !isNaN(n));
          const val = periodNums.reduce((s, v) => s + v, 0);
          periodValues.push({ period: String(period), value: round2(val) });
        }
        colStats.periodValues = periodValues;

        // Variation (last vs first)
        if (periodValues.length >= 2 && periodsInfo.canCompare) {
          const first = periodValues[0].value;
          const last = periodValues[periodValues.length - 1].value;
          if (first !== 0) {
            colStats.variation = {
              firstPeriod: periodValues[0].period,
              lastPeriod: periodValues[periodValues.length - 1].period,
              firstValue: first,
              lastValue: last,
              changePercent: round2(((last - first) / Math.abs(first)) * 100),
            };
          }
        }
      }

      stats[name] = colStats;
    } else if (type === 'categorical') {
      const counts = {};
      values.forEach(v => { const k = String(v); counts[k] = (counts[k] || 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      stats[name] = {
        type: 'categorical',
        uniqueCount: sorted.length,
        topValue: sorted[0]?.[0] || null,
        topCount: sorted[0]?.[1] || 0,
        valueCounts: sorted.slice(0, 15).map(([value, count]) => ({ value, count })),
      };
    } else if (type === 'date') {
      const unique = [...new Set(values.map(String))];
      stats[name] = { type: 'date', uniqueCount: unique.length, sample: unique.slice(0, 10) };
    }
  }

  return stats;
}

// ============================================================================
// suggestCharts — recommend chart types based on data analysis
// ============================================================================
export function suggestCharts(columnsInfo, periodsInfo, statsInfo) {
  const recommendations = [];
  const numericCols = columnsInfo.filter(c => ['numeric', 'currency', 'percentage'].includes(c.type));
  const categoricalCols = columnsInfo.filter(c => c.type === 'categorical');
  const hasPeriods = periodsInfo.hasPeriods;
  const periodCol = periodsInfo.periodColumn;
  const periodType = periodsInfo.periodType || '';

  // 1. Temporal trends
  if (hasPeriods && periodCol && numericCols.length > 0) {
    if (numericCols.length === 1) {
      recommendations.push({
        chartType: 'AreaChart', xKey: periodCol, yKeys: [numericCols[0].name],
        reason: `Tendance temporelle de ${numericCols[0].name} (${periodType})`,
        title: `Evolution de ${numericCols[0].name}`,
      });
    } else if (numericCols.length <= 4) {
      recommendations.push({
        chartType: 'LineChart', xKey: periodCol, yKeys: numericCols.map(c => c.name),
        reason: `Comparaison de ${numericCols.length} metriques sur ${periodType}`,
        title: 'Evolution des indicateurs',
      });
    } else {
      const top3 = [...numericCols].sort((a, b) => (statsInfo[b.name]?.stddev || 0) - (statsInfo[a.name]?.stddev || 0)).slice(0, 3);
      recommendations.push({
        chartType: 'LineChart', xKey: periodCol, yKeys: top3.map(c => c.name),
        reason: `Top 3 metriques les plus variables sur ${periodType}`,
        title: 'Indicateurs principaux',
      });
    }
    if (numericCols.length > 1) {
      const main = numericCols.reduce((best, c) => (statsInfo[c.name]?.sum || 0) > (statsInfo[best.name]?.sum || 0) ? c : best, numericCols[0]);
      recommendations.push({
        chartType: 'AreaChart', xKey: periodCol, yKeys: [main.name],
        reason: `Tendance du principal indicateur (${main.name})`,
        title: `Evolution de ${main.name}`,
      });
    }
  }

  // 2. Category comparison — BarChart
  if (categoricalCols.length > 0 && numericCols.length > 0) {
    for (const cat of categoricalCols.slice(0, 2)) {
      const unique = statsInfo[cat.name]?.uniqueCount || cat.uniqueCount || 0;
      if (unique > 15) continue;
      const main = numericCols.reduce((best, c) => (statsInfo[c.name]?.sum || 0) > (statsInfo[best.name]?.sum || 0) ? c : best, numericCols[0]);
      recommendations.push({
        chartType: 'BarChart', xKey: cat.name, yKeys: [main.name],
        reason: `Comparaison de ${main.name} par ${cat.name} (${unique} categories)`,
        title: `${main.name} par ${cat.name}`,
      });
    }
  }

  // 3. PieChart — low-cardinality categories
  if (categoricalCols.length > 0 && numericCols.length > 0) {
    for (const cat of categoricalCols.slice(0, 1)) {
      const unique = statsInfo[cat.name]?.uniqueCount || cat.uniqueCount || 0;
      if (unique <= 6) {
        const main = numericCols.reduce((best, c) => (statsInfo[c.name]?.sum || 0) > (statsInfo[best.name]?.sum || 0) ? c : best, numericCols[0]);
        recommendations.push({
          chartType: 'PieChart', xKey: cat.name, yKeys: [main.name],
          reason: `Repartition de ${main.name} par ${cat.name} (${unique} categories)`,
          title: `Repartition par ${cat.name}`,
        });
      }
    }
  }

  // 4. Stacked bar — period + category + numeric
  if (hasPeriods && categoricalCols.length > 0 && numericCols.length > 0) {
    const cat = categoricalCols[0];
    const unique = statsInfo[cat.name]?.uniqueCount || cat.uniqueCount || 0;
    if (unique <= 8) {
      const main = numericCols.reduce((best, c) => (statsInfo[c.name]?.sum || 0) > (statsInfo[best.name]?.sum || 0) ? c : best, numericCols[0]);
      recommendations.push({
        chartType: 'StackedBarChart', xKey: periodCol, yKeys: [main.name], stackKey: cat.name,
        reason: `Composition de ${main.name} par ${cat.name} au fil du temps`,
        title: `${main.name} par ${cat.name} (${periodType})`,
      });
    }
  }

  // 5. Table recommendation
  if (columnsInfo.length >= 3) {
    recommendations.push({
      chartType: 'Table', columns: columnsInfo.map(c => c.name),
      reason: 'Vue tabulaire des donnees avec tri et filtrage',
      title: 'Donnees detaillees',
    });
  }

  // Deduplicate
  const seen = new Set();
  return recommendations.filter(rec => {
    const key = `${rec.chartType}_${rec.xKey || ''}_${(rec.yKeys || []).join(',')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============================================================================
// computeLocalStats — main entry point: runs all 4 steps
// ============================================================================
export function computeLocalStats(rawData) {
  if (!rawData || rawData.length === 0) return null;

  try {
    const columnsInfo = analyzeColumns(rawData);
    const periodsInfo = detectPeriods(rawData, columnsInfo);
    const stats = computeStats(rawData, columnsInfo, periodsInfo);
    const chartRecommendations = suggestCharts(columnsInfo, periodsInfo, stats);

    return {
      analysis: {
        columns: columnsInfo,
        periods: periodsInfo,
        stats,
        chartRecommendations,
      },
      rowCount: rawData.length,
      source: 'local', // indicates these stats were computed locally (not via skill)
    };
  } catch (e) {
    console.warn('Local stats computation failed:', e.message);
    return null;
  }
}
