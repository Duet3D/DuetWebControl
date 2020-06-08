﻿export default {
	language: 'Русский',
	'$vuetify': {
		badge: 'знак',
		close: 'Закрыть',
		dataIterator: {
			noResultsText: 'Не найдено подходящих записей',
			loadingText: 'Запись загружается...',
		},
		dataTable: {
			itemsPerPageText: 'Строк на странице:',
			ariaLabel: {
				sortDescending: 'Упорядочено по убыванию.',
				sortAscending: 'Упорядочено по возрастанию.',
				sortNone: 'Не упорядочено.',
				activateNone: 'Активируйте, чтобы убрать сортировку.',
				activateDescending: 'Активируйте для упорядочивания убыванию.',
				activateAscending: 'Активируйте для упорядочивания по возрастанию.Activate to sort ascending.',
			},
			sortBy: 'Сортировать по',
		},
		dataFooter: {
			itemsPerPageText: 'Записей на странице:',
			itemsPerPageAll: 'Все',
			nextPage: 'Следующая страница',
			prevPage: 'Предыдущая страница',
			firstPage: 'Первая страница',
			lastPage: 'Последняя страница',
			pageText: '{0}-{1} из {2}',
		},
		datePicker: {
			itemsSelected: '{0} выбран',
		},
		noDataText: 'Отсутствуют данные',
		carousel: {
			prev: 'Предыдущий слайд',
			next: 'Следующий слайд',
			ariaLabel: {
				delimiter: 'Слайд {0} из {1}',
			},
		},
		calendar: {
			moreEvents: 'Еще {0}',
		},
		fileInput: {
			counter: 'Файлов: {0}',
			counterSize: 'Файлов: {0} (всего {1})',
		},
		timePicker: {
			am: 'AM',
			pm: 'PM',
		},
	},
	button: {
		add: {
			caption: 'Добавить'
		},
		connect: {
			connect: 'Соединенить',
			connecting: 'Соединение...',
			disconnect: 'Отключить',
			disconnecting: 'Отключение...'
		},
		emergencyStop: {
			caption: 'Аварийная остановка',
			title: 'Немедленный остановка (M112+M999)'
		},
		home: {
			caption: 'Home {0}',
			captionAll: 'Home All',
			title: 'Home the {0} axis (G28 {0})',
			titleAll: 'Home all axes (G28)'
		},
		newDirectory: {
			caption: 'Новая папка'
		},
		newFilament: {
			caption: 'Новый филамент'
		},
		newFile: {
			caption: 'Новый файл'
		},
		refresh: {
			caption: 'Обновить'
		},
		reset: {
			caption: 'Сброс машины',
			title: 'Отправьте M999 на машину, чтобы перезагрузить его.'
		},
		upload: {
			gcodes: {
				caption: 'Загрузить G-код',
				title: 'Загрузить один или несколько файлов G-кода (drag&drop поддерживается)'
			},
			start: {
				caption: 'Загрузить и напечатать',
				title: 'Загрузка и печать одного или нескольких файлов G-кода (drag&drop поддерживается)'
			},
			macros: {
				caption: 'Загрузить макрос',
				title: 'Загрузить один или несколько макросов (drag&drop поддерживается)'
			},
			filaments: {
				caption: 'Загрузить конфиг филамента',
				title: 'Загрузить одну или несколько конфигураций филамента (drag&drop поддерживается)'
			},
			menu: {
				caption: 'Загрузить меню',
				title: 'Загрузить один или несколько файлов меню (drag&drop поддерживается)'
			},
			system: {
				caption: 'Загрузить системный файл',
				title: 'Загрузить один или несколько системных файлов (drag&drop поддерживается)'
			},
			web: {
				caption: 'Загрузить Web файл',
				title: 'Загрузить один или несколько Web файлов (drag&drop поддерживается)'
			},
			update: {
				caption: 'Загрузить обновление',
				title: 'Загрузить пакет обновления (drag&drop поддерживается)'
			}
		}
	},
	chart: {
		layer: {
			caption: 'Время печати слоя',
			layerTime: 'Время слоя',

			showLastLayers: 'Показать последние {0}',
			showAllLayers: 'Показать все слои',

			layer: 'Слой {0}',
			layerDuration: 'Время печати: {0}',
			layerHeight: 'Высота слоя: {0}',
			filamentUsage: 'Использовано филамента: {0}',
			fractionPrinted: 'Прогресс: {0}'
		},
		temperature: {
			caption: 'График температуры',
			heater: 'Нагрев. {0}',
			noData: 'Нет данных'
		}
	},
	dialog: {
		changeMoveStep: {
			title: 'Изменить шаг движения',
			prompt: 'Введите новое значение для нажатой кнопки:'
		},
		configUpdated: {
			title: 'Рестарт контроллера?',
			prompt: 'Вы хотите перезапустить контроллер для применения изменений в конфигурации?'
		},
		connect: {
			title: 'Подключение к принтеру',
			prompt: 'Введите имя и пароль принтера, к которому хотите подключиться:',
			hostPlaceholder: 'Имя',
			hostRequired: 'Имя необходимо',
			passwordPlaceholderOptional: 'Пароль (опционально)',
			passwordPlaceholder: 'Пароль',
			passwordRequired: 'Пароль необходим',
			connect: 'Подключение'
		},
		connection: {
			connecting: 'Подключение...',
			disconnecting: 'Отключение...',
			updating: 'Пожалуйста, подождите, пока будут установлены обновления....',
			reconnecting: 'Соединение потеряно, переподключение...',
			standBy: 'Пожалуйста подождите...'
		},
		editExtrusionAmount: {
			title: 'Изменить величину экструзии',
			prompt: 'Пожалуйста, введите новое значение для нажатой кнопки:'
		},
		editExtrusionFeedrate: {
			title: 'Изменить подачу',
			prompt: 'Пожалуйста, введите новое значение подачи:'
		},
		factoryReset: {
			title: 'Выполнить сброс к заводским настройкам?',
			prompt: 'Вы уверены, что хотите выполнить сброс настроек к заводским настройкам? Все сохраненные настройки будут потеряны.'
		},
		filament: {
			titleChange: 'Смена филамента',
			titleLoad: 'Загрузить филамент',
			prompt: 'Выберите филамент:'
		},
		fileEdit: {
			gcodeReference: 'Информация о G-коде',
			menuReference: 'Информация о меню',
			save: 'Save',
			confirmClose: 'Файл был изменен. Если вы продолжите, ваши изменения будут потеряны.'
		},
		meshEdit: {
			title: 'Set Mesh Parameters',
			radius: 'Probe Radius',
			spacing: 'Spacing',
			startCoordinate: 'Start coordinate in {0} direction',
			endCoordinate: 'End coordinate in {0} direction',
			spacingDirection: 'Spacing in {0} direction'
		},
		newDirectory: {
			title: 'Новая папка',
			prompt: 'Введите имя новой папки:'
		},
		newFilament: {
			title: 'Новый филамент',
			prompt: 'Введите имя нового филамента:'
		},
		newFile: {
			title: 'Новый файл',
			prompt: 'Введте имя нового файла:'
		},
		renameFile: {
			title: 'Переименовать файл или папку',
			prompt: 'Введите новое имя:'
		},
		resetHeaterFault: {
			title: 'Сброс ошибки нагревателя',
			prompt: 'Произошла ошибка нагревателя {0}. Настоятельно рекомендуется выключить машину и проверить проводку перед продолжением работы. Если вы абсолютно уверены, что это не является причиной неисправности, вы можете сбросить ошибку нагревателя на ВАШЕ РИСК. Имейте в виду, что это НЕ РЕКОМЕНДУЕТСЯ и может привести к дальнейшим проблемам. Как бы вы хотели продолжить?',
			resetFault: 'Сброс ошибки'
		},
		runMacro: {
			title: 'Запуск {0}',
			prompt: 'Вы хотите запустить {0}?'
		},
		startJob: {
			title: 'Старт {0}',
			prompt: 'Вы хотите запустить {0}?'
		},
		update: {
			title: 'Установить обновления?',
			prompt: 'Вы загрузили по крайней мере одно обновление прошивки. Хотели бы вы установить их сейчас?'
		},
		inputRequired: 'Введите значение',
		numberRequired: 'Введите правильный номер'
	},
	directory: {
		menu: 'Папка меню',
		filaments: 'Папка филамента',
		gcodes: 'Папка G-кодов',
		macros: 'Папка макросов',
		system: 'Системная папка',
		web: 'Веб папка'
	},
	error: {
		notImplemented: '{0} не выполнено',
		invalidPassword: 'Неверный пароль!',
		noFreeSession: 'Нет свободных сессий!',
		connect: 'Ошибка подключения к {0}',
		disconnect: 'Не получилось верно отключиться от {0}',
		disconnected: 'Не удалось завершить действие, потому что соединение было прервано',
		cancelled: 'Операция была отменена',
		network: 'Ошибка сети',
		timeout: 'Истекло время HTTP запроса',
		driveUnmounted: 'Привод не смонтирован',
		directoryNotFound: 'Папка {0} не найдена',
		fileNotFound: 'Файл {0} не найден',
		invalidHeightmap: 'Неверная карта высот',
		operationFailed: 'Операция не выполнена (Причина: {0})',
		uploadStartWrongFileCount: 'Только один файл может быть загружен и запущен',
		uploadNoSingleZIP: 'Только один ZIP архив может быть загружен',
		uploadNoFiles: 'Этот ZIP архив не содержит используемых файлов',
		uploadDecompressionFailed: 'Ошибка распаковки ZIP архива',
		codeResponse: 'Код не может быть запущен, т.к. был получен неверный ответ',
		codeBuffer: 'Может выполнить код, потому что буферное пространство было исчерпано',
		enterValidNumber: 'Введите правильный номер',
		turnOffEverythingFailed: 'Не получилось всё выключить',
		filelistRequestFailed: 'Ошибка получения списка файлов',
		fileinfoRequestFailed: 'Не удалось получить инфо для {0}',
		filamentsLoadFailed: 'Ошибка загрузки филамента',
		move: 'Ошибка перемещения {0} к {1}'
	},
	events: {
		connected: 'Подключено к {0}',
		connectionLost: 'Не удалоcь подключиться к {0}',
		emergencyStop: 'Аварийная остановка, попытка переподключения...',
		reconnecting: 'Соединение прервано, попытка восстановления...',
		reconnected: 'Соединение установлено',
		disconnected: 'Отключчено от {0}'
	},
	generic: {
		ok: 'OK',
		cancel: 'Отмена',
		yes: 'Да',
		no: 'Нет',
		close: 'Закрыть',
		reset: 'Сброс',
		noValue: 'н/д',
		loading: 'загрузка',
		error: 'Ошибка',
		info: 'Инфо',
		warning: 'Внимание',
		success: 'Успешно',
		heaterStates: {
			off: 'выкл.',
			standby: 'ожидание',
			active: 'активен',
			fault: 'ошибка',
			tuning: 'настройка',
			offline: 'offline'
		},
		status: {
			updating: 'Обновление',
			off: 'Выкл.',
			halted: 'Остановлен',
			pausing: 'Приостановка',
			paused: 'Пауза',
			resuming: 'Возобновление',
			printing: 'Печать',
			processing: 'Обработка',
			simulating: 'Симуляция',
			busy: 'Занят',
			changingTool: 'Смена устройства',
			idle: 'Ожидание',
			unknown: 'Неизвестно'
		},
		rpm: 'RPM',
		sdCard: 'SD карта {0}',
		mounted: 'смонтировано',
		notMounted: 'не смонтировано',
		extracting: 'Извлечение',
		uploading: 'Загрузка',
		active: 'Активно',
		standby: 'Ожидание'
	},
	input: {
		code: {
			send: 'Отправить ',
			placeholder: 'Отправка кода...'
		},
		addTemperature: 'Новое значение температуры',
		addRPM: 'Новое значение RPM'
	},
	jobProgress: {
		simulating: 'Симуляция {0}, {1} завершена',
		simulated: 'СИмуляция {0}, 100%',
		processing: 'Обработка {0}, {1} завершена',
		processed: 'Обработка {0}, 100%',
		printing: 'Печать {0}, {1} завершена',
		printed: 'Печать {0}, 100%',
		noJob: 'Нет запущенного задания.',
		layer: 'Слой {0} из {1}',
		filament: 'Использовано филамента: {0}',
		filamentRemaining: '{0} осталось'
	},
	list: {
		baseFileList: {
			fileName: 'ИМя файла',
			size: 'Размер',
			lastModified: 'Последние изменения',
			download: 'Скачать',
			edit: 'Редактировать',
			rename: 'Переименовать',
			delete: 'Удалить',
			downloadZIP: 'Скачать как ZIP',
			noFiles: 'Нет файлов или папок',
			driveUnmounted: 'Привод не смонтирован',
			goUp: 'Вверх'
		},
		menu: {
			noFiles: 'Нет отображаемых файлов'
		},
		eventLog: {
			date: 'Дата',
			type: 'Тип',
			message: 'Событие',
			noEvents: 'Нет событий',
			clear: 'Чисто',
			downloadText: 'Скачать как текст',
			downloadCSV: 'Скачать как CSV'
		},
		filament: {
			noFilaments: 'Нет филаментов'
		},
		macro: {
			caption: 'Макрос',
			noMacros: 'нет макросов',
			run: 'Выполнить макрос',
			root: 'Root'
		},
		jobs: {
			height: 'Высота объекта',
			layerHeight: 'Выота слоя',
			filament: 'Использовано филамента',
			printTime: 'Время печати',
			simulatedTime: 'Время симуляции',
			generatedBy: 'Слайсер',

			noJobs: 'Нет заданий',
			start: 'Старт файла',
			simulate: 'Симулировать'
		},
		system: {
			noFiles: 'Нет системных файлов',
			configToolNote: 'Редактирование с помощью инструмента настройки'
		}
	},
	menu: {
		control: {
			caption: 'Управление',
			dashboard: 'Инструменты',
			console: 'Консоль',
			heightmap: 'Карта высот'
		},
		job: {
			caption: 'Текущее задание',
			status: 'Статус',
			webcam: 'Камера',
			visualiser: 'Visualiser'
		},
		files: {
			caption: 'Менеджер файлов',
			jobs: 'G-код',
			filaments: 'Филамент',
			macros: 'Макросы',
			menu: 'Дисплей',
			system: 'Система',
			web: 'Web'
		},
		settings: {
			caption: 'Настройки',
			general: 'Основные',
			machine: 'Устройство',
			update: 'Обновление'
		}
	},
	notification: {
		compress: {
			title: 'Сжатие файлов...',
			message: 'Пожалуйста, подождите, пока ваши файлы будут сжаты...',
			errorTitle: 'Ошибка сжатия файлов'
		},
		delete: {
			errorTitle: 'Ошибка удаления {0}',
			errorMessageDirectory: 'Убедитесь, что папка пустая',
			success: 'Успешно удалено {0}',
			successMultiple: 'Успешно удалено {0}'
		},
		deleteFilament: {
			errorTitle: 'Ошибка удаления филамента',
			errorStillLoaded: 'По крайней мере, один из филаментов используется. Выгрузите перед тем, как продолжить.',
			errorSubDirectories: 'Филамент {0} содержит поддиректории. Удалите вручную и попробуйте снова.'
		},
		download: {
			title: 'Скачивание {0} @ {1}, {2}%',
			message: 'Подождите, пока файл скачивается...',
			success: 'Скачивание {0} успешно {1}',
			successMulti: 'Скачано {0} файлов',
			error: 'Неудачное скачивание {0}'
		},
		message: 'Сообщение',
		mount: {
			successTitle: 'SD карта примонтирована',
			errorTitle: 'Ошибка монтирования SD карты'
		},
		newDirectory: {
			errorTitle: 'Ошибка создания папки',
			successTitle: 'Папка создана',
			successMessage: 'Успешно создана папка {0}'
		},
		newFilament: {
			errorTitle: 'Ошибка создания филамента',
			errorTitleMacros: 'Не удалось создать макрос филамента',
			successTitle: 'Филамент создан',
			successMessage: 'Успешно создан филамент {0}'
		},
		rename: {
			success: 'Успешно переименовано {0} в {1}',
			error: 'Ошибка переименования {0} в {1}',
		},
		renameFilament: {
			errorTitle: 'Ошибка переименования филамента',
			errorStillLoaded: 'Этот филамент используется. Выгрузите и попробуйте снова'
		},
		responseTooLong: 'Слишком долгий ответ, смотрите консоль',
		upload: {
			title: 'Загрузка {0} @ {1}, {2}%',
			message: 'Подождите, пока файл загрузится...',
			success: 'Загрузка of {0} успешна {1}',
			successMulti: 'Успешно загружено {0} файлов',
			error: 'Ошибка загрузки {0}'
		}
	},
	panel: {
		atx: {
			caption: 'Питание ATX',
			on: 'Вкл',
			off: 'Выкл'
		},
		babystepping: {
			caption: 'Z Babystepping',
			current: 'Текущий оффсет: {0}'
		},
		extrude: {
			caption: 'Контроль экструзии',
			mix: 'Микс',
			mixRatio: 'Соотношение микса:',
			amount: 'Длина {0}:',
			feedrate: 'Скорость подачи {0}:',
			retract: 'Ретракт',
			extrude: 'Экструзия'
		},
		extrusionFactors: {
			caption: 'Контроль подачи',
			changeVisibility: 'Настроить',
			extruder: 'Экструдер {0}',
			noExtruders: 'Нет экструдеров'
		},
		fan: {
			caption: 'Управление вентиляторами',
			selection: 'Выбор вентилятора:',
			toolFan: 'Обдув детали',
			fan: 'Вентилятор {0}'
		},
		fans: {
			caption: 'Охлаждение',
			changeVisibility: 'Настроить',
			toolFan: 'Обдув детали',
			fan: 'Вентилятор {0}',
			noFans: 'Нет вентиляторов'
		},
		heightmap: {
			scale: 'Масштаб:',
			orMore: 'больше',
			orLess: 'меньше',
			axes: 'Оси:',
			notAvailable: 'карта высот недоступна',
			numPoints: 'Количество точек: {0}',
			radius: 'Радиус замера: {0}',
			area: 'Область замера: {0}',
			maxDeviations: 'Макс. отклонения: {0} / {1}',
			meanError: 'Средняя ошибка: {0}',
			rmsError: 'RMS ошибка: {0}',
			topView: 'Вид сверху',
			colorScheme: 'Цветовая схема:',
			terrain: 'Рельеф',
			heat: 'Температура',
			reload: 'Перезагрузить карту высот'
		},
		jobControl: {
			caption: 'Контроль задания',
			cancelJob: 'Отменить задание',
			cancelPrint: 'Отменить печать',
			cancelSimulation: 'Отменить симуляцию',
			pauseJob: 'Приостановить',
			pausePrint: 'Пауза печати',
			pauseSimulation: 'Пауза симуляции',
			resumeJob: 'Продолжить задание',
			resumePrint: 'Продолжить печать',
			resumeSimulation: 'Продолжить симуляцию',
			repeatJob: 'Запустить снова',
			repeatPrint: 'Печатать снова',
			repeatSimulation: 'Симулировать снова',
			autoSleep: 'Включить авто сон'
		},
		jobData: {
			caption: 'Собранные данные',
			warmUpDuration: 'Время прогрева',
			currentLayerTime: 'Время текущего слоя',
			lastLayerTime: 'Время последнего слоя',
			jobDuration: 'Продолжительность работы'
		},
		jobEstimations: {
			caption: 'Расчеты на основе',
			filament: 'Использование филамента',
			file: 'Финиш через',
			layer: 'Время слоя',
			slicer: 'Слайсер',
			simulation: 'Симуляция'
		},
		jobInfo: {
			caption: 'Инфо о задании',
			height: 'Высота:',
			layerHeight: 'Высота слоя:',
			filament: 'Использование филамента:',
			generatedBy: 'Слайсер:'
		},
		movement: {
			caption: 'Перемещение эффектора',
			compensation: 'Компенсация и калибровка',
			runBed: 'Выравнивание стола (G32)',
			runDelta: 'Калибровка дельты (G32)',
			compensationInUse: 'Используется компенсация: {0}',
			disableBedCompensation: 'Отключить компенсацию стола (M561)',
			disableMeshCompensation: 'Отключить сетку стола (G29 S2)',
			editMesh: 'Область для сетки стола (M557)',
			runMesh: 'Замерить сетку стола (G29)',
			loadMesh: 'Загрузить карту высот с SD карты (G29 S1)',
			axesNotHomed: 'Оси не в нулевом положении:',
			noAxes: 'Нет осей'
		},
		settingsAbout: {
			caption: 'О системе',
			developedBy: 'Веб интерфейс разработан',
			for: 'для',
			licensedUnder: 'Лицензировано на условиях'
		},
		settingsAppearance: {
			caption: 'Внешний вид',
			darkTheme: 'Тёмная тема',
			language: 'Язык',
			binaryFileSizes: 'Использовать бинарный размер файлов',
			binaryFileSizesTitle: 'Размеры файлов отображаются в базисе 1024 (IEC) вместо 1000 (SI)',
			disableAutoComplete: 'Disable auto-complete',
			disableAutoCompleteTitle: 'Do not show auto-complete list when typing in code or temperature inputs'
		},
		settingsCommunication: {
			caption: 'Коммуникация',
			pingInterval: 'PING интервал при простое (мс)',
			ajaxRetries: 'Максимальное количество AJAX повторов',
			updateInterval: 'Интервал обновления({0})',
			extendedUpdateEvery: 'Интервал обновления расширенного статуса',
			fileTransferRetryThreshold: 'Порог повтора для передачи файлов ({0})',
			crcUploads: 'Для загрузки используйте контрольные суммы CRC32',
			unavailable: 'Нет доступных настроек'
		},
		settingsElectronics: {
			caption: 'Электроника',
			diagnostics: 'Диагностика',
			board: 'Плата: {0}',
			firmware: 'Прошивка: {0} ({1})',
			dwsFirmware: 'Версия сервера Duet WiFi: {0}',
			updateNote: 'Вы можете установить обновления в Менеджере файлов - Система.'
		},
		settingsEndstops: {
			caption: 'Конечный выключатель',
			index: 'указатель',
			triggered: 'инициированный'
		},
		settingsGeneral: {
			caption: 'Установки',
			factoryReset: 'Вернуть заводские установки',
			settingsStorageLocal: 'Сохранять настройки в локальном хранилище',
			settingsSaveDelay: 'Интервал обновления изменения настроек ({0})',
			cacheStorageLocal: 'Сохранять кэш в локальном хранилище',
			cacheSaveDelay: 'Интервал обновления изменения кэша ({0})'
		},
		settingsListItems: {
			caption: 'Настройка пресетов',
			toolTemperatures: 'Температура сопла',
			bedTemperatures: 'Температура стола',
			chamberTemperatures: 'Температура термокамеры',
			spindleRPM: 'Частота вращения шпинделя'
		},
		settingsMachine: {
			caption: 'Установки устройства',
			revertDWC: 'Обратно к DWC1',
			babystepAmount: 'Шаг Babystep ({0})',
			moveFeedrate: 'Скорость перемещения при управлении из DWC2 {0})'
		},
		settingsNotifications: {
			caption: 'Уведомления',
			notificationErrorsPersistent: 'Не закрывать сообщения об ошибках автоматически',
			notificationTimeout: 'Тайм-аут уведомления ({0})'
		},
		settingsWebcam: {
			caption: 'Камера',
			webcamURL: 'URL камеры (опционально)',
			webcamUpdateInterval: 'Интервал обновления камеры ({0})',
			webcamLiveURL: 'URL-адрес, который открывается при нажатии на изображение с веб-камеры (необязательно)',
			webcamFix: 'Не добавлять доп. спецификатор HTTP при перезагрузке изображений',
			webcamEmbedded: 'Вписать картинку с камеры в кадр',
			webcamRotation: 'Поворот изображения',
			webcamFlip: 'Переворот изображения',
			flipNone: 'Нет',
			flipX: 'Переворот по X',
			flipY: 'Переворот по Y',
			flipBoth: 'Перевернуть по обоим'
		},
		speedFactor: {
			caption: 'Контроль скорости'
		},
		status: {
			caption: 'Статус',
			mode: 'Режим: {0}',
			toolPosition: 'Позиция эффектора',
			machinePosition: 'Позиция станка',
			extruders: 'Приводы экструдера',
			extruderDrive: 'Привод {0}',
			speeds: 'Скорости',
			requestedSpeed: 'Заданная скорость',
			topSpeed: 'Макс. скорость',
			sensors: 'Сенсоры',
			mcuTemp: 'Темп. MCU',
			minMax: 'Мин.: {0}, Макс.: {1}',
			vIn: 'Vin',
			v12: 'V12',
			fanRPM: 'Скорость вентилятора',
			probe: 'Z-датчик',
			noStatus: 'Нет статуса'
		},
		tools: {
			caption: 'Контроль нагрева',
			controlAll: 'Все',
			turnEverythingOff: 'Выключить всё',
			allActiveTemperatures: 'Темп. активного режима',
			allStandbyTemperatures: 'Темп. режима ожидания',
			tool: 'Уст-во {0}',
			loadFilament: 'Загрузить филамент',
			changeFilament: 'Сменить филамент',
			unloadFilament: 'Вывод филамента',
			heater: 'Статус {0}',
			current: 't°C ',
			active: 'Акт.',
			standby: 'Ожидание',
			bed: 'Стол {0}',
			chamber: 'Термокамера {0}',
			extra: {
				caption: 'Доп.',
				sensor: 'Сенсор',
				sensorIndex: 'Сенсор {0}',
				value: 'Значение',
				showInChart: 'Показывать график',
				noItems: 'Нет Сенсор нагревателей'
			},
			noTools: 'Нет устройств'
		},
		webcam: {
			caption: 'Обзор камеры',
			alt: '(картинка с камеры)'
		}
	}
}
