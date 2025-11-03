
const Purchase = require("../../models/purchaseSchema");
const Sales = require("../../models/salesSchema");
const ReturnSale = require("../../models/returnSale");

//get purchase and sales
const getPurchaseAndSales = async (req, res) => {
  try {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 12);

    // Fetch last 30 days of purchases
    const purchases = await Purchase.find({
      storeInfo: req.store.storeId,
      createdAt: { $gte: last30Days },
    })
      .sort({ createdAt: 1 })
      .lean();

    // Fetch last 30 days of return sales
    const returnSales = await ReturnSale.find({
      storeInfo: req.store.storeId,
      createdAt: { $gte: last30Days },
    })
      .sort({ createdAt: 1 })
      .lean();

    // Fetch last 30 days of sales
    const sales = await Sales.find({
      storeInfo: req.store.storeId,
      createdAt: { $gte: last30Days },
    })
      .sort({ createdAt: 1 })
      .lean();

    // Combine and format data by date
    const dataMap = new Map();

    // Process purchases (outgoing money)
    purchases.forEach((p) => {
      const dateKey = p.createdAt.toISOString().split("T")[0];
      if (!dataMap.has(dateKey)) {
        dataMap.set(dateKey, {
          createdAt: dateKey,
          Purchase: 0,
          ReturnSale: 0,
          Sale: 0,
          Outgoing: 0, // Total outgoing money (Purchase + ReturnSale)
          Incoming: 0  // Total incoming money (just Sales)
        });
      }
      dataMap.get(dateKey).Purchase += p?.totalPrice || 0;
      dataMap.get(dateKey).Outgoing += p?.totalPrice || 0;
    });

    // Process return sales (outgoing money - refunds to customers)
    returnSales.forEach((rs) => {
      const dateKey = rs.createdAt.toISOString().split("T")[0];
      if (!dataMap.has(dateKey)) {
        dataMap.set(dateKey, {
          createdAt: dateKey,
          Purchase: 0,
          ReturnSale: 0,
          Sale: 0,
          Outgoing: 0,
          Incoming: 0
        });
      }
      dataMap.get(dateKey).ReturnSale += rs?.price * rs?.qty  || 0;
      dataMap.get(dateKey).Outgoing += rs?.price * rs?.qty || 0;
    });

    // Process sales (incoming money)
    sales.forEach((s) => {
      const dateKey = s.createdAt.toISOString().split("T")[0];
      if (!dataMap.has(dateKey)) {
        dataMap.set(dateKey, {
          createdAt: dateKey,
          Purchase: 0,
          ReturnSale: 0,
          Sale: 0,
          Outgoing: 0,
          Incoming: 0
        });
      }
      dataMap.get(dateKey).Sale += s.totalPrice || 0;
      dataMap.get(dateKey).Incoming += s.totalPrice || 0;
    });

    // Convert map to sorted array
    const combinedData = Array.from(dataMap.values()).sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

    res.status(200).json({
      data: combinedData,
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

//get last year buy and salse ammounts
const lastYearBuyAndSales = async (req, res) => {
  console.log(req)
  try {
    const now = new Date();
    const lastYear = new Date();
    lastYear.setFullYear(now.getFullYear() - 1); // Subtract one year
    lastYear.setMonth(now.getMonth()); // Keep the same month
    lastYear.setDate(now.getDate()); // Keep the same day
    lastYear.setHours(now.getHours()); // Keep the same hour
    lastYear.setMinutes(now.getMinutes()); // Keep the same minute
    lastYear.setSeconds(now.getSeconds()); // Keep the same second
    lastYear.setMilliseconds(now.getMilliseconds()); // Keep the same milliseconds

    // ✅ Set This Year's Date Dynamically (Today)
    const thisYear = new Date();

    //get last year totoal purchase
    const purchases = await Purchase.find({
      createdAt: {
        $gte: lastYear,
        $lte: thisYear,
      },
      storeInfo: req.store.storeId,
    });

    const totalPurchase = purchases.reduce(
      (sum, purchase) => sum + purchase.totalPrice,
      0
    );

    //get last years total sales
    const sales = await Sales.find({
      createdAt: { $gte: lastYear, $lte: thisYear },
      storeInfo: req.store.storeId,
    });

    const totalSales = sales.reduce((sum, sale) => sum + sale.totalPrice, 0);

    if (totalPurchase >= 0 && totalSales >= 0) {
      res.json({
        data: {
          totalPurchase,
          totalSales,
        },
      });
    } else {
      res.json({
        errors: {
          common: {
            msg: "Something went wrong!",
          },
        },
      });
    }
  } catch (err) {
    console.log(err)
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
  getPurchaseAndSales,
  lastYearBuyAndSales,
};
