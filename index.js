function processBookmark(bookmarks, folder_name) {

    for (var i = 0; i < bookmarks.length; i++) {
        var bookmark = bookmarks[i];
        if (!bookmark.url) {
            if (bookmark.title === folder_name) {
                if (!bookmark.children) {
                    alert("Sorry, the folder you selected appears to not contain any bookmarks.");
                    return true;
                }
                openBookmarksForParsing(bookmark.children);
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

function openBookmarksForParsing(bookmarksToOpen) {
    for (var j = 0; j < bookmarksToOpen.length; j++) {
        var bookmark = bookmarksToOpen[j];
        var createProperties = {"active": false, "url": bookmark.url};
        chrome.tabs.create(createProperties, function (tab) {
            var details = {"file": "content.js"};
            chrome.tabs.executeScript(tab.id, details);
        });
    }
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