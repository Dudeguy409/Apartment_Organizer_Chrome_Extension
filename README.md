# What is a Chrome Extension?

A Chrome extension is a set of HTML, CSS, and JavaScript files that act like a web page, but are stored locally in the user's browser.  They can have certain special permission, like being able to inject javascript files called 'content scripts' into certain web pages that a user visits.  These permissions, along with many other configuration details of a chrome extension, are stored in a required file called 'manifest.json'.  Each page within an extension has different permissions, however.  For example, a content script can access and modify the DOM of a page that it is injected into, but cannot create a new tab.  This is done to make Chrome more secure.  To handle this, messages can be passed between the different scripts and pages of a Chrome Extension.

# Apartment Organizer

### The Background Page And The Browser Action

This extension's work is done in a series of steps: 
* Obtaining a list of Zillow listings
* Opening up the listings in separate tabs and parsing them
* Adding the data to a table

This process begins when the Browser Action is clicked.  The Browser Action is a button that always appears in the upper right-hand corner of Chrome, in the same bar as the URL.  It is specified in the manifest.  Clicking the Browser Action will always open the index page.  If the user's active tab was a Zillow search page when they clicked the Browser Action, the list of listings will be obtained by injecting the search content script into the Zillow search page.  If the user's active tab was not a Zillow search page, the user will need to specify a list of listings from a folder of their bookmarks.  The sole purpose of the non-persistent background script called 'background.js' is to add the listener for click events on the browserAction button. 

### Index Page

The main page of this Chrome extension is 'index.html', with its accompanying 'index.js'.  The page contains two views: a view for the results and error tables, and a view for selecting a folder of Zillow bookmarks.  Only one of these views is visible at a time.  The index page is the receiver of all messages sent from the content scripts, explained below.

### Content Scripts

To be clear, this extension contains two different types of content scripts, both of which are injected into Zillow pages.  

The first is a listing content script that is injected into a zillow listing page of a specific apartment unit or apartment complex.  The listing content script parses data about the listing and sends a message back to the extension's index page. When the index page receives a message from a successfully parsed listing, its data is added to the table.  On the other hand, if the content script fails to parse the listing, an error message is sent back instead.  

The second type of content script is a search content script that is injected into a Zillow search page if the user hits the browser action while the Zillow search page is the active tab.  It grabs the URLs of all of the listings in its search results and reports this list back to the extension's index page so that the index page can open each listing in a separate tab and inject the listing content script into it so that it can be parsed.  The search content script does not have permissions to open tabs itself, and must rely on the index page as a result.

### Creating the Extension

To create the extension, zip up the 'extension' folder.  Do not include the "Web_Store_Images" folder.  It contains ads to be displayed in the 'featured' bar in the web store, as well as screenshots for the extension's profile page in the web store.

### Additional Info

The manifest has a content security policy to allow unsafe evaluating of strings containing JavaScript code.  TableSorter relies on this to function properly.

The extension also includes an icons folder, as well as a lib folder containing files needed for jQuery, Bootstrap, and TableSorter.  Many of the default CSS styles for tablesorter were removed.
