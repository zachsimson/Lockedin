# 🔒 LockedIn - Complete Implementation Specification

## App Identity
**Name:** LockedIn  
**Tagline:** Lock out gambling. Lock in discipline.  
**Category:** Health & Wellness (Recovery Tools)  
**Feel:** Premium sportsbook replacement, NOT therapy app

---

## 🎨 Design System - PrizePicks Exact Match

### Color Palette
```
Background: #0E1117
Card Surface: #161A23
Divider: #222634
Primary Accent: #00F5A0 (green-teal glow)
Secondary: #00C2FF (cyan)
Danger: #FF4D4F
Text Primary: #FFFFFF
Text Secondary: #A1A7B3
```

### Typography
- **Font:** Inter (fallback: System)
- **Headers:** 700-800 weight, ALL CAPS
- **Body:** 400-500 weight
- **Timers:** SF Mono / monospace
- **Letter spacing:** Tight for headers, normal for body

### UI Principles
- Sharp corners (2-4px radius max)
- Heavy contrast (dark bg + bright accents)
- Subtle glow on active elements (box-shadow with #00F5A0)
- Haptic feedback on ALL interactions
- No gradients (flat colors only)

---

## 📱 Screen-by-Screen Wireframes

### WELCOME SCREEN (Pre-Auth)
```
┌─────────────────────────────┐
│                             │
│      [Shield Icon]          │
│                             │
│       LOCKEDIN              │ (ALL CAPS, 48px)
│  Lock out gambling.         │ (16px)
│  Lock in discipline.        │
│                             │
│  ┌─────────────────────┐   │
│  │ 15K+ MEMBERS        │   │ (Card, #161A23)
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │ $5M+ SAVED          │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │ CREATE ACCOUNT      │   │ (#00F5A0 bg)
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │ LOG IN              │   │ (border #00F5A0)
│  └─────────────────────┘   │
│                             │
└─────────────────────────────┘
```

### CREATE ACCOUNT
```
┌─────────────────────────────┐
│  [←]  CREATE ACCOUNT        │
│                             │
│  EMAIL                      │
│  ┌─────────────────────┐   │
│  │ [input]             │   │
│  └─────────────────────┘   │
│                             │
│  PASSWORD                   │
│  ┌─────────────────────┐   │
│  │ [input]             │   │
│  └─────────────────────┘   │
│                             │
│  CONFIRM PASSWORD           │
│  ┌─────────────────────┐   │
│  │ [input]             │   │
│  └─────────────────────┘   │
│                             │
│  [✓] I understand LockedIn  │
│      blocks gambling access │
│                             │
│  ┌─────────────────────┐   │
│  │ CREATE ACCOUNT      │   │ (green)
│  └─────────────────────┘   │
│                             │
│  Already have account?      │
│  [Log In]                   │
└─────────────────────────────┘
```

### TAB 1 - HOME
```
┌─────────────────────────────┐
│  LOCKEDIN                   │ (header)
│  STATUS: ACTIVE             │ (green dot)
│                             │
│  ┌─────────────────────┐   │
│  │ YOU ARE LOCKED IN   │   │ (ALL CAPS)
│  │                     │   │
│  │      7 DAYS         │   │ (72px, pulsing)
│  │      CLEAN          │   │
│  └─────────────────────┘   │
│                             │
│  ┌───────────┬───────────┐ │
│  │ ✓ CHECK  │ ✗ I      │ │
│  │   IN     │   SLIPPED│ │
│  │   CLEAN  │          │ │
│  └───────────┴───────────┘ │
│                             │
│  COMMUNITY ACTIVITY         │
│  ┌─────────────────────┐   │
│  │ 🔥 Tiger — 14 days  │   │
│  │ 💪 Falcon — reset   │   │
│  │ ⭐ Wolf — 30 days   │   │
│  └─────────────────────┘   │
│                             │
│ [Home][Timer][Feed][Lock][Discord]│ (tabs)
└─────────────────────────────┘
```

### TAB 2 - TIMER
```
┌─────────────────────────────┐
│  ABSTINENCE TIMER           │
│                             │
│  ┌─────────────────────┐   │
│  │                     │   │
│  │  09 : 13 : 22 : 41 │   │ (monospace, 32px)
│  │  DAYS HR  MIN SEC   │   │ (8px)
│  │                     │   │
│  └─────────────────────┘   │
│                             │
│  STATS                      │
│  ┌──────────┬──────────┐   │
│  │ LONGEST  │ SAVED    │   │
│  │ 14 DAYS  │ $1,234   │   │
│  └──────────┴──────────┘   │
│  ┌──────────┬──────────┐   │
│  │ RESETS   │ WEEKS    │   │
│  │ 3        │ 2        │   │
│  └──────────┴──────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │ LONG PRESS TO RESET │   │ (danger)
│  └─────────────────────┘   │
│                             │
│ [Home][Timer][Feed][Lock][Discord]│
└─────────────────────────────┘
```

### TAB 3 - COMMUNITY
```
┌─────────────────────────────┐
│  RECOVERY SQUAD             │
│  ┌─────────────────────┐   │
│  │ 🚨 I NEED SUPPORT   │   │ (red, glowing)
│  └─────────────────────┘   │
│                             │
│  FEED                       │
│  ┌─────────────────────┐   │
│  │ AnonymousTiger      │   │
│  │ 14 days clean 🔥    │   │
│  │ 2h ago              │   │
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │ AnonymousFalcon     │   │
│  │ I slipped but I'm   │   │
│  │ back. Let's go.     │   │
│  │ 5h ago              │   │
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │ [Type message...]   │   │
│  └─────────────────────┘   │
│                             │
│ [Home][Timer][Feed][Lock][Discord]│
└─────────────────────────────┘
```

### TAB 4 - LOCK (MOST CRITICAL)
```
┌─────────────────────────────┐
│  RECOVERY MODE              │
│                             │
│  ┌─────────────────────┐   │
│  │                     │   │
│  │ [════════════>   ]  │   │ (slide to activate)
│  │ SLIDE TO ACTIVATE   │   │
│  │                     │   │
│  └─────────────────────┘   │
│                             │
│  WHEN ACTIVE:               │
│  • DraftKings blocked       │
│  • FanDuel blocked          │
│  • PrizePicks blocked       │
│  • 200+ sites blocked       │
│                             │
│  LOCK DURATION              │
│  ┌───────┬───────┬───────┐ │
│  │ 24H   │ 72H   │ 7D    │ │
│  └───────┴───────┴───────┘ │
│                             │
│  ┌─────────────────────┐   │
│  │ 🚨 CRISIS SUPPORT   │   │ (clickable)
│  │ 1-800-522-4700      │   │
│  └─────────────────────┘   │
│                             │
│ [Home][Timer][Feed][Lock][Discord]│
└─────────────────────────────┘
```

### TAB 5 - DISCORD
```
┌─────────────────────────────┐
│                             │
│      [Discord Logo]         │ (large, centered)
│                             │
│  LIVE COMMUNITY             │ (ALL CAPS)
│                             │
│  Real-time voice rooms      │
│  Emergency support          │
│  Recovery groups            │
│  Anonymous support          │
│                             │
│  ┌─────────────────────┐   │
│  │ JOIN DISCORD        │   │ (large green button)
│  └─────────────────────┘   │
│                             │
│  COMMUNITY RULES            │
│  • Be respectful           │
│  • No gambling content     │
│  • Support focused         │
│                             │
│ [Home][Timer][Feed][Lock][Discord]│
└─────────────────────────────┘
```

---

## 🏗️ MVP vs Full Build Separation

### MVP (Launch in 2 weeks)
**MUST HAVE:**
- [ ] Auth (email/password, persistent session)
- [ ] 5-tab navigation
- [ ] Home tab (check-ins, basic activity feed)
- [ ] Timer tab (live updating, reset)
- [ ] Lock tab (toggle, visual blocking status)
- [ ] Discord tab (external link)
- [ ] Community tab (basic chat)
- [ ] PrizePicks color scheme
- [ ] 200+ sites blocked list

**ACCEPTABLE LIMITATIONS:**
- Blocking is educational (DNS setup guide) - NOT device-level VPN yet
- Community feed is simulated (not live user activity)
- No timed lockouts (just on/off toggle)

### Full Build (Post-Launch)
**PREMIUM FEATURES:**
- [ ] Actual device-level VPN blocking (NEVPNManager iOS, VPN Service Android)
- [ ] Timed lockouts (24h, 72h, 7d)
- [ ] Real-time community feed with live users
- [ ] "I NEED SUPPORT" emergency alerts
- [ ] Anonymous username generation
- [ ] Haptic feedback engine
- [ ] Long-press gestures (3s reset)
- [ ] App traffic analysis
- [ ] Premium subscription ($9.99/mo)
- [ ] Advanced analytics

---

## 🍎 App Store Submission Strategy

### Category
**Primary:** Health & Fitness  
**Secondary:** Lifestyle

### Keywords
"recovery tools, wellness protection, discipline, habit breaking, self-control, mindfulness, focus"

**AVOID:** "gambling", "casino", "betting" in app name/subtitle

### App Name
**Option 1:** LockedIn - Recovery Tools  
**Option 2:** LockedIn - Discipline Builder  
**Option 3:** LockedIn - Wellness Blocker

### Description (App Store Safe)
```
LockedIn is a wellness and discipline tool designed to help users 
build healthy habits and avoid distractions.

FEATURES:
• Abstinence tracking with live timer
• Community support and accountability
• Website blocking for focus and discipline
• Daily check-ins and progress tracking
• Emergency crisis support hotline

USER-CONTROLLED PROTECTION:
LockedIn provides optional content filtering to help users 
maintain focus. All blocking is user-initiated and can be 
disabled at any time.

IMPORTANT:
This app does not guarantee 100% blocking and should be used 
as part of a comprehensive recovery program. If you are 
struggling with addiction, please seek professional help.

National Problem Gambling Helpline: 1-800-522-4700
```

### App Review Notes
```
This app helps users build discipline and avoid distracting websites.
The blocking feature uses DNS filtering and is entirely user-controlled.
Users can disable blocking at any time.
This is a wellness tool, not a medical device.
We do not make claims of guaranteed blocking or addiction treatment.
```

### Legal Disclaimers (In-App)
```
DISCLAIMER:
LockedIn is a wellness tool designed to support users in 
building discipline. It does not provide medical advice, 
diagnosis, or treatment. If you are experiencing addiction, 
please consult a licensed professional.

The blocking features are user-controlled and use DNS filtering.
No blocking solution is 100% effective. LockedIn does not 
guarantee complete prevention of access.
```

### Screenshots Strategy
1. Timer screen (clean, professional)
2. Community support (positive, uplifting)
3. Progress tracking (achievement-focused)
4. Lock screen (wellness protection)
5. Discord community (social support)

**DO NOT SHOW:**
- Gambling site names
- Casino logos
- Sportsbook references
- Money imagery

---

## 🚨 Critical Technical Implementation

### VPN Blocking (iOS)
```swift
// iOS NEVPNManager configuration
import NetworkExtension

class VPNBlockingService {
    func activateBlocking(duration: Int) {
        let vpnManager = NEVPNManager.shared()
        
        // DNS filtering configuration
        let dnsSettings = NEDNSSettings(servers: [
            "1.1.1.3", // Cloudflare Malware blocking
            "1.0.0.3"
        ])
        
        // Content filter configuration
        let filterManager = NEFilterManager.shared()
        // Add 200+ gambling domains to block list
        
        // Enable VPN
        vpnManager.isEnabled = true
        vpnManager.saveToPreferences { error in
            if error == nil {
                vpnManager.connection.startVPNTunnel()
            }
        }
    }
}
```

### VPN Blocking (Android)
```kotlin
// Android VPN Service
class BlockingVPNService : VpnService() {
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val builder = Builder()
            .addAddress("10.0.0.2", 32)
            .addRoute("0.0.0.0", 0)
            .addDnsServer("1.1.1.3")
            .setBlocking(true)
        
        val vpnInterface = builder.establish()
        // Packet filtering logic here
        
        return START_STICKY
    }
}
```

### Expo Limitation Workaround
Since Expo doesn't support native VPN:
1. **Phase 1 (MVP):** Educational blocking (DNS setup guides)
2. **Phase 2 (Post-Launch):** Expo Dev Client with custom native modules
3. **Phase 3 (Premium):** Bare React Native build with full VPN

---

## 📊 Implementation Priority

### Week 1
- [ ] Rebrand to LockedIn
- [ ] PrizePicks color scheme
- [ ] Auth flow (sportsbook style)
- [ ] 5-tab navigation
- [ ] Home tab (basic)

### Week 2
- [ ] Timer tab (live updating)
- [ ] Community tab (chat)
- [ ] Lock tab (educational blocking)
- [ ] Discord tab
- [ ] Polish UI

### Post-MVP
- [ ] Device-level VPN
- [ ] Timed lockouts
- [ ] Real-time community
- [ ] Premium features
- [ ] App Store submission

---

## ✅ Success Metrics

**MVP Success:**
- App runs without crashes
- Auth works (register/login)
- Timer updates every second
- Check-ins save correctly
- Toggle shows blocking status
- PrizePicks visual feel achieved

**Launch Success:**
- App Store approval
- 100+ installs in first week
- <1% crash rate
- Positive user feedback
- Community engagement

**Long-term Success:**
- 10K+ active users
- 4.5+ star rating
- Premium conversions >5%
- Real blocking effectiveness
- Lives changed

---

END OF SPECIFICATION
