const mongoose = require("mongoose");

const comparisonSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        motorcycles: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Motorcycle",
                required: true,
            },
        ],
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Comparison", comparisonSchema);
