let connection;
function database() {
  if (!connection) connection = new Promise((resolve, reject) => {
    const request = indexedDB.open('pmw-creative-projects', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('projects', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { connection = null; reject(new Error('Device storage is unavailable. Download a project file to keep your work.')); };
  });
  return connection;
}
async function transaction(mode, action) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', mode);
    const request = action(tx.objectStore('projects'));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(new Error('Could not save on this device. Download your project file as a backup.'));
    tx.onabort = tx.onerror;
  });
}
export const saveProject = project => transaction('readwrite', store => store.put(project));
export const getProject = id => transaction('readonly', store => store.get(id));
export const getProjects = () => transaction('readonly', store => store.getAll());
export const deleteProject = id => transaction('readwrite', store => store.delete(id));
