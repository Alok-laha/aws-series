import http from 'http';

const server = http.createServer();

const PORT = 4000;
setTimeout(() => {
  server.listen(PORT, () => {
    console.log(`Payment service is running on port ${PORT}`);
  });
}, 5000); // Delay the server start by 5 seconds to simulate a slow startup

server.addListener('request', (req, res) => {
  console.log(`Received request: ${req.method} ${req.url}`);
  if(req.url === '/process-payment' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      console.log(`Payment data received: ${body}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      setTimeout(() => {
        console.log('Payment processed successfully');
        res.end(JSON.stringify({ message: 'Payment processed successfully' }));
      }, 2000); // Simulate a delay in processing the payment. Start with 10 sec delay and then reduce to 2 sec to simulate a slow payment service that eventually recovers.
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found\n');
  }
});