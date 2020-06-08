export default {
	language: 'Türkçe',
	'$vuetify': {
		badge: 'rozet',
		close: 'Kapat',
		dataIterator: {
			noResultsText: 'Eşleşen veri bulunamadı',
			loadingText: 'Yükleniyor... Lütfen bekleyin.',
		},
		dataTable: {
			itemsPerPageText: 'Sayfa başına satır:',
			ariaLabel: {
				sortDescending: 'Z den A ya sıralı.',
				sortAscending: 'A dan Z ye sıralı.',
				sortNone: 'Sıralı değil. ',
				activateNone: 'Sıralamayı kaldırmak için etkinleştir.',
				activateDescending: 'Z den A ya sıralamak için etkinleştir.',
				activateAscending: 'A dan Z ye sıralamak için etkinleştir.',
			},
			sortBy: 'Sırala',
		},
		dataFooter: {
			itemsPerPageText: 'Sayfa başına satır:',
			itemsPerPageAll: 'Hepsi',
			nextPage: 'Sonraki sayfa',
			prevPage: 'Önceki sayfa',
			firstPage: 'İlk sayfa',
			lastPage: 'Son sayfa',
			pageText: '{0} - {1} arası, Toplam: {2} kayıt',
		},
		datePicker: {
			itemsSelected: '{0} öge seçildi',
		},
		noDataText: 'Bu görünümde veri yok.',
		carousel: {
			prev: 'Önceki görsel',
			next: 'Sonraki görsel',
			ariaLabel: {
				delimiter: 'Galeri sayfa {0} / {1}',
			},
		},
		calendar: {
			moreEvents: '{0} tane daha',
		},
		fileInput: {
			counter: '{0} dosya',
			counterSize: '{0} dosya (toplamda {1})',
		},
		timePicker: {
			am: 'AM',
			pm: 'PM',
		},
	},
	button: {
		add: {
			caption: 'Ekle'
		},
		connect: {
			connect: 'Bağlan',
			connecting: 'Bağlanıyor...',
			disconnect: 'Bağlantıyı kes',
			disconnecting: 'Bağlantı kesiliyor...'
		},
		emergencyStop: {
			caption: 'Acil Durdurma',
			title: 'Anında bir yazılım sıfırlamasına zorla (M112+M999)'
		},
		home: {
			caption: 'Referans {0}',
			captionAll: 'Referans Tümü',
			title: 'Referans {0} eksen (G28 {0})',
			titleAll: 'Referans Tümü (G28)'
		},
		newDirectory: {
			caption: 'Yeni Dizin'
		},
		newFilament: {
			caption: 'Yeni Filament'
		},
		newFile: {
			caption: 'Yeni Dosya'
		},
		refresh: {
			caption: 'Yenile'
		},
		reset: {
			caption: 'Makineyi Sıfırla',
			title: 'Sıfırlamak için makineye M999 gönderin'
		},
		upload: {
			gcodes: {
				caption: 'G-Code Dosyası Yükleyin',
				title: 'Bir veya daha fazla G-Code dosyası yükleyin (Sürükle&Bırak desteklenmektedir)'
			},
			start: {
				caption: 'Yükle & Başlat',
				title: 'Bir veya daha fazla G-Code dosyası yükleyin ve başlatın (Sürükle&Bırak desteklenmektedir)'
			},
			macros: {
				caption: 'Makro Dosyası Yükle',
				title: 'Bir veya daha fazla Makro dosyası yükleyin (Sürükle&Bırak desteklenmektedir)'
			},
			filaments: {
				caption: 'Filament yapılandırması yükle',
				title: 'Bir veya daha fazla Filament yapılandırması yükleyin (Sürükle&Bırak desteklenmektedir)'
			},
			menu: {
				caption: 'Menü Dosyası Yükle',
				title: 'Bir veya daha fazla Menü dosyası yükleyin (Sürükle&Bırak desteklenmektedir)'
			},
			system: {
				caption: 'Sistem Dosyası Yükle',
				title: 'Bir veya daha fazla Sistem dosyası yükleyin (Sürükle&Bırak desteklenmektedir)'
			},
			web: {
				caption: 'Web dosyası yükleyin',
				title: 'Bir veya daha fazla Web dosyası yükleyin (Sürükle&Bırak desteklenmektedir)'
			},
			update: {
				caption: 'Güncelleme Yükleyin',
				title: 'Paketi Yükleyin ve Güncelleyin (Sürükle&Bırak desteklenmektedir)'
			}
		}
	},
	chart: {
		layer: {
			caption: 'Katman Grafiği',
			layerTime: 'Katman Süresi',

			showLastLayers: 'Son {0} Katmanı Göster',
			showAllLayers: 'Bütün Katmanları Göster',

			layer: 'Katman {0}',
			layerDuration: 'Süre: {0}',
			layerHeight: 'Katman Yüksekliği: {0}',
			filamentUsage: 'Filament Kullanımı: {0}',
			fractionPrinted: 'Dosya İlerlemesi: {0}'
		},
		temperature: {
			caption: 'Sıcaklık çizelgesi',
			heater: 'Isıtıcı {0}',
			noData: 'Veri Yok'
		}
	},
	dialog: {
		changeMoveStep: {
			title: 'Hareket adımını değiştir',
			prompt: 'Lütfen tıklanan hareket düğmesine yeni bir değer girin:'
		},
		configUpdated: {
			title: 'Yeniden başlat?',
			prompt: 'Güncellenmiş yapılandırmayı uygulamak için cihazı yeniden başlatmak ister misiniz?'
		},
		connect: {
			title: 'Cihaza Bağlan',
			prompt: 'Lütfen bağlanmak istediğiniz makinenin ana bilgisayar adını ve şifresini girin:',
			hostPlaceholder: 'Hostname',
			hostRequired: 'Hostname gerekli',
			passwordPlaceholderOptional: 'Parola (opsiyonel)',
			passwordPlaceholder: 'Parola',
			passwordRequired: 'Parola gerekli',
			connect: 'Bağlan'
		},
		connection: {
			connecting: 'Bağlanıyor...',
			disconnecting: 'Bağlantı Kesiliyor...',
			updating: 'Güncellemeler yüklenirken lütfen bekleyin...',
			reconnecting: 'Bağlantı kesildi, yeniden bağlanmaya çalışılıyor...',
			standBy: 'Lütfen bekleyin...'
		},
		editExtrusionAmount: {
			title: 'Ekstrüzyon miktarını düzenle',
			prompt: 'Lütfen tıklanan düğmeye yeni bir filament miktar girin:'
		},
		editExtrusionFeedrate: {
			title: 'Ekstrüzyon besleme hızını düzenle',
			prompt: 'Lütfen tıklanan düğmeye yeni bir besleme hızı girin:'
		},
		factoryReset: {
			title: 'Fabrika ayarlarına sıfırlama yapılsın mı?',
			prompt: 'Fabrika ayarlarına sıfırlama yapmak istediğinize emin misiniz? Kayıtlı tüm ayarlar kaybolacak.'
		},
		filament: {
			titleChange: 'Filament Değiştir',
			titleLoad: 'Filament Yükle',
			prompt: 'Lütfen filamenti seçin:'
		},
		fileEdit: {
			gcodeReference: 'G-Code Referansı',
			menuReference: 'Menü Referansı',
			save: 'Kaydet',
			confirmClose: 'Dosya değiştirildi. Devam edersen, değişikliklerin kaybolacak.'
		},
		meshEdit: {
			title: 'Kafes Parametrelerini Ayarla',
			radius: 'Prob Radyusu',
			spacing: 'Aralık',
			startCoordinate: 'Koordinatı {0} yönünde başlat',
			endCoordinate: '{0} yönünde bitiş koordinatı',
			spacingDirection: '{0} yönünde boşluk'
		},
		newDirectory: {
			title: 'Yeni Dizin',
			prompt: 'Lütfen yeni bir dizin adı girin:'
		},
		newFilament: {
			title: 'Yeni Filament',
			prompt: 'Lütfen yeni filament için bir ad girin:'
		},
		newFile: {
			title: 'Yeni Dosya',
			prompt: 'Lütfen yeni bir dosya adı girin:'
		},
		renameFile: {
			title: 'Dosya veya Dizini Yeniden Adlandır',
			prompt: 'Lütfen yeni bir ad girin:'
		},
		resetHeaterFault: {
			title: 'Isıtıcı Hatasını Sıfırla',
			prompt: '{0} ısıtıcısında bir ısıtıcı hatası oluştu. Devam etmeden önce makinenizi kapatmanız ve kablolarınızı kontrol etmeniz önemle tavsiye edilir. Bunun fiziksel bir sorun olmadığından kesinlikle eminseniz, KENDİ RİSKİNİZDEKİ ısıtıcı hatasını sıfırlayabilirsiniz. Bunun ÖNERİLMEDİĞİNİ ve daha fazla soruna yol açabileceğini unutmayın. Nasıl ilerlemek istersiniz?',
			resetFault: 'Hatayı Sıfırla'
		},
		runMacro: {
			title: 'Çalıştır {0}',
			prompt: 'Çalıştırmak istiyor musunuz? {0}?'
		},
		startJob: {
			title: 'Başlat {0}',
			prompt: 'Başlatmak istiyor musunuz? {0}?'
		},
		update: {
			title: 'Güncellemeleri yükle?',
			prompt: 'En az bir ürün yazılımı güncellemesi yüklediniz. Onları şimdi yüklemek ister misiniz?'
		},
		inputRequired: 'Lütfen bir değer girin',
		numberRequired: 'Lütfen geçerli bir sayı girin'
	},
	directory: {
		filaments: 'Filament Dizini',
		gcodes: 'G-Codes Dizini',
		macros: 'Makro Dizini',
		menu: 'Menü Dizini',
		system: 'Sistem Dizini',
		web: 'WWW Dizini'
	},
	error: {
		notImplemented: '{0} uygulanmadı',
		invalidPassword: 'Geçersiz şifre!',
		noFreeSession: 'Serbest oturum mevcut değil',
		connect: '{0} ile bağlantı kurulamadı',
		disconnect: '{0} ile bağlantı net bir şekilde kesilemedi',
		disconnected: 'Bağlantı sonlandırıldığı için işlem tamamlanamadı',
		cancelled: 'İşlem iptal edildi',
		network: 'Ağ hatası',
		timeout: 'HTTP isteği zaman aşımına uğradı',
		driveUnmounted: 'Hedef sürücünün bağlantısı kesildi',
		directoryNotFound: '{0} dizini bulunamadı',
		fileNotFound: '{0} dosyası bulunamadı',
		invalidHeightmap: 'Geçersiz Yükseklik Haritası',
		operationFailed: 'İşlem başarısız oldu (Sebep: {0})',
		uploadStartWrongFileCount: 'Yalnızca tek bir dosya yüklenebilir ve başlatılabilir',
		uploadNoSingleZIP: 'Aynı anda yalnızca tek bir ZIP dosyası yüklenebilir',
		uploadNoFiles: 'Bu ZIP kullanılabilir dosya içermiyor',
		uploadDecompressionFailed: 'ZIP dosyası açılamadı',
		codeResponse: 'Hatalı bir yanıt alındığı için kod çalıştırılamadı',
		codeBuffer: 'Arabellek alanı tükendiği için kod çalıştırılabilir',
		enterValidNumber: 'Lütfen geçerli bir sayı girin',
		turnOffEverythingFailed: 'Her şey kapatılamadı',
		filelistRequestFailed: 'Dosya listesi alınamadı',
		fileinfoRequestFailed: '{0} için dosya bilgisi alınamadı',
		filamentsLoadFailed: 'Filamentler yüklenemedi',
		move: '{0}, {1} klasörüne taşınamadı'
	},
	events: {
		connected: '{0} ağına bağlandı',
		connectionLost: '{0} ile bağlantı kurulamadı',
		emergencyStop: 'Acil durdurma, yeniden bağlanmaya çalışıyor...',
		reconnecting: 'Bağlantı kesildi, yeniden bağlanmaya çalışılıyor...',
		reconnected: 'Bağlantı kuruldu',
		disconnected: '{0} ile bağlantı kesildi'
	},
	generic: {
		ok: 'Tamam',
		cancel: 'Vazgeç',
		yes: 'Evet',
		no: 'Hayır',
		close: 'Kapat',
		reset: 'Sıfırla',
		noValue: 'n/a',
		loading: 'yükleniyor',
		error: 'Hata',
		info: 'Bilgi',
		warning: 'Uyarı',
		success: 'Başarılı',
		heaterStates: {
			off: 'kapalı',
			standby: 'bekleme',
			active: 'aktif',
			fault: 'hata',
			tuning: 'ayar',
			offline: 'bağlı değil'
		},
		status: {
			updating: 'Güncelleniyor',
			off: 'Kapalı',
			halted: 'Durduruldu',
			pausing: 'Duraklatılıyor',
			paused: 'Duraklatıldı',
			resuming: 'Devam ediliyor',
			printing: 'Yazdırılıyor',
			processing: 'İşleniyor',
			simulating: 'Simüle ediliyor',
			busy: 'Meşgul',
			changingTool: 'Takım Değiştiriliyor',
			idle: 'Boşta',
			unknown: 'Bilinmiyor'
		},
		rpm: 'Devir',
		sdCard: 'SD Kart {0}',
		mounted: 'takılı',
		notMounted: 'takılı değil',
		extracting: 'Açılıyor',
		uploading: 'Yükleniyor',
		active: 'Aktif',
		standby: 'Bekleme'
	},
	input: {
		code: {
			send: 'Gönder',
			placeholder: 'Kodu gönder...'
		},
		addTemperature: 'Yeni sıcaklık değeri',
		addRPM: 'Yeni hazır ayarın değeri'
	},
	jobProgress: {
		simulating: '{0}, {1} simülasyonu tamamlandı',
		simulated: 'Simüle edilmiş {0},% 100 tamamlandı',
		processing: '{0}, {1} işleme tamamlandı',
		processed: 'İşlendi {0},% 100 tamamlandı',
		printing: 'Yazdırılan {0}, {1} tamamlanan',
		printed: 'Yazdırıldı {0}, 100 % tamamlandı',
		noJob: 'İş yok.',
		layer: 'Katman {0} / {1}',
		filament: 'Filament Kullanımı: {0}',
		filamentRemaining: '{0} kalan'
	},
	list: {
		baseFileList: {
			fileName: 'Dosya adı',
			size: 'Boyut',
			lastModified: 'Son düzenleme',
			download: 'Dosyayı indir',
			edit: 'Dosyayı düzenle',
			rename: 'Yeniden adlandır',
			delete: 'Sil',
			downloadZIP: 'ZIP olarak indir',
			noFiles: 'Dosya veya Dizin Yok',
			driveUnmounted: 'Sürücü bağlantısı kesildi',
			goUp: 'Yukarı git'
		},
		eventLog: {
			date: 'Tarih',
			type: 'Tür',
			message: 'Etkinlik',
			noEvents: 'Olay yok',
			clear: 'Temizle',
			downloadText: 'Metin Olarak İndir',
			downloadCSV: 'CSV Olarak İndir'
		},
		filament: {
			noFilaments: 'Filament yok'
		},
		macro: {
			caption: 'Makrolar',
			noMacros: 'Makro yok',
			run: 'Makro Çalıştır',
			root: 'Kök'
		},
		menu: {
			noFiles: 'Görüntülenecek Dosya Yok'
		},
		jobs: {
			height: 'Nesne Yüksekliği',
			layerHeight: 'Katman Yüksekliği',
			filament: 'Filament Kullanımı',
			printTime: 'Baskı Süresi',
			simulatedTime: 'Simülasyon Süresi',
			generatedBy: 'Oluşturan',

			noJobs: 'İş yok',
			start: 'Dosyayı Başlat',
			simulate: 'Dosya Simülasyonu'
		},
		system: {
			noFiles: 'Sistem Dosyası Yok',
			configToolNote: 'yapılandırma aracı ile düzenle'
		}
	},
	menu: {
		control: {
			caption: 'Makine Kontrolü',
			dashboard: 'Gösterge Paneli',
			console: 'Konsol',
			heightmap: 'Yükseklik Haritası'
		},
		job: {
			caption: 'Mevcut iş',
			status: 'Durum',
			webcam: 'Webcam',
			visualiser: 'Visualiser'
		},
		files: {
			caption: 'Dosya Yönetimi',
			jobs: 'İşler',
			filaments: 'Filaments',
			macros: 'Makrolar',
			menu: 'Görüntü',
			system: 'Sistem',
			web: 'Web'
		},
		settings: {
			caption: 'Ayarlar',
			general: 'Genel',
			machine: 'Tanımlı Ayarlar',
			update: 'Güncelle'
		}
	},
	notification: {
		compress: {
			title: 'Dosyalar sıkıştırılıyor...',
			message: 'Dosyalarınız sıkıştırılırken lütfen bekleyin...',
			errorTitle: 'Dosyalar sıkıştırılamadı'
		},
		delete: {
			errorTitle: '{0} silinemedi',
			errorMessageDirectory: 'Lütfen bu dizinin boş olduğundan emin olun',
			success: '{0} başarıyla silindi',
			successMultiple: '{0} öğe başarıyla silindi'
		},
		deleteFilament: {
			errorTitle: 'Filament(ler) silinemedi',
			errorStillLoaded: 'Seçilen filamentlerden en az biri hala yüklü. Lütfen devam etmeden önce bunları kaldırın',
			errorSubDirectories: '{0} filamenti alt dizinler içeriyor. Lütfen bunları manuel olarak silin ve tekrar deneyin.'
		},
		download: {
			title: 'İndiriliyor {0} @ {1}, {2}% tamamlandı',
			message: 'Dosya indirilirken lütfen bekleyin...',
			success: '{0} indirilen, başarılı {1}',
			successMulti: '{0} dosya başarıyla indirildi',
			error: '{0} indirilemedi'
		},
		message: 'İleti',
		mount: {
			successTitle: 'SD kart takılı',
			errorTitle: 'SD kart takılamadı'
		},
		newDirectory: {
			errorTitle: 'Dizin oluşturulamadı',
			successTitle: 'Dizin oluşturuldu',
			successMessage: '{0} dizini başarıyla oluşturuldu'
		},
		newFilament: {
			errorTitle: 'Filament oluşturulamadı',
			errorTitleMacros: 'Filament makroları oluşturulamadı',
			successTitle: 'Filament oluşturuldu',
			successMessage: '{0} filament başarıyla oluşturuldu'
		},
		rename: {
			success: '{0} başarıyla {1} olarak yeniden adlandırıldı',
			error: '{0}, {1} olarak yeniden adlandırılamadı',
		},
		renameFilament: {
			errorTitle: 'Filament yeniden adlandırılamadı',
			errorStillLoaded: 'Bu filament hala yüklü. Lütfen devam etmeden önce çıkartın'
		},
		responseTooLong: 'Yanıt süresi çok uzun, bkz: Konsol',
		upload: {
			title: '{0} @ {1} yükleniyor,% {2} tamamlandı',
			message: 'Dosya yüklenirken lütfen bekleyin...',
			success: '{0} yüklendi, başarılı {1}',
			successMulti: '{0} dosya başarıyla yüklendi',
			error: '{0} yüklenemedi'
		}
	},
	panel: {
		atx: {
			caption: 'ATX Güç',
			on: 'Açık',
			off: 'Kapalı'
		},
		babystepping: {
			caption: 'Z Mikro adım',
			current: 'Geçerli Ofset: {0}'
		},
		extrude: {
			caption: 'Akış Kontrolü',
			mix: 'Karışım',
			mixRatio: 'Karışım Oranı:',
			amount: '{0} içindeki besleme miktarı:',
			feedrate: '{0} içinde ilerleme hızı:',
			retract: 'Geri çek',
			extrude: 'Çıkart'
		},
		extrusionFactors: {
			caption: 'Ekstrüzyon Faktörleri',
			changeVisibility: 'Görünürlüğü Değiştir',
			extruder: 'Ekstruder {0}',
			noExtruders: 'Ekstruder Yok'
		},
		fan: {
			caption: 'Fan Kontrol',
			selection: 'Fan Seçimi:',
			toolFan: 'Takım Fanı',
			fan: 'Fan {0}'
		},
		fans: {
			caption: 'Fanlar',
			changeVisibility: 'Görünürlüğü Değiştir',
			toolFan: 'Takım Fanı',
			fan: 'Fan {0}',
			noFans: 'Fan Yok'
		},
		heightmap: {
			scale: 'Ölçek:',
			orMore: 'veya daha fazla',
			orLess: 'veya daha az',
			axes: 'Eksenler:',
			notAvailable: 'yükseklik haritası mevcut değil',
			numPoints: 'Nokta sayısı: {0}',
			radius: 'Prob yarıçapı: {0}',
			area: 'Probe alanı: {0}',
			maxDeviations: 'Maksimum sapma: {0} / {1}',
			meanError: 'Ortalama hata: {0}',
			rmsError: 'RMS hatası: {0}',
			topView: 'Üstten görünüm',
			colorScheme: 'Renk şeması:',
			terrain: 'Arazi',
			heat: 'Sıcaklık',
			reload: 'Yükseklik Haritasını Yeniden Yükle'
		},
		jobControl: {
			caption: 'İş Kontrolü',
			cancelJob: 'İşi İptal Et',
			cancelPrint: 'Yazdırmayı İptal Et',
			cancelSimulation: 'Simülasyonu İptal Et',
			pauseJob: 'İşi Duraklat',
			pausePrint: 'Yazdırmayı Duraklat',
			pauseSimulation: 'Simülasyonu Duraklat',
			resumeJob: 'İşe Devam Et',
			resumePrint: 'Yazdırmayı Sürdür',
			resumeSimulation: 'Simülasyonu Sürdür',
			repeatJob: 'Tekrar başla',
			repeatPrint: 'Tekrar Yazdır',
			repeatSimulation: 'Tekrar Simüle Et',
			autoSleep: 'Otomatik Uyku modunu etkinleştir'
		},
		jobData: {
			caption: 'Toplanan veri',
			warmUpDuration: 'Isınma süresi',
			currentLayerTime: 'Geçerli Katman Zamanı',
			lastLayerTime: 'Son Katman Zamanı',
			jobDuration: 'İş Süresi'
		},
		jobEstimations: {
			caption: 'Tahminler',
			filament: 'Filament Kullanımı',
			file: 'Dosya İlerleme Durumu',
			layer: 'Katman Zamanı',
			slicer: 'Dilimleyici',
			simulation: 'Simülasyon'
		},
		jobInfo: {
			caption: 'İş bilgisi',
			height: 'Yükseklik:',
			layerHeight: 'Katman Yüksekliği:',
			filament: 'Filament Kullanımı:',
			generatedBy: 'Oluşturan:'
		},
		movement: {
			caption: 'Makine Hareketi',
			compensation: 'Kalibrasyon & Kompanzasyon',
			runBed: 'Gerçek Tabla Hata Düzeltme (G32)',
			runDelta: 'Delta Kalibrasyon (G32)',
			compensationInUse: 'Kullanımda olan kompanzasyon: {0}',
			disableBedCompensation: 'Tabla Kompanzasyonunu Kapat (M561)',
			disableMeshCompensation: 'Ağ Kompanzasyonunu Kapat (G29 S2)',
			editMesh: 'Ağ Kompanzasyonu için bölge seçimi (M557)',
			runMesh: 'Ağ Kompanzasyonunu Çalıştır (G29)',
			loadMesh: 'SD Karttan Kaydedilen Yükseklik Haritasını Yükle (G29 S1)',
			axesNotHomed: 'Aşağıdaki eksen referansta değil: | Aşağıdaki eksenler referansta değil:',
			noAxes: 'Eksen Yok'
		},
		settingsAbout: {
			caption: 'Hakkında',
			developedBy: 'Web arayüzünü geliştiren',
			for: '/',
			licensedUnder: 'Şartları uyarınca lisanslıdır.'
		},
		settingsAppearance: {
			caption: 'Görünüm',
			darkTheme: 'Karanlık tema',
			language: 'Dil',
			binaryFileSizes: 'Bimary dosya boyutlarını kullan',
			binaryFileSizesTitle: 'Dosya boyutları 1000 (SI) yerine 1024 (IEC) temelinde görüntülenir',
			disableAutoComplete: 'Otomatik tamamlamayı devre dışı bırak',
			disableAutoCompleteTitle: 'Kod veya sıcaklık girişlerini yazarken otomatik tamamlama listesini gösterme'
		},
		settingsCommunication: {
			caption: 'İletişim',
			pingInterval: 'Boşta kaldığında PING aralığı (ms)',
			ajaxRetries: 'Maksimum AJAX yeniden deneme sayısı',
			updateInterval: 'Güncelleme aralığı ({0})',
			extendedUpdateEvery: 'Genişletilmiş durum güncelleme aralığı',
			fileTransferRetryThreshold: 'Dosya aktarımları için yeniden deneme eşiği ({0})',
			crcUploads: 'Yüklemeler için CRC32 sağlama toplamlarını kullanın',
			unavailable: 'Kullanılabilir ayar yok'
		},
		settingsElectronics: {
			caption: 'Elektronik',
			diagnostics: 'Teşhis',
			board: 'Kart: {0}',
			firmware: 'Firmware: {0} ({1})',
			dwsFirmware: 'Duet WiFi Server Sürümü: {0}',
			updateNote: 'Not: Güncellemeleri Sistem sayfasına yükleyebilirsiniz.'
		},
		settingsEndstops: {
			caption: 'Endstops',
			index: 'İndeks',
			triggered: 'Tetiklendi'
		},
		settingsGeneral: {
			caption: 'Genel',
			factoryReset: 'Fabrika ayarlarına dönme',
			settingsStorageLocal: 'Ayarları yerel depolama alanına kaydedin',
			settingsSaveDelay: 'Ayar değişiklikleri için güncelleme gecikmesi ({0})',
			cacheStorageLocal: 'Önbelleği yerel depolama alanına kaydet',
			cacheSaveDelay: 'Önbellek değişiklikleri için güncelleme gecikmesi ({0})'
		},
		settingsListItems: {
			caption: 'Liste Öğeleri',
			toolTemperatures: 'Takım Sıcaklıkları',
			bedTemperatures: 'Tabla Sıcaklıkları',
			chamberTemperatures: 'Bölme Sıcaklıkları',
			spindleRPM: 'Spindle RPM'
		},
		settingsMachine: {
			caption: 'Cihaza özel',
			revertDWC: 'DWC1 e dön',
			babystepAmount: 'Mikro adım miktarı ({0})',
			moveFeedrate: 'Hareket butonları için ilerleme hızı ({0})'
		},
		settingsNotifications: {
			caption: 'Bildirimler',
			notificationErrorsPersistent: 'Hata mesajlarını otomatik olarak kapatma',
			notificationTimeout: 'Varsayılan bildirim zaman aşımı ({0})'
		},
		settingsWebcam: {
			caption: 'Web kamerası',
			webcamURL: 'Web kamerası URL (opsiyonel)',
			webcamUpdateInterval: 'Web kamerası güncelleme aralığı ({0})',
			webcamLiveURL: 'Web kamerası görüntüsü tıklandığında açılacak URL (isteğe bağlı)',
			webcamFix: 'Görüntüleri yeniden yüklerken fazladan HTTP niteleyicisi eklemeyin',
			webcamEmbedded: 'Web kamerası görüntüsünü iframe e yerleştirme',
			webcamRotation: 'Web kamerası görüntüsünü döndür',
			webcamFlip: 'Web kamerası görüntüsünü çevir',
			flipNone: 'Yok',
			flipX: 'Çevir X',
			flipY: 'Çevir Y',
			flipBoth: 'İkisini de çevir'
		},
		speedFactor: {
			caption: 'Hız Faktörü'
		},
		status: {
			caption: 'Durum',
			mode: 'Mod: {0}',
			toolPosition: 'Takım Pozisyonu',
			machinePosition: 'Makine Pozisyonu',
			extruders: 'Ekstruder Sürücüleri',
			extruderDrive: 'Sürücü {0}',
			speeds: 'Hız',
			requestedSpeed: 'İstenen Hız',
			topSpeed: 'En yüksek hız',
			sensors: 'Sensörler',
			mcuTemp: 'İşlemci Sıcaklığı',
			minMax: 'Minimum: {0}, Maksimum {1}',
			vIn: 'Voltaj',
			v12: 'V12',
			fanRPM: 'Fan RPM',
			probe: 'Z-Probu|Z-Probları',
			noStatus: 'Durum yok'
		},
		tools: {
			caption: 'Takımlar',
			controlAll: 'Tümünü Kontrol Et',
			turnEverythingOff: 'Her Şeyi Kapat',
			allActiveTemperatures: 'Tüm aktif sıcaklıkları ayarlama',
			allStandbyTemperatures: 'Tüm bekleme sıcaklıklarını ayarlama',
			tool: 'Takım {0}',
			loadFilament: 'Filament Yükle',
			changeFilament: 'Filament Değiştir',
			unloadFilament: 'Filament Çıkar',
			heater: 'Isıtıcı {0}',
			current: 'Anlık',
			active: 'Aktif',
			standby: 'Bekleme',
			bed: 'Tabla {0}',
			chamber: 'Bölme {0}',
			extra: {
				caption: 'Ekstra',
				sensor: 'Sensör',
				sensorIndex: 'Sensör {0}',
				value: 'Değer',
				showInChart: 'Grafikte Göster',
				noItems: 'Ekstra Isıtıcı Yok'
			},
			noTools: 'Takım Yok'
		},
		webcam: {
			caption: 'Web Kamerası Gözetimi',
			alt: '(web kamerası görüntüsü)'
		}
	}
}
