export default {
	language: 'Spanish',
	'$vuetify': {
		badge: 'Placa',
		close: 'Cerrar',
		dataIterator: {
			noResultsText: 'Ningún elemento coincide con la búsqueda',
			loadingText: 'Cargando...',
		},
		dataTable: {
			itemsPerPageText: 'Filas por página:',
			ariaLabel: {
				sortDescending: 'Orden descendente.',
				sortAscending: 'Orden ascendente.',
				sortNone: 'Sin ordenar.',
				activateNone: 'Pulse para quitar orden.',
				activateDescending: 'Pulse para ordenar descendente.',
				activateAscending: 'Pulse para ordenar ascendente.',
			},
			sortBy: 'Ordenado por',
		},
		dataFooter: {
			itemsPerPageText: 'Elementos por página:',
			itemsPerPageAll: 'Todos',
			nextPage: 'Página siguiente',
			prevPage: 'Página anterior',
			firstPage: 'Primer página',
			lastPage: 'Última página',
			pageText: '{0}-{1} de {2}',
		},
		datePicker: {
			itemsSelected: '{0} seleccionados',
		},
		noDataText: 'No hay datos disponibles',
		carousel: {
			prev: 'Visual anterior',
			next: 'Visual siguiente',
			ariaLabel: {
				delimiter: 'Carousel slide {0} of {1}',
			},
		},
		calendar: {
			moreEvents: '{0} más',
		},
		fileInput: {
			counter: '{0} archivos',
			counterSize: '{0} archivos ({1} en total)',
		},
		timePicker: {
			am: 'AM',
			pm: 'PM',
		},
	},
	button: {
		add: {
			caption: 'Añadir'
		},
		connect: {
			connect: 'Conectar',
			connecting: 'Conectando...',
			disconnect: 'Desconectado',
			disconnecting: 'Desconectando...'
		},
		emergencyStop: {
			caption: 'Parada de Emergencia',
			title: 'Reinicio inmediato del software (M112+M999)'
		},
		home: {
			caption: 'HOME {0}',
			captionAll: 'HOME (Todos)',
			title: 'HOME  {0} eje (G28 {0})',
			titleAll: 'HOME Todos los Ejes(G28)'
		},
		newDirectory: {
			caption: 'Nuevo Directorio'
		},
		newFilament: {
			caption: 'Nuevo Filamento'
		},
		newFile: {
			caption: 'Nuevo Archivo'
		},
		refresh: {
			caption: 'Actualizar'
		},
		reset: {
			caption: 'Máquina de reajustes',
			title: 'Envía M999 a la máquina para reiniciarla'
		},
		upload: {
			gcodes: {
				caption: 'Subir Archivo(s) G-Code',
				title: 'Subir uno o más archivos G-Code (se permite arrastrar y soltar)'
			},
			start: {
				caption: 'Subir e Iniciar',
				title: 'Subir e Iniciar impresión de uno o más archivos G-Code (se permite arrastrar y soltar)'
			},
			macros: {
				caption: 'Subir Archivo(s) Macro',
				title: 'Subir uno o más archivos Macro (se permite arrastrar y soltar)'
			},
			filaments: {
				caption: 'Subir Configuración de Filamento',
				title: 'Subir una o más configuración/es de Filamento/s (se permite arrastrar y soltar)'
			},
			menu: {
				caption: 'Subir Archivo(s) de Menu',
				title: 'Subir uno o más archivos de Menu (se permite arrastrar y soltar)'
			},
			system: {
				caption: 'Subir Archivo(s) de Sistema',
				title: 'Subir uno o más archivos de Sistema (se permite arrastrar y soltar)'
			},
			web: {
				caption: 'Subir Archivo(s) Web',
				title: 'Subir uno o más archivos Web (se permite arrastrar y soltar)'
			},
			update: {
				caption: 'Subir Actualización',
				title: 'Subir Actualización (se permite arrastrar y soltar)'
			}
		}
	},
	chart: {
		layer: {
			caption: 'Gráfico de Capas',
			layerTime: 'Gráfico de Temperaturas',

			showLastLayers: 'Ver Últimos {0} Capas',
			showAllLayers: 'Ver Todas las Capas',

			layer: 'Capa {0}',
			layerDuration: 'Duración: {0}',
			layerHeight: 'Altura de Capa: {0}',
			filamentUsage: 'Filamento Usado: {0}',
			fractionPrinted: 'Progreso de Archivo: {0}'
		},
		temperature: {
			caption: 'Grafico de Temeperaturas',
			heater: 'Heater {0}',
			noData: 'Sin Datos'
		}
	},
	dialog: {
		changeMoveStep: {
			
			title: 'Cambiar Numero de Pasos',
			prompt: 'Por favor, introduce el nuevo valor para el boton:'
		},
		configUpdated: {
			title: '¿Reiniciar Placa?',
			prompt: '¿Deseas reiniciar la placa para aplicar la nueva configuración?'
		},
		connect: {
			title: 'Conexión con la Máquina',
			prompt: 'Ingrese el nombre y la contraseña de la máquina a la que desea conectarse:',
			hostPlaceholder: 'Nombre',
			hostRequired: 'Es obligatorio introducir el nombre',
			passwordPlaceholderOptional: 'Contraseña (opcional)',
			passwordPlaceholder: 'Contraseña',
			passwordRequired: 'Es obligatorio introducir la contraseña',
			connect: 'Conectar'
		},
		connection: {
			connecting: 'Conectando...',
			disconnecting: 'Desconectando...',
			updating: 'Por favor, espere mientras se intalan las actualizaciones...',
			reconnecting: 'Conexión perdida, intentando volver a conectar...',
			standBy: 'Por favor, mantengase a la espera...'
		},
		editExtrusionAmount: {
			title: 'Editar la Cantidad de Extrusión',
			prompt: 'Por favor, introduzca el nuevo valor para el boton:'
		},
		editExtrusionFeedrate: {
			title: 'Editar la Velocidad de Avance de Extrusión',
			prompt: 'Por favor, introduzca el nuevo valor para el boton:'
		},
		factoryReset: {
			title: '¿Reestablecer Ajustes de Fábrica?',
			prompt: '¿Está seguro de que desea realizar un restablecimiento de fábrica? Todas las configuraciones guardadas se perderán.'
		},
		filament: {
			titleChange: 'Cambiar Filamento',
			titleLoad: 'Cargar Filamento',
			prompt: 'Por favor, elija un filamento:'
		},
		fileEdit: {
			gcodeReference: 'Referencia G-Code',
			menuReference: 'Referencia Menu',
			save: 'Guardar',
			confirmClose: 'El archivo ha sido cambiado. Si continúa, se perderán dichos cambios.'
		},
		meshEdit: {
			title: 'Establecer Parámetros de Malla',
			radius: 'Radio de Prueba',
			spacing: 'Espaciado',
			startCoordinate: 'Coordenada de inicio en {0} dirección',
			endCoordinate: 'Coordenada de fin en {0} dirección',
			spacingDirection: 'Espaciado en {0} dirección'
		},
		newDirectory: {
			title: 'Nuevo Directorio',
			prompt: 'Por favor, introduzca el nombre del Nuevo Directorio:'
		},
		newFilament: {
			title: 'Nuevo Filamento',
			prompt: 'Por favor, introduzca el nombre del Nuevo Filamento:'
		},
		newFile: {
			title: 'Nuevo Archivo',
			prompt: 'Por favor, introduzca el nombre del Nuevo Archivo:'
		},
		renameFile: {
			title: 'Renombrar Archivo o Directorio',
			prompt: 'Por favor, introduzca el nuevo nombre:'
		},
		resetHeaterFault: {
			title: 'Resetear Fallos de Heater',
			prompt: 'Se ha producido un fallo en el Heater{0}. Se recomienda encarecidamente apagar la máquina y comprobar la instalación antes de continuar. Si está absolutamente seguro de que no es un problema físico, puede restablecer el fallo de Heater BAJO SU RESPONSABILIDAD. Tenga en cuenta que esto NO SE RECOMIENDA y puede generar más problemas. ¿Cómo quieres proceder?',
			resetFault: 'Resetear Fallo'
		},
		runMacro: {
			title: 'Ejecutar {0}',
			prompt: '¿Quieres ejecutar {0}?'
		},
		startJob: {
			title: 'Iniciar {0}',
			prompt: '¿Quieres iniciar {0}?'
		},
		update: {
			title: '¿Instalar Actualización/es?',
			prompt: 'Has subido al menos una actualización de firmware. ¿Desea instalarla/s ahora?'
		},
		inputRequired: 'Por favor, introduzca un valor',
		numberRequired: 'Por favor, introduzca un número válido'
	},
	directory: {
		menu: 'Directorio: Menu',
		filaments: 'Directorio: Filamentos',
		gcodes: 'Directorio: G-Codes',
		macros: 'Directorio: Macros',
		system: 'Directorio: Sistema',
		web: 'Directorio: Web'
	},
	error: {
		notImplemented: '{0} no está implementado.',
		invalidPassword: '¡Contraseña Incorrecta!',
		noFreeSession: '¡No más sesiones libres!',
		connect: 'Fallo al conectar con: {0}',
		disconnect: 'No se pudo desconectar limpiamente de {0}',
		disconnected: 'No se pudo completar la acción porque la conexión ha finalizado',
		cancelled: 'La operación ha sido cancelada',
		network: 'Fallo de Red',
		timeout: 'Solicitud HTTP expirada',
		driveUnmounted: 'La unidad de destino está desmontada',
		directoryNotFound: 'Directorio {0} no encontrado',
		fileNotFound: 'Archivo {0} no encontrado',
		invalidHeightmap: 'Mapa de altura no válido',
		operationFailed: 'Operación fallida (Motivo: {0})',
		uploadStartWrongFileCount: 'Solo se puede subir e iniciar un único archivo',
		uploadNoSingleZIP: 'Solo se puede cargar un solo archivo ZIP a la vez',
		uploadNoFiles: 'Este ZIP no contiene nada utilizable',
		uploadDecompressionFailed: 'Error al descomprimir el archivo ZIP',
		codeResponse: 'No se pudo ejecutar el código porque se recibió una respuesta incorrecta',
		codeBuffer: 'No se puede ejecutar el código porque el espacio del búfer se ha agotado',
		enterValidNumber: 'Por favor, introduzca un número válido',
		turnOffEverythingFailed: 'No se pudo apagar todo',
		filelistRequestFailed: 'Error al obtener la lista de archivos',
		fileinfoRequestFailed: 'Error al obtener información del archivo para {0}',
		filamentsLoadFailed: 'Error al cargar filamentos',
		move: 'Error al mover {0} a {1}'
	},
	events: {
		connected: 'Conectado a {0}',
		connectionLost: 'Error al mantener la conexión con: {0}',
		emergencyStop: 'Parada de emergencia, intentando reconectar...',
		reconnecting: 'Conexión interrumpida, intentando reconectar...',
		reconnected: 'Conexión establecida',
		disconnected: 'Desconectado de: {0}'
	},
	generic: {
		ok: 'OK',
		cancel: 'Cancelar',
		yes: 'Si',
		no: 'No',
		close: 'Cerrar',
		reset: 'Resetear',
		noValue: 'n/a',
		loading: 'cargando',
		error: 'Error',
		info: 'Info',
		warning: 'Atención',
		success: 'Éxito',
		heaterStates: {
			off: 'apagado',
			standby: 'en espera',
			active: 'activo',
			fault: 'fallo',
			tuning: 'ajustando',
			offline: 'desconectado'
		},
		status: {
			updating: 'Actualizando',
			off: 'Off',
			halted: 'Detenido',
			pausing: 'Pausando',
			paused: 'Pausado',
			resuming: 'Reanudando',
			printing: 'Imprimiendo',
			processing: 'Procesando',
			simulating: 'Simulando',
			busy: 'Ocupado',
			changingTool: 'Cambiando Herramienta',
			idle: 'Disponible',
			unknown: 'Desconocido'
		},
		rpm: 'RPM',
		sdCard: 'Tarjeta SD {0}',
		mounted: 'montado',
		notMounted: 'no montado',
		extracting: 'Extrayendo',
		uploading: 'Actualizando',
		active: 'Activo',
		standby: 'En Espera'
	},
	input: {
		code: {
			send: 'Enviar',
			placeholder: 'Enviar Código...'
		},
		addTemperature: 'Nuevo valor de temperatura',
		addRPM: 'Nuevo valor predefinido'
	},
	
	jobProgress: {
		simulating: 'Simulando {0}, {1} completado',
		simulated: 'Simulando {0}, 100 % completado',
		processing: 'Procesando {0}, {1} completado',
		processed: 'Procesado {0}, 100 % completado',
		printing: 'Imprimiendo {0}, {1} completado',
		printed: 'Impreso {0}, 100 % completado',
		noJob: 'No se está ejecutando ningun trabajo',
		layer: 'Capa {0} de {1}',
		filament: 'Filamento usado: {0}',
		filamentRemaining: '{0} restante'
	},
	list: {
		baseFileList: {
			fileName: 'Nombre de Archivo',
			size: 'Tamaño',
			lastModified: 'Última modificación',
			download: 'Descargar Archivo',
			edit: 'Editar Archivo',
			rename: 'Renombrar',
			delete: 'Eliminar',
			downloadZIP: 'Descargar como ZIP',
			noFiles: 'No hay archivos y/o directorios',
			driveUnmounted: 'El disco no esta montado',
			goUp: 'Subir'
		},
		menu: {
			noFiles: 'No hay archivos que mostrar'
		},
		eventLog: {
			date: 'Fecha',
			type: 'Tipo',
			message: 'Evento',
			noEvents: 'Sin Eventos',
			clear: 'Limpiar',
			downloadText: 'Descargar como Texto',
			downloadCSV: 'Descargar como CSV'
		},
		filament: {
			noFilaments: 'No hay filamentos'
		},
		macro: {
			caption: 'Macros',
			noMacros: 'No hay macros',
			run: 'Ejecutar Macro',
			root: 'Raíz'
		},
		jobs: {
			height: 'Altura del objeto',
			layerHeight: 'Altura de capa',
			filament: 'Filamento en uso',
			printTime: 'Tiempo de impresion',
			simulatedTime: 'Tiempo simulado',
			generatedBy: 'Generado por',

			noJobs: 'Sin Trabajos',
			start: 'Iniciar Archivo',
			simulate: 'Simular Archivo'
		},
		system: {
			noFiles: 'Sin Archivos de Sistema',
			configToolNote: 'Editar desde Herramienta de Configuración'
		}
	},
	menu: {
		control: {
			caption: 'Control de maquina',
			dashboard: 'Cuadro de Mando',
			console: 'Consola',
			heightmap: 'Mapa de Altura'
		},
		job: {
			caption: 'Trabajo actual',
			status: 'Stado',
			webcam: 'Webcam',
			visualiser: 'Visualizador'
		},
		files: {
			caption: 'Gestor de Archivos',
			jobs: 'Trabajos',
			filaments: 'Filamentos',
			macros: 'Macros',
			menu: 'Monitor',
			system: 'Sistema',
			web: 'Web'
		},
		settings: {
			caption: 'Configuración',
			general: 'General',
			machine: 'Especificaciones de la máquina',
			update: 'Actualizar'
		}
	},
	notification: {
		compress: {
			title: 'Comprimiendo archivos ...',
			message: 'Espere mientras se comprimen los archivos...',
			errorTitle: 'Fallo al comprimir archivos'
		},
		delete: {
			errorTitle: 'Fallo al eliminar {0}',
			errorMessageDirectory: 'Asegúrese de que el directorio está vacío',
			success: 'Se ha borrado {0} con éxito',
			successMultiple: 'Se ha borrado {0} elementos con éxito'
		},
		deleteFilament: {
			errorTitle: 'Fallo al eliminar filamento(s)',
			errorStillLoaded: 'Al menos uno de los filamentos seleccionados todavía está cargado. Descárguelo antes de continuar',
			errorSubDirectories: 'El filamento {0} contiene subdirectorios. Elimínelos manualmente e intente de nuevo.'
		},
		download: {
			title: 'Descargando {0} @ {1}, {2}% completado',
			message: 'Espere mientras se descarga el archivo ...',
			success: 'Descargado con éxito {0} después de {1} ',
			successMulti: '{0} Archivos descargados con éxito',
			error: 'Fallo al descargar {0}'
		},
		message: 'Mensaje',
		mount: {
			successTitle: 'Tarjeta SD montada',
			errorTitle: 'Fallo al montar la tarjeta SD'
		},
		newDirectory: {
			errorTitle: 'Fallo al crear el directorio',
			successTitle: 'Directorio creado',
			successMessage: 'Directorio {0} creado con éxito'
		},
		newFilament: {
			errorTitle: 'Fallo al crear filamento',
			errorTitleMacros: 'Fallo al crear Macro de filamento',
			successTitle: 'Filamento creado',
			successMessage: 'Filamento {0} creado con éxito'
		},
		rename: {
			success: 'Renombrado {0} de {1} con éxito',
			error: 'Fallo al renombrar {0} de {1}',
		},
		renameFilament: {
			errorTitle: 'Fallo al renombrar filamento',
			errorStillLoaded: 'Este filamento todavía está cargado. Descárguelo antes de continuar'
		},
		responseTooLong: 'Respuesta demasiado larga, ver Consola',
		upload: {
			title: 'Subiendo {0} @ {1}, {2}% completado',
			message: 'Espere mientras se sube el archivo ...',
			success: 'Subido con éxito de {0} después de {1}',
			successMulti: 'Subido {0} archivo/s con éxito',
			error: 'Fallo al subir {0}'
		}
	},
	panel: {
		atx: {
			caption: 'ATX Power',
			on: 'On',
			off: 'Off'
		},
		babystepping: {
			caption: 'Z Babystepping',
			current: 'Offset Actual: {0}'
		},
		extrude: {
			caption: 'Control de Extrusion ',
			mix: 'Mix',
			mixRatio: 'Mix Ratio:',
			amount: 'Cantidad de material en {0}:',
			feedrate: 'Velocidad de Avance en{0}:',
			retract: 'Retracción',
			extrude: 'Extrusión'
		},
		extrusionFactors: {
			caption: 'Factores de extrusión',
			changeVisibility: 'Cambiar visibilidad',
			extruder: 'Extrusor {0}',
			noExtruders: 'No hay Extrusores'
		},
		fan: {
			caption: 'Control de Ventilador',
			selection: 'Seleccione Ventilador:',
			toolFan: 'Herramienta Ventilador',
			fan: 'Ventilador {0}'
		},
		fans: {
			caption: 'Ventiladores',
			changeVisibility: 'Cambiar visibilidad',
			toolFan: 'Herramienta Ventilador',
			fan: 'Ventilador {0}',
			noFans: 'No hay ventiladores'
		},
		heightmap: {
			scale: 'Escalar:',
			orMore: 'o aumentar',
			orLess: 'o disminuir',
			axes: 'Ejes:',
			notAvailable: 'mapa de altura no disponible',
			numPoints: 'Número de puntos: {0}',
			radius: 'Radio de prueba: {0}',
			area: 'Area de prueba: {0}',
			maxDeviations: 'Desviación Máxima: {0} / {1}',
			meanError: 'Error medio: {0}',
			rmsError: 'Error RMS: {0}',
			topView: 'Vista superior',
			colorScheme: 'Esquema de color:',
			terrain: 'Superficie',
			heat: 'Calor',
			reload: 'Recargar Mapa de Altura'
		},
		jobControl: {
			caption: 'Control de trabajo',
			cancelJob: 'Cancelar Trabajo',
			cancelPrint: 'Cancelar Impresión',
			cancelSimulation: 'Cancelar Simulación',
			pauseJob: 'Pausar Trabajo',
			pausePrint: 'Pausar Impresión',
			pauseSimulation: 'Pausar Simulación',
			resumeJob: 'Reanudar Trabajo',
			resumePrint: 'Reanudar Impresion',
			resumeSimulation: 'Reanudar Simulación',
			repeatJob: 'Iniciar de nuevo',
			repeatPrint: 'Imprimir de nuevo',
			repeatSimulation: 'Simular de nuevo',
			autoSleep: 'Habilitar suspensión automática'
		},
		jobData: {
			caption: 'Informacion (histórico)',
			warmUpDuration: 'Tiempo de calentamiento',
			currentLayerTime: 'Tiempo (capa actual)',
			lastLayerTime: 'Tiempo (última capa)',
			jobDuration: 'Duración del trabajo'
		},
		jobEstimations: {
			caption: 'Estimaciones basadas en',
			filament: 'Filamento usado',
			file: 'Progreso de archivo',
			layer: 'Tiempo de capa',
			slicer: 'Troceado',
			simulation: 'Simulación'
		},
		jobInfo: {
			caption: 'Información (trabajo)',
			height: 'Altura:',
			layerHeight: 'Altura de Capa:',
			filament: 'Filamento empleado:',
			generatedBy: 'Generado por:'
		},
		movement: {
			caption: 'Movimiento de Máquina',
			compensation: 'Compensación y Calibración',
			runBed: 'Compensación de Cama real (G32)',
			runDelta: 'Calibración Delta (G32)',
			compensationInUse: 'Valor de compensación: {0}',
			disableBedCompensation: 'Deshabilitar compensación de Cama (M561)',
			disableMeshCompensation: 'Deshabilitar compensacion de Malla (G29 S2)',
			editMesh: 'Definir Area de Malla de Compensación (M557)',
			runMesh: 'Ejecutar compensación de Malla (G29)',
			loadMesh: 'Cargar Mapa de compensación de altura guardado en tarjeta SD (G29 S1)',
			axesNotHomed: 'El siguiente eje no está ajustado: | Los siguientes ejes no están ajustados:',
			noAxes: 'No hay ejes'
		},
		settingsAbout: {
			caption: 'Acerca de',
			developedBy: 'Interface Web creada por',
			for: 'para',
			licensedUnder: 'Licencia bajo terminos de'
		},
		settingsAppearance: {
			caption: 'Apariencia',
			darkTheme: 'Thema Oscuro',
			language: 'Idioma',
			binaryFileSizes: 'Usar tamaños de archivo binarios',
			binaryFileSizesTitle: 'Los tamaños de archivo se muestran en base de 1024 (IEC) en lugar de 1000 (SI)',
			disableAutoComplete: 'Desactivar autocompletar',
			disableAutoCompleteTitle: 'No mostrar desplegable para autocompletar al escribir entradas de código o temperatura'
		},
		settingsCommunication: {
			caption: 'Comunicación',
			pingInterval: 'Intervalo PING cuando está inactivo (ms)',
			
			ajaxRetries: 'Número máximo de reintentos AJAX',
			updateInterval: 'Intervalo de actualización ({0})',
			extendedUpdateEvery: 'Intervalo de actualización de estado extendido',
			fileTransferRetryThreshold: 'Máximo número de intentos para transferencia de archivos ({0})',
			crcUploads: 'Usar CRC32 checksums para las subidas',
			unavailable: 'No hay configuraciones disponibles'
		},
		settingsElectronics: {
			caption: 'Electronica',
			diagnostics: 'Diagnosis',
			board: 'Placa: {0}',
			firmware: 'Firmware: {0} ({1})',
			dwsFirmware: 'Duet Versión Servidor WIFI: {0}',
			updateNote: 'Nota: puede instalar actualizaciones desde la página: Sistema.'
		},
		settingsEndstops: {
			caption: 'Finales de Carrera',
			index: 'Indice',
			triggered: 'Activado'
		},
		settingsGeneral: {
			caption: 'General',
			factoryReset: 'Volver a los valores predeterminados de fábrica',
			settingsStorageLocal: 'Guardar configuración en almacenamiento local',
			settingsSaveDelay: 'Retraso actualización para cambios de configuración ({0})',
			cacheStorageLocal: 'Guardar caché en almacenamiento local',
			cacheSaveDelay: 'Retraso actualización para cambios de caché ({0})'
		},
		settingsListItems: {
			caption: 'Lista de Elementos',
			toolTemperatures: 'Temperaturas Herramienta',
			bedTemperatures: 'Temperaturas Cama',
			chamberTemperatures: 'Temperatura habitáculo',
			spindleRPM: 'Spindle RPM'
		},
		settingsMachine: {
			caption: 'Especificaciones-Máquina',
			revertDWC: 'Revertir a DWC1',
			babystepAmount: 'Cantidad de Babystep ({0})',
			moveFeedrate: 'Avance para botones de movimiento ({0})'
		},
		settingsNotifications: {
			caption: 'Notificaciones',
			notificationErrorsPersistent: 'No cerrar mensajes de error de forma automática',
			notificationTimeout: 'Tiempo de espera predeterminado para notificaciones ({0})'
		},
		settingsWebcam: {
			caption: 'Webcam',
			webcamURL: 'Webcam URL (opcional)',
			webcamUpdateInterval: 'Intervalo Actualización Webcam ({0})',
			webcamLiveURL: 'URL para abrir cuando se hace clic en la imagen de la cámara web (opcional)',
			webcamFix: 'No añadir cabecera HTTP adicional recargar imágenes',
			webcamEmbedded: 'Incrustar imagen de cámara web en un iframe',
			webcamRotation: 'Rotar imagen Webcam',
			webcamFlip: 'Voltear imagen Webcam',
			flipNone: 'Ninguna',
			flipX: 'Voltear X',
			flipY: 'Voltear Y',
			flipBoth: 'Voltear ambos'
		},
		speedFactor: {
			caption: 'Factor Velocidad'
		},
		status: {
			caption: 'Estado',
			mode: 'Modo: {0}',
			toolPosition: 'Posición de la herramienta',
			machinePosition: 'Posición de la máquina',
			extruders: 'Motores Extrusores',
			extruderDrive: 'Motor {0}',
			speeds: 'Velocidades',
			requestedSpeed: 'Velocidad solicitada',
			topSpeed: 'Velocidad Máxima',
			sensors: 'Sensores',
			mcuTemp: 'Temperatura Placa',
			minMax: 'Minimo: {0}, Máximo {1}',
			vIn: 'Vin',
			v12: 'V12',
			fanRPM: 'Ventilador RPM',
			probe: 'Z-Sensor|Z-Sensores',
			noStatus: 'Sin Estado'
		},
		tools: {
			caption: 'Herramientas',
			controlAll: 'Controlar Todo',
			turnEverythingOff: 'Apagar Todo',
			allActiveTemperatures: 'Establecer todas las temperaturas activas',
			allStandbyTemperatures: 'Establecer todas las temperaturas en espera',
			tool: 'Herramienta {0}',
			loadFilament: 'Cargar Filamento',
			changeFilament: 'Cambiar Filamento',
			unloadFilament: 'Descargar Filamento',
			heater: 'Heater {0}',
			current: 'Actual',
			active: 'Activo',
			standby: 'En Espera',
			bed: 'Cama {0}',
			chamber: 'Habitáculo {0}',
			extra: {
				caption: 'Extra',
				sensor: 'Sensor',
				sensorIndex: 'Sensor {0}',
				value: 'Valor',
				showInChart: 'Mostrar en gráfico',
				noItems: 'No hay más Sensors'
			},
			noTools: 'Sin Herramientas'
		},
		webcam: {
			caption: 'Vigilancia por webcam',
			alt: '(imagen de la Webcam)'
		}
	}
}

