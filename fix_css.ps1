Set-Location "C:\Users\lojoc\AppData\Local\FoundryVTT\Data\systems\agone"
$css = [System.IO.File]::ReadAllText("css\agone.css", [System.Text.Encoding]::UTF8)

# 1. Trouver les positions
$idx1     = $css.IndexOf("Navigateur de Sorts")
$idx2     = $css.IndexOf("Navigateur de Sorts", $idx1 + 50)
$dupStart = $css.LastIndexOf("`n`n", $idx2)

# Avantages - chercher "Avantages / D" et remonter jusqu'au debut de la ligne
$idxAvantagesWord = $css.IndexOf("Avantages / D")
$idxAvantages = $css.LastIndexOf("`n", $idxAvantagesWord) + 1

Write-Host "dupStart=$dupStart  idxAvantages=$idxAvantages"

Write-Host "idx1=$idx1  idx2=$idx2  dupStart=$dupStart  idxAvantages=$idxAvantages"

# 2. Construire new CSS
$part1 = $css.Substring(0, $dupStart)
$part3 = $css.Substring($idxAvantages)

$newChipCss = @'

/* ── Chips de type & filtres avancés ─────────────────────── */
.sorts-browser .sb-type-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding-top: 6px;
}
.sorts-browser .sb-type-chip {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.3);
  color: var(--agone-parchment);
  border-radius: 12px;
  padding: 2px 10px;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.15s;
  line-height: 1.6;
}
.sorts-browser .sb-type-chip.active {
  background: var(--agone-gold);
  color: var(--agone-dark-text, #2a1a08);
  border-color: var(--agone-gold);
}
.sorts-browser .sb-filter-row2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--agone-parchment);
}
.sorts-browser .sb-seuil-max {
  width: 52px;
  background: rgba(255,255,255,0.12) !important;
  border: 1px solid rgba(255,255,255,0.2) !important;
  color: var(--agone-parchment) !important;
  box-shadow: none !important;
  border-radius: var(--radius, 4px);
  padding: 3px 6px;
  font-size: 12px;
  text-align: center;
}
.sorts-browser .sb-possede-filter {
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.2);
  color: var(--agone-parchment);
  border-radius: var(--radius, 4px);
  padding: 3px 8px;
  font-size: 12px;
  cursor: pointer;
}
.sorts-browser .sb-possede-filter option { background: #3a2010; }

/* ── Danseurs ────────────────────────────────────────────── */
.agone .danseurs-block { margin-top: 16px; }
.agone .danseur-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  background: rgba(92,58,30,0.05);
  border-radius: var(--radius);
  font-size: 13px;
  margin-bottom: 3px;
}
.agone .danseur-nom { font-weight: 600; flex: 1; min-width: 80px; }
.agone .danseur-stat {
  font-size: 12px;
  color: var(--agone-brown);
  white-space: nowrap;
}
.agone .danseur-roll-btn {
  background: var(--agone-brown);
  border: 1px solid var(--agone-gold);
  color: var(--agone-parchment);
  border-radius: var(--radius, 4px);
  padding: 2px 8px;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}
.agone .danseur-roll-btn:hover {
  background: var(--agone-gold);
  color: var(--agone-dark-text, #2a1a08);
}

/* ── Mini-filtre sorts ───────────────────────────────────── */
.agone .sorts-mini-filter {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
  padding: 5px 8px;
  background: rgba(92,58,30,0.06);
  border-radius: var(--radius);
  border: 1px solid rgba(93,58,30,0.2);
}
.agone .smf-search-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(92,58,30,0.08);
  border: 1px solid rgba(93,58,30,0.2);
  border-radius: var(--radius);
  padding: 2px 8px;
}
.agone .smf-search-wrap i { opacity: 0.5; font-size: 11px; }
.agone .smf-search {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  outline: none;
  font-size: 12px;
  padding: 2px 0;
  width: 120px;
}
.agone .smf-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.agone .smf-chip {
  background: rgba(92,58,30,0.1);
  border: 1px solid rgba(93,58,30,0.3);
  color: var(--color-text-dark-primary, #333);
  border-radius: 10px;
  padding: 1px 9px;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.15s;
}
.agone .smf-chip.active {
  background: var(--agone-brown);
  color: var(--agone-parchment);
  border-color: var(--agone-brown);
}

'@

$newCss = $part1 + $newChipCss + $part3

# 3. Corriger .sb-search (unique maintenant dans la premiere partie)
$oldSearch = ".sorts-browser .sb-search {
  border: none;
  background: transparent;
  color: var(--agone-parchment);
  font-size: 13px;
  padding: 4px 0;
  flex: 1;
  outline: none;
}"
$newSearch = ".sorts-browser .sb-search {
  border: none !important;
  background: transparent !important;
  color: var(--agone-parchment) !important;
  box-shadow: none !important;
  font-size: 13px;
  padding: 4px 0;
  flex: 1 1 auto;
  min-width: 0;
  outline: none;
}"
$newCss = $newCss.Replace($oldSearch, $newSearch)

# 4. Ecrire
[System.IO.File]::WriteAllText("css\agone.css", $newCss, [System.Text.Encoding]::UTF8)
$finalLen = [System.IO.File]::ReadAllText("css\agone.css").Length
Write-Host "Done. New length: $finalLen  (was 36442)"

