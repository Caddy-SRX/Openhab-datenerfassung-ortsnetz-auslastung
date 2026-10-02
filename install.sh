#!/bin/bash

# 1. Sicherstellen, dass das Skript als root/sudo ausgeführt wird
if [ "$EUID" -ne 0 ]; then
  echo "❌ Fehler: Bitte führe dieses Skript mit sudo aus: sudo bash install.sh"
  exit 1
fi


BASE_URL="https://github.com/Caddy-SRX/Openhab-datenerfassung-ortsnetz-auslastung/releases/download/v0.2.3"

# 2. openHAB-Verzeichnis ermitteln
if [ -d "/srv/openhab-conf" ]; then
  OH_CONF="/srv/openhab-conf"
else
  OH_CONF="/etc/openhab"
fi

echo "==========================================="
echo "  Starte Installation & Systemprüfung...   "
echo "  Zielverzeichnis: $OH_CONF"
echo "==========================================="

# 3. VORAUSSETZUNGEN PRÜFEN
echo -n "Prüfe auf JS/Node.js-Unterstützung... "
if command -v node >/dev/null 2>&1; then
  NODE_VERSION=$(node -v)
  echo "✅ Gefunden ($NODE_VERSION)"
else
  echo "❌ Nicht gefunden!"
  echo "Bitte installiere zuerst das 'JavaScript Scripting (GraalVM)' Add-on in openHAB."
  exit 1
fi

echo -n "Prüfe auf Regex-Unterstützung (grep)... "
if command -v grep >/dev/null 2>&1; then
  echo "✅ Gefunden"
else
  echo "❌ Nicht gefunden!"
  exit 1
fi

echo "-------------------------------------------"
echo "Systemprüfung erfolgreich. Starte Download..."

# 4. VERZEICHNISSE AUF DEM SERVER ERSTELLEN
mkdir -p "$OH_CONF/automation/js"
mkdir -p "$OH_CONF/items"
mkdir -p "$OH_CONF/misc"

# Hilfsfunktion für sicheren Download
download_with_backup() {
  local ziel_pfad="$1"
  local raw_url="$2"

  if [ -f "$ziel_pfad" ]; then
    local backup_pfad="${ziel_pfad}.bak_$(date +%Y%m%d_%H%M%S)"
    echo "⚠️  Bestehende Datei gefunden. Erstelle Backup: $backup_pfad"
    mv "$ziel_pfad" "$backup_pfad"
  fi

  wget -q -O "$ziel_pfad" "$raw_url"
  
  if [ $? -eq 0 ]; then
    chown openhab:openhab "$ziel_pfad"
    if [[ "$ziel_pfad" == *".js" ]]; then
      chmod +x "$ziel_pfad"
    fi
    echo "✅ Erfolgreich installiert: $ziel_pfad"
  else
    echo "❌ Fehler beim Herunterladen von: $raw_url"
    exit 1
  fi
}

# 5. DATEIEN LADEN (Liegen alle flach auf GitHub, werden aber richtig einsortiert!)
download_with_backup "$OH_CONF/items/ortsnetz.items" "$BASE_URL/ortsnetz.items"
download_with_backup "$OH_CONF/automation/js/ortsnetz.js" "$BASE_URL/ortsnetz.js"
download_with_backup "$OH_CONF/misc/ortsnetz_senden.js" "$BASE_URL/ortsnetz_senden.js"

echo "========================================================================"
echo "🎉 INSTALLATION ERFOLGREICH ABGESCHLOSSEN!"
echo "========================================================================"
echo ""
echo "Bitte führe nun folgende Schritte zur Konfiguration durch:"
echo ""
echo "1️⃣  ITEMS ANPASSEN (WICHTIG):"
echo "   Falls du bereits eigene Smartmeter-Items verwendest, öffne die Datei:"
echo "   👉 $OH_CONF/items/ortsnetz.items"
echo ""
echo "   Kommentiere dort die folgenden vier Standard-Items aus (mit // am Zeilenanfang),"
echo "   falls diese mit deinen bestehenden Items kollidieren:"
echo "   • Smartmeter_L1_Volt"
echo "   • Smartmeter_L2_Volt"
echo "   • Smartmeter_L3_Volt"
echo "   • Smartmeter_Frequenz"
echo ""
echo "2️⃣  RULE PRÜFEN (OPENHAB GUI):"
echo "   • Öffne deine openHAB MainUI im Browser."
echo "   • Gehe zu: Einstellungen -> Rules (Regeln)."
echo "   • Dort findest du nun die neue Regel:"
echo "     »Spannungsdaten alle 5 Minuten an Ortsnetz-Auslastung senden«"
echo ""
echo "3️⃣  JS-DATEI KONTROLLIEREN:"
echo "   • Falls du deine eigenen Items in Schritt 1 auskommentiert hast, öffne:"
echo "     👉 $OH_CONF/automation/js/ortsnetz.js"
echo "   • Passe dort die Item-Namen an, damit das Skript deine echten"
echo "     Smartmeter-Kanäle anspricht."
echo ""
echo "========================================================================"

