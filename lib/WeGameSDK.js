/**
 * Created by tedzhou on 15/11/4.
 */

(function () {

	var _logLocal = function (str) {
		window.request.log(str);
	};

	console.logLocal = function () {
		if (arguments && arguments.length > 0) {
			var paths = [];
			var stack = new Error().stack;
			if(stack) {
				var lines = stack.split('\n');
				lines.forEach(function (line, i) {
					if (i > 1) {
						var files = line.split('/');
						var file = files[files.length - 1];
						paths.push(file.replace(')', ''));
					}
				});
			}
			var info = {'arguments': arguments, 'paths': paths};
			console.info.apply(console, arguments);
			_logLocal(info);
		}
	};

	var isApollo = function () {
		return navigator.userAgent.indexOf("Apollo") >= 0;
	};

	//iframe加载器
	var iframeLoader = {
		pool: [],
		maxNum: 6,
		create: function () {
			var iframe = document.createElement('iframe');
			iframe.style.visibility = 'hidden';
			iframe.style.display = 'none';
			iframe.id = 'iframeLoader' + (this.pool.length + 1);
			document.body.appendChild(iframe);
			this.pool.push(iframe);
			return iframe;
		},
		isMaxConcurrent: function () {
			return (this.pool.length >= this.maxNum && !this.getAvailable())
		},
		getAvailable: function () {
			for (var i = 0, iframe; iframe = this['pool'][i]; i++) {
				if (iframe.available !== false) {
					return iframe;
				}
			}
			return null;
		},
		getEl: function () {
			return this.getAvailable() || this.create();
		},
		init: function () {}
	};

	iframeLoader.init.prototype = {
		load: function (url) {
			this.el = iframeLoader.getEl();
			this.el.available = false;
			this.el.src = url;
		},
		callback: function () {
			this.el.available = true;
		}
	};

	window.WeGame = (function (undefined) {
		var Protocol_Key = "wegame://";
		var Callback_Key = "callbackName";
		var Data_Key = "data";

		//请求池，由于连续发起href赋值知会执行最后一次，所以这里需要对所有的请求做异步
		var requestPool = [];

		//回调池
		var callbackPool = {};

		//push listener
		var pushListener;

		//requester
		var Requester = {};

		if (window.isInSocialPt) {
			//在社交平台WEB环境
			Requester = {
				request: function (pluginName, methodName, params, callback) {
					var callbackName = this.wrapCallback(callback, methodName);
					window.WEBRequest && window.WEBRequest({
						"pluginName": pluginName,
						"methodName": methodName,
						"params": params,
						"callback": function (data) {
							executeCallback(callbackName, data)
						}
					})
				},
				wrapCallback: function(callback, methodName){
					var timer = null;
					var called = false;
					var cb = (function (){
						if (called) {
							return;
						}
						called = true;

						clearTimeout(timer);
						if (callback) {
							callback.apply(window, arguments);
						}
					}).bind(this);

					var callbackName = callbackManager.addCallback(cb);

					timer = setTimeout(function () {
						//超时没返回
						callbackManager.deleteCallback(callbackName);
						console.error('超时没返回: ' + methodName);
						cb({code: -999, message: '超时没返回'});
					}, methodName == 'print' ? 1000: 15000);

					return callbackName;
				}
			};
		} else {
			//在终端环境下
			Requester = {
				request: function (pluginName, methodName, params, callback) {
					requestPool.push({
						"pluginName": pluginName,
						"methodName": methodName,
						"params": params,
						"callback": callback
					});
					this.trigger();
				},
				trigger: function () {
					if (iframeLoader.isMaxConcurrent()) { //达到最大并发
						return
					}

					if (requestPool.length <= 0) {
						return;
					}

					var data = requestPool.shift();
					this.doRequest(data.pluginName, data.methodName, data.params, data.callback);
				},
				wrapCallback: function(callback, methodName, loader){
					var timer = null;
					var called = false;
					var cb = (function (){
						loader.callback();
						if (called) {
							return;
						}
						called = true;

						clearTimeout(timer);
						if (callback) {
							callback.apply(window, arguments);
						}
						this.trigger();
					}).bind(this);

					var callbackName = callbackManager.addCallback(cb);
					var self = this;
					timer = setTimeout(function () {
						//超时没返回
						callbackManager.deleteCallback(callbackName);
						console.error('超时没返回' + loader.el.src);
						cb({code: -999, message: '客户端超时没返回'});
					}, methodName == 'print' ? 1000: 15000);

					return callbackName;
				},
				doRequest: function (pluginName, methodName, params, callback) {
					var self = this;
					var loader = new iframeLoader.init();
					var callbackName = self.wrapCallback(callback, methodName, loader);
					var url = Protocol_Key + pluginName + "/" + methodName + "/{\"" + Callback_Key + "\":\"" + callbackName + "\",\"" + Data_Key + "\":" + JSON.stringify(params) + "}";
					loader.load(url);
				}
			};
		}

		var executeCallback = function (callbackName, callbackData) {
			var method = callbackManager.getCallback(callbackName);
			if (method != null) {
				if (callbackData) {
					console.info("callbackName:", callbackName, "\t data:\n\t", callbackData);
				}
				if (callbackData == undefined) {
					method.call(method);
				} else {
					method.call(method, callbackData);
				}
				callbackManager.deleteCallback(callbackName);
			} else {
				// console.logLocal("callback:" + callbackName + ",not found.");
			}
		};

		var callbackManager = {
			addCallback: function (func) {
				var key = callbackManager.generateUnusedKey(func.name);
				callbackPool[key] = func;
				return key;
			},
			deleteCallback: function (key) {
				delete callbackPool[key];
			},
			getCallback: function (key) {
				return callbackPool[key];
			},
			generateUnusedKey: function (funcName) {
				var time = new Date().getTime();
				var _funcName = funcName || "anonymous";
				while (callbackPool[_funcName + "_" + time] != undefined) {
					time += 1;
				}
				return _funcName + "_" + time;
			}
		};

		var setPushListener = function (listener) {
			pushListener = listener;
		};

		var onPushReceived = function (data) {
			pushListener && pushListener(data);
		};

		/**
		 * 上报分数
		 * @param score 分数
		 * @param callback 上传完成的回调
		 **/
		var reportScore = function (score, callback) {
			var data = {
				"score": score
			};
			Requester.request("Reporter", "report", data, callback);
		};


		var log = function (log, type) {
			var data = {
				"log": log
			};
			if (type !== undefined) {
				data["type"] = type;
			}
			var callback = function () {
			};

			Requester.request("JSLog", "print", data, callback);
		};

		/**
		 * 匹配游戏
		 * @param gameId 游戏ID
		 * @param policy 模式
		 * @param callback
		 */
		var matchGame = function (gameId, policy, callback) {
			var data = {
				"gameId": gameId,
				"policy": policy
			};
			Requester.request("GameLogic", "matchGame", data, callback);
		};

		/**
		 * 获取游戏信息
		 * @param route 路由信息(透传matchGame返回的route即可)
		 * @param callback
		 * @param sequence 序列号，适用于指令型的游戏，21点这种可以不传
		 */
		var getGameData = function (route, sequence, callback) {
			var data = {
				"route": route,
				"sequence": sequence
			};
			Requester.request("GameLogic", "getGameData", data, callback);
		};

		/**
		 * 发送游戏指令
		 * @param cmd 游戏指令command
		 * @param sequence 序列号，传入客户端当前最大序列号+1，主要给后台做消息时序的判断
		 * @param route 路由信息(透传matchGame返回的route即可)
		 * @param gameData 游戏数据,JSON，具体字段参考各个游戏的具体协议，如game_21.proto等
		 * @param callback
		 */
		var doGameCommand = function (cmd, sequence, route, gameData, callback) {
			var data = {
				"cmd": cmd,
				"sequence": sequence,
				"route": route,
				"gameData": gameData
			};
			Requester.request("GameLogic", "doGameCommand", data, callback);
		};

		/**
		 * 退出游戏
		 * @param force 是否强退，1为强退，0为普通退出(在某些情况下只有强退才能成功退出)
		 * @param route 路由信息(透传matchGame返回的route即可)
		 * @param callback
		 */
		var exitGame = function (force, route, finishImmediately, callback) {
			var data = {
				"force": force,
				"route": route,
				"finishImmediately" : finishImmediately
			};
			Requester.request("GameLogic", "exitGame", data, callback);
		};

		var clickExit = function () {
			var callback = function(){};
			Requester.request("GameLogic", "clickExit", {}, callback);
		};

		var matchAgain = function (gameId, policyId) {
			var callback = function(){};
			var data = {
				gameId: gameId,
				policyId: policyId
			}
			Requester.request("GameLogic", "matchAgain", data, callback);
		};

		var playAgain = function (gameId, policyId, route, playerInfos) {
			var callback = function(){};
			var data = {
				gameId: gameId,
				policyId: policyId,
				route: route,
				playerInfos: playerInfos
			}
			Requester.request("GameLogic", "playOnceMore", data, callback);
		};

		var getLoginUserInfo = function (callback) {
			Requester.request("UserInfo", "getLoginUserInfo", {}, callback);
		};

		var getUserInfo = function (innerId, callback) {
			var data = {
				"innerId": innerId
			};
			Requester.request("UserInfo", "getUserInfo", data, callback);
		};

		var showUserInfoDialog = function (gameId, innerId) {
			var data = {
				"gameId" : gameId,
				"innerId": innerId
			};
			var callback = function () {
			};
			Requester.request("UserInfo", "showUserInfoDialog", data, callback);
		};

		var finish = function () {
			var data = {};
			var callback = function () {
			};
			Requester.request("GameLogic", "finish", data, callback);
		};

		var openResult = function (route, policyId, result) {
			var data = {
				"route": route,
				"policyId": policyId,
				"result": result
			};
			var callback = function () {
			};
			Requester.request("GameLogic", "openResult", data, callback);
		};

		var clickReport = function (gameId, name) {
			var data = {
				"gameId": gameId,
				"name": name
			};
			var callback = function () {
			};
			Requester.request("Reporter", "clickReport", data, callback);
		};

		var queryNetworkType = function (callback) {
			var data = {};
			Requester.request("Util", "queryNetworkType", data, callback);
		};

		var getAvatarUrl = function (avatarUrl, callback) {
			var data = {
				avatarUrl:avatarUrl
			};
			Requester.request("Util", "getAvatarUrl", data, callback);
		};

		var vibrate = function (duration) {
			var data = {
				"duration": duration
			};
			var callback = function () {
			};
			Requester.request("Util", "vibrate", data, callback);
		};

		var toast = function (message) {
			var data = {
				"message": message
			};
			var callback = function () {
			};
			Requester.request("Util", "toast", data, callback);
		};

		var cancelVibrate = function () {
			var data = {};
			var callback = function () {
			};
			Requester.request("Util", "cancelVibrate", data, callback);
		};

		var sendChat = function (route, messageId, callback) {
			var data = {
				"route": route,
				"messageId": messageId
			};
			Requester.request("GameChat", "sendChat", data, callback);
		};

		var getMusicState = function (callback) {
			var data = {};
			Requester.request("SoundManager", "getMusicState", data, function (result) {
				callback && callback(result.isEnableMusic)
			});
		};

		var getSoundState = function (callback) {
			var data = {};
			Requester.request("SoundManager", "getSoundState", data, function (result) {
				callback && callback(result.isEnableSound)
			});
		};

		var setMusicState = function (isEnableMusic, callback) {
			var data = {
				isEnableMusic: isEnableMusic
			};
			Requester.request("SoundManager", "setMusicState", data, callback);
		};

		var setSoundState = function (isEnableSound, callback) {
			var data = {
				isEnableSound: isEnableSound
			};
			Requester.request("SoundManager", "setSoundState", data, callback);
		};
		
		var submitSingleGameScore = function(gameId,score,beginTime,endTime,callback){
			var data = {
				"gameId" : gameId,
				"score" : score,
				"beginTime" : beginTime,
				"endTime" : endTime
			};
			Requester.request("SingleGameLogic","submitSingleGameScore",data,callback);
		}
		
		var openSingleGameResult = function(gameId,score,highestScore,callback){
			var data = {
				"gameId" : gameId,
				"score" : score,
				"highestScore" : highestScore
			};
			Requester.request("SingleGameLogic","openSingleGameResult",data,callback);
		}


		return {
			isApollo: isApollo,
			//执行回调，Native主调
			executeCallback: executeCallback,
			//Push到JavaScript，Native主调
			onPushReceived: onPushReceived,
			//打印log
			log: log,
			//设置Push Listener
			setPushListener: setPushListener,
			//匹配游戏
			matchGame: matchGame,
			//获取游戏信息
			getGameData: getGameData,
			//发送游戏指令
			doGameCommand: doGameCommand,
			//退出游戏
			exitGame: exitGame,
			//点击退出
			clickExit: clickExit,
			//重新匹配
			matchAgain: matchAgain,
			//再玩一盘
			playAgain: playAgain,
			//提交分数的方法
			reportScore: reportScore,
			//获取当前登录用户信息
			getLoginUserInfo: getLoginUserInfo,
			//获取当前登录用户信息
			getUserInfo: getUserInfo,
			//弹出用户信息对话框
			showUserInfoDialog : showUserInfoDialog,
			//关闭浏览器
			finish: finish,
			//打开原生的PK场结果页
			openResult: openResult,
			//点击上报
			clickReport: clickReport,
			//查询网络类型
			queryNetworkType: queryNetworkType,
			//震动
			vibrate: vibrate,
			//显示toast
			toast: toast,
			//取消震动
			cancelVibrate: cancelVibrate,
			//发送聊天
			sendChat: sendChat,
			//获取头像url
			getAvatarUrl: getAvatarUrl,
			//获取音乐状态
			getMusicState: getMusicState,
			//获取声音状态
			getSoundState: getSoundState,
			//设置音乐状态
			setMusicState: setMusicState,
			//设置声音状态
			setSoundState: setSoundState,
			//上报单机游戏分数
			submitSingleGameScore : submitSingleGameScore,
			//打开单机游戏结果
			openSingleGameResult : openSingleGameResult
		}
	})();


	/**
	 * Created by meanwang on 2015/9/9.
	 */
	window.push_receiver = (function () {
		var listeners = [];
		window.WeGame.setPushListener(function (data) {
			//Push listener
			for (var index in listeners) {
				listeners[index](data);
			}
		});
		return {
			addPushListener: function (listener) {
				var exists = false;
				for (var index in listeners) {
					if (listeners[index] == listener) {
						exists = true;
						break;
					}
				}

				if (!exists) {
					listeners.push(listener);
					console.logLocal("add listener success");
				}
			},
			removePushListener: function (listener) {
				for (var i = 0; i < listeners.length; i++) {
					if (listeners[i] == listener) {
						listeners.splice(i, 1);
						break;
					}
				}
			}
		}
	})();

	/**
	 * Created by meanwang on 2015/9/9.
	 */
	window.request = {
		log: function (log) {
			window.WeGame.log(log, '');
		},
		matchGame: function (gameId, policy, callback) {
			window.WeGame.matchGame(gameId, policy, callback);
		},
		getGameData: function (route, callback) {
			window.WeGame.getGameData(route, "0", callback);
		},
		getGameDataBySequence: function (route, sequence, callback) {
			window.WeGame.getGameData(route, sequence, callback);
		},
		doGameCommand: function (cmd, sequence, route, data, callback) {
			window.WeGame.doGameCommand(cmd, sequence, route, data, callback);
		},
		exitGame: function (force, route, callback) {
			window.WeGame.exitGame(force, route,true, callback);
		},
		clickExit: function () {
			window.WeGame.clickExit();
		},
		getLoginUserInfo: function (callback) {
			window.WeGame.getLoginUserInfo(callback);
		},
		getUserInfo: function (innerId, callback) {
			window.WeGame.getUserInfo(innerId, callback);
		},
		showUserInfoDialog : function(gameId, innerId){
			window.WeGame.showUserInfoDialog(gameId, innerId);
		},
		finish: function () {
			window.WeGame.finish();
		},
		openResult : function(route,policyId,result){
			window.WeGame.openResult(route,policyId,result);
		},
		clickReport : function(gameId,name){
			window.WeGame.clickReport(gameId,name);
		},
		queryNetworkType : function(callback){
			window.WeGame.queryNetworkType(callback);
		},
		getAvatarUrl : function(avatarUrl, callback){
			window.WeGame.getAvatarUrl(avatarUrl, callback);
		},
		vibrate : function(duration){
			window.WeGame.vibrate(duration);
		},
		toast : function(message){
			window.WeGame.toast(message);
		},
		cancelVibrate : function(){
			window.WeGame.cancelVibrate();
		},
		sendChat : function(route,messageId,callback){
			window.WeGame.sendChat(route,messageId,callback);
		},
		matchAgain : function(gameId, policyId){
			window.WeGame.matchAgain(gameId, policyId);
		},
		playAgain : function(gameId, policyId, route, playerInfos){
			window.WeGame.playAgain(gameId, policyId, route, playerInfos);
		},
		getMusicState : function(callback){
			window.WeGame.getMusicState(callback);
		},
		getSoundState : function(callback){
			window.WeGame.getSoundState(callback);
		},
		setMusicState : function(isEnableMusic, callback){
			window.WeGame.setMusicState(isEnableMusic, callback);
		},
		setSoundState : function(isEnableSound, callback){
			window.WeGame.setSoundState(isEnableSound, callback);
		},
		submitSingleGameScore : function(gameId,score,beginTime,endTime,callback){
			window.WeGame.submitSingleGameScore(gameId,score,beginTime,endTime,callback);
		},
		openSingleGameResult : function(gameId,score,highestScore,callback){
			window.WeGame.openSingleGameResult(gameId,score,highestScore,callback);
		}

	};


})();
