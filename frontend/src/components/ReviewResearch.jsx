// ReviewResearch.jsx — Google Maps review analysis module
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SK } from '../services/sk-theme';
import { startReviewResearch, getResearchStatus, getResearchResults, estimateResearchCost } from '../services/api';

// ============ INDUSTRY PRESETS ============
const INDUSTRY_PRESETS = {
  restaurant: [
    { id: 'qualite_nourriture', label: 'Qualite nourriture', question: "La nourriture est-elle decrite comme bonne/mauvaise ?" },
    { id: 'variete_offre', label: "Variete de l'offre", question: "Assez de choix de produits ?" },
    { id: 'rapport_qualite_prix', label: 'Rapport qualite-prix', question: "Le prix est-il juste par rapport a la qualite ?" },
    { id: 'rapidite_service', label: 'Rapidite du service', question: "Le service est-il rapide ou lent ?" },
    { id: 'accueil_personnel', label: 'Accueil / Personnel', question: "Le personnel est-il aimable et efficace ?" },
    { id: 'hygiene_proprete', label: 'Hygiene / Proprete', question: "Le lieu est-il propre et hygienique ?" },
    { id: 'ambiance', label: 'Ambiance', question: "L'atmosphere est-elle agreable ?" },
    { id: 'nps', label: 'Recommandation', question: "Le client recommanderait-il l'etablissement ?" },
  ],
  hotel: [
    { id: 'chambre_proprete', label: 'Proprete chambre', question: "La chambre est-elle propre ?" },
    { id: 'chambre_confort', label: 'Confort chambre', question: "Le lit et la chambre sont-ils confortables ?" },
    { id: 'petit_dejeuner', label: 'Petit-dejeuner', question: "Le petit-dejeuner est-il bon et varie ?" },
    { id: 'accueil_reception', label: 'Accueil reception', question: "Le check-in est-il rapide et agreable ?" },
    { id: 'rapport_qualite_prix', label: 'Rapport qualite-prix', question: "Le prix est-il juste ?" },
    { id: 'localisation', label: 'Localisation', question: "L'emplacement est-il pratique ?" },
    { id: 'wifi_equipements', label: 'WiFi / Equipements', question: "WiFi et equipements fonctionnent-ils bien ?" },
    { id: 'nps', label: 'Recommandation', question: "Le client recommanderait-il l'hotel ?" },
  ],
  saas: [
    { id: 'facilite_utilisation', label: "Facilite d'utilisation", question: "Le produit est-il facile a utiliser ?" },
    { id: 'fiabilite', label: 'Fiabilite', question: "Le produit est-il stable, sans bugs ?" },
    { id: 'support_client', label: 'Support client', question: "Le support est-il reactif et utile ?" },
    { id: 'rapport_qualite_prix', label: 'Rapport qualite-prix', question: "Le prix est-il justifie ?" },
    { id: 'fonctionnalites', label: 'Fonctionnalites', question: "Les features couvrent-elles les besoins ?" },
    { id: 'onboarding', label: 'Onboarding', question: "La prise en main est-elle facile ?" },
    { id: 'nps', label: 'Recommandation', question: "L'utilisateur recommanderait-il le produit ?" },
  ],
  retail: [
    { id: 'qualite_produit', label: 'Qualite produit', question: "Les produits sont-ils de bonne qualite ?" },
    { id: 'rapport_qualite_prix', label: 'Rapport qualite-prix', question: "Le prix est-il juste ?" },
    { id: 'accueil_personnel', label: 'Accueil / Personnel', question: "Le personnel est-il aimable et efficace ?" },
    { id: 'disponibilite_stock', label: 'Disponibilite stock', question: "Les produits sont-ils en stock ?" },
    { id: 'ambiance_magasin', label: 'Ambiance magasin', question: "Le magasin est-il agreable ?" },
    { id: 'rapidite_caisse', label: 'Rapidite caisse', question: "Le passage en caisse est-il rapide ?" },
    { id: 'nps', label: 'Recommandation', question: "Le client recommanderait-il le magasin ?" },
  ],
};

const INDUSTRIES = ['restaurant', 'hotel', 'saas', 'retail'];
const SCALES = ['1-100', '1-10', '1-5', 'binary'];

// ============ STEP COMPONENTS ============

function ScopeStep({ config, setConfig, t }) {
  const addBrand = () => setConfig(c => ({ ...c, brands: [...c.brands, ''] }));
  const addCompetitor = () => setConfig(c => ({ ...c, competitors: [...c.competitors, ''] }));
  const showCompetitors = config.competitors.length > 0;

  return (
    <div style={s.stepContent}>
      <h3 style={s.stepTitle}>{t('rr.scopeTitle')}</h3>

      <label style={s.label}>{t('rr.industry')}</label>
      <div style={s.chipRow}>
        {INDUSTRIES.map(ind => (
          <button
            key={ind}
            style={{
              ...s.chip,
              ...(config.industry === ind ? s.chipActive : {}),
            }}
            onClick={() => {
              setConfig(c => ({
                ...c,
                industry: ind,
                criteria: INDUSTRY_PRESETS[ind] || c.criteria,
              }));
            }}
          >
            {t(`rr.ind_${ind}`)}
          </button>
        ))}
      </div>

      <label style={s.label}>{t('rr.brands')}</label>
      {config.brands.map((b, i) => (
        <div key={i} style={s.inputRow}>
          <input
            style={s.input}
            value={b}
            placeholder={t('rr.brandPlaceholder')}
            onChange={(e) => {
              const brands = [...config.brands];
              brands[i] = e.target.value;
              setConfig(c => ({ ...c, brands }));
            }}
          />
          {config.brands.length > 1 && (
            <button
              style={s.removeBtn}
              onClick={() => setConfig(c => ({ ...c, brands: c.brands.filter((_, j) => j !== i) }))}
            >x</button>
          )}
        </div>
      ))}
      <button style={s.addBtn} onClick={addBrand}>+ {t('rr.addBrand')}</button>

      {!showCompetitors ? (
        <button
          style={{ ...s.addBtn, marginTop: 16, color: '#6DB1C7', borderColor: 'rgba(109,177,199,0.3)' }}
          onClick={() => setConfig(c => ({ ...c, competitors: [''] }))}
        >
          {t('rr.addCompetitors')}
        </button>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
            <label style={s.label}>{t('rr.competitors')}</label>
            <button
              style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
              onClick={() => setConfig(c => ({ ...c, competitors: [] }))}
            >
              {t('rr.hideCompetitors')}
            </button>
          </div>
          {config.competitors.map((c, i) => (
            <div key={i} style={s.inputRow}>
              <input
                style={s.input}
                value={c}
                placeholder={t('rr.competitorPlaceholder')}
                onChange={(e) => {
                  const competitors = [...config.competitors];
                  competitors[i] = e.target.value;
                  setConfig(cfg => ({ ...cfg, competitors }));
                }}
              />
              {config.competitors.length > 1 && (
                <button
                  style={s.removeBtn}
                  onClick={() => setConfig(cfg => ({ ...cfg, competitors: cfg.competitors.filter((_, j) => j !== i) }))}
                >x</button>
              )}
            </div>
          ))}
          <button style={s.addBtn} onClick={addCompetitor}>+ {t('rr.addCompetitor')}</button>
        </>
      )}

      <label style={{ ...s.label, marginTop: 16 }}>{t('rr.location')}</label>
      <input
        style={s.input}
        value={config.location}
        placeholder="Paris, France"
        onChange={(e) => setConfig(c => ({ ...c, location: e.target.value }))}
      />

      <label style={{ ...s.label, marginTop: 16 }}>{t('rr.maxReviews')}</label>
      <input
        style={{ ...s.input, width: 140 }}
        type="number"
        min={10}
        max={10000}
        value={config.maxReviewsPerBrand}
        onChange={(e) => setConfig(c => ({ ...c, maxReviewsPerBrand: parseInt(e.target.value) || 100 }))}
      />
    </div>
  );
}

function CriteriaStep({ config, setConfig, t }) {
  const toggleCriterion = (id) => {
    setConfig(c => {
      const exists = c.criteria.find(cr => cr.id === id);
      if (exists) return { ...c, criteria: c.criteria.filter(cr => cr.id !== id) };
      const preset = (INDUSTRY_PRESETS[c.industry] || []).find(p => p.id === id);
      if (preset) return { ...c, criteria: [...c.criteria, preset] };
      return c;
    });
  };

  const addCustom = () => {
    const id = `custom_${Date.now()}`;
    setConfig(c => ({
      ...c,
      criteria: [...c.criteria, { id, label: '', question: '' }],
    }));
  };

  const updateCriterion = (index, field, value) => {
    setConfig(c => {
      const criteria = [...c.criteria];
      criteria[index] = { ...criteria[index], [field]: value };
      if (field === 'label') {
        criteria[index].id = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      }
      return { ...c, criteria };
    });
  };

  const allPresets = INDUSTRY_PRESETS[config.industry] || [];
  const activeIds = new Set(config.criteria.map(c => c.id));

  return (
    <div style={s.stepContent}>
      <h3 style={s.stepTitle}>{t('rr.criteriaTitle')}</h3>
      <p style={s.stepDesc}>{t('rr.criteriaDesc')}</p>

      {allPresets.length > 0 && (
        <div style={s.presetGrid}>
          {allPresets.map(p => (
            <button
              key={p.id}
              style={{
                ...s.presetChip,
                ...(activeIds.has(p.id) ? s.presetChipActive : {}),
              }}
              onClick={() => toggleCriterion(p.id)}
            >
              <span style={s.checkMark}>{activeIds.has(p.id) ? '\u2713' : ''}</span>
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        {config.criteria.filter(c => c.id.startsWith('custom_') || !allPresets.find(p => p.id === c.id)).map((c, i) => {
          const realIndex = config.criteria.indexOf(c);
          return (
            <div key={c.id} style={s.customCriterion}>
              <input
                style={{ ...s.input, flex: 1 }}
                value={c.label}
                placeholder={t('rr.criterionLabel')}
                onChange={(e) => updateCriterion(realIndex, 'label', e.target.value)}
              />
              <input
                style={{ ...s.input, flex: 2 }}
                value={c.question}
                placeholder={t('rr.criterionQuestion')}
                onChange={(e) => updateCriterion(realIndex, 'question', e.target.value)}
              />
              <button
                style={s.removeBtn}
                onClick={() => setConfig(cfg => ({ ...cfg, criteria: cfg.criteria.filter((_, j) => j !== realIndex) }))}
              >x</button>
            </div>
          );
        })}
      </div>

      <button style={s.addBtn} onClick={addCustom}>+ {t('rr.addCriterion')}</button>

      <label style={{ ...s.label, marginTop: 20 }}>{t('rr.scale')}</label>
      <div style={s.chipRow}>
        {SCALES.map(sc => (
          <button
            key={sc}
            style={{ ...s.chip, ...(config.scale === sc ? s.chipActive : {}) }}
            onClick={() => setConfig(c => ({ ...c, scale: sc }))}
          >
            {sc === 'binary' ? t('rr.scaleBinary') : sc}
          </button>
        ))}
      </div>
    </div>
  );
}

function SourceStep({ config, setConfig, t, fileInputRef }) {
  return (
    <div style={s.stepContent}>
      <h3 style={s.stepTitle}>{t('rr.sourceTitle')}</h3>

      <div style={s.sourceCards}>
        <motion.div
          style={{
            ...s.sourceCard,
            ...(config.dataSource === 'scrape' ? s.sourceCardActive : {}),
          }}
          whileHover={{ borderColor: SK.ruby, y: -1 }}
          onClick={() => setConfig(c => ({ ...c, dataSource: 'scrape' }))}
        >
          <div style={s.sourceIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={config.dataSource === 'scrape' ? SK.ruby : SK.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              <path d="M2 12h20" />
            </svg>
          </div>
          <div>
            <div style={s.sourceCardTitle}>{t('rr.scrapeGmaps')}</div>
            <div style={s.sourceCardDesc}>{t('rr.scrapeGmapsDesc')}</div>
          </div>
        </motion.div>

        <motion.div
          style={{
            ...s.sourceCard,
            ...(config.dataSource === 'upload' ? { ...s.sourceCardActive, borderColor: SK.aqua } : {}),
          }}
          whileHover={{ borderColor: SK.aqua, y: -1 }}
          onClick={() => setConfig(c => ({ ...c, dataSource: 'upload' }))}
        >
          <div style={{ ...s.sourceIcon, background: 'rgba(109,177,199,0.08)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={config.dataSource === 'upload' ? SK.aqua : SK.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div>
            <div style={s.sourceCardTitle}>{t('rr.uploadFile')}</div>
            <div style={s.sourceCardDesc}>{t('rr.uploadFileDesc')}</div>
          </div>
        </motion.div>
      </div>

      {config.dataSource === 'upload' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          style={{ marginTop: 16 }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setConfig(c => ({ ...c, uploadedFile: file }));
            }}
          />
          <button
            style={s.uploadBtn}
            onClick={() => fileInputRef.current?.click()}
          >
            {config.uploadedFile ? config.uploadedFile.name : t('rr.chooseFile')}
          </button>
          {config.uploadedFile && (
            <span style={{ fontSize: 12, color: SK.signalGreen, marginLeft: 8 }}>
              {(config.uploadedFile.size / 1024).toFixed(0)} KB
            </span>
          )}
        </motion.div>
      )}
    </div>
  );
}

function CostEstimate({ config, cost, t }) {
  if (!cost) return null;
  return (
    <motion.div
      style={s.costCard}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h4 style={s.costTitle}>{t('rr.costEstimate')}</h4>
      <div style={s.costRow}>
        <span>{t('rr.scraping')}</span>
        <span style={s.costValue}>${cost.scraping.toFixed(2)}</span>
      </div>
      <div style={s.costRow}>
        <span>{t('rr.analysis')}</span>
        <span style={s.costValue}>${cost.analysis.toFixed(2)}</span>
      </div>
      <div style={{ ...s.costRow, borderTop: `1px solid ${SK.border}`, paddingTop: 8, marginTop: 4, fontWeight: 600 }}>
        <span>Total</span>
        <span style={{ ...s.costValue, color: SK.textPrimary, fontWeight: 700 }}>${cost.total.toFixed(2)}</span>
      </div>
      <div style={{ fontSize: 11, color: SK.textMuted, marginTop: 6 }}>
        {t('rr.costNote')}
      </div>
    </motion.div>
  );
}

function ProgressView({ status, t }) {
  const pct = Math.round((status.progress || 0) * 100);
  return (
    <motion.div
      style={s.progressContainer}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div style={s.progressHeader}>
        <motion.div
          style={s.progressSpinner}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: SK.textPrimary }}>
          {t('rr.analyzing')}
        </h3>
      </div>

      <div style={s.progressBarBg}>
        <motion.div
          style={s.progressBarFill}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div style={s.progressStats}>
        <div style={s.progressStat}>
          <span style={s.progressStatValue}>{status.analyzed || 0}</span>
          <span style={s.progressStatLabel}>/ {status.total || '?'} {t('rr.reviews')}</span>
        </div>
        <div style={s.progressStat}>
          <span style={s.progressStatValue}>{pct}%</span>
        </div>
        {status.eta && (
          <div style={s.progressStat}>
            <span style={s.progressStatLabel}>ETA: {status.eta}</span>
          </div>
        )}
      </div>

      {status.errors > 0 && (
        <div style={{ fontSize: 12, color: SK.signalYellow, marginTop: 8 }}>
          {status.errors} {t('rr.errors')}
        </div>
      )}
    </motion.div>
  );
}

function ResultsView({ results, t }) {
  if (!results) return null;
  const { summary } = results;

  return (
    <motion.div
      style={s.resultsContainer}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div style={s.resultsBadge}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={SK.signalGreen} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <span style={{ fontWeight: 700, color: SK.signalGreen }}>{t('rr.completed')}</span>
      </div>

      <div style={s.resultsSummary}>
        <div style={s.resultStat}>
          <span style={s.resultStatValue}>{summary.totalReviews}</span>
          <span style={s.resultStatLabel}>{t('rr.totalReviews')}</span>
        </div>
        <div style={s.resultStat}>
          <span style={s.resultStatValue}>{summary.analyzedReviews}</span>
          <span style={s.resultStatLabel}>{t('rr.analyzed')}</span>
        </div>
        <div style={s.resultStat}>
          <span style={s.resultStatValue}>${summary.cost?.total?.toFixed(2) || '0'}</span>
          <span style={s.resultStatLabel}>{t('rr.totalCost')}</span>
        </div>
      </div>

      {summary.avgScores && (
        <div style={s.scoresGrid}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: SK.textPrimary }}>{t('rr.avgScores')}</h4>
          {Object.entries(summary.avgScores).map(([key, val]) => (
            <div key={key} style={s.scoreRow}>
              <span style={s.scoreLabel}>{key.replace(/_/g, ' ')}</span>
              <div style={s.scoreBarBg}>
                <div style={{ ...s.scoreBarFill, width: `${val}%` }} />
              </div>
              <span style={s.scoreValue}>{val}</span>
            </div>
          ))}
        </div>
      )}

      <div style={s.downloadRow}>
        {results.excelUrl && (
          <a href={results.excelUrl} download style={s.downloadBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Excel
          </a>
        )}
        {results.jsonUrl && (
          <a href={results.jsonUrl} download style={{ ...s.downloadBtn, background: 'rgba(109,177,199,0.08)', border: `1px solid rgba(109,177,199,0.25)`, color: SK.aqua }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            JSON
          </a>
        )}
      </div>
    </motion.div>
  );
}

// ============ MAIN COMPONENT ============
export default function ReviewResearch({ onBack, t = (k) => k }) {
  const [step, setStep] = useState(0); // 0=scope, 1=criteria, 2=source, 3=confirm, 4=running, 5=done
  const [config, setConfig] = useState({
    industry: 'restaurant',
    brands: [''],
    competitors: [],
    location: '',
    maxReviewsPerBrand: 500,
    language: 'fr',
    criteria: INDUSTRY_PRESETS.restaurant,
    scale: '1-100',
    dataSource: 'scrape',
    uploadedFile: null,
  });
  const [cost, setCost] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState({});
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [launching, setLaunching] = useState(false);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  // Compute cost when config changes
  useEffect(() => {
    const n = (config.brands.filter(b => b.trim()).length + config.competitors.filter(c => c.trim()).length) * config.maxReviewsPerBrand;
    if (n <= 0) { setCost(null); return; }

    const scrapingCost = config.dataSource === 'scrape' ? (n / 1000) * 1.50 : 0;
    const avgInputTokens = 1800;
    const avgOutputTokens = 600;
    const cachedTokens = 1661;
    const dynamicTokens = avgInputTokens - cachedTokens;

    const firstReviewCost = (avgInputTokens * 3.75 + avgOutputTokens * 15) / 1_000_000;
    const cachedReviewCost = ((cachedTokens * 0.30 + dynamicTokens * 3.0) + avgOutputTokens * 15) / 1_000_000;
    const missReviewCost = firstReviewCost;

    const subsequent = n - 1;
    const hits = subsequent * 0.98;
    const misses = subsequent * 0.02;
    const analysisCost = firstReviewCost + (hits * cachedReviewCost) + (misses * missReviewCost);

    setCost({ scraping: scrapingCost, analysis: analysisCost, total: scrapingCost + analysisCost, reviewCount: n });
  }, [config.brands, config.competitors, config.maxReviewsPerBrand, config.dataSource]);

  // Poll job status
  useEffect(() => {
    if (!jobId || step !== 4) return;
    pollRef.current = setInterval(async () => {
      try {
        const st = await getResearchStatus(jobId);
        setStatus(st);
        if (st.status === 'completed') {
          clearInterval(pollRef.current);
          const res = await getResearchResults(jobId);
          setResults(res);
          setStep(5);
        } else if (st.status === 'error') {
          clearInterval(pollRef.current);
          setError(st.error || 'Analysis failed');
          setStep(3);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [jobId, step]);

  const canProceed = useMemo(() => {
    if (step === 0) return config.brands.some(b => b.trim()) && config.location.trim();
    if (step === 1) return config.criteria.length > 0;
    if (step === 2) return config.dataSource === 'scrape' || config.uploadedFile;
    return true;
  }, [step, config]);

  const handleLaunch = useCallback(async () => {
    setLaunching(true);
    setError('');
    try {
      const payload = {
        ...config,
        brands: config.brands.filter(b => b.trim()),
        competitors: config.competitors.filter(c => c.trim()),
      };
      const { jobId: id } = await startReviewResearch(payload);
      setJobId(id);
      setStep(4);
    } catch (err) {
      setError(err.message);
    }
    setLaunching(false);
  }, [config]);

  const handleNewResearch = () => {
    setStep(0);
    setJobId(null);
    setStatus({});
    setResults(null);
    setError('');
    setConfig(c => ({ ...c, brands: [''], competitors: [], location: '' }));
  };

  const stepLabels = [t('rr.stepScope'), t('rr.stepCriteria'), t('rr.stepSource'), t('rr.stepConfirm')];

  return (
    <div style={s.container}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={s.header}
      >
        <button style={s.backBtn} onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <h2 style={s.mainTitle}>{t('rr.title')}</h2>
          <p style={s.mainDesc}>{t('rr.subtitle')}</p>
        </div>
      </motion.div>

      {/* Step indicator */}
      {step < 4 && (
        <div style={s.stepsBar}>
          {stepLabels.map((label, i) => (
            <div
              key={i}
              style={{
                ...s.stepDot,
                ...(i === step ? s.stepDotActive : i < step ? s.stepDotDone : {}),
              }}
              onClick={() => { if (i < step) setStep(i); }}
            >
              <span style={s.stepDotNum}>{i < step ? '\u2713' : i + 1}</span>
              <span style={s.stepDotLabel}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Step content */}
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="scope" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <ScopeStep config={config} setConfig={setConfig} t={t} />
          </motion.div>
        )}
        {step === 1 && (
          <motion.div key="criteria" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <CriteriaStep config={config} setConfig={setConfig} t={t} />
          </motion.div>
        )}
        {step === 2 && (
          <motion.div key="source" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <SourceStep config={config} setConfig={setConfig} t={t} fileInputRef={fileInputRef} />
          </motion.div>
        )}
        {step === 3 && (
          <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div style={s.stepContent}>
              <h3 style={s.stepTitle}>{t('rr.confirmTitle')}</h3>

              <div style={s.summaryCard}>
                <div style={s.summaryRow}>
                  <span style={s.summaryLabel}>{t('rr.industry')}</span>
                  <span style={s.summaryValue}>{t(`rr.ind_${config.industry}`)}</span>
                </div>
                <div style={s.summaryRow}>
                  <span style={s.summaryLabel}>{t('rr.brands')}</span>
                  <span style={s.summaryValue}>{config.brands.filter(b => b.trim()).join(', ')}</span>
                </div>
                {config.competitors.filter(c => c.trim()).length > 0 && (
                  <div style={s.summaryRow}>
                    <span style={s.summaryLabel}>{t('rr.competitors')}</span>
                    <span style={s.summaryValue}>{config.competitors.filter(c => c.trim()).join(', ')}</span>
                  </div>
                )}
                <div style={s.summaryRow}>
                  <span style={s.summaryLabel}>{t('rr.location')}</span>
                  <span style={s.summaryValue}>{config.location}</span>
                </div>
                <div style={s.summaryRow}>
                  <span style={s.summaryLabel}>{t('rr.criteriaCount')}</span>
                  <span style={s.summaryValue}>{config.criteria.length} {t('rr.criteria')}</span>
                </div>
                <div style={s.summaryRow}>
                  <span style={s.summaryLabel}>{t('rr.scale')}</span>
                  <span style={s.summaryValue}>{config.scale}</span>
                </div>
                <div style={s.summaryRow}>
                  <span style={s.summaryLabel}>{t('rr.source')}</span>
                  <span style={s.summaryValue}>
                    {config.dataSource === 'scrape' ? 'Google Maps (Outscraper)' : config.uploadedFile?.name || 'File'}
                  </span>
                </div>
              </div>

              <CostEstimate config={config} cost={cost} t={t} />

              {error && (
                <div style={{ color: SK.signalRed, fontSize: 13, marginTop: 12, background: 'rgba(228,84,68,0.05)', border: '1px solid rgba(228,84,68,0.2)', borderRadius: 8, padding: '10px 14px' }}>
                  {error}
                </div>
              )}
            </div>
          </motion.div>
        )}
        {step === 4 && (
          <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ProgressView status={status} t={t} />
          </motion.div>
        )}
        {step === 5 && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ResultsView results={results} t={t} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation buttons */}
      {step < 4 && (
        <div style={s.navRow}>
          {step > 0 && (
            <button style={s.secondaryBtn} onClick={() => setStep(s => s - 1)}>
              {t('rr.back')}
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < 3 ? (
            <button
              style={{ ...s.primaryBtn, opacity: canProceed ? 1 : 0.5 }}
              disabled={!canProceed}
              onClick={() => setStep(s => s + 1)}
            >
              {t('rr.next')}
            </button>
          ) : (
            <button
              style={{ ...s.primaryBtn, opacity: launching ? 0.6 : 1 }}
              disabled={launching}
              onClick={handleLaunch}
            >
              {launching ? (
                <motion.span
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <motion.div
                    style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%' }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  {t('rr.launching')}
                </motion.span>
              ) : t('rr.launch')}
            </button>
          )}
        </div>
      )}

      {step === 5 && (
        <div style={s.navRow}>
          <button style={s.secondaryBtn} onClick={handleNewResearch}>
            {t('rr.newResearch')}
          </button>
        </div>
      )}
    </div>
  );
}

// ============ STYLES ============
const s = {
  container: {
    maxWidth: 640,
    width: '100%',
    margin: '0 auto',
    padding: '20px 0',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
  },
  backBtn: {
    background: 'none',
    border: `1px solid ${SK.border}`,
    borderRadius: 8,
    padding: '8px',
    cursor: 'pointer',
    color: SK.textSecondary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
    flexShrink: 0,
    marginTop: 2,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: SK.textPrimary,
    margin: '0 0 4px',
    letterSpacing: '-0.01em',
  },
  mainDesc: {
    fontSize: 13,
    color: SK.textSecondary,
    margin: 0,
    lineHeight: 1.5,
  },

  // Steps bar
  stepsBar: {
    display: 'flex',
    gap: 4,
    marginBottom: 24,
  },
  stepDot: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 12px',
    background: SK.bgPrimary,
    border: `1px solid ${SK.border}`,
    borderRadius: 8,
    cursor: 'default',
    transition: 'all 0.2s',
  },
  stepDotActive: {
    borderColor: SK.ruby,
    background: 'rgba(200, 0, 65, 0.04)',
  },
  stepDotDone: {
    borderColor: SK.signalGreen,
    background: 'rgba(47, 167, 77, 0.04)',
    cursor: 'pointer',
  },
  stepDotNum: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: SK.bgSecondary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700,
    color: SK.textSecondary,
    flexShrink: 0,
  },
  stepDotLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: SK.textSecondary,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  // Step content
  stepContent: {
    background: SK.bgPrimary,
    border: `1px solid ${SK.border}`,
    borderRadius: 12,
    padding: '24px',
    boxShadow: SK.shadowSm,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: SK.textPrimary,
    margin: '0 0 4px',
  },
  stepDesc: {
    fontSize: 13,
    color: SK.textSecondary,
    margin: '0 0 16px',
    lineHeight: 1.5,
  },

  // Form elements
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: SK.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 6,
    marginTop: 0,
  },
  input: {
    width: '100%',
    background: SK.bgSecondary,
    border: `1px solid ${SK.border}`,
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 14,
    color: SK.textPrimary,
    fontFamily: SK.fontFamily,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },
  inputRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 6,
    alignItems: 'center',
  },
  removeBtn: {
    background: 'none',
    border: `1px solid rgba(228,84,68,0.2)`,
    color: SK.signalRed,
    borderRadius: 6,
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: SK.fontFamily,
    flexShrink: 0,
    transition: 'all 0.15s',
  },
  addBtn: {
    background: 'none',
    border: `1px dashed ${SK.border}`,
    borderRadius: 6,
    color: SK.textSecondary,
    fontSize: 13,
    padding: '8px 14px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'center',
    fontFamily: SK.fontFamily,
    transition: 'all 0.15s',
    marginTop: 4,
  },

  // Chips
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  chip: {
    background: SK.bgSecondary,
    border: `1px solid ${SK.border}`,
    borderRadius: 20,
    padding: '7px 16px',
    fontSize: 13,
    color: SK.textSecondary,
    cursor: 'pointer',
    fontFamily: SK.fontFamily,
    fontWeight: 500,
    transition: 'all 0.15s',
  },
  chipActive: {
    background: 'rgba(200, 0, 65, 0.08)',
    border: `1px solid ${SK.ruby}`,
    color: SK.ruby,
    fontWeight: 600,
  },

  // Preset grid
  presetGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  presetChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: SK.bgSecondary,
    border: `1px solid ${SK.border}`,
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    color: SK.textSecondary,
    cursor: 'pointer',
    fontFamily: SK.fontFamily,
    transition: 'all 0.15s',
  },
  presetChipActive: {
    background: 'rgba(200, 0, 65, 0.06)',
    border: `1px solid rgba(200, 0, 65, 0.3)`,
    color: SK.ruby,
  },
  checkMark: {
    width: 16,
    height: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
  },
  customCriterion: {
    display: 'flex',
    gap: 6,
    marginBottom: 6,
    alignItems: 'center',
  },

  // Source cards
  sourceCards: {
    display: 'flex',
    gap: 12,
    marginTop: 12,
  },
  sourceCard: {
    flex: 1,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '20px 16px',
    background: SK.bgPrimary,
    border: `1.5px solid ${SK.border}`,
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  sourceCardActive: {
    borderColor: SK.ruby,
    background: 'rgba(200, 0, 65, 0.02)',
    boxShadow: '0 2px 8px rgba(200, 0, 65, 0.06)',
  },
  sourceIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: 'rgba(200, 0, 65, 0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sourceCardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: SK.textPrimary,
    marginBottom: 4,
  },
  sourceCardDesc: {
    fontSize: 12,
    color: SK.textSecondary,
    lineHeight: 1.4,
  },
  uploadBtn: {
    background: SK.bgSecondary,
    border: `1px dashed ${SK.border}`,
    borderRadius: 8,
    padding: '10px 16px',
    fontSize: 13,
    color: SK.textSecondary,
    cursor: 'pointer',
    fontFamily: SK.fontFamily,
    transition: 'all 0.15s',
  },

  // Cost
  costCard: {
    background: SK.bgSecondary,
    border: `1px solid ${SK.border}`,
    borderRadius: 10,
    padding: '16px 20px',
    marginTop: 16,
  },
  costTitle: {
    margin: '0 0 10px',
    fontSize: 13,
    fontWeight: 600,
    color: SK.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  costRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    color: SK.textSecondary,
    marginBottom: 4,
  },
  costValue: {
    fontWeight: 600,
    color: SK.textPrimary,
    fontFamily: "'SF Mono', 'Fira Code', monospace",
    fontSize: 13,
  },

  // Summary
  summaryCard: {
    background: SK.bgSecondary,
    border: `1px solid ${SK.border}`,
    borderRadius: 10,
    padding: '16px 20px',
    marginTop: 12,
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    padding: '6px 0',
    borderBottom: `1px solid ${SK.border}`,
  },
  summaryLabel: {
    color: SK.textSecondary,
  },
  summaryValue: {
    color: SK.textPrimary,
    fontWeight: 500,
  },

  // Progress
  progressContainer: {
    background: SK.bgPrimary,
    border: `1px solid ${SK.border}`,
    borderRadius: 12,
    padding: '32px 24px',
    textAlign: 'center',
    boxShadow: SK.shadowMd,
  },
  progressHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  progressSpinner: {
    width: 24,
    height: 24,
    border: `2.5px solid ${SK.border}`,
    borderTop: `2.5px solid ${SK.ruby}`,
    borderRadius: '50%',
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    background: SK.bgSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    background: `linear-gradient(90deg, ${SK.ruby}, ${SK.salmon})`,
    borderRadius: 3,
  },
  progressStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: 24,
    marginTop: 16,
  },
  progressStat: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 4,
  },
  progressStatValue: {
    fontSize: 20,
    fontWeight: 700,
    color: SK.textPrimary,
  },
  progressStatLabel: {
    fontSize: 13,
    color: SK.textSecondary,
  },

  // Results
  resultsContainer: {
    background: SK.bgPrimary,
    border: `1px solid ${SK.border}`,
    borderRadius: 12,
    padding: '24px',
    boxShadow: SK.shadowSm,
  },
  resultsBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    fontSize: 15,
  },
  resultsSummary: {
    display: 'flex',
    gap: 16,
    marginBottom: 20,
  },
  resultStat: {
    flex: 1,
    background: SK.bgSecondary,
    borderRadius: 10,
    padding: '16px',
    textAlign: 'center',
  },
  resultStatValue: {
    display: 'block',
    fontSize: 22,
    fontWeight: 700,
    color: SK.textPrimary,
    marginBottom: 4,
  },
  resultStatLabel: {
    fontSize: 11,
    color: SK.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  scoresGrid: {
    background: SK.bgSecondary,
    borderRadius: 10,
    padding: '16px 20px',
    marginBottom: 16,
  },
  scoreRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  scoreLabel: {
    width: 140,
    fontSize: 12,
    color: SK.textSecondary,
    textTransform: 'capitalize',
    flexShrink: 0,
  },
  scoreBarBg: {
    flex: 1,
    height: 6,
    background: SK.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    background: `linear-gradient(90deg, ${SK.ruby}, ${SK.salmon})`,
    borderRadius: 3,
    transition: 'width 0.5s',
  },
  scoreValue: {
    width: 30,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: 600,
    color: SK.textPrimary,
  },
  downloadRow: {
    display: 'flex',
    gap: 10,
  },
  downloadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(200, 0, 65, 0.06)',
    border: `1px solid rgba(200, 0, 65, 0.2)`,
    borderRadius: 8,
    padding: '10px 20px',
    fontSize: 13,
    fontWeight: 600,
    color: SK.ruby,
    cursor: 'pointer',
    textDecoration: 'none',
    fontFamily: SK.fontFamily,
    transition: 'all 0.15s',
  },

  // Navigation
  navRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  primaryBtn: {
    background: SK.ruby,
    color: SK.white,
    border: 'none',
    borderRadius: 8,
    padding: '12px 28px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: SK.fontFamily,
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  secondaryBtn: {
    background: SK.bgPrimary,
    color: SK.textSecondary,
    border: `1px solid ${SK.border}`,
    borderRadius: 8,
    padding: '12px 20px',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: SK.fontFamily,
    transition: 'all 0.15s',
  },
};
