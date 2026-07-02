import http from 'http';
import retryModule, { AbortError } from '@n8n/p-retry';
import fetch from 'node-fetch';
// Circuit breaker library
import CircuitBreaker from 'opossum';

const pRetry = retryModule?.default ?? retryModule;

const server = http.createServer();

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Order service is running on port ${PORT}`);
});

// Function to process the order data and communicate with the payment service.
// This async function will be wrapped in a p-retry to handle transient errors and retry the request if necessary.
const processOrder = async (orderData) => {
  console.log('processOrder: sending payment request for', orderData);
  const response = await fetch('http://localhost:4000/process-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    throw new Error(`Payment service responded with status ${response.status}`);
  }
  return response.json();
};

// option setting for fixed retry mechanism
const fixedRetryOptions = {
  retries: 3, // Number of retry attempts
  factor: 1, // with 1 sec interval between retries
  minTimeout: 1000, // Minimum wait time between retries (in milliseconds)
  maxTimeout: 5000, // Maximum wait time between retries (in milliseconds)
  randomize: false, // Disable randomization of retry intervals
  onFailedAttempt: (error) => {
    console.log(`Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left. Error: ${error.message}`);
  },
};


// Exponential backoff retry options with jitter(randomization) for more robust error handling in case of transient failures when communicating with the payment service.
const exponentialRetryOptions = {
  retries: 3, // Number of retry attempts
  factor: 2, // Exponential backoff factor
  minTimeout: 1000, // Minimum wait time between retries (in milliseconds)
  maxTimeout: 5000, // Maximum wait time between retries (in milliseconds)
  randomize: true, // Enable randomization of retry intervals
  onFailedAttempt: (error) => {
    console.log(`Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left. Error: ${error.message}`);
  },
  shouldRetry: (error) => {
    // Only retry for network errors or 5xx server errors
    // Invallid request body or 4xx errors should not be retried as they are client-side issues.
    console.log('returned server response status:', error);
    if (error.response) {
      return error.response.status >= 500;
    }
    return true; // Retry for network errors
  },
};

// retry function
const retryProcessOrder = async (orderData) => {
  try {
    const paymentResponse = await pRetry(() => processOrder(orderData), exponentialRetryOptions);
    return paymentResponse;
  } catch (error) {
    console.error(`Failed to process order after retries: ${error}`);
    throw error; // Rethrow the error to be handled by the caller
  }
};

const PaymentCircuitBreaker = new CircuitBreaker(async (orderData) => await retryProcessOrder(orderData), {
  timeout: 5000, // If function takes longer than 5 seconds, trigger a failure
  errorThresholdPercentage: 50, // When 50% of requests fail, open the circuit
  resetTimeout: 10000 // After 10 seconds, try again.
});

PaymentCircuitBreaker.fallback(() => {
  throw new Error('Payment service is currently unavailable. Please try again later.');
});

// Circuit breaker lifecycle event listeners for observability
PaymentCircuitBreaker.on('open', () => {
  console.warn('CircuitBreaker: OPEN - requests will be short-circuited until resetTimeout elapses');
});

PaymentCircuitBreaker.on('halfOpen', () => {
  console.info('CircuitBreaker: HALF-OPEN - testing whether the upstream service has recovered');
  // Make a proactive probe request when circuit becomes half-open so we can see
  // whether the payment service has recovered without waiting for an external request.
  PaymentCircuitBreaker.fire({ probe: true })
    .then(result => {
      console.info('Probe result:', result);
    })
    .catch(err => {
      console.warn('Probe failed:', err && err.message ? err.message : err);
    });
});

PaymentCircuitBreaker.on('close', () => {
  console.info('CircuitBreaker: CLOSED - upstream service is healthy again');
});

PaymentCircuitBreaker.on('fallback', (result) => {
  console.warn('CircuitBreaker: FALLBACK executed =>', result);
});

PaymentCircuitBreaker.on('reject', () => {
  console.warn('CircuitBreaker: REJECT - request refused because circuit is open');
});

PaymentCircuitBreaker.on('fire', (...args) => {
  console.log('CircuitBreaker: FIRE - invoking wrapped function with args:', args);
});

server.addListener('request', (req, res) => {

  if (req.url === '/create-order' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      const orderData = JSON.parse(body);
      // Retry mechanism block
      try {
        // Circuit breaker with exponential backoff retry mechanism to handle transient errors and prevent cascading failures in the payment service.
        const paymentResponse = await PaymentCircuitBreaker.fire(orderData);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Order created successfully', paymentResponse }));
      } catch (error) {
        console.error(`Error processing payment: ${error}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Error processing payment', error: error.message }));
      }
    });
  } else if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Order service is running!\n');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found\n');
  }
});