# Selecteurs CSS — Patterns Courants

## E-commerce (produits)

### PrestaShop
```css
/* Conteneur produit */
.product-miniature
.product-miniature .product-thumbnail img

/* Infos produit */
.product-miniature .product-manu        /* marque */
.product-miniature .product-name        /* nom */
.product-miniature .price               /* prix actuel */
.product-miniature .regular-price       /* prix barre (ancien prix) */

/* Pagination */
.pagination .next                       /* bouton page suivante */
```

### Magento / Adobe Commerce
```css
/* Conteneur produit */
.product-item
.product-item .product-image-photo

/* Infos produit */
.product-item .product-item-brand       /* marque */
.product-item .product-item-link        /* nom + lien */
.product-item .special-price .price     /* prix promo */
.product-item .old-price .price         /* ancien prix */
.product-item .normal-price .price      /* prix normal */

/* Pagination */
.pages .next                            /* page suivante */
```

### Shopify
```css
/* Conteneur produit */
.product-card, .grid__item
.product-card__image img

/* Infos produit */
.product-card__title, .product-card__name
.product-card__price .money
.product-card__price .price--compare     /* prix barre */
.product-card__vendor                    /* marque */
```

### WooCommerce
```css
/* Conteneur produit */
.product, .type-product
.product .attachment-woocommerce_thumbnail

/* Infos produit */
.woocommerce-loop-product__title
.product .price ins .amount              /* prix promo */
.product .price del .amount              /* ancien prix */
.product .price > .amount                /* prix normal */
```

## Extraction avec Playwright

### Pattern standard
```python
async def extract_products(page, selectors):
    items = await page.query_selector_all(selectors["container"])
    products = []

    for item in items:
        try:
            brand_el = await item.query_selector(selectors.get("brand", ""))
            name_el = await item.query_selector(selectors["name"])
            price_el = await item.query_selector(selectors["price"])
            old_price_el = await item.query_selector(selectors.get("old_price", ""))
            link_el = await item.query_selector(selectors.get("link", "a"))

            name = await name_el.inner_text() if name_el else ""
            brand = await brand_el.inner_text() if brand_el else ""
            price_text = await price_el.inner_text() if price_el else "0"
            old_price_text = await old_price_el.inner_text() if old_price_el else None
            url = await link_el.get_attribute("href") if link_el else ""

            products.append({
                "marque": brand.strip(),
                "nom_produit": name.strip(),
                "prix_actuel": parse_price(price_text),
                "prix_barre": parse_price(old_price_text) if old_price_text else None,
                "url_produit": url.strip(),
            })
        except Exception as e:
            print(f"[WARN] Produit ignore: {e}")
            continue

    return products
```

### Fonction parse_price
```python
import re

def parse_price(text):
    """Extrait un float depuis un texte de prix ('29,99 EUR' -> 29.99)."""
    if not text:
        return 0.0
    cleaned = re.sub(r"[^\d,.]", "", text.strip())
    cleaned = cleaned.replace(",", ".")
    try:
        return float(cleaned)
    except ValueError:
        return 0.0
```

## Annuaires / Listings

```css
/* Resultats de recherche generiques */
.search-result, .listing-item, .result-card
.listing-item .title a
.listing-item .description
.listing-item .address, .listing-item .location
.listing-item .phone, .listing-item .tel
.listing-item .rating, .listing-item .stars
```

## Conseils

1. **Inspecter d'abord** : toujours analyser le HTML du site cible avant d'ecrire les selecteurs
2. **Privilegier les classes CSS** : plus stables que les selecteurs positionnels (nth-child, etc.)
3. **Fallback** : prevoir des selecteurs alternatifs si le premier echoue
4. **data-* attributs** : souvent plus stables que les classes (`[data-product-id]`, `[data-price]`)
5. **Tester avec page.query_selector_all** : verifier le nombre de resultats avant d'iterer
