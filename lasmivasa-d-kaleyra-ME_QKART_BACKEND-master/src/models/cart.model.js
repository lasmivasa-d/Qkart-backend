const mongoose = require('mongoose');
const { productSchema } = require('./product.model');
const config = require("../config/config")

// TODO: CRIO_TASK_MODULE_CART - Complete cartSchema, a Mongoose schema for "carts" collection
const cartItemSchema = mongoose.Schema(
  {
    product: productSchema,
    quantity: {
      type: Number,
      required: true,
    },
  }
);

const cartSchema = mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    cartItems: {
      type: [cartItemSchema], // cartItems is an array of cartItemSchema
    },
    paymentOption: {
      type: String,
      default: config.default_payment_option,
    }
  },
  {
    timestamps: false, 
  }
);


/**
 * @typedef Cart
 */
const Cart = mongoose.model('Cart', cartSchema);

module.exports.Cart = Cart;