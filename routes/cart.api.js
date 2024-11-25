const express = require("express");
const authController = require("../controllers/auth.controller");
const cartController = require("../controllers/cart.controller");
const router = express.Router();

router.post("/", authController.authenticate, cartController.addItemToCart);

router.get("/", authController.authenticate, cartController.getCart);

router.get(
  "/getCartQty",
  authController.authenticate,
  cartController.getCartQty
);

router.delete(
  "/all",
  authController.authenticate,
  cartController.deleteCartAll
);
router.delete("/:id", authController.authenticate, cartController.deleteCart);

router.put(
  "/updateQty/:id",
  authController.authenticate,
  cartController.updateQty
);

module.exports = router;
