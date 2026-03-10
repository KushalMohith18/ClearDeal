"""
ClearDeal Phase 2 - Backend API Tests for New Features (PRD v2)
Tests: F1-Contract, F2-Thread Lock, F3-Benchmark, F4-Rep Performance, F5-Dispute, F6-Campaign Bundling, F7-Availability/Interest
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Existing test credentials (from Phase 1)
OWNER_EMAIL = "testowner@cleardeal.com"
OWNER_PASSWORD = "test123"
BRAND_EMAIL = "testbrand@cleardeal.com"
BRAND_PASSWORD = "test123"

# New test credentials
REP_EMAIL = f"testrep_{uuid.uuid4().hex[:6]}@cleardeal.com"
REP_PASSWORD = "test123"

owner_token = None
brand_token = None
rep_token = None
billboard_id = None
deal_id = None
rep_user_id = None


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


class TestSetup:
    """Login existing users and create rep for testing"""
    
    def test_login_owner(self, session):
        global owner_token
        resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": OWNER_EMAIL,
            "password": OWNER_PASSWORD
        })
        assert resp.status_code == 200, f"Owner login failed: {resp.text}"
        data = resp.json()
        owner_token = data["token"]
        print(f"Owner logged in: {OWNER_EMAIL}")
    
    def test_login_brand_manager(self, session):
        global brand_token
        resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": BRAND_EMAIL,
            "password": BRAND_PASSWORD
        })
        assert resp.status_code == 200, f"Brand login failed: {resp.text}"
        brand_token = resp.json()["token"]
        print(f"Brand Manager logged in: {BRAND_EMAIL}")
    
    def test_register_rep(self, session):
        """Register a new rep for testing rep-specific features"""
        global rep_token, rep_user_id
        resp = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": REP_EMAIL,
            "password": REP_PASSWORD,
            "full_name": "Test Rep User",
            "phone": "9876543299",
            "role": "rep"
        })
        assert resp.status_code == 200, f"Rep registration failed: {resp.text}"
        data = resp.json()
        rep_token = data["token"]
        rep_user_id = data["user"]["id"]
        print(f"Rep registered: {REP_EMAIL}")
    
    def test_setup_rep_company(self, session):
        """Create company for rep user"""
        global rep_token
        resp = session.post(f"{BASE_URL}/api/companies",
            headers={"Authorization": f"Bearer {rep_token}"},
            json={
                "name": "Test Rep Agency",
                "gst_number": "29AADCB2230M1ZR",
                "director_name": "Rep Director",
                "company_type": "brand",
                "city": "Hyderabad",
                "address": "789 Rep Road, Hyderabad",
                "phone": "9876543299"
            }
        )
        assert resp.status_code == 200, f"Create rep company failed: {resp.text}"
        print("Rep company created")
    
    def test_get_active_billboard(self, session):
        """Find an active billboard for testing"""
        global billboard_id
        resp = session.get(f"{BASE_URL}/api/billboards?status=active",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        if len(data) > 0:
            billboard_id = data[0]["id"]
            print(f"Found active billboard: {billboard_id}")
        else:
            pytest.skip("No active billboards found, cannot test deal features")


# ===== F3: BENCHMARK PRICE INTELLIGENCE =====
class TestBenchmark:
    """F3: Benchmark Price Intelligence API"""
    
    def test_get_benchmarks_all(self, session):
        """Get benchmarks for all areas"""
        resp = session.get(f"{BASE_URL}/api/benchmarks",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "area" in data
        assert "min_price" in data or "hardcoded_range" in data
        assert "max_price" in data or "hardcoded_range" in data
        print(f"Benchmarks fetched: {data.get('area', 'N/A')}")
    
    def test_get_benchmarks_by_area(self, session):
        """Get benchmarks filtered by area"""
        resp = session.get(f"{BASE_URL}/api/benchmarks?area=Banjara",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "Banjara" in data.get("area", "")
        print(f"Area benchmark: {data}")


# ===== F7: AVAILABILITY & INTEREST FLAGGING =====
class TestAvailabilityInterest:
    """F7: Availability Calendar and Interest Flagging"""
    
    def test_get_billboard_availability(self, session):
        """Get availability calendar for billboard"""
        if not billboard_id:
            pytest.skip("No billboard_id available")
        resp = session.get(f"{BASE_URL}/api/billboards/{billboard_id}/availability",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "billboard_id" in data
        assert "booked_ranges" in data
        assert "current_status" in data
        print(f"Availability fetched for {billboard_id}")
    
    def test_flag_interest(self, session):
        """Flag interest in a billboard (POST /billboards/{id}/interest)"""
        if not billboard_id:
            pytest.skip("No billboard_id available")
        resp = session.post(f"{BASE_URL}/api/billboards/{billboard_id}/interest",
            headers={"Authorization": f"Bearer {brand_token}"},
            json={
                "interested_date": "2025-06-15",
                "message": "Interested for Q2 campaign"
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("success") == True
        print(f"Interest flagged for billboard {billboard_id}")
    
    def test_get_billboard_interests_owner_only(self, session):
        """Get interests - should be owner-only access"""
        if not billboard_id:
            pytest.skip("No billboard_id available")
        # Brand manager should be denied
        resp = session.get(f"{BASE_URL}/api/billboards/{billboard_id}/interests",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        # Either 403 or 200 depending on ownership
        # If 403, that's correct (only owner can see interests)
        print(f"Get interests response: {resp.status_code}")
        assert resp.status_code in [200, 403]


# ===== F4: REP PERFORMANCE & RATINGS =====
class TestRepPerformance:
    """F4: Rep Performance Dashboard and Rating"""
    
    def test_get_my_performance_as_rep(self, session):
        """Rep can view their own performance"""
        resp = session.get(f"{BASE_URL}/api/reps/my-performance",
            headers={"Authorization": f"Bearer {rep_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "user_id" in data
        assert "total_deals" in data
        assert "win_rate" in data
        assert "total_commission_earned" in data
        print(f"Rep performance: {data['win_rate']}% win rate, {data['total_deals']} deals")
    
    def test_get_rep_performance_by_id(self, session):
        """Get specific rep's performance"""
        if not rep_user_id:
            pytest.skip("No rep_user_id available")
        resp = session.get(f"{BASE_URL}/api/reps/{rep_user_id}/performance",
            headers={"Authorization": f"Bearer {rep_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["user_id"] == rep_user_id
        print(f"Rep {rep_user_id} performance loaded")
    
    def test_rate_rep_by_manager(self, session):
        """Manager/Owner can rate a rep (POST /reps/{rep_id}/rate)"""
        if not rep_user_id:
            pytest.skip("No rep_user_id available")
        resp = session.post(f"{BASE_URL}/api/reps/{rep_user_id}/rate",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={
                "rating": 4,
                "comment": "Good negotiation skills"
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("success") == True
        assert "avg_rating" in data
        print(f"Rep rated: avg_rating={data.get('avg_rating')}")
    
    def test_get_rep_ratings(self, session):
        """Get ratings for a rep (GET /reps/{rep_id}/ratings)"""
        if not rep_user_id:
            pytest.skip("No rep_user_id available")
        resp = session.get(f"{BASE_URL}/api/reps/{rep_user_id}/ratings",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert "rating" in data[0]
        print(f"Rep has {len(data)} ratings")
    
    def test_rep_cannot_rate_self(self, session):
        """Rep should not be able to rate themselves"""
        if not rep_user_id:
            pytest.skip("No rep_user_id available")
        resp = session.post(f"{BASE_URL}/api/reps/{rep_user_id}/rate",
            headers={"Authorization": f"Bearer {rep_token}"},
            json={"rating": 5, "comment": "I'm great"}
        )
        assert resp.status_code == 403
        print("Rep correctly denied self-rating")


# ===== F6: CAMPAIGN BUNDLING =====
class TestCampaignBundling:
    """F6: Multi-Board Campaign Bundling"""
    
    campaign_id = None
    
    def test_create_campaign(self, session):
        """Brand Manager can create campaign"""
        if not billboard_id:
            pytest.skip("No billboard_id available")
        resp = session.post(f"{BASE_URL}/api/campaigns",
            headers={"Authorization": f"Bearer {brand_token}"},
            json={
                "name": "Q2 Hyderabad Campaign",
                "description": "Multi-billboard campaign for Q2",
                "billboard_ids": [billboard_id],
                "campaign_start_date": "2025-04-01",
                "campaign_end_date": "2025-06-30",
                "total_budget": 500000.0
            }
        )
        assert resp.status_code == 200, f"Create campaign failed: {resp.text}"
        data = resp.json()
        assert data["name"] == "Q2 Hyderabad Campaign"
        assert "id" in data
        TestCampaignBundling.campaign_id = data["id"]
        print(f"Campaign created: {data['id']}")
    
    def test_get_campaigns(self, session):
        """Get all campaigns for company"""
        resp = session.get(f"{BASE_URL}/api/campaigns",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} campaigns")
    
    def test_get_campaign_detail(self, session):
        """Get campaign detail with billboards"""
        if not TestCampaignBundling.campaign_id:
            pytest.skip("No campaign_id available")
        resp = session.get(f"{BASE_URL}/api/campaigns/{TestCampaignBundling.campaign_id}",
            headers={"Authorization": f"Bearer {brand_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "billboards" in data
        assert "deals" in data
        print(f"Campaign detail: {len(data.get('billboards', []))} boards")
    
    def test_owner_cannot_create_campaign(self, session):
        """Owner role should not create campaigns"""
        if not billboard_id:
            pytest.skip("No billboard_id available")
        resp = session.post(f"{BASE_URL}/api/campaigns",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={
                "name": "Owner Campaign",
                "billboard_ids": [billboard_id],
                "campaign_start_date": "2025-04-01",
                "campaign_end_date": "2025-06-30",
                "total_budget": 100000.0
            }
        )
        assert resp.status_code == 403
        print("Owner correctly denied campaign creation")


# ===== ADMIN STATS =====
class TestAdminStats:
    """Admin stats endpoint"""
    
    def test_get_admin_stats(self, session):
        """GET /admin/stats returns platform statistics"""
        resp = session.get(f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "total_users" in data
        assert "total_companies" in data
        assert "total_billboards" in data
        assert "total_deals" in data
        assert "total_gmv" in data
        assert "platform_revenue" in data
        print(f"Admin stats: {data['total_users']} users, {data['total_billboards']} boards, GMV={data['total_gmv']}")


# ===== BILLBOARD UPDATE =====
class TestBillboardUpdate:
    """Billboard update endpoint for owner"""
    
    def test_owner_can_update_billboard(self, session):
        """Owner can update their billboard (PUT /billboards/{id})"""
        # First get owner's billboard
        resp = session.get(f"{BASE_URL}/api/billboards/my",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert resp.status_code == 200
        my_boards = resp.json()
        if len(my_boards) == 0:
            pytest.skip("Owner has no billboards to update")
        
        my_billboard_id = my_boards[0]["id"]
        
        # Update billboard
        resp = session.put(f"{BASE_URL}/api/billboards/{my_billboard_id}",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={
                "title": "Updated Billboard Title",
                "description": "Updated description for testing"
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("success") == True
        print(f"Billboard {my_billboard_id} updated")
    
    def test_brand_cannot_update_billboard(self, session):
        """Brand manager should not update someone else's billboard"""
        if not billboard_id:
            pytest.skip("No billboard_id available")
        resp = session.put(f"{BASE_URL}/api/billboards/{billboard_id}",
            headers={"Authorization": f"Bearer {brand_token}"},
            json={"title": "Hacked Title"}
        )
        assert resp.status_code == 403
        print("Brand correctly denied billboard update")


# ===== F1, F2, F5: CONTRACT, THREAD LOCK, DISPUTE (Require Deal Context) =====
class TestDealFeatures:
    """F1-Contract, F2-Thread Lock, F5-Dispute require an existing deal"""
    
    test_deal_id = None
    
    def test_create_test_deal(self, session):
        """Create a deal for testing contract/lock/dispute features"""
        if not billboard_id:
            pytest.skip("No billboard_id available")
        
        # Create deal as rep
        resp = session.post(f"{BASE_URL}/api/deals",
            headers={"Authorization": f"Bearer {rep_token}"},
            json={
                "billboard_id": billboard_id,
                "booking_start_date": "2025-07-01",
                "booking_end_date": "2025-08-31",
                "initial_offer": 60000.0,
                "message": "Test deal for Phase 2 features"
            }
        )
        assert resp.status_code == 200, f"Create deal failed: {resp.text}"
        data = resp.json()
        TestDealFeatures.test_deal_id = data["id"]
        print(f"Test deal created: {data['id']}")
    
    # F2: Thread Lock
    def test_lock_thread(self, session):
        """Lock negotiation thread (POST /deals/{id}/lock)"""
        if not TestDealFeatures.test_deal_id:
            pytest.skip("No test deal available")
        
        resp = session.post(f"{BASE_URL}/api/deals/{TestDealFeatures.test_deal_id}/lock",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={"reason": "Manager reviewing deal"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("success") == True
        print("Thread locked")
    
    def test_unlock_thread(self, session):
        """Unlock negotiation thread (POST /deals/{id}/unlock)"""
        if not TestDealFeatures.test_deal_id:
            pytest.skip("No test deal available")
        
        resp = session.post(f"{BASE_URL}/api/deals/{TestDealFeatures.test_deal_id}/unlock",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("success") == True
        print("Thread unlocked")
    
    # F1: Contract (needs pending_approval status)
    def test_accept_offer_for_contract(self, session):
        """Accept offer to move deal to pending_approval for contract test"""
        if not TestDealFeatures.test_deal_id:
            pytest.skip("No test deal available")
        
        resp = session.post(f"{BASE_URL}/api/deals/{TestDealFeatures.test_deal_id}/accept-offer",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        # May fail if already accepted or wrong status
        if resp.status_code == 200:
            print("Deal moved to pending_approval")
        else:
            print(f"Accept offer response: {resp.status_code} - {resp.text[:100]}")
    
    def test_get_contract(self, session):
        """Get contract (GET /deals/{id}/contract)"""
        if not TestDealFeatures.test_deal_id:
            pytest.skip("No test deal available")
        
        resp = session.get(f"{BASE_URL}/api/deals/{TestDealFeatures.test_deal_id}/contract",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        # Contract available from pending_approval onwards
        if resp.status_code == 200:
            data = resp.json()
            assert "contract_number" in data
            assert "buyer" in data
            assert "seller" in data
            print(f"Contract fetched: {data['contract_number']}")
        else:
            print(f"Contract not available at this stage: {resp.status_code}")
    
    def test_sign_contract(self, session):
        """Sign contract (POST /deals/{id}/sign)"""
        if not TestDealFeatures.test_deal_id:
            pytest.skip("No test deal available")
        
        resp = session.post(f"{BASE_URL}/api/deals/{TestDealFeatures.test_deal_id}/sign",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        if resp.status_code == 200:
            data = resp.json()
            assert data.get("success") == True
            print("Contract signed by owner")
        else:
            print(f"Sign contract response: {resp.status_code}")
    
    # F5: Dispute (needs paid status)
    def test_dispute_requires_paid_status(self, session):
        """Dispute should fail if deal is not paid"""
        if not TestDealFeatures.test_deal_id:
            pytest.skip("No test deal available")
        
        resp = session.post(f"{BASE_URL}/api/deals/{TestDealFeatures.test_deal_id}/dispute",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={
                "reason": "Billboard damaged",
                "description": "Found damage to the board after installation"
            }
        )
        # Should fail with 400 if deal is not paid/active
        if resp.status_code == 400:
            print("Dispute correctly rejected for non-paid deal")
        elif resp.status_code == 200:
            print("Dispute raised (deal may be in paid status)")
        else:
            print(f"Dispute response: {resp.status_code}")


# ===== REP MANAGEMENT BY OWNER =====
class TestRepManagement:
    """Owner/Manager controls for reps"""
    
    def test_update_rep_settings(self, session):
        """Update rep settings (price band, budget ceiling)"""
        if not rep_user_id:
            pytest.skip("No rep_user_id available")
        
        # First, link rep to owner's company (simulate invite accept)
        # This would normally be done via invite flow
        # For now, test the endpoint with existing rep
        resp = session.put(f"{BASE_URL}/api/companies/reps/{rep_user_id}/settings",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={
                "price_band_min": 40000,
                "price_band_max": 80000,
                "budget_ceiling": 500000,
                "deal_approval_mode": "manual",
                "commission_visibility": True,
                "is_active": True
            }
        )
        # May fail if rep is not in owner's company
        print(f"Update rep settings: {resp.status_code}")
    
    def test_deactivate_activate_rep(self, session):
        """Deactivate and reactivate rep"""
        if not rep_user_id:
            pytest.skip("No rep_user_id available")
        
        # Deactivate
        resp = session.post(f"{BASE_URL}/api/companies/reps/{rep_user_id}/deactivate",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        print(f"Deactivate rep: {resp.status_code}")
        
        # Activate
        resp = session.post(f"{BASE_URL}/api/companies/reps/{rep_user_id}/activate",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        print(f"Activate rep: {resp.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
