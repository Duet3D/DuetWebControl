// 注释：Version 2.0.0-RC7
// 注释：https://github.com/chrishamm/DuetWebControl/tree/2.0.0-RC7/src/i18n
export default {
	language: '简体中文',
	'$vuetify': {
		dataIterator: {
			rowsPerPageText: '每页项目:',
			rowsPerPageAll: '所有',
			pageText: '{0}-{1} 共{2}',
			noResultsText: '没有找到匹配的记录',
			nextPage: '下一页',
			prevPage: '上一页'
		},
		dataTable: {
			rowsPerPageText: '每页行数：'
		},
		noDataText: '没有可用数据'
	},
	button: {
		add: {
			caption: '添加'
		},
		connect: {
			connect: '连接',
			connecting: '正在连接...',
			disconnect: '断开连接',
			disconnecting: '正在断开连接...'
		},
		emergencyStop: {
			caption: '紧急停止',
			title: '强制立即进行软件重置(M112+M999)'
		},
		home: {
			caption: '归位 {0}',
			captionAll: '全部归位',
			title: '归位{0}轴(G28 {0})',
			titleAll: '归位所有轴(G28)'
		},
		newDirectory: {
			caption: '新建目录'
		},
		newFilament: {
			caption: '新建细丝'
		},
		newFile: {
			caption: '新建文件'
		},
		refresh: {
			caption: '刷新'
		},
		upload: {
			gcodes: {
				caption: '上传G-Code文件',
				title: '上传一个或多个G-Code文件（也支持拖放）'
			},
			start: {
				caption: '上传并开始',
				title: '上传和启动一个或多个G代码文件（也支持拖放）'
			},
			macros: {
				caption: '上传宏文件',
				title: '上传一个或多个宏文件（也支持拖放）'
			},
			filaments: {
				caption: '上传细丝配置',
				title: '上传一个或多个细丝配置（也支持拖放）'
			},
			display: {
				caption: '上传菜单文件',
				title: '上传一个或多个菜单文件（也支持拖放）'
			},
			sys: {
				caption: '上传系统文件',
				title: '上传一个或多个系统文件（也支持拖放）'
			},
			www: {
				caption: '上传Web文件',
				title: '上传一个或多个Web文件（也支持拖放）'
			},
			update: {
				caption: '上传更新',
				title: '上传更新包（也支持拖放）'
			}
		}
	},
	chart: {
		layer: {
			caption: '层图表',
			layerTime: '层时间',

			showLastLayers: '显示最近{0}层',
			showAllLayers: '显示所有层',

			layer: '层{0}',
			layerDuration: '持续时间：{0}',
			layerHeight: '层高度：{0}',
			filamentUsage: '细丝用量：{0}',
			fractionPrinted: '文件进度：{0}'
		},
		temperature: {
			caption: '温度图表',
			heater: '加热器{0}',
			noData: '没有数据'
		}
	},
	dialog: {
		changeMoveStep: {
			title: '改变移动步骤',
			prompt: '请为单击的移动按钮输入新值：'
		},
		configUpdated: {
			title: '重启主板？',
			prompt: '您是否要重新启动主板，并应用更新后的配置？'
		},
		connect: {
			title: '连接到机器',
			prompt: '请输入您要连接的机器的主机名和密码：',
			hostPlaceholder: '主机名',
			hostRequired: '主机名是必需的',
			passwordPlaceholderOptional: '密码（可选）',
			passwordPlaceholder: '密码',
			passwordRequired: '密码是必需的',
			connect: '连接'
		},
		connection: {
			connecting: '正在连接...',
			disconnecting: '正在断开连接...',
			reconnecting: '连接丢失，尝试重新连接...',
			standBy: '请等待...'
		},
		editExtrusionAmount: {
			title: '编辑挤出量',
			prompt: '请为点击按钮输入新的数值：'
		},
		editExtrusionFeedrate: {
			title: '编辑挤出机进给速度',
			prompt: '请为单击按钮输入新的进给速度：'
		},
		factoryReset: {
			title: '恢复出厂设置？',
			prompt: '您确定要执行恢复出厂设置吗？ 所有保存的设置都将丢失。'
		},
		filament: {
			titleChange: '改变细丝',
			titleLoad: '载入细丝',
			prompt: '请选择细丝：'
		},
		fileEdit: {
			gcodeReference: 'G-Code参考',
			menuReference: '菜单参考',
			save: '保存',
			confirmClose: 'The file has been changed. If you proceed, your changes will be lost.'
		},
		meshEdit: {
			title: '设置网格参数',
			radius: '探针半径',
			spacing: '间距',
			startCoordinate: '从{0}方向开始坐标',
			endCoordinate: '从{0}方向结束坐标',
			spacingDirection: '{0}方向上间距'
		},
		newDirectory: {
			title: '新建目录',
			prompt: '请输入新建目录名称：'
		},
		newFilament: {
			title: '新建细丝',
			prompt: '请输入新建细丝名称：'
		},
		newFile: {
			title: '新建文件',
			prompt: '请输入新建文件名称：'
		},
		renameFile: {
			title: '重命名文件或者目录',
			prompt: '请输入一个新的名称：'
		},
		resetHeaterFault: {
			title: '重置加热器故障',
		prompt: '加热器{0}发生加热器故障。强烈建议立即关闭机器并在继续之前检查接线。 如果您确认这不是硬件问题，您可以重置加热器故障，【自担风险】！请注意这是【不推荐】的，可能会导致进一步的问题。 你想怎样处理？',
			resetFault: '重置故障'
		},
		runMacro: {
			title: '运行{0}',
			prompt: '你想要运行宏{0}吗？'
		},
		startJob: {
			title: '开始{0}',
			prompt: '你想要开始任务{0}吗？?'
		},
		update: {
			title: '安装更新？',
			prompt: '您已上传至少一个固件更新。 你想现在安装吗？'
		},
		inputRequired: '请输入一个值',
		numberRequired: '请输入有效的数值'
	},
	directory: {
		display: '菜单目录',
		filaments: '细丝目录',
		gcodes: 'G-Codes目录',
		macros: '宏目录',
		sys: '系统目录',
		www: 'WWW目录'
	},
	error: {
		notImplemented: '{0}没有实施',
		invalidPassword: '无效的密码！',
		noFreeSession: '没有更多的空闲会话！',
		connect: '无法连接到{0}',
		disconnect: '无法与{0}彻底断开连接',
		disconnected: '无法完成操作，因为连接已终止',
		cancelled: '操作已取消',
		network: '网络错误',
		timeout: 'HTTP请求超时',
		driveUnmounted: '目标驱动器已卸载',
		directoryNotFound: '目录{0}不存在',
		fileNotFound: '文件{0}不存在',
		invalidHeightmap: '无效高度图',
		operationFailed: '操作失败（原因：{0}）',
		uploadStartWrongFileCount: '只能上传和启动单个文件',
		uploadNoSingleZIP: '一次只能上传一个ZIP文件',
		uploadNoFiles: '此ZIP不包含任何可用文件',
		uploadDecompressionFailed: '无法解压缩ZIP文件',
		codeResponse: '无法运行代码，因为收到了错误的响应',
		codeBuffer: '可以运行代码，因为缓冲区空间已用完',
		enterValidNumber: '请输入有效的数值',
		turnOffEverythingFailed: '无法关闭所有内容',
		filelistRequestFailed: '无法获取文件列表',
		fileinfoRequestFailed: '无法获取文件{0}的信息',
		filamentsLoadFailed: '无法加载细丝',
		move: '从{0}移动到{1}失败'
	},
	events: {
		connected: '已连接到{0}',
		connectionLost: '无法保持与{0}的连接',
		emergencyStop: '紧急停止，试图重新连接......',
		reconnecting: '连接中断，尝试重新连接...',
		reconnected: '连接已建立',
		disconnected: '与{0}断开连接'
	},
	generic: {
		ok: '确定',
		cancel: '取消',
		yes: '是',
		no: '否',
		close: '关闭',
		reset: '重设？？？',
		noValue: 'n/a',
		loading: '正在载入',
		error: '错误',
		info: '信息',
		warning: '警告',
		success: '成功',
		heaterStates: [
			'关闭',
			'待机',
			'活动',
			'故障',
			'正在调整？？？',
			'offline'
		],
		status: {
			updating: '正在更新',
			off: '关闭',
			halted: '已停止',
			pausing: '正在暂停',
			paused: '已暂停',
			resuming: '正在恢复',
			printing: '正在打印',
			processing: '正在处理',
			simulating: '正在模拟',
			busy: '忙',
			changingTool: '改变工具',
			idle: '空闲',
			unknown: '未知'
		},
		rpm: '转速RPM',
		sdCard: 'SD卡{0}',
		mounted: '装载',
		notMounted: '没有装载',
		extracting: '正在提取',
		uploading: '正在上传',
		active: '活动',
		standby: '待机'
	},
	input: {
		code: {
			send: '发送',
			placeholder: '发送代码...'
		},
		addTemperature: '新的温度值',
		addRPM: '新的转速值'
	},
	jobProgress: {
		simulating: '正在模拟{0}, {1} 完成',
		simulated: '已模拟{0}, 100 % 完成',
		processing: '正在处理{0}, {1}完成',
		processed: '已处理{0}, 100 % 完成',
		printing: '正在打印{0}, {1}完成',
		printed: '已打印{0}, 100 %完成',
		noJob: '没有任务在运行.',
		layer: '第{0}层，共{1}层',
		filament: '细丝用量 {0}',
		filamentRemaining: '{0}剩余'
	},
	list: {
		baseFileList: {
			fileName: '文件名',
			size: '大小',
			lastModified: '最后修改',
			download: '下载文件',
			edit: '编辑文件',
			rename: '重命名',
			delete: '删除',
			downloadZIP: '下载为ZIP',
			noFiles: '没有文件或者目录',
			goUp: '转到顶部'
		},
		display: {
			noFiles: '没有文件可显示'
		},
		eventLog: {
			date: '日期',
			type: '类型',
			message: '事件',
			noEvents: '没有事件',
			clear: '清理',
			downloadText: '下载为文本文件',
			downloadCSV: '下载为CSV格式'
		},
		filament: {
			noFilaments: '没有细丝'
		},
		macro: {
			caption: '宏',
			noMacros: '没有宏文件',
			run: '运行宏',
			root: '根目录'
		},
		jobs: {
			height: '对象高度',
			layerHeight: '层高度',
			filament: '细丝用量',
			printTime: '打印时间',
			simulatedTime: '模拟时间',
			generatedBy: '生成由',

			noJobs: '没有任务',
			start: '开始任务文件',
			simulate: '模拟文件'
		},
		sys: {
			noFiles: '没有系统文件'
		}
	},
	menu: {
		control: {
			caption: '机器控制',
			dashboard: '仪表板',
			console: '控制台',
			heightmap: '高度图'
		},
		job: {
			caption: '当前任务',
			status: '状态',
			webcam: '摄像头',
			visualiser: '显示'
		},
		files: {
			caption: '文件管理',
			jobs: '任务',
			filaments: '细丝',
			macros: '宏',
			display: '显示',
			system: '系统',
			web: 'Web'
		},
		settings: {
			caption: '设置',
			general: '常规',
			machine: '机器特性',
			update: '更新'
		}
	},
	notification: {
		compress: {
			title: '正在压缩文件...',
			message: '你的文件已经开始压缩，请等待...',
			errorTitle: '压缩文件失败'
		},
		delete: {
			errorTitle: '删除{0}失败',
			errorMessageDirectory: '请确保此目录为空',
			success: '已成功删除{0}',
			successMultiple: '已成功删除{0}个项目'
		},
		deleteFilament: {
			errorTitle: '删除细丝失败',
			errorStillLoaded: '仍然装载至少一根选定的细丝。 请在继续之前卸载它',
			errorSubDirectories: '细丝{0}包含子目录。 请手动删除它们，然后重试。'
		},
		download: {
			title: '正在下载{0} @ {1}, {2}%完成',
			message: '文件已经开始下载，请等待...',
			success: '已成功下载{0}，总计{1}',
			successMulti: '已成功下载{0}文件',
			error: '下载{0}失败'
		},
		loadingFile: {
			title: '正在载入文件...',
			message: '此文件相对较大，因此可能需要一段时间才能显示。'
		},
		message: '消息',
		mount: {
			successTitle: 'SD卡已装载',
			errorTitle: '装载SD卡失败'
		},
		newDirectory: {
			errorTitle: '创建目录失败',
			successTitle: '目录已创建',
			successMessage: '创建目录{0}已完成'
		},
		newFilament: {
			errorTitle: '创建细丝失败',
			errorTitleMacros: '创建细丝宏失败',
			successTitle: '细丝已创建',
			successMessage: '创建细丝{0}已成功'
		},
		rename: {
			success: '成功重命名{0}为{1}',
			error: '重命名{0}为{1}失败',
		},
		renameFilament: {
			errorTitle: '重命名细丝失败',
			errorStillLoaded: '选定的细丝已装载。 请在继续之前卸载它'
		},
		responseTooLong: '响应时间过长，请查看控制台',
		upload: {
			title: '正在上传{0} @ {1}, {2}%完成',
			message: '文件已经开始上传，请等待...',
			success: '已成功上传{0}，总计{1}',
			successMulti: '已成功上传{0}文件',
			error: '上传{0}失败'
		}
	},
	panel: {
		atx: {
			caption: 'ATX电源',
			on: '开',
			off: '关'
		},
		babystepping: {
			caption: 'Z轴微调',
			current: '当前偏移: {0}'
		},
		extrude: {
			caption: '挤出机控制',
			mix: '混合',
			mixRatio: '混合比例：',
			amount: '进料量{0}:',
			feedrate: '进给速度{0}:',
			retract: '回退',
			extrude: '挤出'
		},
		extrusionFactors: {
			caption: '挤出机系数',
			changeVisibility: '改变可见性',
			extruder: '挤出机{0}',
			noExtruders: '没有挤出机'
		},
		fan: {
			caption: '风扇控制',
			selection: '风扇选择：',
			toolFan: '工具风扇',
			fan: '风扇{0}'
		},
		fans: {
			caption: '风扇',
			changeVisibility: '改变可见性',
			toolFan: '工具风扇',
			fan: '风扇{0}',
			noFans: '没有风扇'
		},
		heightmap: {
			scale: '比例尺：',
			orMore: '更大',
			orLess: '更小',
			axes: '轴：',
			notAvailable: '高度图无效',
			numPoints: '点数: {0}',
			radius: '探针半径: {0}',
			area: '探针面积: {0}',
			maxDeviations: '最大偏差: {0} / {1}',
			meanError: '平均误差: {0}',
			rmsError: '均方误差: {0}',
			topView: '顶视图',
			colorScheme: '配色方案:',
			terrain: '地形',
			heat: '热力',
			reload: '重载高度图'
		},
		jobControl: {
			caption: '任务控制',
			cancelJob: '取消任务',
			cancelPrint: '取消打印',
			cancelSimulation: '取消模拟',
			pauseJob: '暂停任务',
			pausePrint: '暂停打印',
			pauseSimulation: '暂停模拟',
			resumeJob: '恢复任务',
			resumePrint: '恢复打印',
			resumeSimulation: '恢复模拟',
			repeatJob: '重新开始',
			repeatPrint: '重新打印',
			repeatSimulation: '重新模拟',
			autoSleep: '启用自动睡眠'
		},
		jobData: {
			caption: '采集数据',
			warmUpDuration: '加热持续时间',
			currentLayerTime: '当前层时间',
			lastLayerTime: '最近层时间',
			jobDuration: '任务持续时间'
		},
		jobEstimations: {
			caption: '估计基于',
			filament: '细丝用量',
			file: '文件进度',
			layer: '层时间',
			slicer: '切片',
			simulation: '模拟'
		},
		jobInfo: {
			caption: '任务信息',
			height: '高度:',
			layerHeight: '层高:',
			filament: '细丝用量:',
			generatedBy: '生成由:'
		},
		movement: {
			caption: '机器移动',
			compensation: '补偿和校准',
			runBed: '真正的床铺平整(G32)',
			runDelta: 'Delta校准(G32)',
			compensationInUse: '使用补偿: {0}',
			disableBedCompensation: '禁用床补偿(M561)',
			disableMeshCompensation: '禁用网格补偿(G29 S2)',
			editMesh: '定义网格补偿区域(M557)',
			runMesh: '运行网格补偿(G29)',
			loadMesh: '从SD卡加载已保存的高度图(G29 S1)',
			axesNotHomed: '以下轴未归位:|以下轴未归位',
			noAxes: '没有轴'
		},
		settingsAbout: {
			caption: '关于',
			developedBy: 'Web界面开发：',
			for: ' 适用于：',
			licensedUnder: '中文翻译：宁甲尊， 许可条款：'
		},
		settingsAppearance: {
			caption: '外观',
			darkTheme: '黑色主题',
			language: '语言',
			binaryFileSizes: '适用二进制文件大小',
			binaryFileSizesTitle: '文件大小以1024（IEC）而不是1000（SI）为基础显示'
		},
		settingsCommunication: {
			caption: '通讯',
			pingInterval: '空闲时的PING间隔（ms）',
			ajaxRetries: '最大AJAX重试次数',
			updateInterval: '更新间隔（{0}）',
			extendedUpdateEvery: '扩展状态更新间隔',
			fileTransferRetryThreshold: '重试文件传输的阈值（{0}）',
			crcUploads: 'Use CRC32 checksums for uploads',
			unavailable: '没有可用的设置'
		},
		settingsElectronics: {
			caption: '电子器件',
			diagnostics: '诊断',
			board: '主板: {0}',
			firmware: '固件: {0} ({1})',
			dwsFirmware: 'Duet WiFi Server 版本: {0}',
			updateNote: '注意：您可以在“系统”页面上安装更新。'
		},
		settingsGeneral: {
			caption: '常规',
			factoryReset: '恢复出厂默认设置',
			settingsStorageLocal: '将设置保存在本地存储中',
			settingsSaveDelay: '设置更改的更新延迟({0})',
			cacheStorageLocal: '将缓存保存在本地存储中',
			cacheSaveDelay: '缓存更改的更新延迟({0})'
		},
		settingsEndstops: {
			caption: 'Endstops',
			index: 'Index',
			triggered: 'Triggered'
		},
		settingsListItems: {
			caption: '列表项目',
			toolTemperatures: '工具温度',
			bedTemperatures: '床温度',
			chamberTemperatures: '室温',
			spindleRPM: '轴转速'
		},
		settingsMachine: {
			caption: '机器特性',
			revertDWC: '返回到DWC1.X界面',
			babystepAmount: 'Z轴每个微调步进距离({0})',
			moveFeedrate: '移动按钮的进给速度({0})'
		},
		settingsNotifications: {
			caption: '通知',
			notificationErrorsPersistent: '不要自动关闭错误消息',
			notificationTimeout: '默认通知超时({0})'
		},
		settingsWebcam: {
			caption: '网络摄像头',
			webcamURL: '网络摄像头URL(可选)',
			webcamUpdateInterval: '网络摄像头更新间隔({0})',
			webcamFix: '重新加载图像时，请勿附加HTTP限定符',
			webcamEmbedded: '在iframe中嵌入网络摄像头图像',
			webcamRotation: '旋转网络摄像头图像',
			webcamFlip: '翻转网络摄像头图像',
			flipNone: '没有',
			flipX: '翻转X',
			flipY: '翻转Y',
			flipBoth: '翻转两者'
		},
		speedFactor: {
			caption: '速度系数'
		},
		status: {
			caption: '状态',
			mode: '模式：{0}',
			toolPosition: '工具位置',
			machinePosition: '机器位置',
			extruders: '挤出机驱动器',
			extruderDrive: '驱动器{0}',
			speeds: '速度',
			requestedSpeed: '请求速度',
			topSpeed: '最高速度',
			sensors: '传感器',
			mcuTemp: 'MCU温度',
			mcuTempTitle: '最小值：{0}，最大值：{1}',
			vIn: '输入电压',
			vInTitle: '最小值：{0}，最大值：{1}',
			fanRPM: '风扇转速RPM',
			probe: 'Z轴探针|Z轴探针',
			noStatus: '没有状态'
		},
		tools: {
			caption: '工具',
			controlAll: '控制所有',
			turnEverythingOff: '关闭所有',
			allActiveTemperatures: '设置所有活动温度',
			allStandbyTemperatures: '设置所有待机温度',
			tool: '工具{0}',
			loadFilament: '载入细丝',
			changeFilament: '更改细丝',
			unloadFilament: '卸载细丝',
			heater: '加热器{0}',
			current: '当前',
			active: '活动',
			standby: '待机',
			bed: '床{0}',
			chamber: '室温{0}',
			extra: {
				caption: '额外',
				sensor: '传感器',
				value: '值',
				showInChart: '在图表中显示',
				noItems: '没有额外加热器'
			},
			noTools: '没有工具'
		},
		webcam: {
			caption: '网络摄像头监控',
			alt: '(网络摄像头图像)'
		}
	}
}
