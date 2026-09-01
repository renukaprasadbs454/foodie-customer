# Foodie Backend — Complete Frontend Integration Guide & API Reference

Welcome to the **Foodie Backend API**. This comprehensive guide provides everything required by the **Customer App**, **Restaurant Owner App**, and **Admin Portal** frontend development teams to seamlessly integrate their applications with the backend.

---

## 🚀 1. Local Server Environment & Quick Start

* **Backend Base URL**: `http://localhost:8080`
* **Swagger UI (Interactive API Docs)**: `http://localhost:8080/swagger-ui.html`
* **OpenAPI JSON Spec**: `http://localhost:8080/v3/api-docs`
* **Database (PostgreSQL 15)**: `localhost:5433` (DB: `foodie`, User: `foodie`, Pass: `foodie`)
* **Cache (Redis)**: `localhost:6379`

### How to Run Backend Locally
```bash
# In directory: apps/api
$env:DB_PORT="5433"; .\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"
```

---

## 🔑 2. Authentication & API Response Format

### Authorization Header
All protected endpoints require a JWT Bearer token in the request header:
```http
Authorization: Bearer <access_token>
```

### Standard Response Envelope
Every API response follows a consistent JSON structure:
```json
{
  "success": true,
  "message": "Operation performed successfully.",
  "data": { ... },
  "pagination": {
    "page": 0,
    "size": 20,
    "totalElements": 45,
    "totalPages": 3
  },
  "timestamp": "2026-08-13T18:30:00Z"
}
```

### Error Response Envelope
```json
{
  "success": false,
  "errorCode": "VALIDATION_FAILED",
  "message": "Invalid password or email.",
  "timestamp": "2026-08-13T18:30:00Z"
}
```

---

## 📱 3. Customer App APIs

### 3.1 Customer Authentication & Profile
| Method | Endpoint | Description | Request Body / Query |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new customer | `{ "email": "user@example.com", "password": "Pass123!", "phoneNumber": "+919876543210", "deviceInfo": "iOS" }` |
| `POST` | `/api/v1/auth/login/customer` | Customer email & password login | `{ "email": "user@example.com", "password": "Pass123!", "deviceInfo": "iOS" }` |
| `POST` | `/api/v1/auth/forgot-password` | Request password reset OTP | `{ "email": "user@example.com" }` |
| `POST` | `/api/v1/auth/reset-password` | Reset password using 6-digit OTP | `{ "email": "user@example.com", "otpCode": "123456", "newPassword": "NewPassword123!" }` |
| `POST` | `/api/v1/auth/refresh` | Refresh JWT access token | `{ "refreshToken": "<refresh_token>" }` |
| `POST` | `/api/v1/auth/revoke` | Logout & revoke refresh token | `{ "refreshToken": "<refresh_token>" }` |
| `GET` | `/api/v1/users/me` | Get logged-in customer profile | Header: `Bearer <token>` |
| `PUT` | `/api/v1/users/me` | Update profile details | `{ "fullName": "Jane Doe", "email": "jane@example.com" }` |
| `POST` | `/api/v1/users/me/change-password` | Change current password | `{ "currentPassword": "OldPass!", "newPassword": "NewPass!" }` |

### 3.2 Delivery Address Management
| Method | Endpoint | Description | Request Body / Query |
|---|---|---|---|
| `GET` | `/api/v1/users/me/addresses` | Get saved delivery addresses | Header: `Bearer <token>` |
| `POST` | `/api/v1/users/me/addresses` | Add new delivery address | `{ "recipientName": "Jane", "recipientPhone": "+919876543210", "houseFlatNo": "101", "line1": "MG Road", "line2": "Indiranagar", "city": "Bengaluru", "state": "Karnataka", "pincode": "560038", "landmark": "Near Metro", "label": "HOME", "latitude": 12.9716, "longitude": 77.5946, "isDefault": true }` |
| `PUT` | `/api/v1/users/me/addresses/{id}` | Update existing address | Same body as POST |
| `DELETE` | `/api/v1/users/me/addresses/{id}` | Delete saved address | — |
| `PUT` | `/api/v1/users/me/addresses/{id}/default` | Set address as default | — |

### 3.3 Restaurants & Global Search
| Method | Endpoint | Description | Query Parameters |
|---|---|---|---|
| `GET` | `/api/v1/restaurants` | List / filter restaurants | `search`, `cuisineType`, `minRating` (e.g. `4.0`), `lat`, `lng`, `page`, `size`, `sort` |
| `GET` | `/api/v1/restaurants/{id}` | Get restaurant details by ID | — |
| `GET` | `/api/v1/search/food-items` | Search food items across restaurants | `query`, `isVeg`, `maxPrice`, `restaurantId` |
| `GET` | `/api/v1/search/global` | Search restaurants + food items combined | `query`, `lat`, `lng` |

### 3.4 Menu & Food Items
| Method | Endpoint | Description | Query Parameters |
|---|---|---|---|
| `GET` | `/api/v1/menu/restaurants/{restaurantId}` | Get full categorized menu | — |
| `GET` | `/api/v1/menu/items/{itemId}` | Get single food item detail | — |
| `GET` | `/api/v1/menu/restaurants/{restaurantId}/items` | Get food items by category/veg | `categoryId`, `isVeg` |

### 3.5 Cart Module
| Method | Endpoint | Description | Request Body / Response Notes |
|---|---|---|---|
| `GET` | `/api/v1/cart` | View current customer cart | Returns `subtotal`, `deliveryFee`, `taxAmount` (5% GST), `discountAmount`, `grandTotal`, `items[]` |
| `POST` | `/api/v1/cart/items` | Add item to cart | `{ "menuItemId": "<uuid>", "variantId": "<uuid>", "quantity": 1 }` |
| `PUT` | `/api/v1/cart/items/{cartItemId}` | Update item quantity in cart | `{ "quantity": 2 }` |
| `DELETE` | `/api/v1/cart/items/{cartItemId}` | Remove item from cart | — |
| `DELETE` | `/api/v1/cart` | Clear entire cart | — |

### 3.6 Order Module & Tracking
| Method | Endpoint | Description | Request Body / Query |
|---|---|---|---|
| `POST` | `/api/v1/orders` | Checkout cart & create order | `{ "addressId": "<uuid>", "paymentMethod": "ONLINE", "notes": "Less spicy" }` |
| `GET` | `/api/v1/orders/me/active` | Get active order for live tracking | Returns order in status `PLACED`, `CONFIRMED`, `PREPARING`, `READY_FOR_PICKUP`, or `OUT_FOR_DELIVERY` |
| `GET` | `/api/v1/orders/me` | Get order history | `page`, `size` |
| `GET` | `/api/v1/orders/{id}` | Get detailed order status | — |
| `POST` | `/api/v1/orders/{id}/cancel` | Cancel order | `{ "reason": "Changed my mind" }` |

### 3.7 Payment Module (Razorpay Integration)
| Method | Endpoint | Description | Request Body |
|---|---|---|---|
| `POST` | `/api/v1/payments/initiate` | Create Razorpay Order ID | `{ "orderId": "<uuid>" }` |
| `POST` | `/api/v1/payments/verify` | Verify client Razorpay signature | `{ "orderId": "<uuid>", "razorpayOrderId": "order_xxx", "razorpayPaymentId": "pay_xxx", "razorpaySignature": "sig_xxx" }` |
| `POST` | `/api/v1/payments/refund` | Request refund for order | `{ "orderId": "<uuid>", "reason": "Order cancelled" }` |

### 3.8 Favorites, Coupons & Reviews
| Method | Endpoint | Description | Request Body / Query |
|---|---|---|---|
| `GET` | `/api/v1/favorites/restaurants` | List favorite restaurants | — |
| `POST` | `/api/v1/favorites/restaurants/{id}` | Add restaurant to favorites | — |
| `DELETE` | `/api/v1/favorites/restaurants/{id}` | Remove from favorites | — |
| `GET` | `/api/v1/coupons` | List available offer coupons | — |
| `POST` | `/api/v1/coupons/validate` | Validate coupon code | `{ "code": "FOODIE50", "cartAmount": 450.00 }` |
| `POST` | `/api/v1/reviews` | Rate & review restaurant | `{ "orderId": "<uuid>", "restaurantRating": 5, "comment": "Delicious food!" }` |
| `GET` | `/api/v1/reviews/restaurant/{id}` | Get restaurant reviews | `page`, `size` |

---

## 🏪 4. Restaurant Owner App APIs

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/restaurants` | Register new restaurant profile |
| `PUT` | `/api/v1/restaurants/my` | Update restaurant details |
| `POST` | `/api/v1/restaurants/my/logo` | Upload restaurant logo image |
| `POST` | `/api/v1/restaurants/my/cover` | Upload restaurant cover image |
| `POST` | `/api/v1/restaurants/my/documents` | Upload FSSAI / GST documents |
| `POST` | `/api/v1/menu/categories` | Add menu category |
| `POST` | `/api/v1/menu/items` | Add new food item |
| `PUT` | `/api/v1/menu/items/{id}/availability` | Toggle food item availability |

---

## 🛡️ 5. Admin Portal APIs

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/login/admin` | Admin email & password login |
| `POST` | `/api/v1/admin/restaurants/{id}/approve` | Approve restaurant application |
| `POST` | `/api/v1/admin/restaurants/{id}/suspend` | Suspend restaurant account |
| `POST` | `/api/v1/admin/restaurants/{id}/documents/{docId}/verify` | Verify restaurant legal documents |

---

## ⚙️ 6. Keys & Secrets Configuration Reference

Below are the development keys configured in `apps/api/src/main/resources/application-local.yml`:

| Configuration Parameter | Value (Local Dev) | Production Environment Variable |
|---|---|---|
| **JWT Secret Key** | `404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970` | `JWT_SECRET` |
| **Razorpay Mode** | `stub` (Local Mock) | `RAZORPAY_MODE` (`live` / `stub`) |
| **Razorpay Key ID** | `rzp_test_local` | `RAZORPAY_KEY_ID` |
| **Razorpay Key Secret** | `local-razorpay-key-secret` | `RAZORPAY_KEY_SECRET` |
| **Razorpay Webhook Secret** | `local-razorpay-webhook-secret` | `RAZORPAY_WEBHOOK_SECRET` |
| **Database URL** | `jdbc:postgresql://localhost:5433/foodie` | `DB_HOST`, `DB_PORT`, `DB_NAME` |
| **Database User / Pass** | `foodie` / `foodie` | `DB_USER`, `DB_PASSWORD` |
| **Redis Host / Port** | `localhost:6379` | `REDIS_HOST`, `REDIS_PORT` |

---

> **Note to Frontend Team**: You can test all endpoints using dummy tokens or register a customer via `/api/v1/auth/register` to get a real JWT token. All 42 endpoints return structured response payloads ready for immediate UI integration.
