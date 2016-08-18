"use strict";
/** 
@preserve Aquilegia (c)Pierre ROUZEAU 2016 License GPL 2.0 or any later version
* Complete help system using simple wiki markup - 11 July 2016. Need JQuery 2.2.1
* Original work. Does include internal and external links, search tool and structure directives
* See http://aquilegia.blue , https://github.com/PRouzeau/Aquilegia
*/
/* strings to be translated :
"There is no available help page for this element"
"'hlp.txt' file loaded, but page :{0} was not found, check also html charset (shall be utf-8)"
"Invalid or no page name"
"Help page '{0}' cannot be loaded"
"Internal error program, page undefined in aqlTrans function"
"Page {0} not found in trail page {1}"
"Trail page {0} did not exist - check character case"
"<b>{0}</b> found in following pages:"
"<b>{0}</b> was not found"
'Link "{0}" length exceed {1} in page {2}'
"<strong>There is {0} external links<strong><br> {1}"
"Link '{0}' length {1} exceed {2} in page {3} "
"Page : {0}<br>{1} not found"
"Search: "
"Searching '{0}', please wait..."
*/
/** @private */
var aqlC = {}; // object for constant parameters
/** @private */
var aqlO = {}; // object for variable parameters
/** @private */
var aqlI = {}; // object for image parameters
/** @private */
var tabHlp={}; // storage of pages, groups, titles, search authorisation and title section toggle
aqlC.version = "Beta1";
aqlC.linkMaxLength = 24; // maximum number of character for a link name (due to file length limitation= 30-2 for 'h/'-4 for'.txt')
aqlC.sweb   	= '•'; // U+2022 symbol at the end of a web link - well supported by fonts, possible ○
aqlC.slink  	= '▫'; // U+25AB symbol at end of ▫ isinternal link  well supported and on the left U+25C2 too much on the right - U+25B6;
aqlC.excluAllWeb= /aquilegia/i; // Regex to exclude links from the all web link search, use '|' to exclude multiple words 
aqlC.docDir   	= "pdf/"; // subdir of docs (pdf) linked to images, calling image (in aqlC.dispDir) shall have same name (but != extension)
aqlC.prefix   	= "hlp/"; // Used for hash writing and deep linking - discriminate from Bootstrap pages - UNRELATED to aqlC.dir
aqlC.dir      	= "h/"; // directory where the help file is located
aqlC.imgLocalDir= "f/"; // sub-directory of h/ for images when the resources are local - may be identical to thumbnail images to limit file size
aqlC.dispDir 	= "d/"; // sub-directory of h/ for **displayed** images (they shall have same name as full images)
//-------------------------------------------
aqlO.imagesDir	= "f/"; // sub-directory of h/ for linked images  ('full' images) use imgLocalDir if resources are local
//aqlO.domain  = "http://otocoup.com/aql/"; // define domain for remote help loading. Need CORS activated on directory
aqlO.domain		= ""; // name of cross-origin domain from files are got - fall to "" if file cannot be get from domain.
aqlO.url		= ""; //page url base set by the first showHlp, which loads file and check availability
aqlO.linkbase	= ""; //page Url WITHOUT hash code
aqlO.lastP 		= 'home'; //last page seen, at startup  there is no last page-> will go on toc
aqlO.nFound		= []; // pages which are not found
aqlO.nValid		= []; // pages which are found but not valid
aqlO.groups		= []; // Contains  documentation groups ->home_group & menu_group
aqlO.tabbed		= false; 
aqlO.inApp		= false; // Aquilegia used inside an app
aqlO.mainApp	= []; // store display status of main application elements
aqlO.overflow	= ""; // store overflow status of  body
aqlO.loadTime 	= 0; // page loading + splitting time, ms
aqlO.listAll	= false; // flag when we run a search all pages to not build toc, preformatted blocks, etc.
aqlO.dispMenu	= false; 
aqlO.zoom		= 1.35; // initial zoom on touchscreen device
aqlO.perf		= typeof performance.now === 'function'; // also used to detect android browser
aqlO.selKey 	= []; //e.g. aqlO.selKey = "Duet_0.85"; Chars allowed:[\w-.] select paragraphs identifier to display or not
aqlO.anchorOffset = 35; // offset when scrolling to anchor (in desktop mode) - position from top - will be recalculated
aqlO.loadAll	= false; // not all pages are loaded (for search)
//aqlO.isFirefox	= navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
//-------------------------------------------
var htextnohlp = T("There is no available help page for this element")+"<br>";
var hlpSelId = []; 
//pages with same identity and hide others. If this is empty, all paragraph are shown
var is_touch_device = 'ontouchstart' in document.documentElement; // may be not reliable, but simple
//is_touch_device = true; // test
if (is_touch_device) {
	var viewp = document.createElement("meta");
	viewp.name = 'viewport';
	viewp.content = aqlzoom();
	$T("head")[0].appendChild(viewp);
}

function aqlzoom() { // work on Chrome, need some dezoom/zoom on Firefox/Android browser
	return "width="+1080/aqlO.zoom+", initial-scale="+aqlO.zoom;
}
//TODO: define a standard to execute utility non static pages: Search,  display list, print list with showHlp()  instead of specialised functions
/* var hlpT, hlptc; // debugging execution time (for regular expressions)
function t(init) { //Send time to console. t(1); initialise, successives t(); gives time from initialisation
	if (init) { hlpT=hlptimenow(); hlptc=0} console.log('point: ', (hlptc++)," :",Math.round(hlptimenow()-hlpT)); } //*/
function hlptimenow() {return aqlO.perf? performance.now() : 0}; 

function hlp_open() { //at first call to showHlp, after file load. Will never trigger without file.
	if (aqlO.inApp) {
		for (var i=0, l=$(".mainapp").length; i<l; i++) {
			aqlO.mainApp[i] = $(".mainapp").eq(i).css('display');
			$(".mainapp").eq(i).css('display','none');
		}	
		$0("aql_cont").style.display = 'block';	
	}
	aqlO.overflow = document.body.style.overflow;	
	document.body.style.overflow = (is_touch_device) ? "auto" :"hidden";	
	if (!is_touch_device) 
		$0("hsearch").focus();	
	aqlO.anchorOffset = $0("aql_body").getBoundingClientRect().top; // need window open to know
	if (boardResponse) // from DWC - shall only be set while opening help system, as answer is not immediate at board start
		aqlO.selKey[0]= boardResponse.replace (/\s+/g,'_').toLowerCase(); 
}
function hlp_is_open() { //detect help windows is open 
	return ($0("aql_cont").style.display != 'none');
}
function hlp_close(nohashchange) { //occurs when back button didn't get proper hash (no aqlC.prefix)
	for (var i=0, l=$(".mainapp").length; i<l; i++) 
		$(".mainapp").eq(i).css('display',aqlO.mainApp[i]);
	$0("aql_cont").style.display = 'none';	
	document.body.style.overflow = aqlO.overflow;
	if (!nohashchange) // Shall not modify an address if we are in an application
		history.pushState("", "", aqlO.linkbase);
}

document.addEventListener("DOMContentLoaded", function(e) {
	if ($(".aqltab>button").length) 
		aqlO.tabbed	= true; 
	if ($(".mainapp").length) 
		aqlO.inApp	= true; 
	if (is_touch_device) {
		$0("btn_aql_zi").style.display = 'inline'; 
		$0("btn_aql_zo").style.display = 'inline'; 
		$0("aql_body").style.overflow = "hidden";
		$0("aql_body").style.height = "auto";
		$0("aql_menu").style.height = "auto";
	}
	window.onresize = function() { // also run by the openWin
		var nomenu = (window.innerWidth<780)||!aqlO.dispMenu;
		$0('aql_menu').style.display =	  (nomenu) ? 'none' : "inline";
		$0("aql_body").style.marginLeft = (nomenu) ?    0   : "165px";
		$0("aql_body").style.width =	  (nomenu) ? '99.5%': 'calc(100% - 172px)';
		aqlO.anchorOffset = $0("aql_body").getBoundingClientRect().top;
	}
	document.onclick = function(e){ // to avoid header folding when going to an anchor
		var target = e.target;
		if ((target.tagName === 'A') && aqleft_button(e)) {
			var href = target.getAttribute('href');
			if (href && href.indexOf("#"+aqlC.prefix)>=0) {
				e.preventDefault(); // stop jumping to anchor
				history.pushState("", "", aqlO.linkbase+href); // to have the anchor in history and url field for back
				aqlScrollAnchor (href);
			} 
		}	
		$0("aql_bk").style.display = 'none';
	};  
	$(".aqltab>button").click(function(){ //click on a tab
		var idx = $(this).index();
		var hm = (idx) ? "home_"+aqlO.groups[idx] : "home";
		showHlp(hm);	
	});
	$0("btn_aql_zi").onclick = function(){ // Zooming button - work only on Chrome/Edge mobile
		aqlO.zoom = aqlO.zoom*1.15; //abandoned: hlpSetvW = hlpSetvW*0.925;
		document.head.querySelector("[name=viewport]").content = aqlzoom();
    };
	$0("btn_aql_zo").onclick = function(){ // Zooming button 
		aqlO.zoom = aqlO.zoom*0.87;
		document.head.querySelector("[name=viewport]").content = aqlzoom();
    };	
	$0("btn_aql_bk").onclick = function(){ // Call backlinks window - also do that with hover ? 
		if (getComputedStyle($0("aql_bk")).display=="none") //style not initialised by JS->call function 
			hlpLoadAll(hlpListBack);
		else
			$0("aql_bk").style.display="none";
    };
	$(".aqlstart").click(function(e){ //APPLICATION  call widget  set class '.hlpstart' in widget
		var hpage = $(e.target).data('hpage'); 
		showHlp(hpage, true);
    }); 
	$0("btn_hlp_back").onclick = function(){history.back();}; 
	if ($0("btn_hlp_toc", true)) //only for non-tabbed page 
		$0("btn_hlp_toc").onclick = function(){showHlp();};
	$0("btn_hlp_print").onclick = function(){hlpPrint();}; 
	if ($0("btn_aql_close", true)) // only for in-application
		$0("btn_aql_close").onclick = function(){hlp_close();}; 
	$0("hform").onsubmit = function(e){ 
		e.preventDefault(); //prevent submission of search, treated within Javascript 
		var stext = $0("hsearch").value; // search key
		aqlSendSearch(stext);
	};
	$(window).bind("popstate", function(){ //back or forward button activated
		var u = window.location.hash.split('#'+aqlC.prefix)[1]; // don't do anything of address not compliant
		if (u) {
			if (aqlO.inApp && !hlp_is_open()) hlp_open(); // we are in the app
			showHlp(decodeURIComponent(u), false, true); // 2nd param stop restacking address
		}	
		else 
			if (aqlO.inApp) {
				if (hlp_is_open()) hlp_close(true);
			}	
			else 
				showHlp(); //reopen on default
	});
	var url = window.location.href; 
	aqlO.linkbase = url.split('#', 1)[0]; //mmm: the base  main contain more than a page link?
	if (url.match('#'+aqlC.prefix))  //deep linking: beware, this intercept all hash code for whole APPLICATION page 
		if (url.split('#'+aqlC.prefix)[1]) { //note that the prefix name is unrelated to page file location
			showHlp(decodeURIComponent(url.split('#'+aqlC.prefix)[1]));
			return
		}	
	if (!aqlO.inApp) // if a plain page, we start anyway
		showHlp();	//open on default
});

function hlpCreEvents() { // shall be run after the html component creation (after set content)
	if (zo(tabHlp[aqlO.lastP]).clp) //set at last position collapsed/uncollapsed title sections 
		for (var id in tabHlp[aqlO.lastP].clp)
			if (tabHlp[aqlO.lastP].clp[id]) {
				$('#'+id).parent().find(".hlpsec").filter(":first").toggle();
				$("span", '#'+id).toggleClass("h-expand h-collapse");
			}	
	$(".hlptt").unbind('click'); // troubles without that		
	$(".hlptt").click(function(e){ //id incorporate page name to differentiate menu from page 
		var idx = this.id;
		$(this).parent().find(".hlpsec").filter(":first" ).toggle();
		$("span", this).toggleClass("qexpand qcollapse");
		if (!tabHlp[aqlO.lastP].clp) tabHlp[aqlO.lastP].clp ={}; // memorize toggling in hash table
		tabHlp[aqlO.lastP].clp[idx] = (tabHlp[aqlO.lastP].clp[idx]) ? !tabHlp[aqlO.lastP].clp[idx] : true;
	});
}

//==== functions which may be called from html ================================= 
window.showHlp = function() { // main function calling help page
var lines, hlpLoading, lnk=arguments[0], itab=0;
	if (!lnk) lnk = 'home';
	var openWin = arguments[1]; //if true we are opening help window. sent after text load
	var stateChange = arguments[2]; // if true, we shall not do again a hash change
	var mt = lnk.match (/(.[^!]*)!?(.*)/); // with '!' as anchor char
	hlpLoading = hlpNamePage (mt[1]); // page without anchor
	if (hlpLoading=='hlplast') // if call for last page
		hlpLoading = aqlO.lastP;
    if (!tabHlp['home']) { // test if 'toc' page which always exist is loaded
		aqlO.url = aqlO.domain+aqlC.dir;
		aqlO.loadTime = hlptimenow(); 
		$.ajax(aqlO.url + 'hlp.txt', {  // load help content
			dataType: "text",
			global: false,
			success: function(response, status) { 
				if (z(response).substr(0,2)=="<!") //if file not found servers DO answer with a 404 page and status = "success"
					hlpnoload(aqlO.url+'hlp.txt', "", ""); // so we intercept the html page
				else {	//var h=[]; // First line is the title and used for specific search.
					var h=z(response).split(/■/); //U+25A0
					for (var i=1; i<h.length; i++) 
						hlpStore(h[i]);
					aqlO.loadTime = Math.round (hlptimenow()-aqlO.loadTime); 	
					if(tabHlp['home']) {
						aqlO.groups = aqlList("aqlgroups"); // load groups from page 
						showHlp(lnk, true); //rerun after load: 2nd parameter tells to open the help window 'lnk' contain anchor 	
					}	
					else
						hlpalert(T("'hlp.txt' file loaded, but page :{0} was not found, check also html charset (shall be utf-8)",'home'));	
				}	
			},
			error: function(xhr, status, error) { // callback function while page NOT loaded
				if (aqlO.domain.trim()) {  //test if we are trying from a remote address
					aqlO.domain=""; // aqlO.url will be re allocated at rerun
					aqlO.imagesDir = aqlC.imgLocalDir; // change directory on local (to have same as thumbs dir)
					showHlp(lnk); // rerun in local if fail to load on remote
				}	
				else 
					hlpnoload(aqlO.url+'hlp.txt', xhr.responseText, error); 
			} 
		});
	} else if (!tabHlp[hlpLoading] && hlpLoading!='aqlsearch') 
		aqlLoadExt(hlpLoading, showHlp, lnk, openWin) // page not in hash table, so load as external attempt
	else { // help already loaded
		if (openWin) {// Before setContent to have events defined for collapsing sections in menu
			if (tabHlp['menu']) {
				$0('aql_menu').innerHTML = aqlTrans(z(tabHlp['menu'].p), 'menu');
				aqlO.dispMenu=true;
			}
			window.onresize(); // to define properties at start, according  aqlO.dispMenu
			if (hlpLoading=='aqlsearch' && !tabHlp['aqlsearch']) { // search deep linking	
				aqlSendSearch(mt[2].replace('%20',' ')); // will create tabHlp ['search']
				return;
			}	
		}	
		if ((hlpLoading!=aqlO.lastP)||openWin||hlpLoading=='aqlsearch' //stop reloading of page (if calling a local anchor, notably)
			||lnk=="hlplast") // if hlplast we may be recycling after select change
			hlpSetContent (hlpLoading, mt[2], stateChange);  // change content as needed
		if (openWin) // Help window first opening
			hlp_open();
		if (mt[2])	// Scroll to anchor if required
			aqlScrollAnchor ('#'+aqlC.prefix+hlpLoading+'!'+mt[2].toLowerCase());
		else // if anchor empty, go to top
			$0("aql_body").scrollTop =0;
	}		
}

function aqlLoadExt (hlpLoading, runFunc, lnk, openWin) { // load external page
	$.ajax(aqlO.url + hlpLoading +'.txt', {  // load help content
		dataType: "text",
		global: false,
		success: function(response, status) { // callback function while page loaded
			if (response.substr(0,2)=="<!") { //if no page DWC DO answer with a 404 page and success!
				arrayAdd (aqlO.nFound, hlpLoading);
				hlpnoload(aqlO.url+hlpLoading, "", "");
			}	
			else {	
				if (hlpStore (response, hlpLoading)) { // wrong storage handle own error message - do not overwrite
					if(tabHlp[hlpLoading]) { // page may not be created if empty, not format compliant, etc.
						tabHlp[hlpLoading].ext="(ext)";
						runFunc(lnk, openWin); //rerun after load 'lnk' contain anchor
					}
					else
						hlpnoload(aqlO.url+hlpLoading, "Page empty or corrupted", "");
				}
			}
		},
		error: function(xhr, status, error) { // callback function while page NOT loaded
			arrayAdd (aqlO.nFound, hlpLoading);
			hlpnoload(aqlO.url+hlpLoading, xhr.responseText, (aqlO.domain) ? error :''); // error shown if call from cross origin
		}
	});
}

//==== Other functions =====================================================================================
function aqlimg (imgname) {
	$0("aql_img_b").aqlimgfile = imgname; //this is a global... 
	if (Object.getOwnPropertyNames(aqlI).length == 0)
		aqlLoadExt ("imglist", aqlmetaimg); // will run load function after page loading
	else // if image documentation exists, load directly
		aqldispimg();
}

function aqldispimg() {
	var imgn = $0("aql_img_b").aqlimgfile ;
	var legend = imgn.replace(/_/g,' '); // default value
	if (z(zo(aqlI)[imgn]))
		if (z(aqlI[imgn].desc)) // if there is a short description
			legend = aqlI[imgn].desc;
		else 
			legend = (z(aqlI[imgn].longdesc)) ? aqlI[imgn].longdesc : legend;
	$0("aql_img_b").innerHTML = legend;
	$0("aql_img0").onload = function() { 
		var legendht=24; //var legendht = $0("aql_img_b").offsetHeight;
		var w = window.innerWidth-19;
		var h = window.innerHeight-19-legendht; //bottom height will change with wrap??
		var ratio = Math.max (this.naturalWidth/w,this.naturalHeight/h);
		this.width = this.naturalWidth/ratio;
		this.height = this.naturalHeight/ratio;
		this.style.marginTop = Math.floor((h-this.height+1)/2+8)+"px";
		this.style.marginLeft = Math.floor((w-this.width+1)/2+8)+"px";
		$0("aql_img").style.display = "block";	
	}
	$0("aql_img0").src= aqlO.url+aqlO.imagesDir+imgn; // start image loading
}

function aqlmetaimg() { // fill in the image objects
	var val, ext, idx="", t, arr, page = z(zo(tabHlp['imglist']).p);
	arr = page.replace(/[\r*#]/g,'').replace(/[\n]/g,',').split(','); // eliminate CR, bullet/numbered list prefix - newline is separator
	for (var i=0; i<arr.length; i++) {
		if (val=arr[i].trim()) { //??
			ext = val.substr(-4).toLowerCase();
			if (ext==".png"||ext==".svg"||ext==".jpg") 
				aqlI[idx=val] = {}; // new image object
			else if (idx) { // what set before first image is only comments
				if (val.indexOf (":")==-1)
					aqlI[idx].longdesc = aqlI[idx].longdesc ? aqlI[idx].longdesc + val +" ": val+" ";
				else {	
					t = val.indexOf(":");
					aqlI[idx][val.substr(0, t)] = val.substr(t+1);
				}	
			}
		}
	}
	aqldispimg();
}

function aqlimgdesc (event) {
	event.stopPropagation(); // to not close the main window
	function sel (param, text) {
		var res =  z(obj[param]) ? obj[param] : z(def[param]) ? def[param] :"";
		return (res) ? text+res :"";
	}
	var obj = aqlI[$0("aql_img_b").aqlimgfile];
	var def = zo(aqlI["default.png"]);
	var copy = z(obj.copyright) ? " Copyright: "+obj.copyright : z(obj.auth) ? " Copyright: "+obj.auth : "";
	var txt = sel ("longdesc", "Description: ")+sel ("auth", "<br>Author: ") +copy + sel ("date", " Date: ");
	txt += sel ("license", "<br>Licence(s): ")+ sel ("instructions", "<br>Instructions: ");
	hlpalert (txt, "I"); 
}	

function aqlScrollAnchor (href) { // scroll to anchor
	if (is_touch_device) // use normal move
		location.hash=href;
	else  // scroll page body
		$0("aql_body").scrollTop = $0(href.substr(1)).offsetTop-aqlO.anchorOffset; // remove first '#'
}

function hlpNamePage (name) { // transform string in page name - normalise or escape accented chars ?
	//return accentsNorm(z(name).trim().toLowerCase().replace(/[\t ]+/g ,'_'), true);
	return z(name).trim().toLowerCase().replace(/[\t ]+/g ,'_');
}

function hlpStore(page, index) { //Store in hash table.  index exists only for independant pages (file name)
   	page = z(page).replace(/\r\n?/g,'\n'); //required
	var lines = page.split(/\n/,2); //split only two strings
	if (lines.length>1){ //if page exists
		var names = lines[0].split(/[,;]/);
		for (var i=0, l=z(names).length; i<l; i++)
			names[i] = hlpNamePage(names[i]); // normalise page and group names.
		if (!names[0]) {
			hlpalert (T("Invalid or no page name"));
			return false;
		}	
		var index2 = names[0]; //names [1], names[2] .. will be groups
		if (index && index!=index2) {
			if (index!="aqlpreview")
				hlpalert ("Page name:"+index2+" not the same as file name:"+index+" Check first file line");
			index2=index; // to avoid looping indefinitely
		}	
		tabHlp[index2] = tabHlp[index2] || {}; // create object as needed
		if (names[1]) { // there are groups
			names.shift(); // remove index name.
			tabHlp[index2].groups = names;
		}	
		page = page.replace(/^.*\n/,"") // remove 1rst line:  page and group names and first newline
				.replace(/[\n \t]*$/,"\n"); // clean page end
		if (lines[1].substr(0,2)=='->') // if  redirect
			tabHlp[index2].p = page; 
		else
			tabHlp[index2].p = page.replace(/^.*[\n \t]*/,"\n");  // 2nd line is title, removed and next lines
		tabHlp[index2].title=lines[1].replace(/^\s*=*\s*(.+?)\s*$/, '$1'); // second line is title line
		return true;
	} 
	hlpalert (T("Empty page"));
	arrayAdd (aqlO.nValid, index); // page did not exists
	return false;	
}

function hlpnoload(page, xhra, err) { //message if page cannot load 
	xhra = z(xhra).replace(/(<[\/]?h1>)/g,'°')
				.replace(/(<.*?>)/g,'')
				.replace(/(°)/g,'<br>'); //filter out html headers if a web page
	hlpalert(T("Help page '{0}' cannot be loaded", page)+'<br>"'+xhra+'"<br>'+z(err)); 
}

function hlpalert(txt) { // not recursive, not dynamic, last alert wins
	if ((arguments[1]=='I' && $0("aql_alert").classList.contains("qwarning")) || 
		(!arguments[1] && $0("aql_alert").classList.contains("qinfo")) )
		aqltoggleclass ($0("aql_alert"), "qwarning", "qinfo");	
	$0("halert").innerHTML = (arguments[1]=='I')? 
		"<span class='hicon aqi qinfo'></span> &emsp;&emsp; Information" :
		"<span class='hicon aqi qwarning'></span> &emsp;&emsp; Aquilegia (help module) alert";
	$0("halertext").innerHTML = txt;
	$0("aql_alert").style.display = "block"; //display alert window
}

function aqltoggleclass (el, class1, class2) {
	el.classList.toggle (class1);
	el.classList.toggle (class2);
}

function aqlSendSearch(stext) { // Run the search from text field data
	tabHlp['aqlsearch'] = tabHlp['aqlsearch'] || {}; // create object as needed
	tabHlp['aqlsearch'].search=false; // don't search search page		
	if (stext) {
		$0("aql_body").innerHTML = "<br><strong>&nbsp; "+T("Searching '{0}', please wait...",stext)+"</strong>"; // user feedback
		tabHlp['aqlsearch'].title = accentsNorm(stext.toLowerCase()); // accented letters normalised and everything in lowercase
		setTimeout(function() { // to display immediately message while loading all stuff - time=0 don't work
			hlpLoadAll(aqlShowSearch); //load all pages before searching
		}, 50);
	}
}

function aqlShowSearch() { // function called by hlpLoadAll  process
	tabHlp['aqlsearch'].p=searchHlp(); // fill in search page
	showHlp('aqlsearch');
}

function hlpDefAnchor (hpage, a) { // for anchors special chars are replaced by a dot followed by hex code, like wikimedia
    a= a.replace (/\s+/g,'_').toLowerCase(); // space replaced by underscores
    a= a.replace (/[^\w-]/g, function (match) { //replace special char by'.'+hex code. DOTS and COLON ARE ESCAPED 
		return ('.' + match.charCodeAt(0).toString(16)); //code char -> .Hex 
	});
	return aqlC.prefix+hpage+'!'+a; // no # in the name, only in the href call
}
function hlpAnchor (hpage, a) {
	return '<a id="'+ hlpDefAnchor(hpage,a)+'"></a>';
}
function hlpGoAnchor (hpage, a, text) {
	return '<a href="#'+hlpDefAnchor(hpage,a)+'">'+text+'</a>';
}	
function hlpCall (page, text) {
	return '<a href="javascript:window.showHlp(\''+page+'\');">'+text.trim()+'</a>'; 
}

function aqlTrans (data, hpage) {//simple wiki markup w/ pdf, images references & web links
// \s capture the \n, so [\t ] is used to catch spaces only
var intro, ptitle, numtitle, myclass, hlpfoot, hlphead, allweb, hlpdiag;  //blocs and directives
var trail, imgpar, imgborder, pgdate; //blocs and directives
var notoc, notitle, nofoot, nohead, nodate; // parameters of directives
var refidx=0, notesidx=0, weblnk, weblnk1, weblnk2; //notes and web link lists
var codeblocks=[],tmp=[],titles=[],weblinks=[],weblinkis=[],tables=[],refs=[],notes=[]; //data storage while tokenising
var i, j, cleardiv="<div style='clear:both;'></div>" , now = hlptimenow(); 
var imgdisp, rgximg, rgximglnk, imgtg ='" target="_blank">'; // image links
imgtg = '">'; //Target:  on Duet, opening another window makes like if it was external link - make it an option ?? 
//-- Functions -------------------------------------------------------------------------------------
	function direct (dir) { //search directive once:  return parameters as a unique string. return empty string if not found
		var a="", par1=""; 
		var redir = RegExp("\\(:"+dir+"(([\\t ]+[\\w-:,;]*)*?):\\)[ ]*(<br>)*[ ]*"); //clean \n and spaces, don't remove \n as separator for titles
		data = data.replace (redir, function(mt, p1) {
			a = mt; // run only once, no 'g'
			par1 = z(p1);
			return ""; // delete directive
		});
		return (a)?((par1)?par1:dir):""; // return directive name if directive exists but have no parameter
	}
	function remdirect(data) { // remove directives - make an option to not remove (:clear:) for included pages ??
		return data.replace (/\(:[\w]+([\t ]+[\w-.,;:]*)*?:\)[\t ]*(<br>)?/g,'');
	}
	function untoken (arr, token) {
		for (var i=0; i<z(arr).length; i++)
			data =data.replace (token, arr[i]); 
	}
	function addlistref (arr, regx, anch){ // make a numbered list of references - for refs and notes
		var lst = "", i;
		return data.replace(regx, function() { 	// what if no match for (:reflist:) and (:notes:) and refs exists ??	
			if (z(arr).length) {
				for (i=0; i<arr.length; i++)
					lst += '<li>'+ hlpGoAnchor(hpage, 'b'+anch+(i+1), '↑ ')+'&nbsp;'+
						hlpAnchor (hpage, anch+(i+1))+arr[i]+'</li>';
				lst = '<ol>'+lst+'</ol>';
			}
			return lst;
		}); 
	}
	function imgwd (width) { // calculate maximum allowed image width - and close html string
		return '" style="width:'+ Math.min(window.innerWidth*0.92, z(width)) +'px;"/>';
	}
//-------------------------------------------------------------------------------------------------	
	if (tabHlp[hpage]==undefined) 
		hlpalert(T("Internal error program, page undefined in aqlTrans function"));
	pgdate	 = direct('date').trim(); // date of main page captured, not of included pages	
	if (!direct ('nodef')) // don't load default page - default may contains directives
		data=z(zo(tabHlp['hlpdef']).p)+"\n"+"♂"+data; //add default page at start - this is different from a header, as it goes in 'intro' block ???
	imgpar	 = direct('image');	
	imgborder= imgpar.indexOf("border")>=0;
	myclass  = direct('class');  // all directives after loading default pages
	hlpfoot  = direct('hlpfoot'); 
	hlphead  = direct('hlphead'); 
	allweb   = direct('allweb');	
	hlpdiag  = direct('hlpdiag');
	nodate 	 = direct('nodate'); 
	nofoot 	 = direct('nofoot'); // to stop adding footer, precedence on hlpfoot
	nohead 	 = direct('nohead'); // to stop adding header, precedence on hlphead
	notitle	 = direct('notitle'); 
	notoc 	 = direct('notoc');	
	numtitle = direct('numtitle'); 
	numtitle = (numtitle && !direct('nonum')); // nonum directive have precedence on numtitle
	tabHlp[hpage].search = !direct ('nosearch'); // page is authorized for search
	//-- directives before page inclusion, avoiding included page directives --
	data = data.replace (/<<([\s\S]*?)>>/g, function (mt) { // token codeblocks before page inclusion
		tmp.push(mt); // is that really useful for a quite rare encounter (only in syntax page ??)
		return '▲';
	});
	//-- Sub pages inclusion -- don't retrieve the titles ---------------------------------
	data=data.replace(/\(:include\s([\w-]*?):\)/g,  function(mt, p1) {
		return z(zo(tabHlp[hlpNamePage(p1)]).p); // newlines were cleaned during storage
    });
	//-- block markups -------------------------------------------------------------------
	untoken (tmp,'▲'); // untoken codeblocks after after page inclusion, to be retokenized for global page
	data = data.replace (/<<\n?([\s\S]*?)>>(\n(?=\w))?/g, function (mt, p1) { //don't remove newline if not word char
		var iclass = (p1.indexOf('\n')<0) ? ' class="inline"' :''; // if no newline -> inline stuff
		codeblocks.push('<pre'+iclass+'><code>'+ p1 +'</code></pre>'); // in a <pre> block, '/n' are taken into account
		return '▲'; //U+25B2
	});
	data=data.replace(/\/\*.*?\*\//g, ''); // /*Comments*/  non greedy
//	data=data.replace(/%([A-F0-9]{2})/g,'·$1'); //replace % by char 250 for Hex encoding- protection of URI encoding as % is used in markup -- left for unrecognised web links .. any use ??
	data=data.replace(/_\n/g,''); // continue without taking into account line feed - NO added space (for tables)
	for (i=0; i< 4; i++) //four keys maxi - get them from select box
		if (document.hform.elements["aqlkey"+i])
			aqlO.selKey[i] = document.hform.elements["aqlkey"+i].value.trim().toLowerCase();	
	var regsel = /^([\w-.,]*)([+-])\/=\n*([\s\S]*?)\n*=\/\n*/gm;  //catch everything in selected paragraphs (includes \n)	
	data=data.replace(regsel, function(m, p1,p2,p3) {
		p3+="\n"; // at least one newline is required between blocks - others eated to avoid accumulation on succeeding select blocks
		var fkey = p1.toLowerCase().split(',');
		var res= (aqlO.selKey.length)? ((p2=="+")?"":p3) : p3; // maintain all if no key
		for (i=0; i< fkey.length; i++) 
			res = (aqlO.selKey.indexOf(fkey[i].toLowerCase().trim())>=0)? ((p2=="+")?p3:"") : res;
		return res;
	});
	//-- Title tokenisation -------------------------------------------------------------
	data = data.replace (/^={2,4}[>|<]?[\t ]*([^\n]+)/gm, function (mt) {
		titles.push(mt); 
		return '♦';  //U+2666
	}); 
	//-- External links and image markup --- no link within titles  ---------------
	rgximg = /"([^"\n]*?)(\d+)([LRCIlrci]?)%(%|pdf%)?(([\w-\.]*\/){0,4}[\w-\.]+\.)(png|jpg|svg)\s?"/g; //capture image WITH legend
	data=data.replace(rgximg, function(m, p1,p2,p3,p4,p5,p6,p7) { // simple '%'  ->bigger image
		p3 = p3.toUpperCase();
		p5 = z(p5).toLowerCase();		
		var iclass = (!imgborder || p3=="I") ? "": ((p3=="C") ? "aqlimgCb " : "aqlimgb "); 
		var res = '<div class="'+iclass+'hlpimg'+z(p3)+'"><img src="'+aqlO.url+aqlC.dispDir+z(p5)+z(p7)+
			imgwd(p2)+"<p class='aqllegend'>"+z(p1)+"</p></div>";
		res = (p4=="pdf%") ? '<a href="'+aqlO.url+aqlC.docDir+z(p5)+z(p4).slice(0,-1)+imgtg+res+"</a>" : res;
		res = (p4=="%")? res : '<a href="javascript:aqlimg(\''+z(p5)+z(p7)+'\');">'+res+"</a>";
		return res;
	});
	rgximg = /(\d+)([LRCIlrci]?)%(%|pdf%)?(([\w-\.]*\/){0,4}[\w-\.]+\.)(png|jpg|svg)/g; //capture image
	data=data.replace(rgximg, function(m, p1,p2,p3,p4,p5,p6) { // simple '%'  ->bigger image
		p2 = p2.toUpperCase();
		p4 = z(p4).toLowerCase();
		var iclass = (!imgborder || p2=="I") ? "": ((p2=="C") ? "aqlimgCb " : "aqlimgb "); 
		var res = '<img class="'+iclass+'hlpimg'+z(p2)+'" src="'+aqlO.url+aqlC.dispDir+z(p4)+z(p6)+imgwd(p1);
		res = (p3=="pdf%") ? '<a href="'+aqlO.url+aqlC.docDir+p4+z(p3).slice(0,-1)+imgtg+res+"</a>" : res;
		res = (p3=="%")? res : '<a href="javascript:aqlimg(\''+p4+z(p6)+'\');">'+res+"</a>";
		return res;
	});
	rgximglnk = /%([^%\n]*?)%(([\w-\.]*\/){0,4}[\w-\.]+\.)(png|jpg|svg)/g; //word -> image	AFTER  images
	data=data.replace(rgximglnk,'<a href="javascript:aqlimg(\'$2$4\');">$1</a>'); //word link to image (= 'Media:' markup on wikimedia)
	//-- Web links ------------------------------------------------------------------------------------------
	//var rlk1= /%([^%\n]*)%"(http(s?)\:[^"]*)"/g; //this Regex capture not valid web addresses - may check validity at later phase? 
	var rlk2= /"(#?)([^"\n]*?)[\t ]*(http(s?)\:\/\/)(([\da-z\.-]+)\.([a-z\.]{2,6})[^"\n]*)"/g;  //could we get optional http if run before image link ?  
	var rlk3= /(http(s?)\:\/\/)(([\w\.-]+)\.([\w\.\?\=]{2,6})[\S]*)/g; // Isolated link without " " - capture end dots
	data=data.replace(rlk2,function (mt,p1,p2,p3,p4,p5) { // tokenize and replace links -> help for search
		weblnk = 'http'+z(p4)+'://'+z(p5);
		p2 = (p2)?p2.trim()+aqlC.sweb :""; // format link text
		weblnk1 = '<a href="'+weblnk+'" target="_blank">'+p2+((!p2)?weblnk:"")+'</a>'; // if no text, display address
		weblnk2 = '<a href="'+weblnk+'" target="_blank">'+p2+weblnk+'</a>'; //always address
		if (p1) {// prefix '#' present
			refs.push(weblnk2); //store references for future display
			weblinks.push(hlpAnchor(hpage, 'bxref'+(++refidx))+
				hlpGoAnchor(hpage, 'xref'+refidx, '['+refidx+']'));
		}	
		else {
			weblinks.push(weblnk1+((allweb)?hlpAnchor(hpage, 'bxref'+(++refidx))+'['+refidx+']':"")); 	
			if (allweb) 
				refs.push(weblnk2); // list all links
		}	
		return '♥'; //U+2665
	}); 
	data=data.replace(rlk3,function (mt,p1,p2,p3) { // tokenize and replace links -> help for search
		weblnk = '<a href="http'+p2+'://'+p3+'" target="_blank">'+p3+aqlC.sweb+'</a>';
		weblinkis.push (weblnk);
		return '▼'; //U+25BC  
	});
	//-- simple markups -------------------------------------------------------------
	data=data.replace(/^----/gm,'<hr>'); // shall precede -- something-- markup, if defined anyday
	data=data.replace(/<q>([\s\S]*?)<\/q>/g, function(mt, p1) { //  quote and blockquote
		return (z(p1).match(/\n/))?'<blockquote>'+z(p1)+'</blockquote>':mt; // became a block quote if there is \n in
	});
	data=data.replace(/\/\/(([^\/]|\/[^\/])*)\/\//g, '<em>$1</em>');//  //Emphasize(italic)//
	data=data.replace(/__(([^_]|_[^_])*)__/g, '<u>$1</u>');//  __underline__
	data=data.replace(/\b([a-y]+)\^\^(([^\^]|\^[^\^])*)\^\^/g, '<span style="background:$1">$2</span>'); // color^^highlight^^
	data=data.replace(/\^\^(([^\^]|\^[^\^])*)\^\^/g, '<mark>$1</mark>'); // yellow ^^highlighting^^
	data=data.replace(/^:([^\/].*)\n/gm,'<div class="hlpindent">$1</div>'); //: indented para - beware table markup
	data=data.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // **strong** characters BEFORE bullet list
	data=data.replace(/^\*[\t ]*(.*)\n/gm,'<ul><li>$1<\/li><\/ul>'); // bullet list
	data=data.replace(/<\/li><\/ul><ul><li>/g,'</li><li>'); 
	data=data.replace(/^#[\t ]*(.*)\n/gm,'<ol><li>$1<\/li><\/ol>'); // numbered list
	data=data.replace(/<\/li><\/ol><ol><li>/g,'</li><li>'); 
	data=data.replace(/<\/h([345r])>\n/g,'</h$1>'); // remove line feeds from title lines
	data=data.replace(/<\/ul>\n/g,'</ul>');
	data=data.replace(/<\/ul>\n/g,'</ul>'); //remove line feed twice after li
	data=data.replace(/<\/ol>\n/g,'</ol>');
	data=data.replace(/<\/ol>\n/g,'</ol>'); //remove line feed after li
	
	//-- internal links --------------------------------------------------------------
	var re0 = /([\s>])\"#[\t ]*?(([^\s<>,;"]+[\t ]*)*)"/g; // notes
	var re1 = /%([\w\u00C0-\u017F][^%\n]*?)%(([\w-\u00C0-\u017F]*![\w-_:\/.\u00C0-\u017F]*[\w-_:\/\u00C0-\u017F]+)|([\w-_:\/\u00C0-\u017F]+))/g;
	var re3 = /%([\w\u00C0-\u017F].*?)%%/g;
	data=data.replace(re0, function (mt,p1,p2) { 
		notes.push(p2); //store notes for future display
		return p1 + hlpAnchor(hpage, 'bnotes'+(++notesidx))+
			hlpGoAnchor(hpage, 'notes'+notesidx, '[n'+notesidx+']');
	}); 
	data=data.replace(re1,  function (mt, p1, p2) {
		return hlpCall(hlpNamePage(p2), p1+aqlC.slink);
	}); 
	data=data.replace(re3, function (mt, p1) {
		return hlpCall(hlpNamePage(p1), p1+aqlC.slink);
	});
	//-- tables ----------------------------------------------------------------------------------------------
	data = data.replace (/^\/:([\s\S]*?)^:\//gm, function (mt, p1) { 
		tables.push(aqlTable(p1)); 
		return '♠'; //U+2660
	});
	//--------------------------------------------------------------------------------	
	data=data.replace(/^([\t \n]|<br>)*/,""); // remove leading spaces and newline (due notably to directives)
	data=data.replace(/\n/g,'<br>'); // all line feed taken into account 
	data=data.replace(/(<br>)*♂(<br>)*/,""); // remove newlines between default page and page- was needed for markup interpreter
	data+="(:clear:)"; // to have the window height adjusting to height.
	data=data.replace(/[\t ]*\(:clear:\)[\t ]*(<br>)*/gm, cleardiv); // clear image
	//== introduction =============================================================
	var npos = data.search (/♦/g);  // Isolate text which is before first title (== title)
	intro = (npos>=0) ? data.substr (0,npos): data;
	data  = (npos>=0) ? data.substr (npos)  : '';	
	ptitle = (notitle)? "":'<h1 role="banner">'+tabHlp[hpage].title+'</h1>'; //???
	intro = '<div class="hlpintro">'+ptitle+intro+'</div>'+((intro)?cleardiv:""); 
		//We  clear intro only if there is text inside - title is always in the intro
	//== Titles and associated blocks, Table of content ===========================
	var axz = aqlTocSection (data, titles, hpage, notoc, numtitle); 
	data = axz.toc+intro+'<div class="hlpbody">'+axz.data+'</div>'; 
	//===============================================================
	data = data.replace (/(<br>)*♦(<br>)*/g, '♦'); // clean newlines before/after titles
	data = data.replace (/<br><br><br>/g, '<br><div class="spacer2"></div>'); // not classy, but using <p></p>
	data = data.replace (/<br><br>/g, '<br><div class="spacer1"></div>'); // in a wiki is fairly difficult.
	untoken(titles,'♦');
	if (refs.length && !data.match(/\(:reflist:\)/g))
		data += '<br><strong>Internet links</strong>(:reflist:)'; // if no refs and links, add at page end
	data = addlistref (refs, /\(:reflist:\)/,'xref'); // directive for referenced links
	data = addlistref (notes, /\(:notes:\)/,'notes'); // Directive for notes	
	data = aqlTrail (data, hpage);
	if (hlpdiag)
		data = data +'<br><small>'+aqlO.loadTime+'  Page interpretation: '+Math.round(hlptimenow()-now)+
			'ms  '+hlpCall ("hlptest", "__")+'  Board: '+hlpSelId+'</small>'; 
	data = data.replace ('<br>♠','♠');
	untoken(tables,'♠');
	untoken(weblinks,'♥');
	untoken(weblinkis,'▼');  	
	//data = data.replace(/·/g,'%'); // replace char 250 by % (for URI encoding)	after untoken of weblinks 
	data = remdirect (data);
	 //remove all remaining directives - when doubled
	if (!aqlO.listAll)
		untoken(codeblocks,'▲'); //U+25B2  - Last to not modify directives
	data = data.replace (/<code>\s*(<br>)*/g, '<code>') // remove leading newlines inside a pre-block
			.replace (/<hr>\s*(<br>)*/g, '<hr>') // remove leading newlines after a line
			.replace (/(<br>)*<\/code><\/pre>\s*<br>/g, '</code></pre>'); // eliminate 1 newline before & after </pre>
	data += "<br>"; // <br>needed as directive removal eat them
	if (!nodate) data += "&nbsp;<small>Date:"+pgdate+"</small>";
	if (!nofoot) data += remdirect(z(zo(tabHlp[hlpfoot]).p)); //no wiki markup interpretation of the footer nor header
	if (!nohead) data = remdirect(z(zo(tabHlp[hlphead]).p))+data;
	if (myclass) // add global personnal class - around footer and header also ??
		data = '<div class="'+ myclass.trim()+'">'+ data +'</div>'; 
	data += '<br><br><br><br><br><br>'; // bug with taskbar height, so add empty lines	
	//alert (data.replace (/<br>/g, '\n'));
	return data;
}

function aqlTrail (data, curpage) { // why there is two <br> after a trail ??
	var re1 = /%(([^%\s<>,;]+[\t ]*){1,12})%(([\w-\u00C0-\u017F]*![\w-.\u00C0-\u017F]*[\w-\u00C0-\u017F]+)|([\w-\u00C0-\u017F]+))/;
	var re2 = /%(([^%\s<>,;]+[\t ]*){1,8})%%/; 
	var tb =[], tbtxt = [], res, prec, suc, i, idx=0;
  	data = data.replace (/\(:trail[\t ]+?([\w-\t ]*?):\)(<br>)*/g, function (mt, p1) {
		var tpage = hlpNamePage(p1);
		if (z(zo(tabHlp[tpage]).p)) {
			var tabtrail = tabHlp[tpage].p.split ('*');
			for (i=1; i<tabtrail.length; i++) {
				res = tabtrail[i].match (re1);
				if (!res) {
					res = tabtrail[i].match (re2);
					if (res) {
						tb[i] = hlpNamePage(res[1]);
						tbtxt[i] = z(res[1]);
					}	
				}	
				else {
					tb[i] = hlpNamePage(res[3]);
					tbtxt[i] = z(res[1]);
				}
				if (tb[i] == curpage) 
					idx=i;
			}	
			if (idx) {
				prec = (idx>1) ? hlpCall(tb[idx-1],tbtxt[idx-1]) : "";
				suc  = (idx<(tabtrail.length-1)) ? hlpCall (tb[idx+1],tbtxt[idx+1]) : "";
				return '<div style="text-align: center;"><'+prec+"|"+hlpCall (tpage, p1)+"|"+suc+"></div>";
			}	
			else
				return '<span style="color:red">'+T("Page {0} not found in trail page {1}", curpage,tpage)+'</span>';
		}
		else 
			return '<span style="color:red">'+T("Trail page {0} did not exist - check character case", tpage)+'</span>';
	});
	return data;
}

function aqlTocSection (data, titles, hpage, notoc, numtitle) { // build toc and titles, with sections delimitations
var titlenum="", title, titlenolnk, level,  l1=1, l2=1, l3=1; 
var ttl=[0,0,0], collapsible, clpdisp, icon, lead, clpclass; // collapsible sections
var i, j, toc="", tsp;
	if (titles.length) { // shall run to have anchors even if no toc
		var icondown = '<span class="licon aqi qexpand"></span>&nbsp;';
		var iconup   = '<span class="licon aqi qcollapse"></span>&nbsp;';
		for (j=0; j<titles.length ; j++){
			level = Math.min (titles[j].match(/=/g).length,4); //Count '=' for css class definition 
			collapsible = titles[j].match (/^[=]{2,4}([>|<])/);
			clpdisp = collapsible ? ((collapsible[1]=='<')? ' style="display:none" ':'') :'';
			icon    = collapsible ? ((collapsible[1]=='<')? icondown : iconup) :'';
			title = titles[j].replace (/^[=]{2,4}[>|<]?[\t ]*([^=]+?)[\t ]*$/,'$1');
			titlenolnk = title.replace (/(.*)%(.*)%.[^\s]*(.*)/,'$1$2$3'); // get text of a link (and text around) ??
			if (titlenolnk) title = titlenolnk;  // replace text with link
			if (numtitle)
				switch(level) {
					case 2:	titlenum = l1.toString()+'. ';  						l3=1;	l2=1;	l1++; break;
					case 3: titlenum = (l1-1).toString()+'.'+l2.toString()+'. '; 			l3=1;	l2++; break;
					case 4: titlenum = (l1-1).toString()+'.'+(l2-1).toString()+'.'+l3.toString()+'. ';	l3++;
				} 
			toc += '<a href="#'+hlpDefAnchor(hpage, title)+'" class="rtoc'+level+'">'+titlenum+title+'</a><br>'; // go to anchor
			lead=""; // nested div management	
			for (i=2; i>level-3; i--)
				if (ttl[i]) {
					ttl[i]=0; 
					lead+='</div></div>';
				}
			clpclass = (collapsible) ? ' class="hlptt"': ''; // indicate title can collapse section
			ttl [level-2]= 1; //always have a container over section content - formatting and code simplicity
			titles[j] = lead+'<div>'+hlpAnchor(hpage,title)+'<h'+level+clpclass+' id="'+hpage+j+'">'+ // id used by toggling 
				titlenum+icon+title+'</h'+level+'><div class="hlpsec"'+clpdisp+'>'; //shall be != for menu & main page	
		}
		for (i=0; i<3; i++) // close all sections
			if (ttl[i]) data +='</div></div>';
		toc = (aqlO.listAll||notoc||(!toc)) ?
			"" : '<div class="hlptoc" role="navigation" aria-label="Secondary">'+toc+'</div>';  
	}	
	return {data:data, toc:toc};
}

function aqlTable (tabmark) {
var i, j, tab="", tabtot=[], row=[], ncol=0, ncol1, val, mt, calign, tdh, alt, cl;	
	function chktxt(txt) {
		calign = '';
		tdh = 'td';
		if (txt) {
			var mt = txt.match(/^(=)?(\*)?([\t ]*)(.*?)([\t ]*)$/); 
			if (mt) {
				txt = z(mt[4]);
				tdh = (z(mt[1])=='=')?'th':'td';
				if (z(mt[2])=='*')
					txt = '<strong>'+txt.trim()+'</strong>'; 
				if (z(mt[3])&&!z(mt[5]))
					calign =' style="text-align:right"';	
				else if (!z(mt[3])&&z(mt[5]))
					calign =' style="text-align:left"';	
				else
					calign =' style="text-align:center"';
				return txt.trim();	
			}
		}
		return "";
	}
	if (tabmark) {
		var tabarr = tabmark.split('\n');
		var nrow = tabarr.length-2; //last line always empty, first line caption
		tab = tabarr[0].replace (/^(([LRCI])(\w*?))?((^|[\t ]).*)$/, function (mt, p1,p2,p3,p4){
				p4 = z(p4).trim();
				p4 = (p4)?'<caption>'+p4+'</caption>':"";	
				var cl = z(p2)?((p2=='L')?'left':((p2=='C') ?'center':(p2=='R')?'right':'inline')):'center';
				cl += z(p3)? " "+p3:""; // add personalized class
				return '<table class="'+cl+'">'+ p4;
		});
		for (i=0; i<nrow; i++)	{ // column counter
			tabtot[i] = (tabarr[i+1])?tabarr[i+1].split('::') :[];
			ncol1 = tabtot[i].length;   // if last col empty, not counted 
			ncol = Math.max (ncol, ncol1 - ((z(tabtot[i][ncol1-1]).trim())?0:1));
		}	
		for (i=0; i<nrow; i++)	{
			alt=(i%2)? ' class="tbalt"' : ''; // even rows have 'alt' class
			mt = z(tabarr[i+1]).match (/^::(.*?)(::.*)?$/)
			if (mt) {
				val = chktxt (mt[1]); // set cstrong and tdh
				tab	+= '<tr'+alt+'><'+tdh+' colspan='+ncol+calign+'>'+val+'</'+tdh+'></tr>';
			}
			else {
				mt = tabarr[i+1].match(/^(.*):::(.*?)(::.*)?$/);
				if (mt) {
					val = chktxt (mt[1]);
					tab	+= '<tr'+alt+'><'+tdh+calign+'>'+val+'</'+tdh+'>';
					val = chktxt (mt[2]);
					tab	+= '<'+tdh+' colspan='+(ncol-1)+calign+'>'+val+'</'+tdh+'></tr>';
				}
				else {	// management of empty lines ??
					tab	+= '<tr'+alt+'>';
					row = z(tabtot[i]);
					for (j=0; j<ncol; j++) {
						val = chktxt (row[j]);
						tab	+= '<'+tdh+calign+'>'+val+'</'+tdh+'>';
					}	
					tab	+= '</tr>';
				}	
			}
		}
		tab +='</table>';
		if (z(cl)=="center") // to be centered, a table shall be in a container
			tab = '<div style="text-align:center;">'+tab+'</div>';
		// alert (tab.replace (/<\/tr>/g,'</tr>\n'));
		return tab;
	}	
}

function aqlList (idx) { // return an array from a page list, comma or line separated, with name conditioning
	var arr, arr2=[], page = z(zo(tabHlp[idx]).p);
	arr = page.replace(/[\r*#]/g,'') // eliminate CR and bullet/numbered list prefix
			.replace(/\(:[\w- \t]*?:\)/g,'') // remove directives (notoc, nosearch, etc.)
			.replace(/[\n]/g,',') //newline is a separator
			.split(',');
	for (var i=0; i<z(arr).length; i++)
		if (hlpNamePage (arr[i]))
			arr2.push(hlpNamePage (arr[i]));
	return arr2; // return empty array if page not existing or not valid	
}

function hlpSetContent (hpage, x, stateCh) {
	var dpage, htext="", n="", idx, len, str,i, itab, mnu, xlnk=[];
	idx = (hpage=='hlplast') ? aqlO.lastP : hpage; // if call for last page
	if (idx == 'hlpall') { // all pages in one go - for printing - modify to print any list ?? Integrate with HlpPrint function
		var allHlp = aqlList("aqlprtall"); // contains a list of pages to print - pass as parameter (in anchor ?)
		for (i=0; i<allHlp.length; i++) {
			if (i)
				htext+="<div class='brk'></div><br>";// add page break at each help page
			dpage = z(zo(tabHlp[allHlp[i]]).p);
			if (dpage) // 'All pages' title is toc page title
				htext+="<div style='page-break-inside: avoid;'>"+aqlTrans(dpage, allHlp[i])+"</div>";
		}
	}
	else { // ordinary pages
		dpage= z(zo(tabHlp[idx]).p);
		if (dpage && dpage.substr(0,2)=='->') {// forward page
			idx = hlpNamePage (dpage.match(/^->(.*)/)[1]);
			dpage = z(zo(tabHlp[idx]).p);
		}	
		if (dpage) {
			htext=aqlTrans (dpage, idx); // convert before search word highlighting
			if (aqlO.lastP=='aqlsearch') { // if linked from search page, highlight search on called page 
				var pos=0, j=-1, tabSearch=[];
				//htext = htext.replace (/<a (href|id)=.*?>/g, function (mt) { // tokenize links/anchors
				htext = htext.replace (/<(a h|a id=|a na|div|img|\/|table|h|tr|th|td).*?>/g, function (mt) { // tokenize some html markup
					xlnk.push(mt);
					return '♣';
				});
				var lenStr = tabHlp['aqlsearch'].title.length; // title contains the search word
				var dpageNorm = accentsNorm(htext.toLowerCase());
				while (pos != -1) { // index calculated on lowercased page
					pos = dpageNorm.indexOf(tabHlp['aqlsearch'].title, j + 1);
					tabSearch.unshift(pos); // will be inserted at end to maintain index
					j = pos;
				}
				for (j=1; j<tabSearch.length; j++) { // position 0 includes -1
					htext = insertStr(htext,tabSearch[j]+lenStr,"</mark>"); //end markup before first for index
					htext = insertStr(htext,tabSearch[j],"<mark>");
				}
				if (xlnk) //untoken
					for (j=0; j<xlnk.length; j++) 
						htext = htext.replace ('♣',xlnk[j]);
			}
		}
	}
	if (!htext ) { // page not found, so we load table of content
	  	htext = htextnohlp; // ?? error if help not loaded
		htext+= aqlTrans(z(tabHlp['home'].p), 'home'); // add table of content
		idx='home';
	}
	//if (idx=='home') // If we are in homepage print ALL help ??
	if (aqlO.tabbed) {
		itab = aqlO.groups.indexOf (z(tabHlp[idx].groups)[0]);
		if (itab==-1) itab=0;
		$(".aqltab>button").removeClass("aqlsel");
		$(".aqltab>button").eq(itab).addClass("aqlsel");
		mnu = (itab) ? "menu_"+aqlO.groups[itab] : "menu";
		if (!tabHlp[mnu]) 
			mnu ="menu";
		if (aqlO.dispMenu)
			$0('aql_menu').innerHTML= aqlTrans(z(tabHlp[mnu].p), mnu);
	}
	$0("aql_body").innerHTML = htext; //replace html content - modify header ?? (hd)
	$0("tthlplbl").innerHTML = tabHlp[idx].title; //set title in top banner
	aqlO.lastP = idx;				
	hlpCreEvents(); // We have new html components with events (toggled sections), reloading delete events
	//console.log (aqlO.linkbase+'#'+aqlC.prefix+idx); // block android
	var anchor = (idx=='aqlsearch') ? '!'+tabHlp[idx].title:""; // search word as anchor
	if (!stateCh) // 2nd argument is statechange
		history.pushState("", "", aqlO.linkbase+'#'+aqlC.prefix+idx+anchor);
}

function searchHlp() { // Search a text in all help file
	var page, title, fText, i, id;
	var tbFound=[], tbFoundTitle=[], idxTb=0, idxTbT=0;
	var stext = tabHlp['aqlsearch'].title; // title used to store search word 
	for (id in tabHlp) {
		if (tabHlp[id]&&tabHlp[id].search&&(tabHlp[id].p.substr(0,2)!='->') //exclude nosearch, empty and redirect pages
			&& id!='prtall') { // check search flag - set in load all pages
			title = accentsNorm(tabHlp[id].title).toLowerCase(); 
			page  = accentsNorm(tabHlp[id].p).toLowerCase(); //all search in lowercase 
			if (title.indexOf(stext)>-1) // search first in titles
				tbFoundTitle[idxTbT++]=id;
			else if (page.indexOf(stext)>-1)
				tbFound[idxTb++]=id;
		}
	}
	if (idxTbT>0 || idxTb>0) {
		fText = "(:notitle:)\n<hr>"+T("<b>{0}</b> found in following pages:", stext)+"<hr>";
		for (i=0; i<idxTbT; i++)
			fText+="%"+tabHlp[tbFoundTitle[i]].title+"%"+tbFoundTitle[i]+'\n';
		fText+="<hr>\n";
		for (i=0; i<idxTb; i++)
			fText+="%"+tabHlp[tbFound[i]].title+"%"+tbFound[i]+'\n';
	}
	else 
		fText = "<hr>  "+T("<b>{0}</b> was not found", stext)+"\n<hr>";
	return fText; // return a html text with links list
}

function hlpPrint() { // print the body of the help windows - reinterpret with options
	var $printSection = $0("printSection",true); // defined in CSS 
	if (!$printSection) {
		$printSection = document.createElement("div");
		$printSection.id = "printSection";
		document.body.appendChild($printSection);
    }
	var head = z(zo(tabHlp["printheader"]).p);
	var page = ((head)?head:'(:notoc:)(:allweb:)')+z(zo(tabHlp[aqlO.lastP]).p);
    $printSection.innerHTML = aqlTrans(page, aqlO.lastP);
	window.print();
};

//-- Loading external pages --------------------------------------------------------------
window.hlpLoadAll= function() { // used for search and diagnostics - build an index
	var runFunc = arguments[0]; // function started when loading complete
	if (aqlO.loadAll) 
		runFunc();
	else {
		hlpLoadAll.refP = []; // store pages referenced as not in tabHlp (and not already searched)
		hlpLoadAll.Eidx = 0; // index of not in tabHlp pages
		hlpLoadAll.curPage = aqlO.lastP; // load all page modify last page (set by content loader)
		hlpChklnk(hlpAllIntPages(), ""); 
		hlpLoadExt(runFunc); // load all pages in reference list, add new references as needed
	}
}	

function hlpAllIntPages() { //interpret pages which are already in memory - for link search
var dpage, lnk, htext="", id, time = hlptimenow();
	aqlO.listAll = true;
    for (id in tabHlp) {
		if (id!='aqlsearch' && id!='prtall' && id!='hlptest') { 
			dpage = z(zo(tabHlp[id]).p);
			if (dpage)
				htext+='<hr>'+aqlTrans(dpage, id);
		}
	}
	console.log ('Whole in-memory page process time: '+Math.round(hlptimenow()-time)+' ms');
	aqlO.listAll = false;
	return htext;
}

function hlpLoadExt(runFunc)  {
	var lnk;
	if (hlpLoadAll.Eidx==hlpLoadAll.refP.length) {
		aqlO.loadAll=true; // all pages are loaded in memory
		aqlO.lastP = hlpLoadAll.curPage;
		runFunc();
	}	
	else { 	// load file one after the other, less trouble than multiple runs
		lnk = hlpLoadAll.refP [hlpLoadAll.Eidx];
		$.ajax(aqlO.url + lnk +'.txt', {  // load help content
			dataType: "text",
			global: false,
			success: function(response, status, error) { // callback function while page loaded
				if (z(response).substr(0,2)=="<!") { // 404 page
					arrayAdd (aqlO.nFound, lnk);	
				}
				else {	
					hlpStore (response,lnk);
					if(tabHlp[lnk]) { // page may not be created if empty, not format compliant, etc.
						tabHlp[lnk].ext="(ext)";
						hlpChklnk(aqlTrans(z(tabHlp[lnk].p),lnk), lnk); // add new links of this page		
					}
				}
				hlpLoadAll.Eidx++;
				hlpLoadExt(runFunc); 
			},
			error: function(xhr, status, error) { 
				arrayAdd (aqlO.nFound, lnk);
				hlpLoadAll.Eidx++;
				hlpLoadExt(runFunc); 
			}
		});
	}
}

function hlpChklnk(htext, id) { // stack pages not found in the hash table ( not loaded external or non existing)
	var lnk, ilinks = htext.match (/wHlp\('[^'#]*(?='\))/g); //all internal links 
//	var ilinks2 = data.match (/showHlp\('(.*?)(<br>|<a href=)/g); //add what follow the link for contextualisation - broken
	for (var i=0; i<z(ilinks).length; i++) {
		lnk = hlpNamePage (ilinks[i].substr(6).split('!',1)[0]); // eliminate leading and anchor
		if (lnk.length > aqlC.linkMaxLength) {
			if (id) hlpalert (T('Link "{0}" length exceed {1} in page {2}', lnk, aqlC.linkMaxLength, id)); // add some context !!
		}	
		else if (!tabHlp[lnk] && (aqlO.nFound.indexOf(lnk)<0) && (aqlO.nValid.indexOf(lnk)<0))
			arrayAdd (hlpLoadAll.refP, lnk); // stack link as referenced (if not already referenced)
	}
} 

function hlpListBack() { // list backlinks
var id, tabTrans = {};	
	aqlO.listAll = true; // unactivate toc and pre block
	for (id in tabHlp) // create hash table of converted markup
		tabTrans[id] = (tabHlp[id]) ? aqlTrans(z(tabHlp[id].p), id):"";
	$0("aql_bk").innerHTML = "What links here:<br>"+backlinks(tabTrans,aqlO.lastP,"<br>");
	aqlO.listAll = false; // reactivate toc and pre block	
	setTimeout(function() { // when interpretation too fast, we are still in click event, which close the just open window
		$0("aql_bk").style.display = 'block';
	}, 100);	
}

function backlinks(tabH, link) {
var backlnk, i, id, pagetx, nblink;
var	bsep = (arguments[2])? arguments[2]:", "; // backlinks separator
var text = (arguments[2])?'':'<strong>'+z(zo(tabHlp[link]).ext)+link+' :</strong>';	
	for (id in tabHlp) {
		pagetx = tabH[id];
		if (pagetx) {
			nblink=0;
			var ilinks = pagetx.match (/wHlp\('[^'#]*(?='\))/g); //all internal links 
			for (i=0; i<z(ilinks).length; i++) {
				backlnk = hlpNamePage(ilinks[i].substr(6)).split("!",1)[0]; // eliminate leading chars and anchors
				if (backlnk==link) {
					if (!nblink) 
						text+=hlpCall(id,id)+'(';
					nblink++;  // count number of links in same page
				}	
			} 
			if (nblink)	
				text+=nblink+')'+bsep;
		}	
	}	
	return text;
}

//== Utilities ===================================================================
function z(val) {return (val||'');} // Make empty strings of undefined
function zo(obj) {return (obj==undefined)? new Object():obj;} // Make empty object of undefined

function $0 (id) { // Search DOM by Id
	var r = document.getElementById(id); 
	if (!r) {
		if (!arguments[1]) alert ("element "+id+ " not found"); // can stop the error if 2nd param =true;
		return null;
	}
	else 
		return  r;
} //return a DOM element
function $T (id) { // return a node list, second parameter is the root element, by default document
	var el = arguments[1]? arguments[1] :document;
	return el.getElementsByTagName(id);
}
function accentsNorm(s, full) { // found on stackoverflow, for most latin language. 
// transform accented letters in plain letters (uppercase AND lowercase) (for search or other purpose)
    var map = [    //["\\s", ""],  We left spaces in place as they are counted in index - for highlighting
		["[àáâãäå]", "a"],
		["ç", "c"],
		["[èéêë]", "e"],
		["[ìíîï]", "i"],
		["ñ", "n"],
		["[òóôõö]", "o"],
		["[ùúûü]", "u"],
		["[ýÿ]", "y"],
		["¿", "?"],
		["¡", "!"],
		["[ýÿ]", "y"],
		["[\-:]"," "],
    ];
	if (full) //next are  not used for search as they change the character index counter
		map = map.concat(["æ", "ae"],["œ", "oe"],["ß", "ss"],["\\W", ""]);
    for (var i=0; i<map.length; ++i) 
        s = s.replace(new RegExp(map[i][0], "gi"), function(match) {
            if (match.toUpperCase() === match)	return map[i][1].toUpperCase();
            else 				               return map[i][1];
        });
    return s;
}

function insertStr (source, index, string) {// insertion of a string within another - index CAN BE undef
    return (index) ? source.substr(0, index) + string + source.substr(index) : source;
}
function arrayAdd (arr, val) {  // add only if not existing
	if (arr.indexOf(val)==-1) arr.push(val);
}
function aqleft_button(e) { // return true if left button clicked
    e = e || window.event;
    return e.which == null ? e.button < 2 : e.which < 2;
}
//== Writer tools == from this line to the end, can be removed on final user program ===================
function hlpListAll() { // list all pages on current window - called by hlpLoadAll
var i, id, tabTrans = {};	
	aqlO.listAll = true; // unactivate toc and pre block
	var text = '<div style="margin:12px;"><strong>Internal & External pages with backlinks (referers) and link quantity per backlink</strong><br>';
	for (id in tabHlp) // create hash table of converted markup
		tabTrans[id] = (tabHlp[id]) ? aqlTrans(z(tabHlp[id].p), id):"";
	for (id in tabHlp) // tabHlp is a hash table, so 'in' works
		text += backlinks(tabTrans,id)+"<br>"; //id +'<br>';
	text+='<hr><strong>Not found pages:</strong><br>'
	for (i=0; i<aqlO.nFound.length; i++) //for..of may work, but compatibility is delicate
		text += backlinks(tabTrans, aqlO.nFound[i])+"<br>";
	text+='<hr><strong>Not valid pages:</strong><br>'	
    for (i=0; i<aqlO.nValid.length; i++) 
		text += backlinks(tabTrans, aqlO.nValid[i])+"<br>";
	$0("aql_body").innerHTML = text+'</div><br><br><br><br><br><br>'; 
	aqlO.listAll = false; // re-allow normal interpretation
}	

function hlpAllWeblnk() { // list all links for all pages - DO NOT search identical links
var count=0, text="", page, id, m, re=/(<a href="htt.*?<\/a>)/g;	
	for (id in tabHlp) { 
		text+="<br>Page:"+id+":<br>";
		page = aqlTrans(z(tabHlp[id].p), id);
		while (m=re.exec(page))  
			if (!m[0].match(aqlC.excluAllWeb)) { //exclude aquilegia link
				text+=" * "+m[0]+'<br>';
				count++;
			}	
	}
	text = T("<strong>There is {0} external links<strong><br> {1}", count , text); 
	$0("aql_body").innerHTML = text; 
} 

function hlpAllImglnk() { // check image links
var count=0, page, id, m, re = /<img class=.+?src="(.*?)"/g;	
var re2 = /href="([^"]*?\.([pP][nN][gG]|[jJ][pP][gG]|[sS][vV][gG]))"/g; //No external images
	$0("aql_body").innerHTML = '<br><strong>Images not found: </strong><br><br>'; 
	for (id in tabHlp) { 
		page = aqlTrans(z(tabHlp[id].p), id);
		while (m=re.exec(page))		hlpcheckImg(m[1], id);
		while (m=re2.exec(page))	hlpcheckImg(m[1], id);
	}
} 

function hlpcheckImg(url, id) {
	var img = new Image(), msg;
	if (url.length > (aqlC.linkMaxLength+aqlC.dir.length)) {
		msg = T("Link '{0}' length {1} exceed {2} in page {3}",url,url.length,(aqlC.linkMaxLength+aqlC.dir.length), id)+"<br>";
		$0("aql_body").innerHTML+=msg;
	}	
/*	if (url!=url.toLowerCase()) // ok, too many warnings, we shall change 
		hlpalert (T('Image or document name {0} shall be lowercase in page {1}', url, id)); */		
	img.id = id+'_'+img.unique_ID;
	img.onerror = function() { // store image name in id to recover when function end task
		var txt = T("Page : {0}<br>{1} not found", this.id.split('_')[0], this.src)+"<br><br>";
		$0("aql_body").innerHTML+=txt; 
	}
	img.src = url; // start loading
}