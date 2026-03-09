// DashboardPlan — shows AI-generated dashboard plan for user validation before generation
import React from 'react';
import { motion } from 'motion/react';
import { SK } from '../services/sk-theme';

const CHART_ICONS = {
  AreaChart: 'M3 17l4-4 4 4 4-8 4 4',
  BarChart: 'M6 20V10M10 20V4M14 20v-6M18 20v-4',
  PieChart: 'M21 12a9 9 0 1 1-9-9M21 12A9 9 0 0 0 12 3M21 12H12V3',
  LineChart: 'M3 17l4-4 4 4 4-8 4 4',
};

export default function DashboardPlan({ plan, onConfirm, onEdit, onSkip, t }) {
  if (!plan) return null;

  const { pages = [], filters = [], ignoredColumns = [], summary = '' } = plan;

  return (
    <motion.div
      style={styles.container}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={SK.aqua} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
          </svg>
        </div>
        <span style={styles.headerText}>{t?.('planTitle') || 'Plan du Dashboard'}</span>
      </div>

      {/* Summary */}
      {summary && (
        <div style={styles.summary}>
          <span style={styles.summaryText}>{summary}</span>
        </div>
      )}

      {/* Pages */}
      <div style={styles.pagesArea}>
        {pages.map((page, pi) => (
          <div key={pi} style={styles.pageBlock}>
            <div style={styles.pageHeader}>
              <span style={styles.pageNumber}>{pi + 1}</span>
              <span style={styles.pageName}>{page.name}</span>
            </div>

            {/* KPIs */}
            {page.kpis && page.kpis.length > 0 && (
              <div style={styles.section}>
                <span style={styles.sectionLabel}>KPIs</span>
                <div style={styles.chipRow}>
                  {page.kpis.map((kpi, ki) => (
                    <span key={ki} style={styles.kpiChip}>
                      {kpi.label}
                      <span style={styles.chipMeta}>{kpi.calculation}({kpi.column})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Charts */}
            {page.charts && page.charts.length > 0 && (
              <div style={styles.section}>
                <span style={styles.sectionLabel}>{t?.('planCharts') || 'Graphiques'}</span>
                <div style={styles.chartList}>
                  {page.charts.map((chart, ci) => (
                    <div key={ci} style={styles.chartItem}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={SK.aqua} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={CHART_ICONS[chart.type] || CHART_ICONS.BarChart} />
                      </svg>
                      <span style={styles.chartType}>{chart.type}</span>
                      <span style={styles.chartTitle}>{chart.title}</span>
                      <span style={styles.chartMeta}>{chart.x} / {chart.y || chart.dimension || chart.metric}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Insights indicator */}
            {page.hasInsights && (
              <div style={styles.insightBadge}>Points cles inclus</div>
            )}
          </div>
        ))}
      </div>

      {/* Filters */}
      {filters.length > 0 && (
        <div style={styles.filtersSection}>
          <span style={styles.sectionLabel}>{t?.('planFilters') || 'Filtres'}</span>
          <div style={styles.chipRow}>
            {filters.map((f, fi) => (
              <span key={fi} style={styles.filterChip}>
                {f.label || f.column}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Ignored columns */}
      {ignoredColumns.length > 0 && (
        <div style={styles.ignoredSection}>
          <span style={styles.ignoredLabel}>{t?.('planIgnored') || 'Colonnes ignorees'}: </span>
          <span style={styles.ignoredText}>{ignoredColumns.join(', ')}</span>
        </div>
      )}

      {/* Actions */}
      <div style={styles.actions}>
        <button onClick={onConfirm} style={styles.confirmButton}>
          {t?.('planConfirm') || 'Generer ce dashboard'}
        </button>
        <button onClick={onSkip} style={styles.skipButton}>
          {t?.('planSkip') || 'Passer (generer directement)'}
        </button>
      </div>
    </motion.div>
  );
}

const styles = {
  container: {
    background: SK.bgPrimary,
    borderRadius: '12px',
    padding: '24px',
    border: `1px solid ${SK.border}`,
    maxWidth: '600px',
    width: '100%',
    boxShadow: '0 4px 12px rgba(50, 63, 72, 0.08)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
  },
  headerIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'rgba(109, 177, 199, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: '16px',
    fontWeight: '600',
    color: SK.textPrimary,
    letterSpacing: '-0.01em',
  },
  summary: {
    background: SK.bgSecondary,
    borderRadius: '8px',
    padding: '10px 14px',
    marginBottom: '20px',
  },
  summaryText: {
    fontSize: '13px',
    color: SK.textSecondary,
    lineHeight: '1.5',
  },
  pagesArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '20px',
  },
  pageBlock: {
    border: `1px solid ${SK.border}`,
    borderRadius: '10px',
    padding: '14px 16px',
    background: SK.bgPrimary,
  },
  pageHeader: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    marginBottom: '12px',
  },
  pageNumber: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: 'rgba(200, 0, 65, 0.1)',
    color: SK.ruby,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: '700',
    flexShrink: 0,
  },
  pageName: {
    fontSize: '14px',
    fontWeight: '600',
    color: SK.textPrimary,
  },
  section: {
    marginBottom: '10px',
  },
  sectionLabel: {
    fontSize: '10px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: SK.textMuted,
    marginBottom: '6px',
    display: 'block',
  },
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  kpiChip: {
    background: 'rgba(109, 177, 199, 0.1)',
    color: SK.aquaDark25,
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  chipMeta: {
    fontSize: '10px',
    color: SK.textMuted,
    fontWeight: '400',
  },
  chartList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  chartItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
  },
  chartType: {
    color: SK.aquaDark25,
    fontWeight: '600',
    fontSize: '11px',
    minWidth: '70px',
  },
  chartTitle: {
    color: SK.textPrimary,
    fontSize: '13px',
    flex: 1,
  },
  chartMeta: {
    color: SK.textMuted,
    fontSize: '11px',
  },
  insightBadge: {
    display: 'inline-block',
    background: 'rgba(47, 167, 77, 0.1)',
    color: SK.signalGreen,
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: '500',
    marginTop: '4px',
  },
  filtersSection: {
    marginBottom: '12px',
  },
  filterChip: {
    background: SK.bgSecondary,
    color: SK.textSecondary,
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: '500',
  },
  ignoredSection: {
    marginBottom: '16px',
    fontSize: '12px',
  },
  ignoredLabel: {
    color: SK.textMuted,
    fontWeight: '500',
  },
  ignoredText: {
    color: SK.textMuted,
    fontStyle: 'italic',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  confirmButton: {
    background: SK.ruby,
    color: SK.textInverse,
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s',
  },
  skipButton: {
    background: 'none',
    border: `1px dashed ${SK.border}`,
    borderRadius: '6px',
    color: SK.textSecondary,
    fontSize: '13px',
    cursor: 'pointer',
    padding: '8px 14px',
    fontFamily: 'inherit',
    textAlign: 'center',
    transition: 'all 0.15s',
  },
};
