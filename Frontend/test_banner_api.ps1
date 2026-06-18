# Banner Feature API Test Script
# Tests the banner feature end-to-end via API calls

$BaseApi = "http://localhost:5000/api"
$Results = @{}

Write-Host "=" * 60
Write-Host "        BANNER FEATURE E2E API TEST"
Write-Host "=" * 60

# Helper function to make API calls
function Invoke-Api {
    param($Method, $Path, $Body = $null, $Token = $null)
    $Headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $Headers["Authorization"] = "Bearer $Token" }
    
    $Uri = "$BaseApi$Path"
    try {
        if ($Body) {
            $Response = Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers -Body ($Body | ConvertTo-Json) -ErrorAction Stop
        } else {
            $Response = Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers -ErrorAction Stop
        }
        return $Response
    } catch {
        $StatusCode = $_.Exception.Response.StatusCode.value__
        $ErrorMsg = $_.Exception.Message
        Write-Host "  ERROR [$StatusCode]: $ErrorMsg" -ForegroundColor Red
        try {
            $Reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $ErrorBody = $Reader.ReadToEnd() | ConvertFrom-Json
            Write-Host "  API Error: $($ErrorBody.error)" -ForegroundColor Red
            return $null
        } catch {}
        return $null
    }
}

# ═══════════════════════════════════════════════════════════
# PHASE 1: Login as Vendor
# ═══════════════════════════════════════════════════════════
Write-Host "`n[PHASE 1] Login as Vendor" -ForegroundColor Cyan

$VendorLogin = Invoke-Api -Method POST -Path "/auth/login" -Body @{
    email = "sarusondj1234@gmail.com"
    password = "sarusondj@1"
}

if ($VendorLogin -and $VendorLogin.token) {
    $VendorToken = $VendorLogin.token
    Write-Host "  ✅ Vendor Login: PASS" -ForegroundColor Green
    Write-Host "  → User: $($VendorLogin.user.name) | Role: $($VendorLogin.user.role) | Status: $($VendorLogin.user.status)"
    $Results["1_vendor_login"] = "PASS"
} else {
    Write-Host "  ❌ Vendor Login: FAIL" -ForegroundColor Red
    $Results["1_vendor_login"] = "FAIL"
    $VendorToken = $null
}

# Get vendor shop info
if ($VendorToken) {
    $ShopInfo = Invoke-Api -Method GET -Path "/shops/my" -Token $VendorToken
    if ($ShopInfo -and $ShopInfo.shop) {
        $Shop = $ShopInfo.shop
        $ShopId = $Shop._id
        Write-Host "  ✅ Vendor Shop Found: $($Shop.name) | ID: $ShopId" -ForegroundColor Green
        Write-Host "  → bannersEnabled: $($Shop.bannersEnabled) | bannersPlan: $($Shop.bannersPlan)"
        $Results["1_vendor_shop"] = "PASS - Shop: $($Shop.name), bannersEnabled: $($Shop.bannersEnabled), plan: $($Shop.bannersPlan)"
        
        if ($Shop.bannersEnabled) {
            Write-Host "  ℹ️  Banners already enabled! bannersExpiresAt: $($Shop.bannersExpiresAt)" -ForegroundColor Yellow
        } else {
            Write-Host "  ℹ️  Banners NOT yet enabled (expected before admin grant)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ⚠️  Could not get vendor shop" -ForegroundColor Yellow
        $ShopId = $null
        $Results["1_vendor_shop"] = "FAIL"
    }
}

# ═══════════════════════════════════════════════════════════
# PHASE 2: Login as SuperAdmin & Grant Banner Access
# ═══════════════════════════════════════════════════════════
Write-Host "`n[PHASE 2] Login as SuperAdmin" -ForegroundColor Cyan

$AdminCredentials = @(
    @{ email = "sarusondj@gmail.com"; password = "Admin@123" },
    @{ email = "sarusondj@gmail.com"; password = "sarusondj@1" },
    @{ email = "sarusondj@gmail.com"; password = "admin123" },
    @{ email = "admin@gmail.com"; password = "Admin@123" }
)

$AdminToken = $null
foreach ($Cred in $AdminCredentials) {
    Write-Host "  Trying: $($Cred.email) / $($Cred.password)" -ForegroundColor Gray
    $AdminLogin = Invoke-Api -Method POST -Path "/auth/login" -Body $Cred
    if ($AdminLogin -and $AdminLogin.token -and $AdminLogin.user.role -eq "admin") {
        $AdminToken = $AdminLogin.token
        Write-Host "  ✅ Admin Login: PASS with $($Cred.email) / $($Cred.password)" -ForegroundColor Green
        Write-Host "  → Name: $($AdminLogin.user.name) | Role: $($AdminLogin.user.role)"
        $Results["2_admin_login"] = "PASS - $($Cred.email)"
        break
    }
}

if (-not $AdminToken) {
    Write-Host "  ❌ Admin Login: FAIL - no valid admin credentials found" -ForegroundColor Red
    $Results["2_admin_login"] = "FAIL"
}

# Get vendors list as admin
if ($AdminToken) {
    $VendorsList = Invoke-Api -Method GET -Path "/admin/users?role=vendor" -Token $AdminToken
    if ($VendorsList -and $VendorsList.users) {
        Write-Host "  ✅ Vendors List: Found $($VendorsList.users.Count) vendors" -ForegroundColor Green
        
        # Find our specific vendor
        $TargetVendor = $VendorsList.users | Where-Object { $_.email -like "*sarusondj1234*" }
        if ($TargetVendor) {
            Write-Host "  ✅ Found target vendor: $($TargetVendor.name) | ShopId: $($TargetVendor.shopId)" -ForegroundColor Green
            Write-Host "  → bannersEnabled: $($TargetVendor.bannersEnabled) | bannersPlan: $($TargetVendor.bannersPlan)"
            Write-Host "  → daysRemaining: $($TargetVendor.daysRemaining)"
            
            $VendorShopId = $TargetVendor.shopId
            $VendorUserId = $TargetVendor._id
            $Results["2_found_vendor"] = "PASS - Vendor: $($TargetVendor.name), bannersEnabled: $($TargetVendor.bannersEnabled)"
            
            # Grant 7-day banner plan
            Write-Host "`n  → Granting 7-Day Banner Plan..." -ForegroundColor Yellow
            $GrantResult = Invoke-Api -Method PATCH -Path "/admin/shops/$VendorShopId/banners-access" -Body @{ plan = "7day" } -Token $AdminToken
            
            if ($GrantResult -and $GrantResult.success) {
                Write-Host "  ✅ 7-Day Banner Plan Granted!" -ForegroundColor Green
                Write-Host "  → bannersEnabled: $($GrantResult.shop.bannersEnabled)"
                Write-Host "  → bannersPlan: $($GrantResult.shop.bannersPlan)"
                Write-Host "  → bannersExpiresAt: $($GrantResult.shop.bannersExpiresAt)"
                $Results["2_banner_plan_granted"] = "PASS - Plan: $($GrantResult.shop.bannersPlan), ExpiresAt: $($GrantResult.shop.bannersExpiresAt)"
            } else {
                Write-Host "  ❌ Failed to grant banner plan" -ForegroundColor Red
                $Results["2_banner_plan_granted"] = "FAIL"
            }
        } else {
            Write-Host "  ⚠️  Target vendor not found. Available vendors:" -ForegroundColor Yellow
            $VendorsList.users | ForEach-Object { Write-Host "    - $($_.email) | $($_.name)" }
            $Results["2_found_vendor"] = "FAIL - target vendor not in list"
        }
    }
}

# ═══════════════════════════════════════════════════════════
# PHASE 3: Verify Banner Access & Create Banner
# ═══════════════════════════════════════════════════════════
Write-Host "`n[PHASE 3] Verify Banner Access (re-login as vendor)" -ForegroundColor Cyan

if ($VendorToken) {
    # Re-fetch shop info to verify bannersEnabled
    $ShopInfoAfter = Invoke-Api -Method GET -Path "/shops/my" -Token $VendorToken
    if ($ShopInfoAfter -and $ShopInfoAfter.shop) {
        $ShopAfter = $ShopInfoAfter.shop
        Write-Host "  → bannersEnabled: $($ShopAfter.bannersEnabled) | bannersPlan: $($ShopAfter.bannersPlan)"
        Write-Host "  → bannersExpiresAt: $($ShopAfter.bannersExpiresAt)"
        
        if ($ShopAfter.bannersEnabled) {
            Write-Host "  ✅ bannersEnabled = TRUE after grant!" -ForegroundColor Green
            $Results["3_banners_enabled"] = "PASS - bannersEnabled: true, plan: $($ShopAfter.bannersPlan), expiresAt: $($ShopAfter.bannersExpiresAt)"
            
            # Calculate days remaining
            $ExpiresAt = [DateTime]::Parse($ShopAfter.bannersExpiresAt)
            $Now = [DateTime]::UtcNow
            $DaysLeft = ($ExpiresAt - $Now).TotalDays
            Write-Host "  → Days Remaining: $([Math]::Round($DaysLeft, 1)) days" -ForegroundColor Green
        } else {
            Write-Host "  ❌ bannersEnabled is still FALSE after grant!" -ForegroundColor Red
            $Results["3_banners_enabled"] = "FAIL - still false"
        }
    }
    
    # Create a banner
    Write-Host "`n  → Creating banner 'Summer Sale'..." -ForegroundColor Yellow
    $Today = (Get-Date).ToString("yyyy-MM-dd")
    $EndDate = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")
    
    $BannerBody = @{
        title = "Summer Sale"
        subtitle = "Best deals of the season"
        type = "Today's Best Deals"
        startDate = $Today
        endDate = $EndDate
        isActive = $true
    }
    
    $BannerResult = Invoke-Api -Method POST -Path "/banners" -Body $BannerBody -Token $VendorToken
    if ($BannerResult -and $BannerResult.success) {
        $BannerId = $BannerResult.banner._id
        Write-Host "  ✅ Banner Created Successfully!" -ForegroundColor Green
        Write-Host "  → ID: $BannerId | Title: $($BannerResult.banner.title)"
        Write-Host "  → Type: $($BannerResult.banner.type) | Start: $($BannerResult.banner.startDate) | End: $($BannerResult.banner.endDate)"
        $Results["3_banner_created"] = "PASS - ID: $BannerId, Title: $($BannerResult.banner.title)"
    } else {
        Write-Host "  ❌ Banner creation failed" -ForegroundColor Red
        $Results["3_banner_created"] = "FAIL"
        $BannerId = $null
    }
    
    # Fetch all vendor banners to verify
    $MyBanners = Invoke-Api -Method GET -Path "/banners/my" -Token $VendorToken
    if ($MyBanners -and $MyBanners.success) {
        Write-Host "  ✅ Fetched banners: $($MyBanners.banners.Count) banner(s)" -ForegroundColor Green
        $MyBanners.banners | ForEach-Object {
            Write-Host "    → [$($_.type)] $($_.title) | Active: $($_.isActive) | Products: $($_.products.Count)"
        }
        $Results["3_fetch_banners"] = "PASS - $($MyBanners.banners.Count) banners found"
    }
}

# ═══════════════════════════════════════════════════════════
# PHASE 4: Add Product to Banner
# ═══════════════════════════════════════════════════════════
Write-Host "`n[PHASE 4] Add Product to Banner" -ForegroundColor Cyan

if ($VendorToken -and $BannerId) {
    # Get inventory products
    $Inventory = Invoke-Api -Method GET -Path "/inventory" -Token $VendorToken
    if ($Inventory -and $Inventory.products -and $Inventory.products.Count -gt 0) {
        $FirstProduct = $Inventory.products[0]
        Write-Host "  ✅ Found product: $($FirstProduct.name) | ID: $($FirstProduct._id)" -ForegroundColor Green
        
        # Add product to banner
        $AddResult = Invoke-Api -Method POST -Path "/banners/$BannerId/products" -Body @{ productId = $FirstProduct._id } -Token $VendorToken
        if ($AddResult -and $AddResult.success) {
            Write-Host "  ✅ Product added to banner!" -ForegroundColor Green
            Write-Host "  → Banner now has $($AddResult.banner.products.Count) product(s)"
            $Results["4_product_added"] = "PASS - Product: $($FirstProduct.name) added to banner"
        } else {
            # Try alternative endpoint
            $AddResult2 = Invoke-Api -Method PATCH -Path "/banners/$BannerId/products/add" -Body @{ productId = $FirstProduct._id } -Token $VendorToken
            if ($AddResult2 -and $AddResult2.success) {
                Write-Host "  ✅ Product added to banner (via PATCH)!" -ForegroundColor Green
                $Results["4_product_added"] = "PASS - Product: $($FirstProduct.name) added to banner"
            } else {
                Write-Host "  ⚠️  Could not add product to banner (endpoint unclear)" -ForegroundColor Yellow
                $Results["4_product_added"] = "UNCLEAR - Need to check API endpoint"
            }
        }
    } else {
        Write-Host "  ⚠️  No products in inventory" -ForegroundColor Yellow
        $Results["4_product_added"] = "SKIP - No products found"
    }
} else {
    Write-Host "  ⚠️  Skipping - no token or banner ID" -ForegroundColor Yellow
    $Results["4_product_added"] = "SKIP"
}

# ═══════════════════════════════════════════════════════════
# PHASE 5: Verify Plan Expiry Status
# ═══════════════════════════════════════════════════════════
Write-Host "`n[PHASE 5] Verify Plan Expiry Status" -ForegroundColor Cyan

if ($VendorToken) {
    $FinalShop = Invoke-Api -Method GET -Path "/shops/my" -Token $VendorToken
    if ($FinalShop -and $FinalShop.shop) {
        $S = $FinalShop.shop
        Write-Host "  ✅ Final Status Check:" -ForegroundColor Green
        Write-Host "  → Shop: $($S.name)"
        Write-Host "  → bannersEnabled: $($S.bannersEnabled)"
        Write-Host "  → bannersPlan: $($S.bannersPlan)"
        Write-Host "  → bannersEnabledAt: $($S.bannersEnabledAt)"
        Write-Host "  → bannersExpiresAt: $($S.bannersExpiresAt)"
        
        if ($S.bannersExpiresAt) {
            $ExpiresAt = [DateTime]::Parse($S.bannersExpiresAt)
            $Now = [DateTime]::UtcNow
            $DaysLeft = ($ExpiresAt - $Now).TotalDays
            $HoursLeft = ($ExpiresAt - $Now).TotalHours
            $PillText = "7-Day Plan — $([Math]::Round($DaysLeft, 1))d left — Expires $($ExpiresAt.ToLocalTime().ToString('dd MMM yyyy, hh:mm tt'))"
            Write-Host "  → Plan Status Pill: $PillText" -ForegroundColor Cyan
            $Results["5_plan_status"] = "PASS - $PillText"
        }
    }
}

# ═══════════════════════════════════════════════════════════
# RESULTS SUMMARY
# ═══════════════════════════════════════════════════════════
Write-Host "`n" + "=" * 60
Write-Host "                    TEST RESULTS SUMMARY"
Write-Host "=" * 60
foreach ($Key in ($Results.Keys | Sort-Object)) {
    $Val = $Results[$Key]
    $Icon = if ($Val -like "PASS*") { "✅" } elseif ($Val -like "FAIL*") { "❌" } elseif ($Val -like "SKIP*") { "⏭️" } else { "⚠️" }
    Write-Host "$Icon $Key"
    Write-Host "   → $Val"
}
Write-Host "=" * 60
