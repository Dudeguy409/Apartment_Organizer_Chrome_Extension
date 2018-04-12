"use_strict";

/*
 * This is a content script that is injected into the user's current page if
 * the user is at a zillow search page when they click the browserAction button.
 * It retrieves a list of the urls of the listings in their results and sends
 * the list as a message to the extension's index page so that the listings can
 * be opened in tabs and parsed by the other content script, listing_content.js.
 */

let $cards;
let $page_list;
let $current_page;

function parseCurrentlyVisibleListings() {
    const listings = [];

    $cards.each(function () {
        const url = $(this).find("a").first().prop("href");
        if (url) {
            listings.push(url);
        }
    });
    chrome.extension.sendMessage({listings});
}

function start() {
    $cards = $("ul.photo-cards").first().children();

    parseCurrentlyVisibleListings();

    if ($page_list.length) {
        const $next_page = $current_page.next();
        if ($next_page.length && $cards.length >= 25) {
            const search_url = $next_page.find("a").prop("href");
            chrome.extension.sendMessage({search_url});
        }
        if ($current_page.text() !== "1") {
            window.close();
        }
    }
}

$(function () { // Document is ready.
    $page_list = $(".zsg-pagination").first();
    $current_page = $page_list.find(".zsg-pagination_active");
    if ($page_list.length && $current_page.text() !== "1") {
        setTimeout(start, 5000);
    } else {
        start();
    }
});








