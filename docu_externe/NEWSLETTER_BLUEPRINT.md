# Newsletter App Blueprint

> Ce fichier est un guide complet pour un agent Claude qui doit comprendre, reproduire ou adapter cette application de newsletter automatisee. Il sert de reference dans un systeme de "app builder" ou l'utilisateur choisit de creer une newsletter personnalisee.

---

## 1. Qu'est-ce que cette app ?

Une application Python qui genere automatiquement une newsletter tech quotidienne. Chaque jour, elle collecte du contenu depuis plusieurs sources (actualites web, Hacker News, articles academiques), le resume avec un LLM, genere un fichier HTML style, et le sert via une web app Flask. Le tout tourne en autonomie via cron/Task Scheduler.

**Pipeline en 4 etapes :**
```
Sources (APIs) --> Collecte --> Resume IA --> HTML --> Archive --> Web App
```

---

## 2. Architecture & Pipeline

### Etape 1 : Collecte de contenu
Chaque source a son propre module dans `src/collectors/`. Ils retournent tous des listes de dicts avec au minimum `title`, `url`, et du contenu brut.

| Module | Source | API/Methode | Contenu retourne |
|--------|--------|-------------|------------------|
| `gemini_news.py` | Actualites web | Google Gemini 2.5 Flash + Google Search grounding | titre, url, resume pre-genere |
| `hackernews.py` | Hacker News | Firebase (IDs) + Algolia (contenu) | titre, url, score, contenu texte |
| `arxiv_rss.py` | arXiv | RSS feeds (cs.AI, cs.LG) | titre, url, abstract, auteurs |

### Etape 1.5 : Recuperation d'images
`src/utils/fetch_article_images.py` scrape les meta tags Open Graph / Twitter Card des URLs pour ajouter une `image_url` a chaque article. Utilise ThreadPoolExecutor (5 workers).

### Etape 2 : Resume
`src/summarizers/huggingface_summarizer.py` utilise le SDK OpenAI pour appeler Hugging Face (modele Llama-3.3-70B-Instruct). Genere un format standardise :
```
Summary: 2-3 phrases
Why This Matters:
* point cle 1
* point cle 2
* point cle 3
```
Gemini news est saute (deja resume). Rate limit : 1s entre articles. Max tokens : 300.

### Etape 3 : Generation HTML
`src/generators/html_generator.py` produit un fichier HTML standalone avec CSS inline. 3 sections : World Tech News, Hacker News, Research Papers. Inclut images, boutons de partage (LinkedIn, Twitter, Copy Link).

### Etape 4 : Sauvegarde
Le HTML est sauve dans `archive/YYYY-MM-DD.html`.

### Web App
`webapp/app.py` (Flask) sert les digests :
- `/` : landing page
- `/home` : feed principal (tous les digests, plus recent en premier)
- `/health` : health check

Le frontend (vanilla JS + CSS modulaire) ajoute : dark mode, filtres, TTS, export PDF, bookmarks, barre de progression, table des matieres.

---

## 3. Arbre des fichiers

```
projet/
|-- main.py                          # Orchestrateur principal (pipeline)
|-- requirements.txt                 # Dependances Python
|-- .env                             # Cles API et config
|-- setup.sh / setup.bat             # Scripts d'installation
|-- run_daily.sh / run_daily.bat     # Execution quotidienne
|-- start_webapp.sh / start_webapp.bat # Lancement web app
|-- install_cron.sh                  # Installation cron Linux
|
|-- src/
|   |-- collectors/
|   |   |-- gemini_news.py           # Collecteur actualites (Gemini + Google Search)
|   |   |-- hackernews.py            # Collecteur Hacker News (Firebase + Algolia)
|   |   |-- arxiv_rss.py             # Collecteur arXiv (RSS feeds)
|   |   |-- reddit.py                # Placeholder (non implemente)
|   |
|   |-- summarizers/
|   |   |-- huggingface_summarizer.py # Resume via HF (Llama-3.3-70B, SDK OpenAI)
|   |
|   |-- generators/
|   |   |-- html_generator.py        # Generateur HTML avec CSS inline
|   |
|   |-- utils/
|       |-- config.py                # Chargement .env, validation, constantes
|       |-- helpers.py               # Logger, dates, I/O fichiers, truncate_text
|       |-- fetch_article_images.py  # Scraping images (OG/Twitter meta tags)
|
|-- webapp/
|   |-- app.py                       # Serveur Flask (3 routes)
|   |-- templates/
|   |   |-- index.html               # Template Jinja2 feed principal
|   |   |-- landing_vanta.html       # Landing page
|   |-- static/
|       |-- js/  (10 fichiers)       # main, share, filters, tts, saved, pdf, theme, progress, toc, fab
|       |-- css/ (14 fichiers)       # base, main, header, articles, animations, filters, sidebar, responsive...
|
|-- archive/                         # Fichiers HTML generes (YYYY-MM-DD.html)
|-- logs/                            # Logs d'execution
```

---

## 4. Tech Stack

| Couche | Technologies |
|--------|-------------|
| **Langage** | Python 3 |
| **Web framework** | Flask + Jinja2 |
| **LLM resume** | Hugging Face Inference API (Llama-3.3-70B-Instruct) via SDK OpenAI |
| **LLM actualites** | Google Gemini 2.5 Flash avec Google Search grounding |
| **Scraping** | BeautifulSoup4, requests |
| **RSS** | feedparser |
| **Frontend** | Vanilla JS, CSS modulaire (pas de framework) |
| **Config** | python-dotenv (.env) |
| **Serveur prod** | Gunicorn |
| **Automatisation** | Cron (Linux) / Task Scheduler (Windows) |

---

## 5. Points de customisation

C'est la section cle. Chaque parametre ci-dessous peut etre modifie pour creer une newsletter differente.

### 5.1 Sources de contenu

| Option | Description | Fichier a modifier | Valeur par defaut |
|--------|-------------|-------------------|-------------------|
| Gemini News (actualites web) | Activer/desactiver les news via Gemini | `main.py:41` | Active |
| Hacker News | Activer/desactiver HN | `main.py:45` | Active |
| arXiv (papers academiques) | Activer/desactiver arXiv | `main.py:49` | Active |
| Reddit | Ajouter Reddit comme source | `src/collectors/reddit.py` | Placeholder |
| RSS custom | Ajouter des flux RSS personnalises | Creer un nouveau collecteur sur le modele de `arxiv_rss.py` | Non present |
| Categories arXiv | Quelles categories de papers | `src/collectors/arxiv_rss.py:14-17` (liste `RSS_URLS`) | cs.AI, cs.LG |
| Prompt Gemini (sujet) | Sujet des actualites recherchees | `src/collectors/gemini_news.py:31` (variable `prompt`) | "top tech news" |
| Nombre d'articles par source | Combien d'articles par source | `.env` : `MAX_ARTICLES_PER_SOURCE` | 3 |

### 5.2 Modele IA / Resume

| Option | Description | Fichier a modifier | Valeur par defaut |
|--------|-------------|-------------------|-------------------|
| Modele de resume | Quel LLM utiliser pour resumer | `src/summarizers/huggingface_summarizer.py:44` | meta-llama/Llama-3.3-70B-Instruct |
| Fournisseur API | HuggingFace, OpenAI, Anthropic, local... | `src/summarizers/huggingface_summarizer.py:14-17` | HuggingFace (via SDK OpenAI) |
| Prompt de resume | Style et format du resume | `src/summarizers/huggingface_summarizer.py:25-41` | "Summary + Why This Matters" |
| Max tokens | Longueur max du resume | `src/summarizers/huggingface_summarizer.py:52` | 300 |
| Temperature | Creativite du resume | `src/summarizers/huggingface_summarizer.py:53` | 0.7 |
| Longueur contenu source | Combien de texte source envoyer au LLM | `src/summarizers/huggingface_summarizer.py:69-71` | 2500 (content), 2000 (abstract) |

### 5.3 Style visuel

| Option | Description | Fichier a modifier | Valeur par defaut |
|--------|-------------|-------------------|-------------------|
| Gradient header | Couleurs du header | `src/generators/html_generator.py:40` | #667eea -> #764ba2 (violet) |
| Couleur accent | Couleur des titres de section et liens | `src/generators/html_generator.py:63-64` | #667eea |
| Police | Font family | `src/generators/html_generator.py:32` | -apple-system, system fonts |
| Layout | Max-width du body | `src/generators/html_generator.py:33` | 900px |
| Taille images | Hauteur des images articles | `src/generators/html_generator.py:88` | 200px |
| Theme web app (light) | Variables CSS light mode | `webapp/static/css/base.css` | Cyan accent (#06b6d4) |
| Theme web app (dark) | Variables CSS dark mode | `webapp/static/css/base.css` | Bright cyan (#22d3ee) |

### 5.4 Sections & Structure

| Option | Description | Fichier a modifier |
|--------|-------------|-------------------|
| Noms des sections | Titres affiches (ex: "World Tech News") | `src/generators/html_generator.py:247-268` |
| Ordre des sections | Quelle section apparait en premier | `src/generators/html_generator.py:245-269` (ordre des blocs if) |
| Afficher score HN | Montrer les points HN | `src/generators/html_generator.py:258` (show_score=True) |
| Afficher auteurs | Montrer les auteurs (papers) | `src/generators/html_generator.py:267` (show_authors=True) |
| Afficher commentaires | Lien vers commentaires HN | `src/generators/html_generator.py:259` (show_comments=True) |
| Boutons de partage | LinkedIn, Twitter, Copy Link | `src/generators/html_generator.py:354-369` |

### 5.5 Frequence & Automatisation

| Option | Description | Fichier a modifier | Valeur par defaut |
|--------|-------------|-------------------|-------------------|
| Frequence | Quotidienne, hebdomadaire, custom | `install_cron.sh` (CRON_SCHEDULE) | `0 6 * * *` (6h UTC, chaque jour) |
| Heure d'execution | Quand lancer le pipeline | Cron schedule ou Task Scheduler | 6:00 AM UTC |
| Plateforme | Windows / Linux / Cloud | Scripts `run_daily.bat` ou `run_daily.sh` | Les deux disponibles |

### 5.6 Web App & Features Frontend

| Feature | Description | Fichier(s) |
|---------|-------------|------------|
| Dark mode | Toggle light/dark | `webapp/static/js/theme.js` + `webapp/static/css/base.css` |
| Text-to-Speech | Lecture vocale des articles | `webapp/static/js/global-tts.js` |
| Export PDF | Generer un PDF du digest | `webapp/static/js/pdf-export.js` |
| Filtres | Filtrer par date, type, mots-cles | `webapp/static/js/filters.js` + `webapp/static/css/filters.css` |
| Bookmarks | Sauvegarder des articles (localStorage) | `webapp/static/js/saved.js` + `webapp/static/css/saved.css` |
| Partage social | LinkedIn, Twitter, copier lien | `webapp/static/js/share.js` + `webapp/static/css/share.css` |
| Barre de progression | Progression de scroll | `webapp/static/js/progress.js` |
| Table des matieres | Sidebar de navigation | `webapp/static/js/toc.js` + `webapp/static/css/sidebar.css` |
| Boutons flottants | FAB en bas de page | `webapp/static/js/fab.js` |
| Articles similaires | Recommendations | `webapp/static/js/similar-articles.js` |
| Port serveur | Port de la web app | `.env` : `PORT` | 8080 |

### 5.7 Langue

| Option | Description | Fichier a modifier |
|--------|-------------|-------------------|
| Langue des resumes | Langue de sortie du LLM | Modifier le prompt dans `src/summarizers/huggingface_summarizer.py:25` et `src/collectors/gemini_news.py:31` |
| Langue interface | Textes statiques (titres, boutons) | `src/generators/html_generator.py` (titres sections) + `webapp/templates/index.html` |

### 5.8 Format de sortie

| Option | Description | Fichier a modifier |
|--------|-------------|-------------------|
| HTML standalone | Fichier HTML avec CSS inline (defaut) | `src/generators/html_generator.py` |
| Email-ready | Adapter le HTML pour compatibilite email | Modifier `html_generator.py` (inline styles, tables) |
| PDF natif | Generer directement en PDF | Ajouter un generateur dans `src/generators/` |
| Markdown | Generer en markdown | Ajouter un generateur dans `src/generators/` |

### 5.9 Variables d'environnement (.env)

```bash
# REQUIS
GEMINI_API_KEY=<cle-api-google>        # Pour les actualites web
HF_API_KEY=<cle-api-huggingface>       # Pour le resume IA (ou HF_TOKEN)

# OPTIONNEL
MAX_ARTICLES_PER_SOURCE=3              # Nombre d'articles par source
ARCHIVE_DIR=archive                    # Dossier de sortie
PORT=8080                              # Port de la web app
```

---

## 6. Flow de conversation suggere pour le App Builder

Quand un utilisateur choisit "Creer une newsletter" dans le app builder, voici l'arbre de questions recommande :

### Phase 1 : Comprendre le besoin
```
Q1: "Quel est le sujet de ta newsletter ?"
    -> Reponse libre (ex: "tech", "finance", "sante", "IA", "gaming"...)
    -> Impacte : prompt Gemini, categories arXiv, mots-cles HN

Q2: "Qui est ton audience ?"
    -> Options : [Experts techniques, Grand public, Mixte]
    -> Impacte : ton du resume, niveau de detail, jargon

Q3: "En quelle langue ?"
    -> Options : [Francais, Anglais, Autre]
    -> Impacte : prompts LLM, textes interface
```

### Phase 2 : Sources de contenu
```
Q4: "Quelles sources veux-tu inclure ?"
    -> Multi-select : [Actualites web (Gemini), Hacker News, arXiv, RSS custom, Reddit]
    -> Impacte : quels collecteurs activer dans main.py

Q5: (Si arXiv selectionne) "Quelles categories ?"
    -> Multi-select : [cs.AI, cs.LG, cs.CL, cs.CV, stat.ML, ...]
    -> Impacte : RSS_URLS dans arxiv_rss.py

Q6: (Si RSS custom) "Donne-moi les URLs de tes flux RSS"
    -> Reponse libre
    -> Impacte : creer un collecteur RSS custom

Q7: "Combien d'articles par source ?"
    -> Options : [3 (recommande), 5, 10, Custom]
    -> Impacte : MAX_ARTICLES_PER_SOURCE dans .env
```

### Phase 3 : Resume & IA
```
Q8: "Quel style de resume ?"
    -> Options : [Court (2-3 phrases), Detaille (paragraphe + bullet points), Juste les titres]
    -> Impacte : prompt summarizer, max_tokens

Q9: "Quel fournisseur IA pour les resumes ?"
    -> Options : [HuggingFace gratuit (Llama), OpenAI (GPT), Anthropic (Claude), Pas de resume]
    -> Impacte : summarizer module, cles API requises
```

### Phase 4 : Apparence
```
Q10: "Quel style visuel ?"
    -> Options avec preview : [Violet/moderne (defaut), Bleu/corporate, Vert/nature, Sombre/tech, Custom]
    -> Impacte : gradients, couleurs accent dans html_generator.py

Q11: "Nom de ta newsletter ?"
    -> Reponse libre (ex: "Tech Digest", "AI Weekly", "Mon Veille Techno")
    -> Impacte : titre dans html_generator.py header
```

### Phase 5 : Web App & Features
```
Q12: "Veux-tu une web app pour consulter les newsletters ?"
    -> Options : [Oui avec toutes les features, Oui minimaliste, Non (juste les fichiers HTML)]
    -> Impacte : inclure webapp/ ou non

Q13: (Si web app) "Quelles features ?"
    -> Multi-select : [Dark mode, Filtres, TTS, Export PDF, Bookmarks, Partage social, Table des matieres]
    -> Impacte : quels fichiers JS/CSS inclure
```

### Phase 6 : Automatisation
```
Q14: "A quelle frequence generer la newsletter ?"
    -> Options : [Tous les jours, Toutes les semaines (lundi), 2x par semaine, Custom]
    -> Impacte : cron schedule

Q15: "Sur quelle plateforme ?"
    -> Options : [Windows, Linux/Mac, Cloud (GCP/AWS)]
    -> Impacte : scripts de setup et d'execution
```

---

## 7. Mapping questions -> code

Ce tableau montre exactement quoi modifier pour chaque decision utilisateur.

### Sujet / Thematique
| Decision | Action |
|----------|--------|
| Changer le sujet des news | Modifier le `prompt` dans `src/collectors/gemini_news.py:31-58` |
| Changer les categories arXiv | Modifier `RSS_URLS` dans `src/collectors/arxiv_rss.py:14-17` |
| Ajouter une source RSS | Dupliquer `src/collectors/arxiv_rss.py`, changer les URLs, importer dans `main.py` |
| Desactiver une source | Commenter/supprimer l'appel dans `main.py:41-49` et les etapes associees |

### Resume IA
| Decision | Action |
|----------|--------|
| Changer le modele | Modifier `model=` dans `src/summarizers/huggingface_summarizer.py:44` |
| Utiliser OpenAI au lieu de HF | Changer `base_url` et `api_key` dans `huggingface_summarizer.py:14-17` |
| Changer le format de resume | Modifier le `prompt` dans `huggingface_summarizer.py:25-41` |
| Desactiver les resumes | Supprimer l'etape 2 dans `main.py:67-80` |
| Changer la langue des resumes | Ajouter "Reponds en [langue]" au prompt dans `huggingface_summarizer.py:25` et `gemini_news.py:31` |

### Style visuel
| Decision | Action |
|----------|--------|
| Changer le gradient header | Modifier `background: linear-gradient(...)` dans `html_generator.py:40` |
| Changer la couleur accent | Modifier toutes les occurrences de `#667eea` dans `html_generator.py` |
| Changer la police | Modifier `font-family` dans `html_generator.py:32` |
| Changer le nom de la newsletter | Modifier `<h1>Tech Digest</h1>` dans `html_generator.py:239` |

### Structure
| Decision | Action |
|----------|--------|
| Changer les noms de section | Modifier les `title=` dans les appels `generate_section()` dans `html_generator.py:247-268` |
| Changer l'ordre des sections | Reordonner les blocs `if gemini_news` / `if hn_posts` / `if papers` dans `html_generator.py:245-269` |
| Ajouter une nouvelle section | Ajouter un appel `generate_section()` dans `html_generator.py` + un collecteur correspondant |

### Web App
| Decision | Action |
|----------|--------|
| Desactiver une feature JS | Retirer le `<script>` correspondant dans `webapp/templates/index.html` |
| Changer le port | Modifier `PORT` dans `.env` |
| Changer le theme | Modifier les CSS variables dans `webapp/static/css/base.css` |

### Automatisation
| Decision | Action |
|----------|--------|
| Changer la frequence | Modifier `CRON_SCHEDULE` dans `install_cron.sh` ou recreer la tache dans Task Scheduler |
| Deployer sur cloud | Utiliser `tech-digest.service` (systemd) ou adapter pour le provider cloud |

---

## 8. Structure de donnees des articles

Tous les collecteurs produisent des dicts avec cette structure (certains champs sont optionnels selon la source) :

```python
{
    "title": str,           # Obligatoire - titre de l'article
    "url": str,             # Obligatoire - lien vers l'article
    "summary": str,         # Rempli par le summarizer (ou pre-rempli pour Gemini)
    "content": str,         # Texte brut (Hacker News)
    "abstract": str,        # Resume academique (arXiv)
    "image_url": str,       # Ajoutee par fetch_article_images
    "authors": list[str],   # Auteurs (arXiv)
    "published": str,       # Date de publication
    "source": str,          # "Hacker News" / "arXiv" / "Gemini News"
    "score": int,           # Points HN
    "comments_url": str,    # Lien commentaires HN
}
```

Pour ajouter une nouvelle source, le collecteur doit retourner une liste de dicts avec au minimum `title` et `url`. Les autres champs sont optionnels et seront utilises si presents.

---

## 9. Comment ajouter une nouvelle source (guide rapide)

1. Creer `src/collectors/ma_source.py` avec une fonction `fetch_xxx() -> List[Dict]`
2. Retourner des dicts avec au minimum `title`, `url`, et `content` ou `abstract`
3. Importer dans `main.py` et ajouter l'appel dans l'etape 1
4. (Optionnel) Ajouter `add_images_to_articles()` dans l'etape 1.5
5. Ajouter `summarize_articles()` dans l'etape 2 (sauf si deja resume)
6. Ajouter `generate_section()` dans `html_generator.py` etape 3

---

## 10. Dependances Python

```
google-genai          # Client API Gemini
requests              # HTTP
openai                # Client HF (interface OpenAI)
feedparser            # Parsing RSS
flask                 # Web framework
python-dotenv         # Variables d'environnement
python-dateutil       # Parsing dates
jinja2                # Templates HTML
gunicorn              # Serveur WSGI production
beautifulsoup4        # Scraping HTML (images)
```
