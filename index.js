function processBookmark(bookmarks, folder_name) {

    for (var i = 0; i < bookmarks.length; i++) {
        var bookmark = bookmarks[i];
        if (!bookmark.url) {
            if (bookmark.title === folder_name) {
                if (!bookmark.children) {
                    alert("Sorry, the folder you selected appears to not contain any bookmarks.");
                    return true;
                }
                parseBookmarks(bookmark.children);
                return true;
            }
        }

        if (bookmark.children) {
            var found = processBookmark(bookmark.children, folder_name);
            if (found) {
                return true;
            }
        }
    }
    return false;
}

var processBookmarks = function (folder_name) {
    return function (bookmarks) {
        if (!processBookmark(bookmarks, folder_name)) {
            alert("Sorry!  Unfortunately, there were no matches for that folder name.");
        }
    };
};

function parseBookmarks(children) {
    var text = "";
    for (var j = 0; j < children.length; j++) {
        var node = children[j];
        text += node.title + "  :  " + node.url + "\n";
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                alert(xhr.responseText);
            }
        };
        xhr.open("GET", node.url, true);
        xhr.send();
    }
    alert(text);
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("submit-button").addEventListener("click", function () {
        var folder_name = document.getElementById("folder-name").value;
        chrome.bookmarks.getTree(processBookmarks(folder_name));
    });

    var folder_input = document.getElementById("folder-name");
    folder_input.focus();
    folder_input.addEventListener("keyup", function (event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            // click button if user hits Enter
            document.getElementById("submit-button").click();
        }
    });

    chrome.extension.onMessage.addListener(function (message) {
        console.log(message);
    });
});