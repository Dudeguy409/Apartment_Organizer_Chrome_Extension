"use_strict";

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






