// Aquilegia - module specific to an application - here for Duet Web Control, we define the selector according board type and the ajax call string 
// The Ajax image loader is there because we cannot use http on the Duet WiFi, as the SD card is not reachable by http.
// (c) Pierre Rouzeau License GPL V2 or any later version
function aqlDefSelector() { // keys shall imperatively be lowercase
	var sl= "";
	if (typeof boardType !== 'undefined') {
		sl = boardType;
		if (sl.startsWith ("duet085")) // from DWC - shall only be set while opening help system, as answer is not immediate at board start
			aqlO.selKey[0]= "duet_0.85"; 
		else if (sl.startsWith ("duet06"))  
			aqlO.selKey[0]= "duet_0.6"; 
		else if (sl.startsWith ("duetwifi"))  
			aqlO.selKey[0]= "duet_wifi_1.0"; 
		else
			aqlO.selKey[0]= "allb"; 
	}
	else 
		aqlO.selKey[0]= "allb"; 
}

function aqlInithttp () {
	if (typeof boardType !== 'undefined') {
		if (boardType.startsWith ("duetwifi"))  
			aqlO.nohttp =true;
	}
	// aqlO.nohttp =true; // test for emulation Duet WiFi Ajax calls
}

function aqlAjaxTxt (flname) {
	if (aqlO.nohttp && !aqlO.domain) 
		return ("rr_download?name=/www/" + encodeURIComponent(flname));
	else 
		return flname;
}	

function loadImg (img, sname, flname) { // function loading an image through Ajax call  when http cannot access images resources
	if (aqlO.Imgsrc[sname])  // retrieve from cache - stored in binary in cache
		img.src = window.URL.createObjectURL(aqlO.Imgsrc[sname]);
	else {	// Ajax download call shall be here for image loading without http://
		$.ajax(aqlAjaxTxt(flname), { // load image content
			dataType: "binary", // binary transport - need auxiliary function - see below
			global: false,
			success: function(response) { // callback function while page loaded - response  assumed base64 WITHOUT headers
				if (!(typeof response === "string"))  // string if 404 screen
					img.src = window.URL.createObjectURL(response);
			}
			// error treatment ??
		});
	}
}

$.ajaxTransport("+binary", function(options, originalOptions, jqXHR) {
    // check for conditions and support for blob / arraybuffer response type
    if (window.FormData && ((options.dataType && (options.dataType == 'binary')) || (options.data && ((window.ArrayBuffer && options.data instanceof ArrayBuffer) || (window.Blob && options.data instanceof Blob)))))
    {
		return { // create new XMLHttpRequest
			send: function(headers, callback){
		// setup all variables
				var xhr = new XMLHttpRequest(),
				url = options.url,
				type = options.type,
				async = options.async || true,
				// blob or arraybuffer. Default is blob
				dataType = options.responseType || "blob",
				data = options.data || null,
				username = options.username || null,
				password = options.password || null;
				xhr.addEventListener('load', function(){
					var data = {};
					data[options.dataType] = xhr.response;
					// make callback and send data
					callback(xhr.status, xhr.statusText, data, xhr.getAllResponseHeaders());
				});
				xhr.open(type, url, async, username, password);
				// setup custom headers
				for (var i in headers ) {
					xhr.setRequestHeader(i, headers[i] );
				}
				xhr.responseType = dataType;
				xhr.send(data);
			},
           abort: function(){
				jqXHR.abort();
			}
		};
	}
});