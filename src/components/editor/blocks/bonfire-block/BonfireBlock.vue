<template>
  <node-view-wrapper class="bonfire-block">
    <div class="bonfire-container">
      <svg 
        viewBox="0 0 800 400" 
        xmlns="http://www.w3.org/2000/svg"
        class="bonfire-svg"
      >
        <!-- Sky Background -->
        <rect x="0" y="0" width="800" height="300" fill="#1a237e" />
        <rect x="0" y="0" width="800" height="300" fill="url(#nightSky)" />
        
        <!-- Gradients and Patterns -->
        <defs>
          <radialGradient id="nightSky" cx="50%" cy="50%" r="70%" fx="50%" fy="50%">
            <stop offset="0%" stop-color="#303f9f" stop-opacity="0.8" />
            <stop offset="100%" stop-color="#1a237e" stop-opacity="1" />
          </radialGradient>
          
          <linearGradient id="mountainGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#263238" />
            <stop offset="100%" stop-color="#1a1a1a" />
          </linearGradient>
          
          <linearGradient id="mountainGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#37474f" />
            <stop offset="100%" stop-color="#263238" />
          </linearGradient>
          
          <linearGradient id="groundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#5a3921" />
            <stop offset="100%" stop-color="#3d2914" />
          </linearGradient>
        </defs>
        
        <!-- Moon with magical aura -->
        <circle cx="650" cy="80" r="30" fill="#f5f5f5" />
        <circle cx="650" cy="80" r="35" fill="none" stroke="#e0e0e0" stroke-width="1" opacity="0.5">
          <animate attributeName="r" values="35;40;35" dur="10s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0.2;0.5" dur="10s" repeatCount="indefinite" />
        </circle>
        <circle cx="635" cy="70" r="10" fill="#e0e0e0" />
        <circle cx="670" cy="90" r="8" fill="#e0e0e0" />
        <circle cx="645" cy="95" r="5" fill="#e0e0e0" />
        
        <!-- Far Background Mountains (furthest layer) -->
        <path d="M0,220 L60,180 L100,200 L160,150 L200,170 L260,140 L300,160 L360,130 L400,150 L460,120 L500,140 L560,110 L600,130 L660,100 L700,120 L760,90 L800,110 L800,300 L0,300 Z" fill="#1f2833" opacity="0.7" />
        
        <!-- Background Mountains (middle layer) -->
        <path d="M0,240 L80,200 L120,220 L180,180 L220,210 L280,170 L320,200 L380,160 L420,190 L480,150 L520,180 L580,140 L620,170 L680,130 L720,160 L780,120 L800,140 L800,300 L0,300 Z" fill="url(#mountainGradient1)" opacity="0.8" />
        
        <!-- Foreground Mountains (closest layer) -->
        <path d="M0,260 L100,230 L150,250 L200,220 L250,240 L300,210 L350,230 L400,200 L450,220 L500,190 L550,210 L600,180 L650,200 L700,170 L750,190 L800,160 L800,300 L0,300 Z" fill="url(#mountainGradient2)" opacity="0.9" />
        
        <!-- Distant Trees Silhouettes -->
        <g class="distant-trees" opacity="0.8">
          <path d="M50,260 L40,240 L50,240 L45,230 L55,230 L50,220 L60,220 L55,210 L65,210 L60,200 L70,200 L60,260 Z" fill="#1b5e20" />
          <path d="M100,260 L90,245 L100,245 L95,235 L105,235 L100,225 L110,225 L105,215 L115,215 L110,205 L120,205 L110,260 Z" fill="#1b5e20" />
          <path d="M150,260 L140,240 L150,240 L145,230 L155,230 L150,220 L160,220 L155,210 L165,210 L160,200 L170,200 L160,260 Z" fill="#1b5e20" />
          <path d="M700,260 L690,240 L700,240 L695,230 L705,230 L700,220 L710,220 L705,210 L715,210 L710,200 L720,200 L710,260 Z" fill="#1b5e20" />
          <path d="M750,260 L740,245 L750,245 L745,235 L755,235 L750,225 L760,225 L755,215 L765,215 L760,205 L770,205 L760,260 Z" fill="#1b5e20" />
        </g>
        
        <!-- Ground/Background -->
        <rect x="0" y="300" width="800" height="100" fill="url(#groundGradient)" />
        <ellipse cx="400" cy="300" rx="200" ry="20" fill="#3d2914" />
        
        <!-- Stones around the fire -->
        <ellipse cx="400" cy="300" rx="70" ry="15" fill="#4b3621" />
        <circle cx="350" cy="295" r="10" fill="#6d5843" />
        <circle cx="370" cy="298" r="8" fill="#5a4a36" />
        <circle cx="430" cy="298" r="9" fill="#5a4a36" />
        <circle cx="450" cy="295" r="11" fill="#6d5843" />
        
        <!-- Logs for the fire -->
        <polygon points="370,290 350,300 430,300 410,290" fill="#5d4037" />
        <polygon points="390,285 380,300 420,300 410,285" fill="#4e342e" />
        <polygon points="350,295 340,305 380,305 370,295" fill="#5d4037" />
        <polygon points="420,295 410,305 450,305 440,295" fill="#4e342e" />
        
        <!-- Fire base -->
        <g class="fire-base">
          <ellipse cx="400" cy="290" rx="40" ry="10" fill="#e65100" />
          <path d="M380,290 Q400,260 420,290" fill="#ff6d00" stroke="none">
            <animate 
              attributeName="d" 
              values="M380,290 Q400,260 420,290; M375,290 Q400,250 425,290; M380,290 Q400,260 420,290" 
              dur="1.5s" 
              repeatCount="indefinite" 
            />
          </path>
        </g>
        
        <!-- Animated flames -->
        <g class="flames">
          <!-- Main flame -->
          <path d="M380,290 Q400,220 420,290" fill="#ff9800" stroke="none">
            <animate 
              attributeName="d" 
              values="M380,290 Q400,220 420,290; M375,290 Q400,200 425,290; M380,290 Q400,220 420,290" 
              dur="2s" 
              repeatCount="indefinite" 
            />
          </path>
          
          <!-- Inner flame -->
          <path d="M390,290 Q400,240 410,290" fill="#ffeb3b" stroke="none">
            <animate 
              attributeName="d" 
              values="M390,290 Q400,240 410,290; M385,290 Q400,230 415,290; M390,290 Q400,240 410,290" 
              dur="1.5s" 
              repeatCount="indefinite" 
            />
          </path>
          
          <!-- Small flames -->
          <path d="M385,290 Q390,260 395,290" fill="#fff176" stroke="none">
            <animate 
              attributeName="d" 
              values="M385,290 Q390,260 395,290; M383,290 Q390,255 397,290; M385,290 Q390,260 395,290" 
              dur="1s" 
              repeatCount="indefinite" 
            />
          </path>
          
          <path d="M405,290 Q410,260 415,290" fill="#fff176" stroke="none">
            <animate 
              attributeName="d" 
              values="M405,290 Q410,260 415,290; M403,290 Q410,255 417,290; M405,290 Q410,260 415,290" 
              dur="1.2s" 
              repeatCount="indefinite" 
            />
          </path>
          
          <!-- Magic flame particles -->
          <circle cx="400" cy="260" r="3" fill="#80deea" opacity="0.7">
            <animate 
              attributeName="cy" 
              values="260;240;260" 
              dur="3s" 
              repeatCount="indefinite" 
            />
            <animate 
              attributeName="opacity" 
              values="0.7;0.3;0.7" 
              dur="3s" 
              repeatCount="indefinite" 
            />
          </circle>
        </g>
        
        <!-- Sparks -->
        <g class="sparks">
          <circle cx="400" cy="240" r="1.5" fill="#ffeb3b">
            <animate 
              attributeName="cy" 
              values="240;200" 
              dur="2s" 
              repeatCount="indefinite" 
            />
            <animate 
              attributeName="opacity" 
              values="1;0" 
              dur="2s" 
              repeatCount="indefinite" 
            />
          </circle>
          
          <circle cx="395" cy="250" r="1.5" fill="#ffeb3b">
            <animate 
              attributeName="cy" 
              values="250;210" 
              dur="1.7s" 
              repeatCount="indefinite" 
            />
            <animate 
              attributeName="opacity" 
              values="1;0" 
              dur="1.7s" 
              repeatCount="indefinite" 
            />
          </circle>
          
          <circle cx="405" cy="245" r="1.5" fill="#ffeb3b">
            <animate 
              attributeName="cy" 
              values="245;205" 
              dur="1.5s" 
              repeatCount="indefinite" 
            />
            <animate 
              attributeName="opacity" 
              values="1;0" 
              dur="1.5s" 
              repeatCount="indefinite" 
            />
          </circle>
          
          <!-- Magic sparks -->
          <circle cx="410" cy="235" r="2" fill="#b39ddb">
            <animate 
              attributeName="cy" 
              values="235;195" 
              dur="2.2s" 
              repeatCount="indefinite" 
            />
            <animate 
              attributeName="opacity" 
              values="1;0" 
              dur="2.2s" 
              repeatCount="indefinite" 
            />
          </circle>
          
          <circle cx="390" cy="230" r="2" fill="#b39ddb">
            <animate 
              attributeName="cy" 
              values="230;190" 
              dur="1.9s" 
              repeatCount="indefinite" 
            />
            <animate 
              attributeName="opacity" 
              values="1;0" 
              dur="1.9s" 
              repeatCount="indefinite" 
            />
          </circle>
        </g>
        
        <!-- Knight Character (left) - Now sitting -->
        <g class="warrior warrior-left">
          <!-- HP Status Bar -->
          <g class="hp-bar" transform="translate(300, 225)">
            <!-- HP Bar Background -->
            <rect x="-25" y="0" width="50" height="6" rx="2" ry="2" fill="#424242" />
            <!-- HP Bar Fill -->
            <rect x="-25" y="0" width="40" height="6" rx="2" ry="2" fill="#4caf50" />
            <!-- HP Text -->
            <text x="0" y="-5" text-anchor="middle" font-size="8" fill="white" font-family="monospace">Knight</text>
          </g>
          
          <!-- Sitting Position - Legs crossed -->
          <path d="M280,320 L290,340 L310,340 L320,320" fill="#455a64" /> <!-- Sitting base -->
          <path d="M290,320 L280,310 L320,310 L310,320" fill="#546e7a" /> <!-- Upper legs -->
          <path d="M290,320 L285,330 L295,335" fill="none" stroke="#455a64" stroke-width="5" stroke-linecap="round" /> <!-- Left leg -->
          <path d="M310,320 L315,330 L305,335" fill="none" stroke="#455a64" stroke-width="5" stroke-linecap="round" /> <!-- Right leg -->
          
          <!-- Boots - Repositioned -->
          <path d="M295,335 L290,345 L300,345" fill="#37474f" /> <!-- Left boot -->
          <path d="M305,335 L310,345 L300,345" fill="#37474f" /> <!-- Right boot -->
          <line x1="290" y1="340" x2="300" y2="340" stroke="#263238" stroke-width="1" /> <!-- Boot detail left -->
          <line x1="300" y1="340" x2="310" y2="340" stroke="#263238" stroke-width="1" /> <!-- Boot detail right -->
          
          <!-- Body/Armor - Adjusted for sitting -->
          <rect x="290" y="280" width="20" height="30" fill="#546e7a" /> <!-- Torso -->
          <line x1="290" y1="285" x2="310" y2="285" stroke="#78909c" stroke-width="1" /> <!-- Armor detail -->
          <line x1="290" y1="290" x2="310" y2="290" stroke="#78909c" stroke-width="1" /> <!-- Armor detail -->
          <line x1="290" y1="295" x2="310" y2="295" stroke="#78909c" stroke-width="1" /> <!-- Armor detail -->
          
          <!-- Shoulder Plates -->
          <path d="M290,280 L280,285 L285,295 L290,295" fill="#78909c" />
          <path d="M310,280 L320,285 L315,295 L310,295" fill="#78909c" />
          <path d="M290,280 L280,285" stroke="#607d8b" stroke-width="1" />
          <path d="M310,280 L320,285" stroke="#607d8b" stroke-width="1" />
          
          <!-- Head -->
          <circle cx="300" cy="265" r="12" fill="#d7ccc8" />
          
          <!-- Helmet - Adjusted position -->
          <path d="M288,258 Q300,245 312,258" fill="#78909c" stroke="#546e7a" stroke-width="1" />
          <path d="M288,258 L288,268 L312,268 L312,258" fill="#78909c" />
          <rect x="298" y="245" width="4" height="10" fill="#b0bec5" />
          <path d="M290,263 L310,263" stroke="#455a64" stroke-width="2" /> <!-- Visor -->
          <path d="M288,258 Q300,250 312,258" fill="none" stroke="#546e7a" stroke-width="1" /> <!-- Helmet ridge -->
          
          <!-- Face - Adjusted position -->
          <circle cx="296" cy="263" r="1.5" fill="#3e2723" /> <!-- Left eye -->
          <circle cx="304" cy="263" r="1.5" fill="#3e2723" /> <!-- Right eye -->
          <path d="M296,268 Q300,270 304,268" fill="none" stroke="#3e2723" stroke-width="1" /> <!-- Smile -->
          <line x1="296" y1="260" x2="298" y2="261" stroke="#3e2723" stroke-width="0.5" /> <!-- Left eyebrow -->
          <line x1="304" y1="260" x2="302" y2="261" stroke="#3e2723" stroke-width="0.5" /> <!-- Right eyebrow -->
          
          <!-- Arms - Adjusted for sitting position -->
          <path d="M285,290 L275,300" fill="none" stroke="#546e7a" stroke-width="6" stroke-linecap="round" />
          <path d="M315,290 L325,300" fill="none" stroke="#546e7a" stroke-width="6" stroke-linecap="round" />
          <circle cx="275" cy="300" r="3" fill="#607d8b" /> <!-- Elbow plate left -->
          <circle cx="325" cy="300" r="3" fill="#607d8b" /> <!-- Elbow plate right -->
          
          <!-- Hands - Adjusted position -->
          <circle cx="275" cy="300" r="4" fill="#d7ccc8" />
          <circle cx="325" cy="300" r="4" fill="#d7ccc8" />
          
          <!-- Shield - Resting on ground -->
          <path d="M270,300 L255,290 L255,320 L270,325 Z" fill="#7986cb" stroke="#3f51b5" stroke-width="2" />
          <circle cx="262" cy="305" r="5" fill="#3f51b5" />
          <path d="M262,300 L259,305 L262,310 L265,305 Z" fill="#c5cae9" /> <!-- Shield emblem -->
          
          <!-- Sword - Resting on ground -->
          <line x1="325" y1="300" x2="340" y2="340" stroke="#bdbdbd" stroke-width="2" />
          <path d="M325,300 L335,280 L340,285 L330,305" fill="#e0e0e0" />
          <line x1="330" y1="285" x2="340" y2="295" stroke="#bdbdbd" stroke-width="2" />
          <path d="M325,300 L330,305" stroke="#9e9e9e" stroke-width="1" /> <!-- Sword edge detail -->
          <path d="M335,280 L340,285" stroke="#9e9e9e" stroke-width="1" /> <!-- Sword edge detail -->
          
          <!-- Sword Hilt Details -->
          <rect x="324" y="300" width="3" height="5" fill="#8d6e63" /> <!-- Hilt -->
          <line x1="323" y1="305" x2="328" y2="305" stroke="#5d4037" stroke-width="1" /> <!-- Hilt guard -->
          
          <!-- Glowing Rune on Sword -->
          <circle cx="335" cy="290" r="2" fill="#4fc3f7">
            <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="335" cy="290" r="4" fill="none" stroke="#4fc3f7" stroke-width="1" opacity="0.5">
            <animate attributeName="r" values="4;6;4" dur="3s" repeatCount="indefinite" />
          </circle>
          
          <!-- Speech Bubble Hint -->
          <g class="speech-hint" opacity="0.7">
            <circle cx="315" cy="250" r="2" fill="white" />
            <circle cx="320" cy="245" r="1.5" fill="white" />
            <circle cx="324" cy="240" r="1" fill="white" />
          </g>
        </g>
        
        <!-- Mage Character (right) - Now sitting -->
        <g class="warrior warrior-right">
          <!-- HP Status Bar -->
          <g class="hp-bar" transform="translate(500, 210)">
            <!-- HP Bar Background -->
            <rect x="-25" y="0" width="50" height="6" rx="2" ry="2" fill="#424242" />
            <!-- HP Bar Fill -->
            <rect x="-25" y="0" width="30" height="6" rx="2" ry="2" fill="#4caf50" />
            <!-- MP Bar Background -->
            <rect x="-25" y="8" width="50" height="4" rx="2" ry="2" fill="#424242" />
            <!-- MP Bar Fill -->
            <rect x="-25" y="8" width="45" height="4" rx="2" ry="2" fill="#2196f3" />
            <!-- HP Text -->
            <text x="0" y="-5" text-anchor="middle" font-size="8" fill="white" font-family="monospace">Mage</text>
          </g>
          
          <!-- Sitting Position - Legs folded -->
          <path d="M480,320 L490,340 L510,340 L520,320" fill="#4a148c" /> <!-- Sitting base -->
          <path d="M490,320 L480,310 L520,310 L510,320" fill="#6a1b9a" /> <!-- Upper legs -->
          <path d="M490,320 L485,330 L495,335" fill="none" stroke="#4a148c" stroke-width="5" stroke-linecap="round" /> <!-- Left leg -->
          <path d="M510,320 L515,330 L505,335" fill="none" stroke="#4a148c" stroke-width="5" stroke-linecap="round" /> <!-- Right leg -->
          
          <!-- Robe Details - Adjusted for sitting -->
          <path d="M485,320 L480,340" stroke="#7b1fa2" stroke-width="1" />
          <path d="M515,320 L520,340" stroke="#7b1fa2" stroke-width="1" />
          <path d="M480,340 L520,340" stroke="#7b1fa2" stroke-width="1" />
          
          <!-- Robe Patterns - Arcane symbols -->
          <circle cx="500" cy="320" r="5" fill="none" stroke="#9c27b0" stroke-width="1" />
          <path d="M495,320 L505,320 M500,315 L500,325" stroke="#9c27b0" stroke-width="1" />
          
          <!-- Body under robe - Adjusted for sitting -->
          <ellipse cx="500" cy="290" rx="15" ry="20" fill="#6a1b9a" />
          
          <!-- Head - Adjusted position -->
          <circle cx="500" cy="265" r="12" fill="#d1c4e9" />
          
          <!-- Wizard Hat - Adjusted position -->
          <path d="M485,265 L500,230 L515,265" fill="#4a148c" />
          <ellipse cx="500" cy="265" rx="18" ry="5" fill="#6a1b9a" />
          <path d="M485,265 L500,230" stroke="#7b1fa2" stroke-width="1" />
          <path d="M515,265 L500,230" stroke="#7b1fa2" stroke-width="1" />
          
          <!-- Hat Decoration -->
          <circle cx="500" cy="245" r="3" fill="#ce93d8">
            <animate attributeName="opacity" values="0.7;1;0.7" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="500" cy="245" r="5" fill="none" stroke="#ce93d8" stroke-width="1" opacity="0.5">
            <animate attributeName="r" values="5;7;5" dur="4s" repeatCount="indefinite" />
          </circle>
          <path d="M497,245 L503,245" stroke="#ce93d8" stroke-width="1" />
          <path d="M500,242 L500,248" stroke="#ce93d8" stroke-width="1" />
          
          <!-- Face - Adjusted position -->
          <circle cx="496" cy="263" r="1.5" fill="#3e2723" /> <!-- Left eye -->
          <circle cx="504" cy="263" r="1.5" fill="#3e2723" /> <!-- Right eye -->
          <path d="M496,270 Q500,272 504,270" fill="none" stroke="#3e2723" stroke-width="1" /> <!-- Smile -->
          <line x1="495" y1="260" x2="497" y2="261" stroke="#3e2723" stroke-width="0.5" /> <!-- Left eyebrow -->
          <line x1="505" y1="260" x2="503" y2="261" stroke="#3e2723" stroke-width="0.5" /> <!-- Right eyebrow -->
          
          <!-- Beard - Adjusted position -->
          <path d="M495,272 Q500,285 505,272" fill="#bdbdbd" />
          <path d="M496,272 Q500,280 504,272" fill="#e0e0e0" /> <!-- Beard highlight -->
          <path d="M498,272 L498,275" stroke="#bdbdbd" stroke-width="0.5" /> <!-- Beard detail -->
          <path d="M502,272 L502,275" stroke="#bdbdbd" stroke-width="0.5" /> <!-- Beard detail -->
          
          <!-- Arms - Adjusted for sitting position -->
          <path d="M485,290 L475,300" fill="none" stroke="#6a1b9a" stroke-width="4" stroke-linecap="round" />
          <path d="M515,290 L525,300" fill="none" stroke="#6a1b9a" stroke-width="4" stroke-linecap="round" />
          
          <!-- Sleeve Details -->
          <path d="M485,290 L475,300" stroke="#4a148c" stroke-width="1" />
          <path d="M515,290 L525,300" stroke="#4a148c" stroke-width="1" />
          
          <!-- Hands - More detailed -->
          <circle cx="475" cy="300" r="4" fill="#d1c4e9" />
          <circle cx="525" cy="300" r="4" fill="#d1c4e9" />
          <circle cx="475" cy="300" r="6" fill="none" stroke="#b39ddb" stroke-width="1" opacity="0.5">
            <animate attributeName="r" values="6;8;6" dur="3s" repeatCount="indefinite" />
          </circle>
          
          <!-- Magic Staff - Resting on ground -->
          <line x1="475" y1="300" x2="465" y2="240" stroke="#8d6e63" stroke-width="3" />
          <path d="M475,300 L465,240" stroke="#6d4c41" stroke-width="1" /> <!-- Staff detail -->
          <circle cx="470" cy="270" r="2" fill="#6d4c41" /> <!-- Staff knot -->
          <circle cx="468" cy="255" r="2" fill="#6d4c41" /> <!-- Staff knot -->
          
          <!-- Staff Crystal -->
          <polygon points="465,240 460,230 470,230" fill="#7e57c2" />
          <circle cx="465" cy="230" r="6" fill="#b39ddb">
            <animate attributeName="r" values="6;8;6" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite" />
          </circle>
          <path d="M462,230 L468,230" stroke="#673ab7" stroke-width="1" />
          <path d="M465,227 L465,233" stroke="#673ab7" stroke-width="1" />
          
          <!-- Magic Aura around Staff -->
          <circle cx="465" cy="230" r="10" fill="none" stroke="#7e57c2" stroke-width="1" opacity="0.5">
            <animate attributeName="r" values="10;15;10" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0.2;0.5" dur="4s" repeatCount="indefinite" />
          </circle>
          <circle cx="465" cy="230" r="12" fill="none" stroke="#9575cd" stroke-width="0.5" opacity="0.3">
            <animate attributeName="r" values="12;18;12" dur="5s" repeatCount="indefinite" />
          </circle>
          
          <!-- Magic Spell Effect - Small flame in hand -->
          <circle cx="525" cy="300" r="5" fill="#7e57c2" opacity="0.3">
            <animate attributeName="r" values="5;8;5" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
          </circle>
          <path d="M525,300 Q528,295 525,290 Q522,295 525,300" fill="#b39ddb" opacity="0.7">
            <animate attributeName="d" values="M525,300 Q528,295 525,290 Q522,295 525,300; M525,300 Q522,295 525,290 Q528,295 525,300; M525,300 Q528,295 525,290 Q522,295 525,300" dur="2s" repeatCount="indefinite" />
          </path>
          
          <!-- Speech Bubble Hint -->
          <g class="speech-hint" opacity="0.7">
            <circle cx="485" cy="250" r="2" fill="white" />
            <circle cx="480" cy="245" r="1.5" fill="white" />
            <circle cx="476" cy="240" r="1" fill="white" />
          </g>
        </g>
        
        <!-- Elf Ranger Character (center) - Already sitting -->
        <g class="warrior warrior-center">
          <!-- HP Status Bar -->
          <g class="hp-bar" transform="translate(400, 225)">
            <!-- HP Bar Background -->
            <rect x="-25" y="0" width="50" height="6" rx="2" ry="2" fill="#424242" />
            <!-- HP Bar Fill -->
            <rect x="-25" y="0" width="35" height="6" rx="2" ry="2" fill="#4caf50" />
            <!-- HP Text -->
            <text x="0" y="-5" text-anchor="middle" font-size="8" fill="white" font-family="monospace">Ranger</text>
          </g>
          
          <!-- Sitting Legs - Already in good position -->
          <path d="M380,320 L370,340 L390,340 Z" fill="#2e7d32" />
          <path d="M420,320 L430,340 L410,340 Z" fill="#2e7d32" />
          <path d="M380,320 L370,340" stroke="#1b5e20" stroke-width="1" /> <!-- Leg detail -->
          <path d="M380,320 L390,340" stroke="#1b5e20" stroke-width="1" /> <!-- Leg detail -->
          <path d="M420,320 L430,340" stroke="#1b5e20" stroke-width="1" /> <!-- Leg detail -->
          <path d="M420,320 L410,340" stroke="#1b5e20" stroke-width="1" /> <!-- Leg detail -->
          
          <!-- Boots -->
          <path d="M370,340 L375,345 L385,345 L390,340" fill="#1b5e20" />
          <path d="M410,340 L415,345 L425,345 L430,340" fill="#1b5e20" />
          
          <!-- Body - Enhanced with better proportions and details -->
          <ellipse cx="400" cy="305" rx="15" ry="20" fill="#388e3c" />
          <path d="M390,290 L385,320" stroke="#2e7d32" stroke-width="1" /> <!-- Tunic detail -->
          <path d="M410,290 L415,320" stroke="#2e7d32" stroke-width="1" /> <!-- Tunic detail -->
          <path d="M395,305 L405,305" stroke="#2e7d32" stroke-width="1" /> <!-- Belt -->
          <circle cx="400" cy="305" r="2" fill="#1b5e20" /> <!-- Belt buckle -->
          
          <!-- Ranger Cape -->
          <path d="M385,290 L375,320 L385,320" fill="#33691e" />
          <path d="M415,290 L425,320 L415,320" fill="#33691e" />
          
          <!-- Head - Improved elven features -->
          <circle cx="400" cy="275" r="12" fill="#c5e1a5" />
          
          <!-- Elf Ears - More pronounced and detailed -->
          <path d="M388,275 L380,265 L390,280" fill="#c5e1a5" />
          <path d="M412,275 L420,265 L410,280" fill="#c5e1a5" />
          <path d="M388,275 L380,265" stroke="#8bc34a" stroke-width="0.5" /> <!-- Ear detail -->
          <path d="M412,275 L420,265" stroke="#8bc34a" stroke-width="0.5" /> <!-- Ear detail -->
          
          <!-- Face - More detailed with better expression -->
          <circle cx="396" cy="275" r="1.5" fill="#3e2723" /> <!-- Left eye -->
          <circle cx="404" cy="275" r="1.5" fill="#3e2723" /> <!-- Right eye -->
          <path d="M396,280 Q400,282 404,280" fill="none" stroke="#3e2723" stroke-width="0.8" /> <!-- Smile -->
          <line x1="395" y1="272" x2="397" y2="273" stroke="#3e2723" stroke-width="0.5" /> <!-- Left eyebrow -->
          <line x1="405" y1="272" x2="403" y2="273" stroke="#3e2723" stroke-width="0.5" /> <!-- Right eyebrow -->
          <circle cx="400" cy="277" r="0.5" fill="#3e2723" /> <!-- Nose -->
          
          <!-- Hair - More flowing and detailed -->
          <path d="M388,265 Q400,255 412,265" fill="#8bc34a" />
          <path d="M390,275 L385,290 L395,285" fill="#8bc34a" />
          <path d="M410,275 L415,290 L405,285" fill="#8bc34a" />
          <path d="M388,265 Q400,255 412,265" stroke="#7cb342" stroke-width="0.5" /> <!-- Hair detail -->
          <path d="M390,270 L388,280" stroke="#7cb342" stroke-width="0.5" /> <!-- Hair strand -->
          <path d="M410,270 L412,280" stroke="#7cb342" stroke-width="0.5" /> <!-- Hair strand -->
          <path d="M395,260 L393,270" stroke="#7cb342" stroke-width="0.5" /> <!-- Hair strand -->
          <path d="M405,260 L407,270" stroke="#7cb342" stroke-width="0.5" /> <!-- Hair strand -->
          
          <!-- Leaf Crown -->
          <path d="M390,265 Q400,260 410,265" fill="none" stroke="#7cb342" stroke-width="1" />
          <path d="M395,262 L400,260 L405,262" fill="none" stroke="#7cb342" stroke-width="1" />
          <circle cx="400" cy="260" r="2" fill="#aed581" /> <!-- Center gem -->
          
          <!-- Arms - Enhanced with better proportions -->
          <path d="M385,300 L375,310" fill="none" stroke="#388e3c" stroke-width="4" stroke-linecap="round" />
          <path d="M415,300 L425,310" fill="none" stroke="#388e3c" stroke-width="4" stroke-linecap="round" />
          <path d="M385,300 L375,310" stroke="#2e7d32" stroke-width="1" /> <!-- Arm detail -->
          <path d="M415,300 L425,310" stroke="#2e7d32" stroke-width="1" /> <!-- Arm detail -->
          
          <!-- Hands - More detailed -->
          <circle cx="375" cy="310" r="3" fill="#c5e1a5" />
          <circle cx="425" cy="310" r="3" fill="#c5e1a5" />
          
          <!-- Bow - Now resting on ground -->
          <path d="M375,310 Q370,295 375,280" fill="none" stroke="#8d6e63" stroke-width="2" />
          <path d="M375,310 Q370,325 375,340" fill="none" stroke="#8d6e63" stroke-width="2" />
          <line x1="375" y1="310" x2="425" y2="310" stroke="#8d6e63" stroke-width="1" />
          <path d="M375,280 Q400,295 375,310" fill="none" stroke="#a1887f" stroke-width="0.5" /> <!-- Bow string -->
          <path d="M375,310 Q400,325 375,340" fill="none" stroke="#a1887f" stroke-width="0.5" /> <!-- Bow string -->
          
          <!-- Arrow - Now in hand, gesturing while talking -->
          <line x1="425" y1="310" x2="435" y2="300" stroke="#a1887f" stroke-width="1" />
          <path d="M435,300 L430,298 L430,302 L435,300" fill="#a1887f" /> <!-- Arrow head -->
          <path d="M425,310 L428,308 L428,312" fill="#8d6e63" /> <!-- Arrow fletching -->
          
          <!-- Speech Bubble Hint -->
          <g class="speech-hint" opacity="0.7">
            <circle cx="410" cy="260" r="2" fill="white" />
            <circle cx="415" cy="255" r="1.5" fill="white" />
            <circle cx="420" cy="250" r="1" fill="white" />
          </g>
        </g>
        
        <!-- Speech Bubbles -->
        <g class="speech-bubbles" opacity="0.9">
          <!-- Knight's Speech -->
          <g class="knight-speech" opacity="0">
            <path d="M320,240 Q340,230 360,240 L360,210 Q380,200 360,190 Q340,180 320,190 L320,240 Z" fill="white" opacity="0.8" />
            <text x="340" y="200" text-anchor="middle" font-size="6" fill="#333">That dragon was huge!</text>
            <text x="340" y="210" text-anchor="middle" font-size="6" fill="#333">I thought we were done for.</text>
            <animate attributeName="opacity" values="0;1;0" dur="10s" begin="1s" repeatCount="indefinite" />
          </g>
          
          <!-- Mage's Speech -->
          <g class="mage-speech" opacity="0">
            <path d="M480,240 Q460,230 440,240 L440,210 Q420,200 440,190 Q460,180 480,190 L480,240 Z" fill="white" opacity="0.8" />
            <text x="460" y="200" text-anchor="middle" font-size="6" fill="#333">My spells barely scratched it.</text>
            <text x="460" y="210" text-anchor="middle" font-size="6" fill="#333">We need better equipment.</text>
            <animate attributeName="opacity" values="0;0;1;0" dur="10s" begin="4s" repeatCount="indefinite" />
          </g>
          
          <!-- Ranger's Speech -->
          <g class="ranger-speech" opacity="0">
            <path d="M420,250 Q400,240 380,250 L380,220 Q360,210 380,200 Q400,190 420,200 L420,250 Z" fill="white" opacity="0.8" />
            <text x="400" y="210" text-anchor="middle" font-size="6" fill="#333">I know where we can find</text>
            <text x="400" y="220" text-anchor="middle" font-size="6" fill="#333">legendary weapons. Follow me!</text>
            <animate attributeName="opacity" values="0;0;0;1;0" dur="10s" begin="7s" repeatCount="indefinite" />
          </g>
        </g>
      </svg>
      
      <div class="bonfire-message">
        <p>Rest a while, traveler...</p>
        <p class="bonfire-quote">"The fire reveals the truth in our hearts."</p>
        <p class="bonfire-status">Party resting... HP and MP restored.</p>
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
</script>

<style scoped>
.bonfire-block {
  @apply relative w-full border rounded-lg p-4 bg-gray-900 my-6;
}

.bonfire-container {
  @apply flex flex-col items-center;
}

.bonfire-svg {
  @apply w-full max-w-3xl h-auto;
}

.bonfire-message {
  @apply mt-4 text-center text-amber-100;
}

.bonfire-message p {
  @apply text-lg mb-2;
}

.bonfire-quote {
  @apply text-sm italic text-amber-200 opacity-80;
}

.bonfire-status {
  @apply text-xs text-emerald-300 mt-2 font-mono;
}

/* Animation for the warriors to slightly sway */
.warrior-left {
  animation: sway-left 4s ease-in-out infinite;
  transform-origin: bottom center;
}

.warrior-right {
  animation: sway-right 5s ease-in-out infinite;
  transform-origin: bottom center;
}

.warrior-center {
  animation: sway-center 6s ease-in-out infinite;
  transform-origin: bottom center;
}

.fairy {
  animation: float 6s ease-in-out infinite;
}

/* Pet animations */
.pet-dragon {
  animation: pet-bounce 3s ease-in-out infinite;
  transform-origin: bottom center;
}

.pet-owl {
  animation: pet-float 4s ease-in-out infinite;
  transform-origin: bottom center;
}

.pet-fox {
  animation: pet-sway 3.5s ease-in-out infinite;
  transform-origin: bottom center;
}

@keyframes sway-left {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(-2deg); }
}

@keyframes sway-right {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(2deg); }
}

@keyframes sway-center {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(1deg); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes pet-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

@keyframes pet-float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-8px) rotate(3deg); }
}

@keyframes pet-sway {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(3deg); }
}

/* Glow effect for the fire */
.flames {
  filter: drop-shadow(0 0 8px rgba(255, 152, 0, 0.7));
}

/* Glow effect for magical elements */
.fairy, .warrior-right circle[fill="#b39ddb"] {
  filter: drop-shadow(0 0 5px rgba(179, 157, 219, 0.7));
}

/* Distant elements */
.distant-trees path {
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
}

.distant-castle {
  filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.5));
}

/* HP Bar animations */
.hp-bar rect[fill="#4caf50"] {
  animation: pulse-hp 3s ease-in-out infinite;
}

.hp-bar rect[fill="#2196f3"] {
  animation: pulse-mp 4s ease-in-out infinite;
}

@keyframes pulse-hp {
  0%, 100% { opacity: 0.9; }
  50% { opacity: 1; }
}

@keyframes pulse-mp {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}
</style> 