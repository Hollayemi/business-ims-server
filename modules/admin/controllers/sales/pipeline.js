exports.getReportPipeline = (matchStage, customerFilter, skip, currentLimit) => [
    // Initial match for store and basic filters
    {
        $match: matchStage
    },
    // Convert customer ID to ObjectId if it's a string
    {
        $addFields: {
            customerObjectId: {
                $cond: {
                    if: { $eq: [{ $type: "$customer" }, "string"] },
                    then: { $toObjectId: "$customer" },
                    else: "$customer"
                }
            }
        }
    },
    // Lookup customer information
    {
        $lookup: {
            from: "customers",
            localField: "customerObjectId",
            foreignField: "_id",
            as: "customerData"
        }
    },
    // Handle both embedded customer objects and referenced customers
    {
        $addFields: {
            customer: {
                $cond: {
                    if: { $eq: [{ $type: "$customer" }, "object"] },
                    then: "$customer",
                    else: { $arrayElemAt: ["$customerData", 0] }
                }
            }
        }
    },
    // Apply customer filter (if any)
    {
        $match: customerFilter
    },
    // Unwind the cart array for item-level details
    {
        $unwind: {
            path: "$cart",
            preserveNullAndEmptyArrays: false
        }
    },
    // Lookup stock information for each cart item
    {
        $lookup: {
            from: "stocks",
            localField: "cart.product",
            foreignField: "_id",
            as: "item"
        }
    },
    // Transform item array to object
    {
        $set: {
            item: { $arrayElemAt: ["$item", 0] }
        }
    },
    // Sort by date (most recent first)
    {
        $sort: { createdAt: -1 }
    },
    // Group to get totals and collect items
    {
        $group: {
            _id: "$_id",
            // Sale-level fields
            customer: { $first: "$customer" },
            buyer: { $first: "$buyer" },
            trxid: { $first: "$trxid" },
            paymentMethod: { $first: "$paymentMethod" },
            paymentStatus: { $first: "$paymentStatus" },
            totalPrice: { $first: "$totalPrice" },
            subTotal: { $first: "$subTotal" },
            discount: { $first: "$discount" },
            due: { $first: "$due" },
            cash: { $first: "$cash" },
            bank: { $first: "$bank" },
            bankInfo: { $first: "$bankInfo" },
            hasReturns: { $first: "$hasReturns" },
            createdAt: { $first: "$createdAt" },
            // Collect all cart items for this sale
            cart: {
                $push: {
                    product: "$cart.product",
                    qty: "$cart.qty",
                    price: "$cart.price",
                    item: "$item"
                }
            }
        }
    },
    // Sort again after grouping
    {
        $sort: { createdAt: -1 }
    },
    // Group all sales together for summary
    {
        $group: {
            _id: null,
            // Summary calculations
            totalItems: {
                $sum: {
                    $sum: "$cart.qty"
                }
            },
            totalSale: {
                $sum: "$totalPrice"
            },
            received: {
                $sum: { $subtract: ["$totalPrice", "$due"] }
            },
            duePayment: {
                $sum: "$due"
            },
            bank: {
                $sum: {
                    $cond: [
                        {
                            $or: [
                                { $eq: ["$paymentMethod", "bank"] },
                                { $eq: ["$paymentMethod", "cash/bank"] }
                            ]
                        },
                        "$bank",
                        0
                    ]
                }
            },
            cash: {
                $sum: {
                    $cond: [
                        {
                            $or: [
                                { $eq: ["$paymentMethod", "cash"] },
                                { $eq: ["$paymentMethod", "cash/bank"] }
                            ]
                        },
                        "$cash",
                        0
                    ]
                }
            },
            customers: {
                $addToSet: "$customer.name"
            },
            totalOrders: {
                $sum: 1
            },
            allSales: {
                $push: "$$ROOT"
            }
        }
    },
    // Project final results with pagination
    {
        $project: {
            totalItems: 1,
            totalSale: 1,
            bank: 1,
            cash: 1,
            duePayment: 1,
            received: 1,
            customers: 1,
            totalOrders: 1,
            items: {
                $slice: ["$allSales", skip, currentLimit]
            }
        }
    }
];