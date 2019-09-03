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


$(document).ready(function() {
    var viewer = new gcodeViewer($("#3DCanvas")[0]);
    viewer.init();

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
                    console.log(percent * 100);
                }
            });
            return xhr;
        },
        success: function(response) {
            $('.progress').hide();
            viewer.processFile(response);
        }
    });
});