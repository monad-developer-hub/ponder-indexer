import { Pool } from 'pg';

async function checkStatus() {
  try {
    // Connect to the Ponder database
    const pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'monad_ponder_indexer',
      user: 'postgres',
      // Add password if needed
    });

    // Get latest processed block from indexer
    const result = await pool.query(`
      SELECT 
        id, 
        timestamp,
        TO_TIMESTAMP(timestamp) as block_time
      FROM blocks 
      ORDER BY id DESC 
      LIMIT 1
    `);

    // Get current network block
    const networkResponse = await fetch('https://testnet-rpc.monad.xyz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      })
    });
    
    const networkData = await networkResponse.json();
    const networkBlock = parseInt(networkData.result, 16);

    if (result.rows.length > 0) {
      const indexerBlock = Number(result.rows[0].id);
      const blocksBehind = networkBlock - indexerBlock;
      const timeDelay = Date.now() / 1000 - Number(result.rows[0].timestamp);

      console.log('📊 INDEXER STATUS:');
      console.log(`   🏗️  Current Network Block: ${networkBlock.toLocaleString()}`);
      console.log(`   📦 Latest Indexed Block:  ${indexerBlock.toLocaleString()}`);
      console.log(`   ⏰ Block Time: ${result.rows[0].block_time}`);
      console.log(`   🔄 Blocks Behind: ${blocksBehind.toLocaleString()}`);
      console.log(`   ⏱️  Time Delay: ${timeDelay.toFixed(1)} seconds`);
      
      if (blocksBehind > 10) {
        console.log('   ⚠️  INDEXER IS FALLING BEHIND!');
      } else if (blocksBehind <= 5) {
        console.log('   ✅ INDEXER IS UP TO DATE!');
      } else {
        console.log('   🟡 INDEXER IS SLIGHTLY BEHIND');
      }
    } else {
      console.log('❌ No blocks found in database');
    }

    await pool.end();
  } catch (error) {
    console.error('Error checking status:', error.message);
  }
}

checkStatus(); 