const httpStatus = require("http-status");
const { Cart, Product } = require("../models");
const ApiError = require("../utils/ApiError");
const config = require("../config/config");


/**
 * Fetches cart for a user
 * - Fetch user's cart from Mongo
 * - If cart doesn't exist, throw ApiError
 * --- status code  - 404 NOT FOUND
 * --- message - "User does not have a cart"
 *
 * @param {User} user
 * @returns {Promise<Cart>}
 * @throws {ApiError}
 */
const getCartByUser = async (user) => {
    const obtainCart = await Cart.findOne({email: user.email});
    if (!obtainCart) {
      throw new ApiError(httpStatus.NOT_FOUND, "User does not have a cart");
    } else {
      return obtainCart;
    }
};

/**
 * Adds a new product to cart
 * - Get user's cart object using "Cart" model's findOne() method
 * --- If it doesn't exist, create one
 * --- If cart creation fails, throw ApiError with "500 Internal Server Error" status code
 *
 * - If product to add already in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product already in cart. Use the cart sidebar to update or remove product from cart"
 *
 * - If product to add not in "products" collection in MongoDB, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product doesn't exist in database"
 *
 * - Otherwise, add product to user's cart
 *
 *
 *
 * @param {User} user
 * @param {string} productId
 * @param {number} quantity
 * @returns {Promise<Cart>}
 * @throws {ApiError}
 */
 const addProductToCart = async (user, productId, quantity) => {
      let obtainCart = await Cart.findOne({ email: user.email });

      const product = await Product.findById(productId);
      if (!product) {
          throw new ApiError(httpStatus.BAD_REQUEST, "Product doesn't exist in database");
      }

      if (!obtainCart) {
          obtainCart = await Cart.create({
              email: user.email,
              cartItems: [{ product: product, quantity: quantity }]
          });
          if (!obtainCart) {
              throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR);
          }
      } else {
          const itemAlreadyExist = obtainCart.cartItems.some(item => item.product._id == productId);
          if (itemAlreadyExist) {
              throw new ApiError(httpStatus.BAD_REQUEST, "Product already in cart. Use the cart sidebar to update or remove product from cart");
          } else {
              obtainCart.cartItems.push({ product: product, quantity: quantity });
              obtainCart = await obtainCart.save();
          }
      }

      return obtainCart;
};


/**
 * Updates the quantity of an already existing product in cart
 * - Get user's cart object using "Cart" model's findOne() method
 * - If cart doesn't exist, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "User does not have a cart. Use POST to create cart and add a product"
 *
 * - If product to add not in "products" collection in MongoDB, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product doesn't exist in database"
 *
 * - If product to update not in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product not in cart"
 *
 * - Otherwise, update the product's quantity in user's cart to the new quantity provided and return the cart object
 *
 *
 * @param {User} user
 * @param {string} productId
 * @param {number} quantity
 * @returns {Promise<Cart>}
 * @throws {ApiError}
 */
const updateProductInCart = async (user, productId, quantity) => {
    let obtainCart = await Cart.findOne({email: user.email});
    if (!obtainCart) {
        throw new ApiError(httpStatus.BAD_REQUEST, "User does not have a cart. Use POST to create cart and add a product");
    }

    const product = await Product.findById(productId);
    if (!product) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Product doesn't exist in database");
    }

    const index = obtainCart.cartItems.findIndex(ele => ele.product._id == productId);
    if (index !== -1) {
        obtainCart.cartItems[index].quantity = quantity;
        obtainCart = await obtainCart.save();
    } else {
        throw new ApiError(httpStatus.BAD_REQUEST, "Product not in cart");
    }

    return obtainCart;
};

/**
 * Deletes an already existing product in cart
 * - If cart doesn't exist for user, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "User does not have a cart"
 *
 * - If product to update not in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product not in cart"
 *
 * Otherwise, remove the product from user's cart
 *
 *
 * @param {User} user
 * @param {string} productId
 * @throws {ApiError}
 */
 const deleteProductFromCart = async (user, productId) => {
    let obtainCart = await Cart.findOne({ email: user.email });
    if (!obtainCart) {
        throw new ApiError(httpStatus.BAD_REQUEST, "User does not have a cart. Use POST to create cart and add a product");
    }

    const numberOfProductsInCartBeforeDelete = obtainCart.cartItems.length;

    obtainCart.cartItems = obtainCart.cartItems.filter(item => item.product._id != productId);

    const numberOfProductsInCartAfterDelete = obtainCart.cartItems.length;

    if (numberOfProductsInCartBeforeDelete === numberOfProductsInCartAfterDelete) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Product not in cart");
    }

    await obtainCart.save();
};

// TODO: CRIO_TASK_MODULE_TEST - Implement checkout function
/**
 * Checkout a users cart.
 * On success, users cart must have no products.
 *
 * @param {User} user 
 * @returns {Promise}
 * @throws {ApiError} when cart is invalid
 */
 const checkout = async (user) => {
    let obtainCart = await Cart.findOne({email: user.email});
    if (!obtainCart) {
        throw new ApiError(httpStatus.NOT_FOUND, "User has no Cart");
    }

    // console.log(await user.hasSetNonDefaultAddress)

    if (obtainCart.cartItems.length == 0) {
        // console.log("sneaky");
        throw new ApiError(httpStatus.BAD_REQUEST, "Cart has no items");
    }

    let boolVal = await user.hasSetNonDefaultAddress(); 
    if (user.address === config.default_address) { 
        throw new ApiError(httpStatus.BAD_REQUEST, "User's address is not set");
    }
    
    let totalCost = 0;
    obtainCart.cartItems.forEach(item => totalCost += item.product.cost*item.quantity);

    if (totalCost > user.walletMoney) {
        // console.log("hi");
        throw new ApiError(httpStatus.BAD_REQUEST, "Insufficient balance");
    }

    obtainCart.cartItems = [];
    await obtainCart.save();
    user.walletMoney = user.walletMoney - totalCost;
    await user.save();
};

module.exports = {
  getCartByUser,
  addProductToCart,
  updateProductInCart,
  deleteProductFromCart,
  checkout,
};
