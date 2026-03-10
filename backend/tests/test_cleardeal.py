"""
ClearDeal MVP - Backend API Tests
Tests: Auth, Companies, Billboards, Deals, Dashboard
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
OWNER_EMAIL = f"testowner_{uuid.uuid4().hex[:6]}@cleardeal.com"
OWNER_PASSWORD = "test123"
BRAND_EMAIL = f"testbrand_{uuid.uuid4().hex[:6]}@cleardeal.com"
BRAND_PASSWORD = "test123"

owner_token = None
brand_token = None
owner_company_id = None
brand_company_id = None
billboard_id = None
deal_id = None


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ===== AUTH TESTS =====
class TestAuth:
    """Auth endpoints: register, login, me"""

    def test_register_owner(self, session):
        global owner_token
        resp = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": OWNER_EMAIL,
            "password": OWNER_PASSWORD,
            "full_name": "Test Owner",
            "phone": "9876543210",
            "role": "owner"
        })
        assert resp.status_code == 200, f"Register owner failed: {resp.text}"
        data = resp.json()
        assert "token" in data
        assert data["user"]["role"] == "owner"
        owner_token = data["token"]
        print(f"Owner registered: {OWNER_EMAIL}")

    def test_register_brand_manager(self, session):
        global brand_token
        resp = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": BRAND_EMAIL,
            "password": BRAND_PASSWORD,
            "full_name": "Test Brand Manager",
            "phone": "9876543211",
            "role": "brand_manager"
        })
        assert resp.status_code == 200, f"Register brand_manager failed: {resp.text}"
        data = resp.json()
        assert "token" in data
        assert data["user"]["role"] == "brand_manager"
        brand_token = data["token"]
        print(f"Brand Manager registered: {BRAND_EMAIL}")

    def test_login_owner(self, session):
        resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": OWNER_EMAIL,
            "password": OWNER_PASSWORD
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data

    def test_login_invalid(self, session):
        resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "notexist@test.com",
            "password": "wrongpass"
        })
        assert resp.status_code == 401

    def test_get_me(self, session):
        resp = session.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {owner_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == OWNER_EMAIL

    def test_duplicate_register(self, session):
        resp = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": OWNER_EMAIL,
            "password": OWNER_PASSWORD,
            "full_name": "Dup Owner",
            "phone": "9876543210",
            "role": "owner"
        })
        assert resp.status_code == 400


# ===== COMPANY TESTS =====
class TestCompanies:
    """Company creation and verification"""

    def test_create_owner_company(self, session):
        global owner_company_id
        resp = session.post(f"{BASE_URL}/api/companies",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={
                "name": "Test Billboard Co",
                "gst_number": "29AADCB2230M1ZP",
                "director_name": "Test Director",
                "company_type": "billboard_owner",
                "city": "Hyderabad",
                "address": "123 Test Road, Hyderabad",
                "phone": "9876543210"
            }
        )
        assert resp.status_code == 200, f"Create company failed: {resp.text}"
        data = resp.json()
        assert data["name"] == "Test Billboard Co"
        owner_company_id = data["id"]

    def test_create_brand_company(self, session):
        global brand_company_id
        resp = session.post(f"{BASE_URL}/api/companies",
            headers={"Authorization": f"Bearer {brand_token}"},
            json={
                "name": "Test Brand Co",
                "gst_number": "27AADCB2230M1ZQ",
                "director_name": "Brand Director",
                "company_type": "brand",
                "city": "Hyderabad",
                "address": "456 Brand Road, Hyderabad",
                "phone": "9876543211"
            }
        )
        assert resp.status_code == 200, f"Create brand company failed: {resp.text}"
        data = resp.json()
        brand_company_id = data["id"]

    def test_get_my_company(self, session):
        resp = session.get(f"{BASE_URL}/api/companies/me",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == owner_company_id

    def test_verify_gst(self, session):
        resp = session.post(f"{BASE_URL}/api/companies/verify-gst",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert resp.status_code == 200
        assert resp.json()["success"] == True

    def test_verify_aadhaar(self, session):
        resp = session.post(f"{BASE_URL}/api/companies/verify-aadhaar",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={"aadhaar_number": "123456789012", "director_name": "Test Director"}
        )
        assert resp.status_code == 200
        assert resp.json()["success"] == True

    def test_verify_bank(self, session):
        resp = session.post(f"{BASE_URL}/api/companies/verify-bank",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={
                "account_number": "12345678901234",
                "ifsc_code": "HDFC0001234",
                "account_holder_name": "Test Director"
            }
        )
        assert resp.status_code == 200
        assert resp.json()["success"] == True


# ===== BILLBOARD TESTS =====
class TestBillboards:
    """Billboard CRUD and status management"""

    def test_create_billboard(self, session):
        global billboard_id
        resp = session.post(f"{BASE_URL}/api/billboards",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={
                "title": "Test Billboard Hyderabad",
                "address": "Banjara Hills, Hyderabad",
                "lat": 17.4156,
                "lng": 78.4347,
                "dimensions_width": 20.0,
                "dimensions_height": 10.0,
                "board_type": "static",
                "illumination": "frontlit",
                "facing": "North",
                "base_monthly_rate": 50000.0,
                "min_booking_period": 1,
                "available_from": "2025-03-01",
                "min_acceptable_price": 40000.0,
                "description": "Test billboard"
            }
        )
        assert resp.status_code == 200, f"Create billboard failed: {resp.text}"
        data = resp.json()
        assert data["title"] == "Test Billboard Hyderabad"
        assert data["status"] == "draft"
        billboard_id = data["id"]

    def test_get_my_billboards(self, session):
        resp = session.get(f"{BASE_URL}/api/billboards/my",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert any(b["id"] == billboard_id for b in data)

    def test_publish_billboard(self, session):
        resp = session.put(f"{BASE_URL}/api/billboards/{billboard_id}/status",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={"status": "active"}
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "active"

    def test_browse_billboards(self, session):
        resp = session.get(f"{BASE_URL}/api/billboards",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_get_billboard_by_id(self, session):
        resp = session.get(f"{BASE_URL}/api/billboards/{billboard_id}",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == billboard_id
        # Sensitive fields hidden for non-owner
        assert "min_acceptable_price" not in data

    def test_search_billboard_by_area(self, session):
        resp = session.get(f"{BASE_URL}/api/billboards?area=Banjara",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert any("Banjara" in b["address"] for b in data)

    def test_brand_cannot_create_billboard(self, session):
        resp = session.post(f"{BASE_URL}/api/billboards",
            headers={"Authorization": f"Bearer {brand_token}"},
            json={
                "title": "Unauthorized Billboard",
                "address": "Test",
                "lat": 17.0, "lng": 78.0,
                "dimensions_width": 10.0, "dimensions_height": 5.0,
                "board_type": "static", "illumination": "frontlit",
                "facing": "North", "base_monthly_rate": 10000.0,
                "available_from": "2025-03-01"
            }
        )
        assert resp.status_code == 403


# ===== DEAL TESTS =====
class TestDeals:
    """Deal creation, messaging, acceptance"""

    def test_create_deal(self, session):
        global deal_id
        resp = session.post(f"{BASE_URL}/api/deals",
            headers={"Authorization": f"Bearer {brand_token}"},
            json={
                "billboard_id": billboard_id,
                "booking_start_date": "2025-03-01",
                "booking_end_date": "2025-05-31",
                "initial_offer": 45000.0,
                "message": "Interested in this billboard"
            }
        )
        assert resp.status_code == 200, f"Create deal failed: {resp.text}"
        data = resp.json()
        assert data["status"] == "negotiating"
        assert data["current_offer"] == 45000.0
        deal_id = data["id"]

    def test_get_deals_brand(self, session):
        resp = session.get(f"{BASE_URL}/api/deals",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert any(d["id"] == deal_id for d in data)

    def test_get_deals_owner(self, session):
        resp = session.get(f"{BASE_URL}/api/deals",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert any(d["id"] == deal_id for d in data)

    def test_get_deal_by_id(self, session):
        resp = session.get(f"{BASE_URL}/api/deals/{deal_id}",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        assert resp.status_code == 200
        assert resp.json()["id"] == deal_id

    def test_get_messages(self, session):
        resp = session.get(f"{BASE_URL}/api/deals/{deal_id}/messages",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1  # At least initial offer message

    def test_send_text_message(self, session):
        resp = session.post(f"{BASE_URL}/api/deals/{deal_id}/messages",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={
                "message_type": "text",
                "message": "Thanks for your offer, can you go higher?"
            }
        )
        assert resp.status_code == 200
        assert resp.json()["message_type"] == "text"

    def test_send_counter_offer(self, session):
        resp = session.post(f"{BASE_URL}/api/deals/{deal_id}/messages",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={
                "message_type": "counter_offer",
                "amount": 48000.0,
                "message": "Counter offer at 48000"
            }
        )
        assert resp.status_code == 200
        assert resp.json()["amount"] == 48000.0

    def test_accept_offer(self, session):
        resp = session.post(f"{BASE_URL}/api/deals/{deal_id}/accept-offer",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "pending_approval"

    def test_owner_cannot_create_deal(self, session):
        resp = session.post(f"{BASE_URL}/api/deals",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={
                "billboard_id": billboard_id,
                "booking_start_date": "2025-03-01",
                "booking_end_date": "2025-05-31",
                "initial_offer": 45000.0
            }
        )
        assert resp.status_code == 403


# ===== DASHBOARD TESTS =====
class TestDashboard:
    """Dashboard stats for each role"""

    def test_owner_dashboard_stats(self, session):
        resp = session.get(f"{BASE_URL}/api/dashboard/stats",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "owner"
        assert "total_billboards" in data
        assert "total_deals" in data

    def test_brand_dashboard_stats(self, session):
        resp = session.get(f"{BASE_URL}/api/dashboard/stats",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "brand_manager"
        assert "total_deals" in data
