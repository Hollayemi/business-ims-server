exports.getReportPipeline = (matchStage, customerFilter, skip, currentLimit) => [
    // Initial match for store and basic filters
    {
        $match: matchStage
    },
    // Unwind the cart array
    {
        $unwind: {
            path: "$cart",
            preserveNullAndEmptyArrays: false
        }
    },
    // Lookup stock information
    {
        $lookup: {
            from: "stocks",
            localField: "cart.product",
            foreignField: "_id",
            as: "item"
        }
    },
    // Transform array to object and convert customer ID
    {
        $set: {
            item: { $arrayElemAt: ["$item", 0] },
            customerId: { $toObjectId: "$customer" }
        }
    },
    // Lookup customer information
    {
        $lookup: {
            from: "customers",
            localField: "customerId",
            foreignField: "_id",
            as: "customer"
        }
    },
    // Transform customer array to object
    {
        $set: {
            customer: { $arrayElemAt: ["$customer", 0] }
        }
    },
    // Apply customer filter
    {
        $match: customerFilter
    },
    // Sort by date (most recent first)
    {
        $sort: { createdAt: -1 }
    },
    // Group for totals and collect items
    {
        $group: {
            _id: null,
            totalItems: { $sum: "$cart.qty" },
            totalSale: { $sum: "$totalPrice" },
            bank: {
                $sum: {
                    $cond: [
                        { $eq: ["$paymentMethod", "bank"] },
                        "$totalPrice",
                        0
                    ]
                }
            },
            cash: {
                $sum: {
                    $cond: [
                        { $eq: ["$paymentMethod", "cash"] },
                        "$totalPrice",
                        0
                    ]
                }
            },
            items: { $push: "$$ROOT" },
            customers: { $addToSet: "$customer.name" },
            totalOrders: { $addToSet: "$_id" } // For counting distinct orders
        }
    },
    // Project final results
    {
        $project: {
            totalItems: 1,
            totalSale: 1,
            bank: 1,
            cash: 1,
            customers: 1,
            totalOrders: { $size: "$totalOrders" },
            items: { $slice: ["$items", skip, currentLimit] }
        }
    }
];

