async function testEndpoint(endpoint) {
  try {
    const response = await fetch(endpoint);
    const data = await response.json();
    displayResponse(data, `GET ${endpoint}`);
  } catch (error) {
    displayError(error.message);
  }
}

async function emitCustomCredential() {
  try {
    const response = await fetch('/credential', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credential_type: 'custom_credential',
        subject: 'user:demo@example.com',
        customData: 'Données personnalisées EIDAS',
        department: 'Engineering',
        role: 'Developer'
      })
    });
    const data = await response.json();
    displayResponse(data, 'POST /credential (Custom Credential - JWT signé)');
  } catch (error) {
    displayError(error.message);
  }
}

async function emitPID() {
  try {
    const response = await fetch('/credential', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credential_type: 'eu.europa.ec.eudi.pid.1',
        subject: 'user:fr/person123',
        family_name: 'Dupont',
        given_name: 'Jean',
        birth_date: '1990-01-15',
        age_over_18: true,
        age_over_21: true,
        nationality: 'FR'
      })
    });
    const data = await response.json();
    displayResponse(data, 'POST /credential (PID EIDAS - JWT signé)');
  } catch (error) {
    displayError(error.message);
  }
}

async function emitBatchCredentials() {
  try {
    const response = await fetch('/batch_credential', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credentials: [
          {
            credential_type: 'custom_credential',
            subject: 'user1',
            customData: 'Credential 1'
          },
          {
            credential_type: 'custom_credential',
            subject: 'user2',
            customData: 'Credential 2'
          }
        ]
      })
    });
    const data = await response.json();
    displayResponse(data, 'POST /batch_credential (Émission multiple)');
  } catch (error) {
    displayError(error.message);
  }
}

async function verifyCredential() {
  const credentialToken = prompt('Entrez le JWT du credential à vérifier:');
  if (!credentialToken) return;

  try {
    const response = await fetch('/verify_credential', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credential: credentialToken
      })
    });
    const data = await response.json();
    displayResponse(data, 'POST /verify_credential (Vérification JWT)');
  } catch (error) {
    displayError(error.message);
  }
}

async function requestPresentation() {
  try {
    const response = await fetch('/request_object', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requested_credentials: [
          {
            credential_type: 'eu.europa.ec.eudi.pid.1',
            fields: ['family_name', 'given_name', 'age_over_18']
          }
        ]
      })
    });
    const data = await response.json();
    displayResponse(data, 'POST /request_object (Demande de présentation)');
  } catch (error) {
    displayError(error.message);
  }
}

function displayResponse(data, title) {
  const responseEl = document.getElementById('response');
  
  // Si c'est un credential JWT, le formater joliment
  if (data.credential && typeof data.credential === 'string') {
    const parts = data.credential.split('.');
    if (parts.length === 3) {
      try {
        const payload = JSON.parse(atob(parts[1]));
        data.credential_decoded = payload;
      } catch (e) {}
    }
  }

  responseEl.textContent = title + '\n\n' + JSON.stringify(data, null, 2);
  responseEl.style.color = '#00ff00';
}

function displayError(message) {
  const responseEl = document.getElementById('response');
  responseEl.textContent = '❌ Erreur: ' + message;
  responseEl.style.color = '#ff6b6b';
}
