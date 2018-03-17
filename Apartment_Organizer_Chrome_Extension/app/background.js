"use strict";

/* 
 * When the user clicks the browserAction icon in the toolbar,
 * open the extension's index page as the active tab.
 * 
 * If the user is on a Zillow apartment search page, insert and 
 * execute the search page content script.  Signal to the index 
 * page whether this was done or not, so that it can know
 * whether to show the user interface for selecting bookmarks.
 */

function handleContentScriptInjectionIntoActiveSearchTab(tab) {
    if (tab.url && tab.url.match(/[a-z]+:\/\/www\.zillow\.com\/homes\/for_rent\/.+/)) {
        // The content script depends on jQuery, so load it first.
        chrome.tabs.executeScript(tab.id, {"file": "/lib/jquery.min.js"}, function () {
            chrome.tabs.executeScript(tab.id, {"file": "/app/search_content.js"});
        });
        return true;
    }
    return false;
}

function handleBrowserActionClickEvent(tab) {
    const createProperties = {"url": "/app/index.html?search=", "active": true};
    createProperties.url += handleContentScriptInjectionIntoActiveSearchTab(tab);
    chrome.tabs.create(createProperties);
}

function addBrowserActionListener() {
    chrome.browserAction.onClicked.addListener(handleBrowserActionClickEvent);
}

addBrowserActionListener();

/*
chrome.runtime.onInstalled.addListener(addBrowserActionListener);

if (chrome.runtime && chrome.runtime.onStartup) {
    chrome.runtime.onStartup.addListener(addBrowserActionListener);
} else {
    // This hack is needed because Chrome 22 does not persist browserAction icon
    // state, and also doesn't expose onStartup. So the icon always starts out in
    // wrong state. We don't actually use onStartup except as a clue that we're
    // in a version of Chrome that has this problem.
    chrome.windows.onCreated.addListener(addBrowserActionListener);
}

*/