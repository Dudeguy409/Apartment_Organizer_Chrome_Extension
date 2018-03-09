var rentals = [];
var url = window.location.href;
var body = document.getElementsByClassName("zsg-layout-content")[0];
if (url.match(/[a-z]+:\/\/www\.zillow\.com\/b\/.+/)) {
    parseBuildingListing(rentals, body, url);
} else {
    parseSingleListing(rentals, body, url);
}

chrome.extension.sendMessage(rentals);
window.close();

function parseApartmentInfo(apt_info) {
    results = {};
    results["bed"] = apt_info.match(/\s([0-9,\.]+)\sbed/)[1];
    results["bath"] = apt_info.match(/\s([0-9,\.]+)\sbath/)[1];
    results["sqft"] = apt_info.match(/\s([0-9,\.]+)\ssqft/)[1];
    return results;
}

function parseSingleListing(rentals, body, url) {
    var header = body.getElementsByClassName("zsg-content-header addr")[0];
    var address = header.getElementsByTagName("H1")[0].textContent.trim();
    var apt_info = header.getElementsByTagName("H3")[0].textContent;
    var parsed_apt_info = parseApartmentInfo(apt_info);
    var bed = parsed_apt_info["bed"];
    var bath = parsed_apt_info["bath"];
    var sqft = parsed_apt_info["sqft"];
    var rental_price = document.getElementsByClassName("main-row home-summary-row")[0].textContent.trim();
    var rental = {"url": url, "address": address, "bed": bed, "bath": bath, "sqft": sqft, "rental_price": rental_price};
    rentals.push(rental);
}

function parseBuildingListing(rentals, body, url) {
    var header = body.getElementsByClassName("bdp-header")[0];
    var address = (header.getElementsByTagName("H1")[0].textContent + " " + header.getElementsByTagName("H2")[0].textContent).trim();
    address = address.match(/(.+[0-9]{5}).*/)[1];
    var bedroom_types = document.getElementById("units-panel-for-rent").children;
    for (var i = 0; i < bedroom_types.length; i++) {
        var bedroom_type = bedroom_types[i];
        var floorplans = bedroom_type.getElementsByClassName("floorplan zsg-media");
        if (floorplans.length > 0) {
            for (var j = 0; j < floorplans.length; j++) {
                var floorplan = floorplans[j];
                var apt_info = floorplan.getElementsByClassName("floorplan-title")[0].textContent;
                var parsed_apt_info = parseApartmentInfo(apt_info);
                var bed = parsed_apt_info["bed"];
                var bath = parsed_apt_info["bath"];
                var sqft = parsed_apt_info["sqft"];
                var floorplan_units = floorplan.getElementsByClassName("floorplan-units")[0].children;
                for (var k = 0; k < floorplan_units.length; k++) {
                    var unit = floorplan_units[k];
                    var price = unit.getElementsByClassName("floorplan-unit-price")[0].textContent;
                    var availability = unit.getElementsByClassName("floorplan-unit-availability")[0].textContent;
                    var unit_number = unit.getElementsByClassName("floorplan-unit-number")[0].textContent;
                    var rental = {"url": url, "address": address, "bed": bed, "bath": bath, "sqft": sqft, "rental_price": price, "unit": unit_number, "availability": availability};
                    rentals.push(rental);
                }
            }
        } else {
            var bed = (bedroom_type.getElementsByClassName("bedroom-group-header")[0].textContent).match(/^([0-9]+).*$/)[1];
            var individual_units = bedroom_type.getElementsByClassName("individual-unit");
            for (var j = 0; j < individual_units.length; j++) {
                var individual_unit = individual_units[j];
                var price = individual_unit.getElementsByClassName("individual-unit-price")[0].textContent;
                var availability = individual_unit.getElementsByClassName("individual-unit-availability")[0].textContent;
                var unit_number = individual_unit.getElementsByClassName("individual-unit-number")[0].textContent;
                var bath = individual_unit.getElementsByClassName("individual-unit-baths")[0].textContent;
                var sqft = individual_unit.getElementsByClassName("individual-unit-sqft")[0].textContent;
                var rental = {"url": url, "address": address, "bed": bed, "bath": bath, "sqft": sqft, "rental_price": price, "unit": unit_number, "availability": availability};
                rentals.push(rental);
            }
        }
    }
}
