# Intelligence des Donnees

## REGLE 1 — JAMAIS d'identifiants bruts

INTERDIT d'utiliser des colonnes ID (order_id, product_id, transaction_id, customer_id, invoice_id, etc.) comme:
- Axe X ou Y d'un graphique
- Colonne principale d'un tableau
- Label dans un PieChart
- Categorie dans un BarChart

Si les donnees ont une colonne ID ET une colonne nom/label associee (ex: product_id + product_name), utiliser TOUJOURS le nom.
Si les donnees n'ont QUE des IDs sans noms, regrouper par une autre dimension (categorie, region, date, type, statut).

## REGLE 2 — Toujours agreger les donnees

Les dashboards montrent des SYNTHESES, pas des enregistrements individuels.

INTERDIT:
- Afficher un tableau de commandes individuelles (order_id, date, amount)
- Afficher des transactions une par une
- Lister des lignes de facture brutes

OBLIGATOIRE:
- Agreger par dimension significative: categorie, region, produit, periode, statut, client
- Exemples corrects: "CA par categorie", "Ventes par region", "Top 10 produits par revenue"
- Exemples INTERDITS: "Liste des commandes", "Toutes les transactions", "Detail des factures"

## REGLE 3 — Tableaux = Top N agrege

Les tableaux dans un dashboard montrent des CLASSEMENTS ou RESUMES:
- Top 10-15 lignes maximum (pas de dump de 500 lignes)
- Tries par la metrique la plus pertinente (montant decroissant, quantite, etc.)
- Colonnes significatives: nom/label, metrique principale, metrique secondaire, variation si disponible
- EXCLURE les colonnes ID des tableaux (sauf si c'est la seule identification possible)
- Formater les nombres avec fmt()/fmtCur() dans les tableaux aussi
- Titre descriptif: "Top 10 produits par chiffre d'affaires", pas "Donnees"

## REGLE 4 — Graphiques significatifs

Chaque graphique doit repondre a une QUESTION BUSINESS:
- "Comment le CA evolue-t-il dans le temps?" → AreaChart/LineChart par periode
- "Quelle est la repartition par categorie?" → PieChart (max 6) ou BarChart
- "Quels sont les meilleurs produits?" → BarChart horizontal, top 10

Regrouper les categories < 3% du total dans "Autres".

## REGLE 5 — Priorite des dimensions

Quand les donnees ont plusieurs colonnes, privilegier dans cet ordre:
1. Nom/label (product_name, customer_name, category_name)
2. Categorie/type (category, type, segment, status)
3. Localisation (region, ville, pays)
4. Periode (date, mois, trimestre, annee)
5. En dernier recours seulement: identifiant (ID)
