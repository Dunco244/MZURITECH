/**
 * Wishlist Model
 * Handles user wishlists for saving favorite products
 */

const mongoose = require('mongoose');

const wishlistItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  }
}, { _id: false });

const wishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  sessionId: {
    type: String,
    default: null
  },
  items: [wishlistItemSchema]
}, {
  timestamps: true
});

// Index for user or session
wishlistSchema.index({ user: 1 });
wishlistSchema.index({ sessionId: 1 });

// Method to add product to wishlist
wishlistSchema.methods.addProduct = async function(productId) {
  const exists = this.items.some(item => 
    item.product.toString() === productId.toString()
  );

  if (!exists) {
    this.items.push({ product: productId });
    return this.save();
  }

  return this;
};

// Method to remove product from wishlist
wishlistSchema.methods.removeProduct = async function(productId) {
  this.items = this.items.filter(item => 
    item.product.toString() !== productId.toString()
  );

  return this.save();
};

// Method to check if product is in wishlist
wishlistSchema.methods.hasProduct = function(productId) {
  return this.items.some(item => 
    item.product.toString() === productId.toString()
  );
};

// Method to clear wishlist
wishlistSchema.methods.clear = async function() {
  this.items = [];
  return this.save();
};

// Static method to merge guest wishlist into user wishlist
wishlistSchema.statics.mergeWishlists = async function(guestSessionId, userId) {
  const guestWishlist = await this.findOne({ sessionId: guestSessionId });
  const userWishlist = await this.findOne({ user: userId });

  if (!guestWishlist || guestWishlist.items.length === 0) {
    return userWishlist;
  }

  if (userWishlist) {
    // Merge guest items into user wishlist
    for (const guestItem of guestWishlist.items) {
      const exists = userWishlist.items.some(item =>
        item.product.toString() === guestItem.product.toString()
      );

      if (!exists) {
        userWishlist.items.push({ product: guestItem.product });
      }
    }

    await userWishlist.save();
    await guestWishlist.deleteOne();
    return userWishlist;
  } else {
    // Convert guest wishlist to user wishlist
    guestWishlist.user = userId;
    guestWishlist.sessionId = null;
    return guestWishlist.save();
  }
};

module.exports = mongoose.model('Wishlist', wishlistSchema);

