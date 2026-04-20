const multer = require("multer");
const Pet = require("../models/Pet");
const { Appointment } = require("../models/Appointment");
const { uploadToR2, deleteFromR2ByPublicUrl } = require("../utils/upload");

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const petImageUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, or WEBP images are allowed"));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

exports.searchPetsForStaffBooking = async (req, res) => {
  try {
    if (req.user.role !== "groomer" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Only groomers or admins can search pets for booking" });
    }
    const q = (req.query.q || "").trim();
    const filter = { isDeleted: { $ne: true } };
    if (q.length >= 1) {
      filter.$or = [
        { name: new RegExp(escapeRegex(q), "i") },
        { breed: new RegExp(escapeRegex(q), "i") },
      ];
    }
    const pets = await Pet.find(filter)
      .populate("ownerId", "name email")
      .limit(40)
      .sort({ updatedAt: -1 });
    res.status(200).json(pets);
  } catch (error) {
    console.error("Error searching pets for staff booking:", error);
    res.status(500).json({ error: "Server error searching pets" });
  }
};

exports.getUserPets = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const pets = await Pet.find({ ownerId, isDeleted: false });
    res.status(200).json(pets);
  } catch (error) {
    console.error("Error fetching pets:", error);
    res.status(500).json({ error: "Server error fetching pets" });
  }
};

exports.getPetById = async (req, res) => {
  try {
    const petId = req.params.id;
    // find pet regardless of deletion status (for appointment history)
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({ error: "Pet not found" });
    }
    // if owner, check if pet belongs to them
    if (req.user.role === "owner" && pet.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to view this pet" });
    }
    res.status(200).json(pet);
  } catch (error) {
    console.error("Error fetching pet:", error);
    res.status(500).json({ error: "Server error fetching pet details" });
  }
};

exports.createPet = async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({ error: "Only pet owners can add pets" });
    }
    const { name, species, breed, age, notes, notesForGroomer, size } = req.body;
    const PET_SIZES = ["small", "medium", "large", "xlarge"];
    if (!name || !species || !breed || age === undefined || age === null || !size) {
      return res.status(400).json({ error: "Missing required pet information" });
    }
    if (!PET_SIZES.includes(size)) {
      return res.status(400).json({ error: "Invalid pet size" });
    }

    // create new pet with owner ID from authenticated user
    const newPet = new Pet({
      name,
      species,
      breed,
      age,
      notes,
      notesForGroomer: notesForGroomer || "",
      size,
      ownerId: req.user.id,
      updatedAt: Date.now(),
    });

    await newPet.save();

    res.status(201).json({
      message: "Pet added successfully",
      pet: newPet,
    });
  } catch (error) {
    console.error("Error creating pet:", error);
    res.status(500).json({ error: "Server error creating pet" });
  }
};

exports.updatePet = async (req, res) => {
  try {
    const petId = req.params.id;
    const { name, species, breed, age, notes, notesForGroomer, size } = req.body;
    const PET_SIZES = ["small", "medium", "large", "xlarge"];

    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({ error: "Pet not found" });
    }
    if (pet.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to update this pet" });
    }

    if (name) pet.name = name;
    if (species) pet.species = species;
    if (breed) pet.breed = breed;
    if (age !== undefined && age !== null) pet.age = age;
    if (notes !== undefined) pet.notes = notes;
    if (notesForGroomer !== undefined) pet.notesForGroomer = notesForGroomer;
    if (size !== undefined) {
      if (!PET_SIZES.includes(size)) {
        return res.status(400).json({ error: "Invalid pet size" });
      }
      pet.size = size;
    }

    pet.updatedAt = Date.now();

    await pet.save();

    res.status(200).json({
      message: "Pet updated successfully",
      pet,
    });
  } catch (error) {
    console.error("Error updating pet:", error);
    res.status(500).json({ error: "Server error updating pet" });
  }
};

exports.updateNotesForGroomer = async (req, res) => {
  try {
    if (req.user.role !== "groomer" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Only groomers or admins can update groomer notes" });
    }
    const petId = req.params.id;
    const notesForGroomer = String(req.body?.notesForGroomer || "");
    if (notesForGroomer.length > 1000) {
      return res.status(400).json({ error: "Groomer notes must be 1000 characters or less" });
    }

    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({ error: "Pet not found" });
    }

    pet.notesForGroomer = notesForGroomer;
    pet.updatedAt = new Date();
    await pet.save();

    return res.status(200).json({
      message: "Groomer notes updated successfully",
      pet,
    });
  } catch (error) {
    console.error("Error updating groomer notes:", error);
    return res.status(500).json({ error: "Server error updating groomer notes" });
  }
};

exports.uploadPetImage = (req, res) => {
  petImageUpload.single("image")(req, res, async (err) => {
    try {
      if (err) {
        if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "Image too large. Max size is 5MB." });
        }
        return res.status(400).json({ error: err.message || "Failed to upload image" });
      }

      const petId = req.params.id;
      const pet = await Pet.findById(petId);
      if (!pet) {
        return res.status(404).json({ error: "Pet not found" });
      }

      const isOwner = pet.ownerId.toString() === req.user.id;
      const isAdmin = req.user.role === "admin";
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "Only the owner or admin can update pet avatar" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No image file received. Use field name 'image'." });
      }

      const previousImageUrl = pet.imageUrl;
      const imageUrl = await uploadToR2(req.file);
      pet.imageUrl = imageUrl;
      pet.updatedAt = new Date();
      await pet.save();

      await deleteFromR2ByPublicUrl(previousImageUrl);

      return res.status(200).json({
        message: "Pet avatar uploaded successfully",
        pet,
      });
    } catch (error) {
      console.error("Error uploading pet image:", error);
      return res.status(500).json({ error: "Server error uploading pet image" });
    }
  });
};

exports.deletePet = async (req, res) => {
  try {
    const petId = req.params.id;

    const pet = await Pet.findById(petId);

    if (!pet) {
      return res.status(404).json({ error: "Pet not found" });
    }

    if (pet.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to delete this pet" });
    }

    // check if pet is already deleted
    if (pet.isDeleted) {
      return res.status(400).json({ error: "Pet is already deleted" });
    }

    // prevent pets with upcoming appointments from being deleted
    const currentDate = new Date();

    const upcomingAppointments = await Appointment.find({
      petId: petId,
      status: { $in: ["confirmed", "in_progress"] },
      startTime: { $gte: currentDate },
    });

    if (upcomingAppointments.length > 0) {
      return res.status(400).json({
        error:
          "Cannot delete pets with upcoming appointments. Please cancel all appointments first.",
        appointments: upcomingAppointments,
      });
    }

    // soft delete: mark as deleted instead of removing
    pet.isDeleted = true;
    pet.deletedAt = new Date();
    pet.updatedAt = new Date();
    await pet.save();

    res.status(200).json({
      message: "Pet deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting pet:", error);
    res.status(500).json({ error: "Server error deleting pet" });
  }
};

exports.getPetAppointments = async (req, res) => {
  try {
    const petId = req.params.id;
    const userId = req.user.id;

    // first verify the pet belongs to the user (allow both deleted and non-deleted pets for appointment history)
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({ error: "Pet not found" });
    }

    // check if user owns this pet
    if (pet.ownerId.toString() !== userId) {
      return res.status(403).json({ error: "Not authorized to view this pet's appointments" });
    }

    // get appointments for this specific pet (regardless of pet deletion status)
    const appointments = await Appointment.find({ petId })
      .populate("groomerId", "name email")
      .sort({ startTime: -1 }); // sort by date, newest first

    res.status(200).json(appointments);
  } catch (error) {
    console.error("Error fetching pet appointments:", error);
    res.status(500).json({ error: "Server error fetching pet appointments" });
  }
};

// get deleted pets (for potential restoration)
exports.getDeletedPets = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const deletedPets = await Pet.find({ ownerId, isDeleted: true }).sort({ deletedAt: -1 });
    res.status(200).json(deletedPets);
  } catch (error) {
    console.error("Error fetching deleted pets:", error);
    res.status(500).json({ error: "Server error fetching deleted pets" });
  }
};

// restore a soft-deleted pet
exports.restorePet = async (req, res) => {
  try {
    const petId = req.params.id;
    const pet = await Pet.findById(petId);

    if (!pet) {
      return res.status(404).json({ error: "Pet not found" });
    }

    if (pet.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to restore this pet" });
    }

    if (!pet.isDeleted) {
      return res.status(400).json({ error: "Pet is not deleted" });
    }

    // restore pet
    pet.isDeleted = false;
    pet.deletedAt = null;
    pet.updatedAt = new Date();
    await pet.save();

    res.status(200).json({
      message: "Pet restored successfully",
      pet,
    });
  } catch (error) {
    console.error("Error restoring pet:", error);
    res.status(500).json({ error: "Server error restoring pet" });
  }
};

// // temporary migration endpoint
// exports.migratePets = async (req, res) => {
//   try {
//     // update all pets that don't have the isDeleted field
//     const result = await Pet.updateMany(
//       { isDeleted: { $exists: false } },
//       {
//         $set: {
//           isDeleted: false,
//           deletedAt: null,
//         },
//       }
//     );
//     res.status(200).json({
//       message: "Migration completed",
//       modifiedCount: result.modifiedCount,
//     });
//   } catch (error) {
//     console.error("Error migrating pets:", error);
//     res.status(500).json({ error: "Migration failed" });
//   }
// };
