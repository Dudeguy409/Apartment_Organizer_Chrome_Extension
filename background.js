var createProperties = {"url": "/index.html"};
chrome.runtime.onInstalled.addListener(function () {
  chrome.browserAction.onClicked.addListener(function() {
    chrome.tabs.create(createProperties);
  });
});