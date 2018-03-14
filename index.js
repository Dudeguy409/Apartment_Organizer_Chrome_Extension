"use strict";

/* 
 * This function recursively traverses the user's bookmark tree looking for a 
 * folder whose name matches the name that the user typed into the form box 
 * earlier.  When the first match is found, the function short-circuits
 * instead of continuing the search. 
 */
function findBookmark(bookmarks, folder_name) {

    for (let i = 0; i < bookmarks.length; i++) {
        const bookmark = bookmarks[i];
        if (!bookmark.url) {  // The current bookmark is a folder.
            if (bookmark.title === folder_name) {  // It's a match!
                if (!bookmark.children) { // Found the folder, but it's empty.
                    alert("Sorry, the folder you selected appears to not contain any bookmarks.");
                    return true;
                }
                openBookmarksForParsing(bookmark.children);
                return true;
            }
        }

        if (bookmark.children) {  // Check this folder's children.
            const found = findBookmark(bookmark.children, folder_name);
            if (found) {
                return true;  // Don't bother checking the rest of the children.
            }
        }
    }
    return false;  // This is not the folder we need, and does not contain it either.
}

/* 
 * This is a curried function that returns the above 
 * helper method in a single-parameter form so that it
 * can be passed in to chrome.bookmarks.getTree(callable).
 */
function findBookmarks(folder_name) {
    return function (bookmarks) {
        if (!findBookmark(bookmarks, folder_name)) {
            alert("Sorry!  Unfortunately, there were no matches for that folder name.");
        }
    };
}

function openListingTabToParse(url) {
    if (url.match(/[a-z]+:\/\/www\.zillow\.com\/.+/)) {
        const bldg = /([a-z]+:\/\/www\.zillow\.com\/).*_type(\/.*_bldg)\/.*/.exec(url);
        if (bldg) {
            url = bldg[1] + "b" + bldg[2];
        }
        /* This tab is opened only to run as a background process of sorts.
         * Don't draw the user's attention by seting it as the active tab.*/
        const createProperties = {"active": false, url};
        chrome.tabs.create(createProperties, function (tab) {
            // The content script depends on jQuery, so load it first.
            chrome.tabs.executeScript(tab.id, {"file": "static/jquery.min.js"}, function () {
                chrome.tabs.executeScript(tab.id, {"file": "listing_content.js"});
            });
        });
    }
}

/*
 * This function opens a tab for each bookmark anywhere in the folder that the
 * user specified, but only if it refers to a Zillow web page.  If a bookmark
 * links to a building page in preview mode, the linked is hacked up to make a
 * link to the full-screen page so that it parses correctly.
 */
function openBookmarksForParsing(bookmarksToOpen) {
    for (let j = 0; j < bookmarksToOpen.length; j++) {
        const bookmark = bookmarksToOpen[j];
        let url = bookmark.url;
        if (url) {
            openListingTabToParse(url);
        } else if (bookmark.children) {
            openBookmarksForParsing(bookmark.children);
        }
    }
}

function handleSearchMessage(listings) {
    for (let i = 0; i < listings.length; i++) {
        console.log(listings[i]);
        openListingTabToParse(listings[i]);
    }
    $("#results-panel").slideDown(500);
}

function handleErrorMessage(error) {
    // Show the error panel if it isn't visible yet.
    if (!$("#error-panel").is(":visible")) {
        $("#error-panel").slideDown(500);
    }
    // Append a link in the error table to the page that failed to be parsed.
    $("#error-table").find("tbody").first()
            .append("<tr><td style='text-align: center'><a href='"
                    + error.url + "'><h4><strong>"
                    + error.title + "</strong></h4></a></td></tr>");
}

function handleResultsMessage(rentals) {
    const $tbody = $("#apartments-table").find("tbody");
    // Each element in the array represents a rental; add a row for each.
    for (let i = 0; i < rentals.length; i++) {
        const rental = rentals[i];
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
    // Notify the tablesorter that the data in the table has changed.
    $("#apartments-table").trigger("update");
}

$(function () { // Document is ready.

    const errors = [];

    $.tablesorter.addParser({
        id: 'just_numbers',
        is: function (s) {
            // return false so this parser is not auto detected 
            return false;
        },
        format: function (s) {
            /* format data for normalization --- This changes the data behind
             * the scenes without effecting its outer appearance.
             * 
             * 1) replace the word 'studio' with '0' to handle bedroom count
             * 2) strip everything but numbers and decimals */
            return s.toLowerCase().replace(/studio/, '0').replace(/[^\d.]/g, '');
        },
        type: 'numeric'
    });

// add my custom numbers mapper/parser/filter to several columns:
    $("#apartments-table").tablesorter({
        headers: {
            0: {// Monthly Rental Price
                sorter: 'just_numbers'
            },
            1: {// Sq Ft
                sorter: 'just_numbers'
            },
            2: {// Bedroom Count
                sorter: 'just_numbers'
            }
        }
    });

    const $folder_input = $("#folder-name");

    $folder_input.keyup(function (event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            // Simulate a button click if the user hits 'Enter'
            $("#submit-button").click();
        }
    });

    // If the button is clicked, find the bookmarks and open them up to be parsed.
    $("#submit-button").on("click", function () {
        const folder_name = $("#folder-name").val();
        chrome.bookmarks.getTree(findBookmarks(folder_name));
        // The user is done with the bookmarks panel, so hide it.
        $("#form-panel").slideUp(500, function () {
            // Show the results table instead, but not until the previous panel is hidden.
            $("#results-panel").slideDown(500);
        });
    });

    // Consolidate records retrieved by the various tabs.
    chrome.extension.onMessage.addListener(function (message) {
        if (message.rentals) {
            handleResultsMessage(message.rentals);
        } else if (message.error) {
            handleErrorMessage(message.error);
        } else if (message.listings) {
            handleSearchMessage(message.listings);
        }
    });

    if (window.location.href.includes("search=false")) {
        // Show the form for selecting abookmarks folder.
        $("#form-panel").slideDown(500);
        // Put the cursor inside the input box
        $folder_input.focus();
    }

});