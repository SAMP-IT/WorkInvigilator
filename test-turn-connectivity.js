/**
 * TURN Server Connectivity Test
 *
 * Run this in the browser console (Dashboard or Desktop app) to verify TURN servers are working.
 *
 * USAGE:
 * 1. Open browser DevTools (F12)
 * 2. Copy-paste this entire file into the console
 * 3. Press Enter
 * 4. Wait 10 seconds for results
 *
 * EXPECTED OUTPUT (if TURN working):
 * - ICE Candidate: typ host ... (local network)
 * - ICE Candidate: typ srflx ... (STUN - public IP)
 * - ICE Candidate: typ relay ... (TURN - THIS IS WHAT WE NEED!)
 *
 * If you DON'T see "typ relay", TURN servers are NOT working!
 */

console.log('========================================');
console.log('TURN Server Connectivity Test');
console.log('========================================');
console.log('Testing configuration from page.tsx and livestream-supabase.js');
console.log('Waiting 10 seconds for ICE gathering...\n');

const iceServers = [
  // STUN servers
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },

  // Twilio TURN servers (primary)
  {
    urls: 'turn:global.turn.twilio.com:3478?transport=udp',
    username: 'f4b4035eaa76f4a55de5f4351567653ee4ff6fa97b50b6b334fcc1be4e8d8f71',
    credential: 'w1uxM55V9yVoqyVFjt+mxDBV0F87AUCemaYVQGxsPLw='
  },
  {
    urls: 'turn:global.turn.twilio.com:3478?transport=tcp',
    username: 'f4b4035eaa76f4a55de5f4351567653ee4ff6fa97b50b6b334fcc1be4e8d8f71',
    credential: 'w1uxM55V9yVoqyVFjt+mxDBV0F87AUCemaYVQGxsPLw='
  },
  {
    urls: 'turn:global.turn.twilio.com:443?transport=tcp',
    username: 'f4b4035eaa76f4a55de5f4351567653ee4ff6fa97b50b6b334fcc1be4e8d8f71',
    credential: 'w1uxM55V9yVoqyVFjt+mxDBV0F87AUCemaYVQGxsPLw='
  },

  // OpenRelay TURN servers (fallback)
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

const testPC = new RTCPeerConnection({ iceServers });

// Track candidate types
const candidateTypes = {
  host: 0,
  srflx: 0,
  relay: 0
};

testPC.createDataChannel('test');
testPC.createOffer().then(offer => testPC.setLocalDescription(offer));

testPC.onicecandidate = (event) => {
  if (event.candidate) {
    const candidate = event.candidate.candidate;
    console.log('ICE Candidate:', candidate);

    // Parse candidate type
    if (candidate.includes('typ host')) {
      candidateTypes.host++;
      console.log('  -> Type: HOST (local network)');
    } else if (candidate.includes('typ srflx')) {
      candidateTypes.srflx++;
      console.log('  -> Type: SRFLX (STUN - public IP)');
    } else if (candidate.includes('typ relay')) {
      candidateTypes.relay++;
      console.log('  -> Type: RELAY (TURN - relayed connection) *** THIS IS GOOD! ***');
    }
  } else {
    console.log('\n========================================');
    console.log('ICE Gathering Complete!');
    console.log('========================================');
    console.log('Summary:');
    console.log(`  HOST candidates (local): ${candidateTypes.host}`);
    console.log(`  SRFLX candidates (STUN): ${candidateTypes.srflx}`);
    console.log(`  RELAY candidates (TURN): ${candidateTypes.relay}`);
    console.log('');

    if (candidateTypes.relay > 0) {
      console.log('%c SUCCESS! TURN servers are working!', 'color: green; font-weight: bold; font-size: 16px');
      console.log('TURN relay candidates were found. This should fix the live monitoring issue.');
    } else {
      console.log('%c WARNING! No TURN relay candidates found!', 'color: red; font-weight: bold; font-size: 16px');
      console.log('Possible issues:');
      console.log('  1. TURN servers are down/overloaded');
      console.log('  2. Network is blocking TURN ports (80, 443, 3478)');
      console.log('  3. TURN credentials are invalid');
      console.log('  4. Firewall is blocking TURN traffic');
      console.log('');
      console.log('Try testing from a different network (e.g., mobile hotspot)');
    }

    console.log('\nICE Connection State:', testPC.iceConnectionState);
    console.log('ICE Gathering State:', testPC.iceGatheringState);
    console.log('========================================\n');

    testPC.close();
  }
};

// Timeout after 10 seconds
setTimeout(() => {
  if (testPC.iceGatheringState !== 'complete') {
    console.log('\n========================================');
    console.log('TIMEOUT! ICE gathering took too long');
    console.log('========================================');
    console.log('Current state:', testPC.iceGatheringState);
    console.log('Summary:');
    console.log(`  HOST candidates (local): ${candidateTypes.host}`);
    console.log(`  SRFLX candidates (STUN): ${candidateTypes.srflx}`);
    console.log(`  RELAY candidates (TURN): ${candidateTypes.relay}`);
    console.log('');

    if (candidateTypes.relay === 0) {
      console.log('%c TURN servers might be blocked or unavailable', 'color: orange; font-weight: bold');
    }

    testPC.close();
  }
}, 10000);
