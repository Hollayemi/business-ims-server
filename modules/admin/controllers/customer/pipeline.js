exports.getCustomerPurchasesPipeline = (customer) => [
    {
        $unwind: {
            path: "$cart",
            preserveNullAndEmptyArrays: false
        }
    },
    {
        $match: {
            customer
        }
    },
    {
        $addFields: {
            customer: {
                $toObjectId: "$customer"
            }
        }
    },
    {
        $lookup: {
            from: "customers",
            localField: "customer",
            foreignField: "_id",
            as: "customerInfo"
        }
    },
    {
        $lookup: {
            from: "stocks",
            localField: "cart.product",
            foreignField: "_id",
            as: "stock"
        }
    },
    {
        $unwind: {
            path: "$stock"
        }
    },
    {
        $project:
        /**
         * specifications: The fields to
         *   include or exclude.
         */
        {
            name: "$stock.name",
            quantity: "$cart.qty",
            price: "$cart.price",
            status: "$paymentStatus",
            customerInfo: 1,
            hasReturns: 1,
            discount: 1,
            totalPrice: 1,
            subTotal: 1,
            due: 1,
            trxid: 1,
            createdAt: 1
        }
    },
    {
        $group: {
            _id: null,
            grandTotalPrice: {
                $sum: "$totalPrice"
            },
            products: {
                $push: "$$ROOT"
            }
        }
    }
  ]