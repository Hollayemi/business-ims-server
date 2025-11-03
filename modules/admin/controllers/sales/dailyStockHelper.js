import  Stock from "../../models/stockSchema.js";
import dailyStock from "../../models/dailyRecord.js";

async function updateDailyStock(stockId, quantitySold, quantityAdded, storeId, date = new Date()) {
    try {
        // Normalize date to day start
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        // Get stock info
        const stock = await Stock.findById(stockId).populate('supplierInfo');
        console.log(stock)
        if (!stock) return;

        // Calculate openedWith from previous day's closing
        const previousDate = new Date(targetDate);
        previousDate.setDate(previousDate.getDate() - 1);

        const previousRecord = await dailyStock.findOne({
            stock: stockId,
            date: previousDate,
            storeInfo: storeId
        });

        const openedWith = previousRecord ? previousRecord.closingWith : stock.currentStock;

        // Upsert the daily stock record
        await dailyStock.findOneAndUpdate(
            {
                product: stockId,
                date: targetDate,
                storeInfo: storeId
            },
            {
                $set: {
                    stockName: stock.name,
                    supplier: stock.supplierInfo?._id,
                    supplierName: stock.supplierInfo?.name,
                    openedWith: openedWith
                },
                $inc: {
                    amountSold: quantitySold || 0,
                    amountAdded: quantityAdded || 0
                }
            },
            {
                upsert: true,
                new: true
            }
        );

        // Update closingWith for all records of this stock for the day
        await dailyStock.findOneAndUpdate(
            {
                product: stockId,
                date: targetDate,
                storeInfo: storeId
            },
            [{
                $set: {
                    closingWith: {
                        $subtract: [
                            { $add: ["$openedWith", "$amountAdded"] },
                            "$amountSold"
                        ]
                    }
                }
            }]
        );

    } catch (error) {
        console.error('Error updating daily stock:', error);
    }
}
export default updateDailyStock