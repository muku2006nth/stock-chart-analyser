import mongoose from "mongoose";

const FundamentalSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    unique: true
  },
  data: {
    type: Object,
    required: true
  },
  lastFetched: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Fundamental", FundamentalSchema);
