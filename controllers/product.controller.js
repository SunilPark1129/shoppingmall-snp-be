const Product = require("../models/Product");

const productController = {};
const PAGE_SIZE = 6;

productController.createProduct = async (req, res) => {
  try {
    const {
      sku,
      name,
      size,
      image,
      category,
      description,
      price,
      stock,
      status,
    } = req.body;

    const product = new Product({
      sku,
      name,
      size,
      image,
      category,
      description,
      price,
      stock,
      status,
    });

    await product.save();
    res.status(200).json({ status: "success", product });
  } catch (error) {
    res.status(400).json({ status: "fail", message: error.message });
  }
};

productController.getProduct = async (req, res) => {
  try {
    let { page, name, category } = req.query;
    page = page || 1;

    const cond = {};

    if (name) {
      cond.name = { $regex: name, $options: "i" };
    }

    if (category?.length > 0) {
      const categoryArray = Array.isArray(category) ? category : [category];

      if (categoryArray.includes("sale")) {
        cond.sale = { $ne: 0 };
      }

      const filteredCategoryArray = categoryArray.filter(
        (item) => item !== "sale"
      );

      if (filteredCategoryArray.length !== 0) {
        cond.category = { $all: filteredCategoryArray };
      }
    }

    let query = Product.find(cond);

    query.sort({ createdAt: -1 });

    const response = { status: "success" };

    query.skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE);

    const totalItemNum = await Product.find(cond).countDocuments(); // count()는 더이상 지원하지 않고 countDocuments로 전체 숫자만 가져옴

    const totalPageNum = Math.ceil(totalItemNum / PAGE_SIZE);
    response.totalPageNum = totalPageNum;

    const productList = await query.exec();
    response.data = productList;

    res.status(200).json({ ...response });
  } catch (error) {
    res.status(400).json({ status: "fail", message: error.message });
  }
};

productController.getProductHome = async (req, res) => {
  try {
    const categories = [
      ["female", "pants"],
      ["female", "top"],
      ["female", "dress"],
      ["male", "pants"],
      ["male", "top"],
    ];

    const pipeline = [
      {
        $match: {
          isDeleted: false,
          status: "active",
        },
      },
      {
        $facet: categories.reduce((facet, category) => {
          const key = category.join("_");
          facet[key] = [
            { $match: { category: { $all: category } } },
            { $sort: { createdAt: -1 } },
            { $limit: 8 },
          ];
          return facet;
        }, {}),
      },
    ];

    const result = await Product.aggregate(pipeline);

    res.status(200).json(result[0]);
  } catch (error) {
    console.error("Error in getProductHome:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

productController.getDetail = async (req, res) => {
  try {
    let { id } = req.query;
    const product = await Product.findById(
      { _id: id },
      "-createdAt -updatedAt -__v"
    );
    if (!product) throw new Error("item doesn't exist");
    res.status(200).json({ status: "success", data: product });
  } catch (error) {
    res.status(400).json({ status: "fail", message: error.message });
  }
};

productController.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const {
      sku,
      name,
      size,
      image,
      price,
      description,
      category,
      stock,
      status,
      sale,
    } = req.body;

    const product = await Product.findByIdAndUpdate(
      { _id: productId },
      {
        sku,
        name,
        size,
        image,
        price,
        description,
        category,
        stock,
        status,
        sale,
      },
      { new: true }
    );

    if (!product) throw new Error("item doesn't exist");
    res.status(200).json({ status: "success", data: product });
  } catch (error) {
    res.status(400).json({ status: "fail", message: error.message });
  }
};

productController.updateSale = async (req, res) => {
  try {
    const productId = req.params.id;
    const { sale } = req.body;

    const updatedProduct = await Product.findByIdAndUpdate(productId, {
      $set: { sale: sale },
    });

    if (!updatedProduct)
      return res
        .status(404)
        .json({ status: "fail", message: "could not find item" });

    res.status(200).json({ status: "success", data: updatedProduct });
  } catch (error) {
    res.status(400).json({ status: "fail", data: error.message });
  }
};

productController.deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findByIdAndDelete({ _id: productId });
    if (!product) throw new Error("could not find item id");
    res.status(200).json({ status: "success", data: product });
  } catch (error) {
    res.status(400).json({ status: "fail", message: error.message });
  }
};

productController.checkStock = async (item) => {
  const product = await Product.findById(item.productId);

  if (product.stock[item.size] < item.qty) {
    return {
      isVerify: false,
      message: `Insufficient stock for ${product.name} in size ${item.size}. `,
    };
  }

  return { isVerify: true, message: "" };
};

productController.updateStock = async (item) => {
  const product = await Product.findById(item.productId);

  const newStock = { ...product.stock };
  newStock[item.size] -= item.qty;
  product.stock = newStock;

  await product.save();
  return;
};

productController.checkItemListStock = async (itemList) => {
  try {
    const insufficientStockItems = [];
    await Promise.all(
      itemList.map(async (item) => {
        const stockCheck = await productController.checkStock(item);
        if (!stockCheck.isVerify)
          return insufficientStockItems.push(stockCheck);
      })
    );

    if (insufficientStockItems.length > 0) {
      const errorMessage = insufficientStockItems.reduce(
        (total, item) => (total += item.message),
        ""
      );
      throw new Error(errorMessage);
    }

    await Promise.all(
      itemList.map(async (item) => {
        await productController.updateStock(item);
      })
    );

    return;
  } catch (error) {
    throw new Error(error.message);
  }
};

module.exports = productController;
