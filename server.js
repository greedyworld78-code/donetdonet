// File: server.js - Multi-Platform Donation Server (Saweria, Sociabuzz, BagiBagi)
// Menggunakan Roblox Open Cloud MessagingService API

const express = require('express');
const app = express();

app.use(express.json());

// ============================================
// KONFIGURASI - SESUAIKAN DENGAN SETTING KAMU
// ============================================
const CONFIG = {
    // Roblox Open Cloud API Key (buat di https://create.roblox.com/credentials)
    // Pastikan API Key punya permission: universe-messaging-service:publish
    ROBLOX_API_KEY: process.env.ROBLOX_API_KEY || 'EYcsKM6PQUSvSxdpX1Dev/3bmRUivk2cG/9QVl9NLwJcgbjkZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNkluTnBaeTB5TURJeExUQTNMVEV6VkRFNE9qVXhPalE1V2lJc0luUjVjQ0k2SWtwWFZDSjkuZXlKaGRXUWlPaUpTYjJKc2IzaEpiblJsY201aGJDSXNJbWx6Y3lJNklrTnNiM1ZrUVhWMGFHVnVkR2xqWVhScGIyNVRaWEoyYVdObElpd2lZbUZ6WlVGd2FVdGxlU0k2SWtWWlkzTkxUVFpRVVZWVGRsTjRaSEJZTVVSbGRpOHpZbTFTVldsMmF6SmpSeTg1VVZac09VNU1kMHBqWjJKcWF5SXNJbTkzYm1WeVNXUWlPaUk0TnprMk16TTFOVFkySWl3aVpYaHdJam94TnpZNU56RTRNekU1TENKcFlYUWlPakUzTmprM01UUTNNVGtzSW01aVppSTZNVGMyT1RjeE5EY3hPWDAubUQzTDFaSm5fTUVJUkhXbFA3VXB0dE16OUo5U0g1OVJaeUdsSkVIQ1lHS2VCdkV5R2Y0Yzk1UDFKLTVyNU41YTZMaElkZTZMU2ZKejZfako5Ty1iUWlHZUYzZkJINmdYX2FUcEZGbUl6MWdlR0E5bThUWDF1YnZkaFpaa0FWdUNpRFAxXzF6X01Qd08zbHoxOFBKd3dsenV3S2xqZ2FFQjY0eGZobVlQZzlQaFBXV2MxWXRnUUNSemhIRjh1RlRmTFJfakxEaGdoaHVFTEVZOXdqbk9OV0pVd2RGWEpnbHppMWY1QXFRRS1JZzBGV1F4SmdLNi1kQ2tpMC1VUHpzVE9pV05GU0xPaDRMZ25xRk5NVTRpQUxHblZyOW4yV0l3NU9kM2hYOWJTc0FlZThHNW5lZW5STngxLTdqRFpRZFA1XzNkUG9USXpjOXp3czhJZWRmX3hR',
    
    // Universe ID dari game kamu (bukan Place ID!)
    // Cari di Game Settings > Security > Universe ID
    UNIVERSE_ID: process.env.UNIVERSE_ID || '9608356850',
    
    // Topic name untuk MessagingService (harus sama dengan di Roblox script)
    MESSAGING_TOPIC: 'DonationNotif'
};

// ============================================
// QUEUE SYSTEM
// ============================================
class DonationQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
    }
    
    enqueue(donation) {
        this.queue.push({
            id: `${donation.platform}_${donation.donatorName}_${Date.now()}`,
            platform: donation.platform,
            donatorName: donation.donatorName,
            amount: donation.amount,
            message: donation.message,
            timestamp: Date.now(),
            processed: false,
            sentToRoblox: false
        });
        console.log(`[QUEUE] Added ${donation.platform} donation. Total items: ${this.queue.length}`);
    }
    
    dequeue() {
        const index = this.queue.findIndex(d => !d.processed);
        if (index !== -1) {
            const donation = this.queue[index];
            donation.processed = true;
            console.log(`[QUEUE] Dequeued donation ${index + 1}/${this.queue.length}`);
            return donation;
        }
        return null;
    }
    
    cleanup() {
        const beforeCount = this.queue.length;
        this.queue = this.queue.filter(d => !d.processed);
        const afterCount = this.queue.length;
        if (beforeCount !== afterCount) {
            console.log(`[QUEUE] Cleaned ${beforeCount - afterCount} processed donations`);
        }
    }
    
    hasUnprocessed() {
        return this.queue.some(d => !d.processed);
    }
    
    getStatus() {
        const unprocessed = this.queue.filter(d => !d.processed).length;
        return {
            total: this.queue.length,
            unprocessed: unprocessed,
            processed: this.queue.length - unprocessed
        };
    }
}

const donationQueue = new DonationQueue();

// Cleanup otomatis setiap 5 menit
setInterval(() => {
    donationQueue.cleanup();
}, 5 * 60 * 1000);

// ============================================
// ROBLOX MESSAGING SERVICE API
// ============================================
async function sendToRoblox(donation) {
    const url = `https://apis.roblox.com/messaging-service/v1/universes/${CONFIG.UNIVERSE_ID}/topics/${CONFIG.MESSAGING_TOPIC}`;
    
    const payload = {
        message: JSON.stringify({
            platform: donation.platform,
            donatorName: donation.donatorName,
            amount: donation.amount,
            message: donation.message,
            timestamp: donation.timestamp
        })
    };
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'x-api-key': CONFIG.ROBLOX_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            console.log(`[ROBLOX] ✅ Sent donation to Roblox MessagingService:`, donation.donatorName, donation.amount);
            return true;
        } else {
            const errorText = await response.text();
            console.error(`[ROBLOX] ❌ Failed to send:`, response.status, errorText);
            return false;
        }
    } catch (error) {
        console.error(`[ROBLOX] ❌ Error sending to Roblox:`, error.message);
        return false;
    }
}

// ============================================
// WEBHOOK: SAWERIA
// ============================================
app.post('/webhook/saweria', (req, res) => {
    console.log('[SAWERIA] Raw payload received:', JSON.stringify(req.body, null, 2));
    
    const body = req.body;
    
    // Saweria webhook format
    const donatorName = 
        body.donator_name ||
        body.donatorName ||
        body.name ||
        (body.data && body.data.donator_name) ||
        'Donatur Anonim';
    
    const amount = 
        body.amount_raw ||
        body.amount ||
        body.gross_amount ||
        (body.data && body.data.amount) ||
        0;
    
    const message = 
        body.message ||
        body.note ||
        (body.data && body.data.message) ||
        '';
    
    console.log(`[SAWERIA] Parsed - Name: ${donatorName}, Amount: ${amount}, Message: ${message}`);
    
    if (!isNaN(amount) && amount > 0) {
        const donation = {
            platform: 'saweria',
            donatorName,
            amount: Number(amount),
            message
        };
        
        donationQueue.enqueue(donation);
        
        // Kirim langsung ke Roblox via MessagingService
        sendToRoblox({
            ...donation,
            timestamp: Date.now()
        });
    } else {
        console.log('[SAWERIA] Invalid donation data, skipped');
    }
    
    res.json({ success: true, platform: 'saweria' });
});

// ============================================
// WEBHOOK: SOCIABUZZ
// ============================================
app.post('/webhook/sociabuzz', (req, res) => {
    console.log('[SOCIABUZZ] Raw payload received:', JSON.stringify(req.body, null, 2));
    
    const body = req.body;
    
    // Sociabuzz webhook format
    const donatorName =
        (typeof body.supporter === 'string' && body.supporter.trim().length > 0
            ? body.supporter.trim()
            : null) ||
        body.supporter_name ||
        body.name ||
        body.donator_name ||
        (body.user && body.user.name) ||
        'Donatur Anonim';
    
    const amount =
        body.amount_raw ||
        body.amount ||
        body.amount_settled ||
        body.total ||
        body.nominal ||
        0;
    
    const message =
        body.message ||
        body.note ||
        body.comment ||
        (body.content && body.content.title) ||
        '';
    
    console.log(`[SOCIABUZZ] Parsed - Name: ${donatorName}, Amount: ${amount}, Message: ${message}`);
    
    if (!isNaN(amount) && amount > 0) {
        const donation = {
            platform: 'sociabuzz',
            donatorName,
            amount: Number(amount),
            message
        };
        
        donationQueue.enqueue(donation);
        
        // Kirim langsung ke Roblox via MessagingService
        sendToRoblox({
            ...donation,
            timestamp: Date.now()
        });
    } else {
        console.log('[SOCIABUZZ] Invalid donation data, skipped');
    }
    
    res.json({ success: true, platform: 'sociabuzz' });
});

// ============================================
// WEBHOOK: BAGIBAGI
// ============================================
app.post('/webhook/bagibagi', (req, res) => {
    console.log('[BAGIBAGI] Raw payload received:', JSON.stringify(req.body, null, 2));
    
    const body = req.body;
    
    // BagiBagi webhook format
    const donatorName =
        body.donor_name ||
        body.donator_name ||
        body.name ||
        body.supporter_name ||
        'Donatur Anonim';
    
    const amount =
        body.amount ||
        body.donation_amount ||
        body.total ||
        body.nominal ||
        0;
    
    const message =
        body.message ||
        body.note ||
        body.support_message ||
        '';
    
    console.log(`[BAGIBAGI] Parsed - Name: ${donatorName}, Amount: ${amount}, Message: ${message}`);
    
    if (!isNaN(amount) && amount > 0) {
        const donation = {
            platform: 'bagibagi',
            donatorName,
            amount: Number(amount),
            message
        };
        
        donationQueue.enqueue(donation);
        
        // Kirim langsung ke Roblox via MessagingService
        sendToRoblox({
            ...donation,
            timestamp: Date.now()
        });
    } else {
        console.log('[BAGIBAGI] Invalid donation data, skipped');
    }
    
    res.json({ success: true, platform: 'bagibagi' });
});

// ============================================
// WEBHOOK: UNIVERSAL (Auto-detect platform)
// ============================================
app.post('/webhook', (req, res) => {
    console.log('[UNIVERSAL] Raw payload received:', JSON.stringify(req.body, null, 2));
    
    const body = req.body;
    
    // Coba deteksi platform dari payload
    let platform = 'unknown';
    
    // Deteksi Saweria (biasanya ada field khusus)
    if (body.donator_name || (body.data && body.data.donator_name)) {
        platform = 'saweria';
    }
    // Deteksi Sociabuzz (ada field supporter)
    else if (body.supporter || body.supporter_name || body.amount_settled) {
        platform = 'sociabuzz';
    }
    // Deteksi BagiBagi
    else if (body.donor_name || body.support_message) {
        platform = 'bagibagi';
    }
    
    // Parse data secara universal
    const donatorName =
        body.supporter ||
        body.supporter_name ||
        body.donator_name ||
        body.donor_name ||
        body.name ||
        (body.user && body.user.name) ||
        (body.data && body.data.donator_name) ||
        'Donatur Anonim';
    
    const amount =
        body.amount_raw ||
        body.amount ||
        body.amount_settled ||
        body.gross_amount ||
        body.donation_amount ||
        body.total ||
        body.nominal ||
        (body.data && body.data.amount) ||
        0;
    
    const message =
        body.message ||
        body.note ||
        body.comment ||
        body.support_message ||
        (body.content && body.content.title) ||
        (body.data && body.data.message) ||
        '';
    
    console.log(`[UNIVERSAL] Detected: ${platform} - Name: ${donatorName}, Amount: ${amount}, Message: ${message}`);
    
    if (!isNaN(amount) && amount > 0) {
        const donation = {
            platform,
            donatorName: String(donatorName).trim(),
            amount: Number(amount),
            message: String(message)
        };
        
        donationQueue.enqueue(donation);
        
        // Kirim langsung ke Roblox via MessagingService
        sendToRoblox({
            ...donation,
            timestamp: Date.now()
        });
    } else {
        console.log('[UNIVERSAL] Invalid donation data, skipped');
    }
    
    res.json({ success: true, platform });
});

// ============================================
// FALLBACK: Legacy check-donations endpoint (untuk kompatibilitas)
// ============================================
app.get('/check-donations', (req, res) => {
    console.log('[CHECK] Roblox checking for donations (legacy endpoint)...');
    
    const status = donationQueue.getStatus();
    console.log(`[CHECK] Queue status - Total: ${status.total}, Unprocessed: ${status.unprocessed}`);
    
    if (donationQueue.hasUnprocessed()) {
        const donation = donationQueue.dequeue();
        
        if (donation) {
            console.log(`[CHECK] Sending donation from: ${donation.donatorName}`);
            
            res.json({
                hasNewDonation: true,
                platform: donation.platform,
                donatorName: donation.donatorName,
                amount: donation.amount,
                message: donation.message,
                queuePosition: status.unprocessed,
                totalInQueue: status.total
            });
        } else {
            res.json({ hasNewDonation: false });
        }
    } else {
        res.json({ hasNewDonation: false });
    }
});

// ============================================
// STATUS ENDPOINTS
// ============================================
app.get('/queue-status', (req, res) => {
    const status = donationQueue.getStatus();
    res.json({
        ...status,
        queue: donationQueue.queue.map((d, idx) => ({
            position: idx + 1,
            platform: d.platform,
            donatorName: d.donatorName,
            amount: d.amount,
            processed: d.processed,
            sentToRoblox: d.sentToRoblox,
            timestamp: new Date(d.timestamp).toISOString()
        }))
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        platforms: ['saweria', 'sociabuzz', 'bagibagi'],
        endpoints: {
            saweria: '/webhook/saweria',
            sociabuzz: '/webhook/sociabuzz',
            bagibagi: '/webhook/bagibagi',
            universal: '/webhook'
        }
    });
});

app.get('/', (req, res) => {
    res.json({
        name: 'Multi-Platform Donation Server',
        version: '2.0.0',
        description: 'Supports Saweria, Sociabuzz, and BagiBagi with Roblox MessagingService',
        endpoints: {
            webhooks: {
                saweria: 'POST /webhook/saweria',
                sociabuzz: 'POST /webhook/sociabuzz',
                bagibagi: 'POST /webhook/bagibagi',
                universal: 'POST /webhook (auto-detect)'
            },
            status: {
                health: 'GET /health',
                queue: 'GET /queue-status'
            },
            legacy: {
                checkDonations: 'GET /check-donations'
            }
        },
        messagingService: {
            topic: CONFIG.MESSAGING_TOPIC,
            universeConfigured: CONFIG.UNIVERSE_ID !== '9608356850'
        }
    });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('');
    console.log('🚀 ===============================================');
    console.log('🚀 Multi-Platform Donation Server v2.0');
    console.log('🚀 ===============================================');
    console.log(`📡 Server running on port ${PORT}`);
    console.log('');
    console.log('📋 Webhook Endpoints:');
    console.log('   • Saweria:    POST /webhook/saweria');
    console.log('   • Sociabuzz:  POST /webhook/sociabuzz');
    console.log('   • BagiBagi:   POST /webhook/bagibagi');
    console.log('   • Universal:  POST /webhook (auto-detect)');
    console.log('');
    console.log('📊 Status Endpoints:');
    console.log('   • Health:     GET /health');
    console.log('   • Queue:      GET /queue-status');
    console.log('');
    console.log('🎮 Roblox MessagingService:');
    console.log(`   • Topic: ${CONFIG.MESSAGING_TOPIC}`);
    console.log(`   • Universe ID: ${CONFIG.UNIVERSE_ID !== '9608356850' ? CONFIG.UNIVERSE_ID : '⚠️ NOT CONFIGURED!'}`);
    console.log(`   • API Key: ${CONFIG.ROBLOX_API_KEY !== 'YOUR_ROBLOX_API_KEY_HERE' ? '✅ Configured' : '⚠️ NOT CONFIGURED!'}`);
    console.log('');
    console.log('✅ Ready to receive donations!');
    console.log('🚀 ===============================================');
});
