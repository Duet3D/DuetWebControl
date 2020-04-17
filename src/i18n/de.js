export default {
	language: 'Deutsch',
	'$vuetify': {
		badge: 'Abzeichen',
		close: 'Schließen',
		dataIterator: {
			noResultsText: 'Keine Elemente gefunden',
			loadingText: 'Lade Elemente...',
		},
		dataTable: {
			itemsPerPageText: 'Zeilen pro Seite:',
			ariaLabel: {
				sortDescending: 'Absteigend sortiert.',
				sortAscending: 'Aufsteigend sortiert.',
				sortNone: 'Nicht sortiert.',
				activateNone: 'Aktivieren um Sortierung zu entfernen.',
				activateDescending: 'Aktivieren um absteigend zu sortieren.',
				activateAscending: 'Aktivieren um aufsteigend zu sortieren.',
			},
			sortBy: 'Sortiere nach',
		},
		dataFooter: {
			itemsPerPageText: 'Elemente pro Seite:',
			itemsPerPageAll: 'Alle',
			nextPage: 'Nächste Seite',
			prevPage: 'Vorherige Seite',
			firstPage: 'Erste Seite',
			lastPage: 'Letzte Seite',
			pageText: '{0}-{1} von {2}',
		},
		datePicker: {
			itemsSelected: '{0} ausgewählt',
		},
		noDataText: 'Keine Daten vorhanden',
		carousel: {
			prev: 'Vorheriges Bild',
			next: 'Nächstes Bild',
			ariaLabel: {
				delimiter: 'Element {0} von {1}',
			},
		},
		calendar: {
			moreEvents: '{0} mehr',
		},
		fileInput: {
			counter: '{0} Dateien',
			counterSize: '{0} Dateien ({1} gesamt)',
		},
		timePicker: {
			am: 'AM',
			pm: 'PM',
		},
	},
	button: {
		add: {
			caption: 'Hinzufügen'
		},
		connect: {
			connect: 'Verbinden',
			connecting: 'Verbinde...',
			disconnect: 'Trennen',
			disconnecting: 'Trenne...'
		},
		emergencyStop: {
			caption: 'NOT-AUS',
			title: 'Erzwingt einen sofortingen Softwarereset (M112+M999)'
		},
		home: {
			caption: 'Referenziere {0}',
			captionAll: 'Alle Referenzieren',
			title: 'Referenziere die {0}-Achse (G28 {0})',
			titleAll: 'Alle Achsen referenzieren (G28)'
		},
		newDirectory: {
			caption: 'Neues Verzeichnis'
		},
		newFilament: {
			caption: 'Neues Filament'
		},
		newFile: {
			caption: 'Neue Datei'
		},
		refresh: {
			caption: 'Aktualisieren'
		},
		reset: {
			caption: 'Maschine zurücksetzen',
			title: 'M999 an die Maschine senden um sie zurückzusetzen'
		},
		upload: {
			gcodes: {
				caption: 'G-Code-Datei(en) Hochladen',
				title: 'Eine oder mehr G-Code-Dateien hochladen (Drag&Drop wird ebenfalls unterstützt)'
			},
			start: {
				caption: 'Hochladen & Starten',
				title: 'Eine G-Code-Datei hochladen und starten (Drag&Drop wird ebenfalls unterstützt)'
			},
			macros: {
				caption: 'Makro(s) Hochladen',
				title: 'Eine oder mehr Makrodateien hochladen (Drag&Drop wird ebenfalls unterstützt)'
			},
			filaments: {
				caption: 'Filamentkonfiguration Hochladen',
                title: 'Eine oder mehr Filamentkonfigurationen hochladen (Drag&Drop wird ebenfalls unterstützt)'
			},
			menu: {
				caption: 'Menüdatei(en) hochladen',
				title: 'Eine oder mehr Menüdateien hochladen (Drag&Drop wird ebenfalls unterstützt)'
			},
			system: {
				caption: 'Systemdatei(en) hochladen',
                title: 'Eine oder mehr Systemdateien hochladen (Drag&Drop wird ebenfalls unterstützt)'
			},
			web: {
				caption: 'Webdatei(en) hochladen',
                title: 'Eine oder mehr Webdateien hochladen (Drag&Drop wird ebenfalls unterstützt)'
			},
			update: {
				caption: 'Update(s) hochladen',
                title: 'Ein oder mehr Updates hochladen und installieren (Drag&Drop wird ebenfalls unterstützt)'
			}
		}
	},
	chart: {
		layer: {
            caption: 'Statistik der Druckschichten',
			layerTime: 'Schichtdauer',

			showLastLayers: 'Letzte {0} Schichten anzeigen',
			showAllLayers: 'Alle Schichten anzeigen',

			layer: 'Schicht {0}',
			layerDuration: 'Dauer: {0}',
			layerHeight: 'Schichtdicke: {0}',
			filamentUsage: 'Filamentverbrauch: {0}',
			fractionPrinted: 'Dateifortschritt: {0}'
		},
		temperature: {
			caption: 'Temperaturdiagramm',
			heater: 'Heizer {0}',
			noData: 'Keine Daten'
		}
	},
	dialog: {
		changeMoveStep: {
			title: 'Bewegungsschritt ändern',
			prompt: 'Bitte geben Sie einen neuen Wert für den angeklickten Bewegungsbutton ein:'
		},
		configUpdated: {
			title: 'Board neu starten?',
			prompt: 'Möchten Sie das Board neu starten um die aktualisierte Konfiguration zu übernehmen?'
		},
		connect: {
			title: 'Zu Maschine verbinden',
			prompt: 'Bitte geben Sie den Hostnamen und das Passwort der Maschine ein, zu der Sie verbinden möchten:',
			hostPlaceholder: 'Hostname',
			hostRequired: 'Hostname ist erforderlich',
			passwordPlaceholderOptional: 'Passwort (optional)',
			passwordPlaceholder: 'Passwort',
			passwordRequired: 'Passwort ist erforderlich',
			connect: 'Verbinden'
		},
		connection: {
			connecting: 'Verbinde...',
			disconnecting: 'Trenne...',
			updating: 'Bitte warten Sie während Updates installiert werden...',
			reconnecting: 'Verbindung verloren, versuche erneut zu verbinden...',
			standBy: 'Bitte warten...'
		},
		editExtrusionAmount: {
			title: 'Extrusionsmenge bearbeiten',
			prompt: 'Bitte geben Sie eine neue Menge für den angeklickten Button ein:'
		},
		editExtrusionFeedrate: {
			title: 'Extrusionsgeschwindigkeit bearbeiten',
			prompt: 'Bitte geben Sie eine neue Vorschubrate für den angeklickten Button ein:'
		},
		factoryReset: {
			title: 'Auf Werkseinstellungen zurücksetzen?',
			prompt: 'Sind Sie sicher, dass sie einen Reset auf Werkseinstellungen durchführen möchten? Alle gespeicherten Einstellungen gehen dabei verloren.'
		},
		filament: {
			titleChange: 'Filament ändern',
			titleLoad: 'Filament laden',
			prompt: 'Bitte wählen Sie ein Filament:'
		},
		fileEdit: {
			gcodeReference: 'G-Code-Referenz',
			menuReference: 'Menüreference',
			save: 'Speichern',
			confirmClose: 'Die Datei wurde geändert. Wenn Sie fortfahren gehen Ihre Änderungen verloren.'
		},
		meshEdit: {
            title: 'Gitterparameter ändern',
			radius: 'Messradius',
			spacing: 'Abstand',
			startCoordinate: 'Startkoordinate in {0}-Richtung',
			endCoordinate: 'Endkoordinate in {0}-Richtung',
			spacingDirection: 'Abstand in {0}-Richtung'
		},
		newDirectory: {
			title: 'Neues Verzeichnis',
			prompt: 'Bitte geben Sie einen neuen Verzeichnisnamen ein:'
		},
		newFilament: {
			title: 'Neues Filament',
			prompt: 'Bitte geben Sie einen Namen füra das neue Filament ein:'
		},
		newFile: {
			title: 'Neue Datei',
			prompt: 'Bitte geben Sie einen Dateinamen ein:'
		},
		renameFile: {
			title: 'Datei oder Verzeichnis umbennenen',
			prompt: 'Bitte geben Sie einen neuen Namen ein:'
		},
		resetHeaterFault: {
			title: 'Heizerfehler zurücksetzen',
			prompt: 'Ein Fehler ist bei der Steuerung von Heizer {0} aufgetreten. Es wird dringend empfohlen Ihre Maschine auszuschalten und die Verkabelung zu prüfen bevor Sie fortfahren. Wenn Sie absolut sicher sind, dass es sich dabei um kein physikalisches Problem handelt können sie den Fehler AUF EIGENE GEFAHR zurücksetzen. Dies ist NICHT EMPFOHLEN und kann zu weiteren Problemen führen. Wie möchten Sie fortfahren?',
			resetFault: 'Fehler zurücksetzen'
		},
		runMacro: {
			title: '{0} starten',
			prompt: 'Möchten Sie {0} starten?'
		},
		startJob: {
			title: '{0} starten',
			prompt: 'Möchten Sie {0} starten?'
		},
		update: {
			title: 'Updates installieren?',
			prompt: 'Sie haben gerade mindestens ein Firmwareupdate hochgeladen. Möchten Sie diese jetzt installieren?'
		},
		inputRequired: 'Bitte Wert eingeben',
		numberRequired: 'Bitte gültige Zahl eingeben'
	},
	directory: {
		menu: 'Menüverzeichnis',
		filaments: 'Filamentverzeichnis',
		gcodes: 'G-Code-Verzeichnis',
		macros: 'Makroverzeichnis',
		system: 'Systemverzeichnis',
		web: 'WWW-Verzeichnis'
	},
	error: {
		notImplemented: '{0} ist nicht implementiert',
		invalidPassword: 'Ungültiges Passwort!',
		noFreeSession: 'Keine weiteren freien Sitzungen!',
		connect: 'Konnte nicht zu {0} verbinden',
		disconnect: 'Konnte die Verbindung zu {0} nicht sauber trennen',
		disconnected: 'Konnte die Aktion nicht beenden weil die Verbindung getrennt worden ist',
		cancelled: 'Operation wurde abgebrochen',
		network: 'Netzwerkfehler',
		timeout: 'Zeitüberschreitung bei HTTP-Anfrage',
		driveUnmounted: 'Ziellaufwerk ist nicht eingebunden',
		directoryNotFound: 'Verzeichnis {0} nicht gefunden',
		fileNotFound: 'Datei {0} nicht gefunden',
		invalidHeightmap: 'Ungültige Höhenkarte',
		operationFailed: 'Operation fehlgeschlagen (Grund: {0})',
		uploadStartWrongFileCount: 'Nur eine einzige Datei kann hochgeladen und gestartet werden',
		uploadNoSingleZIP: 'Es kann nur eine einzige ZIP-Datei auf einmal hochgeladen werden',
		uploadNoFiles: 'Dieses ZIP enthält keine brauchbaren Dateien',
		uploadDecompressionFailed: 'Konnte ZIP-Datei nicht entpacken',
		codeResponse: 'Konnte Code nicht ausführen weil eine ungültige Antwort empfangen wurde',
		codeBuffer: 'Konnte Code nicht ausführen weil der Pufferplatz aufgebraucht ist',
		enterValidNumber: 'Bitte geben Sie eine gültige Zahl ein',
		turnOffEverythingFailed: 'Konnte nicht alles abschalten',
		filelistRequestFailed: 'Konnte Dateilist nicht abfragen',
		fileinfoRequestFailed: 'Konnte Dateiinfo für {0} nicht abfragen',
		filamentsLoadFailed: 'Konnte Filamente nicht laden',
		move: 'Konnte Datei {0} nicht nach {1} verschieben'
	},
	events: {
		connected: 'Verbindung zu {0} hergestellt',
		connectionLost: 'Konnte Verbindung zu {0} nicht aufrecht erhalten',
		emergencyStop: 'NOT-AUS, versuche Verbindung wiederherzustellen...',
		reconnecting: 'Verbindung unterbrochen, versuche erneut zu verbinden...',
		reconnected: 'Verbindung hergestellt',
		disconnected: 'Verbindung zu {0} getrennt'
	},
	generic: {
		ok: 'OK',
		cancel: 'Abbrechen',
		yes: 'Ja',
		no: 'Nein',
		close: 'Schließen',
		reset: 'Zurücksetzen',
		noValue: 'n/v',
		loading: 'lade',
		error: 'Fehler',
		info: 'Info',
		warning: 'Warnung',
		success: 'Erfolg',
		heaterStates: {
			off: 'aus',
			standby: 'standby',
			active: 'aktiv',
			fault: 'fehler',
			tuning: 'kalibriere',
			offline: 'abgeschaltet'
		},
		status: {
			updating: 'Aktualisiere',
			off: 'Aus',
			halted: 'Angehalten',
			pausing: 'Pausiere',
			paused: 'Pausiert',
            resuming: 'Wiederaufnahme',
			printing: 'Drucke',
			processing: 'Verarbeite',
			simulating: 'Simuliere',
			busy: 'Beschäftigt',
			changingTool: 'Wechsle Werkzeug',
			idle: 'Leerlauf',
			unknown: 'Unbekannt'
		},
		rpm: 'RPM',
		sdCard: 'SD-Karte {0}',
		mounted: 'eingebunden',
		notMounted: 'nicht eingebunden',
		extracting: 'Extrahiere',
		uploading: 'Lade hoch',
		active: 'Aktiv',
		standby: 'Standby'
	},
	input: {
		code: {
			send: 'Senden',
			placeholder: 'Code senden...'
		},
		addTemperature: 'Wert der neuen Temperatur',
		addRPM: 'Wert der neuen Vorlage'
	},
	jobProgress: {
		simulating: 'Simuliere {0}, {1} abgeschlossen',
		simulated: 'Simulation von {0}, 100 % abgeschlossen',
		processing: 'Verarbeite {0}, {1} abgeschlossen',
		processed: 'Verarbeitung von {0}, 100 % abgeschlossen',
		printing: 'Drucke {0}, {1} abgeschlossen',
		printed: 'Druck von {0}, 100 % abgeschlossen',
		noJob: 'Kein Auftrag wird ausgeführt.',
		layer: 'Schicht {0} von {1}',
		filament: 'Filamentverbrauch: {0}',
		filamentRemaining: '{0} verbleibend'
	},
	list: {
		baseFileList: {
			fileName: 'Dateiname',
			size: 'Größe',
			lastModified: 'Zuletzt geändert',
			download: 'Datei herunterladen',
			edit: 'Datei bearbeiten',
			rename: 'Umbenennen',
			delete: 'Löschen',
			downloadZIP: 'Als ZIP herunterladen',
			noFiles: 'Keine Dateien oder Verzeichnisse',
			driveUnmounted: 'Laufwerk ist nicht eingebunden',
			goUp: 'Nach oben'
		},
		menu: {
			noFiles: 'Keine Menüdateien'
		},
		eventLog: {
			date: 'Datum',
			type: 'Typ',
			message: 'Ereignis',
			noEvents: 'Keine Ereignisse',
			clear: 'Leeren',
			downloadText: 'Als Text herunterladen',
			downloadCSV: 'Als CSV herunterladen'
		},
		filament: {
			noFilaments: 'Keine Filamente'
		},
		macro: {
			caption: 'Makros',
			noMacros: 'Keine Makros',
			run: 'Makro ausführen',
			root: 'Stammverzeichnis'
		},
		jobs: {
			height: 'Objekthöhe',
			layerHeight: 'Schichtdicke',
			filament: 'Filamentverbrauch',
			printTime: 'Druckdauer',
			simulatedTime: 'Simulierte Dauer',
			generatedBy: 'Erstellt durch',

			noJobs: 'Keine Aufträge',
			start: 'Datei starten',
			simulate: 'Datei simulieren'
		},
		system: {
			noFiles: 'Keine Systemdateien',
			configToolNote: 'mit config tool bearbeiten'
		}
	},
	menu: {
		control: {
			caption: 'Maschinensteuerung',
			dashboard: 'Übersicht',
			console: 'Konsole',
			heightmap: 'Höhenkarte'
		},
		job: {
			caption: 'Aktueller Auftrag',
			status: 'Status',
			webcam: 'Webcam',
			visualiser: 'Visualisierer'
		},
		files: {
			caption: 'Dateiverwaltung',
			jobs: 'Aufträge',
			filaments: 'Filamente',
			macros: 'Makros',
			menu: 'Menü',
			system: 'System',
			web: 'Web'
		},
		settings: {
			caption: 'Einstellungen',
			general: 'Allgemein',
			machine: 'Maschinenspezifisch',
			update: 'Aktualisierung'
		}
	},
	notification: {
		compress: {
			title: 'Komprimiere Dateien...',
			message: 'Bitte warten während Ihre Dateien komprimiert werden...',
			errorTitle: 'Konnte Dateien nicht komprimieren'
		},
		delete: {
			errorTitle: 'Konnte {0} nicht löschen',
			errorMessageDirectory: 'Bitte stellen Sie sicher, dass das ausgewählte Verzeichnis leer ist',
			success: '{0} wurde erfolgreich gelöscht',
			successMultiple: '{0} Elemente sind erfolgreich gelöscht worden'
		},
		deleteFilament: {
			errorTitle: 'Konnte Filament(e) nicht löschen',
			errorStillLoaded: 'Mindestens eins der ausgewählten Filamente ist noch geladen. Bitte erst entladen bevor Sie fortfahren',
			errorSubDirectories: 'Das Filament {0} enthält Unterverzeichnisse. Bitte löschen Sie diese erst händisch und versuchen Sie es erneut'
		},
		download: {
			title: 'Lade {0} @ {1} herunter, {2}% abgeschlossen',
			message: 'Bitte warten Sie während die Datei heruntergeladen wird...',
			success: 'Download von {0} erfolgreich nach {1}',
			successMulti: 'Erfolgreich {0} Dateien heruntergeladen',
			error: 'Konnte {0} nicht herunterladen'
		},
		message: 'Nachricht',
		mount: {
			successTitle: 'SD-Karte eingebunden',
			errorTitle: 'Konnte SD-Karte nicht einbinden'
		},
		newDirectory: {
			errorTitle: 'Konnte Verzeichnis nicht erstellen',
			successTitle: 'Verzeichnis erstellt',
			successMessage: 'Verzeichnis {0} wurde erfolgreich erstellt'
		},
		newFilament: {
			errorTitle: 'Konnte Filament nicht anlegen',
			errorTitleMacros: 'Konnte Filamentmakros nicht anlegen',
			successTitle: 'Filament erstellt',
			successMessage: 'Successfully created filament {0}'
		},
		rename: {
			success: '{0} wurde erfolgreich nach {1} umbenannt',
			error: 'Konnte {0} nicht nach {1} umbenennen',
		},
		renameFilament: {
			errorTitle: 'Konnte Filament nicht umbenennen',
			errorStillLoaded: 'Dieses Filament ist noch geladen. Bitte erst entladen bevor Sie fortfahren'
		},
		responseTooLong: 'Nachricht zu lang, siehe Konsole',
		upload: {
			title: 'Lade {0} @ {1} hoch, {2}% abgeschlossen',
			message: 'Bitte warten während die Datei hochgeladen wird...',
			success: 'Datei {0} erfolgreich nach {1} hochgeladen',
			successMulti: '{0} Dateien sind erfolgreich hochgeladen worden',
			error: 'Konnte {0} nicht hochladen'
		}
	},
	panel: {
		atx: {
			caption: 'ATX-Zufuhr',
			on: 'An',
			off: 'Aus'
		},
		babystepping: {
			caption: 'Z-Babystepping',
			current: 'Aktueller Versatz: {0}'
		},
		extrude: {
			caption: 'Extrusionskontrolle',
			mix: 'Mischen',
			mixRatio: 'Mischverhältnis:',
			amount: 'Extrusionsmenge in {0}:',
			feedrate: 'Vorschubrate in {0}:',
			retract: 'Zurückziehen',
			extrude: 'Extrudieren'
		},
		extrusionFactors: {
			caption: 'Extrusionsfaktoren',
			changeVisibility: 'Sichtbarkeit ändern',
			extruder: 'Extruder {0}',
			noExtruders: 'Keine Extruder'
		},
		fan: {
			caption: 'Lüfterkontrolle',
			selection: 'Lüfterauswahl:',
			toolFan: 'Werkzeuglüfter',
			fan: 'Lüfter {0}'
		},
		fans: {
			caption: 'Lüfter',
			changeVisibility: 'Sichtbarkeit ändern',
			toolFan: 'Werkzeuglüfter',
			fan: 'Lüfter {0}',
			noFans: 'Keine Lüfter'
		},
		heightmap: {
			scale: 'Skala:',
			orMore: 'o. mehr',
			orLess: 'o. weniger',
			axes: 'Achsen:',
			numPoints: 'Anzahl der Punkte: {0}',
			notAvailable: 'Höhenkarte nicht verfügbar',
			radius: 'Messradius: {0}',
			area: 'Messfläche: {0}',
			maxDeviations: 'Maximale Abweichungen: {0} / {1}',
			meanError: 'Gemittelter Fehler: {0}',
			rmsError: 'Standardabweichung: {0}',
			topView: 'Draufsicht',
			colorScheme: 'Farbschema:',
			terrain: 'Terrain',
			heat: 'Hitze',
			reload: 'Höhenkarte neu laden'
		},
		jobControl: {
			caption: 'Auftragskontrolle',
			cancelJob: 'Auftrag abbrechen',
			cancelPrint: 'Druck abbrechen',
			cancelSimulation: 'Simulation abbrechen',
			pauseJob: 'Auftrag pausieren',
			pausePrint: 'Druck pausieren',
			pauseSimulation: 'Simulation pausieren',
			resumeJob: 'Auftrag wiederaufnehmen',
			resumePrint: 'Druck wiederaufnehmennt',
			resumeSimulation: 'Simulation wiederaufnehmen',
			repeatJob: 'Nochmal starten',
			repeatPrint: 'Nochmal drucken',
			repeatSimulation: 'Nochmal simulieren',
			autoSleep: 'Auto-Schlaf aktivieren'
		},
		jobData: {
			caption: 'Gesammelte Daten',
			warmUpDuration: 'Aufwärmzeit',
			currentLayerTime: 'Aktuelle Schichtdauer',
			lastLayerTime: 'Letzte Schichtdauer',
			jobDuration: 'Auftragsdauer'
		},
		jobEstimations: {
			caption: 'Schätzungen basierend auf',
			filament: 'Filamentverbrauch',
			file: 'Dateifortschritt',
			layer: 'Schichtdauer',
			slicer: 'Slicer',
			simulation: 'Simulation'
		},
		jobInfo: {
			caption: 'Jobinformationen',
			height: 'Höhe:',
			layerHeight: 'Schichtdicke:',
			filament: 'Filamentverbrauch:',
			generatedBy: 'Erzeugt durch:'
		},
		movement: {
			caption: 'Maschinenbewegung',
			compensation: 'Kompensation & Kalibrierung',
			runBed: 'True Bed Levelling (G32)',
			runDelta: 'Deltakalibrierung (G32)',
			compensationInUse: 'Benutzte Kompensation: {0}',
			disableBedCompensation: 'Bettkompensation deaktivieren (M561)',
			disableMeshCompensation: 'Gitterkompensation deaktivieren (G29 S2)',
			editMesh: 'Bereich der Gitterkompensation definieren (M557)',
			runMesh: 'Gitterkompensation durchführen (G29)',
			loadMesh: 'Gespeicherte Höhenkarte laden (G29 S1)',
			axesNotHomed: 'Die folgende Achse ist nicht referenziert:|Die folgenden Achsen sind nicht referenziert:',
			noAxes: 'Keine Achsen'
		},
		settingsAbout: {
			caption: 'Über',
			developedBy: 'Weboberfläche entwickelt von',
			for: 'für',
			licensedUnder: 'Lizensiert unter den Bedingungen der'
		},
		settingsAppearance: {
			caption: 'Aussehen',
			darkTheme: 'Dunkles Erscheinungsbild',
			language: 'Sprache',
			binaryFileSizes: 'Benutze binäre Dateigrößen',
			binaryFileSizesTitle: 'Dateigrößen werden mit einer Basis von 1024 (IEC) statt 1000 (SI) angezeigt',
			disableAutoComplete: 'Autovervollständigung deaktivieren',
			disableAutoCompleteTitle: 'Keine Autovervollständigung bei der Eingabe von Codes oder Temperaturen anzeigen'
		},
		settingsCommunication: {
			caption: 'Kommunikation',
			pingInterval: 'PING-Intervall im Leerlauf ({0})',
			ajaxRetries: 'Maximale Anzahl an wiederholten AJAX-Versuchen',
			updateInterval: 'Aktualisierungsintervall ({0})',
			extendedUpdateEvery: 'Erweitertes Statusupdateintervall',
			fileTransferRetryThreshold: 'Grenzwert für erneute Versuche von Dateiübetragungen ({0})',
			crcUploads: 'CRC32-Prüfsummen für Uploads verwenden',
			unavailable: 'Keine Einstellungen verfügbar'
		},
		settingsElectronics: {
			caption: 'Elektronik',
			diagnostics: 'Diagnose',
			board: 'Board: {0}',
			firmware: 'Firmware: {0} ({1})',
			dwsFirmware: 'Version von Duet WiFi Server: {0}',
			updateNote: 'Hinweis: Sie können Aktualisierungen auf der System-Seite installieren.'
		},
		settingsEndstops: {
			caption: 'Endlagenschalter',
			index: 'Index',
			triggered: 'Ausgelöst'
		},
		settingsGeneral: {
			caption: 'Allgemein',
			factoryReset: 'Werkseinstellungen wiederherstellen',
			settingsStorageLocal: 'Einstellungen im lokalen Speicher sichern',
			settingsSaveDelay: 'Verzögerung bevor Einstellungen gesichert werden ({0})',
			cacheStorageLocal: 'Zwischenspeicher im lokalen Speicher sichern',
			cacheSaveDelay: 'Verzögerung bevor der Zwischenspeicher gesichert wird ({0})'
		},
		settingsListItems: {
			caption: 'Listeneinträge',
			toolTemperatures: 'Werkzeugtemperaturen',
			bedTemperatures: 'Betttemperaturen',
			chamberTemperatures: 'Kammertemperaturen',
			spindleRPM: 'Spindel-RPM'
		},
		settingsMachine: {
			caption: 'Maschinenspezifisch',
			revertDWC: 'Zu DWC1 zurückkehren',
			babystepAmount: 'Schrittgröße für Babystepping ({0})',
			moveFeedrate: 'Vorschubrate für Bewegungen ({0})'
		},
		settingsNotifications: {
			caption: 'Benachrichtigungen',
			notificationErrorsPersistent: 'Fehlermeldungen nicht automatisch schließen',
			notificationTimeout: 'Standardmäßige Benachrichtungsdauer ({0})'
		},
		settingsWebcam: {
			caption: 'Webcam',
			webcamURL: 'Webcam-URL (optional)',
			webcamUpdateInterval: 'Aktualisierungsintervall der Webcam ({0})',
			webcamLiveURL: 'URL, die geöffnet werden soll, wenn auf das Webcam-Bild geklickt wird (optional)',
			webcamFix: 'Keinen extra HTTP-Qualifizierer beim Neuladen der Bilder anhängen',
			webcamEmbedded: 'Webcambild in ein iframe einbetten',
			webcamRotation: 'Webcambild drehen',
			webcamFlip: 'Webcambild spiegeln',
			flipNone: 'Keine',
			flipX: 'X spiegeln',
			flipY: 'Y spiegeln',
			flipBoth: 'Beide spiegeln'
		},
		speedFactor: {
			caption: 'Geschwindigkeitsfaktor'
		},
		status: {
			caption: 'Status',
			mode: 'Modus: {0}',
			toolPosition: 'Werkzeugposition',
			machinePosition: 'Maschinenposition',
			extruders: 'Extruder',
			extruderDrive: 'Motor {0}',
			speeds: 'Geschwindigkeiten',
			requestedSpeed: 'Angeforderte Geschwindigkeit',
			topSpeed: 'Maximale Geschwindigkeit',
			sensors: 'Sensoren',
			mcuTemp: 'MCU-Temperatur',
			vIn: 'Vin',
			v12: 'V12',
			minMax: 'Minimum: {0}, Maximum {1}',
			fanRPM: 'Lüfter-RPM',
			probe: 'Z-Probe|Z-Probes',
			noStatus: 'Kein Status'
		},
		tools: {
			caption: 'Werkzeuge',
			controlAll: 'Alle Steuern',
			turnEverythingOff: 'Alle Abschalten',
			allActiveTemperatures: 'Alle aktiven Temperaturen setzen',
			allStandbyTemperatures: 'Alle Standbytemperaturen setzen',
			tool: 'Werkzeug {0}',
			loadFilament: 'Filament laden',
			changeFilament: 'Filament wechseln',
			unloadFilament: 'Filament entladen',
			heater: 'Heizer {0}',
			current: 'Aktuell',
			active: 'Aktiv',
			standby: 'Standby',
			bed: 'Bett {0}',
			chamber: 'Kammer {0}',
			extra: {
				caption: 'Extra',
				sensor: 'Sensor',
				sensorIndex: 'Sensor {0}',
				value: 'Wert',
				showInChart: 'Im Temperaturdiagramm anzeigen',
				noItems: 'Keine zusätzlichen Sensoren'
			},
			noTools: 'Keine Werkzeuge'
		},
		webcam: {
			caption: 'Webcamüberwachung',
			alt: '(webcam bild)'
		}
	}
}
