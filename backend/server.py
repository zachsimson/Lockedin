from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import socketio
import os
import logging
from pathlib import Path
from bson import ObjectId
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configuration
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'gambling_recovery_app')
SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production-12345678')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# MongoDB connection
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
users_collection = db.users
messages_collection = db.messages
settings_collection = db.settings
community_activity_collection = db.community_activity
achievements_collection = db.achievements
user_achievements_collection = db.user_achievements
# New collections for community expansion
chat_messages_collection = db.chat_messages
media_collection = db.media
friends_collection = db.friends
reactions_collection = db.reactions

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Socket.IO setup
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    ping_interval=25,
    ping_timeout=60
)

# FastAPI app
app = FastAPI(title="GambleFree Recovery API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Models
class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    gambling_weekly_amount: Optional[float] = 0.0

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class GamblingHistoryEntry(BaseModel):
    amount: float
    date: datetime
    notes: Optional[str] = ""

class RelapseReport(BaseModel):
    amount: Optional[float] = 0.0
    notes: Optional[str] = ""

class MessageCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)

# Profile & Achievement Models
class ProfileUpdate(BaseModel):
    profile_visibility_mode: Optional[str] = None  # "avatar" or "photo"
    avatar_id: Optional[str] = None
    bio: Optional[str] = None

class CommunityActivityCreate(BaseModel):
    activity_type: str  # CHECK_IN, RESET, STREAK_MILESTONE, ACHIEVEMENT_UNLOCKED
    activity_value: Optional[str] = None

# Avatar definitions - system-generated avatar styles
AVATAR_STYLES = {
    # Classic Icons
    "shield": {"icon": "shield-checkmark", "color": "#00F5A0", "category": "classic"},
    "phoenix": {"icon": "flame", "color": "#FF6B6B", "category": "classic"},
    "mountain": {"icon": "triangle", "color": "#4ECDC4", "category": "classic"},
    "star": {"icon": "star", "color": "#FFE66D", "category": "classic"},
    "diamond": {"icon": "diamond", "color": "#A78BFA", "category": "classic"},
    "lightning": {"icon": "flash", "color": "#F59E0B", "category": "classic"},
    "heart": {"icon": "heart", "color": "#EC4899", "category": "classic"},
    "rocket": {"icon": "rocket", "color": "#3B82F6", "category": "classic"},
    "crown": {"icon": "trophy", "color": "#FBBF24", "category": "classic"},
    "anchor": {"icon": "fitness", "color": "#10B981", "category": "classic"},
    # Abstract
    "prism": {"icon": "prism", "color": "#8B5CF6", "category": "abstract"},
    "nucleus": {"icon": "nuclear", "color": "#06B6D4", "category": "abstract"},
    "cube": {"icon": "cube", "color": "#F97316", "category": "abstract"},
    "sphere": {"icon": "ellipse", "color": "#EF4444", "category": "abstract"},
    "grid": {"icon": "grid", "color": "#22C55E", "category": "abstract"},
    "layers": {"icon": "layers", "color": "#6366F1", "category": "abstract"},
    # Nature
    "leaf": {"icon": "leaf", "color": "#22C55E", "category": "nature"},
    "moon": {"icon": "moon", "color": "#94A3B8", "category": "nature"},
    "sunny": {"icon": "sunny", "color": "#FBBF24", "category": "nature"},
    "water": {"icon": "water", "color": "#0EA5E9", "category": "nature"},
    "planet": {"icon": "planet", "color": "#8B5CF6", "category": "nature"},
    "snow": {"icon": "snow", "color": "#E0F2FE", "category": "nature"},
    # Strength
    "barbell": {"icon": "barbell", "color": "#DC2626", "category": "strength"},
    "pulse": {"icon": "pulse", "color": "#00F5A0", "category": "strength"},
    "body": {"icon": "body", "color": "#F97316", "category": "strength"},
    "walk": {"icon": "walk", "color": "#10B981", "category": "strength"},
    "bicycle": {"icon": "bicycle", "color": "#3B82F6", "category": "strength"},
    # Minimal
    "square": {"icon": "square", "color": "#64748B", "category": "minimal"},
    "circle": {"icon": "ellipse", "color": "#A855F7", "category": "minimal"},
    "hexagon": {"icon": "hexagon", "color": "#14B8A6", "category": "minimal"},
    "infinite": {"icon": "infinite", "color": "#F472B6", "category": "minimal"},
    "ribbon": {"icon": "ribbon", "color": "#EC4899", "category": "minimal"},
    "eye": {"icon": "eye", "color": "#6366F1", "category": "minimal"},
}

# Server-driven daily quotes (rotating)
DAILY_QUOTES = [
    "DISCIPLINE OVER IMPULSE",
    "ONE DAY STRONGER",
    "CONTROL IS POWER",
    "LOCKED IN. NO EXCEPTIONS.",
    "PROGRESS, NOT PERFECTION",
    "STAY THE COURSE",
    "BUILT DIFFERENT",
    "NEVER LOOK BACK",
    "MIND OVER MATTER",
    "UNSHAKEABLE",
    "GRIND NOW. SHINE LATER.",
    "RISE ABOVE",
    "FEARLESS",
    "NO SHORTCUTS",
    "RESILIENCE WINS",
    "EVERY DAY COUNTS",
    "UNSTOPPABLE",
    "STAY LOCKED IN",
    "OWN YOUR PATH",
    "STRONGER TODAY",
    "NO COMPROMISES",
    "FREEDOM EARNED",
    "RELENTLESS",
    "LEVEL UP",
    "MAKE IT HAPPEN",
    "TAKE CONTROL",
    "BREAK THE CYCLE",
    "NEW DAY. NEW WIN.",
    "CHAMPION MINDSET",
    "KEEP GOING",
]

# Achievement definitions
ACHIEVEMENTS = [
    {"id": "first_day", "name": "First Step", "description": "Complete your first clean day", "threshold_days": 1, "icon": "footsteps"},
    {"id": "one_week", "name": "One Week Warrior", "description": "7 days clean", "threshold_days": 7, "icon": "calendar"},
    {"id": "two_weeks", "name": "Fortnight Fighter", "description": "14 days clean", "threshold_days": 14, "icon": "shield"},
    {"id": "one_month", "name": "Monthly Master", "description": "30 days clean", "threshold_days": 30, "icon": "medal"},
    {"id": "sixty_days", "name": "Double Down", "description": "60 days clean", "threshold_days": 60, "icon": "ribbon"},
    {"id": "ninety_days", "name": "Quarter Champion", "description": "90 days clean", "threshold_days": 90, "icon": "trophy"},
    {"id": "six_months", "name": "Half Year Hero", "description": "180 days clean", "threshold_days": 180, "icon": "star"},
    {"id": "one_year", "name": "Year of Freedom", "description": "365 days clean", "threshold_days": 365, "icon": "ribbon"},
]

# Custom Premium Emoji System
PREMIUM_EMOJIS = {
    "fire": {"emoji": "🔥", "name": "Streak Fire", "gradient": ["#FF512F", "#F09819"], "type": "milestone"},
    "muscle": {"emoji": "💪", "name": "Strength", "gradient": ["#11998E", "#38EF7D"], "type": "support"},
    "clap": {"emoji": "👏", "name": "Encouragement", "gradient": ["#667EEA", "#764BA2"], "type": "encourage"},
    "heart": {"emoji": "❤️", "name": "Love", "gradient": ["#E53935", "#E35D5B"], "type": "support"},
    "brain": {"emoji": "🧠", "name": "Mental Strength", "gradient": ["#A18CD1", "#FBC2EB"], "type": "wisdom"},
    "star": {"emoji": "⭐", "name": "Star", "gradient": ["#F7971E", "#FFD200"], "type": "celebrate"},
    "rocket": {"emoji": "🚀", "name": "Launch", "gradient": ["#00C6FB", "#005BEA"], "type": "progress"},
    "trophy": {"emoji": "🏆", "name": "Champion", "gradient": ["#FFD700", "#FFA500"], "type": "milestone"},
}

# Default inspirational media content
DEFAULT_MEDIA = [
    {
        "id": "ted_1",
        "title": "The Power of Addiction and Recovery",
        "description": "A powerful TED Talk about overcoming addiction and finding strength in vulnerability.",
        "source_type": "TED",
        "video_url": "https://www.youtube.com/watch?v=7Z9qJCbkfqY",
        "thumbnail_url": "https://img.youtube.com/vi/7Z9qJCbkfqY/maxresdefault.jpg",
        "duration": "15:24"
    },
    {
        "id": "ted_2",
        "title": "Everything You Think You Know About Addiction Is Wrong",
        "description": "Johann Hari's groundbreaking talk that challenges how we think about addiction.",
        "source_type": "TED",
        "video_url": "https://www.youtube.com/watch?v=PY9DcIMGxMs",
        "thumbnail_url": "https://img.youtube.com/vi/PY9DcIMGxMs/maxresdefault.jpg",
        "duration": "14:42"
    },
    {
        "id": "youtube_1",
        "title": "Breaking the Cycle of Gambling Addiction",
        "description": "Real stories of recovery and practical strategies to stay clean.",
        "source_type": "YOUTUBE",
        "video_url": "https://www.youtube.com/watch?v=OMjQ2aLBbk0",
        "thumbnail_url": "https://img.youtube.com/vi/OMjQ2aLBbk0/maxresdefault.jpg",
        "duration": "12:30"
    },
    {
        "id": "story_1",
        "title": "30 Days Clean: My Journey",
        "description": "A community member shares their first month of recovery.",
        "source_type": "STORY",
        "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "thumbnail_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
        "duration": "8:15"
    },
]

# Chat models
class ChatMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)
    reply_to: Optional[str] = None

class ReactionCreate(BaseModel):
    emoji_id: str
    target_type: str  # "activity" or "chat"
    target_id: str

class FriendRequest(BaseModel):
    receiver_id: str

# Profanity filter (basic)
BLOCKED_WORDS = ["spam", "scam", "http://", "https://", "@", ".com", ".net"]

def filter_profanity(text: str) -> str:
    """Basic profanity/link filter"""
    filtered = text
    for word in BLOCKED_WORDS:
        filtered = filtered.replace(word, "***")
    return filtered

# VPN/Recovery Mode Models
class VPNEnableRequest(BaseModel):
    lock_duration: str = Field(..., description="Lock duration: 24h, 72h, 7d, 30d, permanent")

class VPNUnlockRequest(BaseModel):
    reason: str = Field(..., min_length=10, max_length=500)

class VPNStatus(BaseModel):
    recovery_mode_enabled: bool
    lock_duration: Optional[str]
    lock_started_at: Optional[str]
    lock_expires_at: Optional[str]
    unlock_requested: bool
    unlock_requested_at: Optional[str]
    unlock_request_reason: Optional[str]
    unlock_approved: bool
    unlock_approved_at: Optional[str]
    unlock_effective_at: Optional[str]
    cooldown_remaining_seconds: Optional[int]
    can_disable: bool

# Cooldown duration in hours
VPN_COOLDOWN_HOURS = 24

def calculate_lock_expiry(lock_duration: str, start_time: datetime) -> Optional[datetime]:
    """Calculate when a lock expires based on duration"""
    if lock_duration == "permanent":
        return None  # Never expires
    
    duration_map = {
        "24h": timedelta(hours=24),
        "72h": timedelta(hours=72),
        "7d": timedelta(days=7),
        "30d": timedelta(days=30),
    }
    
    delta = duration_map.get(lock_duration)
    if delta:
        return start_time + delta
    return None

# Helper functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user["_id"] = str(user["_id"])
    return user

async def get_current_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if key == "_id" or key.endswith("_id"):
                result[key] = str(value)
            elif isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, list):
                result[key] = serialize_doc(value)
            elif isinstance(value, dict):
                result[key] = serialize_doc(value)
            else:
                result[key] = value
        return result
    return doc

# Initialize default settings
@app.on_event("startup")
async def startup_db():
    # Create indexes
    await users_collection.create_index("email", unique=True)
    await users_collection.create_index("username", unique=True)
    await messages_collection.create_index([("timestamp", -1)])
    
    # Initialize default settings
    default_settings = await settings_collection.find_one({"_id": "app_settings"})
    if not default_settings:
        await settings_collection.insert_one({
            "_id": "app_settings",
            "discord_link": "https://discord.gg/gambling-recovery",
            "blocked_domains": [
                # Major US Sportsbooks
                "draftkings.com", "fanduel.com", "bet365.com", "caesars.com", "betmgm.com",
                "pointsbet.com", "barstoolsportsbook.com", "foxbet.com", "unibet.com", "williamhill.com",
                "betrivers.com", "sugarhousebet.com", "twinspires.com", "wynnbet.com", "hardrock.bet",
                "betfred.com", "betway.com", "borgataonline.com", "betonline.ag", "bovada.lv",
                "mybookie.ag", "sportsbetting.ag", "intertops.eu", "xbet.ag", "betdsi.com",
                "betonline.com", "betonusa.com", "bovada.ag", "nitrogen.eu", "cloudbet.com",
                
                # Online Casinos
                "888casino.com", "pokerstars.com", "partypoker.com", "pulsz.com", "stake.us",
                "betmgmcasino.com", "goldencasino.com", "betrivers.net", "playsugarhouse.com",
                "tropicana.net", "mohegansuncasino.com", "resortscasino.com", "betamerica.com",
                "chumba.com", "luckyland.com", "funzpoints.com", "global poker.com", "fortunecoins.com",
                "wow.vegas.com", "sweepslots.com", "mcluck.com", "real.prize.com", "rollbit.com",
                "ignition.casino", "cafe-casino.com", "slots.lv", "slotslights.com", "bodog.com",
                
                # Social Casinos
                "doubledowncasino.com", "slotsmania.com", "houseof fun.com", "jackpotparty.com",
                "quickhitsslots.com", "hititrich.com", "pop slots.com", "slotomania.com",
                "cashman.com", "lightning link.com", "heartoflasvegas.com", "big fish casino.com",
                "caesarscasino.com", "mykonami.com", "doubleucasino.com", "lucktastic.com",
                "wsop.com", "zynga.com/games/zynga-poker", "replay poker.com", "playtika.com",
                
                # International Betting Sites
                "bet888.com", "bwin.com", "paddypower.com", "betfair.com", "coral.co.uk",
                "ladbrokes.com", "skybet.com", "betvictor.com", "10bet.com", "888sport.com",
                "betsson.com", "bethard.com", "mr green.com", "leovegas.com", "casumo.com",
                "22bet.com", "1xbet.com", "melbet.com", "parimatch.com", "dafabet.com",
                "sbobet.com", "pinnacle.com", "marathon bet.com", "asiabet.com", "cmd368.com",
                
                # Crypto Gambling
                "stake.com", "roobet.com", "bc.game", "duelbits.com", "wolf.bet",
                "betfury.io", "coinflip.com", "fortunejack.com", "bitstarz.com", "cryptowild.com",
                "fair spin.com", "bitcasino.io", "sportsbet.io", "cloudbet.com", "nitrogen.eu",
                "thunderpick.io", "trust dice.io", "metaspins.com", "punt.com", "flush.com",
                
                # DFS & Fantasy Sports
                "draftkings.com/daily-fantasy", "fanduel.com/fantasy", "yahoo.com/fantasy",
                "espn.com/fantasy", "underdog.com", "prizepicks.com", "drafters.com",
                "monday.qq.com", "superdraft.com", "betr.com", "parlayplay.com", "jock mkt.com",
                
                # Horse Racing
                "tvg.com", "twinspires.com", "xpressbet.com", "nyra.com/bets", "betamerica.com",
                "4njbets.com", "fanduel racing.com", "paddypower.com/racing", "betfair racing.com",
                
                # Lottery & Bingo
                "jackpocket.com", "thel.com", "luckyday.com", "bingo.com", "bingoblitz.com",
                "gsn.com/bingo", "bingozone.com", "cyberbingo.com", "south beach bingo.com",
                
                # Poker Sites
                "pokerstars.net", "888poker.com", "party poker.com", "acr poker.eu",
                "globalpoker.com", "wsop.com/poker", "ggpoker.com", "bet online.poker",
                "ignitionpoker.eu", "carbon poker.ag", "bodog.poker", "betonline.poker",
                
                # Prediction Markets
                "predicit.com", "poly market.com", "kalshi.com", "augur.net", "futuur.com",
                
                # Skill-Based & Other
                "skillz.com", "pocket7games.com", "real money.com", "swagbucks.com/games",
                "long game.com", "winr.games", "gameville.com", "winview.com",
                
                # Additional International
                "betano.com", "inter wetten.com", "tipico.com", "bettilt.com", "netbet.com",
                "marathonbet.com", "boyle sports.com", "sports bet.com.au", "tab.com.au",
                "bet365.es", "codere.es", "marca.apuestas.es", "luckia.es", "versus.es",
                "bet way.co.za", "hollywoodbets.net", "supabets.co.za", "bet.co.za",
                "betika.com", "sporty bet.com", "1xbet.ng", "bet9ja.com", "nairabet.com",
                
                # Sweepstakes & Contest Sites
                "sweepstakes.com", "contest.com", "omaze.com", "prizegrab.com", "raffall.com",
                "lottoland.com", "thelotter.com", "mega millions.com", "power ball.com",
                
                # Affiliate/Review Sites
                "odds checker.com", "sbo.net", "askgamblers.com", "casino.org", "gambling.com",
                "odds portal.com", "bet tips.com", "picks and parlays.com", "covers.com",
                "the action network.com", "vegasinsider.com", "sports betting dime.com",
                
                # Mobile Apps Websites
                "big time.com", "mistplay.com", "appkarma.io", "featurepoints.com",
                "cash'em all.com", "make money.com", "money sms.com", "current app.com",
                
                # Emerging/New Platforms (2024-2025)
                "fliff.com", "betr.app", "tipico.de", "betano.de", "neo.bet",
                "admiral bet.com", "maxbet.rs", "meridian bet.com", "mozzart.com",
                "pinnbet.com", "stoiximan.gr", "novibet.gr", "pamestoixima.gr",
                
                # Fantasy & Props
                "champ.games", "dabble.com", "sleeper.app", "run your pool.com",
                "fantasy pros.com", "draft sharks.com", "player profiler.com",
                
                # Newer Social Casinos
                "zula.casino", "gambino.slots.com", "scratchmania.com", "primal.casino",
                "wow.vegas", "hey.spin.com", "vibe.gaming.com", "wild.casino",
            ]
        })
    
    logger.info("Database initialized")
    
    # Initialize achievements
    for achievement in ACHIEVEMENTS:
        existing = await achievements_collection.find_one({"id": achievement["id"]})
        if not existing:
            await achievements_collection.insert_one(achievement)
    
    # Create indexes for new collections
    await community_activity_collection.create_index([("created_at", -1)])
    await community_activity_collection.create_index("user_id")
    await user_achievements_collection.create_index("user_id")

# Helper function to create community activity
async def create_community_activity(user_id: str, activity_type: str, activity_value: str = None):
    """Create and broadcast a community activity event"""
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        return
    
    activity = {
        "user_id": user_id,
        "username": user.get("username", "Anonymous"),
        "avatar_id": user.get("avatar_id", "shield"),
        "profile_photo_url": user.get("profile_photo_url"),
        "profile_visibility_mode": user.get("profile_visibility_mode", "avatar"),
        "activity_type": activity_type,
        "activity_value": activity_value,
        "created_at": datetime.utcnow()
    }
    
    result = await community_activity_collection.insert_one(activity)
    activity["_id"] = str(result.inserted_id)
    
    # Broadcast to connected clients
    await sio.emit("community_activity", serialize_doc(activity))
    
    return activity

# Helper function to check and award achievements
async def check_and_award_achievements(user_id: str, streak_days: int):
    """Check if user has earned new achievements based on streak"""
    awarded = []
    
    for achievement in ACHIEVEMENTS:
        if streak_days >= achievement["threshold_days"]:
            # Check if already awarded
            existing = await user_achievements_collection.find_one({
                "user_id": user_id,
                "achievement_id": achievement["id"]
            })
            
            if not existing:
                # Award achievement
                await user_achievements_collection.insert_one({
                    "user_id": user_id,
                    "achievement_id": achievement["id"],
                    "unlocked_at": datetime.utcnow()
                })
                
                awarded.append(achievement)
                
                # Create community activity for achievement
                await create_community_activity(
                    user_id,
                    "ACHIEVEMENT_UNLOCKED",
                    achievement["name"]
                )
    
    return awarded

# ============= AUTH ENDPOINTS =============

@app.post("/api/auth/register", response_model=Token)
async def register(user_data: UserRegister):
    # Check if email exists
    existing = await users_collection.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username exists
    existing = await users_collection.find_one({"username": user_data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create user
    import random
    avatar_ids = list(AVATAR_STYLES.keys())
    default_avatar = random.choice(avatar_ids)
    
    user_doc = {
        "username": user_data.username,
        "email": user_data.email,
        "password": get_password_hash(user_data.password),
        "role": "user",
        "subscription_status": "trial",
        "sobriety_start_date": datetime.utcnow(),
        "last_gambled_date": None,
        "gambling_history": [],
        "gambling_weekly_amount": user_data.gambling_weekly_amount or 0.0,
        "is_blocked": False,
        "blocking_enabled": False,
        "created_at": datetime.utcnow(),
        # Profile fields
        "avatar_id": default_avatar,
        "avatar_url": None,
        "profile_photo_url": None,
        "profile_visibility_mode": "avatar",  # "avatar" or "photo"
        "bio": None,
        # Recovery stats
        "current_streak_days": 0,
        "longest_streak_days": 0,
        "total_resets": 0,
        "total_check_ins": 0
    }
    
    result = await users_collection.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Create token
    token = create_access_token({"sub": user_id})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "_id": user_id,
            "username": user_data.username,
            "email": user_data.email,
            "role": "user"
        }
    }

@app.post("/api/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await users_collection.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({"sub": str(user["_id"])})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": serialize_doc({
            "_id": user["_id"],
            "username": user["username"],
            "email": user["email"],
            "role": user.get("role", "user")
        })
    }

@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return serialize_doc(current_user)

# ============= RECOVERY TRACKING ENDPOINTS =============

@app.get("/api/recovery/stats")
async def get_recovery_stats(current_user: dict = Depends(get_current_user)):
    sobriety_start = current_user.get("sobriety_start_date")
    if isinstance(sobriety_start, str):
        sobriety_start = datetime.fromisoformat(sobriety_start.replace('Z', '+00:00'))
    
    days_sober = 0
    if sobriety_start:
        days_sober = (datetime.utcnow() - sobriety_start).days
    
    # Calculate savings based on gambling history
    weekly_amount = current_user.get("gambling_weekly_amount", 0.0)
    weeks_sober = days_sober / 7 if days_sober > 0 else 0
    total_saved = weekly_amount * weeks_sober
    
    return {
        "days_sober": days_sober,
        "money_saved": round(total_saved, 2),
        "sobriety_start_date": sobriety_start.isoformat() if sobriety_start else None,
        "last_gambled_date": current_user.get("last_gambled_date"),
        "gambling_weekly_amount": weekly_amount
    }

@app.post("/api/recovery/relapse")
async def report_relapse(
    relapse: RelapseReport,
    current_user: dict = Depends(get_current_user)
):
    now = datetime.utcnow()
    
    # Add to gambling history
    history_entry = {
        "amount": relapse.amount,
        "date": now,
        "notes": relapse.notes
    }
    
    # Update user
    await users_collection.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {
            "$set": {
                "sobriety_start_date": now,
                "last_gambled_date": now
            },
            "$push": {"gambling_history": history_entry}
        }
    )
    
    return {"message": "Relapse recorded. Your sobriety timer has been reset.", "new_start_date": now.isoformat()}

@app.post("/api/recovery/gambling-history")
async def add_gambling_history(
    entry: GamblingHistoryEntry,
    current_user: dict = Depends(get_current_user)
):
    history_entry = {
        "amount": entry.amount,
        "date": entry.date,
        "notes": entry.notes
    }
    
    await users_collection.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$push": {"gambling_history": history_entry}}
    )
    
    return {"message": "History entry added"}

@app.get("/api/recovery/gambling-history")
async def get_gambling_history(current_user: dict = Depends(get_current_user)):
    user = await users_collection.find_one({"_id": ObjectId(current_user["_id"])})
    history = user.get("gambling_history", [])
    return {"history": serialize_doc(history)}

# ============= CHAT ENDPOINTS =============

@app.get("/api/chat/history")
async def get_chat_history(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    messages = await messages_collection.find(
        {},
        {"user_id": 1, "username": 1, "message": 1, "timestamp": 1}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    messages.reverse()  # Chronological order
    return {"messages": serialize_doc(messages)}

# ============= RECOVERY MODE / VPN ENDPOINTS =============

@app.get("/api/blocking/domains")
async def get_blocked_domains(current_user: dict = Depends(get_current_user)):
    """Get list of blocked gambling domains"""
    settings = await settings_collection.find_one({"_id": "app_settings"})
    return {"domains": settings.get("blocked_domains", [])}

@app.get("/api/vpn/status")
async def get_vpn_status(current_user: dict = Depends(get_current_user)):
    """Get comprehensive VPN/Recovery Mode status including cooldown info"""
    user = await users_collection.find_one(
        {"_id": ObjectId(current_user["_id"])}
    )
    
    recovery_mode_enabled = user.get("recovery_mode_enabled", False)
    lock_duration = user.get("lock_duration")
    lock_started_at = user.get("lock_started_at")
    lock_expires_at = user.get("lock_expires_at")
    
    unlock_requested = user.get("unlock_requested", False)
    unlock_requested_at = user.get("unlock_requested_at")
    unlock_request_reason = user.get("unlock_request_reason")
    
    unlock_approved = user.get("unlock_approved", False)
    unlock_approved_at = user.get("unlock_approved_at")
    unlock_effective_at = user.get("unlock_effective_at")
    
    # Calculate cooldown remaining
    cooldown_remaining_seconds = None
    can_disable = False
    
    if unlock_approved and unlock_effective_at:
        now = datetime.utcnow()
        effective_time = unlock_effective_at if isinstance(unlock_effective_at, datetime) else datetime.fromisoformat(unlock_effective_at.replace('Z', '+00:00'))
        
        if now >= effective_time:
            # Cooldown expired - can disable
            can_disable = True
            cooldown_remaining_seconds = 0
        else:
            # Still in cooldown
            remaining = effective_time - now
            cooldown_remaining_seconds = int(remaining.total_seconds())
            can_disable = False
    elif not recovery_mode_enabled:
        # VPN not enabled, can enable anytime
        can_disable = False
    
    return {
        "recovery_mode_enabled": recovery_mode_enabled,
        "lock_duration": lock_duration,
        "lock_started_at": lock_started_at.isoformat() if lock_started_at else None,
        "lock_expires_at": lock_expires_at.isoformat() if lock_expires_at else None,
        "unlock_requested": unlock_requested,
        "unlock_requested_at": unlock_requested_at.isoformat() if unlock_requested_at else None,
        "unlock_request_reason": unlock_request_reason,
        "unlock_approved": unlock_approved,
        "unlock_approved_at": unlock_approved_at.isoformat() if unlock_approved_at else None,
        "unlock_effective_at": unlock_effective_at.isoformat() if unlock_effective_at else None,
        "cooldown_remaining_seconds": cooldown_remaining_seconds,
        "can_disable": can_disable
    }

# Keep old endpoint for backward compatibility
@app.get("/api/blocking/status")
async def get_blocking_status(current_user: dict = Depends(get_current_user)):
    """Legacy endpoint - redirects to VPN status"""
    vpn_status = await get_vpn_status(current_user)
    return {
        "blocking_enabled": vpn_status["recovery_mode_enabled"],
        "is_blocked": current_user.get("is_blocked", False),
        "vpn_status": vpn_status
    }

@app.post("/api/vpn/enable")
async def enable_vpn(
    request: VPNEnableRequest,
    current_user: dict = Depends(get_current_user)
):
    """Enable Recovery Mode with specified lock duration"""
    valid_durations = ["24h", "72h", "7d", "30d", "permanent"]
    if request.lock_duration not in valid_durations:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid lock duration. Must be one of: {', '.join(valid_durations)}"
        )
    
    now = datetime.utcnow()
    lock_expires_at = calculate_lock_expiry(request.lock_duration, now)
    
    await users_collection.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {
            "$set": {
                "recovery_mode_enabled": True,
                "blocking_enabled": True,  # Backward compatibility
                "lock_duration": request.lock_duration,
                "lock_started_at": now,
                "lock_expires_at": lock_expires_at,
                # Reset any pending unlock requests
                "unlock_requested": False,
                "unlock_requested_at": None,
                "unlock_request_reason": None,
                "unlock_approved": False,
                "unlock_approved_at": None,
                "unlock_effective_at": None
            }
        }
    )
    
    return {
        "message": "Recovery Mode enabled",
        "lock_duration": request.lock_duration,
        "lock_started_at": now.isoformat(),
        "lock_expires_at": lock_expires_at.isoformat() if lock_expires_at else None
    }

# Legacy endpoint for backward compatibility
@app.post("/api/blocking/enable")
async def enable_blocking_legacy(
    enabled: bool,
    current_user: dict = Depends(get_current_user)
):
    """Legacy endpoint - use /api/vpn/enable instead"""
    if enabled:
        # Enable with default 24h lock
        request = VPNEnableRequest(lock_duration="24h")
        return await enable_vpn(request, current_user)
    else:
        # Check if user can disable
        vpn_status = await get_vpn_status(current_user)
        if vpn_status["recovery_mode_enabled"] and not vpn_status["can_disable"]:
            raise HTTPException(
                status_code=403,
                detail="Cannot disable Recovery Mode. Request unlock and wait for cooldown."
            )
        
        await users_collection.update_one(
            {"_id": ObjectId(current_user["_id"])},
            {"$set": {"blocking_enabled": False, "recovery_mode_enabled": False}}
        )
        return {"blocking_enabled": False}

@app.post("/api/vpn/request-unlock")
async def request_vpn_unlock(
    request: VPNUnlockRequest,
    current_user: dict = Depends(get_current_user)
):
    """Request to unlock/disable Recovery Mode - requires admin approval"""
    user = await users_collection.find_one({"_id": ObjectId(current_user["_id"])})
    
    if not user.get("recovery_mode_enabled", False):
        raise HTTPException(
            status_code=400,
            detail="Recovery Mode is not enabled"
        )
    
    if user.get("unlock_requested", False):
        raise HTTPException(
            status_code=400,
            detail="Unlock request already pending"
        )
    
    now = datetime.utcnow()
    
    await users_collection.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {
            "$set": {
                "unlock_requested": True,
                "unlock_requested_at": now,
                "unlock_request_reason": request.reason
            }
        }
    )
    
    return {
        "message": "Unlock request submitted. Awaiting admin approval.",
        "requested_at": now.isoformat()
    }

@app.post("/api/vpn/disable")
async def disable_vpn(current_user: dict = Depends(get_current_user)):
    """Disable Recovery Mode - only works if cooldown has expired"""
    user = await users_collection.find_one({"_id": ObjectId(current_user["_id"])})
    
    if not user.get("recovery_mode_enabled", False):
        raise HTTPException(
            status_code=400,
            detail="Recovery Mode is not enabled"
        )
    
    # Check if unlock is approved and cooldown expired
    unlock_approved = user.get("unlock_approved", False)
    unlock_effective_at = user.get("unlock_effective_at")
    
    if not unlock_approved:
        raise HTTPException(
            status_code=403,
            detail="Unlock not approved. Request unlock first."
        )
    
    if unlock_effective_at:
        now = datetime.utcnow()
        effective_time = unlock_effective_at if isinstance(unlock_effective_at, datetime) else datetime.fromisoformat(str(unlock_effective_at).replace('Z', '+00:00'))
        
        if now < effective_time:
            remaining = effective_time - now
            hours = int(remaining.total_seconds() // 3600)
            minutes = int((remaining.total_seconds() % 3600) // 60)
            raise HTTPException(
                status_code=403,
                detail=f"Cooldown active. Changes take effect in {hours}h {minutes}m."
            )
    
    # Cooldown expired - disable VPN
    await users_collection.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {
            "$set": {
                "recovery_mode_enabled": False,
                "blocking_enabled": False,
                "lock_duration": None,
                "lock_started_at": None,
                "lock_expires_at": None,
                "unlock_requested": False,
                "unlock_requested_at": None,
                "unlock_request_reason": None,
                "unlock_approved": False,
                "unlock_approved_at": None,
                "unlock_effective_at": None
            }
        }
    )
    
    return {"message": "Recovery Mode disabled"}

@app.post("/api/admin/approve-unlock/{user_id}")
async def admin_approve_unlock(
    user_id: str,
    current_user: dict = Depends(get_current_admin)
):
    """Admin approves unlock request - sets 24 hour cooldown"""
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.get("unlock_requested", False):
        raise HTTPException(
            status_code=400,
            detail="No pending unlock request"
        )
    
    now = datetime.utcnow()
    unlock_effective_at = now + timedelta(hours=VPN_COOLDOWN_HOURS)
    
    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "unlock_approved": True,
                "unlock_approved_at": now,
                "unlock_effective_at": unlock_effective_at,
                "unlock_approved_by": current_user["_id"]
            }
        }
    )
    
    return {
        "message": f"Unlock approved. Cooldown: {VPN_COOLDOWN_HOURS} hours.",
        "approved_at": now.isoformat(),
        "effective_at": unlock_effective_at.isoformat(),
        "user_id": user_id
    }

@app.post("/api/admin/deny-unlock/{user_id}")
async def admin_deny_unlock(
    user_id: str,
    reason: str = "Request denied by admin",
    current_user: dict = Depends(get_current_admin)
):
    """Admin denies unlock request"""
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "unlock_requested": False,
                "unlock_requested_at": None,
                "unlock_request_reason": None,
                "unlock_denied_reason": reason
            }
        }
    )
    
    return {
        "message": "Unlock request denied",
        "user_id": user_id,
        "reason": reason
    }

@app.get("/api/admin/unlock-requests")
async def get_unlock_requests(current_user: dict = Depends(get_current_admin)):
    """Get all pending unlock requests"""
    users = await users_collection.find(
        {"unlock_requested": True},
        {"password": 0, "gambling_history": 0}
    ).to_list(100)
    
    return {
        "requests": serialize_doc(users),
        "count": len(users)
    }

# ============= PROFILE ENDPOINTS =============

@app.get("/api/profile")
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's full profile"""
    user = await users_collection.find_one(
        {"_id": ObjectId(current_user["_id"])},
        {"password": 0}
    )
    
    # Get user's achievements
    user_achievements = await user_achievements_collection.find(
        {"user_id": current_user["_id"]}
    ).to_list(100)
    
    # Map achievement IDs to full achievement data
    achievements_list = []
    for ua in user_achievements:
        achievement = next((a for a in ACHIEVEMENTS if a["id"] == ua["achievement_id"]), None)
        if achievement:
            achievements_list.append({
                **achievement,
                "unlocked_at": ua["unlocked_at"].isoformat() if ua.get("unlocked_at") else None
            })
    
    return {
        "profile": serialize_doc(user),
        "achievements": achievements_list,
        "avatar_styles": AVATAR_STYLES
    }

@app.get("/api/profile/{user_id}")
async def get_user_profile(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get a user's public profile"""
    user = await users_collection.find_one(
        {"_id": ObjectId(user_id)},
        {
            "password": 0, 
            "email": 0, 
            "gambling_history": 0,
            "gambling_weekly_amount": 0
        }
    )
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's achievements
    user_achievements = await user_achievements_collection.find(
        {"user_id": user_id}
    ).to_list(100)
    
    achievements_list = []
    for ua in user_achievements:
        achievement = next((a for a in ACHIEVEMENTS if a["id"] == ua["achievement_id"]), None)
        if achievement:
            achievements_list.append({
                **achievement,
                "unlocked_at": ua["unlocked_at"].isoformat() if ua.get("unlocked_at") else None
            })
    
    # Calculate streak from sobriety_start_date
    sobriety_start = user.get("sobriety_start_date")
    current_streak = 0
    if sobriety_start:
        delta = datetime.utcnow() - sobriety_start
        current_streak = max(0, delta.days)
    
    return {
        "profile": serialize_doc(user),
        "current_streak_days": current_streak,
        "achievements": achievements_list,
        "all_achievements": ACHIEVEMENTS  # For showing locked/unlocked state
    }

@app.put("/api/profile")
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update current user's profile"""
    update_fields = {}
    
    if profile_data.profile_visibility_mode:
        if profile_data.profile_visibility_mode not in ["avatar", "photo"]:
            raise HTTPException(status_code=400, detail="Invalid visibility mode")
        update_fields["profile_visibility_mode"] = profile_data.profile_visibility_mode
    
    if profile_data.avatar_id:
        if profile_data.avatar_id not in AVATAR_STYLES:
            raise HTTPException(status_code=400, detail="Invalid avatar style")
        update_fields["avatar_id"] = profile_data.avatar_id
    
    if profile_data.bio is not None:
        update_fields["bio"] = profile_data.bio[:500]  # Limit bio length
    
    if update_fields:
        update_fields["updated_at"] = datetime.utcnow()
        await users_collection.update_one(
            {"_id": ObjectId(current_user["_id"])},
            {"$set": update_fields}
        )
    
    return {"message": "Profile updated", "updated_fields": list(update_fields.keys())}

@app.get("/api/avatars")
async def get_avatar_styles(current_user: dict = Depends(get_current_user)):
    """Get all available avatar styles"""
    return {"avatars": AVATAR_STYLES}

# ============= COMMUNITY ACTIVITY ENDPOINTS =============

@app.get("/api/community/activity")
async def get_community_activity(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get recent community activity feed"""
    activities = await community_activity_collection.find().sort(
        "created_at", -1
    ).limit(limit).to_list(limit)
    
    return {"activities": serialize_doc(activities)}

@app.post("/api/community/check-in")
async def check_in(current_user: dict = Depends(get_current_user)):
    """Record a daily check-in"""
    user_id = current_user["_id"]
    
    # Update check-in count
    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$inc": {"total_check_ins": 1}}
    )
    
    # Calculate current streak
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    sobriety_start = user.get("sobriety_start_date", datetime.utcnow())
    streak_days = max(0, (datetime.utcnow() - sobriety_start).days)
    
    # Create activity
    await create_community_activity(user_id, "CHECK_IN", f"{streak_days} days")
    
    # Check for new achievements
    awarded = await check_and_award_achievements(user_id, streak_days)
    
    # Check for milestone (every 7 days)
    if streak_days > 0 and streak_days % 7 == 0:
        await create_community_activity(user_id, "STREAK_MILESTONE", f"{streak_days} days")
    
    return {
        "message": "Check-in recorded",
        "streak_days": streak_days,
        "new_achievements": awarded
    }

# ============= ACHIEVEMENTS ENDPOINTS =============

@app.get("/api/achievements")
async def get_all_achievements(current_user: dict = Depends(get_current_user)):
    """Get all available achievements"""
    return {"achievements": ACHIEVEMENTS}

@app.get("/api/achievements/user/{user_id}")
async def get_user_achievements(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a user's unlocked achievements"""
    user_achievements = await user_achievements_collection.find(
        {"user_id": user_id}
    ).to_list(100)
    
    achievements_list = []
    for ua in user_achievements:
        achievement = next((a for a in ACHIEVEMENTS if a["id"] == ua["achievement_id"]), None)
        if achievement:
            achievements_list.append({
                **achievement,
                "unlocked_at": ua["unlocked_at"].isoformat() if ua.get("unlocked_at") else None
            })
    
    return {
        "achievements": achievements_list,
        "all_achievements": ACHIEVEMENTS
    }

# ============= PREMIUM EMOJIS & REACTIONS =============

@app.get("/api/emojis")
async def get_premium_emojis(current_user: dict = Depends(get_current_user)):
    """Get all premium emoji options for reactions"""
    return {"emojis": PREMIUM_EMOJIS}

@app.post("/api/reactions")
async def add_reaction(
    reaction: ReactionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a reaction to an activity or chat message"""
    if reaction.emoji_id not in PREMIUM_EMOJIS:
        raise HTTPException(status_code=400, detail="Invalid emoji")
    
    # Check if already reacted with this emoji
    existing = await reactions_collection.find_one({
        "user_id": current_user["_id"],
        "target_type": reaction.target_type,
        "target_id": reaction.target_id,
        "emoji_id": reaction.emoji_id
    })
    
    if existing:
        # Remove reaction (toggle)
        await reactions_collection.delete_one({"_id": existing["_id"]})
        return {"action": "removed", "emoji_id": reaction.emoji_id}
    
    # Add reaction
    reaction_doc = {
        "user_id": current_user["_id"],
        "username": current_user.get("username"),
        "emoji_id": reaction.emoji_id,
        "target_type": reaction.target_type,
        "target_id": reaction.target_id,
        "created_at": datetime.utcnow()
    }
    
    await reactions_collection.insert_one(reaction_doc)
    
    # Broadcast reaction update
    await sio.emit("reaction_update", {
        "target_type": reaction.target_type,
        "target_id": reaction.target_id,
        "emoji_id": reaction.emoji_id,
        "action": "added"
    })
    
    return {"action": "added", "emoji_id": reaction.emoji_id}

@app.get("/api/reactions/{target_type}/{target_id}")
async def get_reactions(
    target_type: str,
    target_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all reactions for a target"""
    reactions = await reactions_collection.find({
        "target_type": target_type,
        "target_id": target_id
    }).to_list(500)
    
    # Group by emoji
    reaction_counts = {}
    user_reactions = []
    
    for r in reactions:
        emoji_id = r["emoji_id"]
        if emoji_id not in reaction_counts:
            reaction_counts[emoji_id] = 0
        reaction_counts[emoji_id] += 1
        
        if r["user_id"] == current_user["_id"]:
            user_reactions.append(emoji_id)
    
    return {
        "counts": reaction_counts,
        "user_reactions": user_reactions,
        "total": len(reactions)
    }

# ============= MEDIA / INSPIRATION ENDPOINTS =============

@app.get("/api/media")
async def get_media_content(current_user: dict = Depends(get_current_user)):
    """Get inspirational media content"""
    # Try to get from database first
    media_list = await media_collection.find().sort("created_at", -1).to_list(50)
    
    if not media_list:
        # Return default content if no custom content exists
        return {"media": DEFAULT_MEDIA}
    
    return {"media": serialize_doc(media_list)}

@app.post("/api/admin/media")
async def add_media(
    title: str,
    description: str,
    source_type: str,
    video_url: str,
    thumbnail_url: str,
    duration: str,
    current_user: dict = Depends(get_current_admin)
):
    """Admin: Add new media content"""
    media_doc = {
        "title": title,
        "description": description,
        "source_type": source_type,
        "video_url": video_url,
        "thumbnail_url": thumbnail_url,
        "duration": duration,
        "created_at": datetime.utcnow()
    }
    
    result = await media_collection.insert_one(media_doc)
    media_doc["_id"] = str(result.inserted_id)
    
    return {"message": "Media added", "media": media_doc}

# ============= LIVE CHAT ENDPOINTS =============

@app.get("/api/chat/messages")
async def get_chat_messages(
    limit: int = 50,
    before: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get public chat messages"""
    query = {}
    if before:
        query["created_at"] = {"$lt": datetime.fromisoformat(before)}
    
    messages = await chat_messages_collection.find(query).sort(
        "created_at", -1
    ).limit(limit).to_list(limit)
    
    # Reverse to get chronological order
    messages.reverse()
    
    # Get reactions for each message
    for msg in messages:
        msg_id = str(msg["_id"])
        reactions = await reactions_collection.find({
            "target_type": "chat",
            "target_id": msg_id
        }).to_list(100)
        
        reaction_counts = {}
        for r in reactions:
            emoji_id = r["emoji_id"]
            if emoji_id not in reaction_counts:
                reaction_counts[emoji_id] = 0
            reaction_counts[emoji_id] += 1
        
        msg["reactions"] = reaction_counts
    
    return {"messages": serialize_doc(messages)}

@app.post("/api/chat/messages")
async def send_chat_message(
    message: ChatMessageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Send a chat message"""
    user = await users_collection.find_one({"_id": ObjectId(current_user["_id"])})
    
    if user.get("is_blocked", False):
        raise HTTPException(status_code=403, detail="You are blocked from chatting")
    
    # Filter content
    filtered_content = filter_profanity(message.content)
    
    msg_doc = {
        "user_id": current_user["_id"],
        "username": user.get("username"),
        "avatar_id": user.get("avatar_id", "shield"),
        "content": filtered_content,
        "reply_to": message.reply_to,
        "created_at": datetime.utcnow()
    }
    
    result = await chat_messages_collection.insert_one(msg_doc)
    msg_doc["_id"] = str(result.inserted_id)
    msg_doc["reactions"] = {}
    
    # Broadcast to all connected clients
    await sio.emit("new_chat_message", serialize_doc(msg_doc))
    
    return {"message": serialize_doc(msg_doc)}

@app.delete("/api/admin/chat/{message_id}")
async def delete_chat_message(
    message_id: str,
    current_user: dict = Depends(get_current_admin)
):
    """Admin: Delete a chat message"""
    result = await chat_messages_collection.delete_one({"_id": ObjectId(message_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Broadcast deletion
    await sio.emit("chat_message_deleted", {"message_id": message_id})
    
    return {"message": "Message deleted"}

# ============= FRIENDS SYSTEM =============

@app.get("/api/friends")
async def get_friends(current_user: dict = Depends(get_current_user)):
    """Get user's friends and pending requests"""
    user_id = current_user["_id"]
    
    # Get accepted friends
    friends = await friends_collection.find({
        "$or": [
            {"requester_id": user_id, "status": "accepted"},
            {"receiver_id": user_id, "status": "accepted"}
        ]
    }).to_list(500)
    
    # Get pending requests (incoming)
    pending_incoming = await friends_collection.find({
        "receiver_id": user_id,
        "status": "pending"
    }).to_list(100)
    
    # Get pending requests (outgoing)
    pending_outgoing = await friends_collection.find({
        "requester_id": user_id,
        "status": "pending"
    }).to_list(100)
    
    # Get friend user details
    friend_ids = set()
    for f in friends:
        if f["requester_id"] == user_id:
            friend_ids.add(f["receiver_id"])
        else:
            friend_ids.add(f["requester_id"])
    
    friend_users = []
    for fid in friend_ids:
        user = await users_collection.find_one(
            {"_id": ObjectId(fid)},
            {"password": 0, "email": 0}
        )
        if user:
            friend_users.append(serialize_doc(user))
    
    return {
        "friends": friend_users,
        "pending_incoming": serialize_doc(pending_incoming),
        "pending_outgoing": serialize_doc(pending_outgoing)
    }

@app.post("/api/friends/request")
async def send_friend_request(
    request: FriendRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a friend request"""
    user_id = current_user["_id"]
    receiver_id = request.receiver_id
    
    if user_id == receiver_id:
        raise HTTPException(status_code=400, detail="Cannot friend yourself")
    
    # Check if receiver exists
    receiver = await users_collection.find_one({"_id": ObjectId(receiver_id)})
    if not receiver:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already friends or pending
    existing = await friends_collection.find_one({
        "$or": [
            {"requester_id": user_id, "receiver_id": receiver_id},
            {"requester_id": receiver_id, "receiver_id": user_id}
        ]
    })
    
    if existing:
        if existing["status"] == "accepted":
            raise HTTPException(status_code=400, detail="Already friends")
        elif existing["status"] == "pending":
            raise HTTPException(status_code=400, detail="Request already pending")
        elif existing["status"] == "blocked":
            raise HTTPException(status_code=403, detail="Unable to send request")
    
    # Create friend request
    friend_doc = {
        "requester_id": user_id,
        "receiver_id": receiver_id,
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    
    await friends_collection.insert_one(friend_doc)
    
    # Notify receiver
    await sio.emit(f"friend_request_{receiver_id}", {
        "from_user_id": user_id,
        "from_username": current_user.get("username")
    })
    
    return {"message": "Friend request sent"}

@app.post("/api/friends/accept/{requester_id}")
async def accept_friend_request(
    requester_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Accept a friend request"""
    user_id = current_user["_id"]
    
    result = await friends_collection.update_one(
        {
            "requester_id": requester_id,
            "receiver_id": user_id,
            "status": "pending"
        },
        {
            "$set": {
                "status": "accepted",
                "accepted_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    # Notify requester
    await sio.emit(f"friend_accepted_{requester_id}", {
        "user_id": user_id,
        "username": current_user.get("username")
    })
    
    return {"message": "Friend request accepted"}

@app.post("/api/friends/decline/{requester_id}")
async def decline_friend_request(
    requester_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Decline a friend request"""
    user_id = current_user["_id"]
    
    result = await friends_collection.delete_one({
        "requester_id": requester_id,
        "receiver_id": user_id,
        "status": "pending"
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    return {"message": "Friend request declined"}

@app.delete("/api/friends/{friend_id}")
async def remove_friend(
    friend_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove a friend"""
    user_id = current_user["_id"]
    
    result = await friends_collection.delete_one({
        "$or": [
            {"requester_id": user_id, "receiver_id": friend_id, "status": "accepted"},
            {"requester_id": friend_id, "receiver_id": user_id, "status": "accepted"}
        ]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Friend not found")
    
    return {"message": "Friend removed"}

@app.get("/api/friends/status/{user_id}")
async def get_friend_status(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get friendship status with a user"""
    my_id = current_user["_id"]
    
    if my_id == user_id:
        return {"status": "self"}
    
    friend = await friends_collection.find_one({
        "$or": [
            {"requester_id": my_id, "receiver_id": user_id},
            {"requester_id": user_id, "receiver_id": my_id}
        ]
    })
    
    if not friend:
        return {"status": "none"}
    
    if friend["status"] == "accepted":
        return {"status": "friends"}
    elif friend["status"] == "pending":
        if friend["requester_id"] == my_id:
            return {"status": "pending_outgoing"}
        else:
            return {"status": "pending_incoming"}
    elif friend["status"] == "blocked":
        return {"status": "blocked"}
    
    return {"status": "none"}

@app.get("/api/community/suggested")
async def get_suggested_connections(
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """Get suggested users to connect with"""
    user_id = current_user["_id"]
    
    # Get existing friends/requests
    existing = await friends_collection.find({
        "$or": [
            {"requester_id": user_id},
            {"receiver_id": user_id}
        ]
    }).to_list(500)
    
    exclude_ids = {user_id}
    for e in existing:
        exclude_ids.add(e["requester_id"])
        exclude_ids.add(e["receiver_id"])
    
    # Get random users not in exclude list
    pipeline = [
        {"$match": {"_id": {"$nin": [ObjectId(eid) for eid in exclude_ids]}}},
        {"$sample": {"size": limit}},
        {"$project": {"password": 0, "email": 0}}
    ]
    
    suggestions = await users_collection.aggregate(pipeline).to_list(limit)
    
    return {"suggestions": serialize_doc(suggestions)}

# ============= ADMIN ENDPOINTS =============

@app.get("/api/admin/users")
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_admin)
):
    users = await users_collection.find(
        {},
        {"password": 0, "gambling_history": 0}
    ).skip(skip).limit(limit).to_list(limit)
    total_count = await users_collection.count_documents({})
    return {
        "users": serialize_doc(users),
        "total": total_count,
        "skip": skip,
        "limit": limit
    }

@app.post("/api/admin/block-user/{user_id}")
async def block_user(
    user_id: str,
    reason: str = "Admin blocked",
    current_user: dict = Depends(get_current_admin)
):
    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "is_blocked": True,
                "blocked_reason": reason,
                "blocked_by_admin": ObjectId(current_user["_id"])
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User {user_id} has been blocked"}

@app.post("/api/admin/unblock-user/{user_id}")
async def unblock_user(
    user_id: str,
    current_user: dict = Depends(get_current_admin)
):
    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "is_blocked": False,
                "blocked_reason": None,
                "blocked_by_admin": None
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User {user_id} has been unblocked"}

@app.get("/api/admin/stats")
async def get_admin_stats(current_user: dict = Depends(get_current_admin)):
    total_users = await users_collection.count_documents({})
    active_subscriptions = await users_collection.count_documents({"subscription_status": "active"})
    blocked_users = await users_collection.count_documents({"is_blocked": True})
    total_messages = await messages_collection.count_documents({})
    
    return {
        "total_users": total_users,
        "active_subscriptions": active_subscriptions,
        "blocked_users": blocked_users,
        "total_messages": total_messages
    }

# ============= SETTINGS ENDPOINTS =============

@app.get("/api/settings/discord-link")
async def get_discord_link(current_user: dict = Depends(get_current_user)):
    settings = await settings_collection.find_one({"_id": "app_settings"})
    return {"discord_link": settings.get("discord_link", "")}

@app.put("/api/settings/discord-link")
async def update_discord_link(
    discord_link: str,
    current_user: dict = Depends(get_current_admin)
):
    await settings_collection.update_one(
        {"_id": "app_settings"},
        {"$set": {"discord_link": discord_link}}
    )
    return {"message": "Discord link updated"}

# ============= SOCKET.IO HANDLERS =============

# Active connections: {user_id: [sid]}
active_connections = {}

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.on("authenticate")
async def authenticate(sid, data):
    try:
        token = data.get("token")
        payload = decode_token(token)
        user_id = payload.get("sub")
        
        # Store user session
        await sio.save_session(sid, {"user_id": user_id})
        
        # Track connection
        if user_id not in active_connections:
            active_connections[user_id] = []
        active_connections[user_id].append(sid)
        
        # Get user info
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        
        await sio.emit("authenticated", {
            "user_id": user_id,
            "username": user.get("username")
        }, to=sid)
        
        logger.info(f"User {user_id} authenticated on socket {sid}")
        
    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        await sio.emit("error", {"message": "Authentication failed"}, to=sid)

@sio.on("join_community")
async def join_community(sid, data):
    session = await sio.get_session(sid)
    user_id = session.get("user_id")
    
    if not user_id:
        await sio.emit("error", {"message": "Not authenticated"}, to=sid)
        return
    
    # Join community room
    sio.enter_room(sid, "community")
    
    # Notify others
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    await sio.emit("user_joined", {
        "user_id": user_id,
        "username": user.get("username")
    }, room="community", skip_sid=sid)
    
    logger.info(f"User {user_id} joined community chat")

@sio.on("send_message")
async def send_message(sid, data):
    session = await sio.get_session(sid)
    user_id = session.get("user_id")
    
    if not user_id:
        await sio.emit("error", {"message": "Not authenticated"}, to=sid)
        return
    
    message_content = data.get("message", "").strip()
    if not message_content or len(message_content) > 2000:
        await sio.emit("error", {"message": "Invalid message"}, to=sid)
        return
    
    # Get user info
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    
    # Check if user is blocked
    if user.get("is_blocked", False):
        await sio.emit("error", {"message": "You are blocked from sending messages"}, to=sid)
        return
    
    # Save message to database
    message_doc = {
        "user_id": ObjectId(user_id),
        "username": user.get("username"),
        "message": message_content,
        "timestamp": datetime.utcnow(),
        "room": "community"
    }
    
    result = await messages_collection.insert_one(message_doc)
    
    # Broadcast to community room
    await sio.emit("new_message", {
        "message_id": str(result.inserted_id),
        "user_id": user_id,
        "username": user.get("username"),
        "message": message_content,
        "timestamp": datetime.utcnow().isoformat()
    }, room="community")
    
    logger.info(f"Message from {user_id}: {message_content[:50]}")

@sio.on("typing")
async def typing(sid, data):
    session = await sio.get_session(sid)
    user_id = session.get("user_id")
    
    if not user_id:
        return
    
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    
    await sio.emit("user_typing", {
        "user_id": user_id,
        "username": user.get("username")
    }, room="community", skip_sid=sid)

@sio.event
async def disconnect(sid):
    session = await sio.get_session(sid)
    user_id = session.get("user_id")
    
    if user_id and user_id in active_connections:
        if sid in active_connections[user_id]:
            active_connections[user_id].remove(sid)
        if not active_connections[user_id]:
            del active_connections[user_id]
    
    logger.info(f"Client disconnected: {sid}")

# Combine FastAPI and Socket.IO
socketio_app = socketio.ASGIApp(sio, app)

@app.get("/api/")
async def root():
    return {"message": "GambleFree Recovery API", "status": "running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(socketio_app, host="0.0.0.0", port=8001)
