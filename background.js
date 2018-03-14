/* 
 * When the user clicks the browserAction icon in the toolbar,
 * open the extension's index page as the active tab.
 * 
 * If the user is on a Zillow apartment search page, insert and 
 * execute the search page content script.  Signal to the index 
 * page whether this was done or not, so that it can know
 * whether to show the user interface for selecting bookmarks.
 */
const createProperties = {"url": "/index.html?search=", "active": true};
chrome.runtime.onInstalled.addListener(function () {
    chrome.browserAction.onClicked.addListener(function (tab) {

        if (tab.url) {
            if (tab.url.match(/[a-z]+:\/\/www\.zillow\.com\/homes\/for_rent\/.+/)) {
                // The content script depends on jQuery, so load it first.
                chrome.tabs.executeScript(tab.id, {"file": "static/jquery.min.js"}, function () {
                    chrome.tabs.executeScript(tab.id, {"file": "search_content.js"});
                });
                createProperties.url += "true";
            } else {
                createProperties.url += "false";
            }
        } else {
            createProperties.url += "false";
        }

        chrome.tabs.create(createProperties);
    });
});