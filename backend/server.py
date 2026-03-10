from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Any
from datetime import datetime, timezone, timedelta
from enum import Enum
from jose import JWTError, jwt
from passlib.context import CryptContext
import os
import logging
import uuid
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

SECRET_KEY = os.environ.get('JWT_SECRET', 'cleardeal-jwt-secret-key-2024')
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24 * 7

security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


# ============ ENUMS ============
class UserRole(str, Enum):
    OWNER = "owner"
    BRAND_MANAGER = "brand_manager"
    REP = "rep"


class CompanyType(str, Enum):
    BILLBOARD_OWNER = "billboard_owner"
    BRAND = "brand"


class BillboardStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    BOOKED = "booked"
    UNAVAILABLE = "unavailable"


class BillboardType(str, Enum):
    STATIC = "static"
    LED = "led"
    DIGITAL = "digital"
    FLEX = "flex"


class Illumination(str, Enum):
    FRONTLIT = "frontlit"
    BACKLIT = "backlit"
    UNLIT = "unlit"
    LED_INTERNAL = "led_internal"


class DealStatus(str, Enum):
    NEGOTIATING = "negotiating"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    PAYMENT_PENDING = "payment_pending"
    PAID = "paid"
    ACTIVE = "active"
    COMPLETED = "completed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class MessageType(str, Enum):
    OFFER = "offer"
    COUNTER_OFFER = "counter_offer"
    TEXT = "text"
    SYSTEM = "system"
    ACCEPTANCE = "acceptance"


# ============ PYDANTIC MODELS ============
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str
    role: UserRole


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class CompanyCreate(BaseModel):
    name: str
    gst_number: str
    director_name: str
    company_type: CompanyType
    city: str = "Hyderabad"
    address: str
    phone: str
    website: Optional[str] = None


class BankVerifyData(BaseModel):
    account_number: str
    ifsc_code: str
    account_holder_name: str


class AadhaarVerifyData(BaseModel):
    aadhaar_number: str
    director_name: str


class BillboardCreate(BaseModel):
    title: str
    address: str
    lat: float
    lng: float
    dimensions_width: float
    dimensions_height: float
    board_type: BillboardType
    illumination: Illumination
    facing: str
    base_monthly_rate: float
    min_booking_period: int = 1
    available_from: str
    min_acceptable_price: Optional[float] = None
    max_rep_discount_percent: Optional[float] = None
    photos: Optional[List[str]] = []
    description: Optional[str] = None


class BillboardStatusUpdate(BaseModel):
    status: str


class DealCreate(BaseModel):
    billboard_id: str
    booking_start_date: str
    booking_end_date: str
    initial_offer: float
    message: Optional[str] = None


class MessageCreate(BaseModel):
    message_type: MessageType
    amount: Optional[float] = None
    message: Optional[str] = None


class RepInvite(BaseModel):
    email: EmailStr
    full_name: str


# ============ AUTH HELPERS ============
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode({"sub": user_id, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def safe_user(user: dict) -> dict:
    return {k: v for k, v in user.items() if k not in ["_id", "password_hash"]}


# ============ HARDCODED BENCHMARKS ============
HARDCODED_BENCHMARKS = {
    "hitech": {"min": 80000, "max": 120000, "label": "Hitech City"},
    "banjara": {"min": 60000, "max": 100000, "label": "Banjara Hills"},
    "gachibowli": {"min": 50000, "max": 90000, "label": "Gachibowli"},
    "jubilee": {"min": 70000, "max": 110000, "label": "Jubilee Hills"},
    "madhapur": {"min": 40000, "max": 80000, "label": "Madhapur"},
    "kondapur": {"min": 35000, "max": 65000, "label": "Kondapur"},
    "kukatpally": {"min": 25000, "max": 55000, "label": "Kukatpally"},
    "secunderabad": {"min": 30000, "max": 60000, "label": "Secunderabad"},
    "default": {"min": 30000, "max": 70000, "label": "Hyderabad"}
}


# ============ NOTIFICATION HELPER ============
async def create_notification(user_id: str, notif_type: str, title: str, message: str, deal_id: Optional[str] = None):
    try:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": notif_type,
            "title": title,
            "message": message,
            "deal_id": deal_id,
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    except Exception as e:
        logger.error(f"Notification error: {e}")


# ============ AUTH ROUTES ============
@api_router.post("/auth/register")
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "full_name": data.full_name,
        "phone": data.phone,
        "role": data.role,
        "company_id": None,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id)
    return {"token": token, "user": safe_user(user_doc)}


@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"])
    return {"token": token, "user": safe_user(user)}


@api_router.get("/auth/me")
async def get_me(current_user=Depends(get_current_user)):
    return safe_user(current_user)


# ============ COMPANY ROUTES ============
@api_router.post("/companies")
async def create_company(data: CompanyCreate, current_user=Depends(get_current_user)):
    if current_user.get("company_id"):
        raise HTTPException(status_code=400, detail="User already has a company")

    company_id = str(uuid.uuid4())
    company_doc = {
        "id": company_id,
        "name": data.name,
        "gst_number": data.gst_number,
        "director_name": data.director_name,
        "company_type": data.company_type,
        "city": data.city,
        "address": data.address,
        "phone": data.phone,
        "website": data.website,
        "gst_verified": False,
        "aadhaar_verified": False,
        "bank_verified": False,
        "bank_account": None,
        "verified_badge": False,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.companies.insert_one(company_doc)
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"company_id": company_id}})
    company_doc.pop("_id", None)
    return company_doc


@api_router.get("/companies/me")
async def get_my_company(current_user=Depends(get_current_user)):
    if not current_user.get("company_id"):
        raise HTTPException(status_code=404, detail="No company found")
    company = await db.companies.find_one({"id": current_user["company_id"]}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@api_router.post("/companies/verify-gst")
async def verify_gst(current_user=Depends(get_current_user)):
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="No company found")
    await db.companies.update_one({"id": company_id}, {"$set": {"gst_verified": True}})
    return {"success": True, "message": "GST verified successfully (simulated)"}


@api_router.post("/companies/verify-aadhaar")
async def verify_aadhaar(data: AadhaarVerifyData, current_user=Depends(get_current_user)):
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="No company found")
    await db.companies.update_one({"id": company_id}, {"$set": {"aadhaar_verified": True}})
    return {"success": True, "message": "Aadhaar verified via DigiLocker (simulated)"}


@api_router.post("/companies/verify-bank")
async def verify_bank(data: BankVerifyData, current_user=Depends(get_current_user)):
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="No company found")
    await db.companies.update_one(
        {"id": company_id},
        {"$set": {
            "bank_verified": True,
            "bank_account": {
                "account_number_masked": f"XXXX{data.account_number[-4:]}",
                "ifsc_code": data.ifsc_code,
                "account_holder_name": data.account_holder_name
            },
            "verified_badge": True
        }}
    )
    return {"success": True, "message": "Bank account verified via penny-drop (simulated)"}


@api_router.post("/companies/invite-rep")
async def invite_rep(data: RepInvite, current_user=Depends(get_current_user)):
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="No company found")

    existing_user = await db.users.find_one({"email": data.email})
    if existing_user:
        await db.users.update_one(
            {"email": data.email},
            {"$set": {"company_id": company_id, "role": "rep"}}
        )
        return {"success": True, "message": f"Existing user {data.full_name} linked as rep"}

    invite_id = str(uuid.uuid4())
    invite_doc = {
        "id": invite_id,
        "company_id": company_id,
        "email": data.email,
        "full_name": data.full_name,
        "invited_by": current_user["id"],
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.invites.insert_one(invite_doc)
    return {"success": True, "invite_id": invite_id, "invite_link": f"/invite/{invite_id}", "message": f"Invite created for {data.email}"}


@api_router.get("/companies/{company_id}/reps")
async def get_company_reps(company_id: str, current_user=Depends(get_current_user)):
    reps = await db.users.find(
        {"company_id": company_id, "role": "rep"},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    return reps


# ============ BILLBOARD ROUTES ============
@api_router.post("/billboards")
async def create_billboard(data: BillboardCreate, current_user=Depends(get_current_user)):
    if current_user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Only billboard owners can create listings")
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="Please complete company setup first")

    billboard_id = str(uuid.uuid4())
    billboard_doc = {
        "id": billboard_id,
        "title": data.title,
        "address": data.address,
        "lat": data.lat,
        "lng": data.lng,
        "dimensions": {
            "width": data.dimensions_width,
            "height": data.dimensions_height,
            "sqft": round(data.dimensions_width * data.dimensions_height, 2)
        },
        "board_type": data.board_type,
        "illumination": data.illumination,
        "facing": data.facing,
        "base_monthly_rate": data.base_monthly_rate,
        "min_booking_period": data.min_booking_period,
        "available_from": data.available_from,
        "min_acceptable_price": data.min_acceptable_price,
        "max_rep_discount_percent": data.max_rep_discount_percent,
        "photos": data.photos or [],
        "description": data.description,
        "status": BillboardStatus.DRAFT,
        "owner_company_id": company_id,
        "owner_id": current_user["id"],
        "view_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.billboards.insert_one(billboard_doc)
    billboard_doc.pop("_id", None)
    return billboard_doc


@api_router.get("/billboards/my")
async def get_my_billboards(current_user=Depends(get_current_user)):
    company_id = current_user.get("company_id")
    if not company_id:
        return []
    billboards = await db.billboards.find({"owner_company_id": company_id}, {"_id": 0}).to_list(200)
    return billboards


@api_router.get("/billboards")
async def search_billboards(
    area: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    board_type: Optional[str] = None,
    illumination: Optional[str] = None,
    status: Optional[str] = "active",
    current_user=Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if area:
        query["address"] = {"$regex": area, "$options": "i"}
    if board_type:
        query["board_type"] = board_type
    if illumination:
        query["illumination"] = illumination
    if min_price or max_price:
        price_q = {}
        if min_price:
            price_q["$gte"] = min_price
        if max_price:
            price_q["$lte"] = max_price
        query["base_monthly_rate"] = price_q

    billboards = await db.billboards.find(
        query,
        {"_id": 0, "min_acceptable_price": 0, "max_rep_discount_percent": 0}
    ).to_list(200)
    return billboards


@api_router.get("/billboards/{billboard_id}")
async def get_billboard(billboard_id: str, current_user=Depends(get_current_user)):
    billboard = await db.billboards.find_one({"id": billboard_id}, {"_id": 0})
    if not billboard:
        raise HTTPException(status_code=404, detail="Billboard not found")
    await db.billboards.update_one({"id": billboard_id}, {"$inc": {"view_count": 1}})
    if current_user.get("company_id") != billboard.get("owner_company_id"):
        billboard.pop("min_acceptable_price", None)
        billboard.pop("max_rep_discount_percent", None)
    return billboard


@api_router.put("/billboards/{billboard_id}/status")
async def update_billboard_status(billboard_id: str, data: BillboardStatusUpdate, current_user=Depends(get_current_user)):
    billboard = await db.billboards.find_one({"id": billboard_id})
    if not billboard:
        raise HTTPException(status_code=404, detail="Billboard not found")
    if billboard["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.billboards.update_one({"id": billboard_id}, {"$set": {"status": data.status}})
    return {"success": True, "status": data.status}


# ============ DEAL ROUTES ============
@api_router.post("/deals")
async def create_deal(data: DealCreate, current_user=Depends(get_current_user)):
    if current_user["role"] not in ["rep", "brand_manager"]:
        raise HTTPException(status_code=403, detail="Only brand reps/managers can initiate deals")
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="Complete company registration first")

    billboard = await db.billboards.find_one({"id": data.billboard_id}, {"_id": 0})
    if not billboard:
        raise HTTPException(status_code=404, detail="Billboard not found")
    if billboard["status"] != "active":
        raise HTTPException(status_code=400, detail="Billboard is not available for deals")

    # Price band enforcement for reps
    if current_user["role"] == "rep" and billboard.get("min_acceptable_price"):
        if data.initial_offer < billboard["min_acceptable_price"]:
            raise HTTPException(
                status_code=400,
                detail=f"Offer ₹{data.initial_offer:,.0f} is below minimum band ₹{billboard['min_acceptable_price']:,.0f}/month"
            )

    deal_id = str(uuid.uuid4())
    deal_doc = {
        "id": deal_id,
        "billboard_id": data.billboard_id,
        "billboard_title": billboard["title"],
        "billboard_address": billboard["address"],
        "buyer_company_id": company_id,
        "seller_company_id": billboard["owner_company_id"],
        "rep_id": current_user["id"],
        "booking_start_date": data.booking_start_date,
        "booking_end_date": data.booking_end_date,
        "current_offer": data.initial_offer,
        "final_price": None,
        "status": DealStatus.NEGOTIATING,
        "platform_commission_pct": 6.0,
        "rep_commission_pct": 4.0,
        "buyer_approved": False,
        "seller_approved": False,
        "payment_reference": None,
        "invoice_number": None,
        "commission_breakdown": None,
        "paid_at": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.deals.insert_one(deal_doc)

    # Initial offer message
    await db.negotiation_messages.insert_one({
        "id": str(uuid.uuid4()),
        "deal_id": deal_id,
        "sender_id": current_user["id"],
        "sender_name": current_user["full_name"],
        "sender_role": current_user["role"],
        "message_type": MessageType.OFFER,
        "amount": data.initial_offer,
        "message": data.message or f"Initial offer of ₹{data.initial_offer:,.0f}/month",
        "is_accepted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    deal_doc.pop("_id", None)
    # Notify billboard owner of new offer
    owner_users = await db.users.find(
        {"company_id": billboard["owner_company_id"]}, {"_id": 0, "id": 1}
    ).to_list(10)
    for ou in owner_users:
        await create_notification(ou["id"], "new_offer", "New Offer Received",
            f"New offer of ₹{data.initial_offer:,.0f}/month for {billboard['title']}", deal_id)
    return deal_doc


@api_router.get("/deals")
async def get_deals(current_user=Depends(get_current_user)):
    company_id = current_user.get("company_id")
    user_id = current_user["id"]
    role = current_user["role"]

    if role == "owner":
        deals = await db.deals.find({"seller_company_id": company_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    elif role == "brand_manager":
        deals = await db.deals.find({"buyer_company_id": company_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    else:  # rep
        deals = await db.deals.find(
            {"$or": [{"rep_id": user_id}, {"buyer_company_id": company_id}]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
    return deals


@api_router.get("/deals/{deal_id}")
async def get_deal(deal_id: str, current_user=Depends(get_current_user)):
    deal = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    company_id = current_user.get("company_id")
    has_access = (
        deal["seller_company_id"] == company_id or
        deal["buyer_company_id"] == company_id or
        deal["rep_id"] == current_user["id"]
    )
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    return deal


@api_router.post("/deals/{deal_id}/messages")
async def send_message(deal_id: str, data: MessageCreate, current_user=Depends(get_current_user)):
    deal = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    company_id = current_user.get("company_id")
    has_access = (
        deal["seller_company_id"] == company_id or
        deal["buyer_company_id"] == company_id or
        deal["rep_id"] == current_user["id"]
    )
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    if deal["status"] not in ["negotiating", "pending_approval"]:
        raise HTTPException(status_code=400, detail="Deal is not in negotiating state")

    # Price band check for reps
    if data.message_type in ["offer", "counter_offer"] and data.amount:
        if current_user["role"] == "rep":
            billboard = await db.billboards.find_one({"id": deal["billboard_id"]}, {"_id": 0})
            if billboard and billboard.get("min_acceptable_price") and data.amount < billboard["min_acceptable_price"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Offer below price band minimum ₹{billboard['min_acceptable_price']:,.0f}"
                )

    msg_doc = {
        "id": str(uuid.uuid4()),
        "deal_id": deal_id,
        "sender_id": current_user["id"],
        "sender_name": current_user["full_name"],
        "sender_role": current_user["role"],
        "message_type": data.message_type,
        "amount": data.amount,
        "message": data.message,
        "is_accepted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.negotiation_messages.insert_one(msg_doc)

    if data.message_type in ["offer", "counter_offer"] and data.amount:
        await db.deals.update_one(
            {"id": deal_id},
            {"$set": {"current_offer": data.amount, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    msg_doc.pop("_id", None)
    return msg_doc


@api_router.get("/deals/{deal_id}/messages")
async def get_messages(deal_id: str, current_user=Depends(get_current_user)):
    deal = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    messages = await db.negotiation_messages.find(
        {"deal_id": deal_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    return messages


@api_router.post("/deals/{deal_id}/accept-offer")
async def accept_offer(deal_id: str, current_user=Depends(get_current_user)):
    deal = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    if deal["status"] != "negotiating":
        raise HTTPException(status_code=400, detail="Deal is not in negotiating state")

    await db.deals.update_one(
        {"id": deal_id},
        {"$set": {
            "status": DealStatus.PENDING_APPROVAL,
            "final_price": deal["current_offer"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    await db.negotiation_messages.insert_one({
        "id": str(uuid.uuid4()),
        "deal_id": deal_id,
        "sender_id": current_user["id"],
        "sender_name": current_user["full_name"],
        "sender_role": current_user["role"],
        "message_type": MessageType.ACCEPTANCE,
        "amount": deal["current_offer"],
        "message": f"Offer of ₹{deal['current_offer']:,.0f}/month accepted. Pending owner approvals.",
        "is_accepted": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"success": True, "status": "pending_approval", "final_price": deal["current_offer"]}


@api_router.post("/deals/{deal_id}/approve")
async def approve_deal(deal_id: str, current_user=Depends(get_current_user)):
    deal = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    if deal["status"] != "pending_approval":
        raise HTTPException(status_code=400, detail="Deal is not pending approval")

    company_id = current_user.get("company_id")
    update_data = {}
    if company_id == deal["buyer_company_id"]:
        update_data["buyer_approved"] = True
    elif company_id == deal["seller_company_id"]:
        update_data["seller_approved"] = True
    else:
        raise HTTPException(status_code=403, detail="Not authorized to approve this deal")

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.deals.update_one({"id": deal_id}, {"$set": update_data})

    updated = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    if updated["buyer_approved"] and updated["seller_approved"]:
        await db.deals.update_one(
            {"id": deal_id},
            {"$set": {"status": DealStatus.APPROVED, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"success": True, "fully_approved": True, "status": "approved"}
    return {"success": True, "fully_approved": False, "status": "partial_approval"}


@api_router.post("/deals/{deal_id}/reject")
async def reject_deal(deal_id: str, current_user=Depends(get_current_user)):
    deal = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    company_id = current_user.get("company_id")
    has_access = (company_id == deal["seller_company_id"] or company_id == deal["buyer_company_id"])
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    await db.deals.update_one(
        {"id": deal_id},
        {"$set": {
            "status": DealStatus.NEGOTIATING,
            "buyer_approved": False,
            "seller_approved": False,
            "final_price": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    await db.negotiation_messages.insert_one({
        "id": str(uuid.uuid4()),
        "deal_id": deal_id,
        "sender_id": current_user["id"],
        "sender_name": current_user["full_name"],
        "sender_role": current_user["role"],
        "message_type": MessageType.SYSTEM,
        "amount": None,
        "message": "Deal rejected. Negotiation re-opened.",
        "is_accepted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"success": True, "status": "negotiating"}


@api_router.post("/deals/{deal_id}/pay")
async def process_payment(deal_id: str, current_user=Depends(get_current_user)):
    deal = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    if deal["status"] != "approved":
        raise HTTPException(status_code=400, detail="Deal must be approved before payment")

    final_price = deal["final_price"]
    platform_commission = round(final_price * (deal["platform_commission_pct"] / 100), 2)
    rep_commission = round(final_price * (deal["rep_commission_pct"] / 100), 2)
    seller_amount = round(final_price - platform_commission - rep_commission, 2)
    invoice_number = f"INV-{datetime.now(timezone.utc).strftime('%Y%m')}-{deal_id[:8].upper()}"

    await db.deals.update_one(
        {"id": deal_id},
        {"$set": {
            "status": DealStatus.PAID,
            "payment_reference": f"PAY-{str(uuid.uuid4())[:8].upper()}",
            "invoice_number": invoice_number,
            "commission_breakdown": {
                "total": final_price,
                "platform_commission": platform_commission,
                "rep_commission": rep_commission,
                "seller_amount": seller_amount
            },
            "paid_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    # Mark billboard as booked
    await db.billboards.update_one({"id": deal["billboard_id"]}, {"$set": {"status": "booked"}})

    return {
        "success": True,
        "invoice_number": invoice_number,
        "breakdown": {
            "total": final_price,
            "platform_commission": platform_commission,
            "rep_commission": rep_commission,
            "seller_receives": seller_amount
        }
    }


@api_router.get("/deals/{deal_id}/invoice")
async def get_invoice(deal_id: str, current_user=Depends(get_current_user)):
    deal = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    if deal["status"] not in ["paid", "active", "completed"]:
        raise HTTPException(status_code=400, detail="Invoice not yet available")
    company_id = current_user.get("company_id")
    if company_id not in [deal["seller_company_id"], deal["buyer_company_id"]]:
        raise HTTPException(status_code=403, detail="Access denied")

    buyer_company = await db.companies.find_one({"id": deal["buyer_company_id"]}, {"_id": 0})
    seller_company = await db.companies.find_one({"id": deal["seller_company_id"]}, {"_id": 0})
    billboard = await db.billboards.find_one({"id": deal["billboard_id"]}, {"_id": 0, "min_acceptable_price": 0, "max_rep_discount_percent": 0})

    return {
        "invoice_number": deal.get("invoice_number"),
        "deal": deal,
        "buyer": buyer_company,
        "seller": seller_company,
        "billboard": billboard,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


# ============ DASHBOARD ROUTES ============
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user=Depends(get_current_user)):
    company_id = current_user.get("company_id")
    user_id = current_user["id"]
    role = current_user["role"]

    if role == "owner":
        billboards = await db.billboards.find({"owner_company_id": company_id}, {"_id": 0}).to_list(200)
        deals = await db.deals.find({"seller_company_id": company_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
        total_revenue = sum(
            d.get("commission_breakdown", {}).get("seller_amount", 0) or 0
            for d in deals if d.get("status") in ["paid", "active", "completed"]
        )
        return {
            "role": "owner",
            "total_billboards": len(billboards),
            "active_billboards": len([b for b in billboards if b["status"] == "active"]),
            "booked_billboards": len([b for b in billboards if b["status"] == "booked"]),
            "occupancy_rate": round((len([b for b in billboards if b["status"] == "booked"]) / len(billboards) * 100) if billboards else 0, 1),
            "total_deals": len(deals),
            "active_deals": len([d for d in deals if d["status"] in ["negotiating", "pending_approval", "approved"]]),
            "completed_deals": len([d for d in deals if d["status"] in ["paid", "active", "completed"]]),
            "total_revenue": total_revenue,
            "recent_deals": deals[:5],
            "billboards": billboards
        }
    elif role == "brand_manager":
        deals = await db.deals.find({"buyer_company_id": company_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
        total_spend = sum(
            d.get("final_price", 0) or 0
            for d in deals if d.get("status") in ["paid", "active", "completed"]
        )
        return {
            "role": "brand_manager",
            "total_deals": len(deals),
            "active_negotiations": len([d for d in deals if d["status"] in ["negotiating", "pending_approval"]]),
            "approved_deals": len([d for d in deals if d["status"] == "approved"]),
            "total_spend": total_spend,
            "recent_deals": deals[:5]
        }
    else:  # rep
        deals = await db.deals.find({"rep_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
        total_commission = sum(
            (d.get("commission_breakdown", {}).get("rep_commission", 0) or 0)
            for d in deals if d.get("status") in ["paid", "active", "completed"]
        )
        return {
            "role": "rep",
            "total_deals": len(deals),
            "active_deals": len([d for d in deals if d["status"] in ["negotiating", "pending_approval"]]),
            "completed_deals": len([d for d in deals if d["status"] in ["paid", "completed"]]),
            "total_commission_earned": total_commission,
            "recent_deals": deals[:5]
        }


# ============ INVITE ROUTES ============
@api_router.get("/invites/{invite_id}")
async def get_invite(invite_id: str):
    invite = await db.invites.find_one({"id": invite_id}, {"_id": 0})
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found or expired")
    return invite


@api_router.post("/invites/{invite_id}/accept")
async def accept_invite(invite_id: str, data: dict):
    invite = await db.invites.find_one({"id": invite_id}, {"_id": 0})
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    if invite["status"] != "pending":
        raise HTTPException(status_code=400, detail="Invite already used")

    existing = await db.users.find_one({"email": invite["email"]})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": invite["email"],
        "password_hash": hash_password(data.get("password", "")),
        "full_name": invite["full_name"],
        "phone": data.get("phone", ""),
        "role": "rep",
        "company_id": invite["company_id"],
        "invited_by": invite["invited_by"],
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    await db.invites.update_one({"id": invite_id}, {"$set": {"status": "accepted", "accepted_by": user_id}})
    token = create_token(user_id)
    return {"token": token, "user": safe_user(user_doc)}


# ============ NEW V2 MODELS ============
class RepSettings(BaseModel):
    price_band_min: Optional[float] = None
    price_band_max: Optional[float] = None
    budget_ceiling: Optional[float] = None
    deal_approval_mode: str = "auto"
    commission_visibility: bool = True
    is_active: bool = True


class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    billboard_ids: List[str]
    campaign_start_date: str
    campaign_end_date: str
    total_budget: float


class DisputeCreate(BaseModel):
    reason: str
    description: str


class ThreadLockData(BaseModel):
    reason: Optional[str] = "Thread locked by manager"


# ============ MANAGER REP CONTROLS (A) ============
@api_router.put("/companies/reps/{rep_id}/settings")
async def update_rep_settings(rep_id: str, data: RepSettings, current_user=Depends(get_current_user)):
    if current_user["role"] == "rep":
        raise HTTPException(status_code=403, detail="Only managers can update rep settings")
    company_id = current_user.get("company_id")
    rep = await db.users.find_one({"id": rep_id, "company_id": company_id}, {"_id": 0})
    if not rep:
        raise HTTPException(status_code=404, detail="Rep not found in your company")
    await db.users.update_one(
        {"id": rep_id},
        {"$set": {
            "price_band_min": data.price_band_min,
            "price_band_max": data.price_band_max,
            "budget_ceiling": data.budget_ceiling,
            "deal_approval_mode": data.deal_approval_mode,
            "commission_visibility": data.commission_visibility,
            "is_active": data.is_active
        }}
    )
    return {"success": True, "message": "Rep settings updated"}


@api_router.post("/companies/reps/{rep_id}/deactivate")
async def deactivate_rep(rep_id: str, current_user=Depends(get_current_user)):
    if current_user["role"] == "rep":
        raise HTTPException(status_code=403, detail="Only managers can deactivate reps")
    company_id = current_user.get("company_id")
    rep = await db.users.find_one({"id": rep_id, "company_id": company_id})
    if not rep:
        raise HTTPException(status_code=404, detail="Rep not found")
    await db.users.update_one({"id": rep_id}, {"$set": {"is_active": False}})
    return {"success": True, "message": "Rep deactivated"}


@api_router.post("/companies/reps/{rep_id}/activate")
async def activate_rep(rep_id: str, current_user=Depends(get_current_user)):
    if current_user["role"] == "rep":
        raise HTTPException(status_code=403, detail="Only managers can activate reps")
    company_id = current_user.get("company_id")
    rep = await db.users.find_one({"id": rep_id, "company_id": company_id})
    if not rep:
        raise HTTPException(status_code=404, detail="Rep not found")
    await db.users.update_one({"id": rep_id}, {"$set": {"is_active": True}})
    return {"success": True, "message": "Rep activated"}


# ============ CONTRACT ROUTES (F1) ============
@api_router.get("/deals/{deal_id}/contract")
async def get_contract(deal_id: str, current_user=Depends(get_current_user)):
    deal = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    if deal["status"] not in ["pending_approval", "approved", "paid", "active", "completed"]:
        raise HTTPException(status_code=400, detail="Contract not available at this stage")
    company_id = current_user.get("company_id")
    has_access = (company_id in [deal["seller_company_id"], deal["buyer_company_id"]] or deal["rep_id"] == current_user["id"])
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    buyer = await db.companies.find_one({"id": deal["buyer_company_id"]}, {"_id": 0})
    seller = await db.companies.find_one({"id": deal["seller_company_id"]}, {"_id": 0})
    billboard = await db.billboards.find_one({"id": deal["billboard_id"]}, {"_id": 0, "min_acceptable_price": 0, "max_rep_discount_percent": 0})
    rep = await db.users.find_one({"id": deal["rep_id"]}, {"_id": 0, "password_hash": 0})
    return {
        "contract_number": f"CD-{deal_id[:8].upper()}",
        "deal": deal,
        "buyer": buyer,
        "seller": seller,
        "billboard": billboard,
        "rep": rep,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


@api_router.post("/deals/{deal_id}/sign")
async def sign_contract(deal_id: str, current_user=Depends(get_current_user)):
    deal = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    if deal["status"] not in ["pending_approval", "approved"]:
        raise HTTPException(status_code=400, detail="Cannot sign at this stage")
    if current_user["role"] == "rep":
        raise HTTPException(status_code=403, detail="Only Org Managers can sign contracts")
    company_id = current_user.get("company_id")
    update_data = {}
    if company_id == deal["buyer_company_id"]:
        update_data["buyer_signed"] = True
        update_data["buyer_signed_at"] = datetime.now(timezone.utc).isoformat()
        update_data["buyer_signed_by"] = current_user["full_name"]
    elif company_id == deal["seller_company_id"]:
        update_data["seller_signed"] = True
        update_data["seller_signed_at"] = datetime.now(timezone.utc).isoformat()
        update_data["seller_signed_by"] = current_user["full_name"]
    else:
        raise HTTPException(status_code=403, detail="Not authorized to sign this contract")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.deals.update_one({"id": deal_id}, {"$set": update_data})
    return {"success": True, "message": "Contract digitally signed"}


# ============ THREAD LOCK ROUTES (F2) ============
@api_router.post("/deals/{deal_id}/lock")
async def lock_thread(deal_id: str, data: ThreadLockData, current_user=Depends(get_current_user)):
    deal = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    company_id = current_user.get("company_id")
    if company_id not in [deal["seller_company_id"], deal["buyer_company_id"]]:
        raise HTTPException(status_code=403, detail="Access denied")
    await db.deals.update_one(
        {"id": deal_id},
        {"$set": {
            "thread_locked": True,
            "lock_reason": data.reason,
            "locked_at": datetime.now(timezone.utc).isoformat(),
            "locked_by": current_user["full_name"]
        }}
    )
    await db.negotiation_messages.insert_one({
        "id": str(uuid.uuid4()),
        "deal_id": deal_id,
        "sender_id": current_user["id"],
        "sender_name": current_user["full_name"],
        "sender_role": current_user["role"],
        "message_type": "system",
        "amount": None,
        "message": f"Thread LOCKED by {current_user['full_name']}: {data.reason}",
        "is_accepted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"success": True}


@api_router.post("/deals/{deal_id}/unlock")
async def unlock_thread(deal_id: str, current_user=Depends(get_current_user)):
    deal = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    company_id = current_user.get("company_id")
    if company_id not in [deal["seller_company_id"], deal["buyer_company_id"]]:
        raise HTTPException(status_code=403, detail="Access denied")
    await db.deals.update_one({"id": deal_id}, {"$set": {"thread_locked": False}})
    return {"success": True}


# ============ BENCHMARK ROUTES (F3) ============
@api_router.get("/benchmarks")
async def get_benchmarks(area: Optional[str] = None, current_user=Depends(get_current_user)):
    query = {"status": {"$in": ["paid", "active", "completed"]}}
    if area:
        query["billboard_address"] = {"$regex": area, "$options": "i"}
    deals = await db.deals.find(query, {"_id": 0, "final_price": 1, "billboard_address": 1, "created_at": 1}).to_list(500)
    prices = [d["final_price"] for d in deals if d.get("final_price")]
    area_lower = area.lower() if area else ""
    hardcoded = next(
        (v for k, v in HARDCODED_BENCHMARKS.items() if area_lower and k in area_lower),
        HARDCODED_BENCHMARKS["default"]
    )
    return {
        "area": area or "All Hyderabad",
        "data_points": len(prices),
        "avg_price": round(sum(prices) / len(prices)) if prices else None,
        "min_price": min(prices) if prices else hardcoded["min"],
        "max_price": max(prices) if prices else hardcoded["max"],
        "hardcoded_range": hardcoded,
        "all_benchmarks": HARDCODED_BENCHMARKS
    }


# ============ REP PERFORMANCE ROUTES (F4) ============
@api_router.get("/reps/my-performance")
async def get_my_performance(current_user=Depends(get_current_user)):
    user_id = current_user["id"]
    deals = await db.deals.find({"rep_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    completed = [d for d in deals if d["status"] in ["paid", "completed"]]
    total_commission = sum(d.get("commission_breakdown", {}).get("rep_commission", 0) or 0 for d in completed)
    total_deal_value = sum(d.get("final_price", 0) or 0 for d in completed)
    return {
        "user_id": user_id,
        "full_name": current_user["full_name"],
        "email": current_user["email"],
        "is_active": current_user.get("is_active", True),
        "price_band_min": current_user.get("price_band_min"),
        "price_band_max": current_user.get("price_band_max"),
        "budget_ceiling": current_user.get("budget_ceiling"),
        "total_deals": len(deals),
        "completed_deals": len(completed),
        "active_deals": len([d for d in deals if d["status"] in ["negotiating", "pending_approval"]]),
        "win_rate": round(len(completed) / len(deals) * 100, 1) if deals else 0,
        "total_commission_earned": total_commission,
        "total_deal_value": total_deal_value,
        "avg_deal_value": round(total_deal_value / len(completed)) if completed else 0,
        "recent_deals": deals[:10]
    }


@api_router.get("/reps/{rep_id}/performance")
async def get_rep_performance(rep_id: str, current_user=Depends(get_current_user)):
    company_id = current_user.get("company_id")
    rep = await db.users.find_one({"id": rep_id}, {"_id": 0, "password_hash": 0})
    if not rep:
        raise HTTPException(status_code=404, detail="Rep not found")
    is_own = (rep_id == current_user["id"])
    is_manager = (rep.get("company_id") == company_id and current_user["role"] != "rep")
    if not (is_own or is_manager):
        raise HTTPException(status_code=403, detail="Access denied")
    deals = await db.deals.find({"rep_id": rep_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    completed = [d for d in deals if d["status"] in ["paid", "completed"]]
    total_commission = sum(d.get("commission_breakdown", {}).get("rep_commission", 0) or 0 for d in completed)
    total_deal_value = sum(d.get("final_price", 0) or 0 for d in completed)
    return {
        "user_id": rep_id,
        "full_name": rep["full_name"],
        "email": rep["email"],
        "phone": rep.get("phone"),
        "is_active": rep.get("is_active", True),
        "price_band_min": rep.get("price_band_min"),
        "price_band_max": rep.get("price_band_max"),
        "budget_ceiling": rep.get("budget_ceiling"),
        "deal_approval_mode": rep.get("deal_approval_mode", "auto"),
        "total_deals": len(deals),
        "completed_deals": len(completed),
        "active_deals": len([d for d in deals if d["status"] in ["negotiating", "pending_approval"]]),
        "win_rate": round(len(completed) / len(deals) * 100, 1) if deals else 0,
        "total_commission_earned": total_commission,
        "total_deal_value": total_deal_value,
        "avg_deal_value": round(total_deal_value / len(completed)) if completed else 0,
        "recent_deals": deals[:5]
    }


# ============ AVAILABILITY ROUTES (F7) ============
@api_router.get("/billboards/{billboard_id}/availability")
async def get_availability(billboard_id: str, current_user=Depends(get_current_user)):
    billboard = await db.billboards.find_one({"id": billboard_id}, {"_id": 0})
    if not billboard:
        raise HTTPException(status_code=404, detail="Billboard not found")
    deals = await db.deals.find(
        {"billboard_id": billboard_id, "status": {"$in": ["approved", "paid", "active"]}},
        {"_id": 0, "booking_start_date": 1, "booking_end_date": 1, "status": 1}
    ).to_list(100)
    return {
        "billboard_id": billboard_id,
        "available_from": billboard.get("available_from"),
        "current_status": billboard["status"],
        "booked_ranges": [
            {"start": d["booking_start_date"], "end": d["booking_end_date"], "status": d["status"]}
            for d in deals
        ]
    }


# ============ CAMPAIGN ROUTES (F6) ============
@api_router.post("/campaigns")
async def create_campaign(data: CampaignCreate, current_user=Depends(get_current_user)):
    if current_user["role"] not in ["brand_manager", "rep"]:
        raise HTTPException(status_code=403, detail="Only brand teams can create campaigns")
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="Complete company setup first")
    campaign_id = str(uuid.uuid4())
    campaign_doc = {
        "id": campaign_id,
        "name": data.name,
        "description": data.description,
        "billboard_ids": data.billboard_ids,
        "campaign_start_date": data.campaign_start_date,
        "campaign_end_date": data.campaign_end_date,
        "total_budget": data.total_budget,
        "buyer_company_id": company_id,
        "created_by": current_user["id"],
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.campaigns.insert_one(campaign_doc)
    campaign_doc.pop("_id", None)
    return campaign_doc


@api_router.get("/campaigns")
async def get_campaigns(current_user=Depends(get_current_user)):
    company_id = current_user.get("company_id")
    if not company_id:
        return []
    campaigns = await db.campaigns.find({"buyer_company_id": company_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return campaigns


@api_router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str, current_user=Depends(get_current_user)):
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    company_id = current_user.get("company_id")
    if campaign["buyer_company_id"] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    billboards = []
    for bid in campaign.get("billboard_ids", []):
        bb = await db.billboards.find_one({"id": bid}, {"_id": 0, "min_acceptable_price": 0, "max_rep_discount_percent": 0})
        if bb:
            billboards.append(bb)
    deals = await db.deals.find(
        {"billboard_id": {"$in": campaign.get("billboard_ids", [])}, "buyer_company_id": company_id},
        {"_id": 0}
    ).to_list(100)
    return {**campaign, "billboards": billboards, "deals": deals}


# ============ DISPUTE ROUTES (F5) ============
@api_router.post("/deals/{deal_id}/dispute")
async def raise_dispute(deal_id: str, data: DisputeCreate, current_user=Depends(get_current_user)):
    deal = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    if deal["status"] not in ["paid", "active", "completed"]:
        raise HTTPException(status_code=400, detail="Disputes can only be raised on paid/active deals")
    company_id = current_user.get("company_id")
    if company_id not in [deal["seller_company_id"], deal["buyer_company_id"]]:
        raise HTTPException(status_code=403, detail="Access denied")
    if deal.get("has_dispute"):
        raise HTTPException(status_code=400, detail="A dispute is already open for this deal")
    dispute_id = str(uuid.uuid4())
    dispute_doc = {
        "id": dispute_id,
        "deal_id": deal_id,
        "raised_by": current_user["id"],
        "raised_by_name": current_user["full_name"],
        "raised_by_company": company_id,
        "reason": data.reason,
        "description": data.description,
        "status": "open",
        "resolution": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.disputes.insert_one(dispute_doc)
    await db.deals.update_one({"id": deal_id}, {"$set": {"dispute_id": dispute_id, "has_dispute": True}})
    await db.negotiation_messages.insert_one({
        "id": str(uuid.uuid4()),
        "deal_id": deal_id,
        "sender_id": current_user["id"],
        "sender_name": current_user["full_name"],
        "sender_role": current_user["role"],
        "message_type": "system",
        "amount": None,
        "message": f"DISPUTE RAISED by {current_user['full_name']}: {data.reason}. Escrow hold activated. ClearDeal team will review within 72 hours.",
        "is_accepted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    dispute_doc.pop("_id", None)
    return dispute_doc


@api_router.get("/deals/{deal_id}/dispute")
async def get_deal_dispute(deal_id: str, current_user=Depends(get_current_user)):
    deal = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    company_id = current_user.get("company_id")
    if company_id not in [deal["seller_company_id"], deal["buyer_company_id"]]:
        raise HTTPException(status_code=403, detail="Access denied")
    dispute = await db.disputes.find_one({"deal_id": deal_id}, {"_id": 0})
    if not dispute:
        raise HTTPException(status_code=404, detail="No dispute found for this deal")
    return dispute


# ============ NOTIFICATION ROUTES (C) ============
@api_router.get("/notifications")
async def get_notifications(current_user=Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    unread_count = len([n for n in notifications if not n["is_read"]])
    return {"notifications": notifications, "unread_count": unread_count}


@api_router.post("/notifications/mark-read")
async def mark_notification_read(data: dict, current_user=Depends(get_current_user)):
    notif_id = data.get("notification_id")
    if notif_id:
        await db.notifications.update_one(
            {"id": notif_id, "user_id": current_user["id"]},
            {"$set": {"is_read": True}}
        )
    return {"success": True}


@api_router.post("/notifications/mark-all-read")
async def mark_all_notifications_read(current_user=Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user["id"]},
        {"$set": {"is_read": True}}
    )
    return {"success": True}


# ============ APP SETUP ============
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
