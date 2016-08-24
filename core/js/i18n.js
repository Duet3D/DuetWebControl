/* Internationalization routines for Duet Web Control
 * 
 * written by Christian Hammacher (c) 2016
 * 
 * licensed under the terms of the GPL v2
 * see http://www.gnu.org/licenses/gpl-2.0.html
 */


var showTranslationWarning = false;		// Set this to "true" if you want to look for missing translation entries

var translationData;


// Called to look up English strings and to translate them into the configured language.
// Variable arguments may be passed like T("Hello {0}, are you doing {1}?", "user", "well")
function T(text) {
	var entry = text;
	if (translationData != undefined) {
		// Generate a regex to check with
		text = text.replace(/{(\d+)}/g, "{\\d+}").replace("(", "\\(").replace(")", "\\)");
		text = text.replace("?", "[?]").replace(".", "[.]");
		var regex = new RegExp("^" + text + "$");

		// Get the translation node and see if we can find an entry
		var root = translationData.getElementsByTagName(settings.language).item(settings.language);
		if (root != null) {
			for(var i = 0; i < root.children.length; i++) {
				if (regex.test(root.children[i].attributes["t"].value)) {
					entry = root.children[i].textContent;
					break;
				}
			}

			// Log translation text if we couldn't find a suitable text
			if (showTranslationWarning && entry == text) {
				console.log("WARNING: Could not translate '" + entry + "'");
			}
		}
	}

	// Format it with the given arguments
	var args = arguments;
	return entry.replace(/{(\d+)}/g, function(match, number) {
		number = parseInt(number) + 1;
		return typeof args[number] != 'undefined' ? args[number] : match;
	});
}

// May be called only once on page load to translate the page
function translatePage() {
	if (translationData != undefined) {
		var root = translationData.getElementsByTagName(settings.language).item(settings.language);
		if (root != null) {
			translateEntries(root, $("p, span, th, td, strong, dt, button"), "textContent");
			translateEntries(root, $("h1, h4, label, a, #main_content ol > li:first-child, ol.breadcrumb-directory > li:last-child"), "textContent");
			translateEntries(root, $("input[type='text']"), "placeholder");
			translateEntries(root, $("a, abbr, button, label, #chart_temp, input, td"), "title");
			translateEntries(root, $("img"), "alt");

			$("#btn_language").data("language", settings.language).children("span:first-child").text(root.attributes["name"].value);
			$("html").attr("lang", settings.language);
		}
	}
}

function translateEntries(root, entries, key) {
	var doNodeCheck = (key == "textContent");
	$.each(entries, function() {
		// If this node has no children, we can safely use it
		if (!doNodeCheck || this.childNodes.length < 2) {
			translateEntry(root, this, key);
			// Otherwise we need to check for non-empty text nodes
		} else {
			for(var i=0; i<this.childNodes.length; i++) {
				var val = this.childNodes[i][key];
				if (this.childNodes[i].nodeType == 3 && val != undefined && this.childNodes[i].childNodes.length == 0 && val.trim().length > 0) {
					translateEntry(root, this.childNodes[i], key);
				}
			}
		}
	});
}

function translateEntry(root, item, key) {
	if (item != undefined) {
		var originalText = item[key];
		if (originalText != undefined && originalText.trim() != "") {
			var text = originalText.trim();
			for(var i=0; i<root.children.length; i++) {
				var entry = root.children[i].attributes["t"].value;
				if (entry.indexOf("{") == -1 && entry == text) {
					item[key] = item[key].replace(text, root.children[i].textContent);
					return;
				}
			}

			// Log translation text if we couldn't find a suitable text
			if (showTranslationWarning) {
				console.log("WARNING: Could not translate static '" + text + "'");
			}
		}
	}
}
