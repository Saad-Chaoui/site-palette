// Background service worker for Site Palette extension

// Initialize when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('Site Palette extension installed.');
  
  // Clear any existing stored data
  chrome.storage.local.clear(() => {
    console.log('Storage cleared on installation.');
  });
});

// Listen for tab updates to clear palette data when navigating to a new page
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Clear the palette data for this tab
    chrome.storage.local.remove([`palette_${tabId}`], () => {
      console.log(`Cleared palette data for tab ${tabId} navigation.`);
    });
  }
});

// Listen for tab removal to clean up storage
chrome.tabs.onRemoved.addListener((tabId) => {
  // Remove the palette data for the closed tab
  chrome.storage.local.remove([`palette_${tabId}`], () => {
    console.log(`Cleaned up data for closed tab ${tabId}.`);
  });
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle any background script specific requests here
  if (request.action === 'clearAllData') {
    chrome.storage.local.clear(() => {
      console.log('All extension data cleared.');
      sendResponse({ success: true });
    });
    return true; // Required for async sendResponse
  }
}); 