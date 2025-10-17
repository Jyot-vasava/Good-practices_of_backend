import mongoose,{Schema} from "mongoose";

const subscriptionSchema = new Schema({
  subscriber: {
    type: Schema.Types.ObjectId, // one who is scbscribing
    ref: "User",
  },

  channel: {
    type: Schema.Types.ObjectId, // one who get subscriber
    ref: "User",
  },



},{timestamps: true});


export const Subscription = mongoose.model("Subscription",subscriptionSchema)
