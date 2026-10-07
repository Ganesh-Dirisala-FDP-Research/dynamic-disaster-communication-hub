import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

// Safe route corridors metadata database
interface SafeLocationInfo {
  id: string;
  name: string;
  destinationName: string;
  destinationCoords: { lat: number; lng: number };
  originName: string;
  originCoords: { lat: number; lng: number };
  elevationMeters: number;
  elevationGainMeters: number;
  distanceKm: number;
  bearingDeg: number;
  bearingCardinal: string;
  relativeDirection: string;
  safeZoneBufferKm: number;
  terrainType: string;
  defaultDos: string[];
  defaultDonts: string[];
}

const SAFE_LOCATIONS_DATABASE: Record<string, SafeLocationInfo> = {
  'exit-1a': {
    id: 'exit-1a',
    name: 'Safe Path 1A: Sonauli ➔ Nautanwa Solar Ridge Haven',
    originName: 'Sonauli Culvert Catchment (Lowland Flood Basin)',
    originCoords: { lat: 27.4647, lng: 83.4988 },
    destinationName: 'Nautanwa Solar Highland Station (Safe Ground)',
    destinationCoords: { lat: 27.4285, lng: 83.4241 },
    elevationMeters: 140,
    elevationGainMeters: 42,
    distanceKm: 5.2,
    bearingDeg: 242,
    bearingCardinal: 'South-West',
    relativeDirection: 'on your SOUTH-WEST side (follow elevated arterial bypass)',
    safeZoneBufferKm: 15,
    terrainType: 'Elevated bedrock ridge above lowland drainage channels',
    defaultDos: [
      'Move immediately towards the South-West elevated bedrock ridge.',
      'Stay on NH24 / AH1 bypass above the 10-year flood crest marker.',
      'Keep your emergency radio or mesh node tuned to emergency beacon channel.',
      'Assist children and elderly to stay within the elevated median line.',
    ],
    defaultDonts: [
      'DO NOT walk or drive into the submerged North Culvert basin.',
      'DO NOT touch or step near submerged power cables or flooded transformers.',
      'DO NOT attempt to cross the Sonauli culvert underpass while water is flowing.',
      'DO NOT stop on low bridge aprons to take photos or inspect runoff.',
    ],
  },
  'exit-2b': {
    id: 'exit-2b',
    name: 'Safe Path 2B: Belahiya ➔ Siddharthanagar Elevated Haven',
    originName: 'Belahiya Indo-Nepal Border Transit Gate',
    originCoords: { lat: 27.5028, lng: 83.4542 },
    destinationName: 'Siddharthanagar Emergency Elevated Relief Center, Nepal',
    destinationCoords: { lat: 27.535, lng: 83.452 },
    elevationMeters: 118,
    elevationGainMeters: 13,
    distanceKm: 4.8,
    bearingDeg: 357,
    bearingCardinal: 'North',
    relativeDirection: 'straight ahead on your NORTH side (ascend the high river terrace)',
    safeZoneBufferKm: 15,
    terrainType: 'Reinforced dual-lane high embankment ascending river terrace',
    defaultDos: [
      'Head due North through the Belahiya border humanitarian fast-clearance gate.',
      'Follow the high Gautam Buddha highway embankment toward the municipal relief center.',
      'Carry waterproof packets of identification and essential prescription medicine.',
      'Check in with border emergency personnel for clean drinking water and triage.',
    ],
    defaultDonts: [
      'DO NOT stay in low-lying roadside market structures near the border moat.',
      'DO NOT drink unfiltered standing tap water or flood surface runoff.',
      'DO NOT cross swollen drainage ditches even if water appears shallow.',
      'DO NOT use elevators or enter underground basements in the transit zone.',
    ],
  },
  'exit-3c': {
    id: 'exit-3c',
    name: 'Safe Path 3C: Siddharthanagar ➔ Manigram Ridge Overpass Haven',
    originName: 'Siddharthanagar North Junction',
    originCoords: { lat: 27.535, lng: 83.452 },
    destinationName: 'Manigram Elevated Ridge Overpass Haven, Nepal',
    destinationCoords: { lat: 27.575, lng: 83.458 },
    elevationMeters: 152,
    elevationGainMeters: 34,
    distanceKm: 5.4,
    bearingDeg: 8,
    bearingCardinal: 'North-North-East',
    relativeDirection: 'on your NORTH side (ascend the grade-separated highway viaduct)',
    safeZoneBufferKm: 15,
    terrainType: 'Pre-stressed concrete highway overpass 8 meters above ground level',
    defaultDos: [
      'Ascend the Bhalwari overpass ramp to stay 8 meters above surface level.',
      'Follow the North highway corridor directly to the Manigram high terrace.',
      'Stay linked with your neighborhood evacuation group in single file.',
      'Keep mobile devices in extreme power saving mode while using Bluetooth mesh.',
    ],
    defaultDonts: [
      'DO NOT descend back to ground-level service lanes or underpass ramps.',
      'DO NOT drive heavy vehicles onto crowded pedestrian refuge walkways.',
      'DO NOT leave children unattended near overpass guardrails.',
      'DO NOT discard waste into drainage inlets along the elevated viaduct.',
    ],
  },
  'exit-nepal-18km': {
    id: 'exit-nepal-18km',
    name: 'Cross-Border 18.4KM: India (Sonauli) ➔ Nepal (Butwal Sanctuary)',
    originName: 'Sonauli / Indo-Nepal Border Transit Gate',
    originCoords: { lat: 27.4647, lng: 83.4988 },
    destinationName: 'Butwal Siwalik Foothill Safe Zone Sanctuary, Nepal',
    destinationCoords: { lat: 27.605, lng: 83.465 },
    elevationMeters: 216,
    elevationGainMeters: 118,
    distanceKm: 18.4,
    bearingDeg: 352,
    bearingCardinal: 'North',
    relativeDirection: 'on your NORTH side (ascend the high-ground trans-boundary corridor into Nepal Siwalik foothills)',
    safeZoneBufferKm: 20,
    terrainType: 'Elevated trans-boundary highway corridor ascending into Nepal Siwalik foothills sanctuary',
    defaultDos: [
      'Ascend immediately onto the high Gautam Buddha / AH1 highway towards Nepal Siwalik Valley Foothills.',
      'Head directly to Butwal Siwalik Foothill Sector 4 Sanctuary at 216m MSL elevation.',
      'Pass through the Belahiya border humanitarian fast-clearance green corridor.',
      'Maintain continuous RF mesh / BLE connection with valley relay beacons.',
    ],
    defaultDonts: [
      'DO NOT remain in the low-lying Sonauli / Tinau floodplain catchment basin.',
      'DO NOT attempt to cross unbridged seasonal riverbed culverts when inundated.',
      'DO NOT stay near unreinforced silt embankments along the lower valley.',
      'DO NOT leave the elevated paved highway corridor until reaching Butwal Foothills Gate.',
    ],
  },
  'exit-final': {
    id: 'exit-final',
    name: 'Safe Path Final: Manigram ➔ Butwal Sector 4 Himalayan Sanctuary Gate',
    originName: 'Manigram North Highway Junction',
    originCoords: { lat: 27.575, lng: 83.458 },
    destinationName: 'Butwal Sector 4 Himalayan Mountain Sanctuary Gate, Nepal',
    destinationCoords: { lat: 27.605, lng: 83.465 },
    elevationMeters: 216,
    elevationGainMeters: 64,
    distanceKm: 4.2,
    bearingDeg: 12,
    bearingCardinal: 'North-North-East',
    relativeDirection: 'on your NORTH-WEST side (ascend the fortified Siwalik mountain ridge)',
    safeZoneBufferKm: 20,
    terrainType: 'Fortified mountain foothills sanctuary 64 meters above the flood basin',
    defaultDos: [
      'Ascend immediately onto the Siwalik foothills ridge towards Sector 4 Sanctuary.',
      'Proceed directly to the Gate 2 high-altitude shelter at 216 meters elevation.',
      'Carry emergency survival pack, warm clothing, and emergency power bank.',
      'Follow tactical luminous markers placed by rescue mountain patrol teams.',
    ],
    defaultDonts: [
      'DO NOT enter the Tinau river floodplain or stroll along unstable silt banks.',
      'DO NOT cross bridges that have turbulent floodwaters touching bridge girders.',
      'DO NOT shelter under unreinforced mud overhangs or steep landslide-prone cliffs.',
      'DO NOT turn back down the mountain until local disaster authorities sound all-clear.',
    ],
  },
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // In-memory cache and rate-limit guard for Gemini dynamic guidance
  const guidanceCache = new Map<string, { voiceover: string; dos: string[]; donts: string[] }>();
  let geminiCooldownUntil = 0;

  // Safe Path Processing Backend Endpoint
  app.post('/api/safe-path/guidance', async (req, res) => {
    try {
      const { exitId = 'exit-final', language = 'en', settlementName = '' } = req.body;

      const locData = SAFE_LOCATIONS_DATABASE[exitId] || SAFE_LOCATIONS_DATABASE['exit-final'];

      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${locData.originCoords.lat},${locData.originCoords.lng}&destination=${locData.destinationCoords.lat},${locData.destinationCoords.lng}&travelmode=walking`;

      const cacheKey = `${locData.id}-${language}-${settlementName || ''}`;
      let aiVoiceoverText = '';
      let dos: string[] = [];
      let donts: string[] = [];

      // Check in-memory cache first to conserve quota and ensure zero latency
      const cached = guidanceCache.get(cacheKey);
      if (cached) {
        aiVoiceoverText = cached.voiceover;
        dos = cached.dos;
        donts = cached.donts;
      }

      // Try generating dynamic script using Gemini if API key is valid and not on rate-limit cooldown
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!aiVoiceoverText && geminiApiKey && geminiApiKey !== 'MY_GEMINI_API_KEY' && Date.now() > geminiCooldownUntil) {
        try {
          const ai = new GoogleGenAI({ apiKey: geminiApiKey });
          const prompt = `You are a real-time emergency disaster evacuation voice guidance system.
The user is at risk of flash flooding near ${settlementName || locData.originName}.
Safe destination: ${locData.destinationName}.
Exact Coordinates: Destination Lat ${locData.destinationCoords.lat}, Lng ${locData.destinationCoords.lng}.
Safe Direction: The safe place is on the user's ${locData.relativeDirection}.
Distance: ${locData.distanceKm} km. Elevation gain: +${locData.elevationGainMeters} meters (Safe elevation: ${locData.elevationMeters}m MSL).
Language: ${language === 'hi' ? 'Hindi' : language === 'ne' ? 'Nepali' : 'English'}.

Generate an authoritative, calming, crystal-clear life-saving spoken audio script (under 60 words) instructing the user exactly where the safe place is (e.g. "The safe place is on this side..."), why it is safe, followed by 3 concise DOs and 3 concise DON'Ts.
Format your response as a JSON object:
{
  "voiceover": "Spoken voice script text starting with clear directional guidance: 'Alert: The safe place is on this side...'",
  "dos": ["Do 1", "Do 2", "Do 3"],
  "donts": ["Don't 1", "Don't 2", "Don't 3"]
}`;

          let response;
          try {
            response = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
                temperature: 0.2,
              },
            });
          } catch (modelErr: any) {
            // Check if rate limited before trying fallback
            if (modelErr?.status === 'RESOURCE_EXHAUSTED' || modelErr?.code === 429 || String(modelErr).includes('quota')) {
              geminiCooldownUntil = Date.now() + 10 * 60 * 1000;
            } else {
              response = await ai.models.generateContent({
                model: 'gemini-flash-latest',
                contents: prompt,
                config: {
                  responseMimeType: 'application/json',
                  temperature: 0.2,
                },
              });
            }
          }

          if (response?.text) {
            const parsed = JSON.parse(response.text);
            if (parsed.voiceover) aiVoiceoverText = parsed.voiceover;
            if (Array.isArray(parsed.dos) && parsed.dos.length > 0) dos = parsed.dos;
            if (Array.isArray(parsed.donts) && parsed.donts.length > 0) donts = parsed.donts;

            // Cache successful result
            guidanceCache.set(cacheKey, { voiceover: aiVoiceoverText, dos, donts });
          }
        } catch (geminiErr: any) {
          // If quota is exhausted or rate limit hit, back off cleanly for 10 minutes
          if (geminiErr?.status === 'RESOURCE_EXHAUSTED' || geminiErr?.code === 429 || String(geminiErr).includes('quota')) {
            geminiCooldownUntil = Date.now() + 10 * 60 * 1000;
          }
          // Gracefully fallback to high-fidelity pre-engineered tactical guidance
        }
      }

      // Default high-clarity tactical voiceover and localized DOs & DON'Ts if not generated or during rate limit
      if (!aiVoiceoverText) {
        if (language === 'hi') {
          aiVoiceoverText = `चेतावनी: आपातकालीन सुरक्षित मार्ग सक्रिय किया गया है। सुरक्षित स्थान आपकी ${locData.relativeDirection} पर है, ${locData.destinationName} की ओर, जो खतरे से ${locData.elevationGainMeters} मीटर ऊंचाई पर है। तुरंत ऊंचे स्थान की ओर बढ़ें। क्या करें: तुरंत ऊंचे मार्ग पर जाएं, दवाएं और पानी साथ रखें। क्या न करें: बाढ़ के पानी में न उतरें और बिजली के खंभों को न छुएं।`;
          if (dos.length === 0) {
            dos = [
              'तुरंत सुरक्षित ऊंचे मार्ग और पहाड़ी क्षेत्र की ओर बढ़ें।',
              'आपातकालीन रेडियो या ब्लूटूथ मेश नेटवर्क चालू रखें।',
              'ज़रूरी दवाएं, पहचान पत्र और पीने का पानी साथ रखें।',
              'बुजुर्गों और बच्चों को सुरक्षित मार्ग पर साथ रखें।',
            ];
          }
          if (donts.length === 0) {
            donts = [
              'बाढ़ के बहते या खड़े पानी में कभी न उतरें।',
              'पानी में गिरे बिजली के खंभों या तारों को बिल्कुल न छुएं।',
              'जलमग्न पुलों या कल्वर्ट को पार करने की कोशिश न करें।',
              'प्रशासन द्वारा सुरक्षित घोषित होने तक नीचे न लौटें।',
            ];
          }
        } else if (language === 'ne') {
          aiVoiceoverText = `सतर्कता: आपतकालीन सुरक्षित मार्ग सुरु भयो। सुरक्षित स्थान तपाईंको ${locData.relativeDirection} तर्फ छ, ${locData.destinationName} मा, जुन बाढी सतहबाट ${locData.elevationGainMeters} मिटर अग्लो छ। तुरुन्तै अग्लो ठाउँमा जानुहोस्। गर्नुहोस्: तुरुन्तै अग्लो जमिनमा जानुहोस् र सहायता लिनुहोस्। नगर्नुहोस्: बग्दो पानीमा नपस्नुहोस् र खसेका बिजुलीका तार नछुनुहोस्।`;
          if (dos.length === 0) {
            dos = [
              'तुरुन्तै अग्लो सुरक्षित जमिन वा पहाडी भाग तर्फ जानुहोस्।',
              'आपतकालीन रेडियो वा ब्लुटुथ मेश नेटवर्क सक्रिय राख्नुहोस्।',
              'आवश्यक औषधि, परिचयपत्र र पिउने पानी साथमा लैजानुहोस्।',
              'बालबालिका र वृद्धवृद्धाहरूलाई सुरक्षित बाटोमा साथ दिनुहोस्।',
            ];
          }
          if (donts.length === 0) {
            donts = [
              'बगिरहेको वा जमेको बाढीको पानीमा नपस्नुहोस्।',
              'पानीमा डुबेका बिजुलीका पोल वा तारहरू नछुनुहोस्।',
              'डुबानमा परेका पुल वा कल्भर्ट पार गर्ने प्रयास नगर्नुहोस्।',
              'आपतकालीन सूचना नआएसम्म तल्लो भागमा नफर्कनुहोस्।',
            ];
          }
        } else {
          aiVoiceoverText = `Alert: Emergency safe path activated. The safe place is on this side, towards your ${locData.relativeDirection} at ${locData.destinationName}, located ${locData.distanceKm} kilometers ahead at an elevated safe altitude of ${locData.elevationMeters} meters, which provides a positive safety gain of plus ${locData.elevationGainMeters} meters above the inundation basin. Do: Move immediately to the elevated ridge, keep emergency supplies handy, and assist elderly neighbors. Don't: Do not enter standing or flowing floodwater, do not touch electrical equipment, and do not cross submerged culverts.`;
          if (dos.length === 0) dos = [...locData.defaultDos];
          if (donts.length === 0) donts = [...locData.defaultDonts];
        }

        // Cache pre-engineered fallback so subsequent requests are immediate
        guidanceCache.set(cacheKey, { voiceover: aiVoiceoverText, dos, donts });
      }

      res.json({
        success: true,
        exitId: locData.id,
        safeLocation: {
          name: locData.destinationName,
          originName: locData.originName,
          lat: locData.destinationCoords.lat,
          lng: locData.destinationCoords.lng,
          originLat: locData.originCoords.lat,
          originLng: locData.originCoords.lng,
          elevationMeters: locData.elevationMeters,
          elevationGainMeters: locData.elevationGainMeters,
          distanceKm: locData.distanceKm,
          bearingDeg: locData.bearingDeg,
          bearingCardinal: locData.bearingCardinal,
          relativeDirection: locData.relativeDirection,
          safeZoneBufferKm: locData.safeZoneBufferKm,
          terrainType: locData.terrainType,
        },
        voiceover: {
          headline: `Exact Location: ${locData.destinationName}`,
          speechText: aiVoiceoverText,
          dos,
          donts,
        },
        googleMapsDirectionsUrl: googleMapsUrl,
        processedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error processing safe path guidance:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to process safe path',
      });
    }
  });

  // In-memory Emergency SOS Dispatch Log & Queue with seeded live incidents
  const emergencySosQueue: Array<any> = [
    {
      ticket_id: 'TICKET-RESQ-SONAULI-7412',
      device_id: 'urn:resq:citizen:sonauli-441',
      citizen_status: 'Trapped on Rooftop (Water 1.4m)',
      latitude: 27.4652,
      longitude: 83.4981,
      accuracy_meters: 1.5,
      altitude_meters: 112,
      battery_pct: 14,
      network_path: 'BLE_MESH',
      hop_count: 2,
      priority: 'P1_CRITICAL',
      headcount: 4,
      vulnerabilities: ['Mobility Impaired', 'Infant'],
      triage_notes: 'Elderly diabetic survivor with infant. Water rising fast near Sonauli culvert.',
      status: 'PENDING',
      assigned_unit: 'Unassigned',
      timestamp: Date.now() - 65000, // 1 min ago
      received_at: new Date(Date.now() - 65000).toISOString(),
      eta_minutes: null,
    },
    {
      ticket_id: 'TICKET-RESQ-BELAHIYA-8921',
      device_id: 'urn:resq:citizen:belahiya-109',
      citizen_status: 'Submerged Structure / Medical O2 Needed',
      latitude: 27.5025,
      longitude: 83.4540,
      accuracy_meters: 2.1,
      altitude_meters: 124,
      battery_pct: 28,
      network_path: 'LTE',
      hop_count: 0,
      priority: 'P1_CRITICAL',
      headcount: 3,
      vulnerabilities: ['Oxygen Required'],
      triage_notes: 'Patient requires oxygen. Ground floor inundated. Signal fading.',
      status: 'DISPATCHED_UAV',
      assigned_unit: 'Airborne UAV Swarm Gamma-4',
      timestamp: Date.now() - 190000, // 3 mins ago
      received_at: new Date(Date.now() - 190000).toISOString(),
      eta_minutes: 2.4,
    },
    {
      ticket_id: 'TICKET-RESQ-TINAU-6330',
      device_id: 'urn:resq:citizen:tinau-782',
      citizen_status: 'Stranded on Vehicle Roof',
      latitude: 27.5348,
      longitude: 83.4522,
      accuracy_meters: 3.4,
      altitude_meters: 138,
      battery_pct: 42,
      network_path: 'DTN_OFFLINE',
      hop_count: 3,
      priority: 'P2_HIGH',
      headcount: 2,
      vulnerabilities: [],
      triage_notes: 'Vehicle caught in flash surge at Gautam Buddha highway underpass.',
      status: 'NDRF_DEPLOYED',
      assigned_unit: 'NDRF Inflatable Raft Alpha-01',
      timestamp: Date.now() - 420000, // 7 mins ago
      received_at: new Date(Date.now() - 420000).toISOString(),
      eta_minutes: 4.8,
    },
    {
      ticket_id: 'TICKET-RESQ-MANIGRAM-5519',
      device_id: 'urn:resq:citizen:manigram-312',
      citizen_status: 'Evacuating Towards Ridge Haven',
      latitude: 27.5752,
      longitude: 83.4583,
      accuracy_meters: 1.2,
      altitude_meters: 154,
      battery_pct: 76,
      network_path: 'BLE_MESH',
      hop_count: 1,
      priority: 'P3_MODERATE',
      headcount: 5,
      vulnerabilities: ['Elderly'],
      triage_notes: 'Walking on elevated highway median towards Manigram Ridge Overpass.',
      status: 'TRIAGED',
      assigned_unit: 'Field Triage Team Bravo',
      timestamp: Date.now() - 780000, // 13 mins ago
      received_at: new Date(Date.now() - 780000).toISOString(),
      eta_minutes: 8.0,
    },
  ];

  // In-memory Dam Breach & Basin Telemetry State
  let hydroBreachState = {
    gauge: 'North Gorge Watchpoint Station A-01',
    waterLevelMeters: 4.82,
    dangerThresholdMeters: 3.2,
    safeBaseElevation: 1.80,
    rateOfRiseMetersPerHour: 1.45,
    surgeVelocityKmh: 29.4,
    barometerDeltaHpa: -14.8,
    isBreached: true,
    lastBreachTriggerTime: Date.now() - 120000,
    downstreamZones: [
      { name: 'India (North Gorge Himalayan Watchpoint)', distKm: 0.8, etaSeconds: 98, status: 'IMMINENT_INUNDATION' },
      { name: 'Nepal (Valley Foothills & Trans-Boundary)', distKm: 4.6, etaSeconds: 563, status: 'ALERT_5KM' },
      { name: 'Bhutan (Sub-Himalayan Basin)', distKm: 8.4, etaSeconds: 1028, status: 'ALERT_10KM' },
      { name: 'Bangladesh (Delta Lowland Basin)', distKm: 13.9, etaSeconds: 1702, status: 'BUFFER_ZONE' },
    ],
  };

  // Autonomous Life-Save 1-Tap Emergency Trigger Endpoint
  app.post('/api/v1/sos/autonomous-trigger', (req, res) => {
    try {
      const {
        device_id = 'urn:resq:terminal:unknown',
        latitude,
        longitude,
        accuracy_meters = 10.0,
        altitude_meters = 340,
        timestamp = Date.now(),
        network_channel = 'REST_ONLINE',
        language_locale = 'en-US',
        headcount = 1,
        critical_injuries = 0,
        blood_groups = [],
        vulnerabilities = {},
        triage_notes = 'Autonomous 1-Tap Triggered',
        acoustic_sonar = null,
        drone_optical_morse = null,
        compact_hex = null,
      } = req.body || {};

      // Input validation
      const lat = typeof latitude === 'number' ? latitude : 27.4652;
      const lng = typeof longitude === 'number' ? longitude : 83.4981;

      const ticketId = `TICKET-RESQ-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;

      const emergencyRecord = {
        ticket_id: ticketId,
        device_id,
        citizen_status: acoustic_sonar
          ? `Acoustic Debris Tap Detected (${acoustic_sonar.depthMeters}m depth, ${acoustic_sonar.confidencePercent}% confidence)`
          : 'Water Rising Fast (Immediate Survivor Beacon)',
        latitude: lat,
        longitude: lng,
        accuracy_meters,
        altitude_meters,
        battery_pct: Math.floor(15 + Math.random() * 30),
        network_path: network_channel === 'REST_ONLINE' ? 'LTE' : 'BLE_MESH',
        hop_count: network_channel === 'REST_ONLINE' ? 0 : 1,
        priority: critical_injuries > 0 ? 'P0_IMMEDIATE_LIFE_THREAT' : 'P1_CRITICAL',
        timestamp,
        network_channel,
        language_locale,
        headcount,
        critical_injuries,
        blood_groups,
        vulnerabilities: [
          'Disaster Survivor',
          ...(vulnerabilities?.mobility_impaired ? ['Mobility Impaired (Stretcher)'] : []),
          ...(vulnerabilities?.diabetic ? ['Diabetic / Insulin Urgent'] : []),
          ...(vulnerabilities?.oxygen_required ? ['Supplemental O2 Needed'] : []),
          ...(vulnerabilities?.elderly ? [`Elderly: ${vulnerabilities.elderly}`] : []),
          ...(vulnerabilities?.infants ? [`Infants: ${vulnerabilities.infants}`] : []),
        ],
        triage_notes,
        acoustic_sonar,
        drone_optical_morse,
        compact_hex,
        status: 'DISPATCHED_UAV',
        assigned_unit: 'Airborne Search & Rescue UAV Swarm Gamma-4',
        eta_minutes: +(3.5 + Math.random() * 2.0).toFixed(1),
        received_at: new Date().toISOString(),
      };

      // Non-blocking async queue
      emergencySosQueue.unshift(emergencyRecord);
      if (emergencySosQueue.length > 200) emergencySosQueue.pop();

      console.log(`[AUTONOMOUS 1-TAP SOS] Dispatched ${ticketId} for ${device_id} at (${lat}, ${lng}) via ${network_channel}`);

      res.status(200).json({
        ticket_id: ticketId,
        status: 'DISPATCHED',
        acknowledged_at: emergencyRecord.received_at,
        assigned_rescue_unit: emergencyRecord.assigned_unit,
        estimated_arrival_minutes: emergencyRecord.eta_minutes,
        safe_haven_recommendation: {
          name: 'Butwal Siwalik Foothills Sector 4 Sanctuary Gate',
          latitude: 27.605,
          longitude: 83.465,
          elevation_meters: 510,
          bearing_cardinal: 'NORTHEAST (034°)',
          distance_km: 2.4,
        },
        mesh_relay_broadcast: true,
      });
    } catch (err: any) {
      console.error('[AUTONOMOUS 1-TAP SOS] Dispatch handler error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Internal emergency dispatch error',
      });
    }
  });

  // Query recent SOS dispatch queue for First Responders
  app.get('/api/v1/sos/queue', (_req, res) => {
    res.json({
      count: emergencySosQueue.length,
      queue: emergencySosQueue,
    });
  });

  // Command Station: Interactive SOS Action Control Handler
  app.post('/api/v1/sos/action', (req, res) => {
    try {
      const { ticket_id, action, custom_unit } = req.body || {};
      const incident = emergencySosQueue.find((item) => item.ticket_id === ticket_id);

      if (!incident) {
        return res.status(404).json({ success: false, error: 'Incident ticket not found' });
      }

      const nowIso = new Date().toISOString();

      switch (action) {
        case 'DISPATCH_DRONE':
          incident.status = 'DISPATCHED_UAV';
          incident.assigned_unit = custom_unit || 'Airborne Search & Rescue UAV Swarm Gamma-4';
          incident.eta_minutes = 2.8;
          break;
        case 'ASSIGN_NDRF':
          incident.status = 'NDRF_DEPLOYED';
          incident.assigned_unit = custom_unit || 'NDRF Rapid Assault Boat Alpha-01';
          incident.eta_minutes = 6.5;
          break;
        case 'MARK_TRIAGED':
          incident.status = 'TRIAGED';
          incident.assigned_unit = incident.assigned_unit || 'Forward Triage Unit';
          break;
        case 'RESOLVE':
          incident.status = 'RESOLVED';
          incident.citizen_status = 'Safely Evacuated to High Ground Sanctuary';
          incident.resolved_at = nowIso;
          break;
        default:
          return res.status(400).json({ success: false, error: `Unsupported action: ${action}` });
      }

      incident.last_updated = nowIso;
      console.log(`[COMMAND STATION ACTION] Incident ${ticket_id} => ${action} (${incident.status})`);

      res.json({
        success: true,
        incident,
        queue: emergencySosQueue,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Command Station: Dam Breach Status Query
  app.get('/api/breach/status', (_req, res) => {
    res.json(hydroBreachState);
  });

  // Command Station: Trigger Upstream Dam Breach Simulation
  app.post('/api/breach/trigger', (_req, res) => {
    hydroBreachState = {
      ...hydroBreachState,
      waterLevelMeters: 5.48,
      rateOfRiseMetersPerHour: 2.85,
      surgeVelocityKmh: 36.2,
      barometerDeltaHpa: -22.4,
      isBreached: true,
      lastBreachTriggerTime: Date.now(),
    };
    console.log('[DAM BREACH SIMULATION] Upstream spillway breach simulated! Surge +5.48m');
    res.json({ success: true, message: 'Breach event simulated', state: hydroBreachState });
  });

  // Command Station: Flush & Reset to Baseline
  app.post('/api/breach/reset', (_req, res) => {
    hydroBreachState = {
      ...hydroBreachState,
      waterLevelMeters: 1.80,
      rateOfRiseMetersPerHour: 0.04,
      surgeVelocityKmh: 9.8,
      barometerDeltaHpa: -0.8,
      isBreached: false,
      lastBreachTriggerTime: 0,
    };
    console.log('[DAM BREACH SIMULATION] Reset to normal baseline 1.80m');
    res.json({ success: true, message: 'Reset to normal baseline', state: hydroBreachState });
  });

  // Command Station: Tactical Mass Broadcast Siren & Sector Evac Alert
  app.post('/api/v1/broadcast/evacuate', (req, res) => {
    const { radiusKm = 5, language = 'en', customMessage = '' } = req.body || {};
    const recipientEst = radiusKm === 2 ? 850 : radiusKm === 5 ? 2450 : 6800;

    console.log(`[MASS BROADCAST SIREN] Triggered ${radiusKm}km sector evacuation in ${language}. Est. nodes: ${recipientEst}`);
    res.json({
      success: true,
      broadcastId: `BC-${Date.now()}`,
      radiusKm,
      language,
      estimatedRecipients: recipientEst,
      message: customMessage || 'IMMEDIATE EVACUATION: Flash surge crest approaching. Ascend to high ground.',
      timestamp: new Date().toISOString(),
      sirenActive: true,
    });
  });

  // Voice SOS with Sound Vibration Analysis fallback endpoint
  const handleVoiceSosAnalysis = (req: express.Request, res: express.Response) => {
    try {
      // Analyze loudness / vibration level
      // HIGH if > -20 dBFS, MEDIUM if > -35, LOW otherwise
      const mockDbfs = -(18 + Math.floor(Math.random() * 20));
      let vibrationLevel = 'MEDIUM';
      if (mockDbfs > -20) {
        vibrationLevel = 'HIGH';
      } else if (mockDbfs > -35) {
        vibrationLevel = 'MEDIUM';
      } else {
        vibrationLevel = 'LOW';
      }

      // Default transcript fallback per requirements: "Distress sound detected"
      const transcript = (req.body?.transcript as string) || 'Distress sound detected';
      const lower = transcript.toLowerCase();

      let observation = 'Acoustic distress recorded with voice vibration analysis';
      let location_note = 'Survivor distress acoustic signal verified';
      const tags: string[] = [];
      let mobility_impaired = false;
      let diabetic_urgent = false;
      let oxygen_required = false;

      if (lower.includes('roof')) {
        observation = 'Victim trapped on rooftop';
        location_note = 'Trapped on rooftop / 2nd floor balcony, need stretcher';
        tags.push('Rooftop Extraction');
      }

      if (lower.includes('diabetic') || lower.includes('insulin')) {
        tags.push('Diabetic / Insulin Urgent');
        diabetic_urgent = true;
      }

      if (lower.includes('elderly') || lower.includes('stretcher')) {
        tags.push('Mobility Impaired (Stretcher)');
        mobility_impaired = true;
      }

      if (lower.includes('oxygen') || lower.includes('breathing')) {
        tags.push('Supplemental O2 Needed');
        oxygen_required = true;
      }

      const map_action = lower.includes('roof')
        ? 'DISPATCH_AIR_DROP_AND_WINCH'
        : mobility_impaired || diabetic_urgent
        ? 'DISPATCH_NDRF_AMBULANCE_AND_BOAT'
        : vibrationLevel === 'HIGH'
        ? 'DISPATCH_IMMEDIATE_EXTRACTION_TEAM'
        : 'DISPATCH_RECON_BOAT';

      res.json({
        status: 'success',
        transcript,
        observation,
        location_note,
        vibration_level: vibrationLevel,
        decibel_dbfs: mockDbfs,
        map_action,
        tags,
        mobility_impaired,
        diabetic_urgent,
        oxygen_required,
      });
    } catch (err: any) {
      res.json({
        status: 'fallback',
        transcript: 'Distress sound detected',
        observation: 'Acoustic distress burst detected via sensor',
        location_note: 'High-priority acoustic distress zone, dispatch rescue drone',
        vibration_level: 'MEDIUM',
        decibel_dbfs: -28.0,
        map_action: 'DISPATCH_RAPID_EVALUATION_DRONE',
        tags: ['Acoustic Distress'],
        mobility_impaired: false,
        diabetic_urgent: false,
        oxygen_required: false,
      });
    }
  };

  app.post('/voice-sos', handleVoiceSosAnalysis);
  app.post('/api/voice-sos', handleVoiceSosAnalysis);

  // Serve static assets from public directory (e.g. local videos, icons)
  const publicPath = path.join(process.cwd(), 'public');
  app.use(express.static(publicPath));
  app.use('/videos', express.static(path.join(publicPath, 'videos')));

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
