const SubSection = require('../models/SubSection');
const Section = require("../models/Section");
const { uploadImageToCloudinary } = require("../utils/imageUploader");

// Create SubSection
exports.createSubSection = async (req,res) =>{
    try {

        // Fetching the sectionId, title, timeDuration and description from the request body
        const {sectionId,title, timeDuration, description } = req.body;

        // Fetching the video from the request files
        const video  = req.files.video;

        // Checking if the sectionId, title, timeDuration, description and video is provided or not
        if(!sectionId || !title || !description || !video) {
            return res.status(400).json({
                success:false,
                message:'All fields are required',
            });
        }

        // Uploading the video to cloudinary
        const uploadDetails = await uploadImageToCloudinary(video, process.env.FOLDER_NAME);

        // Creating a new subSection with the provided title, timeDuration, description and videoUrl
        const newSubSection = await SubSection.create({
            title,
            timeDuration: `${uploadDetails.duration}`,
            description,
            videoUrl:uploadDetails.secure_url
        })

        // Updating the subSection array of the section with the new subSection
        const updatedSection = await Section.findByIdAndUpdate(sectionId, { $push: {subSection: newSubSection._id}},{new:true}).populate("subSection");

        // Returning Updated Section
        return res.status(200).json({
            success:true,
            message:'SubSection created successfully',
            updatedSection
        })   
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success:false,
            message:'Failed to create SubSection',
            error: error.message,
        })
    }
}

// Update SubSection
exports.updateSubSection = async (req, res) => {
    try {
      // Fetching the sectionId, subSectionId, title and description from the request body
      const { sectionId,subSectionId, title, description } = req.body
      const subSection = await SubSection.findById(subSectionId)

      // Checking if the sectionId, subSectionId, title and description is provided or not
      if (!subSection) {
        return res.status(404).json({
          success: false,
          message: "SubSection not found",
        })
      }

      // Updating the subSection with the provided title and description
      if (title !== undefined) {
        subSection.title = title
      }

      // Updating the subSection with the provided description
      if (description !== undefined) {
        subSection.description = description
      }
      // Fetching the video from the request files and uploading it to cloudinary
      if (req.files && req.files.video !== undefined) {
        const video = req.files.video
        const uploadDetails = await uploadImageToCloudinary(
          video,
          process.env.FOLDER_NAME
        )
        subSection.videoUrl = uploadDetails.secure_url
        subSection.timeDuration = `${uploadDetails.duration}`
      }

      // Saving the updated subSection
      await subSection.save()

      // Fetching the updated section
      const updatedSection = await Section.findById(sectionId).populate("subSection")


      // Returning Updated Section
      return res.json({
        success: true,
        data:updatedSection,
        message: "Section updated successfully",
      })
    } catch (error) {
      console.error(error)
      return res.status(500).json({
        success: false,
        message: "An error occurred while updating the section",
      })
    }
  }

// Delete SubSection
exports.deleteSubSection = async (req,res) =>{
    try {

      // Fetching the subSectionId and sectionId from the request body
        const {subSectionId,sectionId } = req.body;

      // Checking if the subSectionId is provided or not
      if(!subSectionId) {
        return res.status(400).json({
            success:false,
            message:'SubSection Id to be deleted is required',
        });
    }

    // Deleting the subSection from the section
        await Section.findByIdAndUpdate(
            { _id: sectionId },
            {
              $pull: {
                subSection: subSectionId,
              },
            }
          )

      // Deleting the subSection
        const subSection = await SubSection.findByIdAndDelete({ _id: subSectionId })

      if (!subSection) {
        return res
          .status(404)
          .json({ success: false, message: "SubSection not found" })
      }

      // Fetching the updated section
      const updatedSection = await Section.findById(sectionId).populate("subSection")

      // Returning Updated Section
      return res.json({
        success: true,
        data:updatedSection,
        message: "SubSection deleted successfully",
      })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success:false,
            message:'Failed to delete SubSection',
            error: error.message,
        })
    }
}