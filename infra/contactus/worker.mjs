// Recovered contactus Worker; local-only fix. See README.md before any rollout.

// Define CORS headers for preflight requests and actual requests
const corsHeaders = {
    // List of allowed origins
    'Access-Control-Allow-Origin': '*', // Will be replaced with the actual origin if it matches allowed domains
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Content-Encoding',
  };
  
  // List of allowed domains
  const allowedOrigins = [
    'https://iqaas.io',
    'https://www.iqaas.io',
    'https://iqaas.co',
    'https://www.iqaas.co',
    'https://dqaas.io',
    'https://www.dqaas.io',
    'https://dqaas.co',
    'https://www.dqaas.co',
    'https://dqaas.dev',
    'https://www.dqaas.dev',
    'https://vibescape.dev',
    'https://www.vibescape.dev',
    'https://platewise.app',
    'https://www.platewise.app',
    'https://microsaas.app',
    'https://www.microsaas.app',
    // Allow localhost for development
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:8000',
    'http://127.0.0.1:8000'
  ];
  
  // Function to get CORS headers for a specific request
  async function getCorsHeaders(request) {
    const origin = request.headers.get('Origin');
    const headers = {...corsHeaders};
  
    // For OPTIONS requests, we'll use a permissive approach
    if (request.method === 'OPTIONS') {
      headers['Access-Control-Allow-Origin'] = origin || '*';
      return headers;
    }
  
    // CORS depends only on Origin; never clone or reread the request body.
    if (origin && allowedOrigins.includes(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
    } else if (origin && origin.match(/^https?:\/\/localhost:\d+$/)) {
      // Also allow any localhost origin for development
      headers['Access-Control-Allow-Origin'] = origin;
    } else {
      // For non-matching origins, we'll use a wildcard
      // In a production environment, you might want to remove this and return an error instead
      headers['Access-Control-Allow-Origin'] = '*';
    }
  
    return headers;
  };
  
  const MAX_FORM_BYTES = 64 * 1024;

  class RequestBodyError extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
    }
  }

  async function readFormData(request) {
    const encoding = (request.headers.get('Content-Encoding') || 'identity').trim().toLowerCase();
    if (encoding !== 'identity' && encoding !== 'gzip') {
      throw new RequestBodyError(415, 'Unsupported content encoding.');
    }
    if (!request.body) throw new RequestBodyError(400, 'Invalid JSON request body.');

    let reader;
    try {
      const stream = encoding === 'gzip'
        ? request.body.pipeThrough(new DecompressionStream('gzip'))
        : request.body;
      reader = stream.getReader();
      const chunks = [];
      let size = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_FORM_BYTES) {
          await reader.cancel();
          throw new RequestBodyError(413, 'Request body too large.');
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new RequestBodyError(400, 'Request body must be a JSON object.');
      }
      return parsed;
    } catch (error) {
      if (error instanceof RequestBodyError) throw error;
      // Never log malformed form bytes or decompressor/parser errors containing input.
      throw new RequestBodyError(400, 'Invalid JSON request body.');
    } finally {
      reader?.releaseLock();
    }
  }

  async function handleRequest(request, env) { // Add env parameter here
    // Handle CORS preflight requests (OPTIONS)
    if (request.method === 'OPTIONS') {
      const corsHeaders = await getCorsHeaders(request);
      return new Response(null, { headers: corsHeaders });
    }
  
    if (request.method !== 'POST') {
      const corsHeaders = await getCorsHeaders(request);
      return new Response(JSON.stringify({ success: false, message: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  
    try {
      // Get the KV binding from environment variables
      // Try both 'kv-contactus' and 'contactus' as binding names
      const kvStore = env['kv-contactus'] || env['contactus']; // Access binding using bracket notation because of hyphen
  
      // Check if KV binding exists and log detailed information
      if (!kvStore) {
          console.error("Namespace binding 'kv-contactus' not found in worker environment.");
          console.error("Available environment bindings:", Object.keys(env).join(', '));
  
          // Log more detailed information about the environment
          console.error("Environment type:", typeof env);
          console.error("Environment keys:", Object.keys(env));
          console.error("Environment values:", Object.values(env).map(v => typeof v));
  
          // Instead of throwing an error, we'll continue without KV storage
          console.warn("Continuing without storage - form submissions will not be saved.");
  
          // Return a warning to the client in development environments
          if (request.headers.get('Origin')?.includes('localhost')) {
              return new Response(JSON.stringify({
                  success: true,
                  warning: "Storage not available. Form submissions will not be saved.",
                  message: "Message processed without storage."
              }), {
                  status: 200,
                  headers: { ...await getCorsHeaders(request), 'Content-Type': 'application/json' },
              });
          }
      }
  
      // Expecting { name, email, message, company, title, screenResolution } from the client
      const formData = await readFormData(request);
      const { name, email, message, company, title, screenResolution } = formData;
  
      // Check for website field from hidden input
      const websiteField = formData.website;
  
      // Basic validation (optional but recommended)
      if (!name || !email || !message) {
          return new Response(JSON.stringify({ success: false, message: 'Missing required fields (name, email, message).' }), {
           status: 400, // Bad Request
           headers: { ...await getCorsHeaders(request), 'Content-Type': 'application/json' },
          });
      }
       if (!/\S+@\S+\.\S+/.test(email)) {
           return new Response(JSON.stringify({ success: false, message: 'Invalid email format.' }), {
           status: 400, // Bad Request
           headers: { ...await getCorsHeaders(request), 'Content-Type': 'application/json' },
          });
      }
  
      // --- Store data in Cloudflare KV (if available) ---
      const timestamp = new Date().toISOString();
      // Get the origin domain from the request headers
      let origin = request.headers.get('Origin') || 'Unknown'; // Get Origin header, default to 'Unknown'
  
      // Extract just the domain name from the origin URL
      try {
          if (origin !== 'Unknown') {
              const url = new URL(origin);
              origin = url.hostname; // This will give us just the domain name (e.g., vibescape.dev)
          }
      } catch (e) {
          console.error('Error parsing origin URL:', e);
          // Keep the original origin value if parsing fails
      }
  
      // Get client IP address
      const clientIP = request.headers.get('CF-Connecting-IP') ||
                      request.headers.get('X-Forwarded-For') ||
                      request.headers.get('X-Real-IP') ||
                      'Unknown';
  
      // Get user agent for device and browser info
      const userAgent = request.headers.get('User-Agent') || 'Unknown';
  
      // Try to determine device type, browser, OS, and language from user agent
      let deviceType = 'Unknown';
      let browserType = 'Unknown';
      let operatingSystem = 'Unknown';
      let language = request.headers.get('Accept-Language') || 'Unknown';
  
      // Extract primary language if available
      if (language !== 'Unknown') {
          language = language.split(',')[0].trim();
      }
  
      if (userAgent !== 'Unknown') {
          // Simple device detection
          if (/Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)) {
              deviceType = 'Mobile';
          } else {
              deviceType = 'Desktop';
          }
  
          // Simple browser detection
          if (/Chrome/i.test(userAgent) && !/Chromium|Edge|OPR|Edg/i.test(userAgent)) {
              browserType = 'Chrome';
          } else if (/Firefox/i.test(userAgent) && !/Seamonkey/i.test(userAgent)) {
              browserType = 'Firefox';
          } else if (/Safari/i.test(userAgent) && !/Chrome|Chromium|Edge|OPR|Edg/i.test(userAgent)) {
              browserType = 'Safari';
          } else if (/Edge|Edg/i.test(userAgent)) {
              browserType = 'Edge';
          } else if (/OPR|Opera/i.test(userAgent)) {
              browserType = 'Opera';
          } else if (/MSIE|Trident/i.test(userAgent)) {
              browserType = 'Internet Explorer';
          }
  
          // Operating system detection
          if (/Windows NT 10.0/i.test(userAgent)) {
              operatingSystem = 'Windows 10';
          } else if (/Windows NT 6.3/i.test(userAgent)) {
              operatingSystem = 'Windows 8.1';
          } else if (/Windows NT 6.2/i.test(userAgent)) {
              operatingSystem = 'Windows 8';
          } else if (/Windows NT 6.1/i.test(userAgent)) {
              operatingSystem = 'Windows 7';
          } else if (/Windows NT/i.test(userAgent)) {
              operatingSystem = 'Windows';
          } else if (/Mac OS X/i.test(userAgent)) {
              operatingSystem = userAgent.match(/Mac OS X ([0-9._]+)/i) ?
                               'macOS ' + userAgent.match(/Mac OS X ([0-9._]+)/i)[1].replace(/_/g, '.') :
                               'macOS';
          } else if (/Android/i.test(userAgent)) {
              operatingSystem = userAgent.match(/Android ([0-9.]+)/i) ?
                               'Android ' + userAgent.match(/Android ([0-9.]+)/i)[1] :
                               'Android';
          } else if (/iOS|iPhone|iPad|iPod/i.test(userAgent)) {
              operatingSystem = userAgent.match(/OS ([0-9_]+)/i) ?
                               'iOS ' + userAgent.match(/OS ([0-9_]+)/i)[1].replace(/_/g, '.') :
                               'iOS';
          } else if (/Linux/i.test(userAgent)) {
              operatingSystem = 'Linux';
          }
      }
  
      // Get country from Cloudflare headers if available
      const country = request.headers.get('CF-IPCountry') || 'Unknown';
  
      // Get referrer URL if available
      const referrerUrl = request.headers.get('Referer') || 'Unknown';
  
      // Extract landing page from referrer
      let landingPage = 'Unknown';
      if (referrerUrl !== 'Unknown') {
          try {
              const url = new URL(referrerUrl);
              landingPage = url.pathname || '/';
          } catch (e) {
              console.error('Error parsing referrer URL:', e);
          }
      }
  
      // Get timezone offset from current server time (best approximation without client data)
      const timezone = 'UTC'; // Default to UTC since we can't reliably get client timezone
  
      // Prepare the data object that would be stored
      const submissionData = {
          name: name || '', // Handle optional field
          email: email || '', // Handle optional field
          company: company || '', // Handle optional field
          title: title || '', // Use the title field from the form or empty string if not provided
          message: message || '', // Handle optional field
          submittedAt: timestamp,
          origin: origin, // The origin website
          ip: clientIP,
          userAgent: userAgent,
          deviceType: deviceType,
          browserType: browserType,
          operatingSystem: operatingSystem,
          language: language,
          country: country,
          referrerUrl: referrerUrl,
          landingPage: landingPage,
          timezone: timezone,
          screenResolution: screenResolution || 'Unknown' // From client-side JS
      };
  
      // Only attempt to store in KV if the binding exists
      if (kvStore) {
          // Create a unique key using account name and UUID
          // Format: {accountname}-{uuid}
          // Extract account name from origin or use a default
          // Use the website field from the hidden input as the account name
          // This makes the worker completely portable and dynamic
          let accountName = 'unknown';
  
          // If we have a website field from the hidden input, use it as the account name
          if (websiteField) {
              // Use the full website field as the account name without splitting
              accountName = websiteField;
          } else if (origin !== 'Unknown' && origin !== 'localhost') {
              // Fallback to origin if no website field is provided
              accountName = origin;
          }
  
          // Generate a UUID v4
          const uuid = crypto.randomUUID();
  
          // Create the key
          const key = `${accountName}-${uuid}`;
  
          // Convert data to JSON string for storing in KV
          const value = JSON.stringify(submissionData);
  
          try {
              // Put the data into the KV namespace directly
              await kvStore.put(key, value);
              console.log(`Stored submission in KV with key: ${key}`);
          } catch (kvError) {
              console.error(`KV write error: ${kvError.message}`);
              console.error(`KV write error stack: ${kvError.stack}`);
              // Log the error but don't throw - we want the form submission to continue
              // even if KV storage fails
              console.warn('Continuing without KV storage - form submission will still be processed');
          }
      } else {
          console.warn('KV binding not available - skipping data storage');
      }
      // --- End KV Storage ---
  
      // No email integration needed - we're just storing the form data in KV
  
      return new Response(JSON.stringify({ success: true, message: 'Message saved successfully!' }), {
        status: 200,
        headers: { ...await getCorsHeaders(request), 'Content-Type': 'application/json' },
      });
  
    } catch (error) {
      if (error instanceof RequestBodyError) {
        return new Response(JSON.stringify({ success: false, message: error.message }), {
          status: error.status,
          headers: { ...await getCorsHeaders(request), 'Content-Type': 'application/json' },
        });
      }
      console.error(`Worker Error: ${error.message}`); // Log specific error message
      console.error(error.stack); // Log stack trace for more details
  
      let clientErrorMessage = 'Failed to process request.';
      let statusCode = 500; // Default to Internal Server Error
  
      if (error.message.includes('Missing required fields') || error.message.includes('Invalid email format')) {
          clientErrorMessage = error.message;
          statusCode = 400; // Bad Request for validation errors
      } else if (error.message === 'Worker configuration error.') {
           clientErrorMessage = 'Server configuration error. Please contact support.';
           // Keep statusCode 500
      } else if (error.message.includes('KV') || error.message.includes('Failed to store data')) { // Catch potential KV errors
           clientErrorMessage = 'There was an issue storing your message. Please try again later.';
           console.error(`Detailed KV error: ${error.message}`);
           // Keep statusCode 500
      }
  
      return new Response(JSON.stringify({ success: false, message: clientErrorMessage }), {
        status: statusCode,
        headers: { ...await getCorsHeaders(request), 'Content-Type': 'application/json' },
      });
    }
  }
  
  export default {
    async fetch(request, env) {
        // env contains the KV binding
        try {
            // Log minimal request details
            console.log('Request received:', {
                method: request.method,
                url: request.url
            });
  
            // Check if KV binding exists
            const kvBinding = env['kv-contactus'] || env['contactus'];
            if (kvBinding) {
                console.log('KV binding found:', env['kv-contactus'] ? 'kv-contactus' : 'contactus');
            } else {
                console.error('KV binding NOT found: kv-contactus');
                console.log('Available bindings:', Object.keys(env).join(', '));
            }
  
            // Pass env to the handler function
            const response = await handleRequest(request, env);
            return response;
        } catch (error) {
            console.error(`Unhandled error in fetch handler: ${error.message}`);
            console.error(error.stack);
  
            return new Response(JSON.stringify({
                success: false,
                message: 'An unexpected error occurred. Please try again later.'
            }), {
                status: 500,
                headers: { ...await getCorsHeaders(request), 'Content-Type': 'application/json' }
            });
        }
    }
  };
