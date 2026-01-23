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
        subject: 'user123',
        customData: 'Mon données personnalisées'
      })
    });
    const data = await response.json();
    displayResponse(data, 'POST /credential (Custom)');
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
        subject: 'user123',
        family_name: 'Dupont',
        given_name: 'Jean',
        birth_date: '1990-01-15',
        age_over_18: true
      })
    });
    const data = await response.json();
    displayResponse(data, 'POST /credential (PID)');
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
    displayResponse(data, 'POST /request_object');
  } catch (error) {
    displayError(error.message);
  }
}

function displayResponse(data, title) {
  const responseEl = document.getElementById('response');
  responseEl.textContent = title + '\n\n' + JSON.stringify(data, null, 2);
  responseEl.style.color = '#00ff00';
}

function displayError(message) {
  const responseEl = document.getElementById('response');
  responseEl.textContent = '❌ Erreur: ' + message;
  responseEl.style.color = '#ff6b6b';
}
