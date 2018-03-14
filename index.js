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
/* 
 * This function opens a tab for the given url if it refers to a Zillow listing.
 * It then injects the needed content scripts for parsing.  If a url links to a
 * building page in preview mode, the link is hacked up to make a link to
 * the full-screen page so that it parses correctly. 
 */
function openListingTabToParse(url) {
    // Only open Zillow tabs
    if (url.match(/[a-z]+:\/\/www\.zillow\.com\/.+/)) {
        // Convert urls to building listings in preview mode to full-screen mode.
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
 * This function tries to open a tab for each bookmark anywhere inside the folder 
 * that the user specified, recursively searching nested folders.
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

/*
 * Handles messages containing results from tabs of successfully parsed
 * listings by appending the results to the results table. 
 */
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

/*
 * Handles error messages generated from parsing failures by appending info
 * about the tab to the error table, and showing it if needed. 
 */
function handleSearchMessage(listings) {
    for (let i = 0; i < listings.length; i++) {
        console.log(listings[i]);
        openListingTabToParse(listings[i]);
    }
    $("#results-panel").slideDown(500);
}

/*
 * Handles error messages generated from parsing failures by appending info
 * about the tab to the error table, and showing it if needed. 
 */
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

$(function () { // Document is ready.

    /*const errors = [];
     const rentals = [];*/

    // Create a custom formatter to use with tablesorter.
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

    // Add the custom formatter for numbers to several columns:
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

    // Simulate a button click on the 'Go!' button if the user
    // hits 'Enter' while in the bookmarks folder input text box.
    const $folder_input = $("#folder-name");
    $folder_input.keyup(function (event) {
        event.preventDefault();
        if (event.keyCode === 13) {

            $("#submit-button").click();
        }
    });

    // If the 'Go!' button is clicked, try to find the right bookmarks folder
    // and open the bookmarks it contains in new tabs so that they can be parsed.
    $("#submit-button").on("click", function () {
        const folder_name = $("#folder-name").val();
        chrome.bookmarks.getTree(findBookmarks(folder_name));
        // The user is done with the bookmarks panel, so hide it.
        $("#form-panel").slideUp(500, function () {
            // Show the results table instead, but not until the bookmarks panel is hidden.
            $("#results-panel").slideDown(500);
        });
    });

    /*
     * Handle various types of messages from content scripts on zillow tabs:
     * 
     * 1) Append results from successfully parsed tabs to the results table.
     * 2) Open urls sent from a search tab as tabs to be parsed
     * 3) Report parsing errors to the error table.
     */
    chrome.extension.onMessage.addListener(function (message) {
        if (message.rentals) {
            handleResultsMessage(message.rentals);
        } else if (message.listings) {
            handleErrorMessage(message.error);
        } else if (message.error) {
            handleSearchMessage(message.listings);
        }
    });

    /*
     * If the user DID NOT open the extension during a zillow search,
     * show the bookmark folder selection UI.
     */
    if (window.location.href.includes("search=false")) {
        // Show the form for selecting a bookmarks folder.
        $("#form-panel").slideDown(500);
        // Put the cursor inside the input box
        $folder_input.focus();
    }

});