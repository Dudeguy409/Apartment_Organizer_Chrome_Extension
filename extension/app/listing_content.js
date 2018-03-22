"use strict";

function parseApartmentInfo(apt_info) {
    let bed;
    try {
        bed = apt_info.match(/\s([0-9\.]+)\sbed/)[1];
    } catch (err) {
        bed = apt_info.match(/(studio)/)[1];
    }
    const bath = apt_info.match(/\s([0-9,\.]+)\sbath/)[1];
    const sqft = apt_info.match(/\s([0-9,\.-]+)\ssqft/)[1];
    return {bed, bath, sqft};
}

function parseSingleListing(rentals, $body, url) {
    const $header = $body.find(".zsg-content-header.addr").first();
    let address = $header.find("H1").first().text().trim();
    try {
        let link_id = $header.find("a").first().attr("href");
        address = address.replace($(link_id).text().trim(), "");
    } catch (err) {
        // Do nothing.
    }
    const apt_info = $header.find("H3").first().text().toLowerCase();
    const {bed, bath, sqft} = parseApartmentInfo(apt_info);
    const rental_price = $(".main-row.home-summary-row").first().text().trim();
    const rental = {url, address, bed, bath, sqft, rental_price, "unit": "", "availability": "See posting"};
    rentals.push(rental);
}

function parseBuildingListing(rentals, $body, url) {
    const $header = $body.find(".bdp-header").first();
    let address = ($header.find("H1").first().text() + " " + $header.find("H2").first().text()).trim();
    address = address.match(/(.+[0-9]{5}).*/)[1];
    let $panels = $("#units-panel-for-rent").children();
    if ($panels.length === 0) {
        $panels = $(".bedroom-groups").children();
    }
    $panels.each(function () {
        const $floorplans = $(this).find(".floorplan.zsg-media");
        if ($floorplans.length > 0) {
            $floorplans.each(function (j) {
                const apt_info = $(this).find(".floorplan-title").first().text().toLowerCase();
                const {bed, bath, sqft} = parseApartmentInfo(apt_info);
                let rental_price;
                try {
                    rental_price = apt_info.match(/(\$[0-9,\.\+]+)\s/)[1];
                } catch (err) {
                }
                $(this).find(".floorplan-units").first().children().each(function () {
                    if (!rental_price) {
                        rental_price = $(this).find(".floorplan-unit-price").first().text();
                    }
                    const availability = $(this).find(".floorplan-unit-availability").first().text();
                    const unit = $(this).find(".floorplan-unit-number").first().text();
                    const rental = {url, address, bed, bath, sqft, rental_price, unit, availability};
                    rentals.push(rental);
                });
            });
        } else {
            const bed = ($(this).find(".bedroom-group-header").first().text().toLowerCase()).match(/^([0-9\.]+|studio).*$/)[1];
            $(this).find(".individual-unit").each(function () {
                const rental_price = $(this).find(".individual-unit-price").first().text();
                const availability = $(this).find(".individual-unit-availability").first().text();
                const unit = $(this).find(".individual-unit-number").first().text();
                const bath = $(this).find(".individual-unit-baths").first().text();
                const sqft = $(this).find(".individual-unit-sqft").first().text();
                const rental = {url, address, bed, bath, sqft, rental_price, unit, availability};
                rentals.push(rental);
            });
        }
    });
}

$(function () { // Document is ready.

    const rentals = [];
    const url = window.location.href;
    const $body = $(".zsg-layout-content").first();

    try {
        if (url.match(/[a-z]+:\/\/www\.zillow\.com\/b\/.+/)) {
            parseBuildingListing(rentals, $body, url);
        } else {
            parseSingleListing(rentals, $body, url);
        }
        chrome.extension.sendMessage({rentals});
    } catch (err) {
        const message = {
            error: {
                url,
                title: $("title").text()
            }
        };
        chrome.extension.sendMessage(message);
    }
    window.close();
});
