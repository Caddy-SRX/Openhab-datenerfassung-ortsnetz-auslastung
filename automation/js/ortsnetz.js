const { rules, triggers, items } = require('openhab');

rules.JSRule({
    name: "Spannungsdaten alle 5 Minuten an Ortsnetz-Auslastung senden",
    description: "Sendet Smartmeter-Daten über das fehlerfreie Node-Hilfsskript an die API",
    triggers: [
        triggers.GenericCronTrigger("0 */5 * ? * *")
    ],
    execute: () => {
        // 1. Pflicht-Items einlesen
        const itemL1 = items.getItem('Smartmeter_L1_Volt');
        const itemL2 = items.getItem('Smartmeter_L2_Volt');
        const itemL3 = items.getItem('Smartmeter_L3_Volt');
        const itemHz = items.getItem('Smartmeter_Frequenz');

        if (itemL1.state === 'NULL' || itemL1.state === 'UNDEF' ||
            itemL2.state === 'NULL' || itemL2.state === 'UNDEF' ||
            itemL3.state === 'NULL' || itemL3.state === 'UNDEF' ||
            itemHz.state === 'NULL' || itemHz.state === 'UNDEF') {
            console.warn("Ortsnetz: Senden abgebrochen, da Pflicht-Sensorwerte ungültig (NULL/UNDEF) sind.");
            return;
        }

        const l1 = itemL1.state;
        const l2 = itemL2.state;
        const l3 = itemL3.state;
        const hz = itemHz.state;

        // Globalen openHAB-Standort ermitteln
        let latitude = "53.1639462";   // Fallback-Wert
        let longitude = "7.335782";   // Fallback-Wert

        try {
            const { osgi } = require('openhab');
            const LocationService = Java.type('org.openhab.core.i18n.LocationProvider');
            const locationService = osgi.getService(LocationService);
            
            if (locationService && locationService.getLocation()) {
                const ohLocation = locationService.getLocation().toString(); // Liefert "lat,lon,alt"
                const coords = ohLocation.split(',');
                if (coords && coords[0] && coords[1]) {
                    latitude = coords[0].trim();
                    longitude = coords[1].trim();
                }
            }
        } catch (e) {
            console.warn("Ortsnetz: Konnte System-Standort nicht auslesen, nutze Default-Koordinaten. Fehler: " + e);
        }

        // 2. Optionale PV-Items einlesen
        let kwp = "1.89";
        let forecast = "";
        
        try {
            const itemKwp = items.getItem('Smartmeter_PV_KWP');
            if (itemKwp && itemKwp.state !== 'NULL' && itemKwp.state !== 'UNDEF' && itemKwp.state !== '0' ) {
                kwp = itemKwp.state;
            }
        } catch (e) {
            // Item existiert nicht -> Bleibt leerer String
        }

        try {
            const itemForecast = items.getItem('Smartmeter_PV_Forecast');
            if (itemForecast && itemForecast.state !== 'NULL' && itemForecast.state !== 'UNDEF' && itemForecast.state !== '0' ) {
                forecast = itemForecast.state;
            }
        } catch (e) {
            // Item existiert nicht -> Bleibt leerer String
        }

        console.info("Ortsnetz: Sende Daten via nativer Linux-Prozess-Pipeline...");

        try {
            // 3. Native Java Prozess-Pipeline
            const ProcessBuilder = java.lang.ProcessBuilder;
            const BufferedReader = java.io.BufferedReader;
            const InputStreamReader = java.io.InputStreamReader;
            const Collectors = java.util.stream.Collectors;

            // Übergibt alle 8 Argumente (Pflicht + Optionale + Standort)
            const pb = new ProcessBuilder([
                "/usr/bin/node", 
                "/srv/openhab-conf/misc/ortsnetz_senden.js", 
                String(l1), String(l2), String(l3), String(hz), 
                String(kwp), String(forecast),
                String(latitude), String(longitude)
            ]);
            
            pb.redirectErrorStream(true);
            const process = pb.start();

            // Liest die Konsolenausgabe des Skripts ein
            const reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            const responseBody = reader.lines().collect(Collectors.joining("\n")).trim();
            process.waitFor();

            // 4. API-Antwort verarbeiten

            if (responseBody && responseBody.includes('{')) {
                console.info("Ortsnetz: API Antwort erfolgreich verarbeitet! Inhalt: " + responseBody);

                const wrapperData = JSON.parse(responseBody);
                const resData = wrapperData.api_reply;       // Die Antwort des Servers
                const debugPayload = wrapperData.debug_payload; // Der gesendete Payload!

                // Schreibt den gesendeten Payload zur Fehleranalyse direkt in dein Item
                if (debugPayload) {
                    items.getItem('Ortsnetz_Debug_Payload').postUpdate(JSON.stringify(debugPayload));
                }

                // Prüfen, ob die API uns erfolgreich Daten geliefert hat (status-Objekt vorhanden)
                if (resData && resData.status) {
                    items.getItem('Ortsnetz_L1_Ampel').postUpdate(resData.status.l1.trim());
                    items.getItem('Ortsnetz_L2_Ampel').postUpdate(resData.status.l2.trim());
                    items.getItem('Ortsnetz_L3_Ampel').postUpdate(resData.status.l3.trim());
                    items.getItem('Ortsnetz_Overall_Ampel').postUpdate(resData.status.overall.trim());
                    items.getItem('Ortsnetz_Speicherladeempfehlung').postUpdate(resData.storage_recommendation.trim();

                    items.getItem('Ortsnetz_API_Status').postUpdate('Erfolgreich');
                    items.getItem("Ortsnetz_API_Timestamp").postUpdate(time.ZonedDateTime.now().toString());

                }
                // Fallback, wenn der Server mit einem Fehler-JSON antwortet (z.B. location is blocked)
                else if (resData && resData.detail) {
                    console.warn("Ortsnetz: API hat die Anfrage abgewiesen. Grund: " + resData.detail);
                    items.getItem('Ortsnetz_API_Status').postUpdate('Blockiert: ' + resData.detail);
                    items.getItem("Ortsnetz_API_Timestamp").postUpdate(time.ZonedDateTime.now().toString());

                    // Optionale Bereinigung der Ampel-Items im Fehlerfall
                    items.getItem('Ortsnetz_Overall_Ampel').postUpdate('UNKNOWN');
                } else {
                    console.error("Ortsnetz: Unbekanntes JSON-Format von API erhalten: " + JSON.stringify(resData));
                    items.getItem('Ortsnetz_API_Status').postUpdate('Fehler');
                    items.getItem("Ortsnetz_API_Timestamp").postUpdate(time.ZonedDateTime.now().toString());

                }

            } else {
                console.error("Ortsnetz: Unerwartete Konsolenausgabe: " + responseBody);
                items.getItem('Ortsnetz_API_Status').postUpdate('Fehler');
                items.getItem("Ortsnetz_API_Timestamp").postUpdate(time.ZonedDateTime.now().toString());

            }
        } catch (error) {
            console.error("Ortsnetz: Fehler in der Prozess-Pipeline: " + error);
            items.getItem('Ortsnetz_API_Status').postUpdate('Systemfehler');

            items.getItem("Ortsnetz_API_Timestamp").postUpdate(time.ZonedDateTime.now().toString());

        }
    }
});

