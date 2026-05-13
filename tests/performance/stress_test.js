import autocannon from 'autocannon';

const target = 'https://zengalla-api.onrender.com/api/auth/login';

const runStressTest = (connections, duration) => {
  console.log(`🚀 Starting Stress Test: ${connections} connections for ${duration}s`);
  
  const instance = autocannon({
    url: target,
    connections: connections,
    duration: duration,
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      email: '18sarusondj@gmail.com',
      password: 'sarusondj@1'
    })
  }, (err, result) => {
    if (err) {
      console.error('❌ Stress Test Failed:', err);
      return;
    }
    console.log('✅ Stress Test Results:');
    console.log(`- Req/Sec: ${result.requests.average}`);
    console.log(`- Latency (p99): ${result.latency.p99}ms`);
    console.log(`- Total Requests: ${result.requests.total}`);
    console.log(`- Total Errors: ${result.errors + result.timeouts + result.non2xx}`);
  });

  autocannon.track(instance, { renderProgressBar: true });
};

// Run with 100 connections
runStressTest(100, 30);
