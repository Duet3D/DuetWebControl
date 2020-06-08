export default {
	language: 'French',
	'$vuetify': {
		badge: 'Badge',
		close: 'Fermer',
		dataIterator: {
			noResultsText: 'Aucun enregistrement correspondant trouvé',
			loadingText: "Chargement de l'élément...",
		},
		dataTable: {
			itemsPerPageText: 'Lignes par page:',
			ariaLabel: {
				sortDescending: 'Tri décroissant.',
				sortAscending: 'Tri croissant.',
				sortNone: 'Non trié.',
				activateNone: 'Activer pour supprimer le tri.',
				activateDescending: 'Activer pour trier par ordre décroissant.',
				activateAscending: 'Activer pour trier par ordre croissant.',
			},
			sortBy: 'Trier par',
		},
		dataFooter: {
			itemsPerPageText: 'Élements par page:',
			itemsPerPageAll: 'Tous',
			nextPage: 'Page suivante',
			prevPage: 'Page précédente',
			firstPage: 'Première page',
			lastPage: 'Dernière page',
			pageText: '{0}-{1} de {2}',
		},
		datePicker: {
			itemsSelected: '{0} sélectionnés',
		},
		noDataText: 'Aucune donnée disponible',
		carousel: {
			prev: 'Visuel précédent',
			next: 'Visuel suivant',
			ariaLabel: {
				delimiter: 'Carousel slide {0} of {1}',
			},
		},
		calendar: {
			moreEvents: '{0} plus',
		},
		fileInput: {
			counter: '{0} fichiers',
			counterSize: '{0} fichiers ({1} au total)',
		},
		timePicker: {
			am: 'AM',
			pm: 'PM',
		},
	},
	button: {
		add: {
			caption: 'Ajouter'
		},
		connect: {
			connect: 'Connecter',
			connecting: 'Connexion...',
			disconnect: 'Se déconnecter',
			disconnecting: 'Déconnexion...'
		},
		emergencyStop: {
			caption: 'Arrêt D\'Urgence',
			title: 'Forcer un redémarrage logiciel immédiat (M112+M999)'
		},
		home: {
			caption: 'Origine {0}',
			captionAll: 'Tout aux Origines',
			title: 'Déplace l\'axe {0} à son origine (G28 {0})',
			titleAll: 'Déplace tout les axes aux origines (G28)'
		},
		newDirectory: {
			caption: 'Nouveau Dossier'
		},
		newFilament: {
			caption: 'Nouveau Filament'
		},
		newFile: {
			caption: 'Nouveau Fichier'
		},
		refresh: {
			caption: 'Rafraîchir'
		},
		reset: {
			caption: 'Réinitialisation de la machine',
			title: 'Envoyez M999 à la machine pour la réinitialiser'
		},
		upload: {
			gcodes: {
				caption: 'Envoyer Fichier(s) G-Code',
				title: 'Envoyer un ou plusieurs fichiers G-Code (le glisser/déposer est supporté)'
			},
			start: {
				caption: 'Envoyer & Lancer',
				title: 'Envoyer & lancer un fichier G-Code (le glisser/déposer est supporté)'
			},
			macros: {
				caption: 'Envoyer Fichier(s) Macro',
				title: 'Envoyer un ou plusieurs fichiers macros (le glisser/déposer est supporté)'
			},
			filaments: {
				caption: 'Envoyer Configs Filament',
				title: 'Envoyer une ou plusieures configuration de filament (le glisser/déposer est supporté)'
			},
			menu: {
				caption: 'Envoyer Fichiers Menu',
				title: 'Envoyer un ou plusieurs fichiers menu (le glisser/déposer est supporté)'
			},
			system: {
				caption: 'Envoyer Fichiers Système',
				title: 'Envoyer un ou plusieurs fichiers système (le glisser/déposer est supporté)'
			},
			web: {
				caption: 'Envoyer Fichiers Web',
				title: 'Envoyer un ou plusieurs fichiers web (le glisser/déposer est supporté)'
			},
			update: {
				caption: 'Envoyer Mise à Jour',
				title: 'Envoyer un paquet de mise à jour (le glisser/déposer est supporté)'
			}
		}
	},
	chart: {
		layer: {
			caption: 'Graphique de Couche',
			layerTime: 'Temps de Couche',

			showLastLayers: 'Afficher les Dernières {0} Couches',
			showAllLayers: 'Afficher Toutes les Couches',

			layer: 'Couche {0}',
			layerDuration: 'Durée: {0}',
			layerHeight: 'Hauteur de Couche: {0}',
			filamentUsage: 'Utilisation de Filament: {0}',
			fractionPrinted: 'Progrès du Fichier: {0}'
		},
		temperature: {
			caption: 'Graphique de Température',
			heater: 'Chauffage {0}',
			noData: 'Aucune donnée'
		}
	},
	dialog: {
		changeMoveStep: {
			title: 'Modifier distance de mouvement',
			prompt: 'Merci d\'entrer une nouvelle valeur pour le bouton de mouvement cliqué:'
		},
		configUpdated: {
			title: 'Redémarrer la Carte?',
			prompt: 'Voulez-vous redémarrer la carte pour appliquer la mise à jour de la configuration?'
		},
		connect: {
			title: 'Connecter à la Machine',
			prompt: 'Merci d\'entrer le nom d\'hôte et le mot de passe de la machine à laquelle vous voulez vouz connecter:',
			hostPlaceholder: 'Nom d\'Hôte',
			hostRequired: 'Nom d\'Hôte requis',
			passwordPlaceholderOptional: 'Mot de Passe (optionnel)',
			passwordPlaceholder: 'Mot de Passe',
			passwordRequired: 'Mot de Passe requis',
			connect: 'Connexion'
		},
		connection: {
			connecting: 'Connexion...',
			disconnecting: 'Déconnexion...',
			updating: 'Veuillez patienter pendant l\'installation des mises à jour....',
			reconnecting: 'Connexion perdue, tentative de reconnexion...',
			standBy: 'Merci de patienter...'
		},
		editExtrusionAmount: {
			title: 'Modifier quantiter d\'extrusion',
			prompt: 'Merci d\'enter une nouvelle quantité pour le bouton cliqué:'
		},
		editExtrusionFeedrate: {
			title: 'Modifier vitesse d\'extrusion',
			prompt: 'Merci d\'entrer une nouvelle vitesse pour le bouton cliqué:'
		},
		factoryReset: {
			title: 'Effectuer une réinitialissation d\'usine?',
			prompt: 'Etes-vous sûr de vouloir éffectuer une réinitialisation d\'usine ? Tout les paramètres sauvegardés seront perdus.'
		},
		filament: {
			titleChange: 'Changer Filament',
			titleLoad: 'Charger Filament',
			prompt: 'Merci de choisir un filament:'
		},
		fileEdit: {
			gcodeReference: 'Références G-Code',
			menuReference: 'Référence Menu',
			save: 'Sauvegarder',
			confirmClose: 'Le fichier a été modifié. Si vous continuez, vos modifications seront perdues.'
		},
		meshEdit: {
			title: 'Définir Paramètres de Maillage',
			radius: 'Rayon de Palpage',
			spacing: 'Espacement',
			startCoordinate: 'Coordonnée de démarrage dans la direction {0}',
			endCoordinate: 'Coordonnée de fin dans la direction {0}',
			spacingDirection: 'Espacement dans la direction {0}'
		},
		newDirectory: {
			title: 'Nouveau Dossier',
			prompt: 'Merci d\'entrer un nom de nouveau dossier:'
		},
		newFilament: {
			title: 'Nouveau Filament',
			prompt: 'Merci d\'entrer un nom pour le nouveau filament:'
		},
		newFile: {
			title: 'Nouveau Fichier',
			prompt: 'Merci d\'entrer un nom de nouveau fichier:'
		},
		renameFile: {
			title: 'Renommer un Fichier ou Dossier',
			prompt: 'Merci d\'entrer un nouveau nom:'
		},
		resetHeaterFault: {
			title: 'Réinitialiser Défaut de Chauffage',
			prompt: 'Un défaut de chauffage s\'est produit sur le chauffage {0}. Il est fortement recommandé d\'éteindre la machine maintenant et vérifier votre câblage avant de continuer. Si vous êtes absolument sûr qu\'il n\'y a pas de problème physique, vous pouvez réinitialiser le défaut A VOS RISQUES ET PERILS. Soyez conscient que ce n\'est PAS RECOMMANDÉ et peut provoqué plus de problèmes. Comment voulez-vous proceder?',
			resetFault: 'Réinitialiser Défaut'
		},
		runMacro: {
			title: 'Lancer {0}',
			prompt: 'Voulez-vous lancer {0}?'
		},
		startJob: {
			title: 'Démarrer {0}',
			prompt: 'Voulez-vous démarrer {0}?'
		},
		update: {
			title: 'Installer Mise à Jour?',
			prompt: 'Vous avez envoyer au moins une mise à jour logiciel. Voulez-vous les installer maintenant?'
		},
		inputRequired: 'Merci d\'entrer une nouvelle valeur',
		numberRequired: 'Merci d\'entrer un nombre valide'
	},
	directory: {
		menu: 'Répertoire Menu',
		filaments: 'Répertoire Filaments',
		gcodes: 'Répertoire G-Codes',
		macros: 'Répertoire Macros',
		system: 'Répertoire Systeme',
		web: 'Répertoire WWW'
	},
	error: {
		notImplemented: '{0} n\'est pas implémenté',
		invalidPassword: 'Mauvais mot de passe!',
		noFreeSession: 'Plus de sessions libre!',
		connect: 'Échec de la connexion à {0}',
		disconnect: 'Impossible de se déconnecter correctement de {0}',
		disconnected: 'Impossible de compléter l\'action car la connexion s\'est terminée',
		cancelled: 'Opération annulée',
		network: 'Erreur réseau',
		timeout: 'Réquête HTTP expirée',
		driveUnmounted: 'Le lecteur cible est démonté',
		directoryNotFound: 'Répertoire {0} introuvable',
		fileNotFound: 'Fichier {0} introuvable',
		invalidHeightmap: 'Carte de Hauteur Invalide',
		operationFailed: 'Échec de l\'opération (Raison: {0})',
		uploadStartWrongFileCount: 'Seulement un fichier peut être envoyer & démarrer',
		uploadNoSingleZIP: 'Seulement un fichier ZIP peut être envoyé à la fois',
		uploadNoFiles: 'Ce ZIP ne contient aucun fichier utilisable',
		uploadDecompressionFailed: 'Échec de la décompression du fichier ZIP',
		codeResponse: 'Impossible d\'exécuter le code car une mauvaise réponse a été reçue',
		codeBuffer: 'Impossible d\'exécuter du code car l\'espace tampon est épuisé',
		enterValidNumber: 'Merci d\'entrer un nombre valide',
		turnOffEverythingFailed: 'Impossible de tout éteindre',
		filelistRequestFailed: 'Impossible d\'obtenir la liste des fichiers',
		fileinfoRequestFailed: 'Impossible d\'obtenir les informations du fichier pour {0}',
		filamentsLoadFailed: 'Impossible de charger le filament',
		move: 'Impossible de déplacer {0} à {1}'
	},
	events: {
		connected: 'Connecté à {0}',
		connectionLost: 'N\'a pas réussi à maintenir la connexion à {0}',
		emergencyStop: 'Arrêt d\'urgence, tentative de rebranchement...',
		reconnecting: 'Connexion interrompue, tentative de reconnexion...',
		reconnected: 'Connexion établie',
		disconnected: 'Déconnecté de {0}'
	},
	generic: {
		ok: 'OK',
		cancel: 'Annuler',
		yes: 'Oui',
		no: 'Non',
		close: 'Fermer',
		reset: 'Réinitialiser',
		noValue: 'n/a',
		loading: 'Chargement',
		error: 'Erreur',
		info: 'Info',
		warning: 'Attetion',
		success: 'Succès',
		heaterStates: {
			off: 'off',
			standby: 'veille',
			active: 'actif',
			fault: 'défaut',
			tuning: 'réglage',
			offline: 'offline'
		},
		status: {
			updating: 'Mise à Jour...',
			off: 'Off',
			halted: 'Interrompu',
			pausing: 'Mise en Pause',
			paused: 'Pause',
			resuming: 'Reprise',
			printing: 'Impression',
			processing: 'Traitement',
			simulating: 'Simulation',
			busy: 'Occupé',
			changingTool: 'Changement d\'Outil',
			idle: 'Au repos',
			unknown: 'Inconnu'
		},
		rpm: 'TPM',
		sdCard: 'Carte SD {0}',
		mounted: 'monté',
		notMounted: 'non monté',
		extracting: 'Extraction',
		uploading: 'Envoi en Cours',
		active: 'Actif',
		standby: 'Veille'
	},
	input: {
		code: {
			send: 'Envoyer',
			placeholder: 'Envoyer Code...'
		},
		addTemperature: 'Valeur de la nouvelle température',
		addRPM: 'Valeur du nouveau preset'
	},
	jobProgress: {
		simulating: 'Simulation {0}, {1} complète',
		simulated: 'Simulation {0}, 100 % complète',
		processing: 'Traitement {0}, {1} complet',
		processed: 'Traitement {0}, 100 % complet',
		printing: 'Impression {0}, {1} complète',
		printed: 'Impression {0}, 100 % complète',
		noJob: 'Aucun Travail en Cours.',
		layer: 'Couche {0} sur {1}',
		filament: 'Utilisation de Filament: {0}',
		filamentRemaining: '{0} restant'
	},
	list: {
		baseFileList: {
			fileName: 'Nom de fichier',
			size: 'Taille',
			lastModified: 'Dernière modification',
			download: 'Télécharger Fichier',
			edit: 'Modifier Fichier',
			rename: 'Renommer',
			delete: 'Supprimer',
			downloadZIP: 'Télécharger en ZIP',
			noFiles: 'Aucun Fichiers ou Répertoires',
			driveUnmounted: 'Le variateur n\'est pas monté',
			goUp: 'Remonter'
		},
		menu: {
			noFiles: 'Aucun Fichier d\'Affichage'
		},
		eventLog: {
			date: 'Date',
			type: 'Type',
			message: 'Événement',
			noEvents: 'Aucun Événement',
			clear: 'Effacer',
			downloadText: 'Télécharger en Texte',
			downloadCSV: 'Télécharger en CSV'
		},
		filament: {
			noFilaments: 'Aucun Filaments'
		},
		macro: {
			caption: 'Macros',
			noMacros: 'Aucun Macros',
			run: 'Lancer Macro',
			root: 'Source'
		},
		jobs: {
			height: 'Hauteur Objet',
			layerHeight: 'Hauteur de Couche',
			filament: 'Utilisation de Filament',
			printTime: 'Temps d\'Impression',
			simulatedTime: 'Temps Simulé',
			generatedBy: 'Généré par',

			noJobs: 'Aucun Travail',
			start: 'Lancer Fichier',
			simulate: 'Simuler Fichier'
		},
		system: {
			noFiles: 'Aucun Fichiers Système',
			configToolNote: 'éditer via l\'outil de configuration'
		}
	},
	menu: {
		control: {
			caption: 'Contrôle de la Machine',
			dashboard: 'Tableau de Bord',
			console: 'Console',
			heightmap: 'Carte de Hauteur'
		},
		job: {
			caption: 'Travail Actuel',
			status: 'Status',
			webcam: 'Webcam',
			visualiser: 'Visualiser'
		},
		files: {
			caption: 'Gestion de Fichiers',
			jobs: 'Travails',
			filaments: 'Filaments',
			macros: 'Macros',
			menu: 'Affichage',
			system: 'Système',
			web: 'Web'
		},
		settings: {
			caption: 'Paramètres',
			general: 'Général',
			machine: 'Spécifique à la Machine',
			update: 'Mise à Jour'
		}
	},
	notification: {
		compress: {
			title: 'Compression des fichiers...',
			message: 'Merci de vous tenir prêt pendant que vos fichiers se font compresser...',
			errorTitle: 'Échec de la compression des fichiers'
		},
		delete: {
			errorTitle: 'Impossible de supprimer {0}',
			errorMessageDirectory: 'Merci de vous assurez que ce dossier est vide',
			success: '{0} supprimé avec succès',
			successMultiple: '{0} objets supprimé avec succès'
		},
		deleteFilament: {
			errorTitle: 'Impossible de supprimer le(s) filament(s)',
			errorStillLoaded: 'Au moins un des filaments séléctionné est toujours chargé. Merci de les décharger avant de procéder',
			errorSubDirectories: 'Le filament {0} contient des sous-dossiers. Merci de les supprimer manuellement et réessayer.'
		},
		download: {
			title: 'Téléchargement {0} @ {1}, {2}% complet',
			message: 'Veuillez patienter pendant que le fichier est en téléchargement...',
			success: 'Téléchargement de {0} réussi après {1}',
			successMulti: 'Téléchargement de {0} fichiers réussi',
			error: 'Échec du téléchargement de {0}'
		},
		message: 'Message',
		mount: {
			successTitle: 'Carte SD Montée',
			errorTitle: 'Impossible de monter la carte SD'
		},
		newDirectory: {
			errorTitle: 'Échec de la création du dossier',
			successTitle: 'Dossier créer',
			successMessage: 'Création du dossier {0} réussi'
		},
		newFilament: {
			errorTitle: 'Échec de la création du filament',
			errorTitleMacros: 'Échec de la création des macros de filament',
			successTitle: 'Filament créé',
			successMessage: 'Création du filament {0} réusssi'
		},
		rename: {
			success: 'Renommage de {0} en {1} réussi',
			error: 'Échec du renommage de {0} en {1}',
		},
		renameFilament: {
			errorTitle: 'Échec du renommage du filament',
			errorStillLoaded: 'Ce filament est toujours chargé. Merci de le décharger avant de procéder'
		},
		responseTooLong: 'Réponse trop longue, voir la Console',
		upload: {
			title: 'Envoi {0} @ {1}, {2}% complet',
			message: 'Veuillez patienter pendant que le fichier est envoyé...',
			success: 'Envoi de {0} réussi après {1}',
			successMulti: 'Envoi de {0} fichiers réusssi',
			error: 'Échec de l\'envoi de {0}'
		}
	},
	panel: {
		atx: {
			caption: 'Contrôle de l\'alim',
			on: 'On',
			off: 'Off'
		},
		babystepping: {
			caption: 'Z Babystepping',
			current: 'Décalage Actuel: {0}'
		},
		extrude: {
			caption: 'Contrôle de l\'Extrusion',
			mix: 'Mix',
			mixRatio: 'Mix Ratio:',
			amount: 'Avance en {0}:',
			feedrate: 'Vitesse en {0}:',
			retract: 'Rétracter',
			extrude: 'Extruder'
		},
		extrusionFactors: {
			caption: 'Facteurs d\'Extrusion',
			changeVisibility: 'Changer Visibilité',
			extruder: 'Extruder {0}',
			noExtruders: 'Aucun Extruders'
		},
		fan: {
			caption: 'Contrôle des Ventilateurs',
			selection: 'Séléction du ventilateur:',
			toolFan: 'Ventilateur Outil',
			fan: 'Ventilateur {0}'
		},
		fans: {
			caption: 'Ventilateurs',
			changeVisibility: 'Changer Visibilité',
			toolFan: 'Ventilateur Outil',
			fan: 'Ventilateur {0}',
			noFans: 'Aucun Ventilateur'
		},
		heightmap: {
			scale: 'Échelle:',
			orMore: 'ou plus',
			orLess: 'ou moins',
			axes: 'Axes:',
			notAvailable: 'Carte de Hauteur non disponible',
			numPoints: 'Nombre de points: {0}',
			radius: 'Rayon de palpage: {0}',
			area: 'Zone de palpage: {0}',
			maxDeviations: 'Maximum déviations: {0} / {1}',
			meanError: 'Erreur moyenne: {0}',
			rmsError: 'Erreur RMS: {0}',
			topView: 'Vue du dessus',
			colorScheme: 'Schéma couleur:',
			terrain: 'Terrain',
			heat: 'Chaleur',
			reload: 'Recharger Carte de Hauteur'
		},
		jobControl: {
			caption: 'Contrôle du Travail',
			cancelJob: 'Annuler Travail',
			cancelPrint: 'Annuler Impression',
			cancelSimulation: 'Annuler Simulation',
			pauseJob: 'Pause Travail',
			pausePrint: 'Pause Impression',
			pauseSimulation: 'Pause Simulation',
			resumeJob: 'Reprendre  Travail',
			resumePrint: 'Reprendre Impression',
			resumeSimulation: 'Reprendre Simulation',
			repeatJob: 'Recommencer',
			repeatPrint: 'Réimprimer',
			repeatSimulation: 'Simuler à Nouveau',
			autoSleep: 'Activer Veille Automatique'
		},
		jobData: {
			caption: 'Données Collectés',
			warmUpDuration: 'Temps de Chauffe',
			currentLayerTime: 'Durée de la Couche Actuelle',
			lastLayerTime: 'Durée de la Dernière Couche',
			jobDuration: 'Durée du Travail'
		},
		jobEstimations: {
			caption: 'Estimations basée sur',
			filament: 'Utilisation de Filament',
			file: 'Progrès du Fichier',
			layer: 'Durée de la Dernière Couche',
			slicer: 'Trancheur',
			simulation: 'Simulation'
		},
		jobInfo: {
			caption: 'Information du Travail',
			height: 'Hauteur:',
			layerHeight: 'Hauteur de Couche:',
			filament: 'Utilisation de Filament:',
			generatedBy: 'Généré par:'
		},
		movement: {
			caption: 'Mouvement Machine',
			compensation: 'Compensation & Calibration',
			runBed: 'Vrai Nivellement du Lit (G32)',
			runDelta: 'Delta Calibration (G32)',
			compensationInUse: 'Compensation en utilisation: {0}',
			disableBedCompensation: 'Désactiver Compensation du Lit (M561)',
			disableMeshCompensation: 'Désactiver Mesh Compensation (G29 S2)',
			editMesh: 'Définir Zone pour la Mesh Compensation (M557)',
			runMesh: 'Lancer Mesh Compensation (G29)',
			loadMesh: 'Charger la Carte de Hauteur Sauvegardée (G29 S1)',
			axesNotHomed: 'L\'axe suivant  n\'a pas été à son origine:|Les axes suivants n\'ont pas été à leur origine:',
			noAxes: 'Pas d\'axes'
		},
		settingsAbout: {
			caption: 'À propos',
			developedBy: 'Interface web dévelopée par',
			for: 'pour',
			licensedUnder: 'Sous licence selon les termes de la'
		},
		settingsAppearance: {
			caption: 'Apparence',
			darkTheme: 'Thème Sombre',
			language: 'Langage',
			binaryFileSizes: 'Utiliser des tailles de fichiers binaires',
			binaryFileSizesTitle: 'Les tailles de fichier sont affichées avec une base de 1024 (IEC) au lieu de 1000 (SI)',
			disableAutoComplete: 'Disable auto-complete',
			disableAutoCompleteTitle: 'Do not show auto-complete list when typing in code or temperature inputs'
		},
		settingsCommunication: {
			caption: 'Communication',
			pingInterval: 'Intervalle PING au repos ({0})',
			ajaxRetries: 'Nombre maximal de tentatives AJAX',
			updateInterval: 'Intervalle de mise à jour ({0})',
			extendedUpdateEvery: 'Intervalle de mise à jour du statut étendu',
			fileTransferRetryThreshold: 'Limite d\'essais pour le transfert de fichiers ({0})',
			crcUploads: 'Utiliser les sommes de contrôle CRC32 pour les téléchargements',
			unavailable: 'Aucun réglage disponible.',
		},
		settingsElectronics: {
			caption: 'Électroniques',
			diagnostics: 'Diagnostiques',
			board: 'Circuit: {0}',
			firmware: 'Firmware: {0} ({1})',
			dwsFirmware: 'Duet WiFi Server Version: {0}',
			updateNote: 'Remarque: Vous pouvez installer les mises à jour sur la page Système.'
		},
		settingsEndstops: {
			caption: 'Interrupteur de position',
			index: 'Index',
			triggered: 'Déclenché'
		},
		settingsGeneral: {
			caption: 'Général',
			factoryReset: 'Revenir aux paramètres d\'usine',
			settingsStorageLocal: 'Sauvegarder les paramètres dans le stockage local',
			settingsSaveDelay: 'Délai de mise à jour pour les modifications de paramètres ({0})',
			cacheStorageLocal: 'Sauvegarder le cache dans le stockage local',
			cacheSaveDelay: 'Délai de mise à jour pour les modifications du cache ({0})'
		},
		settingsListItems: {
			caption: 'Liste des Éléments',
			toolTemperatures: 'Températures de l\'Outil',
			bedTemperatures: 'Températures du Lit',
			chamberTemperatures: 'Températures de la Chambre',
			spindleRPM: 'TPM du Spindle'
		},
		settingsMachine: {
			caption: 'Machine-Spécifique',
			revertDWC: 'Revenir à DWC1',
			babystepAmount: 'Montant Babystep ({0})',
			moveFeedrate: 'Vitesse pour les boutons de mouvement ({0})'
		},
		settingsNotifications: {
			caption: 'Notifications',
			notificationErrorsPersistent: 'Ne pas fermer les messages d\'erreur automatiquement',
			notificationTimeout: 'Délais d\'affichage des notifications par défaut ({0})'
		},
		settingsWebcam: {
			caption: 'Webcam',
			webcamURL: 'Webcam URL (optionnel)',
			webcamUpdateInterval: '>Intervale de màj de la Webcam ({0})',
			webcamLiveURL: 'URL à ouvrir lorsque l\'image de la webcam est cliquée (facultatif)',
			webcamFix: 'Ne pas ajouter de qualificatif HTTP supplémentaire lors du rechargement d\'images',
			webcamEmbedded: 'Incorporer l\'image de la webcam dans un iframe',
			webcamRotation: 'Pivoter l\'image de la webcam',
			webcamFlip: 'Retourner l\'image de la webcam',
			flipNone: 'Aucun',
			flipX: 'Retourner X',
			flipY: 'Retourner Y',
			flipBoth: 'Retourner les deux'
		},
		speedFactor: {
			caption: 'Facteur de Vitesse'
		},
		status: {
			caption: 'Status',
			mode: 'Mode: {0}',
			toolPosition: 'Position Outil',
			machinePosition: 'Position Machine',
			extruders: 'Extrudeuse',
			extruderDrive: 'Moteur {0}',
			speeds: 'Vitesses',
			requestedSpeed: 'Vitesse Demandée',
			topSpeed: 'Vitesses de Pointe',
			sensors: 'Capteurs',
			mcuTemp: 'Température MCU',
			minMax: 'Minimum: {0}, Maximum {1}',
			vIn: 'Vin',
			v12: 'V12',
			fanRPM: 'TPM Ventilateur',
			probe: 'Sonde-Z|Sondes-Z',
			noStatus: 'Pas de Statut'
		},
		tools: {
			caption: 'Outils',
			controlAll: 'Tout Contrôler',
			turnEverythingOff: 'Tout Éteindre',
			allActiveTemperatures: 'Définir toutes les températures actives',
			allStandbyTemperatures: 'Définir toutes les températures de veille',
			tool: 'Outil {0}',
			loadFilament: 'Charger Filament',
			changeFilament: 'Changer Filament',
			unloadFilament: 'Décharger Filament',
			heater: 'Chauffage {0}',
			current: 'Actuel',
			active: 'Actif',
			standby: 'Standby',
			bed: 'Lit {0}',
			chamber: 'Chambre {0}',
			extra: {
				caption: 'Extra',
				sensor: 'Capteur',
				sensorIndex: 'Capteur {0}',
				value: 'Valeur',
				showInChart: 'Afficher dans le Graphique',
				noItems: 'Pas de Capteur supplémentaire'
			},
			noTools: 'Pas d\'Outils'
		},
		webcam: {
			caption: 'Surveillance Webcam',
			alt: '(webcam image)'
		}
	}
}
