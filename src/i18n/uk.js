﻿export default {
	language: 'Українська',
	'$vuetify': {
		badge: 'знак',
		close: 'Закрити',
		dataIterator: {
			noResultsText: 'Відповідних записів не знайдено',
			loadingText: 'Завантаження елементів...',
		},
		dataTable: {
			itemsPerPageText: 'Рядків на сторінці:',
			ariaLabel: {
				sortDescending: 'Відсортовано за спаданням.',
				sortAscending: 'Відсортовано за зростанням.',
				sortNone: 'Не відсортовано.',
				activateNone: 'Активуйте, щоб видалити сортування.',
				activateDescending: 'Активуйте, щоб сортувати за спаданням.',
				activateAscending: 'Активуйте, щоб сортувати за зростанням.',
			},
			sortBy: 'Сортувати за',
		},
		dataFooter: {
			itemsPerPageText: 'Елементів на сторінці:',
			itemsPerPageAll: 'Все',
			nextPage: 'Наступна сторінка',
			prevPage: 'Попередня сторінка',
			firstPage: 'Перша сторінка',
			lastPage: 'Остання сторінка',
			pageText: '{0}-{1} з {2}',
		},
		datePicker: {
			itemsSelected: '{0} вибрано',
		},
		noDataText: 'Немає даних',
		carousel: {
			prev: 'Попередній слайд',
			next: 'Наступний слайд',
			ariaLabel: {
				delimiter: 'Слайд {0} з {1}',
			},
		},
		calendar: {
			moreEvents: 'Ще {0}',
		},
		fileInput: {
			counter: 'Файлів: {0}',
			counterSize: 'Файлів: {0} (всього {1})',
		},
		timePicker: {
			am: 'AM',
			pm: 'PM',
		},
	},
	button: {
		add: {
			caption: 'Додати'
		},
		connect: {
			connect: 'Підключитися',
			connecting: 'Підключення...',
			disconnect: 'Від\'єднатися',
			disconnecting: 'Від\'єднання...'
		},
		emergencyStop: {
			caption: 'Аварійна зупинка',
			title: 'Негайне скидання програмного забезпечення (M112+M999)'
		},
		home: {
			caption: 'Паркувати {0}',
			captionAll: 'Паркувати все',
			title: 'Паркувати {0} вісь (G28 {0})',
			titleAll: 'Паркувати всі осі (G28)'
		},
		newDirectory: {
			caption: 'Новий каталог'
		},
		newFilament: {
			caption: 'Новий філамент'
		},
		newFile: {
			caption: 'Новий файл'
		},
		refresh: {
			caption: 'Оновити'
		},
		reset: {
			caption: 'Скинути машину',
			title: 'Надішліть M999 на машину, щоб скинути її'
		},
		upload: {
			gcodes: {
				caption: 'Завантажити файл(и) G-коду',
				title: 'Завантажити один або кілька файлів G-Code (drag&drop підтримується)'
			},
			start: {
				caption: 'Завантажити та запустити',
				title: 'Завантажити та запустити один або кілька файлів G-Code (drag&drop підтримується)'
			},
			firmware: {
				caption: 'Завантажити файл(и) прошивки',
				title: 'Завантажити один або кілька файлів прошивки (drag&drop підтримується)'
			},
			macros: {
				caption: 'Завантажити файл(и) макросу',
				title: 'Завантажити один або кілька файлів макросів (drag&drop підтримується)'
			},
			filaments: {
				caption: 'Завантажити конфігурації філаменту',
				title: 'Завантажити одну або кілька конфігурацій філаменту (drag&drop підтримується)'
			},
			menu: {
				caption: 'Завантажити файли меню',
				title: 'Завантажити один або кілька файлів меню (drag&drop підтримується)'
			},
			system: {
				caption: 'Завантажити системні файли',
				title: 'Завантажити один або кілька системних файлів (drag&drop підтримується)'
			},
			web: {
				caption: 'Завантажити веб-файли',
				title: 'Завантажити один або кілька веб-файлів (drag&drop підтримується)'
			},
			plugin: {
				caption: 'Встановити плагін',
				title: 'Завантажити та запустити плагін (drag&drop підтримується)'
			},
			update: {
				caption: 'Встановити оновлення',
				title: 'Завантажити та встановити оновлення (drag&drop підтримується)'
			}
		}
	},
	chart: {
		layer: {
			caption: 'Шарова діаграма',
			layerTime: 'Час шару',

			showLastLayers: 'Показати {0} останніх шарів',
			showAllLayers: 'Показати всі шари',

			layer: 'Шар {0}',
			layerDuration: 'Тривалість: {0}',
			layerHeight: 'Висота шару: {0}',
			filamentUsage: 'Використано філаменту: {0}',
			fractionPrinted: 'Прогрес файлу: {0}',
			temperatures: 'Температури: {0}'
		},
		temperature: {
			caption: 'Графік температур',
			heater: 'Нагрівач {0}',
			sensor: 'Датчик {0}',
			noData: 'Немає даних'
		}
	},
	dialog: {
		changeMoveStep: {
			title: 'Змінити крок ходу',
			prompt: 'Будь ласка, введіть нове значення для натиснутої кнопки переміщення:'
		},
		configUpdated: {
			title: 'Застосувати нову конфігурацію?',
			prompt: 'Бажаєте перезавантажити материнську плату чи знову виконати файл конфігурації? Рекомендується скинути материнську плату, якщо ви видалили порти вводу-виводу або змінили розподіл драйверів.',
			reset: 'Перезапустити материнську плату',
			runConfig: 'Запустити файл конфігурації'
		},
		connect: {
			title: 'Підключитися до машини',
			prompt: 'Будь ласка, введіть ім\'я хоста та пароль машини, до якої ви хочете підключитися:',
			hostPlaceholder: 'Ім\'я хоста',
			hostRequired: 'Потрібно вказати ім’я хосту',
			passwordPlaceholderOptional: 'Пароль (необов\'язково)',
			passwordPlaceholder: 'Пароль',
			passwordRequired: 'Потрібно вказати пароль',
			connect: 'Підключитися'
		},
		connection: {
			connecting: 'Підключення...',
			disconnecting: 'Від\'єднання...',
			updating: 'Будь ласка, зачекайте, поки встановлюються оновлення...',
			reconnecting: 'З’єднання втрачено, спроба повторного з’єднання...',
			standBy: 'Будь ласка зачекайте...'
		},
		editExtrusionAmount: {
			title: 'Змінити величину екструзії',
			prompt: 'Будь ласка, введіть нову величину для натиснутої кнопки:'
		},
		editExtrusionFeedrate: {
			title: 'Редагувати швидкість подачі екструзії',
			prompt: 'Будь ласка, введіть нову швидкість подачі для натиснутої кнопки:'
		},
		factoryReset: {
			title: 'Відновити заводські налаштування?',
			prompt: 'Ви впевнені, що бажаєте відновити заводські налаштування? Усі збережені налаштування буде втрачено.'
		},
		filament: {
			titleChange: 'Змінити філамент',
			titleLoad: 'Завантажити філамент',
			prompt: 'Будь ласка, виберіть філамент:',
			noFilaments: 'Немає філаменту'
		},
		fileEdit: {
			gcodeReference: 'Довідка про G-код',
			menuReference: 'Довідка про меню',
			save: 'Зберегти',
			confirmClose: 'Файл змінено. Якщо ви продовжите, ваші зміни буде втрачено.'
		},
		fileTransfer: {
			uploadingTitle: 'Відвантаження файлу {0} з {1}, {2}% завершено',
			uploadDoneTitle: 'Відвантаження завершено!',
			uploadFailedTitle: 'Помилка відвантаження!',
			downloadingTitle: 'Завантаження файлу {0} of {1}, {2}% завершено',
			downloadDoneTitle: 'Завантаження завершено!',
			downloadFailedTitle: 'Помилка завантаження!',
			filename: 'Назва файлу',
			size: 'Розмір',
			progress: 'Прогрес',
			currentSpeed: 'Поточна швидкість: {0}',
			cancelUploads: 'Скасувати відвантаження',
			cancelDownloads: 'Скасувати завантаження'
		},
		meshEdit: {
			title: 'Встановити параметри сітки',
			radius: 'Радіус датчика',
			spacing: 'Відстань',
			startCoordinate: 'Початкова координата в напрямку {0}',
			endCoordinate: 'Кінцева координата в напрямку {0}',
			spacingDirection: 'Відстань у напрямку {0}'
		},
		newDirectory: {
			title: 'Новий каталог',
			prompt: 'Введіть нову назву каталогу:'
		},
		newFilament: {
			title: 'Новий філамент',
			prompt: 'Будь ласка, введіть назву нового філаменту:'
		},
		newFile: {
			title: 'Новий файл',
			prompt: 'Будь ласка, введіть нову назву файлу:'
		},
		pluginInstallation: {
			installation: 'Встановлення плагіна',
			prompt: 'Буде встановлено наступний плагін:',
			by: 'від {0}',
			license: 'Ліцензія: {0}',
			homepage: 'Домашня сторінка:',
			contents: 'Цей пакет містить програмні компоненти для',
			dsf: 'Duet Software Framework',
			dwc: 'Duet Web Control',
			rrf: 'RepRapFirmware',
			prerequisites: 'Попередні умови',
			version: 'Версія {0}',
			noPluginSupport: 'Зовнішні плагіни заборонені',
			rootSupport: 'Підтримка плагінів super-користувача',
			invalidManifest: 'Неправильний маніфест плагіна',
			permissions: 'Необхідні дозволи',
			dwcWarning: 'Цей плагін містить компоненти для веб-інтерфейсу. У сеансах браузера не можна примусово перевіряти дозволи, тому це може маніпулювати вашою системою та створювати загрози безпеці, які можуть призвести до фізичного пошкодження вашої установки.',
			rootWarning: 'Для цього плагіна потрібні дозволи super-користувача, що означає, що він може переконфігурувати підключений SBC і інсталювати потенційно шкідливе програмне забезпечення. Це може призвести до фізичного пошкодження вашої установки.',
			sbcPermissions: 'Плагін, що працює на SBC, хоче',
			noSpecialPermissions: 'Цей плагін не потребує спеціальних дозволів.',
			ready: 'Установка готова',
			readyMessage: 'Тепер плагін готовий до встановлення. Перш ніж підтвердити цей останній крок, переконайтеся, що ви довіряєте автору плагіна.',
			readyDisclaimer: 'Перш ніж ви зможете продовжити, ви повинні погодитися з тим, що Duet3D Ltd не несе відповідальності за потенційну шкоду, спричинену встановленням цього стороннього плагіна.',
			checkboxDisclaimer: 'Я приймаю ризики, встановлюю цей плагін',
			progress: 'Хід встановлення',
			progressText: 'Зачекайте, поки встановлюється плагін...',
			installationSuccess: 'Встановлення завершено!',
			installationFailed: 'Помилка встановлення!',
			cancel: 'Скасувати',
			back: 'Назад',
			next: 'Далі',
			finish: 'Закінчити',
			reloadPrompt: {
				title: 'Перезавантажити DWC?',
				prompt: 'Ви щойно оновили активний плагін DWC. Щоб користуватися новою версією, необхідно перезавантажити веб-інтерфейс. Ви хочете зробити це зараз?'
			}
		},
		renameFile: {
			title: 'Перейменувати файл або каталог',
			prompt: 'Введіть нову назву:'
		},
		resetHeaterFault: {
			title: 'Скинути помилку нагрівача',
			prompt: 'Сталася помилка нагрівача {0}. Наполегливо рекомендуємо зараз вимкнути машину та перевірити електропроводку, перш ніж продовжити. Якщо ви абсолютно впевнені, що це не фізична проблема, ви можете скинути помилку нагрівача НА ВЛАСНИЙ РИЗИК. Майте на увазі, що це НЕ РЕКОМЕНДОВАНО і може призвести до подальших проблем. Як би ви хотіли продовжити?',
			resetFault: 'Скинути помилку'
		},
		runMacro: {
			title: 'Запустити {0}',
			prompt: 'Бажаєте запустити {0}?'
		},
		startJob: {
			title: 'Старт {0}',
			prompt: 'Бажаєте почати {0}?'
		},
		update: {
			title: 'Встановити оновлення?',
			prompt: 'Ви завантажили принаймні одне оновлення мікропрограми. Бажаєте встановити їх зараз?',
			resetTitle: 'Скинути прошивку?',
			resetPrompt: 'Ви щойно встановили оновлення плати розширення. Бажаєте перезавантажити головний контролер, щоб відновити попередню конфігурацію?',
			sbcWarning: 'Ви працюєте на машині в режимі SBC. Оновлюйте мікропрограму за допомогою DWC лише за порадою розробників мікропрограми.'
		},
		inputRequired: 'Будь ласка, введіть значення',
		numberRequired: 'Будь ласка, введіть дійсне число'
	},
	directory: {
		menu: 'Каталог меню',
		filaments: 'Каталог філаментів',
		firmware: 'Каталог мікропрограм',
		gcodes: 'Каталог G-кодів',
		macros: 'Каталог макросів',
		system: 'Системний каталог',
		web: 'WWW каталог'
	},
	error: {
		notImplemented: '{0} не виконано',
		invalidPassword: 'Неправильний пароль!',
		noFreeSession: 'Більше немає безкоштовних сеансів!',
		badVersion: 'Несумісна версія прошивки',
		connect: 'Не вдалося підключитися до {0}',
		disconnect: 'Не вдалося повністю відключитися від {0}',
		disconnected: 'Не вдалося завершити дію, оскільки з’єднання було розірвано',
		cancelled: 'Операцію скасовано',
		network: 'Помилка мережі',
		timeout: 'HTTP запит минув',
		driveUnmounted: 'Цільовий диск демонтовано',
		directoryNotFound: 'Каталог {0} не знайдено',
		fileNotFound: 'Файл {0} не знайден',
		invalidHeightmap: 'Недійсна карта висот',
		operationFailed: 'Помилка операції (причина: {0})',
		uploadStartWrongFileCount: 'Можна завантажити та запустити лише один файл',
		uploadNoSingleZIP: 'За один раз можна завантажити лише один ZIP-файл',
		uploadNoFiles: 'Цей ZIP архів не містить файлів, які можна використовувати',
		uploadDecompressionFailed: 'Помилка розпакування ZIP архіву',
		codeResponse: 'Неможливо виконати код, оскільки отримано неправильну відповідь',
		codeBuffer: 'Неможливо виконати код, оскільки простір у буфері вичерпано',
		enterValidNumber: 'Будь ласка, введіть дійсне число',
		turnOffEverythingFailed: 'Не вдалося вимкнути все',
		filelistRequestFailed: 'Не вдалося отримати список файлів',
		fileinfoRequestFailed: 'Не вдалося отримати інформацію для {0}',
		filamentsLoadFailed: 'Не вдалося завантажити філамент',
		move: 'Не вдалося перемістити {0} до {1}'
	},
	events: {
		connected: 'Підключено до {0}',
		connectionLost: 'Не вдалося підтримати зв\'язок із {0}',
		emergencyStop: 'Аварійна зупинка, спроба підключення...',
		reconnecting: 'Підключення перервано, спроба повторного підключення...',
		reconnected: 'Підключення встановлено',
		disconnected: 'Відключено від {0}'
	},
	generic: {
		ok: 'OK',
		cancel: 'Скасувати',
		yes: 'Так',
		no: 'Ні',
		close: 'Закрити',
		reset: 'Скинути',
		noValue: 'н/з',
		loading: 'завантаження',
		error: 'Похибка',
		info: 'Інфо',
		warning: 'Увага',
		success: 'Успіх',
		heaterStates: {
			off: 'вимк.',
			standby: 'очікування',
			active: 'активний',
			fault: 'помилка',
			tuning: 'налаштування',
			offline: 'офлайн'
		},
		status: {
			disconnected: 'Від\'єднано',
			starting: 'Запуск',
			updating: 'Оновлення',
			off: 'Вимк.',
			halted: 'Зупинено',
			pausing: 'Призупинення',
			paused: 'Пауза',
			resuming: 'Відновлення',
			cancelling: 'Скасування',
			printing: 'Друк',
			processing: 'Обробка',
			simulating: 'Симуляція',
			busy: 'Зайнятий',
			changingTool: 'Зміна інструменту',
			idle: 'Очікування',
			unknown: 'Невідомо'
		},
		rpm: 'RPM',
		sdCard: 'SD карта {0}',
		mounted: 'змонтовано',
		notMounted: 'не змонтовано',
		extracting: 'Вилучення',
		uploading: 'Завантаження',
		active: 'Активний стан',
		standby: 'Стан очікування'
	},
	input: {
		code: {
			send: 'Відправити',
			placeholder: 'Відправити код...'
		},
		addTemperature: 'Нове значення температури',
		addRPM: 'Нове значення RPM',
		set: 'Встановити'
	},
	jobProgress: {
		simulating: 'Симуляція {0}, {1} завершено',
		simulated: 'Симуляція {0}, 100%',
		processing: 'Обробка {0}, {1} завершено',
		processed: 'Обробка {0}, 100%',
		printing: 'Друк {0}, {1} завершено',
		printed: 'Друк {0}, 100%',
		noJob: 'Немає завдань, що виконуються.',
		layer: 'Шар {0} з {1}',
		filament: 'Використано філаменту: {0}',
		filamentRemaining: '{0} залишилось'
	},
	list: {
		baseFileList: {
			fileName: 'Назва файлу',
			size: 'Розмір',
			lastModified: 'Дата зміни',
			download: 'Завантажити файл',
			edit: 'Редагувати файл',
			rename: 'Перейменувати',
			delete: 'Видалити',
			downloadZIP: 'Завантажити як ZIP',
			noFiles: 'Немає файлів та каталогів',
			driveUnmounted: 'Диск демонтовано',
			goUp: 'Вгору'
		},
		menu: {
			noFiles: 'Немає файлів відображення'
		},
		eventLog: {
			date: 'Дата',
			type: 'Тип',
			message: 'Подія',
			noEvents: 'Немає подій',
			clear: 'Очистити',
			downloadText: 'Завантажити як текст',
			downloadCSV: 'Завантажити як CSV'
		},
		filament: {
			noFilaments: 'Немає філаменту'
		},
		firmware: {
			installFile: 'Встановити файл прошивки',
			noFiles: 'Немає файлів прошивки'
		},
		macro: {
			caption: 'Макрос',
			noMacros: 'Немає макросів',
			run: 'Виконати макрос',
			root: 'Корінь'
		},
		jobs: {
			height: 'Висота об\'єкту',
			layerHeight: 'Висота шару',
			filament: 'Витрата філаменту',
			printTime: 'Час друку',
			simulatedTime: 'Час симуляції',
			generatedBy: 'Згенеровано',

			noJobs: 'Немає завдань',
			start: 'Старт файлу',
			simulate: 'Симулювати файл'
		},
		system: {
			noFiles: 'Немає системних файлів',
			configToolNote: 'Редагувати за допомогою інструменту налаштування'
		}
	},
	menu: {
		control: {
			caption: 'Контроль',
            status: 'Статус',
			dashboard: 'Dashboard',
			console: 'Консоль',
			heightmap: 'Мапа висот'
		},
		job: {
			caption: 'Завдання',
			status: 'Статус',
			webcam: 'Веб-камера',
			visualizer: 'Візуалізатор'
		},
		files: {
			caption: 'Файли',
			jobs: 'Завдання',
			filaments: 'Філаменти',
			macros: 'Макроси',
			menu: 'Дисплей',
			system: 'Система',
			web: 'Веб'
		},
		plugins: {
			caption: 'Плагіни'
		},
		settings: {
			caption: 'Налаштування',
			general: 'Загальне',
			machine: 'Машина',
			update: 'Оновлення'
		}
	},
	notification: {
		compress: {
			title: 'Стискання файлів...',
			message: 'Зачекайте, поки ваші файли стискаються...',
			errorTitle: 'Не вдалося стиснути файли'
		},
		decompress: {
			title: 'Розпакування файлів...',
			message: 'Зачекайте, поки ваші файли розпаковуються...',
			errorTitle: 'Не вдалося розпакувати файли'
		},
		delete: {
			errorTitle: 'Не вдалося видалити {0}',
			errorMessageDirectory: 'Будь ласка, переконайтеся, що цей каталог порожній',
			success: 'Успішно видалено {0}',
			successMultiple: 'Успішно видалено {0} елементів'
		},
		deleteFilament: {
			errorTitle: 'Не вдалося видалити філамент(и)',
			errorStillLoaded: 'Принаймні один з вибраних філаментів все ще завантажений. Перш ніж продовжити, вивантажте його.',
			errorSubDirectories: 'Філамент {0} містить підкаталоги. Видаліть їх вручну та спробуйте знову.'
		},
		download: {
			title: 'Завантаження {0} @ {1}, завершено {2}%.',
			message: 'Зачекайте, поки файл завантажується...',
			success: 'Завантаження {0} успішне після {1}',
			successMulti: 'Завантажено {0} файлів',
			error: 'Не вдалося завантажити {0}'
		},
		message: 'Повідомлення',
		mount: {
			successTitle: 'SD-карту змонтовано',
			errorTitle: 'Не вдалося змонтувати SD-карту'
		},
		newDirectory: {
			errorTitle: 'Не вдалося створити каталог',
			successTitle: 'Каталог створено',
			successMessage: 'Успішно створено каталог {0}'
		},
		newFilament: {
			errorTitle: 'Не вдалося створити філамент',
			errorTitleMacros: 'Не вдалося створити макрос філаменту',
			successTitle: 'Філамент створено',
			successMessage: 'Успішно створено філамент {0}'
		},
		plugins: {
			started: 'Плагін запущено',
			startError: 'Не вдалося запустити плагін',
			stopped: 'Плагін зупинено',
			stopError: 'Не вдалося запустити плагін',
			uninstalled: 'Плагін видалено',
			uninstallError: 'Не вдалося видалити плагін'
		},
		rename: {
			success: 'Успішно перейменовано {0} на {1}',
			error: 'Не вдалося перейменувати {0} на {1}',
		},
		renameFilament: {
			errorTitle: 'Не вдалося перейменувати філамент',
			errorStillLoaded: 'Цей філамент все ще завантажений. Будь ласка, вивантажте його, перш ніж продовжити'
		},
		responseTooLong: 'Відповідь задовга, дивиться Консоль',
		upload: {
			title: 'Відвантаження {0} @ {1}, завершено {2}%.',
			message: 'Зачекайте, поки файл відвантажується...',
			success: 'Відвантаження {0} успішне після {1}',
			successMulti: 'Успішно відвантажено {0} файлів',
			error: 'Не вдалося відвантажити {0}'
		}
	},
	panel: {
		atx: {
			caption: 'ATX живлення',
			on: 'Увімкнути',
			off: 'Вимкнути'
		},
		babystepping: {
			caption: 'Крок Babystep Z',
			current: 'Поточне зміщення: {0}'
		},
		extrude: {
			caption: 'Контроль екструзії',
			mix: 'Суміш',
			mixRatio: 'Співвідношення суміші:',
			amount: 'Довжина {0}:',
			feedrate: 'Швидкість подачі {0}:',
			retract: 'Ретракт',
			extrude: 'Екструзія'
		},
		extrusionFactors: {
			caption: 'Коефіцієнт екструзії',
			changeVisibility: 'Змінити видимість',
			extruder: 'Екструдер {0}',
			noExtruders: 'Немає екструдерів'
		},
		fan: {
			caption: 'Контроль вентиляторами',
			selection: 'Вибір вентилятора:',
			toolFan: 'Обдув деталі',
			fan: 'Вентилятор {0}'
		},
		fans: {
			caption: 'Вентилятори',
			changeVisibility: 'Змінити видимість',
			toolFan: 'Обдув деталі',
			fan: 'Вентилятор {0}',
			noFans: 'Немає вентиляторів'
		},
		jobControl: {
			caption: 'Контроль завдань',
			cancelJob: 'Відмінити завдання',
			cancelPrint: 'Відмінити друк',
			cancelSimulation: 'Відмінити симуляцію',
			pauseJob: 'Призупинити завдання',
			pausePrint: 'Призупинити друк',
			pauseSimulation: 'Призупинити симуляцію',
			resumeJob: 'Відновити завдання',
			resumePrint: 'Відновити друк',
			resumeSimulation: 'Відновити симуляцію',
			repeatJob: 'Запустити ще раз',
			repeatPrint: 'Роздрукувати ще раз',
			repeatSimulation: 'Симулювати ще раз',
			showPreview: 'Попередній перегляд'
		},
		jobData: {
			caption: 'Зібрані дані',
			warmUpDuration: 'Час розігріву',
			currentLayerTime: 'Час поточного шару',
			lastLayerTime: 'Час останнього шару',
			jobDuration: 'Тривалість роботи'
		},
		jobEstimations: {
			caption: 'Розрахунок завершення на основі',
			filament: 'використання філаменту',
			file: 'прогресу файлу',
			layer: 'Час шару',
			slicer: 'Слайсер',
			simulation: 'Симуляція'
		},
		jobInfo: {
			caption: 'Інформація про завдання',
			height: 'Висота:',
			layerHeight: 'Висота шару:',
			filament: 'Використання філаменту:',
			generatedBy: 'Згенеровано:'
		},
		movement: {
			caption: 'Рух машини',
			compensation: 'Компенсація та калібрування',
			runBed: 'Вирівнювання столу (G32)',
			runDelta: 'Калібрування Дельта (G32)',
			compensationInUse: 'Використовується компенсація: {0}',
			compensationType: {
				none: 'Немає',
				mesh: 'Сітка'
			},
			disableBedCompensation: 'Вимкнути компенсацію столу (M561)',
			disableMeshCompensation: 'Вимкнути компенсацію сітки (G29 S2)',
			editMesh: 'Визначити область для компенсації сітки (M557)',
			runMesh: 'Запустити компенсацію сітки (G29)',
			loadMesh: 'Завантажити збережену карту висоти з SD-карти (G29 S1)',
			axesNotHomed: 'Наступна вісь не має початкового положення:|Наступні осі не мають початкового положення:',
			noAxes: 'Немає осей',
			workzero: 'Перейти до нуля'
		},
		settingsAbout: {
			caption: 'Про систему',
			developedBy: 'Веб-інтерфейс розроблений',
			for: 'для',
			licensedUnder: 'Ліцензія надається згідно з умовами'
		},
		settingsAppearance: {
			caption: 'Зовнішній вигляд',
			darkTheme: 'Темна тема',
			language: 'Мова',
			binaryFileSizes: 'Використовувати бінарні розміри файлів',
			binaryFileSizesTitle: 'Розміри файлів відображаються на базі 1024 (IEC) замість 1000 (SI)',
			disableAutoComplete: 'Вимкнути автозаповнення',
			disableAutoCompleteTitle: 'Не показувати список автозаповнення під час введення коду або температури',
			dashboardModeTitle: 'Режим dashboard',
			bottomNavigation: 'Показати нижню навігацію на планшетних пристроях',
			numericInputs: 'Показувати поля введення чисел замість повзунків',
			iconMenu: 'Використовувати компактне меню піктограм',
			decimalPlaces: 'Кількість десяткових знаків у відображенні координат',
			displayUnitsTitle: 'Одиниця вимірювання для відображення координат',
			unitInches: 'inches',
			unitInch: 'in',
			unitMm: 'mm',
			unitInchSpeed: 'ipm',
			unitMmSpeed: 'mm/s'
		},
		settingsCommunication: {
			caption: 'Комунікація',
			pingInterval: 'PING інтервал під час простою (мс)',
			updateDelay: 'Затримка оновлення (мс)',
			ajaxRetries: 'Максимальна кількість спроб AJAX',
			updateInterval: 'Інтервал оновлення ({0})',
			extendedUpdateEvery: 'Інтервал оновлення розширеного статусу',
			fileTransferRetryThreshold: 'Поріг повторних спроб для передавання файлів ({0})',
			crcUploads: 'Використання контрольних сум CRC32 для відвантажень',
			unavailable: 'Налаштування відсутні'
		},
		settingsElectronics: {
			caption: 'Електроніка',
			diagnostics: 'Діагностика',
			board: 'Плата: {0}',
			firmware: 'Прошивка: {0} ({1})',
			dwsFirmware: 'Версія Duet WiFi серверу: {0}',
			updateNote: 'Примітка: Ви можете інсталювати оновлення на сторінці "Система".'
		},
		settingsEndstops: {
			caption: 'Кінцеві вимикачі',
			index: 'Індекс',
			triggered: 'Спрацював'
		},
		settingsGeneral: {
			caption: 'Базові налаштування',
			factoryReset: 'Повернутися до заводських налаштувань',
			settingsStorageLocal: 'Зберігати налаштування у локальному сховищі',
			settingsSaveDelay: 'Затримка оновлення для змін налаштувань ({0})',
			cacheStorageLocal: 'Зберігати кеш у локальному сховищі',
			cacheSaveDelay: 'Затримка оновлення для змін кешу ({0})',
			ignoreFileTimestamps: 'Ігнорувати мітки часу файлу під час відвантаження'
		},
		settingsListItems: {
			caption: 'Елементи списку',
			toolTemperatures: 'Температура інструменту',
			bedTemperatures: 'Температура столу',
			chamberTemperatures: 'Температура термокамери',
			spindleRPM: 'Частота обертання шпинделя'
		},
		settingsMachine: {
			caption: 'Машина',
			babystepAmount: 'Крок Babystep Z ({0})',
			moveFeedrate: 'Швидкість пересування ({0}) для кнопок переміщення',
			toolChangeMacros: 'Макроси зміни інструменту'
		},
		settingsNotifications: {
			caption: 'Сповіщення',
			notificationErrorsPersistent: 'Не закривати автоматично повідомлення про помилки',
			notificationTimeout: 'Таймаут повідомлень за замовчуванням ({0})'
		},
		settingsWebcam: {
			caption: 'Веб-камера',
			webcamURL: 'URL веб-камери (необов\'язково)',
			webcamUpdateInterval: 'Інтервал оновлення веб-камери ({0})',
			webcamLiveURL: 'URL-адреса, яка відкривається після натискання зображення веб-камери (необов\'язково)',
			webcamFix: 'Не додавати додатковий кваліфікатор HTTP під час перезавантаження зображень',
			webcamEmbedded: 'Вставити зображення веб-камери в iframe',
			webcamRotation: 'Повернути зображення веб-камери',
			webcamFlip: 'Перевернути зображення веб-камери',
			flipNone: 'Немає',
			flipX: 'Перевернути X',
			flipY: 'Перевернути Y',
			flipBoth: 'Перевернути обидва'
		},
		speedFactor: {
			caption: 'Коефіцієнт швидкості'
		},
		spindle: {
			title: 'Шпинделі',
			spindle: 'Шпиндель',
			active: 'Активний',
			direction: 'Напрямок',
			currentRPM: 'Поточне RPM',
			setRPM: 'Встановити RPM',
			on: 'Увімкнути',
			off: 'Вимкнути',
			forward: 'вперед',
			reverse: 'навпаки'
		},
		status: {
			caption: 'Статус',
			mode: 'Режим: {0}',
			toolPosition: 'Положення інструменту',
			machinePosition: 'Положення машини',
			extruders: 'Приводи екструдера',
			extruderDrive: 'Привід {0}',
			speeds: 'Швидкості',
			requestedSpeed: 'Задана швидкість',
			topSpeed: 'Найвища швидкість',
			sensors: 'Датчики',
			mcuTemp: 'Температура MCU',
			minMax: 'Мін.: {0}, Макс.: {1}',
			vIn: 'Вхідна напруга',
			v12: 'V12',
			fanRPM: 'Швидкість вентилятора',
			probe: 'Z-датчик|Z-датчики',
			noStatus: 'Без статусу'
		},
		tools: {
			caption: 'Інструменти',
			controlHeaters: 'Контроль нагрівачів',
			controlAll: 'Все',
			turnEverythingOff: 'Вимкнути все',
			setActiveTemperatures: 'Встановити температуру в активному стані',
			setStandbyTemperatures: 'Встановити температуру в стані очікування',
			setToolTemperatures: 'Встановити температуру інструменту',
			setBedTemperatures: 'Встановити температуру столу',
			setChamberTemperatures: 'Встановити температуру термокамери',
			allActiveTemperatures: 'Темп. активного стану',
			allStandbyTemperatures: 'Темп. стану очікування',
			tool: 'Інструмент {0}',
			loadFilament: 'Завантажити філамент',
			changeFilament: 'Змінити філамент',
			unloadFilament: 'Вивантажити філамент',
			heater: 'Нагрівач {0}',
			current: 'Темп.',
			active: 'Актив.',
			standby: 'Очікув.',
			bed: 'Стіл {0}',
			chamber: 'Термокамера {0}',
			extra: {
				caption: 'Додатково',
				sensor: 'Датчик',
				sensorIndex: 'Датчик {0}',
				value: 'Значення',
				showInChart: 'Показувати на діаграмі',
				noItems: 'Додаткові датчики відсутні'
			},
			noTools: 'Немає пристроїв'
		},
		webcam: {
			caption: 'Веб-камера спостереження',
			alt: '(зображення веб-камери)'
		}
	},
	pluginPermissions: {
		commandExecution: 'Виконання загальних команд DSF (наприклад, GMT-коди)',
		codeInterceptionRead: 'Перехоплення GMT-кодів',
		codeInterceptionReadWrite: 'Перехоплення GMT-кодів і маніпулювання ними',
		managePlugins: 'Встановлення, завантаження, вивантаження та видалення плагінів сторонніх розробників',
		manageUserSessions: 'Керування сеансами користувачів',
		objectModelRead: 'Зчитування об\'єктної моделі',
		objectModelReadWrite: 'Зчитування та запис об\'єктної моделі',
		registerHttpEndpoints: 'Створення нових кінцевих HTTP точок',
		readFilaments: 'Зчитування файлів з каталогу філаментів',
		writeFilaments: 'Запис файлів в каталог філаментів',
		readFirmware: 'Зчитування файлів з каталогу прошивок',
		writeFirmware: 'Запис файлів в каталог прошивок',
		readGCodes: 'Зчитування файлів з каталогу G-кодів',
		writeGCodes: 'Запис файлів в каталог G-кодів',
		readMacros: 'Зчитування файлів з каталогу макросів',
		writeMacros: 'Запис файлів в каталог макросів',
		readMenu: 'Зчитування файлів з каталогу меню',
		writeMenu: 'Запис файлів в каталог меню',
		readSystem: 'Зчитування файлів з системного каталогу',
		writeSystem: 'Запис файлів в системний каталог',
		readWeb: 'Зчитування файлів з веб каталогу',
		writeWeb: 'Запис файлів в веб каталог',
		fileSystemAccess: 'Доступ до файлів за межами віртуального каталогу SD',
		launchProcesses: 'Запуск нових процесів',
		networkAccess: 'Спілкуйтеся через мережу',
		webcamAccess: 'Доступ до веб-камери',
		gpioAccess: 'Доступ до пристроїв GPIO',
		superUser: 'Запуск від імені root користувача (потенційно небезпечно)'
	},
	plugins: {
		accelerometer: {
			name: 'Акселерометр',
			listTitle: 'CSV файли',
			none: 'Немає файлів',
			chartCaption: 'Зразки прискорення',
			noData: 'Зразки не завантажено',
			analysis: 'Аналіз частоти',
			samplingRate: 'Частота дискретизації (Гц)',
			start: 'Старт',
			end: 'Кінець',
			wideBand: 'Широкосмуговий аналіз',
			analyze: 'Аналіз',
			back: 'Назад',
			overflowPrompt: {
				title: 'Виявлено переповнення',
				prompt: 'Цей файл CSV повідомив про переповнення. Ви впевнені, що бажаєте продовжити?'
			},
			loadError: 'Не вдалося завантажити файл CSV',
			parseError: 'Не вдалося прочитати файл CSV',
			frequency: 'Частота (Гц)',
			amplitudes: 'Амплітуда',
			samples: 'Зразки',
			accelerations: 'Прискорення (g)',
			sampleTooltip: 'Зразок #{0}',
			frequencyTooltip: '{0} ± {1} Гц'
		},
		autoUpdate: {
			menuCaption: 'Оновити'
		},
		gcodeViewer: {
			caption: 'Перегляд G-Code',
			view3D: 'Перегляд 3D',
			fullscreen: 'Повний екран',
			showConfiguration: 'Показати конфігурацію',
			resetCamera: {
				caption: 'Скинути камеру',
				title: 'Скинути камеру у вихідне положення'
			},
			cancelLoad: 'Скасувати завантаження файлу',
			reloadView: {
				caption: 'Перезавантажити перегляд',
				title: 'Перезавантажити поточний gcode. Це використовується під час зміни параметрів, таких як колір, колір швидкості подачі тощо.'
			},
			loadCurrentJob: {
				caption: 'Завантажити поточне завдання',
				title: 'Завантажити поточне завдання друку або імітації'
			},
			unloadGCode: {
				caption: 'Вивантажити GCode',
				title: 'Видалити завантажений gcode із перегляду'
			},
			loadLocalGCode: {
				caption: 'Завантажити локальний GCode',
				title: 'Завантажити файл із локального диска до перегляду'
			},
			showCursor: 'Показати курсор',
			showTravels: 'Показати переміщення',
			renderQuality: {
				caption: 'Якість візуалізації',
				title: 'Налаштування якості візуалізації. Чим вищий рівень, тим більше вершин і режимів рендеру стає доступним'
			},
			sbc: 'SBC',
			low: 'Low',
			medium: 'Medium',
			high: 'High',
			ultra: 'Ultra',
			max: 'Max',
			forceLineRendering: 'Примусове відображення лінії',
			transparency: 'Прозорість',
			showSolid: 'Показати суцільний',
			spreadLines: 'Лінії поширення',
			extruders: {
				caption: 'Екструдери',
				title: 'Встановити колір, що використовується для візуалізації екструдера'
			},
			tool: 'Інструмент {0}',
			resetColor: 'Скинути колір | Скинути кольори',
			renderMode: {
				caption: 'Режим рендеру |Режими рендеру',
				title: 'Режим рендеру дозволяє встановити колір екструдера або колір лінії швидкості подачі'
			},
			color: 'Колір',
			feedrate: 'Швидкість подачі',
			minFeedrate: 'Мінімальна швидкість подачі (mm/s)',
			maxFeedrate: 'Максимальна швидкість подачі (mm/s)',
			minFeedrateColor: 'Колір мінімальної швидкості подачі',
			maxFeedrateColor: 'Колір максимальної швидкості подачі',
			progress: {
				caption: 'Прогрес',
				title: 'Встановіть колір друку для відстеження прогресу'
			},
			topClipping: 'Верхній зріз',
			bottomClipping: 'Нижній зріз',
			progressColor: 'Колір прогресу',
			liveZTracking: 'Живе відстеження Z',
			settings: 'Налаштування',
			background: 'Фон',
			bedRenderMode: 'Режим рендеру столу',
			bed: 'Стіл',
			volume: 'Об\'єм',
			showAxes: 'Показувати осі',
			showObjectLabels: 'Показувати позначки об\'єкту',
			cameraInertia: 'Інерція камери',
			showObjectSelection: {
				caption: 'Показати вибір об\'єкту',
				title: 'Увімкнено, якщо в поточному друку можна виявити об\'єкти'
			},
			renderFailed: 'Помилка попереднього рендеру. Встановлення якості візуалізації на SBC',
			showFSOverlay: 'Показати накладання на повному екрані',
			useHQRendering: 'Високоякісна візуалізація',
			useSpecular: "Specular Highlight",
			feature: "Feature",
			g1AsExtrusion: 'Рендер G1 (CNC)',
		},
		heightmap: {
			menuCaption: 'Карта висот',
			listTitle: 'Карти висот',
			none: 'Немає',
			scale: 'Масштаб:',
			orMore: 'або більше',
			orLess: 'або менше',
			axes: 'Осі:',
			notAvailable: 'карта висот недоступна',
			statistics: 'Статистика',
			numPoints: 'Кількість точок: {0}',
			radius: 'Радіус зондування: {0}',
			area: 'Область зондування: {0}',
			maxDeviations: 'Максимальні відхилення: {0} / {1}',
			meanError: 'Середня помилка: {0}',
			rmsError: 'RMS помилка: {0}',
			display: 'Дисплей',
			colorScheme: 'Кольорова схема:',
			terrain: 'Рельєф',
			heat: 'Тепло',
			invertZ: 'Інвертувати координати Z',
			topView: 'Вид зверху',
			range: 'Діапазон',
			fixed: 'Виправлення',
			deviation: 'Відхилення',
			resetView: 'Скинути перегляд',
			reload: 'Перезавантажити карту висот'
		},
		objectModelBrowser: {
			menuCaption: 'Об\'єктна модель'
		}
	},
	tabs: {
		generalSettings: {
			caption: 'Загальні налаштування'
		},
		machineSettings: {
			caption: 'Налаштування машини'
		},
		plugins: {
			integratedPlugins: 'Вбудовані плагіни',
			externalPlugins: 'Зовнішні плагіни',
			headers: {
				name: 'Им\'я',
				author: 'Автор',
				version: 'Версія',
				license: 'Ліцензія',
				dependencies: 'Залежності',
				status: 'Статус'
			},
			optional: 'необов\'язково',
			start: 'Старт',
			partiallyStarted: 'частково запущено',
			started: 'запущено',
			stop: 'Стоп',
			deactivated: 'деактивовано',
			stopped: 'зупинено',
			uninstall: 'Видалити',
			noPlugins: 'Немає плагінів',
			refreshNote: 'Оновіть сторінку, щоб завершити вивантаження деяких DWC плагінів'
		}
	}
}
