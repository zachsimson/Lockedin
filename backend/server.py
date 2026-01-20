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
        "avatar_url": None
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

# ============= BLOCKING ENDPOINTS =============

@app.get("/api/blocking/domains")
async def get_blocked_domains(current_user: dict = Depends(get_current_user)):
    settings = await settings_collection.find_one({"_id": "app_settings"})
    return {"domains": settings.get("blocked_domains", [])}

@app.post("/api/blocking/enable")
async def enable_blocking(
    enabled: bool,
    current_user: dict = Depends(get_current_user)
):
    await users_collection.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {"blocking_enabled": enabled}}
    )
    return {"blocking_enabled": enabled}

@app.get("/api/blocking/status")
async def get_blocking_status(current_user: dict = Depends(get_current_user)):
    user = await users_collection.find_one({"_id": ObjectId(current_user["_id"])})
    return {
        "blocking_enabled": user.get("blocking_enabled", False),
        "is_blocked": user.get("is_blocked", False)
    }

# ============= ADMIN ENDPOINTS =============

@app.get("/api/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_admin)):
    users = await users_collection.find().to_list(1000)
    for user in users:
        user.pop("password", None)
    return {"users": serialize_doc(users)}

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
