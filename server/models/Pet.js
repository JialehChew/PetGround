const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PetSchema = new Schema({
  name: { type: String, required: true },
  species: { type: String, required: true },
  breed: { type: String, required: true },
  age: { type: Number, required: true },
  imageUrl: { type: String, default: "" },
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  notes: { type: String },
  notesForGroomer: { type: String, default: "" },
  size: {
    type: String,
    enum: ["small", "medium", "large", "xlarge"],
    default: "small",
  },
  // soft delete fields
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Pet", PetSchema);
