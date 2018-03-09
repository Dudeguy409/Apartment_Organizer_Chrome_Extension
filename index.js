"use strict";

function processBookmark(bookmarks, folder_name) {

    for (let i = 0; i < bookmarks.length; i++) {
        const bookmark = bookmarks[i];
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
            const found = processBookmark(bookmark.children, folder_name);
            if (found) {
                return true;
            }
        }
    }
    return false;
}

function processBookmarks(folder_name) {
    return function (bookmarks) {
        if (!processBookmark(bookmarks, folder_name)) {
            alert("Sorry!  Unfortunately, there were no matches for that folder name.");
        }
    };
}
;

function openBookmarksForParsing(bookmarksToOpen) {
    for (let j = 0; j < bookmarksToOpen.length; j++) {
        const bookmark = bookmarksToOpen[j];
        const createProperties = {"active": false, "url": bookmark.url};
        chrome.tabs.create(createProperties, function (tab) {
            const details = {"file": "content.js"};
            chrome.tabs.executeScript(tab.id, details);
        });
    }
}

$.tablesorter.addParser({
    // set a unique id 
    id: 'just_numbers',
    is: function (s) {
        // return false so this parser is not auto detected 
        return false;
    },
    format: function (s) {
        // format your data for normalization 
        return s.replace(/[^\d.]/g, '');
    },
    // set type, either numeric or text 
    type: 'numeric'
});

$(function () {

    $("#apartments-table").tablesorter({
        headers: {
            0: {//zero-based column index
                sorter: 'just_numbers'
            },
            1: {//zero-based column index
                sorter: 'just_numbers'
            }
        }
    });

    const $folder_input = $("#folder-name");
    // Put the cursor inside the input box
    $folder_input.focus();
    $folder_input.keyup(function (event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            // click button if user hits Enter
            $("#submit-button").click();
        }
    });

    // If the button is clocked, find the bookmarks and open them up to be parsed.
    $("#submit-button").on("click", function () {
        const folder_name = $("#folder-name").val();
        chrome.bookmarks.getTree(processBookmarks(folder_name));
        $("#form-panel").slideUp(500, function () {
            $("#results-panel").slideDown(500);
        });

    });

    // Consolidate records retrieved by the various tabs.
    chrome.extension.onMessage.addListener(function (message) {
        const $tbody = $("#apartments-table").find("tbody");
        for (let i = 0; i < message.length; i++) {
            const rental = message[i];
            console.log(rental);
            const row = "<tr>" + [
                rental.rental_price,
                rental.sqft,
                rental.bed,
                rental.bath,
                rental.availability,
                "<a href='" + rental.url + "'>" + rental.address + "</a>",
                rental.unit
            ].map(function (s) {
                return "<td>" + s + "</td>";
            }).join() + "</tr>";
            $tbody.append(row);
        }

        $("#apartments-table").trigger("update");
        const sorting = [[0, 0]];
        // sort on the first column 
        $("#apartments-table").trigger("sorton", [sorting]);

    });
});