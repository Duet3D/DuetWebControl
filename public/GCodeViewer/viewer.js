$.urlParam = function(name) {
    var results = new RegExp("[\?&]" + name + "=([^&#]*)").exec(
        window.location.href
    );
    return results[1] || 0;
};

function updateProgress(percent) {
    var val = Math.ceil(percent);
    $('#progressBarIndicator')
        .css("width", val + "%")
        .attr("aria-valuenow", val)
}

function invertHex(hex) {
    if (hex.startsWith("#"))
        hex = hex.substr(1);
    return (Number(`0x1${hex}`) ^ 0xFFFFFF).toString(16).substr(1).toUpperCase()
}

function loadColors(viewer) {
    var colors = viewer.getExtruderColors();
    for (var eIdx = 0; eIdx < 5; eIdx++) {
        $("#extruder" + eIdx).colorpicker('setValue', colors[eIdx]);
        $("#extruder" + eIdx).css("background-color", colors[eIdx]);
        $("#extruder" + eIdx).css("color", invertHex(colors[eIdx]));
    }
    return colors;
}

$(document).ready(function() {
    var viewer = new gcodeViewer($("#3DCanvas")[0]);

    viewer.init();



    $(".colorPicker").colorpicker();


    loadColors(viewer);


    $.ajax({
        type: "GET",
        url: "http://" +
            $.urlParam("printerip") +
            "/rr_download?name=" +
            $.urlParam("filepath"),
        timeout: 0,
        xhr: function() {
            var xhr = new window.XMLHttpRequest();
            xhr.timeout = 0;
            xhr.addEventListener("progress", function(evt) {
                if (evt.lengthComputable) {
                    var percent = evt.loaded / evt.total;
                    updateProgress(percent * 100);
                }
            });
            return xhr;
        },
        success: function(response) {
            updateProgress(100);
            viewer.processFile(response);
            $('.progress').hide();
            $("#layerSlider").slider("setAttribute", "max", viewer.getMaxHeight());
            $("#lineCount").text("Rendered Lines: " + viewer.getLineCount());
            $("#renderMode").text("Render Mode:    " + viewer.getRenderMode());
        }
    });

    $("#layerSlider").on("change", function(e) {
        var value = $("#layerSlider").slider("getValue");
        viewer.setZClipPlane(value);
    });


    var slideout = new Slideout({
        'panel': document.getElementById('panel'),
        'menu': document.getElementById('menu'),
        'padding': 256,
        'tolerance': 70,
        'touch': false
    });

    // Toggle button
    $('.toggle-button').on('click', function() {
        slideout.toggle();
    });


    $("#resetCam").on("click", function() {
        viewer.resetCamera();
    });

    $("#resetScene").on("click", function() {
        $('.progress').show();
        setTimeout(function() {
            viewer.reload();
            $('.progress').hide();
        }, 0);
    });

    $("#resetColors").on("click", function() {
        viewer.resetExtruderColors();
        loadColors(viewer);
    })


    $('.colorPicker').on("hidePicker", function(event) {
        var colors = viewer.getExtruderColors();
        for (var eIdx = 0; eIdx < 5; eIdx++) {
            colors[eIdx] = $("#extruder" + eIdx).colorpicker('getValue');
            $("#extruder" + eIdx).css("background-color", colors[eIdx]);
            $("#extruder" + eIdx).css("color", "#" + invertHex(colors[eIdx]));
        }
        viewer.saveExtruderColors(colors);
    });

    var bgColor = viewer.getBackgroundcColor();
    $("#backgroundColor").colorpicker('setValue', bgColor);
    $("#backgroundColor").css("background-color", bgColor);
    $("#backgroundColor").css("color", invertHex(bgColor));


    $("#backgroundColor").on("hidePicker", function(e) {
        var backgroundColor = $("#backgroundColor").colorpicker('getValue');
        $("#backgroundColor").css("background-color", backgroundColor);
        $("#backgroundColor").css("color", invertHex(backgroundColor));
        viewer.setBackgroundColor(backgroundColor);
    })

    var bedSize = viewer.getBedSize();
    $("#bedX").attr("value", bedSize.x);
    $("#bedY").attr("value", bedSize.y);

    function updateBedSize() {
        var x = $("#bedX")[0].value;
        var y = $("#bedY")[0].value;
        console.log(viewer);
        viewer.setBedSize(x, y);
    }
    $("#bedX").on("focusout", function() {
        updateBedSize();
    });
    $("#bedY").on("focusout", function() {
        updateBedSize();
    });

    window.mobilecheck = function() {
        var check = false;
        (function(a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent || navigator.vendor || window.opera);
        return check;
    };

});