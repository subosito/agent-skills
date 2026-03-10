// Example Login/Consent/Logout implementation for Ory Hydra
// This is a Node.js/Express example using the Ory Hydra SDK

const express = require('express');
const { Configuration, OAuth2Api } = require('@ory/hydra-client');
const session = require('express-session');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'change-me-in-production',
  resave: false,
  saveUninitialized: true
}));

// Initialize Hydra Admin API
const hydraAdmin = new OAuth2Api(new Configuration({
  basePath: process.env.HYDRA_ADMIN_URL || 'http://127.0.0.1:4445'
}));

// Simple user database (replace with real auth)
const users = {
  'user@example.com': { id: 'user-1', password: 'password', email: 'user@example.com', name: 'John Doe' }
};

// =====================
// LOGIN ENDPOINT
// =====================

// GET /login - Display login form
app.get('/login', async (req, res) => {
  const { login_challenge } = req.query;
  
  if (!login_challenge) {
    return res.status(400).json({ error: 'login_challenge is required' });
  }
  
  try {
    // Get login request details from Hydra
    const { data: loginRequest } = await hydraAdmin.getOAuth2LoginRequest({
      loginChallenge: login_challenge
    });
    
    // If user already has a valid session, accept immediately
    if (loginRequest.skip && req.session.userId === loginRequest.subject) {
      const { data } = await hydraAdmin.acceptOAuth2LoginRequest({
        loginChallenge: login_challenge,
        acceptOAuth2LoginRequest: {
          subject: loginRequest.subject,
          context: { source: 'remembered_session' }
        }
      });
      return res.redirect(data.redirect_to);
    }
    
    // Store challenge in session for form submission
    req.session.loginChallenge = login_challenge;
    
    // Render login form (simple HTML for demo)
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Login - ${loginRequest.client?.client_name || 'Unknown Client'}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; }
          input[type="email"], input[type="password"] {
            width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;
          }
          button {
            background: #007bff; color: white; padding: 10px 20px;
            border: none; border-radius: 4px; cursor: pointer;
          }
          button:hover { background: #0056b3; }
          .client-info { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="client-info">
          <h2>${loginRequest.client?.client_name || 'Application'}</h2>
          <p>wants to access your account</p>
        </div>
        <form method="POST" action="/login">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required 
                   value="${loginRequest.oidc_context?.login_hint || ''}">
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" name="remember" value="true" checked>
              Remember me
            </label>
          </div>
          <button type="submit">Sign In</button>
        </form>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /login - Process login form
app.post('/login', async (req, res) => {
  const { email, password, remember } = req.body;
  const login_challenge = req.session.loginChallenge;
  
  if (!login_challenge) {
    return res.status(400).json({ error: 'No login challenge in session' });
  }
  
  try {
    // Authenticate user (replace with real authentication)
    const user = users[email];
    if (!user || user.password !== password) {
      return res.status(401).send('Invalid credentials. <a href="/login?login_challenge=' + login_challenge + '">Try again</a>');
    }
    
    // Store user in session
    req.session.userId = user.id;
    req.session.user = user;
    
    // Accept the login request with Hydra
    const { data } = await hydraAdmin.acceptOAuth2LoginRequest({
      loginChallenge: login_challenge,
      acceptOAuth2LoginRequest: {
        subject: user.id,
        remember: remember === 'true',
        remember_for: 3600, // 1 hour
        acr: '1', // Authentication Context Class Reference
        amr: ['pwd'], // Authentication Methods References
        context: {
          user_email: user.email,
          user_name: user.name
        }
      }
    });
    
    // Redirect to Hydra (which will then redirect to consent or client)
    res.redirect(data.redirect_to);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =====================
// CONSENT ENDPOINT
// =====================

// GET /consent - Display consent form
app.get('/consent', async (req, res) => {
  const { consent_challenge } = req.query;
  
  if (!consent_challenge) {
    return res.status(400).json({ error: 'consent_challenge is required' });
  }
  
  try {
    // Get consent request details
    const { data: consentRequest } = await hydraAdmin.getOAuth2ConsentRequest({
      consentChallenge: consent_challenge
    });
    
    // If user previously consented, accept immediately
    if (consentRequest.skip) {
      const { data } = await hydraAdmin.acceptOAuth2ConsentRequest({
        consentChallenge: consent_challenge,
        acceptOAuth2ConsentRequest: {
          grant_scope: consentRequest.requested_scope,
          grant_access_token_audience: consentRequest.requested_access_token_audience
        }
      });
      return res.redirect(data.redirect_to);
    }
    
    // Store challenge in session
    req.session.consentChallenge = consent_challenge;
    
    // Scope descriptions for display
    const scopeDescriptions = {
      'openid': 'Access your basic profile information',
      'profile': 'View your profile details (name, picture)',
      'email': 'View your email address',
      'offline_access': 'Access your data when you\'re offline'
    };
    
    // Render consent form
    const scopeList = consentRequest.requested_scope?.map(scope => `
      <div class="scope-item">
        <label>
          <input type="checkbox" name="grant_scope" value="${scope}" checked>
          <strong>${scope}</strong>: ${scopeDescriptions[scope] || 'Access ' + scope}
        </label>
      </div>
    `).join('') || '<p>No scopes requested</p>';
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authorize - ${consentRequest.client?.client_name || 'Application'}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; }
          .client-info { background: #f5f5f5; padding: 20px; margin-bottom: 20px; border-radius: 4px; }
          .scopes { margin: 20px 0; }
          .scope-item { margin: 10px 0; padding: 10px; background: #fafafa; border-radius: 4px; }
          .buttons { margin-top: 20px; }
          button {
            padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;
            margin-right: 10px;
          }
          .allow { background: #28a745; color: white; }
          .allow:hover { background: #218838; }
          .deny { background: #dc3545; color: white; }
          .deny:hover { background: #c82333; }
          .remember { margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="client-info">
          <h2>${consentRequest.client?.client_name || 'Application'}</h2>
          <p>wants to access your account</p>
          ${consentRequest.client?.policy_uri ? `<p><a href="${consentRequest.client.policy_uri}" target="_blank">Privacy Policy</a></p>` : ''}
          ${consentRequest.client?.tos_uri ? `<p><a href="${consentRequest.client.tos_uri}" target="_blank">Terms of Service</a></p>` : ''}
        </div>
        <form method="POST" action="/consent">
          <div class="scopes">
            <h3>Requested permissions:</h3>
            ${scopeList}
          </div>
          <div class="remember">
            <label>
              <input type="checkbox" name="remember" value="true" checked>
              Remember this decision for 30 days
            </label>
          </div>
          <div class="buttons">
            <button type="submit" name="grant" value="allow" class="allow">Allow</button>
            <button type="submit" name="grant" value="deny" class="deny">Deny</button>
          </div>
        </form>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Consent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /consent - Process consent form
app.post('/consent', async (req, res) => {
  const { grant_scope, grant, remember } = req.body;
  const consent_challenge = req.session.consentChallenge;
  
  if (!consent_challenge) {
    return res.status(400).json({ error: 'No consent challenge in session' });
  }
  
  try {
    if (grant !== 'allow') {
      // Reject consent
      const { data } = await hydraAdmin.rejectOAuth2ConsentRequest({
        consentChallenge: consent_challenge,
        rejectOAuth2Request: {
          error: 'access_denied',
          error_description: 'User denied consent'
        }
      });
      return res.redirect(data.redirect_to);
    }
    
    // Accept consent
    const scopes = Array.isArray(grant_scope) ? grant_scope : [grant_scope].filter(Boolean);
    const user = req.session.user;
    
    const { data } = await hydraAdmin.acceptOAuth2ConsentRequest({
      consentChallenge: consent_challenge,
      acceptOAuth2ConsentRequest: {
        grant_scope: scopes,
        grant_access_token_audience: [],
        remember: remember === 'true',
        remember_for: 2592000, // 30 days
        session: {
          // Claims to include in access token
          access_token: {
            user_id: user?.id,
            user_email: user?.email
          },
          // Claims to include in ID token (must match granted scopes)
          id_token: {
            email: user?.email,
            name: user?.name,
            email_verified: true
          }
        }
      }
    });
    
    res.redirect(data.redirect_to);
  } catch (error) {
    console.error('Consent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =====================
// LOGOUT ENDPOINT
// =====================

// GET /logout - Display logout confirmation
app.get('/logout', async (req, res) => {
  const { logout_challenge } = req.query;
  
  if (!logout_challenge) {
    // Simple logout without challenge
    req.session.destroy();
    return res.send('Logged out successfully');
  }
  
  try {
    // Get logout request
    const { data: logoutRequest } = await hydraAdmin.getOAuth2LogoutRequest({
      logoutChallenge: logout_challenge
    });
    
    req.session.logoutChallenge = logout_challenge;
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Logout</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; text-align: center; }
          button {
            background: #dc3545; color: white; padding: 10px 20px;
            border: none; border-radius: 4px; cursor: pointer;
            margin: 5px;
          }
          button:hover { background: #c82333; }
          .cancel { background: #6c757d; }
          .cancel:hover { background: #5a6268; }
        </style>
      </head>
      <body>
        <h2>Sign Out</h2>
        <p>Are you sure you want to sign out?</p>
        <form method="POST" action="/logout">
          <button type="submit" name="confirm" value="yes">Yes, sign me out</button>
          <button type="submit" name="confirm" value="no" class="cancel">Cancel</button>
        </form>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /logout - Process logout
app.post('/logout', async (req, res) => {
  const { confirm } = req.body;
  const logout_challenge = req.session.logoutChallenge;
  
  try {
    if (confirm === 'yes' && logout_challenge) {
      // Accept logout
      const { data } = await hydraAdmin.acceptOAuth2LogoutRequest({
        logoutChallenge: logout_challenge
      });
      
      // Clear session
      req.session.destroy();
      
      return res.redirect(data.redirect_to);
    }
    
    // User cancelled or no challenge
    res.send('Logout cancelled');
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =====================
// ERROR HANDLER
// =====================

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Login/Consent app listening on port ${PORT}`);
  console.log(`Hydra Admin URL: ${process.env.HYDRA_ADMIN_URL || 'http://127.0.0.1:4445'}`);
});
