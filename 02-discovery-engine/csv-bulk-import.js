// csv-bulk-import.js - Production Grade CSV Import
// Import articles from CSV into pmo_insights.db with proper error handling
// Usage: node csv-bulk-import.js <csv-file> [--skip-duplicates]

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Configuration
const DB_PATHS = [
  path.join(__dirname, 'pmo_insights.db'),
  path.join(__dirname, '..', 'pmo_insights.db'),
  'D:\\PMO-Brain-2.0-Modular\\02-discovery-engine\\pmo_insights.db'
];

function findDatabase() {
  for (const dbPath of DB_PATHS) {
    if (fs.existsSync(dbPath)) {
      return dbPath;
    }
  }
  throw new Error('Database not found in any expected location');
}

function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }
  
  const headers = lines[0].split(';').map(h => h.trim());
  const requiredHeaders = ['Title', 'URL', 'Published_Date'];
  
  // Validate headers
  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      throw new Error(`Missing required column: ${required}`);
    }
  }
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    if (values.length !== headers.length) {
      console.warn(`⚠️  Row ${i+1}: Column count mismatch, skipping`);
      continue;
    }
    
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim() || '';
    });
    
    // Validate required fields
    if (!row.Title || !row.URL || !row.Published_Date) {
      console.warn(`⚠️  Row ${i+1}: Missing required field, skipping`);
      continue;
    }
    
    data.push(row);
  }
  
  return data;
}

function formatDate(dateStr) {
  // Convert YYYY/MM/DD to YYYY-MM-DD
  return dateStr.replace(/\//g, '-');
}

async function importWithDuplicateCheck(db, articles) {
  return new Promise((resolve, reject) => {
    let inserted = 0;
    let skipped = 0;
    let errors = 0;
    let processed = 0;
    const total = articles.length;
    
    console.log('🔍 Checking each URL for duplicates...\n');
    
    // Process one at a time to avoid race conditions
    function processNext(index) {
      if (index >= total) {
        resolve({ inserted, skipped, errors });
        return;
      }
      
      const article = articles[index];
      const publishedDate = formatDate(article.Published_Date);
      const now = new Date().toISOString();
      
      // Check for duplicate
      db.get('SELECT id FROM daily_insights WHERE url = ?', [article.URL], (err, row) => {
        if (err) {
          console.error(`❌ Error checking URL: ${err.message}`);
          errors++;
          processNext(index + 1);
          return;
        }
        
        if (row) {
          skipped++;
          if (skipped % 50 === 0 || skipped === 1) {
            console.log(`⏭️  Skipped ${skipped}/${total} duplicates...`);
          }
          processNext(index + 1);
          return;
        }
        
        // Insert new article
        db.run(
          `INSERT INTO daily_insights (title, url, published_date, discovered_at, created_at) 
           VALUES (?, ?, ?, ?, ?)`,
          [article.Title, article.URL, publishedDate, now, now],
          function(err) {
            if (err) {
              console.error(`❌ Error inserting "${article.Title.substring(0, 50)}...": ${err.message}`);
              errors++;
            } else {
              inserted++;
              if (inserted % 50 === 0 || inserted === 1) {
                console.log(`✅ Inserted ${inserted}/${total} articles...`);
              }
            }
            processNext(index + 1);
          }
        );
      });
    }
    
    processNext(0);
  });
}

async function importFast(db, articles) {
  return new Promise((resolve, reject) => {
    let inserted = 0;
    let errors = 0;
    let processed = 0;
    const total = articles.length;
    
    console.log('⚡ Fast import mode (allowing duplicates)...\n');
    
    db.serialize(() => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
          reject(err);
          return;
        }
      });
      
      const stmt = db.prepare(
        `INSERT INTO daily_insights (title, url, published_date, discovered_at, created_at) 
         VALUES (?, ?, ?, ?, ?)`
      );
      
      articles.forEach((article, index) => {
        const publishedDate = formatDate(article.Published_Date);
        const now = new Date().toISOString();
        
        stmt.run([article.Title, article.URL, publishedDate, now, now], function(err) {
          processed++;
          
          if (err) {
            console.error(`❌ Error inserting "${article.Title.substring(0, 50)}...": ${err.message}`);
            errors++;
          } else {
            inserted++;
            if (inserted % 50 === 0 || inserted === 1) {
              console.log(`✅ Inserted ${inserted}/${total} articles...`);
            }
          }
          
          if (processed === total) {
            stmt.finalize();
            db.run('COMMIT', (err) => {
              if (err) {
                reject(err);
              } else {
                resolve({ inserted, skipped: 0, errors });
              }
            });
          }
        });
      });
    });
  });
}

async function main() {
  const csvFile = process.argv[2];
  const skipDuplicates = process.argv.includes('--skip-duplicates');
  
  // Validate arguments
  if (!csvFile) {
    console.error('❌ Usage: node csv-bulk-import.js <csv-file> [--skip-duplicates]');
    process.exit(1);
  }
  
  if (!fs.existsSync(csvFile)) {
    console.error(`❌ CSV file not found: ${csvFile}`);
    process.exit(1);
  }
  
  console.log('🚀 Starting CSV Import...\n');
  console.log(`📄 CSV File: ${csvFile}`);
  console.log(`🔄 Mode: ${skipDuplicates ? 'Skip duplicates' : 'Allow duplicates'}\n`);
  
  // Find database
  let dbPath;
  try {
    dbPath = findDatabase();
    console.log(`🗄️  Database: ${dbPath}\n`);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
  
  // Parse CSV
  console.log('📂 Reading CSV file...');
  let articles;
  try {
    const content = fs.readFileSync(csvFile, 'utf8');
    articles = parseCSV(content);
    console.log(`✅ Parsed ${articles.length} valid articles\n`);
  } catch (err) {
    console.error(`❌ Error parsing CSV: ${err.message}`);
    process.exit(1);
  }
  
  if (articles.length === 0) {
    console.log('⚠️  No valid articles to import');
    process.exit(0);
  }
  
  // Import to database
  const db = new sqlite3.Database(dbPath);
  
  try {
    const results = skipDuplicates 
      ? await importWithDuplicateCheck(db, articles)
      : await importFast(db, articles);
    
    db.close();
    
    console.log('\n🎉 Import Complete!');
    console.log(`✅ Inserted: ${results.inserted}`);
    console.log(`⏭️  Skipped: ${results.skipped}`);
    console.log(`❌ Errors: ${results.errors}`);
    console.log(`📊 Total processed: ${articles.length}\n`);
    
    process.exit(0);
  } catch (err) {
    console.error(`❌ Import failed: ${err.message}`);
    db.close();
    process.exit(1);
  }
}

main();