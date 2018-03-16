"use_strict";

/*
 * This is a content script that is injected into the user's current page if
 * the user is at a zillow search page when they click the browserAction button.
 * It retrieves a list of the urls of the listings in their results and sends
 * the list as a message to the extension's index page so that the listings can
 * be opened in tabs and parsed by the other content script, listing_content.js.
 */
$(function () { // Document is ready.

    const listings = [];

    $("ul.photo-cards").first().children().each(function () {
        const url = $(this).find("a").first().prop("href");
        if (url) {
            listings.push(url);
        }
    });

    chrome.extension.sendMessage({listings});

});






