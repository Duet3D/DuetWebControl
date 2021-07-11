export default {
	language: 'Polski',
	'$vuetify': {
		badge: 'znak',
		close: 'Zamknij',
		dataIterator: {
			noResultsText: 'Nie znaleziono zapisów',
			loadingText: 'Wczytywanie...',
		},
		dataTable: {
			itemsPerPageText: 'rzędy na stronę:',
			ariaLabel: {
				sortDescending: 'Sortowane malejąco.',
				sortAscending: 'sortowane rosnąco.',
				sortNone: 'Nie sortowane.',
				activateNone: 'Aktywuj aby usunąć sortowanie .',
				activateDescending: 'Aktywuj aby sortować malejąco.',
				activateAscending: 'Aktywuj aby sortować rosnąco.',
			},
			sortBy: 'Sortuj:',
		},
		dataFooter: {
			itemsPerPageText: 'Produkty na stronę:',
			itemsPerPageAll: 'Wszystkie',
			nextPage: 'Następna strona',
			prevPage: 'Poprzednia strona',
			firstPage: 'Pierwsza strona',
			lastPage: 'Ostatnia strona',
			pageText: '{0}-{1} z {2}',
		},
		datePicker: {
			itemsSelected: '{0} Wybrane',
		},
		noDataText: 'Brak danych',
		carousel: {
			prev: 'Previous visual',
			next: 'Next visual',
			ariaLabel: {
				delimiter: 'Carousel slide {0} z {1}',
			},
		},
		calendar: {
			moreEvents: '{0} więcej',
		},
		fileInput: {
			counter: '{0} pliki',
			counterSize: '{0} pliki ({1} wszystkie)',
		},
		timePicker: {
			am: 'AM',
			pm: 'PM',
		},
	},
	button: {
		add: {
			caption: 'Dodaj'
		},
		connect: {
			connect: 'Połącz',
			connecting: 'Łączenie...',
			disconnect: 'Rozłącz',
			disconnecting: 'Rozłączanie...'
		},
		emergencyStop: {
			caption:'Zatrzymanie awaryjne',
			title: 'Wymuś natychmiastowe zresetowanie systemu (M112+M999)'
		},
		home: {
			caption: 'Zeruj{0}',
			captionAll: 'Zeruj wszystko',
			title: 'Zeruj {0} oś (G28 {0})',
			titleAll: 'Wyzeruj wszystkie osie (G28)'
		},
		newDirectory: {
			caption: 'Nowy folder'
		},
		newFilament: {
			caption: 'Nowy filament'
		},
		newFile: {
			caption: 'Nowy plik'
		},
		refresh: {
			caption: 'Odśwież'
		},
		reset: {
			caption: 'Zresetuj urządzenie',
			title: 'Wyślij M999 do urządzenia aby zresetować'
		},
		upload: {
			gcodes: {
				caption: 'Załaduj pliki z G-kodem',
				title: 'Wczytaj jeden lub więcej plików z G-Kodem (przeciągnij i upuść jest również obsługiwane)'
			},
			start: {
				caption: 'Wgraj i rozpocznij',
				title: 'Załaduj i uruchom jeden lub więcej plików G-kod (przeciągnij i upuść jest również obsługiwane)'
			},
			firmware: {
				caption: 'Wczytaj pliki mikro-oprogramowania',
				title: 'Wczytaj jeden lub więcej plików z filamentem (przeciągnij i upuść jest również obsługiwane)'
			},
			macros: {
				caption: 'Wczytaj plik(i) Makro',
				title: 'Wczytaj jeden lub więcej plików makro (przeciągnij i upuść jest również obsługiwane)'
			},
			filaments: {
				caption: 'Wczytaj konfigurację filamentu',
				title: 'Wczytaj jedną lub więcej konfiguracji filamentu (przeciągnij i upuść jest również obsługiwane)'
			},
			menu: {
				caption: 'Wczytaj menu plików',
				title: 'Wczytaj jeden lub więcej plików menu (przeciągnij i upuść jest również obsługiwane)'
			},
			system: {
				caption: 'Wczytaj pliki systemu',
				title: 'wczytaj jeden lub więcej plików systemowych (przeciągnij i upuść jest również obsługiwane)'
			},
			web: {
				caption: 'Wczytaj pliki sieciowe',
				title: 'Wczytaj jeden lub więcej plików sieciowych(przeciągnij i upuść jest również obsługiwane) '
			},
			update: {
				caption: 'Załaduj aktualizację',
				title: 'Załaduj paczkę aktualizacji(przeciągnij i upuść jest również obsługiwane)'
			}
		}
	},
	chart: {
		layer: {
			caption: 'Diagram warstw',
			layerTime: 'Czas nakładania warstw',
			showLastLayers: 'Pokaż ostatnie {0} wastw',
			showAllLayers: 'Pokaż wszystkie warstwy',
			layer: 'Warstwa {0}',
			layerDuration: 'Czas nakładania warstwy: {0}',
			layerHeight: 'Wysokość warstwy: {0}',
			filamentUsage: 'Zużycie filamentu: {0}',
			fractionPrinted: 'Postęp/Progres: {0}'
		},
		temperature: {
			caption: 'Diagram temperatury',
			heater: 'Grzałka {0}',
			sensor: 'Czujnik {0}',
			noData: 'Brak danych'
		}
	},
	dialog: {
		changeMoveStep: {
			title: 'Zmień wielkość przesuwu',
			prompt: 'Proszę wprowadzić nową wartość przesunięcia na jedno kliknięcie:'
		},
		configUpdated: {
			title: 'Zresetować panel?',
			prompt: 'Czy chcesz zrestartować tablicę aby wgrać zaktualizowaną konfigurację?'
		},
		connect: {
			title: 'Połącz z urządzeniem',
			prompt: 'Proszę podać nazwę oraz hasło urządzenia z która chcesz się połączyć:',
			hostPlaceholder: 'Nazwa hosta',
			hostRequired: 'Nazwa hosta jest wymagana',
			passwordPlaceholderOptional: 'Hasło (opcjonalnie)',
			passwordPlaceholder: 'Hasło',
			passwordRequired: 'Hasło jest wymagane',
			connect: 'Połącz'
		},
		connection: {
			connecting: 'Łączenie...',
			disconnecting: 'Rozłączanie...',
			updating: 'Proszę czekać aż aktualizacje zostaną zainstalowane...',
			reconnecting: 'Utracono połączenie, ponowna próba łączenia...',
			standBy: 'Proszę czekać...'
		},
		editExtrusionAmount: {
			title: 'Edytuj ilość ekstrudowaną',
			prompt: 'Proszę podać nową wartość dla jednego kliknięcia:'
		},
		editExtrusionFeedrate: {
			title: 'Edytuj szybkość ekstrudowania',
			prompt: 'Proszę podać nową wartość prędkości ekstrudowania dla jednego kliknięcia:'
		},
		factoryReset: {
			title: 'Przywrócić do ustawień fabrycznych?',
			prompt: 'Czy na pewno chcesz przywrócić ustawienia fabryczne? Wszystkie zapisane ustawienia będą skasowane.'
		},
		filament: {
			titleChange: 'Zmiana filamentu',
			titleLoad: 'Wczytaj filament',
			prompt: 'Proszę wybrać filament:',
			noFilaments: 'Brak dostępnego filamentu'
		},
		fileEdit: {
			gcodeReference: 'G-Code Reference',
			menuReference: 'Menu Reference',
			save: 'Zapisz',
			confirmClose: 'Plik był modyfikowany. Jeżeli kontynuujesz zmiany zostaną utracone.'
		},
		fileTransfer: {
			uploadingTitle: 'Wgrywanie pliku {0} z z{1}, {2}% ukończono',
			uploadDoneTitle: 'Wgrywanie zakończone!',
			uploadFailedTitle: 'Wgrywanie nieudane!',
			downloadingTitle: 'Pobieranie pliku {0} z {1}, {2}% zakończone',
			downloadDoneTitle: 'Pobieranie zakończone',
			downloadFailedTitle: 'Pobieranie nie powiodło się!',
			filename: 'Nazwa pliku',
			size: 'Rozmiar',
			progress: 'Postęp',
			currentSpeed: 'Aktualna prędkość: {0}',
			cancelUploads: 'Anuluj wgrywanie',
			cancelDownloads: 'Anuluj pobieranie'
		},
		meshEdit: {
			title: 'Ustaw parametry siatki Mesh',
			radius: 'Probe Radius',
			spacing: 'Odstęp',
			startCoordinate: 'Znacznik przemieszczenia w {0} kierunku',
			endCoordinate: 'Zakończ przemieszczenie w {0} kierunku',
			spacingDirection: 'Oddalenie w {0} kierunku'
		},
		newDirectory: {
			title: 'Nowy katalog',
			prompt: 'Proszę wpisać nową nazwę katalogu'
		},
		newFilament: {
			title: 'Nowy filament',
			prompt: 'Proszę wpisać nazwę filamentu:'
		},
		newFile: {
			title: 'Nowy plik',
			prompt: 'Proszę wpisać nową nazwę pliku:'
		},
		pluginInstallation: {
			installation: 'Instalacja wtyczki',
			prompt: 'Bieżąca wtyczka zostanie zainstalowana:',
			by: 'by {0}',
			license: 'Licencja: {0}',
			homepage: 'Strona domowa:',
			contents: 'Ta paczka zawiera składniki systemu dla',
			dsf: 'Duet Software Framework',
			dwc: 'Duet Web Control',
			rrf: 'RepRapFirmware',
			prerequisites: 'Prerequisites',
			version: 'Wersja {0}',
			noPluginSupport: 'Dedykowane wtyczki dla urzędzania są niedozwolone',
			rootSupport: 'Wsparcie dla wtyczki administratora',
			invalidManifest: 'Invalid plugin manifest',
			permissions: 'Wymaga zezwolenia',
			dwcWarning: 'Ta wtyczka zawiera fragmenty interfejsu WEB. Brak możliwości wymuszenia manipulacji systemem w przeglądarce i doprowadzić do ostrzeżenia które może skutkować uszkodzeniami posiadanego zestawu.',
			rootWarning: 'Ta wtyczka wymaga pozwolenia administratora, co oznacza, że może dojść do edycji przyłączonego SBC oraz instalacji potencjalnie złośliwego oprogramowania. To może spowodować trwałe uszkodzenia w jednostce ',
			sbcPermissions: 'Wtyczka działająca na SBC wymaga',
			noSpecialPermissions: 'Ta wtyczka nie wymaga dodatkowych zezwoleń.',
			ready: 'Installation ready',
			readyMessage: 'Wtyczka jest gotowa do zainstalowania. Proszę się upewnić czy ufasz autorowi tej wtyczki zanim zatwierdzisz ten krok.',
			readyDisclaimer: 'Zanim będziesz mógł kontynuować musisz zaakceptować, że Duet 3D Ltd nie ponosi odpowiedzialności za potencjalne szkody wynikające z instalacji tej wtyczki.',
			checkboxDisclaimer: 'Akceptuję ryzyko instalacji tej wtyczki',
			progress: 'Postęp instalacji',
			progressText: 'Proszę czekać, wtyczka jest w trakcie instalacji...',
			installationSuccess: 'Zainstalowano pomyślnie!',
			installationFailed: 'Instalacja nie powiodła się!',
			cancel: 'Anuluj',
			back: 'Wróć',
			next: 'Next',
			finish: 'Zakończ'
		},
		renameFile: {
			title: 'Zmień nazwę pliku lub katalogu',
			prompt: 'Proszę wpisać nową nazwę:'
		},
		resetHeaterFault: {
			title: 'Resetuj błąd grzałki',
			prompt: 'W grzałce wystąpiła awaria ogrzewania [0]. Zalecane jest natychmiastowe wyłączenie urządzenia i sprawdzenie przewodów przed kontynuacją. Jeżeli jesteś pewny, że to nie jest fizyczny problem możesz spróbować zresetować błąd grzałki na własną odpowiedzialność. Nie jest to zalecana czynność i może spowodować kolejne problemy. Jak zamierzasz postąpić?',
			resetFault: 'Resetuj błąd'
		},
		runMacro: {
			title: 'Uruchom {0}',
			prompt: 'Czy chcesz uruchomić? {0}?'
		},
		startJob: {
			title: 'Rozpocznij{0}',
			prompt: 'Czy chcesz rozpocząć? {0}?'
		},
		update: {
			title: 'Czy zainstalować aktualizację?',
			prompt: 'Wczytałeś co najmniej jedno oprogramowanie sprzętowe. Czy chcesz zainstalować je teraz?',
			resetTitle: 'Zresetować oprogramowanie sprzętowe?',
			resetPrompt: 'Właśnie zainstalowałeś aktualizację rozszerzeń. Czy chcesz ponownie uruchomić główny sterownik aby przywrócić wcześniejszą konfigurację?'
		},
		inputRequired: 'Proszę podać wartość',
		numberRequired: 'Proszę wpisać odpowiednią liczbę'
	},
	directory: {
		menu: 'Katalog menu',
		filaments: 'Katalog filamentów',
		firmware: 'atalog oprogramowania sprzętowego',
		gcodes: 'Katalog G-Kodów',
		macros: 'Katalog makr',
		system: 'Katalog systemowy',
		web: 'Katalog WWW'
	},
	error: {
		notImplemented: '{0} nie zostało wprowadzone',
		invalidPassword: 'Nieprawidłowe hasło!',
		noFreeSession: 'Brak darmowych sesji!',
		connect: 'Nie można połączyć się z {0}',
		disconnect: 'Nie możliwe było uzyskanie bezpiecznego rozłączenia od {0}',
		disconnected: 'Nie można było ukończyć działania, ponieważ sesja wygasła ',
		cancelled: 'Operacja została anulowana',
		network: 'Błąd sieci',
		timeout: 'Upłynął limit czasu żądania HTTP',
		driveUnmounted: 'Dysk docelowy jest odmontowany',
		directoryNotFound: 'Katalog {0} nie został znaleziony',
		fileNotFound: 'Plik {0} nie został znaleziony',
		invalidHeightmap: 'Nieprawidłowa mapa wysokości',
		operationFailed: 'Operacja nie powiodła się (Powód: {0})',
		uploadStartWrongFileCount: 'Tylko pojedynczy plik może być wczytany i uruchomiony',
		uploadNoSingleZIP: 'Tylko jeden plik ZIP może być wysłany w jednym czasie',
		uploadNoFiles: 'Ten ZIP nie zawiera żadnych przydatnych plików',
		codeResponse: 'Could not run code because a bad response has been received ',
		codeBuffer: 'Could run code because the buffer space has been exhausted',
		enterValidNumber: 'Proszę wpisać poprawną liczbę',
		turnOffEverythingFailed: 'Nie udało się wyłączyć wszystkiego',
		filelistRequestFailed: 'Nie udało się otrzymać listy plików',
		fileinfoRequestFailed: 'Nie udało się uzyskać informacji o pliku dla {0}',
		filamentsLoadFailed: 'Nieudana próba wczytania filamentu',
		move: 'Niepowodzenie w przemieszczeniu {0} do {1}'
	},
	events: {
		connected: 'Połączono do {0}',
		connectionLost: 'Nie Udało się utrzymać połączenia z {0}',
		emergencyStop: 'Awaryjne zatrzymanie, próba ponownego połączeia...',
		reconnecting: 'Połączenie zakłócone, ponowiona próba połączenia...',
		reconnected: 'Połączono ponownie',
		disconnected: 'Rozłączono z {0}'
	},
	generic: {
		ok: 'OK',
		cancel: 'Anuluj',
		yes: 'Tak',
		no: 'Nie',
		close: 'Zamknij',
		reset: 'Resetuj',
		noValue: 'n/a',
		loading: 'Wczytywanie',
		error: 'Error',
		info: 'Informacja',
		warning: 'Ostrzeżenie',
		success: 'Sukces',
		heaterStates: {
			off: 'Off',
			standby: 'standby',
			active: 'active',
			fault: 'wada',
			tuning: 'tuning',
			offline: 'offline'
		},
		status: {
			disconnected: 'Rozłączony',
			starting: 'Rozpoczynanie',
			updating: 'Aktualizowanie',
			off: 'Off',
			halted: 'Wstrzymano',
			pausing: 'Pauza',
			paused: 'Zapauzowano',
			resuming: 'Wznawianie',
			printing: 'Drukowanie',
			processing: 'Przetwarzanie',
			simulating: 'Symulowanie',
			busy: 'Zajęty',
			changingTool: 'Zmiana narzędzia',
			idle: 'Idle',
			unknown: 'Nieznany',
		},
		rpm: 'RPM',
		sdCard: 'Karta SD {0}',
		mounted: 'Zamontowano',
		notMounted: 'Nie zamontowano',
		extracting: 'Wypakowywanie',
		uploading: 'Wysyłanie',
		active: 'Active',
		standby: 'Standby'
	},
	input: {
		code: {
			send: 'wysłać',
			placeholder: 'Wyślij kod...'
		},
		addTemperature: 'Nowa wartość temperatury',
		addRPM: 'Wartość nowego ustawienia'
	},
	jobProgress: {
		simulating: 'Symulowanie {0}, {1} zakończono',
		simulated: 'Zasymulowano {0}, 100 % zakończono',
		processing: 'Przetwarzanie {0}, {1} zakończono',
		processed: 'Przetworzono {0}, 100 % zakończono',
		printing: 'Drukowanie {0}, {1} zakończono',
		printed: 'Wydrukowano {0}, 100 % zakończono',
		noJob: 'Brak aktywnego zadania',
		layer: 'Warstwa {0} z 1}',
		filament: 'Zużycie filamentu: {0}',
		filamentRemaining: '{0} pozostało'
	},
	list: {
		baseFileList: {
			fileName: 'Nazwa pliku',
			size: 'Rozmiar',
			lastModified: 'Ostatnio zmodyfikowany',
			download: 'Pobierz plik',
			edit: 'Edytuj plik',
			rename: 'Zmień nazwę',                                
			delete: 'Kasuj',
			downloadZIP: 'Pobierz jako ZIP',
			noFiles: 'Brak plików oraz folderów',
			driveUnmounted: 'Drive is unmounted',
			goUp: 'Idź w górę'
		},
		menu: {
			noFiles: 'Brak wyświetlanych plików'
		},
		eventLog: {
			date: 'Data',
			type: 'Typ',
			message: 'Event',
			noEvents: 'No Events',
			clear: 'Wyczyść',
			downloadText: 'Pobierz jako tekst',
			downloadCSV: 'Pobierz jako CSV'
		},
		filament: {
			noFilaments: 'Brak filamentu'
		},
		firmware: {
			installFile: 'Zainstaluj plik oprogramowania sprzętowego',
			noFiles: 'Brak plików z mikro oprogramowaniem'
		},
		macro: {
			caption: 'Makra',
			noMacros: 'Brak makr',
			run: 'Uruchom Makro',
			root: 'Uruchom ponownie'
		},
		jobs: {
			height: 'Wysokość obiektu',
			layerHeight: 'Wysokość warstwy',
			filament: 'Zużycie filamentu',
			printTime: 'Czas druku',
			simulatedTime: 'Symulowany czas',
			generatedBy: 'Wygenerowany przez:',
			noJobs: 'Brak zadań',
			start: 'Plik startowy',
			simulate: 'Symulacja'
		},
		system: {
			noFiles: 'Brak plików systemowych',
			configToolNote: 'Edytuj za pomocą narzędzia konfiguracyjnego'
		}
	},
	menu: {
		control: {
			caption: 'Zarządzaj',
			dashboard: 'Panel roboczy',
			console: 'Konsola'
		},
		job: {
			caption: 'Zadanie',
			status: 'Status',
			webcam: 'Kamera'
		},
		files: {
			caption: 'Pliki',
			jobs: 'Zadania',
			filaments: 'Filamenty',
			macros: 'Makra',
			menu: 'Wyświetl',
			system: 'System',
			web: 'Sieć'
		},
		plugins: {
			caption: 'Wtyczki'
		},
		settings: {
			caption: 'Ustawienia',
			general: 'Ogólny',
			machine: 'Specyfika urządzenia'
		}
	},
	notification: {
		compress: {
			title: 'Kompresja plików...',
			message: 'Proszę czekać, trwa kompresja plików...',
			errorTitle: 'Kompresja plików nie powiodła się'
		},
		decompress: {
			title: 'Dekompresowanie plików...',
			message: 'Proszę czekać, trwa dekompresja twoich plików...',
			errorTitle: 'Dekompresja plików nie powiodła się.'
		},
		delete: {
			errorTitle: 'Usuwanie nie powiodło się {0}',
			errorMessageDirectory: 'Upewnij się, że ten katalog jest pusty',
			success: 'Pomyślnie usunięto{0}',
			successMultiple: 'Pomyślnie usunięto {0} pozycje'
		},
		deleteFilament: {
			errorTitle: 'Usunięcie filament(u/ów) nie powiodło się',
			errorStillLoaded: 'Przynajmniej jeden z filamentów jest wciąż włożony. Proszę go wyciągnąć przed kontynuacją',
			errorSubDirectories: 'The filament {0} contains sub-directories. Please delete them manually and try again. '
		},
		download: {
			title: 'Pobieranie{0} @ {1}, {2}% Zakończone',
			message: 'Proszę czekać, plik jest pobierany...',
			success: 'Pobieranie {0} Ukończenie po {1}',
			error: 'Pobieranie nieudane {0}'
		},
		message: 'Wiadomość',
		mount: {
			successTitle: 'Karta SD wczytana',
			errorTitle: 'Wczytywanie karty SD nie powiodło się'
		},
		newDirectory: {
			errorTitle: 'Tworzenie katalogu nie powiodło się',
			successTitle: 'Katalog został utworzony',
			successMessage: 'Utworzono katalog pomyślnie {0}'
		},
		newFilament: {
			errorTitle: 'Tworzenie filamentu nie powiodło się',
			errorTitleMacros: ' Nie udało się utworzyć makr filamentów',
			successTitle: 'Filament utworzony',
			successMessage: 'Filament utworzony pomyślnie {0}'
		},
		plugins: {
			started: 'Wtyczka została uruchomiona',
			startError: 'Uruchomienie wtyczki nie powiodło się',
			stopped: 'Wtyczka została wstrzymana',
			stopError: 'Wstrzymanie wtyczki nie powiodło się',
			uninstalled: 'Wtyczka została odinstalowana',
			uninstallError: 'Odinstalowanie wtyczki nie powiodło się'
		},
		rename: {
			success: 'Pomyślna zmiana nazwy {0} do {1}',
			error: 'Nieudana zmiana nazwy {0} do {1}',
		},
		renameFilament: {
			errorTitle: 'Nieudana zmiana nazwy filamentu',
			errorStillLoaded: 'Ten filament jest wciąż włożony. Wyciągnij go zanim kontynuujesz'
		},
		responseTooLong: 'Za długi czas odpowiedzi, pokaż konsolę',
		upload: {
			title: 'Aktualizowanie{0} @ {1}, {2}% Ukończono',
			message: 'Prosze czekać, plik jest wysyłany...',
			success: 'Wysłanie {0} sukces po {1}',
			error: 'Nieudane wysłanie {0}'
		}
	},
	panel: {
		atx: {
			caption: 'zasilanie ATX ',
			on: 'On',
			off: 'Off'
		},
		babystepping: {
			caption: 'Z Babystepping',
			current: 'Bieżąca kompensacja: {0}'
		},
		extrude: {
			caption: 'Kontrola ekstruzji',
			mix: 'Mix',
			mixRatio: 'Mix Ratio:',
			amount: 'Podaj ilość w {0}:',
			feedrate: 'Szybkość podawania w {0}:',
			retract: 'Retrakcja',
			extrude: 'Ekstrudowanie'
		},
		extrusionFactors: {
			caption: 'Czynniki ekstrudowania',
			changeVisibility: 'Change Visibility',
			extruder: 'Ekstruder {0}',
			noExtruders: 'Brak ekstrudera'
		},
		fan: {
			caption: 'Kontrola wentylatorów',
			selection: 'Wybór wentylatora:',
			toolFan: 'Narzędzie wentylatora',
			fan: 'wentylator {0}'
		},
		fans: {
			caption: 'Wentylatory',
			changeVisibility: 'Change Visibility',
			toolFan: 'Narzędzie wentylatora',
			fan: 'Wentylator {0}',
			noFans: 'brak wentylatora'
		},
		jobControl: {
			caption: 'Kontrola pracy',
			cancelJob: 'Anuluj wykonywaną pracę',
			cancelPrint: 'Anuluj druk',
			cancelSimulation: 'Anuluj symulację',
			pauseJob: 'Pauzuj zadanie',
			pausePrint: 'Pauzuj druk',
			pauseSimulation: 'Pauzuj symulację',
			resumeJob: 'Wznów pracę',
			resumePrint: 'Wznów druk',
			resumeSimulation: 'Wznów symulację',
			repeatJob: 'Rozpocznij ponownie',
			repeatPrint: 'Drukuj ponownie',
			repeatSimulation: 'Symuluj ponownie',
			autoSleep: 'Uaktywnij auto-uśpienie'
		},
		jobData: {
			caption: 'Zabrano dane',
			warmUpDuration: 'Czas nagrzewania',
			currentLayerTime: 'aktualny czas nakładania warstwy',
			lastLayerTime: 'Czas nakładania ostatniej warstwy',
			jobDuration: 'czas trwania pracy'
		},
		jobEstimations: {
			caption: 'Estimations based on',
			filament: 'zużycie filamentu',
			file: 'Postęp pliku',
			layer: 'czas nakładania warstwy',
			slicer: 'Slicer',
			simulation: 'symulacja'
		},
		jobInfo: {
			caption: 'informacja o pracy',
			height: 'Wysokość:',
			layerHeight: 'wysokość warstwy:',
			filament: 'Zużycie filamentu:',
			generatedBy: 'wygenerowane przez:'
		},
		movement: {
			caption: 'ruch urządzenia',
			compensation: 'kompensacja i kalibracja',
			runBed: 'True Bed Levelling(G32)',
			runDelta: 'Delta Calibration (G32)',
			compensationInUse: 'kompensacja w użyciu: {0}',
			disableBedCompensation: 'dezaktywuj kompensacją stołu roboczego (M561)',
			disableMeshCompensation: 'Dezaktywuj kompensację siatki mesh (G29 S2)',
			editMesh: 'określ obszar dla kompensacji siatki mesh (M557)',
			runMesh: 'uruchom kompensację siatki mesh (G29)',
			loadMesh: 'Wczytaj zapisaną na karcie SD mapę wysokości  (G29 S1)',
			axesNotHomed: 'Dana oś nie jest zbazowana:|dane ossie nie są zbazowane:',
			noAxes: 'brak osi'
		},
		settingsAbout: {
			caption: 'na temat',
			developedBy: 'Interfejs Web stworzony przez:',
			for: 'dla',
			licensedUnder: 'licencjonowane na prawach'
		},
		settingsAppearance: {
			caption: 'Wygląd',
			darkTheme: 'Ciemny motyw',
			language: 'Język',
			binaryFileSizes: 'Zastosuj binarny rozmiar plików',
			binaryFileSizesTitle: 'Rozmiary plików są wyświetlane z podstawą 1024 (IEC) zamiast 1000 (SI)',
			disableAutoComplete: 'dezaktywuj autouzupełnianie',
			disableAutoCompleteTitle: 'Nie pokazuj listy autouzupełniania podczas pisania kodu oraz wartości temperatury'
		},
		settingsCommunication: {
			caption: 'Komunikacja',
			pingInterval: 'PING interval when idle (ms)',
			updateDelay: 'odśwież opóźnienie (ms)',
			ajaxRetries: 'maksymalna liczba prób AJAX',
			updateInterval: 'aktualizuj interwał ({0})',
			extendedUpdateEvery: 'Extended status update interval',
			fileTransferRetryThreshold: 'Retry threshold for file transfers({0})',
			crcUploads: 'Użyj sum kontrolnych CRC32 abysprawdzić aktualizacje',
			unavailable: 'brak dostępnych ustawień'
		},
		settingsElectronics: {
			caption: 'Elektronika',
			diagnostics: 'Diagnoza',
			board: 'Tablica: {0}',
			firmware: 'Oprogramowanie sprzętowe: {0} ({1})',
			dwsFirmware: 'Wersja serwera Duet WiFi: {0}',
			updateNote: 'Notatka: Możesz zainstalować aktualizację na stronie systemu.'
		},
		settingsEndstops: {
			caption: 'krańcówka',
			index: 'Katalog',
			triggered: 'Wywołany'
		},
		settingsGeneral: {
			caption: 'Ogólne',
			factoryReset: 'Powróć do ustawień fabrycznych',
			settingsStorageLocal: 'Zapisz ustawienia w lokalnej pamięci',
			settingsSaveDelay: 'Update delay for settings changes({0})',
			cacheStorageLocal: 'Zapisz pamięć podręczną na dysku lokalnym',
			cacheSaveDelay: 'Update delay for cache changes ({0})'
		},
		settingsListItems: {
			caption: 'Pokaż pozycje',
			toolTemperatures: 'Temperatura narzędzia',
			bedTemperatures: 'Temperatura stołu roboczego',
			chamberTemperatures: 'Temperatura komory',
			spindleRPM: 'Obroty wrzeciona'
		},
		settingsMachine: {
			caption: 'Specyfika urządzenia',
			babystepAmount: ' Babystep amount({0})',
			moveFeedrate: 'Feedrate for move buttons({0})'
		},
		settingsNotifications: {
			caption: 'Powiadomienia',
			notificationErrorsPersistent: 'Nie zamykaj komunikatów o błędach automatycznie',
			notificationTimeout: 'Domyślny limit czasu powiadomień ({0})'
		},
		settingsWebcam: {
			caption: 'Kamera',
			webcamURL: 'URL obrazu video (opcjonalnie)',
			webcamUpdateInterval: 'Interwał aktualizacji obrazu video({0})',
			webcamLiveURL: 'URL to open when Webcam image is clicked (optional)',
			webcamFix: 'Do not append extra HTTP qualifier when reloading images',
			webcamEmbedded: 'Umieść obraz z kamery w ramce',
			webcamRotation: 'Obróć obraz z kamery',
			webcamFlip: 'Przerzuć obraz z kamery',
			flipNone: 'None',
			flipX: 'Przerzuć oś X',
			flipY: 'Przerzuć oś Y',
			flipBoth: 'Przerzuć obie osie'
		},
		speedFactor: {
			caption: 'parametry prędkości'
		},
		status: {
			caption: 'Status',
			mode: 'Tryb: {0}',
			toolPosition: 'Pozycja narzędzia',
			machinePosition: 'Pozycja urządzenia',
			extruders: 'Sterowniki ekstruderów',
			extruderDrive: 'Sterownik {0}',
			speeds: 'Prędkości',
			requestedSpeed: 'Żadana prędkość',
			topSpeed: 'Prędkość maksymalna',
			sensors: 'Czujniki',
			mcuTemp: 'Temperatura MCU',
			minMax: 'Minimalna: {0}, Maksymalna {1}',
			vIn: 'Vin',
			v12: 'V12',
			fanRPM: 'Obroty wentylatora',
			probe: 'Z-Probe|Z-Probes',
			noStatus: 'Brak statusu'
		},
		tools: {
			caption: 'Narzędzia',
			controlHeaters: 'Kontrola grzałek',
			turnEverythingOff: 'Wyłącz wszystko',
			setActiveTemperatures: 'Ustaw temperatury aktywacji',
			setStandbyTemperatures: 'Ustaw temperatury gotowości ',
			setToolTemperatures: 'Ustaw temperaturę narzędzia',
			setBedTemperatures: 'Ustaw temperaturę stołu roboczego',
			setChamberTemperatures: 'Ustaw temperatury komory',
			tool: 'Narzędzie {0}',
			loadFilament: 'Włóż Filament',
			changeFilament: 'Zmień Filament',
			unloadFilament: 'Wyciągnij Filament',
			heater: 'Grzałka {0}',
			current: 'Aktualny',
			active: 'Active',
			standby: 'Standby',
			bed: 'Stół roboczy{0}',
			chamber: 'Komora {0}',
			extra: {
				caption: 'Dodatkowy',
				sensor: 'Czujnik',
				sensorIndex: 'czujnik {0}',
				value: 'Wartość',
				showInChart: 'Pokaż na wykresie',
				noItems: 'Brak dodatkowych czujników'
			},
			noTools: 'Brak narzędzi'
		},
		webcam: {
			caption: 'Podgląd obrazu z kamery',
			alt: '(obraz z kamery)'
		}
	},
	pluginPermissions: {
		commandExecution: 'Wykonaj ogólne komendy DSF (np. G/M/T-codes)',
		codeInterceptionRead: 'Przechwyć G/M/T-codes',
		codeInterceptionReadWrite: 'Przechwyć G/M/T-kody i przetwórz je.',
		managePlugins: ' Instaluj, wczytaj, wyładuj, i odinstaluj wtyczkę firm zewnętrzych',
		manageUserSessions: 'Zarządzaj sesjami użytkownika',
		objectModelRead: 'Odczytaj z modelu obiektu?',
		objectModelReadWrite: 'Odczytuj i zapisuj na modelu',
		registerHttpEndpoints: 'Stwórz nowy docelowy adres HTTP ',
		readFilaments: 'Odczytaj pliki z katalogu filamentów',
		writeFilaments: 'Zapisz pliki w katalogu filamentów',
		readFirmware: 'Odczytaj pliki z katalogu oprogramowania sprzętowego',
		writeFirmware: 'Zapisz pliki w katalogu oprogramowania sprzętowego',
		readGCodes: 'Odczytaj pliki z katalogu G-Kodów',
		writeGCodes: 'Zapisz pliki w katalogu G-Kodów',
		readMacros: 'Odczytaj pliki z katalogu makr',
		writeMacros: 'Zapisz pliki w katalogu makr',
		readMenu: 'Odczytaj pliki z katalogu menu',
		writeMenu: 'Zapisz pliki w katalogu menu',
		readSystem: 'Odczytaj pliki z katalogu systemowego',
		writeSystem: 'Zapisz pliki w katalogu systemowym',
		readWeb: 'Odczytaj pliki z katalogu sieciowego',
		writeWeb: 'Zapisz pliki w katalogu sieciowym',
		fileSystemAccess: 'Access files outside the virtual SD directory',
		launchProcesses: 'Uruchom nowy proces',
		networkAccess: 'Komunikuj się poprzez sieć',
		superUser: 'Uruchom jako administrator (możliwe niebezpieczeństwo)'
	},
	plugins: {
		accelerometer: {
			name: 'Akcelerometr',
			listTitle: 'Pliki CSV',
			none: 'Brak pliku',
			chartCaption: 'Próba przyspieszenia',
			noData: 'brak wczytanych prób',
			analysis: 'analiza częstotliwości',
			samplingRate: 'próbkowanie (in Hz)',
			start: 'Start',
			end: 'Koniec',
			wideBand: 'Analiza szeroko-pasmowa',
			analyze: 'analizuj',
			back: 'back',
			overflowPrompt: {
				title: 'wykryto przelanie ',
				prompt: 'Plik CSV wykrył przelanie. Czy na pewno chcesz kontynuować?'
			},
			loadError: 'Nie Udało się wczytać pliku CSV',
			parseError: 'Nie udało się przetworzyć pliku CSV',
			frequency: 'częstotliwość (w Hz)',
			amplitudes: 'amplituda',
			samples: 'próba',
			accelerations: 'Przyspieszenie (w G)',
			sampleTooltip: 'próba #{0}',
			frequencyTooltip: '{0} ± {1} Hz'
		},
		autoUpdate: {
			menuCaption: 'Aktualizacja'
		},
		gcodeViewer: {
			caption: 'Podgląd G-kod',
			view3D: 'obraz 3D',
			fullscreen: 'Pełny ekran',
			showConfiguration: 'Wyświetl opcje podglądu',
			resetCamera: {
				caption : 'Resetuj kamerę',
				title: 'resetuj kamerę do pozycji wyjściowej'
			},
			cancelLoad: 'Anuluj wczytytwanie pliku',
			reloadView: {
				caption : 'Wczytaj ponownie podgląd',
				title : 'Wczytaj ponownie G-kod, jest to stosowane w momencie zmiany ustawień koloru, szybkości podawania koloru itd.'
			},
			loadCurrentJob:  {
				caption :'wczytaj aktualne zadanie', 
				title : 'Wczytaj aktualny wydruk lub symulację'
			},
			unloadGCode:  {
				caption: 'Wypakuj G-kod',
				title : ' Usuń wczytany kod z podglądu'
			},
			loadLocalGCode: {
				caption : 'Wczytaj lokalny G-kod',
				title : ' Wczytaj plik z lokalnego dysku do podglądu'
			},
			showCursor: 'pokaż kursor',
			showTravels: 'pokaż ścieżkę',
			renderQuality: {
				caption : 'Jakość renderowania',
				title : 'Adjust the visualization quality of the viewer. The higher the level the more vertices and render modes become vailable'
			},
			sbc: 'SBC',
			low: 'Niska',
			medium: 'średnia',			
			high: 'Wysoka',
			ultra: 'Ultra',
			max: 'Maksymalna',
			forceLineRendering: 'Force Line Rendering',
			transparency: 'Transparentność',
			showSolid: 'Show Solid',
			spreadLines: 'Spread Lines-Rozrzuć linie',
			extruders: {
				caption:  'Ekstrudery',
				title : 'Ustaw kolory renderowania ekstrudera'
			},
			tool: 'Tool {0}',
			resetColor: 'Resetuj kolor narzędzia | Resetuj kolory narzędzia',
			renderMode : {
				caption : 'Tryb renderowania | Tryby renderowania',
				title : 'Tryb renderowania na podglądzie umożliwia ustawienie koloru ekstrudera lub prędkości przesuwu  linii kolorujących'
			},
			color: 'Kolor',
			feedrate: 'Prędkość przesuwu',
			minFeedrate: 'Minimalna prędkość przesuwu (mm/s)',
			maxFeedrate: 'Maksymalna prędkość przesuwu (mm/s)',
			minFeedrateColor: 'Minimalna prędkość dawkowania koloru',
			maxFeedrateColor: 'Maksymalna prędkość dawkowania koloru',
			progress: {
				caption : 'Postęp',
				title: 'Określ wydrukowane kolory w celu śledzenia postępu'
			},
			topClipping: 'Górny wycinek',
			bottomClipping:'Dolny wycinek',
			progressColor: 'Postęp koloru',
			liveZTracking: 'Bieżące śledzenie Z',
			settings: 'Ustawienia',
			background: 'Tło',
			bedRenderMode:  'Tryb renderowania stołu roboczego',
			bed: 'Stół roboczy',
			volume: 'Głośność',
			showAxes: 'Pokaż osie',
			showObjectLabels: 'Wyświetl nazwy obiektów',
			cameraInertia: 'Camera Inertia',
			showObjectSelection: {
				caption : 'Wyświetl wybór obiektów',
				title : 'Możliwy tylko gdy obiekt może być wykryty w bieżącym druku'
			},
			renderFailed: 'Poprzednie renderowanie nie powiodło się. Ustalenie jakości renderowania na SBC',
		},
		heightmap: {
			menuCaption: 'Mapa wysokości',
			listTitle: 'Mapy wysokości',
			none: 'Brak',
			scale: 'Skala:',
			orMore: 'lub więcej',
			orLess: 'lub mniej',
			axes: 'Osie:',
			notAvailable: 'Mapa wysokości niedostępna',
			statistics: 'Statystyki',
			numPoints: 'Numer punktów: {0}',
			radius: 'Promień próbkowania: {0}',
			area: 'Obszar próbkowania: {0}',
			maxDeviations: 'Maksymalne odchylenie: {0} / {1}',
			meanError: 'Mean error: {0}',
			rmsError: 'RMS error: {0}',
			display: 'Wyświetl',
			colorScheme: 'Schemat koloru:',
			terrain: 'Teren',
			heat: 'Ciepło',
			invertZ: 'Odwróć współrzędne Z',
			topView: 'Widok z góry',
		},
		objectModelBrowser: {
			menuCaption: 'Model przedmiotu'
		}
	},
	tabs: {
		generalSettings: {
			caption: 'Ogólne'
		},
		machineSettings: {
			caption: 'Ogólne'
		},
		plugins: {
			generalCaption: 'Wbudowane wtyczki',
			machineCaption: ' Dedykowane wtyczki',
			headers: {
				name: 'Nazwa',
				author: 'Autor',
				version: 'Wersja',
				license: 'licencja',
				dependencies: 'Dependencies',
				status: 'Status'
			},
			optional: 'opcjonalne',
			start: 'Start',
			partiallyStarted: 'częściowo rozpoczęte',
			started: 'Rozpoczęte',
			stop: 'Stop',
			deactivated: 'dezaktywowane',
			stopped: 'zatrzymane',
			uninstall: 'odinstaluj',
			noPlugins: 'Brak wtyczek',
			refreshNote: 'Odśwież stronę aby zakończyć rozpakowywanie niektórych wtyczek DWC'
		}
	}
}
