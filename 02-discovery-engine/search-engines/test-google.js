const GoogleSearchEngine = require('./GoogleSearchEngine');

async function testBroaderSearch() {
  const google = new GoogleSearchEngine();
  await google.initialize();
  
  console.log('Testing without date restriction...');
  
  // Test broader queries without qdr:d
  const testQueries = [
    'AI project portfolio management -whitepaper -thesis',
    'AI project scheduling optimization',
    'latest AI announcements project management'
  ];
  
  for (const query of testQueries) {
    try {
      const searchResults = await google.searchGoogle(query, 'test');
      console.log('Query:', query.substring(0, 50) + '... -> ' + searchResults.length + ' results');
      if (searchResults.length > 0) {
        console.log('Sample title:', searchResults[0].title);
        console.log('Sample URL:', searchResults[0].url);
      }
      await google.delay(1000);
    } catch (error) {
      console.error('Query failed:', error.message);
    }
  }
}

testBroaderSearch().catch(console.error);
