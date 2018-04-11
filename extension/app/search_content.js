"use_strict";

/*
 * This is a content script that is injected into the user's current page if
 * the user is at a zillow search page when they click the browserAction button.
 * It retrieves a list of the urls of the listings in their results and sends
 * the list as a message to the extension's index page so that the listings can
 * be opened in tabs and parsed by the other content script, listing_content.js.
 */
let $cards;

function parseCurrentlyVisibleListings() {
    const listings = [];

    $cards.children().each(function () {
        const url = $(this).find("a").first().prop("href");
        if (url) {
            listings.push(url);
        }
    });
    console.log("listings:" + listings.length);
    //chrome.extension.sendMessage({listings});
}

$(function () { // Document is ready.

    $cards = $("ul.photo-cards").first();
    let $page_list = $(".zsg-pagination").first();

    if ($page_list.length) {
        let page_set = new Set();
        let found = true;
        while (found) {
            parseCurrentlyVisibleListings();
            found = false;
            $page_list.children().each(function () {
                let elem_text = $(this).text();
                if (!found && !$(this).hasClass("zsg-pagination_active") && !$(this).hasClass("zsg-pagination-next") && !$(this).hasClass("zsg-pagination-ellipsis") && !page_set.has(elem_text)) {
                    found = true;
                    console.log(elem_text);
                    page_set.add(elem_text);
                    $(this).trigger("click");
                }
            });
        }

    } else {
        parseCurrentlyVisibleListings();
    }


});








