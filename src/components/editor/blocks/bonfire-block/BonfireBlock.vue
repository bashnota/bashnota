<template>
  <node-view-wrapper class="bonfire-block">
    <div class="bonfire-container">
      <svg 
        viewBox="0 0 800 400" 
        xmlns="http://www.w3.org/2000/svg"
        class="bonfire-svg"
      >
        <!-- Ground/Background -->
        <rect x="0" y="300" width="800" height="100" fill="#5a3921" />
        <ellipse cx="400" cy="300" rx="200" ry="20" fill="#3d2914" />
        
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
        </g>
        
        <!-- Sparks -->
        <g class="sparks">
          <circle cx="400" cy="240" r="1" fill="#ffeb3b">
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
          
          <circle cx="395" cy="250" r="1" fill="#ffeb3b">
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
          
          <circle cx="405" cy="245" r="1" fill="#ffeb3b">
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
        </g>
        
        <!-- Warrior 1 (left) -->
        <g class="warrior warrior-left">
          <!-- Body -->
          <ellipse cx="300" cy="290" rx="15" ry="25" fill="#5d4037" />
          
          <!-- Head -->
          <circle cx="300" cy="255" r="12" fill="#8d6e63" />
          
          <!-- Helmet -->
          <path d="M290,248 Q300,240 310,248" fill="#78909c" stroke="#546e7a" stroke-width="1" />
          <rect x="298" y="240" width="4" height="8" fill="#b0bec5" />
          
          <!-- Face -->
          <circle cx="296" cy="253" r="1" fill="#3e2723" /> <!-- Left eye -->
          <circle cx="304" cy="253" r="1" fill="#3e2723" /> <!-- Right eye -->
          <path d="M296,260 Q300,262 304,260" fill="none" stroke="#3e2723" stroke-width="1" /> <!-- Smile -->
          
          <!-- Arms -->
          <path d="M285,280 L270,290" fill="none" stroke="#8d6e63" stroke-width="4" stroke-linecap="round" />
          <path d="M315,280 L330,290" fill="none" stroke="#8d6e63" stroke-width="4" stroke-linecap="round" />
          
          <!-- Legs -->
          <path d="M295,315 L290,330" fill="none" stroke="#5d4037" stroke-width="5" stroke-linecap="round" />
          <path d="M305,315 L310,330" fill="none" stroke="#5d4037" stroke-width="5" stroke-linecap="round" />
          
          <!-- Shield -->
          <path d="M270,290 L260,290 L260,310 L270,310 Z" fill="#78909c" stroke="#546e7a" />
          
          <!-- Sword (resting on ground) -->
          <line x1="330" y1="290" x2="340" y2="330" stroke="#78909c" stroke-width="2" />
          <line x1="335" y1="295" x2="345" y2="295" stroke="#78909c" stroke-width="2" />
        </g>
        
        <!-- Warrior 2 (right) -->
        <g class="warrior warrior-right">
          <!-- Body -->
          <ellipse cx="500" cy="290" rx="15" ry="25" fill="#3e2723" />
          
          <!-- Head -->
          <circle cx="500" cy="255" r="12" fill="#6d4c41" />
          
          <!-- Hood/Cloak -->
          <path d="M488,255 Q500,240 512,255 L515,280 L485,280 Z" fill="#5d4037" />
          
          <!-- Face -->
          <circle cx="496" cy="253" r="1" fill="#3e2723" /> <!-- Left eye -->
          <circle cx="504" cy="253" r="1" fill="#3e2723" /> <!-- Right eye -->
          <path d="M496,258 Q500,256 504,258" fill="none" stroke="#3e2723" stroke-width="1" /> <!-- Frown -->
          
          <!-- Arms -->
          <path d="M485,280 L470,290" fill="none" stroke="#6d4c41" stroke-width="4" stroke-linecap="round" />
          <path d="M515,280 L530,290" fill="none" stroke="#6d4c41" stroke-width="4" stroke-linecap="round" />
          
          <!-- Legs -->
          <path d="M495,315 L490,330" fill="none" stroke="#3e2723" stroke-width="5" stroke-linecap="round" />
          <path d="M505,315 L510,330" fill="none" stroke="#3e2723" stroke-width="5" stroke-linecap="round" />
          
          <!-- Staff -->
          <line x1="470" y1="290" x2="460" y2="240" stroke="#8d6e63" stroke-width="3" />
          <circle cx="460" cy="235" r="5" fill="#ff5722" />
        </g>
        
        <!-- Smoke -->
        <g class="smoke">
          <path d="M400,220 Q410,210 400,200 Q390,190 400,180 Q410,170 400,160" fill="none" stroke="#9e9e9e" stroke-width="2" opacity="0.3">
            <animate 
              attributeName="d" 
              values="M400,220 Q410,210 400,200 Q390,190 400,180 Q410,170 400,160; 
                     M400,220 Q390,210 400,200 Q410,190 400,180 Q390,170 400,160; 
                     M400,220 Q410,210 400,200 Q390,190 400,180 Q410,170 400,160" 
              dur="8s" 
              repeatCount="indefinite" 
            />
            <animate 
              attributeName="opacity" 
              values="0.3;0.1;0.3" 
              dur="8s" 
              repeatCount="indefinite" 
            />
          </path>
          
          <path d="M390,220 Q380,200 390,180 Q400,160 390,140" fill="none" stroke="#9e9e9e" stroke-width="2" opacity="0.2">
            <animate 
              attributeName="d" 
              values="M390,220 Q380,200 390,180 Q400,160 390,140; 
                     M390,220 Q400,200 390,180 Q380,160 390,140; 
                     M390,220 Q380,200 390,180 Q400,160 390,140" 
              dur="10s" 
              repeatCount="indefinite" 
            />
            <animate 
              attributeName="opacity" 
              values="0.2;0.05;0.2" 
              dur="10s" 
              repeatCount="indefinite" 
            />
          </path>
          
          <path d="M410,220 Q420,200 410,180 Q400,160 410,140" fill="none" stroke="#9e9e9e" stroke-width="2" opacity="0.2">
            <animate 
              attributeName="d" 
              values="M410,220 Q420,200 410,180 Q400,160 410,140; 
                     M410,220 Q400,200 410,180 Q420,160 410,140; 
                     M410,220 Q420,200 410,180 Q400,160 410,140" 
              dur="9s" 
              repeatCount="indefinite" 
            />
            <animate 
              attributeName="opacity" 
              values="0.2;0.05;0.2" 
              dur="9s" 
              repeatCount="indefinite" 
            />
          </path>
        </g>
        
        <!-- Stars in the sky -->
        <g class="stars">
          <circle cx="100" cy="100" r="1" fill="white">
            <animate attributeName="opacity" values="0.2;0.8;0.2" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="200" cy="50" r="1" fill="white">
            <animate attributeName="opacity" values="0.2;0.8;0.2" dur="4s" repeatCount="indefinite" />
          </circle>
          <circle cx="300" cy="80" r="1" fill="white">
            <animate attributeName="opacity" values="0.2;0.8;0.2" dur="3.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="500" cy="60" r="1" fill="white">
            <animate attributeName="opacity" values="0.2;0.8;0.2" dur="4.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="600" cy="120" r="1" fill="white">
            <animate attributeName="opacity" values="0.2;0.8;0.2" dur="3.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="700" cy="70" r="1" fill="white">
            <animate attributeName="opacity" values="0.2;0.8;0.2" dur="4.2s" repeatCount="indefinite" />
          </circle>
        </g>
        
        <!-- Moon -->
        <circle cx="650" cy="80" r="30" fill="#f5f5f5" />
        <circle cx="635" cy="70" r="10" fill="#e0e0e0" />
        <circle cx="670" cy="90" r="8" fill="#e0e0e0" />
        <circle cx="645" cy="95" r="5" fill="#e0e0e0" />
      </svg>
      
      <div class="bonfire-message">
        <p>Rest a while, traveler...</p>
        <p class="bonfire-quote">"The fire reveals the truth in our hearts."</p>
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

/* Animation for the warriors to slightly sway */
.warrior-left {
  animation: sway-left 4s ease-in-out infinite;
}

.warrior-right {
  animation: sway-right 5s ease-in-out infinite;
}

@keyframes sway-left {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(-2deg); }
}

@keyframes sway-right {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(2deg); }
}

/* Glow effect for the fire */
.flames {
  filter: drop-shadow(0 0 5px rgba(255, 152, 0, 0.7));
}
</style> 