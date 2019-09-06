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
        //$('#progressBarText').text(Math.floor(percent) + "%");
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
        'tolerance': 70
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



});