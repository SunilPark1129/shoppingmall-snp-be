const Cart = require("../models/Cart");

const cartController = {};

cartController.addItemToCart = async (req, res) => {
  try {
    const { userId } = req;
    const { productId, size, qty } = req.body;
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId });
      await cart.save();
    }

    const existItem = cart.items.find(
      (item) => item.productId.equals(productId) && item.size === size
    );

    if (existItem) throw new Error("The item is already in the cart.");

    cart.items = [...cart.items, { productId, size, qty }];
    await cart.save();
    res
      .status(200)
      .json({ status: "success", data: cart, cartItemQty: cart.items.length });
  } catch (error) {
    return res.status(400).json({ status: "fail", message: error.message });
  }
};

cartController.getCart = async (req, res) => {
  try {
    const { userId } = req;
    const cart = await Cart.findOne({ userId }).populate({
      path: "items",
      populate: {
        path: "productId",
        model: "Product",
      },
    });
    res.status(200).json({ status: "success", data: cart.items });
  } catch (error) {
    return res.status(400).json({ status: "fail", message: error.message });
  }
};

cartController.getCartQty = async (req, res) => {
  try {
    const { userId } = req;
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId });
      await cart.save();
    }
    const qty = cart.items.length;
    res.status(200).json({ status: "success", qty });
  } catch (error) {
    return res.status(400).json({ status: "fail", message: error.message });
  }
};

cartController.deleteCart = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;
    const cart = await Cart.findOne({ userId });
    cart.items = cart.items.filter(({ _id }) => !_id.equals(id));
    await cart.save();
    res.status(200).json({
      status: "success",
      message: "Item has been successfully removed from the cart.",
    });
  } catch (error) {
    return res.status(400).json({ status: "fail", message: error.message });
  }
};

cartController.deleteCartAll = async (req, res) => {
  try {
    const { userId } = req;
    await Cart.updateOne({ userId }, { $set: { items: [] } });
    res.status(200).json({
      status: "success",
      message: "All items have been successfully removed from the cart.",
    });
  } catch (error) {
    return res.status(400).json({ status: "fail", message: error.message });
  }
};

cartController.updateQty = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;
    const { qty } = req.body;
    const cart = await Cart.findOne({ userId });

    const target = cart.items.findIndex(({ _id }) => _id.equals(id));

    if (target === -1) throw new Error("Cannot find the item to edit.");

    cart.items[target].qty = qty;
    cart.items = [...cart.items];

    await cart.save();

    res.status(200).json({
      status: "success",
      data: cart.items,
    });
  } catch (error) {
    return res.status(400).json({ status: "fail", message: error.message });
  }
};

module.exports = cartController;
