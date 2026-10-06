// Replacement for the retired advertising worker at this exact URL.
// Existing installations can update to this script and unregister themselves.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.registration.unregister());
});
