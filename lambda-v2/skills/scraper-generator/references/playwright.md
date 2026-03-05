# Playwright — Anti-Detection, Pagination, Delais

## Setup navigateur (async)

```python
from playwright.async_api import async_playwright

async def create_browser(config):
    pw = await async_playwright().start()
    browser = await pw.chromium.launch(
        headless=config.get("headless", False),
    )
    context = await browser.new_context(
        user_agent=config.get("user_agent", "Mozilla/5.0 ..."),
        viewport={"width": 1920, "height": 1080},
        locale="fr-FR",
    )
    # Masquer le webdriver
    await context.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    """)
    page = await context.new_page()
    return pw, browser, page
```

## Anti-detection

### Masquer le webdriver (obligatoire)
```python
await context.add_init_script("""
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
""")
```

### User-Agent realiste (obligatoire)
Toujours utiliser un User-Agent Chrome/Windows recents. Ne jamais utiliser le User-Agent par defaut de Playwright.

### headless=False pour sites proteges
Si le site utilise Cloudflare, DataDome, Akamai ou autre protection JS :
- `headless=False` obligatoire
- Delais plus longs (8-15s)
- Attente des challenges JS via `page.wait_for_load_state("networkidle")`

### headless=True pour sites simples
Si pas de protection active, `headless=True` suffit et est plus rapide.

## Delais entre pages

```python
import asyncio
import random

# Delai standard (2-5s)
await asyncio.sleep(random.uniform(2, 5))

# Delai site protege (8-15s)
await asyncio.sleep(random.uniform(8, 15))
```

**Regles :**
- TOUJOURS attendre entre chaque page
- Sites proteges (Cloudflare) : 8-15s minimum
- Sites simples : 2-5s
- Ajouter un delai entre chaque categorie (2-3s)
- Varier les delais avec `random.uniform()` pour paraitre humain

## Pagination

### Pattern standard
```python
async def scrape_paginated(page, base_url, delay=3):
    all_products = []
    page_num = 1

    while True:
        # Construire l'URL de pagination
        separator = "&" if "?" in base_url else "?"
        url = f"{base_url}{separator}page={page_num}" if page_num > 1 else base_url

        await page.goto(url, wait_until="domcontentloaded")
        await asyncio.sleep(delay)

        # Extraire les produits de la page
        products = await extract_products(page)

        # Si 0 produits -> fin de pagination
        if not products:
            break

        all_products.extend(products)
        print(f"  Page {page_num}: {len(products)} produits (total: {len(all_products)})")
        page_num += 1

    return all_products
```

**Regles de pagination :**
- Detecter la fin par l'absence de produits (0 resultats), PAS par un compteur fixe
- Certains sites retournent des pages vides avant la fin reelle (pages fantomes) — gerer gracieusement
- Le parametre de pagination varie : `?page=N`, `?p=N`, `&page=N`, etc. — adapter selon le site

## Gestion des cookies/popups

```python
# Accepter les cookies (exemple Didomi)
try:
    cookie_btn = page.locator("#didomi-notice-agree-button")
    if await cookie_btn.is_visible(timeout=3000):
        await cookie_btn.click()
        await asyncio.sleep(1)
except:
    pass  # Pas de bandeau cookies, continuer
```

## Gestion d'erreurs par page

```python
async def safe_scrape_page(page, url, delay):
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(delay)
        return await extract_products(page)
    except Exception as e:
        print(f"[ERROR] Page {url}: {e}")
        return []  # Ne PAS arreter le scraping
```

**Regle critique** : une page qui echoue ne doit JAMAIS arreter le scraping global. Logger l'erreur et continuer.

## Fermeture propre

```python
async def cleanup(pw, browser):
    try:
        await browser.close()
        await pw.stop()
    except:
        pass
```
