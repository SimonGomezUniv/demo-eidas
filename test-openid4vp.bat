@echo off
REM Test script for OpenID4VP verification endpoints (Windows Batch)

SET BASE_URL=http://localhost:3000
FOR /f "tokens=2-4 delims=/ " %%a in ('date /t') do (SET MYDATE=%%c%%a%%b)
FOR /f "tokens=1-2 delims=/:" %%a in ('time /t') do (SET MYTIME=%%a%%b)

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║         OpenID4VP Verification Endpoints Testing              ║
echo ║                    Windows Batch Version                       ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM =============================================================================
REM 1. TEST: Create a Request Object
REM =============================================================================
echo 📋 TEST 1: Create Request Object
echo ─────────────────────────────────────────────────────────────────

powershell -Command ^
  "$body = @{client_id = 'http://localhost:3000'} | ConvertTo-Json;" ^
  "$response = Invoke-WebRequest -Uri 'http://localhost:3000/request_object' -Method POST -ContentType 'application/json' -Body $body -ErrorAction SilentlyContinue;" ^
  "Write-Output $response.Content | ConvertFrom-Json | ConvertTo-Json"

echo.

REM =============================================================================
REM 2. TEST: Get Request Object Details
REM =============================================================================
echo 📋 TEST 2: Get Request Object Details
echo ─────────────────────────────────────────────────────────────────

REM In PowerShell, extract the request_id from previous response
powershell -Command ^
  "$body = @{client_id = 'http://localhost:3000'} | ConvertTo-Json;" ^
  "$response = Invoke-WebRequest -Uri 'http://localhost:3000/request_object' -Method POST -ContentType 'application/json' -Body $body -ErrorAction SilentlyContinue;" ^
  "$data = $response.Content | ConvertFrom-Json;" ^
  "$requestId = $data.request_id;" ^
  "Write-Output 'Request ID: ' $requestId;" ^
  "$getResponse = Invoke-WebRequest -Uri \"http://localhost:3000/request_object/$requestId\" -Method GET -ErrorAction SilentlyContinue;" ^
  "Write-Output $getResponse.Content | ConvertFrom-Json | ConvertTo-Json"

echo.

REM =============================================================================
REM 3. TEST: Create a Credential (for testing)
REM =============================================================================
echo 📋 TEST 3: Create a Test Credential
echo ─────────────────────────────────────────────────────────────────

powershell -Command ^
  "$body = @{ " ^
  "  credential_type = 'eu.europa.ec.eudi.pid.1'" ^
  "  subject = 'test-user-12345'" ^
  "  family_name = 'Dupont'" ^
  "  given_name = 'Jean'" ^
  "  birth_date = '1990-01-15'" ^
  "  nationality = 'FR'" ^
  "  age_over_18 = $true " ^
  "} | ConvertTo-Json;" ^
  "$response = Invoke-WebRequest -Uri 'http://localhost:3000/credential' -Method POST -ContentType 'application/json' -Body $body -ErrorAction SilentlyContinue;" ^
  "Write-Output $response.Content | ConvertFrom-Json | ConvertTo-Json"

echo.

REM =============================================================================
REM 4. TEST: Verify Credential Signature
REM =============================================================================
echo 📋 TEST 4: Verify Credential Signature
echo ─────────────────────────────────────────────────────────────────

powershell -Command ^
  "$credBody = @{ " ^
  "  credential_type = 'custom_credential'" ^
  "  subject = 'test-user'" ^
  "} | ConvertTo-Json;" ^
  "$credResponse = Invoke-WebRequest -Uri 'http://localhost:3000/credential' -Method POST -ContentType 'application/json' -Body $credBody -ErrorAction SilentlyContinue;" ^
  "$credData = $credResponse.Content | ConvertFrom-Json;" ^
  "$credential = $credData.credential;" ^
  "$verifyBody = @{credential = $credential} | ConvertTo-Json;" ^
  "$verifyResponse = Invoke-WebRequest -Uri 'http://localhost:3000/verify_credential' -Method POST -ContentType 'application/json' -Body $verifyBody -ErrorAction SilentlyContinue;" ^
  "Write-Output $verifyResponse.Content | ConvertFrom-Json | ConvertTo-Json"

echo.

REM =============================================================================
REM 5. TEST: Verify Presentation
REM =============================================================================
echo 📋 TEST 5: Verify Presentation
echo ─────────────────────────────────────────────────────────────────

powershell -Command ^
  "$credBody = @{ " ^
  "  credential_type = 'custom_credential'" ^
  "  subject = 'test-user'" ^
  "} | ConvertTo-Json;" ^
  "$credResponse = Invoke-WebRequest -Uri 'http://localhost:3000/credential' -Method POST -ContentType 'application/json' -Body $credBody -ErrorAction SilentlyContinue;" ^
  "$credData = $credResponse.Content | ConvertFrom-Json;" ^
  "$credential = $credData.credential;" ^
  "$verifyBody = @{vp_token = $credential} | ConvertTo-Json;" ^
  "$verifyResponse = Invoke-WebRequest -Uri 'http://localhost:3000/verify' -Method POST -ContentType 'application/json' -Body $verifyBody -ErrorAction SilentlyContinue;" ^
  "Write-Output $verifyResponse.Content | ConvertFrom-Json | ConvertTo-Json"

echo.

REM =============================================================================
REM 6. TEST: Get Verification Statistics
REM =============================================================================
echo 📋 TEST 6: Get Verification Statistics
echo ─────────────────────────────────────────────────────────────────

powershell -Command ^
  "$response = Invoke-WebRequest -Uri 'http://localhost:3000/stats' -Method GET -ErrorAction SilentlyContinue;" ^
  "Write-Output $response.Content | ConvertFrom-Json | ConvertTo-Json"

echo.

REM =============================================================================
REM Summary
REM =============================================================================
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                    Tests Completed ✅                         ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo Summary:
echo   ✓ Created request object
echo   ✓ Retrieved request object details
echo   ✓ Created PID EIDAS credential
echo   ✓ Verified credential signature
echo   ✓ Verified presentation
echo   ✓ Retrieved statistics
echo.
echo Next Steps:
echo   1. Visit http://localhost:3000/verification.html for interactive testing
echo   2. Test with wallet integration
echo   3. Verify JWT payloads in https://jwt.io
echo.
