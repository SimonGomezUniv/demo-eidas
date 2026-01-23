let currentSessionId = null;
let statusCheckInterval = null;

/**
 * Mettre à jour le formulaire selon le type de credential
 */
function updateCredentialForm() {
  const credentialType = document.getElementById('credentialType').value;
  const customForm = document.getElementById('customForm');
  const pidForm = document.getElementById('pidForm');

  if (credentialType === 'eu.europa.ec.eudi.pid.1') {
    customForm.style.display = 'none';
    pidForm.style.display = 'block';
  } else {
    customForm.style.display = 'block';
    pidForm.style.display = 'none';
  }
}

/**
 * Initier l'émission et afficher le QR code
 */
async function initiateIssuance() {
  try {
    const credentialType = document.getElementById('credentialType').value;
    let credentialData = {};

    // Récupérer les données selon le type
    if (credentialType === 'eu.europa.ec.eudi.pid.1') {
      credentialData = {
        family_name: document.getElementById('familyName').value,
        given_name: document.getElementById('givenName').value,
        birth_date: document.getElementById('birthDate').value,
        age_over_18: document.getElementById('ageOver18').checked,
        age_over_21: document.getElementById('ageOver21').checked,
        nationality: document.getElementById('nationality').value,
      };
    } else {
      credentialData = {
        customData: document.getElementById('customData').value,
        department: document.getElementById('department').value,
        role: document.getElementById('role').value,
      };
    }

    // Appeler l'API d'initiation
    const response = await fetch('/issuance/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credential_type: credentialType,
        credential_data: credentialData,
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    currentSessionId = data.session_id;

    // Afficher le QR code et le statut
    displayIssuanceUI(data);

    // Démarrer la vérification du statut
    startStatusCheck();
  } catch (error) {
    console.error('❌ Erreur lors de l\'initiation:', error);
    alert(`Erreur: ${error.message}`);
  }
}

/**
 * Afficher l'interface d'émission avec QR code
 */
function displayIssuanceUI(data) {
  // Afficher la section d'émission
  const configSection = document.querySelector('.configuration-section');
  const issuanceSection = document.getElementById('issuanceSection');

  configSection.style.display = 'none';
  issuanceSection.style.display = 'block';

  // Remplir les informations
  document.getElementById('qrCode').src = data.qr_code;
  document.getElementById('sessionId').textContent = data.session_id;
  document.getElementById('statusCredentialType').textContent = formatCredentialType(data.credential_type);
  document.getElementById('statusIssuer').textContent = data.issuer;
  document.getElementById('statusExpiry').textContent = `${data.expires_in} secondes`;
  
  // Afficher l'URL du wallet
  if (data.wallet_url) {
    document.getElementById('walletUrl').textContent = data.wallet_url;
  }

  // Scroller vers la section d'émission
  document.getElementById('issuanceSection').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Formater le nom du type de credential
 */
function formatCredentialType(type) {
  const types = {
    'custom_credential': '🔐 Custom Credential',
    'eu.europa.ec.eudi.pid.1': '🎫 EIDAS PID',
  };
  return types[type] || type;
}

/**
 * Vérifier le statut de la session
 */
async function checkStatus() {
  if (!currentSessionId) return;

  try {
    const response = await fetch(`/issuance/session/${currentSessionId}`);

    if (!response.ok) {
      if (response.status === 404 || response.status === 410) {
        stopStatusCheck();
        return;
      }
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();

    // Mettre à jour le badge de statut
    const badge = document.getElementById('statusBadge');
    if (data.status === 'completed') {
      badge.textContent = '✅ Complété';
      badge.classList.add('completed');
      stopStatusCheck();

      // Récupérer et afficher le credential
      fetchAndDisplayCredential();
    } else if (data.status === 'pending') {
      badge.textContent = '⏳ En attente...';
    }
  } catch (error) {
    console.error('Erreur lors de la vérification du statut:', error);
  }
}

/**
 * Démarrer la vérification périodique du statut
 */
function startStatusCheck() {
  // Vérifier immédiatement
  checkStatus();

  // Vérifier toutes les 2 secondes
  statusCheckInterval = setInterval(checkStatus, 2000);
}

/**
 * Arrêter la vérification du statut
 */
function stopStatusCheck() {
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval);
    statusCheckInterval = null;
  }
}

/**
 * Récupérer et afficher le credential émis
 */
async function fetchAndDisplayCredential() {
  try {
    const response = await fetch(`/issuance/credential/${currentSessionId}`);

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const credentialToken = data.credential;

    // Afficher le token
    document.getElementById('credentialToken').textContent = credentialToken;

    // Décoder et afficher le payload
    try {
      const parts = credentialToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        document.getElementById('credentialPayload').textContent = JSON.stringify(payload, null, 2);
      }
    } catch (e) {
      console.error('Erreur lors du décodage:', e);
    }

    // Afficher la section du credential
    document.getElementById('credentialSection').style.display = 'block';
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du credential:', error);
    alert(`Erreur: ${error.message}`);
  }
}

/**
 * Copier le credential dans le presse-papiers
 */
async function copyCredential() {
  try {
    const credential = document.getElementById('credentialToken').textContent;
    await navigator.clipboard.writeText(credential);

    // Afficher une notification
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✅ Copié!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  } catch (error) {
    console.error('Erreur lors de la copie:', error);
    alert('Impossible de copier le credential');
  }
}

/**
 * Simuler le scannage du QR code par un wallet
 */
async function simulateScan() {
  try {
    if (!currentSessionId) {
      alert('Veuillez d\'abord initier une émission');
      return;
    }

    // Générer un code d'authentification simulé
    const code = Math.random().toString(36).substring(7);
    const state = document.querySelector('code').textContent; // On récupère l'ID de session

    // Appeler le callback
    const callbackUrl = `/issuance/callback?code=${code}&state=${state}`;

    const response = await fetch(callbackUrl);

    if (response.status === 302 || response.status === 301) {
      // Redirection - c'est normal pour un callback
      console.log('Callback exécuté avec redirection');
    }

    // Attendre un peu et vérifier le statut
    await new Promise(resolve => setTimeout(resolve, 1500));
    checkStatus();

    // Afficher un message
    showNotification('Simulation du scannage envoyée!', 'success');
  } catch (error) {
    console.error('Erreur lors de la simulation:', error);
    // Même en cas d'erreur, vérifier le statut (il pourrait être complété)
    setTimeout(checkStatus, 1000);
  }
}

/**
 * Afficher une notification
 */
function showNotification(message, type = 'info') {
  // Créer une notification temporaire
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    background: ${type === 'success' ? '#38ada9' : '#667eea'};
    color: white;
    border-radius: 5px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  // Retirer après 3 secondes
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Copier l'URL du wallet dans le presse-papiers
 */
function copyWalletUrl() {
  const walletUrlElement = document.getElementById('walletUrl');
  const walletUrl = walletUrlElement.textContent;
  
  navigator.clipboard.writeText(walletUrl).then(() => {
    showNotification('URL du wallet copiée!', 'success');
  }).catch((err) => {
    console.error('Erreur lors de la copie:', err);
    alert('Erreur: impossible de copier l\'URL');
  });
}

/**
 * Copier le credential dans le presse-papiers
 */
function copyCredential() {
  const credentialToken = document.getElementById('credentialToken').textContent;
  
  navigator.clipboard.writeText(credentialToken).then(() => {
    showNotification('Credential copié!', 'success');
  }).catch((err) => {
    console.error('Erreur lors de la copie:', err);
  });
}

/**
 * Réinitialiser le formulaire
 */
function resetForm() {
  // Arrêter la vérification
  stopStatusCheck();

  // Réinitialiser les variables
  currentSessionId = null;

  // Afficher la section de configuration
  const configSection = document.querySelector('.configuration-section');
  const issuanceSection = document.getElementById('issuanceSection');
  const credentialSection = document.getElementById('credentialSection');

  configSection.style.display = 'block';
  issuanceSection.style.display = 'none';
  credentialSection.style.display = 'none';

  // Réinitialiser le formulaire
  document.getElementById('credentialType').value = 'custom_credential';
  updateCredentialForm();

  // Scroller vers le haut
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Animation CSS pour les notifications
 */
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Initialiser le formulaire au chargement
updateCredentialForm();
