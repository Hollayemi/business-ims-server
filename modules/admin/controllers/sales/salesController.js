const mongoose = require("mongoose");

const Customer = require("../../models/customerSchema");
const Financial = require("../../models/financialSchema");
const Sales = require("../../models/salesSchema");
const PurchaseSchema = require("../../models/purchaseSchema");
const DuePayment = require("../../models/duePaymentSchema");
const { getReportPipeline } = require("./pipeline");
const { updateDailyStock } = require("./dailyStockHelper");

//get all sales
const getAllSales = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default page is 1
    const limit = parseInt(req.query.limit) || 10; // Default limit is 10
    const skip = (page - 1) * limit; // Calculate offset

    // search query and filter
    const { query, filter } = req.query || {};

    // Create search filter
    const searchQuery = {
      storeInfo: req.store.storeId,
    };

    // If filter is due/complete
    if (filter === "due") {
      searchQuery.paymentStatus = "due";
      searchQuery.due = { $gt: 0 };
    } else if (filter === "completed") {
      searchQuery.paymentStatus = "completed";
    }

    // Apply text search (trxid )
    if (query && query !== "undefined" && query.trim()) {
      const regex = new RegExp(query.trim(), "i");
      searchQuery.$or = [{ trxid: regex }];
    }

    // Get total count
    const totalSales = await Sales.countDocuments(searchQuery);

    //get all sales
    const sales = await Sales.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    for (const sale of sales) {
      // Check if `customer` is an ObjectId (string)
      if (mongoose.isValidObjectId(sale.customer)) {
        sale.customer = await Customer.findById(sale.customer).lean();
      }
    }

    //send the response
    if (sales) {
      res.json({
        data: sales,
        total: totalSales,
        currentPage: page,
        totalPages: Math.ceil(totalSales / limit),
        limit: limit,
      });
    } else {
      res.json({
        errors: {
          common: {
            msg: "Unknown error occured!",
          },
        },
      });
    }
  } catch (err) {
    console.error("Error in getAllSales:", err);
    res.json({
      errors: {
        common: {
          msg: err.message,
        },
      },
    });
  }
};


const getReport = async (req, res) => {
  try {
    const { customer, startDate, endDate, query, filter, page = 1, limit = 10 } = req.query;
    const currentPage = parseInt(page);
    const currentLimit = parseInt(limit);
    const skip = (currentPage - 1) * currentLimit;

    console.log('Report Query Parameters:', { customer, startDate, endDate, query, filter, page, limit });

    // Build match stage for filtering
    let matchStage = {
      storeInfo: new mongoose.Types.ObjectId(req.store.storeId)
    };

    // Date range filter
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        matchStage.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchStage.createdAt.$lte = end;
      }
    }

    // Payment status filter
    if (filter === "due") {
      matchStage.paymentStatus = "due";
      matchStage.due = { $gt: 0 };
    } else if (filter === "completed") {
      matchStage.paymentStatus = "completed";
    }

    console.log('Match Stage:', JSON.stringify(matchStage, null, 2));

    // Customer filter - applies after customer lookup
    let customerFilter = {};

    // Search by transaction ID or customer name
    if (query && query !== "undefined" && query.trim()) {
      const searchRegex = new RegExp(query.trim(), "i");

      // Search in trxid at match stage
      if (!matchStage.$or) {
        matchStage.$or = [];
      }
      matchStage.$or.push({ trxid: searchRegex });

      // Search in customer name after lookup
      customerFilter.$or = [
        { "customer.name": searchRegex }
      ];
    }

    // Specific customer filter
    if (customer && customer !== "undefined" && customer.trim()) {
      const customerRegex = new RegExp(customer.trim(), "i");
      customerFilter["customer.name"] = customerRegex;
    }

    // If there's no $or in matchStage, remove it
    if (matchStage.$or && matchStage.$or.length === 0) {
      delete matchStage.$or;
    }

    console.log('Customer Filter:', JSON.stringify(customerFilter, null, 2));

    // Build the aggregation pipeline
    const pipeline = getReportPipeline(matchStage, customerFilter, skip, currentLimit);

    console.log('Running aggregation pipeline...');

    // Execute aggregation
    const result = await Sales.aggregate(pipeline);

    console.log('Aggregation result:', result.length > 0 ? 'Data found' : 'No data found');

    // Format the response
    if (result.length > 0 && result[0].items) {
      const reportData = result[0];

      console.log(reportData)

      res.json({
        data: reportData.items || [],
        summary: {
          totalItems: reportData.totalItems || 0,
          totalSale: reportData.totalSale || 0,
          received: reportData.received || 0,
          due: reportData.duePayment || 0,
          bank: reportData.bank || 0,
          cash: reportData.cash || 0,
          customers: reportData.customers || [],
          totalOrders: reportData.totalOrders || 0
        },
        pagination: {
          total: reportData.totalOrders || 0,
          currentPage: currentPage,
          totalPages: Math.ceil((reportData.totalOrders || 0) / currentLimit),
          limit: currentLimit
        }
      });
    } else {
      // Check if there are any sales at all for debugging
      const totalSalesCount = await Sales.countDocuments({ storeInfo: req.store.storeId });
      console.log('Total sales in database for this store:', totalSalesCount);

      if (totalSalesCount > 0) {
        console.log('Sales exist but filters returned no results');
        // Get one sample sale for debugging
        const sampleSale = await Sales.findOne({ storeInfo: req.store.storeId }).lean();
        console.log('Sample sale structure:', {
          _id: sampleSale._id,
          customer: typeof sampleSale.customer,
          hasCart: !!sampleSale.cart,
          cartLength: sampleSale.cart?.length,
          createdAt: sampleSale.createdAt,
          paymentStatus: sampleSale.paymentStatus
        });
      }

      // No results found
      res.json({
        data: [],
        summary: {
          totalItems: 0,
          totalSale: 0,
          bank: 0,
          cash: 0,
          customers: [],
          totalOrders: 0
        },
        pagination: {
          total: 0,
          currentPage: currentPage,
          totalPages: 0,
          limit: currentLimit
        }
      });
    }

  } catch (err) {
    console.error("Error in getReport:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({
      errors: {
        common: {
          msg: err.message,
        },
      },
    });
  }
};


//get all sales
const getDueSales = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default page is 1
    const limit = parseInt(req.query.limit) || 10; // Default limit is 10
    const skip = (page - 1) * limit; // Calculate offset

    // Get total count
    const totalDueSales = await Sales.countDocuments({
      storeInfo: req.store.storeId,
      due: { $gt: 0 },
    });

    //get all sales
    const dueSales = await Sales.find({
      storeInfo: req.store?.storeId,
      due: { $gt: 0 },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    for (const sale of dueSales) {
      // Check if `customer` is an ObjectId (string)
      if (mongoose.isValidObjectId(sale.customer)) {
        sale.customer = await Customer.findById(sale.customer).lean();
      }
    }

    //send the response
    if (dueSales) {
      res.json({
        data: dueSales,
        total: totalDueSales,
        currentPage: page,
        totalPages: Math.ceil(totalDueSales / limit),
        limit: limit,
      });
    } else {
      res.json({
        errors: {
          common: {
            msg: "Unknown error occured!",
          },
        },
      });
    }
  } catch (err) {
    res.json({
      errors: {
        common: {
          msg: err.message,
        },
      },
    });
  }
};

//search sales by trxid
const searchSalesByTrxId = async (req, res) => {
  try {
    //get trxid
    const trxid = req.query.trxId;

    //search sales by trxid
    const sales = await Sales.findOne({
      trxid: trxid,
      storeInfo: req.store?.storeId,
    }).populate("cart.product");

    //send the response
    if (sales) {
      res.json({
        data: sales,
      });
    } else {
      res.json({
        data: [],
      });
    }
  } catch (err) {
    res.json({
      errors: {
        common: {
          msg: err.message,
        },
      },
    });
  }
};

//search due sales by trxid or customer name
const searchDueSalesByNameTrxId = async (req, res) => {
  try {
    const searchQuery = req.query.query?.trim();
    const storeId = req.store?.storeId;

    if (!searchQuery || !storeId) {
      return res.status(400).json({
        errors: {
          common: {
            msg: "Search query and store ID are required",
          },
        },
      });
    }
    // Find customers by name
    const matchedCustomers = await Customer.find({
      storeInfo: storeId,
      name: new RegExp(searchQuery, "i"),
    }).select("_id");

    const customerIds = matchedCustomers.map((c) => c._id.toString());

    // Use $or to search by trxid or customer id
    const sales = await Sales.find({
      storeInfo: storeId,
      due: { $gt: 0 },
      $or: [
        { trxid: new RegExp(searchQuery, "i") },
        { customer: { $in: customerIds } },
      ],
    }).populate("cart.product customer");

    //send the response
    if (sales) {
      res.json({
        data: sales,
      });
    } else {
      res.json({
        data: [],
      });
    }
  } catch (err) {
    res.json({
      errors: {
        common: {
          msg: err.message,
        },
      },
    });
  }
};


//get a single sales
const getSale = async (req, res) => {
  try {
    //get sales id
    const salesId = req.params.salesId;

    //get all sales
    const sale = await Sales.findOne({
      _id: salesId,
      storeInfo: req.store?.storeId,
    }).populate(["cart.product", "bankInfo"]);

    // Check if `customer` is an ObjectId (string)
    if (mongoose.isValidObjectId(sale.customer)) {
      sale.customer = await Customer.findById(sale.customer).lean();
    }

    //get the due payment history for this sale
    const getDuePayments = await DuePayment.find({
      saleId: salesId,
      storeInfo: req.store?.storeId,
    }).populate("bankInfo").sort({ createdAt: -1 });

    //send the response
    if (sale) {
      res.json({
        data: sale,
        histories: getDuePayments,
      });
    } else {
      res.json({
        errors: {
          common: {
            msg: "Unknown error occured!",
          },
        },
      });
    }
  } catch (err) {
    res.json({
      errors: {
        common: {
          msg: err.message,
        },
      },
    });
  }
};


const createSalesPayment = async (req, res) => {
  try {
    //create sales payment
    console.log("====>", req.body)
    const sale = req.body
    const salesPayment = new Sales({
      ...sale,
      storeInfo: req.store?.storeId,
    });

    // Update daily stock for each item in cart
    for (const item of sale.cart) {
      await updateDailyStock(
        item.product,
        item.qty,  // quantity sold
        0,         // quantity added (0 for sales)
        req.store?.storeId,
        sale.createdAt // use sale date
      );
    }

    //save sales payment
    const sales = await salesPayment.save();

    //send the response
    if (sales && sales?._id) {
      res.json({
        data: sales,
        msg: "Sales was create successful!",
      });
    } else {
      res.json({
        errors: {
          common: {
            msg: "Unknown error occured!1",
          },
        },
      });
    }
  } catch (err) {
    res.json({
      errors: {
        common: {
          msg: err.message,
        },
      },
    });
  }
};


const createDueSalesPayment = async (req, res) => {
  try {
    console.log(req.body)
    if (!req.body.amount) {
      return res.json({
        errors: {
          common: {
            msg: "Paid amount is required!",
          },
        },
      });
    }
    //check if amount is number
    if (isNaN(req.body.amount)) {
      return res.json({
        errors: {
          common: {
            msg: "Paid amount must be a number!",
          },
        },
      });
    }
    //check if amount is a valid number
    if (req.body.amount < 0 || !isFinite(req.body.amount)) {
      return res.json({
        errors: {
          common: {
            msg: "Paid amount must be a valid number!",
          },
        },
      });
    }

    const amount = parseInt(req.body.amount);

    //check if salesid is exists
    if (!req.body.saleId) {
      return res.json({
        errors: {
          common: {
            msg: "Sale ID is required!",
          },
        },
      });
    }
    //check if sale exists
    const existingSale = await Sales.findOne({
      _id: req.body.saleId,
      storeInfo: req.store?.storeId,
    });
    if (!existingSale) {
      return res.json({
        errors: {
          common: {
            msg: "Sale not found!",
          },
        },
      });
    }
    //check if due amount is greater than 0
    if (existingSale.due <= 0) {
      return res.json({
        errors: {
          common: {
            msg: "Due amount must be greater than 0!",
          },
        },
      });
    }
    //check if paid amount is greater than 0
    if (amount <= 0) {
      return res.json({
        errors: {
          common: {
            msg: "Paid amount must be greater than 0!",
          },
        },
      });
    }
    //check if paid amount is greater than due amount
    if (amount > existingSale.due) {
      return res.json({
        errors: {
          common: {
            msg: "Paid amount must be less than or equal to due amount!",
          },
        },
      });
    }

    //check if paid amount is equal to due amount
    if (amount === existingSale.due) {
      //update sales due to 0
      existingSale.due = 0;
      existingSale.paymentStatus = "completed";
      await existingSale.save();
    } else {
      //update sales due amount
      existingSale.bankInfo = req.body.bankInfo
      existingSale.due -= amount;
      await existingSale.save();
    }

    //create due payment
    const duePayment = new DuePayment({
      name: existingSale.customer?.name + "-" + existingSale?.buyer || "N/A", // Use customer name if available
      amount: amount,
      totalAmount: existingSale.totalPrice, // Total amount of the original sale
      storeInfo: req.store?.storeId,
      trxid: existingSale.trxid, // Use the same transaction ID as the original sale
      ...req.body,
      saleId: existingSale._id, // Link to the original sale
    });
    //save due payment
    await duePayment.save();

    //calculete profit
    const finance = await Financial.findOne({ storeInfo: req.store?.storeId });
    if (!finance) return;
    //calculete total due
    finance.totalDue -= amount;
    await finance.save();
    res.json({
      data: duePayment,
      msg: "Due Sales Payment was created successful!",
    });
  } catch (err) {
    res.json({
      errors: {
        common: {
          msg: err.message,
        },
      },
    });
  }
};


const deleteSale = async (req, res) => {
  try {
    //get sales id
    const salesId = req.params.salesId;

    //delete sales
    const sales = await Sales.findOneAndDelete({
      _id: salesId,
      storeInfo: req.store?.storeId,
    });

    //calculete profit
    const finance = await Financial.findOne({ storeInfo: req.store?.storeId });
    if (!finance) return;

    //calculete total sales revenue
    finance.totalSalesRevenue -= sales?.totalPrice;

    //calculete total profit
    finance.totalProfit =
      finance.totalSalesRevenue -
      (finance.totalPurchaseCost + finance.totalExpenses);

    await finance.save();

    //send the response
    if (sales) {
      res.json({
        data: sales,
        msg: "Sales was deleted successful!",
      });
    } else {
      res.json({
        errors: {
          common: {
            msg: "Unknown error occured!",
          },
        },
      });
    }
  } catch (err) {
    res.json({
      errors: {
        common: {
          msg: err.message,
        },
      },
    });
  }
};


module.exports = {
  getAllSales,
  getDueSales,
  searchSalesByTrxId,
  searchDueSalesByNameTrxId,
  getSale,
  createSalesPayment,
  createDueSalesPayment,
  deleteSale,
  getReport,
};