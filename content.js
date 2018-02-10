console.log("This is a test");

var rental = {};

//var x = document.getElementsByClassName("hdp-content-wrapper zsg-content-section");

var header = document.getElementsByClassName("zsg-content-header addr")[0];

var address = header.getElementsByTagName("H1")[0].textContent;
var apt_info = header.getElementsByTagName("H3")[0].textContent;
var bath = apt_info.match(/\s([0-9]+)\sbath/)[1];
var bed = apt_info.match(/\s([0-9]+)\sbed/)[1];
var sqft = apt_info.match(/\s([0-9]+)\ssqft/)[1];

var rental_price = document.getElementsByClassName("main-row home-summary-row")[0].textContent;

rental["address"] = address.trim();
rental["bed"] = bed;
rental["bath"] = bath;
rental["sqft"] = sqft;
rental["rental_price"] = rental_price.trim();

console.log(rental);

chrome.extension.sendMessage(rental);

window.close();
