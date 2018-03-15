"use strict";

/* 
 * Stores a copy of all data in the table.  When an table filter is used, the
 * table is wiped clean and this datastructure is used to repopulate it.
 */
const rentals = [];

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

                if (!bookmark.children || bookmark.children.length === 0) { // Found the folder, but it's empty.
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
 * It then hides the bookmarks panel and shows the results panel.
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
    // The user is done with the bookmarks panel, so hide it.
    $("#form-panel").slideUp(500, function () {
        // Show the results table instead, but not until the bookmarks panel is hidden.
        $("#results-panel").slideDown(500);
    });
}

/*
 * Appends the given rental to the results table as HTML content.
 */
function appendResultToTable(rental) {
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
    $("#apartments-table").find("tbody").append(row);
}

/*
 * Handles messages containing results from tabs of successfully parsed
 * listings by appending the results to the results table.  Also, add each
 * result to the rentals list so that they can be used with the table filder.
 */
function handleResultsMessage(results) {

    // Each element in the array represents a rental; 
    // Add a row to the results table for each.
    for (let i = 0; i < results.length; i++) {
        appendResultToTable(results[i]);
        // Also append it to the rentals list for use with a table filter.
        rentals.push(results[i]);
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

/*
 * When the user hits the 'Update Filter' button, this code is run.
 * First, the values that the user entered into the min and max fields are
 * checked for validity.  Then, the table is wiped, and repopulated one row at
 * a time with rentals that match the values that the user specified.
 * Lastly, the tablesorter is notified of the update.
 */
function updateTableFilter() {

    /*
     * If the user entered a value above or below a field's min or max value,
     * set the field to the nearest allowed value. 
     */
    $("#update-filter-panel").find("input").each(function () {
        let val = $(this).val();
        if (val) {
            val = parseFloat(val, 10);
            const min = parseFloat($(this).attr("min"), 10);
            const max = parseFloat($(this).attr("max"), 10);
            if (val < min) {
                $(this).val(min);
            } else if (val > max) {
                $(this).val(max);
            }
        }
    });

    let price_min = $("#price-min").val();
    let price_max = $("#price-max").val();
    let sqft_min = $("#sqft-min").val();
    let sqft_max = $("#sqft-max").val();
    let bed_min = $("#bed-min").val();
    let bed_max = $("#bed-max").val();

    /*
     * Make sure that the user didn't enter a higher value 
     * in a min field than in its corresponding max field.
     */
    let diff_error = [];
    if (price_min && price_max) {
        if (parseFloat(price_min, 10) > parseFloat(price_max, 10)) {
            diff_error.push("The min price must be less than or equal to the max price.\n");
        }
    }
    if (sqft_min && sqft_max) {
        if (parseFloat(sqft_min, 10) > parseFloat(sqft_max, 10)) {
            diff_error.push("The min sqft must be less than or equal to the max sqft.\n");
        }
    }
    if (bed_min && bed_max) {
        if (parseFloat(bed_min, 10) > parseFloat(bed_max, 10)) {
            diff_error.push("The min bedroom # must be less than or equal to the max bedroom #.\n");
        }
    }

    if (diff_error.length !== 0) {

        // Tell the user to fix thei input, and don't update the table.
        alert(diff_error.join("\n"));

    } else {

        // Empty the current contents of the results table.
        $("#apartments-table").find("tbody").empty();

        for (let i = 0; i < rentals.length; i++) {
            const rental = rentals[i];
            let {rental_price, sqft, bed} = rental;

            // Format the values of the rental to make them comparable to the filter.
            rental_price = rental_price.replace(/[^\d.]/g, '');
            sqft = sqft.replace(/[^\d.]/g, '');
            bed = bed.toLowerCase().replace(/studio/, '0').replace(/[^\d.]/g, '');

            const valid = (!price_min || parseFloat(rental_price, 10) >= parseFloat(price_min, 10))
                    && (!price_max || parseFloat(rental_price, 10) <= parseFloat(price_max, 10))
                    && (!sqft_min || parseFloat(sqft, 10) >= parseFloat(sqft_min, 10))
                    && (!sqft_max || parseFloat(sqft, 10) <= parseFloat(sqft_max, 10))
                    && (!bed_min || parseFloat(bed, 10) >= parseFloat(bed_min, 10))
                    && (!bed_max || parseFloat(bed, 10) <= parseFloat(bed_max, 10));

            if (valid) {
                appendResultToTable(rentals[i]);
            }
        }
        // Notify the tablesorter that the data in the table has changed.
        $("#apartments-table").trigger("update");
    }
}

$(function () { // Document is ready.

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

    //Add a listener to the button to update the table filter on click.
    $("#update-filter-button").on("click", updateTableFilter);

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
            handleSearchMessage(message.listings);
        } else if (message.error) {
            handleErrorMessage(message.error);
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