const PREFS_KEY = 'job_capture_prefs_v2';

const JOB_BOARD_HOSTS = [
  'indeed.com', 'linkedin.com', 'glassdoor.com', 'greenhouse.io', 'lever.co',
  'wellfound.com', 'angel.co', 'remoteok.com', 'ziprecruiter.com', 'dice.com',
  'monster.com', 'careerbuilder.com', 'flexjobs.com', 'simplyhired.com',
  'jobs.lever.co', 'boards.greenhouse.io', 'rocketship.com'
];

function isJobListingUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const u = url.toLowerCase();
  return JOB_BOARD_HOSTS.some(host => u.includes(host));
}

function openPopupOnTab(tabId, callback) {
  chrome.tabs.sendMessage(tabId, { type: 'CLICKY_OPEN_POPUP' }, () => {
    if (!chrome.runtime.lastError) {
      callback(true);
      return;
    }
    chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }, () => {
      if (chrome.runtime.lastError) {
        callback(false);
        return;
      }
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { type: 'CLICKY_OPEN_POPUP' }, () => {
          callback(!chrome.runtime.lastError);
        });
      }, 300);
    });
  });
}

document.getElementById('open').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs?.[0];
    if (!tab?.id) return;
    const url = tab.url || '';
    if (isJobListingUrl(url)) {
      openPopupOnTab(tab.id, (ok) => {
        if (!ok) {
          alert('Could not open. Try reloading the page and click again.');
        }
        window.close();
      });
    } else {
      alert('Open a job listing page (e.g. LinkedIn, Indeed, Glassdoor) and try again.');
      window.close();
    }
  });
});

document.getElementById('options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
