/* NOTE: This file has been patched to return drop-data directly as binary string. See line 89 */

(function($) {
    'use strict';

    var _exitTimer = null;

    // jQuery plugin initialization
    $.fn.fileDragAndDrop = function(options) {

        //If a function was passed in instead of an options object,
        //just use this as the onFileRead options instead
        if ($.isFunction(options)) {
            var o = {};
            o.onFileRead = options;
            options = o;
        }

        //Return the elements & loop though them
        return this.each(function() {
            var $dropArea = $(this);

            //Create a finalized version of the options
            var opts = $.extend({}, $.fn.fileDragAndDrop.defaults, options);

            //If this option was not set, make it the same as the drop area
            if (opts.addClassTo.length === 0) {
                opts.addClassTo = $dropArea;
            }

            //can't bind these events with jQuery!
            this.addEventListener('dragenter', function(ev) {
                _events._over(ev, $dropArea, opts);
            }, false);
            this.addEventListener('dragover', function(ev) {
                _events._exit(ev, $dropArea, opts);
            }, false);
            this.addEventListener('drop', function(ev) {
                _events._drop(ev, $dropArea, opts);
            }, false);
        });
    };

    $.fn.fileDragAndDrop.defaults = {
        overClass: "over",
        addClassTo: $([]),
        onFileRead: null
    };

    var _events = {
        _over: function(ev, $dropArea, opts) {
            $(opts.addClassTo).addClass(opts.overClass);
            _stopEvent(ev);
        },
        _exit: function(ev, $dropArea, opts) {
            clearTimeout(_exitTimer);
            _exitTimer = setTimeout(function() {
                $(opts.addClassTo).removeClass(opts.overClass);
            }, 100);
            _stopEvent(ev);
        },
        _drop: function(ev, $dropArea, opts) {
            $(opts.addClassTo).removeClass(opts.overClass);
            _stopEvent(ev);
            var fileList = ev.dataTransfer.files;

            //Create an array of file objects for us to fill in
            var fileArray = [];

            //Loop through each file
            for (var i = 0; i <= fileList.length - 1; i++) {

                //Create a new file reader to read the file
                var reader = new FileReader();

                //Create a closure so we can properly pass in the file information since this will complete async!
                var completeFn = (_handleFile)(fileList[i], fileArray, fileList.length, opts);

                //Different browsers implement this in different ways, but call the complete function when the file has finished being read
                if (reader.addEventListener) {
                    // Firefox, Chrome
                    reader.addEventListener('loadend', completeFn, false);
                } else {
                    // Safari
                    reader.onloadend = completeFn;
                }

                //Actually read the file
                reader.readAsBinaryString(fileList[i]);
            }
        }
    };

    //This is the complete function for reading a file,

    function _handleFile(theFile, fileArray, fileCount, opts) {
        //When called, it has to return a function back up to the listener event
        return function(ev) {
            //Add the current file to the array
            fileArray.push({
                name: theFile.name,
                size: theFile.size,
                type: theFile.type,
                lastModified: theFile.lastModifiedDate,
                data: ev.target.result
            });

            //Once the correct number of items have been put in the array, call the completion function		
            if (fileArray.length === fileCount && $.isFunction(opts.onFileRead)) {
                opts.onFileRead(fileArray, opts);
            }
        };
    }

    function _stopEvent(ev) {
        ev.stopPropagation();
        ev.preventDefault();
    }
})(jQuery);


//Add Base64 decode ability if the browser does not support it already
//NOTE: The below code can be removed if you do not plan on targeting IE9!
(function(window) {
    //Via: http://phpjs.org/functions/base64_decode/
    function base64_decode(data) {
        /*jshint bitwise: false, eqeqeq:false*/
        var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
            ac = 0,
            dec = '',
            tmp_arr = [];

        if (!data) {
            return data;
        }

        data += '';

        do { // unpack four hexets into three octets using index points in b64
            h1 = b64.indexOf(data.charAt(i++));
            h2 = b64.indexOf(data.charAt(i++));
            h3 = b64.indexOf(data.charAt(i++));
            h4 = b64.indexOf(data.charAt(i++));

            bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;

            o1 = bits >> 16 & 0xff;
            o2 = bits >> 8 & 0xff;
            o3 = bits & 0xff;

            if (h3 == 64) {
                tmp_arr[ac++] = String.fromCharCode(o1);
            } else if (h4 == 64) {
                tmp_arr[ac++] = String.fromCharCode(o1, o2);
            } else {
                tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
            }
        } while (i < data.length);

        dec = tmp_arr.join('');

        return dec;
    }

    if (!window.atob) {
        window.atob = base64_decode;
    }

})(window);