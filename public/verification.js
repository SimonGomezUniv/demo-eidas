let currentVerificationSessionId = null;
let currentVerificationState = null;
let verificationStatusCheckInterval = null;

/**
 * Types de credentials disponibles pour la vérification
 */
const verificationCredentials = [
  {
    id: 'custom_credential',
    name: '🔐 Custom Credential',
    description: 'Credential personnalisé pour la démonstration',
    requirements: {
      'customData': 'Données personnalisées',
      'department': 'Département',
      'role': 'Rôle'
    }
  },
  {
    id: 'eu.europa.ec.eudi.pid.1',
    name: '🎫 EIDAS PID (Person ID)',
    description: 'Identifiant personnel EIDAS',
    requirements: {
      'family_name': 'Nom de famille',
      'given_name': 'Prénom',
      'birth_date': 'Date de naissance',
      'nationality': 'Nationalité',
      'age_over_18': 'Age >= 18 ans',
      'age_over_21': 'Age >= 21 ans'
    }
  }
];

/**
 * Initialiser la page
 */
function initializeVerificationPage() {
  updateCredentialSelector();
}

/**
 * Mettre à jour le sélecteur de credentials
 */
function updateCredentialSelector() {
  const selector = document.getElementById('credentialSelector');
  
  if (!selector) {
    console.error('Selector element not found');
    return;
  }

  selector.innerHTML = '';

  verificationCredentials.forEach(cred => {
    const option = document.createElement('option');
    option.value = cred.id;
    option.textContent = cred.name;
    selector.appendChild(option);
  });

  // Déclencher la mise à jour de la description
  updateCredentialDescription();
}

/**
 * Mettre à jour la description du credential sélectionné
 */
function updateCredentialDescription() {
  const selector = document.getElementById('credentialSelector');
  const description = document.getElementById('credentialDescription');
  const requirements = document.getElementById('credentialRequirements');

  if (!selector || !description || !requirements) return;

  const selectedId = selector.value;
  const credential = verificationCredentials.find(c => c.id === selectedId);

  if (credential) {
    description.textContent = credential.description;

    // Afficher les requirements
    const requirementsList = Object.entries(credential.requirements)
      .map(([key, label]) => `• ${label}`)
      .join('\n');

    requirements.textContent = requirementsList || 'Aucune exigence spécifique';
  }
}

/**
 * Initier la vérification et générer le QR code
 */
async function initiateVerification() {
  try {
    const credentialType = document.getElementById('credentialSelector').value;

    // Appeler l'API d'initiation de présentation
    const response = await fetch('/verification/initiate-presentation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credential_type: credentialType,
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    currentVerificationSessionId = data.session_id;
    currentVerificationState = data.state;

    // Afficher l'interface de vérification
    displayVerificationUI(data);

    // Démarrer la vérification du statut
    startVerificationStatusCheck();
  } catch (error) {
    console.error('❌ Erreur lors de l\'initiation de la vérification:', error);
    alert(`Erreur: ${error.message}`);
  }
}

/**
 * Afficher l'interface de vérification avec QR code
 */
function displayVerificationUI(data) {
  const configSection = document.querySelector('.configuration-section');
  const verificationSection = document.getElementById('verificationSection');

  if (configSection) configSection.style.display = 'none';
  if (verificationSection) verificationSection.style.display = 'block';

  // Remplir les informations
  const qrCode = document.getElementById('qrCodeVerification');
  const sessionId = document.getElementById('verificationSessionId');
  const credentialType = document.getElementById('verificationCredentialType');
  const verifier = document.getElementById('verificationVerifier');
  const expiry = document.getElementById('verificationExpiry');
  const walletUrl = document.getElementById('verificationWalletUrl');

  if (qrCode) qrCode.src = data.qr_code;
  if (sessionId) sessionId.textContent = data.session_id;
  if (credentialType) credentialType.textContent = formatCredentialType(data.credential_type);
  if (verifier) verifier.textContent = data.verifier;
  if (expiry) expiry.textContent = `${data.expires_in} secondes`;
  if (walletUrl && data.qr_content) walletUrl.textContent = data.qr_content;

  // Scroller vers la section
  if (verificationSection) {
    verificationSection.scrollIntoView({ behavior: 'smooth' });
  }
}

/**
 * Formater le type de credential
 */
function formatCredentialType(type) {
  const types = {
    'custom_credential': '🔐 Custom Credential',
    'eu.europa.ec.eudi.pid.1': '🎫 EIDAS PID',
  };
  return types[type] || type;
}

/**
 * Vérifier le statut de la vérification
 */
async function checkVerificationStatus() {
  if (!currentVerificationSessionId) return;

  try {
    const response = await fetch(`/verification/presentation-status/${currentVerificationSessionId}`);

    if (!response.ok) {
      if (response.status === 404 || response.status === 410) {
        stopVerificationStatusCheck();
        return;
      }
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();

    // Mettre à jour le badge de statut
    const badge = document.getElementById('verificationStatusBadge');
    if (badge) {
      if (data.status === 'completed') {
        badge.textContent = '✅ Présentation reçue';
        badge.classList.add('completed');
        stopVerificationStatusCheck();

        // Récupérer et afficher la présentation
        fetchAndDisplayPresentation();
      } else if (data.status === 'pending') {
        badge.textContent = '⏳ En attente de présentation...';
      }
    }
  } catch (error) {
    console.error('Erreur lors de la vérification du statut:', error);
  }
}

/**
 * Démarrer la vérification périodique du statut
 */
function startVerificationStatusCheck() {
  checkVerificationStatus();
  verificationStatusCheckInterval = setInterval(checkVerificationStatus, 2000);
}

/**
 * Arrêter la vérification du statut
 */
function stopVerificationStatusCheck() {
  if (verificationStatusCheckInterval) {
    clearInterval(verificationStatusCheckInterval);
    verificationStatusCheckInterval = null;
  }
}

/**
 * Récupérer et afficher la présentation reçue
 */
async function fetchAndDisplayPresentation() {
  try {
    const response = await fetch(`/verification/presentation-result/${currentVerificationSessionId}`);

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();

    // Afficher les résultats
    displayPresentationResults(data);
  } catch (error) {
    console.error('Erreur lors de la récupération de la présentation:', error);
    alert('Erreur lors de la récupération de la présentation');
  }
}

/**
 * Afficher les résultats de la présentation
 */
function displayPresentationResults(data) {
  const resultsSection = document.getElementById('presentationResults');

  if (!resultsSection) return;

  resultsSection.style.display = 'block';
  resultsSection.scrollIntoView({ behavior: 'smooth' });

  // Afficher le statut de vérification
  const verificationStatus = document.getElementById('presentationVerificationStatus');
  if (verificationStatus) {
    verificationStatus.textContent = data.valid ? '✅ Vérifiée' : '❌ Invalide';
    verificationStatus.className = data.valid ? 'status-valid' : 'status-invalid';
  }

  // Afficher le VP token
  const vpToken = document.getElementById('presentationVpToken');
  if (vpToken && data.vp_token) {
    vpToken.textContent = data.vp_token;
  }

  // Afficher le payload décodé
  const payload = document.getElementById('presentationPayload');
  if (payload && data.claims) {
    payload.textContent = JSON.stringify(data.claims, null, 2);
  }

  // Afficher les détails
  const details = document.getElementById('presentationDetails');
  if (details && data.presentation_info) {
    const info = data.presentation_info;
    const detailsHTML = `
      <div class="details-grid">
        <div class="detail-item">
          <span class="detail-label">Holder (Sujet):</span>
          <span class="detail-value">${info.holder || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Émetteur:</span>
          <span class="detail-value">${info.issuer || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Type de Credential:</span>
          <span class="detail-value">${info.credential_type || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Émis le:</span>
          <span class="detail-value">${info.issued_at || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Expiration:</span>
          <span class="detail-value">${info.expires_at || 'N/A'}</span>
        </div>
      </div>
    `;
    details.innerHTML = detailsHTML;
  }
}

/**
 * Réinitialiser et retourner à la configuration
 */
function resetVerification() {
  currentVerificationSessionId = null;
  currentVerificationState = null;
  stopVerificationStatusCheck();

  const configSection = document.querySelector('.configuration-section');
  const verificationSection = document.getElementById('verificationSection');
  const resultsSection = document.getElementById('presentationResults');

  if (configSection) configSection.style.display = 'block';
  if (verificationSection) verificationSection.style.display = 'none';
  if (resultsSection) resultsSection.style.display = 'none';

  configSection?.scrollIntoView({ behavior: 'smooth' });
}

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', initializeVerificationPage);
