# Electronics E-commerce Backend API

## Base URL
```
http://localhost:3001/api
```

## Products

### Get All Products
```
GET /products
```

Query Parameters:
- `category` - Filter by category (e.g., laptops, phones, audio, gaming, tablets, accessories)
- `brand` - Filter by brand(s), comma-separated (e.g., Dell,Apple,Samsung)
- `minPrice` - Minimum price filter
- `maxPrice` - Maximum price filter
- `search` - Search in name and description
- `sort` - Sort field (price, rating, name)
- `order` - Sort order (asc, desc)

Example:
```
GET /products?category=laptops&brand=Dell&sort=price&order=desc
```

### Get Single Product
```
GET /products/:id
```

### Create Product
```
POST /products
```

Request Body:
```
json
{
  "name": "Product Name",
  "description": "Product description",
  "price": 999,
  "originalPrice": 1299,
  "image": "/product-image.png",
  "category": "laptops",
  "brand": "Dell",
  "inStock": true,
  "specs": {
    "processor": "Intel Core i7",
    "ram": "16GB"
  }
}
```

### Update Product
```
PUT /products/:id
```

### Delete Product
```
DELETE /products/:id
```

## Categories

### Get All Categories
```
GET /categories
```

### Get Single Category
```
GET /categories/:id
```

### Create Category
```
POST /categories
```

Request Body:
```
json
{
  "id": "new-category",
  "name": "New Category",
  "icon": "IconName",
  "count": 10
}
```

## Brands

### Get All Brands
```
GET /brands
```

## Testimonials

### Get All Testimonials
```
GET /testimonials
```

## Cart

### Get Cart
```
GET /cart
```
Requires header: `x-session-id` for session management

### Add to Cart
```
POST /cart
```

Request Body:
```
json
{
  "productId": "1",
  "quantity": 1
}
```

### Update Cart Item Quantity
```
PUT /cart/:productId
```

Request Body:
```
json
{
  "quantity": 2
}
```

### Remove from Cart
```
DELETE /cart/:productId
```

### Clear Cart
```
DELETE /cart
```

## Wishlist

### Get Wishlist
```
GET /wishlist
```
Requires header: `x-session-id` for session management

### Add to Wishlist
```
POST /wishlist
```

Request Body:
```
json
{
  "productId": "1"
}
```

### Remove from Wishlist
```
DELETE /wishlist/:productId
```

### Check if Product in Wishlist
```
GET /wishlist/:productId
```

## Orders

### Get All Orders
```
GET /orders
```

### Get Single Order
```
GET /orders/:id
```

### Create Order
```
POST /orders
```

Request
{
  " Body:
```
jsonshippingAddress": {
    "name": "John Doe",
    "address": "123 Main St",
    "city": "New York",
    "zip": "10001"
  },
  "paymentMethod": "credit_card"
}
```

### Update Order Status
```
PUT /orders/:id
```

Request Body:
```
json
{
  "status": "shipped"
}
```

## Health Check

### Check API Health
```
GET /health
```

## Session Management

The API uses `x-session-id` header to identify users for cart and wishlist operations. If not provided, a default session is used.

Example:
```
javascript
fetch('http://localhost:3001/api/cart', {
  headers: {
    'x-session-id': 'user-session-123'
  }
})
