( function( $, window, document, undefined ) {
	
	function Aero() {
		if(!("WebSocket" in window)) {
			$('#logging').append('No websockets detected');
		} else {
			connect();
			WaypointMap = new Map();
			WaypointMap.Initialize();
		}
	};
	
	var WaypointMap, // Our google map object
	host = "192.168.2.10:24000", // Address
	socket, // Our socket object
	connected, // Keeping track of our state
	Packets = Object.freeze({ // Our packet structures/properties
		/** Packet Structure
			short: OpCode
			short: PayloadSize
			byte * PayloadSize: Base64 Img Data
		**/
		"AerialImage" : { 
			opcode : 0x106,
			name: "AerialImage",
			recv: function(buffer) {
                var timestamp = buffer.peek(2, buffer.VarType["uint"]);
				var imageID = buffer.peek(6, buffer.VarType["uint"]);
				var latitude = buffer.peek(10, buffer.VarType["float"]); 
				var longitude = buffer.peek(14, buffer.VarType["float"]); 
				var attitude = buffer.peek(18, buffer.VarType["float"]); 
				var heading = buffer.peek(22, buffer.VarType["float"]); 
				var pitchAngle = buffer.peek(26, buffer.VarType["float"]); 
				var rollAngle = buffer.peek(30, buffer.VarType["float"]);
				var urlLength = buffer.peek(34, buffer.VarType["uint"]);
				var maxLon = buffer.peek(38, buffer.VarType["float"]); 
				var minLat = buffer.peek(42, buffer.VarType["float"]); 
				var minLon = buffer.peek(46, buffer.VarType["float"]); 
				var maxLat = buffer.peek(50, buffer.VarType["float"]);
				var width = buffer.peek(54, buffer.VarType["uint"]);
				var height = buffer.peek(58, buffer.VarType["uint"]);
				var url = buffer.peek(62, buffer.VarType["char"], urlLength);
				
				var canvas = document.getElementById("image-canvas");
				// Scale canvas to maximize size of the image that is drawn
				// The canvas gets scaled down by the CSS afterwards to fit the page
				canvas.width = width;
				canvas.height = height;
				
				var context = canvas.getContext('2d');			
				var img = new Image();
				
				img.onload = function () {
					context.clearRect(0, 0, canvas.width, canvas.height);
					context.drawImage(this, 0, 0, canvas.width, canvas.height);
				};

				img.src = "http://" + host + "/" + url + ".jpg";
			}
		},				
		"ImgData" : { 
			opcode : 0x100,
			name: "ClientImageData",
			recv: function(buffer) {
				var width = buffer.peek(2, buffer.VarType["ushort"]);
				var height = buffer.peek(4, buffer.VarType["ushort"]);
				var size = buffer.peek(6, buffer.VarType["uint"]);
				var payload = buffer.peek(10, buffer.VarType["uchar"], size);
			
                console.log(payload); 

				var canvas = document.getElementById("image-canvas");
				// Scale canvas to maximize size of the image that is drawn
				// The canvas gets scaled down by the CSS afterwards to fit the page
				canvas.width = width;
				canvas.height = height;
				
				var context = canvas.getContext('2d');			
				var img = new Image();
				
				img.onload = function () {
					context.clearRect(0, 0, canvas.width, canvas.height);
					context.drawImage(this, 0, 0, canvas.width, canvas.height);
				};

				img.src = "http://" + host + "/" + payload + ".jpg";
				
				logmessage('<p>Received processed image ' + payload + '</p>');
			}
		},
		"Message" : { 
			opcode : 0x101,
			name: "ClientMessage",
			recv: function(buffer) {
			
				var len = buffer.peek(2, buffer.VarType["ushort"]);
				var message = buffer.peek(4, buffer.VarType["uchar"], len);
				logmessage('<p>Message received: ' + message + '</p>');
			}
		}
	});
	
	connect = function() {
		connected = false;
		
		socket = new WebSocket("ws://" + host);
		socket.binaryType = "arraybuffer";

		$('#console-status-text').html("Connecting");
		
		if(socket.readyState == 0)
			logmessage('<p>Attempting WebSocket connection.</p>');
			
		socket.onopen = function() {
			$('#console-status-text').html("Connected");
			$('#disconnect').html("Disconnect");
			logmessage('<p>Socket connected.</p>')
			connected = true;
		};
		
		socket.onmessage = function(msg) {
			$('#console-status-text').html("Receiving data");
			
			if(msg.data instanceof ArrayBuffer)
			{
				processData(msg.data);
			}
			else
			{
				logmessage('<p>Text received: ' + msg.data + '</p>');
			}
			
			$('#console-status-text').html("Connected");
		};
		
		socket.onclose = function() {
			if(connected == false) {
				logmessage('<p>Failed to connect to ' + host + '.</p>');
				$('#console-status-text').html("Failed to connect");
				$('#disconnect').html("Reconnect");
			}
			if(socket.readyState == 3) {
				logmessage('<p>Socket connection is closed.</p>');
				$('#console-status-text').html("Disconnected");
				$('#disconnect').html("Connect");
			}
			else
				logmessage('<p>Socket status: ' + socket.readyState+ ' (Closed)</p>');
			connected = false;
		};			
	};

	logmessage = function (msg) {
		$('#logging').prepend(msg);
	};

	processData = function(data) {
		var buffer = new PacketBuffer(data);
		var op = buffer.peek(0, buffer.VarType["ushort"]);
		
		// We need to find the specific packet we're looking for
		for(var i in Packets)
		{
			if(op === Packets[i].opcode)
			{
				Packets[i].recv(buffer);
			}
		}
	};
	
	/** Our Google Maps + Waypointing API
	**/
	var Map = function() {
		this.map = null;
		this.AUVSICoords = new google.maps.LatLng(38.144699, -76.428155);
		this.USCCoords = new google.maps.LatLng(49.905581, -98.275802);

		this.FlightMarkers = [];

		this.AUVSIFlightBounds = [
			new google.maps.LatLng(38.1454,-76.431769),
			new google.maps.LatLng(38.150774,-76.434613),
			new google.maps.LatLng(38.151179,-76.429249),
			new google.maps.LatLng(38.14583,-76.427039),
			new google.maps.LatLng(38.147163,-76.424164),
			new google.maps.LatLng(38.145324,-76.423413),
			new google.maps.LatLng(38.144075,-76.42543),
			new google.maps.LatLng(38.141544,-76.423541),
			new google.maps.LatLng(38.139687,-76.426159),
			new google.maps.LatLng(38.141594,-76.429678),
			new google.maps.LatLng(38.140464,-76.432618),
			new google.maps.LatLng(38.143518,-76.435364)
		];
		
		this.AUVSISearchArea = [
			new google.maps.LatLng(38.143265,-76.43427),
			new google.maps.LatLng(38.144666,-76.430987),
			new google.maps.LatLng(38.143856,-76.425859),
			new google.maps.LatLng(38.141831,-76.424099),
			new google.maps.LatLng(38.140092,-76.426309),
			new google.maps.LatLng(38.141966,-76.429507),
			new google.maps.LatLng(38.141071,-76.432468)
		];
		
		this.AUVSIFlightPath = [
			new google.maps.LatLng(38.14529,-76.428627),
			new google.maps.LatLng(38.14826,-76.429034),
			new google.maps.LatLng(38.150167,-76.429464),
			new google.maps.LatLng(38.149931,-76.431009),
			new google.maps.LatLng(38.149256,-76.432296),
			new google.maps.LatLng(38.145999,-76.429056),
			new google.maps.LatLng(38.144328,-76.428992)			
		];
		
		this.mapOptions = {
			center: this.AUVSICoords, // default
			zoom: 16,
			mapTypeId: google.maps.MapTypeId.SATELLITE,
			disableDefaultUI: true
		};		
	};
	
	Map.prototype.Initialize = function() {
		this.map = new google.maps.Map(document.getElementById('gmaps'),
			this.mapOptions);
			
		this.FlightBounds = new google.maps.Polygon({
			paths: this.AUVSIFlightBounds,
			strokeColor: '#FF0000',
			strokeOpacity: 0.8,
			strokeWeight: 1,
			fillColor: '#FF0000',
			fillOpacity: 0.10,
			clickable: false
		});
		
		this.FlightBounds.setMap(this.map);
		
		this.FlightArea = new google.maps.Polygon({
			paths: this.AUVSISearchArea,
			strokeColor: '#00FF00',
			strokeOpacity: 0.8,
			strokeWeight: 1,
			fillColor: '#00FF00',
			fillOpacity: 0.10,
			clickable: false
		});

		this.FlightArea.setMap(this.map);

		this.FlightPath = new google.maps.Polyline({
			geodesic: false,
			strokeColor: '#FFFF00',
			strokeOpacity: 1.0,
			strokeWeight: 3,
			clickable: false
		});
	
		this.FlightPath.setMap(this.map);
		
		this.AUVSIFlightPath.forEach(function(path) {
			WaypointMap.CreateMarker(path);
		});
		
		var ContextMenuOverlay = function(latLng, offset, content) {
			var that = this, listeners = [],
			$div = $(document.createElement("div")).css({
				border: "none",
				borderWidth: "0px",
				position: "absolute"
			});
			
			$div.append(content);

			google.maps.OverlayView.call(this);
			
			this.setMap(WaypointMap.map);
			
			this.onAdd = function() {
				var panes = this.getPanes();
					panes.floatPane.appendChild($div[0]);
				$.each("dblclick click mouseover mousemove mouseout mouseup mousedown".split(" "), function(i, name){
					listeners.push(
						google.maps.event.addDomListener($div[0], name, function(e) {
							$.Event(e).stopPropagation();
							google.maps.event.trigger(that, name, [e]);
							that.draw();
						})
					);
				});
				listeners.push(
					google.maps.event.addDomListener($div[0], "context-menu", function(e) {
						$.Event(e).stopPropagation();
						google.maps.event.trigger(that, "rightclick", [e]);
						that.draw();
					})
				);
			};
			
			this.draw = function() {
				var ps = this.getProjection().fromLatLngToDivPixel(latLng);
				$div
					.css("left", (ps.x+offset.x) + "px")
					.css("top" , (ps.y+offset.y) + "px");
			};
			
			this.onRemove = function() {
				for (var i = 0; i < listeners.length; i++) {
					google.maps.event.removeListener(listeners[i]);
				}
				$div.remove();
			};		
		};

		ContextMenuOverlay.prototype = new google.maps.OverlayView();
		
		var createContextMenu = function() {
			var menuItems = [], 
			namespace = "context-menu";
			
			this.currentMenuEvent = null;
			this.overlayInitialized = false;
		
			google.maps.event.addListener(WaypointMap.map, 'rightclick', function(event) {
				WaypointMap.ContextMenu.currentMenuEvent = event;
				WaypointMap.ContextMenu.openMenu(WaypointMap.ContextMenu.currentMenuEvent);
			});
			
			google.maps.event.addListener(WaypointMap.map, 'click', function() {
				WaypointMap.ContextMenu.closeMenu();
			});		
		
			this.openMenu = function(event) {
				this.closeMenu();
				var offset = {
					x: 0,
					y: 0
				},
				$menu = $("<div id='" + namespace + "'></div>")
				$div = $("#gmaps");
				
				$.each(menuItems, function(i, item) {
					$menu.append(createMenuOption(item));
				});
				
				if (event.pixel.y + $menu.height() > $div.height()) {
					offset.y = -$menu.height();
				}
				if (event.pixel.x + $menu.width() > $div.width()) {
					offset.x = -$menu.width();
				}
				
				WaypointMap.ContextMenu.overlay = new ContextMenuOverlay(event.latLng, offset, $menu);
				this.overlayInitialized = true;
			};
			
			this.closeMenu = function() {
				if(this.overlayInitialized == true) {
					WaypointMap.ContextMenu.overlay.setMap(null);
					WaypointMap.ContextMenu.overlay = null;
					this.overlayInitialized = false;
				}
			};

			var createMenuOption = function(item) {
				var $item = $("<div class='context-menu-item " + item.itemClass + "'>" + item.label + "</div>");
				$item.click(function () {
					if (typeof item.func === "function") {
						item.func.apply($(this), []);
					}
					WaypointMap.ContextMenu.closeMenu();
				}).hover(function () {
					$(this).addClass("context-menu-hover");
				}, function () {
					$(this).removeClass("context-menu-hover");
				});
				return $item;
			};
					
			this.addMenuOption = function(label, itemClass, func) {
				menuItems.push({
					label: label,
					itemClass: itemClass,
					func: func
				});
			};
		};
		
		this.ContextMenu = new createContextMenu();

		this.ContextMenu.addMenuOption("Add Waypoint", "add-waypoint", function() {
			WaypointMap.CreateMarker(WaypointMap.ContextMenu.currentMenuEvent.latLng);
		});
		
		this.ContextMenu.addMenuOption("Do nothing", "nothing", function() {
		});
		
		this.ContextMenu.addMenuOption("More Options", "nothing2", function() {
		});			
	};
	
	Map.prototype.CreateMarker = function(pos) {
	
		var markerIcon = {
			path: 'M -1,-0.5 0,-1 1,-0.5 1,0.5 0,1 -1,0.5 z',
			strokeColor: '#0000FF',
			strokeWeight: 1,
			fillColor: '#FFF',
			fillOpacity: 1.5,
			scale: 5
		};	
	
		var marker = new google.maps.Marker({
			position: pos,
			map: this.map,
			crossOnDrag: false,
			draggable: true,
			icon: markerIcon
		});
		
		this.FlightMarkers.push(marker);
		this.FlightPath.getPath().push(pos);
		
		google.maps.event.addListener(marker, "drag", function (e) {
			for (var m = 0, r; r = WaypointMap.FlightMarkers[m]; m++) {
				if (r == marker) {
					var a = e.latLng;
					break;
				}
			}
			if(google.maps.geometry.poly.containsLocation(WaypointMap.FlightMarkers[m].getPosition(), WaypointMap.FlightBounds))
			{
				WaypointMap.FlightPath.getPath().setAt(m, a);
			}
			else
			{
				WaypointMap.FlightMarkers[m].setPosition(WaypointMap.FlightPath.getPath().getAt(m));
			}
		});
		
		google.maps.event.addListener(marker, 'click', function(e) {
			var infowindow = new google.maps.InfoWindow({
				content: 'Pos: ' + e.latLng
			});
		
			infowindow.open(WaypointMap.map, marker);
		});
	};
	
	/** Packet Buffer API
		This class is multi functional. You can pass it a number value, and it'll create
		a fresh buffer, of that length, and begin writing to it. Or you can pass it
		an existing ArrayBuffer object, and it'll allow you to read from it.
	**/
	var PacketBuffer = function(data) {
		this.cursor = 0;
		this.writable = false;
	
		if(typeof data === 'number')
		{
			this.packetLength = data;
			this.buffer = new ArrayBuffer(this.packetLength);
			this.data = new DataView(this.buffer);
			this.writable = true;
		}
		else if(typeof data === 'object')
		{
			this.buffer = data;
			this.packetLength = this.buffer.byteLength;
			this.data = new DataView(this.buffer);
		}
	};	

	PacketBuffer.prototype.VarType = Object.freeze({
		"char" : { size : 1, name : "char" },
		"uchar" : { size : 1, name : "uchar" },
		"ushort" : { size : 2, name : "ushort" },
		"short" : { size : 2, name : "short" },
		"uint" : { size : 4, name : "uint" },
		"int" : { size : 4, name : "int" },
		"float" : { size : 4, name : "float" }
	});
	
	PacketBuffer.prototype.write = function(variable, type) {
		if(this.writable == false)
			return false;
		
		if(typeof variable === 'number')
		{
			switch(type.size)
			{
				case 1:
					if(type.name === "uchar")
						this.data.setUint8(this.cursor, variable, true);
					else
						this.data.setInt8(this.cursor, variable, true);
					break;
				
				case 2:
					if(type.name === "ushort")
						this.data.setUint16(this.cursor, variable, true);
					else
						this.data.setInt16(this.cursor, variable, true);
					break;
				
				case 4:
					if(type.name === "uint")
						this.data.setUint32(this.cursor, variable, true);
					else
						this.data.setInt32(this.cursor, variable, true);
					break;
			}
			this.cursor += type.size;
		}
		else if(typeof variable === 'string')
		{
			for(var i = 0; i < variable.length; i++)
				this.data.setUint8(this.cursor+i, variable.charCodeAt(i), true);
			this.cursor += variable.length;
		}
	};
	
	PacketBuffer.prototype.peek = function(offset, type, amount) {
		switch(type.name)
		{
			case "char":
				if(amount === 'undefined')
					return this.data.getInt8(offset, true);
				else
				{
					// For now we'll assume that if a number of characters are requested, that
					// we should also encode it as a string object using 'fromCharCode()'
					var ret = "";
					for(var i = 0; i < amount; i++)
						ret += String.fromCharCode(this.data.getUint8(offset+i, true));
					return ret;
				}
				break;
			case "uchar":
				if(amount === 'undefined')
					return this.data.getUint8(offset, true);
				else
				{
					var ret = "";
					for(var i = 0; i < amount; i++)
						ret += String.fromCharCode(this.data.getUint8(offset+i, true));
					return ret;
				}
				break;
			case "ushort":
				return this.data.getUint16(offset, true);
				break;
			case "short":
				return this.data.getInt16(offset, true);
				break;
			case "int":
				return this.data.getInt32(offset, true);
				break;
			case "uint":
				return this.data.getUint32(offset, true);
				break;
			case "float":
				return this.data.getInt32(offset, true);
				break;
		}
	};
	
	PacketBuffer.prototype.send = function() {
		socket.send(this.buffer);
	};	
	
	sendMessage = function(msg) {
		// Define a new PacketBuffer object, passing it a size
		// The size for this packet is 'opcode' + 'string length' + 'string'
		var buffer = new PacketBuffer(2 + 2 + msg.length);
		
		// Here we write the opcode as a ushort
		buffer.write(Packets["Message"].opcode, buffer.VarType["ushort"]);
		
		// Write the length of our string as a ushort
		buffer.write(msg.length, buffer.VarType["ushort"]);
		
		// Finally, write the actual string
		buffer.write(msg);
		
		// Send our buffer
		buffer.send();
		
		// And clean up
		delete buffer;
	};

	/* jQuery  function definitions */
	$('#disconnect').click(function() {
		if(connected == true)
		{
			socket.close();
			$('#disconnect').html("Reconnect");
		}
		else
		{
			connect();
			$('#disconnect').html("Disconnect");
		}
	});
	
	$('#console-check').click(function() {
		$('#logging').css("display", function(val, display) {
			return display === "block" ? "none" : "block";
		});
	});

	$('#image-check').click(function() {
		$('#image-monitor').css("display", function(val, display) {
			return display === "block" ? "none" : "block";
		});
	});
	
	$( "#messagebox" ).keypress(function( event ) {
		if ( event.which == 13 )
		{
			if(connected == true)
			{
				var text = $(this).val();
				if(text !== "") {
					sendMessage(text);
					logmessage('<p>Sent: ' + text);
					$(this).val("");
				}
			}
			event.preventDefault();
		}
	});
	
	$("label[for='AUVSI']").bind("click", function() {
		$(this).addClass( "radio-checked" );
		$("label[for='USC']").removeClass( "radio-checked" );
		
		WaypointMap.map.setCenter(WaypointMap.AUVSICoords);
		WaypointMap.map.setZoom(16);
	});
	
	$("label[for='USC']").bind("click", function() {
		$(this).addClass( "radio-checked" );
		$("label[for='AUVSI']").removeClass( "radio-checked" );
		
		WaypointMap.map.setCenter(WaypointMap.USCCoords);
		WaypointMap.map.setZoom(15);
	});	

	// Return an instantiation of our object
	return (window.Aero = new Aero);

})(jQuery, window, document);
