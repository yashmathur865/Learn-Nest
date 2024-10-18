const Section = require('../models/Section');
const Course = require('../models/Course');
const SubSection = require('../models/SubSection');

// Create Section
exports.createSection = async (req,res) => {
    try {

        // Fetching the courseId and sectionName from the request body
        const {courseId, sectionName} = req.body;

        // Checking if the courseId and sectionName is provided or not
        if(!courseId || !sectionName) {
            return res.status(400).json({
                success:false,
                message:'All fields are required',
            });
        }

        // Creating a new section with the provided sectionName
        const newSection = await Section.create({sectionName});

        // Updating the courseContent array of the course with the new section
        const updatedCourse = await Course.findByIdAndUpdate(courseId, {
                                                                          $push: {
                                                                            courseContent:newSection._id
                                                                          }  
                                                                        }, {new:true})
                                                                        .populate({
                                                                            path:"courseContent",
                                                                            populate: {
                                                                                path:"subSection"
                                                                            }});

        // Sending the response back to the client
        return res.status(200).json({
            success:true,
            message:'Section created successfully',
            newSection,
            updatedCourse
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success:false,
            message:'Failed to create Section',
            error: error.message,
        })
    }
}

// Update Section
exports.updateSection = async (req,res) => {
    try {

        // Fetching the sectionId, sectionName and courseId from the request body
        const {sectionId, sectionName, courseId} = req.body;

        // Checking if the sectionId, sectionName and courseId is provided or not
        if (!sectionId || !sectionName) {
            return res.status(400).json({
                success:false,
                message:'All fields are required',
            });
        }

        // Updating the section with the provided sectionName
        const updatedSection = await Section.findByIdAndUpdate(sectionId, {sectionName}, {new:true});

        // Fetching the updated course with the updated section
        const updatedCourse = await Course.findById(courseId)
          .populate({
              path:"courseContent",
              populate: {
                  path:"subSection"
              }});

        // Returning Updated Course
        return res.status(200).json({
            success:true,
            message:'Section updated successfully',
            updatedCourse
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success:false,
            message:'Failed to update Section',
            error: error.message,
        })
    }
}

// Delete Section
exports.deleteSection = async (req,res) => {
    try {

        // Fetching the sectionId and courseId from the request body
        const {sectionId, courseId} = req.body;

        // Checking if the sectionId and courseId is provided or not
        if (!sectionId) {
            return res.status(400).json({
                success:false,
                message:'All fields are required',
            });
        }

        //Fetching the Section
        const sectionDetails = await Section.findById(sectionId);

        //Deleting all the SubSections within the Section
        sectionDetails.subSection.forEach( async (ssid)=>{
            await SubSection.findByIdAndDelete(ssid);
        })
        console.log('Subsections within the section deleted')
        //NOTE: Due to cascading deletion, Mongoose automatically triggers the built-in middleware to perform a cascading delete for all the referenced
        //SubSection documents. DOUBTFUL!

        //From course, courseContent the section gets automatically deleted due to cascading delete feature
        await Section.findByIdAndDelete(sectionId);
        console.log('Section deleted')

        const updatedCourse = await Course.findById(courseId)
          .populate({
              path:"courseContent",
              populate: {
                  path:"subSection"
              }});
        return res.status(200).json({
            success:true,
            message:'Section deleted successfully',
            updatedCourse
        })   
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success:false,
            message:'Failed to delete Section',
            error: error.message,
        })
    }
}

