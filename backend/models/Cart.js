/**
 * Cart Model
 * Handles shopping cart for users and guests
 */

const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: [true, 'Please add a quantity'],
    min: [1, 'Quantity must be at least 1'],
    default: 1
  },
  price: {
    type: Number,
    required: [true, 'Product price is required']
  }
}, { _id: false });

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  sessionId: {
    type: String,
    default: null
  },
  items: [cartItemSchema],
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  }
}, {
  timestamps: true
});

// Index for user or session
cartSchema.index({ user: 1 });
cartSchema.index({ sessionId: 1 });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for total price
cartSchema.virtual('totalPrice').get(function() {
  return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
});

// Virtual for total items
cartSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Method to add item to cart
cartSchema.methods.addItem = async function(productId, quantity, price) {
  const existingItem = this.items.find(item => 
    item.product.toString() === productId.toString()
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    this.items.push({ product: productId, quantity, price });
  }

  return this.save();
};

// Method to update item quantity
cartSchema.methods.updateItemQuantity = async function(productId, quantity) {
  const item = this.items.find(item => 
    item.product.toString() === productId.toString()
  );

  if (!item) {
    throw new Error('Item not found in cart');
  }

  if (quantity <= 0) {
    this.items = this.items.filter(item => 
      item.product.toString() !== productId.toString()
    );
  } else {
    item.quantity = quantity;
  }

  return this.save();
};

// Method to remove item from cart
cartSchema.methods.removeItem = async function(productId) {
  this.items = this.items.filter(item => 
    item.product.toString() !== productId.toString()
  );

  return this.save();
};

// Method to clear cart
cartSchema.methods.clear = async function() {
  this.items = [];
  return this.save();
};

// Static method to merge guest cart into user cart
cartSchema.statics.mergeCarts = async function(guestSessionId, userId) {
  const guestCart = await this.findOne({ sessionId: guestSessionId });
  const userCart = await this.findOne({ user: userId });

  if (!guestCart || guestCart.items.length === 0) {
    return userCart;
  }

  if (userCart) {
    // Merge guest items into user cart
    for (const guestItem of guestCart.items) {
      const existingItem = userCart.items.find(item =>
        item.product.toString() === guestItem.product.toString()
      );

      if (existingItem) {
        existingItem.quantity += guestItem.quantity;
      } else {
        userCart.items.push({
          product: guestItem.product,
          quantity: guestItem.quantity,
          price: guestItem.price
        });
      }
    }

    await userCart.save();
    await guestCart.deleteOne();
    return userCart;
  } else {
    // Convert guest cart to user cart
    guestCart.user = userId;
    guestCart.sessionId = null;
    return guestCart.save();
  }
};

module.exports = mongoose.model('Cart', cartSchema);

