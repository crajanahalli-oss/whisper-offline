// Service Worker Registration and Install Prompt Handler

// Store the beforeinstallprompt event for later use
let deferredPrompt = null;

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('[SW Registration] Success:', registration.scope);

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('[SW Registration] Update found, installing new version');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker installed, show update notification
              console.log('[SW Registration] New version ready, reload to update');
              showUpdateNotification();
            }
          });
        });
      })
      .catch(error => {
        console.error('[SW Registration] Failed:', error);
      });

    // Handle service worker controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW Registration] Controller changed, reloading page');
      window.location.reload();
    });
  });
} else {
  console.warn('[SW Registration] Service workers not supported in this browser');
}

// Listen for beforeinstallprompt event (Android Chrome)
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('[Install Prompt] beforeinstallprompt event fired');

  // Prevent the default browser install prompt
  e.preventDefault();

  // Store the event for later use
  deferredPrompt = e;

  // Dispatch custom event to notify app
  window.dispatchEvent(new CustomEvent('appinstallable', { detail: e }));
});

// Listen for app installed event
window.addEventListener('appinstalled', (e) => {
  console.log('[Install Prompt] App installed successfully');
  deferredPrompt = null;

  // Dispatch custom event to notify app
  window.dispatchEvent(new CustomEvent('appinstalled'));
});

// Function to show install prompt (called by app.js)
window.showInstallPrompt = async function() {
  if (!deferredPrompt) {
    console.warn('[Install Prompt] No install prompt available');
    return false;
  }

  try {
    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for user response
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[Install Prompt] User choice:', outcome);

    // Clear the prompt
    deferredPrompt = null;

    return outcome === 'accepted';
  } catch (error) {
    console.error('[Install Prompt] Error showing prompt:', error);
    return false;
  }
};

// Function to check if app is installable
window.isInstallable = function() {
  return deferredPrompt !== null;
};

// Function to check if running as installed PWA
window.isInstalledPWA = function() {
  // Check display mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // Check iOS standalone mode
  if (window.navigator.standalone === true) {
    return true;
  }

  return false;
};

// Show update notification
function showUpdateNotification() {
  // Check if notification already shown
  if (document.getElementById('update-notification')) {
    return;
  }

  // Create notification element
  const notification = document.createElement('div');
  notification.id = 'update-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #007bff;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 15px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  notification.innerHTML = `
    <span>New version available!</span>
    <button id="reload-btn" style="
      background: white;
      color: #007bff;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
    ">Reload</button>
    <button id="dismiss-update-btn" style="
      background: transparent;
      color: white;
      border: 1px solid white;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
    ">Later</button>
  `;

  document.body.appendChild(notification);

  // Reload button
  document.getElementById('reload-btn').addEventListener('click', () => {
    window.location.reload();
  });

  // Dismiss button
  document.getElementById('dismiss-update-btn').addEventListener('click', () => {
    notification.remove();
  });
}

console.log('[SW Registration] Script loaded');
