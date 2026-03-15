const API_BASE_URL_KEY = 'hiredlogics_oneclick_api_base_url';
const API_KEY_KEY = 'hiredlogics_oneclick_api_key';

document.getElementById('save').addEventListener('click', async () => {
  const apiBaseUrl = document.getElementById('apiBaseUrl').value.trim();
  const apiKey = document.getElementById('apiKey').value.trim();
  await chrome.storage.sync.set({
    [API_BASE_URL_KEY]: apiBaseUrl || null,
    [API_KEY_KEY]: apiKey || null,
  });
  document.getElementById('saved').style.display = 'block';
  setTimeout(() => { document.getElementById('saved').style.display = 'none'; }, 3000);
});

(async () => {
  const st = await chrome.storage.sync.get([API_BASE_URL_KEY, API_KEY_KEY]);
  document.getElementById('apiBaseUrl').value = st[API_BASE_URL_KEY] || '';
  document.getElementById('apiKey').value = st[API_KEY_KEY] || '';
})();
