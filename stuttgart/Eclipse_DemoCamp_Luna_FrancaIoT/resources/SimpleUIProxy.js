function SimpleUIProxy() {
	this.socket = null;
	this.callID = 0;
}

SimpleUIProxy.prototype.getNextCallID = function() {
	this.callID = this.callID + 1;
	return this.callID;
};

// call to get the value of clock asynchronously
SimpleUIProxy.prototype.getClock = function() {
	var cid = this.getNextCallID();
	this.socket.send('[2, "get:clock:' + cid + '", "get:clock"]');
	return cid;
};

// call this method to subscribe for the changes of the attribute clock
SimpleUIProxy.prototype.subscribeClockChanged = function() {
	this.socket.send('[5, "signal:clock"]');
};

// call this method to unsubscribe from the changes of the attribute clock
SimpleUIProxy.prototype.unsubscribeClockChanged = function() {
	this.socket.send('[6, "signal:clock"]');
};

// call this method to invoke playMusic on the server side
SimpleUIProxy.prototype.playMusic = function(genre) {
	var cid = this.getNextCallID();
	this.socket.send('[2, "invoke:playMusic:' + cid + '", "invoke:playMusic", ' + JSON.stringify({"genre" : genre}) + ']');
	return cid;
};
// call this method to invoke startNavigation on the server side
SimpleUIProxy.prototype.startNavigation = function(street, city) {
	var cid = this.getNextCallID();
	this.socket.send('[2, "invoke:startNavigation:' + cid + '", "invoke:startNavigation", ' + JSON.stringify({"street" : street, "city" : city}) + ']');
	return cid;
};

SimpleUIProxy.prototype.connect = function(address) {
	var _this = this;
	
	// create WebSocket for this proxy	
	_this.socket = new WebSocket(address);

	_this.socket.onopen = function () {
		// subscribing for all broadcasts
		_this.socket.send('[5, "broadcast:updateVelocity"]');
		_this.socket.send('[5, "broadcast:playingTitle"]');
		if (typeof(_this.onOpened) === "function") {
			_this.onOpened();
		}
	};

	// store reference for this proxy in the WebSocket object
	_this.socket.proxy = _this;
	
	_this.socket.onclose = function() {
		if (typeof(_this.onClosed) === "function") {
			_this.onClosed();
		}
	};
	
	_this.socket.onmessage = function(data) {
		var message = JSON.parse(data.data);
		if (Array.isArray(message)) {
			var messageType = message.shift();
			
			// handling of CALLRESULT messages
			if (messageType === 3) {
				var tokens = message.shift().split(":");
				var mode = tokens[0];
				var name = tokens[1];
				var cid = tokens[2];
				
				if (mode === "get") {
					if (name === "clock" && typeof(_this.onGetClock) === "function") {
						_this.onGetClock(cid, message);
					}
				}
				else if (mode === "set") {
					if (name === "clock" && typeof(_this.onSetClock) === "function") {
						// no message is passed
						_this.onSetClock(cid);
					}
				}
				else if (mode === "invoke") {
					if (name === "playMusic" && typeof(_this.replyPlayMusic) === "function") {
						_this.replyPlayMusic(cid);
					}
					if (name === "startNavigation" && typeof(_this.replyStartNavigation) === "function") {
						// needs to parse the map which contains the multiple output parameters
						message = JSON.parse(message);
						_this.replyStartNavigation(cid, message["routeLength"], message["arrivalTime"]);
					}
				}
			}
			// handling of EVENT messages
			else if (messageType === 8) {
				var topicURI = message.shift();
				if (topicURI === "signal:clock" && typeof(_this.onChangedClock) === "function") {
					_this.onChangedClock(message);
				}
				if (topicURI === "broadcast:updateVelocity" && typeof(_this.signalUpdateVelocity) === "function") {
					_this.signalUpdateVelocity(message);
				}
				if (topicURI === "broadcast:playingTitle" && typeof(_this.signalPlayingTitle) === "function") {
					_this.signalPlayingTitle(message);
				}
			}
		}
	};	
};

// definition of enumeration 'Genre'
var Genre = function(){
	return {
		'M_NONE':0,
		'M_POP':1,
		'M_TECHNO':2,
		'M_TRANCE':3
	}
}();

