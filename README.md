# Openhab-datenerfassung-ortsnetz-auslastung
Script zur Datenübermittlung aus Openhab ab Version 4  für das Projekt https://github.com/thomaslehmann1234/datenerfassung-ortsnetz-auslastung

Dieses Projekt ermöglicht die automatische Erfassung von Spannungsdaten deines Smartmeters in openHAB und sendet diese zyklisch an das Ortsnetz-Auslastungs-Monitoring. Das integrierte Installations-Skript übernimmt die Einrichtung aller Dateien sowie das automatische Rechtemanagement.

## 📋 Voraussetzungen

Bevor du das Skript installierst, stelle bitte sicher, dass die JavaScript-Unterstützung in openHAB aktiv ist:
1. Öffne deine **openHAB MainUI** im Browser.
2. Navigiere zu **Einstellungen** ➔ **Automation**.
3. Installiere dort das Add-on **JavaScript Scripting (GraalVM)**.
4. Prüfe, ob bei Dir JSONPath installiert ist, dieses wird benötigt
---

## 🚀 Automatische Installation

Du kannst alle benötigten JS-Rules, Items und Hilfsskripte mit einem einzigen Befehl auf deinem openHAB-Server (z. B. Raspberry Pi via SSH) installieren. 

Führe dazu einfach diesen Befehl aus:

```bash
wget -qO- https://githubusercontent.com | sudo bash
```

---

## ⚙️ Nachbereitung & Konfiguration

Das Skript legt alle Dateien an den korrekten Orten ab, setzt die Besitzrechte auf `openhab:openhab` und macht die JavaScript-Dateien ausführbar. Bitte prüfe im Anschluss folgende Punkte:

### 1️⃣ Items anpassen
Falls du bereits eigene Smartmeter-Items in openHAB verwendest, öffne die neu angelegte Datei:
📂 `/etc/openhab/items/ortsnetz.items`

Kommentiere dort die folgenden vier Standard-Items aus (setze `//` an den Zeilenanfang), wenn sie mit deinen bestehenden Items kollidieren:
* `Smartmeter_L1_Volt`
* `Smartmeter_L2_Volt`
* `Smartmeter_L3_Volt`
* `Smartmeter_Frequenz`

### 2️⃣ JS-Datei kontrollieren
Falls du deine eigenen Items im ersten Schritt auskommentiert hast, öffne die Regel-Datei:
📂 `/etc/openhab/automation/js/ortsnetz.js`

Passe dort die Item-Namen im Code an, damit das Skript deine echten, bereits vorhandenen Smartmeter-Kanäle anspricht.

### 3️⃣ Regel in der GUI prüfen
Öffne deine **openHAB MainUI** im Browser und gehe zu **Einstellungen** ➔ **Rules (Regeln)**. Dort findest du nun die aktivierte Regel:
👉 *„Spannungsdaten alle 5 Minuten an Ortsnetz-Auslastung senden“*

---

## 📄 Lizenz

Dieses Projekt ist unter der **MIT-Lizenz** lizenziert. Du kannst den Code frei verwenden, modifizieren und teilen.

