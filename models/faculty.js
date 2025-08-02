const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
    },
    employeeId: {
        type: String,
        required: [true, 'Employee ID is required'],
        unique: true,
        trim: true,
        uppercase: true
    },
    department: {
        type: String,
        required: [true, 'Department is required'],
        enum: {
            values: [
                'Computer Science Engineering',
                'Electronics and Communication Engineering',
                'Electrical Engineering',
                'Mechanical Engineering',
                'Civil Engineering',
                'Chemical Engineering',
                'Information Technology',
                'Electronics and Instrumentation Engineering'
            ],
            message: 'Invalid department'
        }
    },
    designation: {
        type: String,
        required: [true, 'Designation is required'],
        enum: {
            values: ['Professor', 'Associate Professor', 'Assistant Professor'],
            message: 'Invalid designation'
        }
    },
    dateOfJoining: {
        type: Date,
        required: [true, 'Date of joining is required']
    },
    qualifications: [{
        type: String,
        required: true
    }],
    experience: {
        teaching: {
            type: Number,
            required: true,
            min: 0
        },
        industry: {
            type: Number,
            default: 0,
            min: 0
        },
        research: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    publications: {
        journals: {
            type: Number,
            default: 0,
            min: 0
        },
        conferences: {
            type: Number,
            default: 0,
            min: 0
        },
        books: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    phone: {
        type: String,
        required: true,
        match: [/^\+91-\d{10}$/, 'Phone number must be in format: +91-xxxxxxxxxx']
    },
    address: {
        street: String,
        city: String,
        state: String,
        pincode: String
    },
    ratificationStatus: {
        isRatified: {
            type: Boolean,
            default: false
        },
        ratificationDate: Date,
        ratifiedBy: String,
        comments: String,
        isEligible: {
            type: Boolean,
            default: false
        }
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'On Leave'],
        default: 'Active'
    },
    documents: [{
        name: String,
        path: String,
        uploadDate: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Virtual for full name
facultySchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Method to check ratification eligibility
facultySchema.methods.checkRatificationEligibility = function() {
    const yearsOfService = (Date.now() - this.dateOfJoining.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const totalPublications = this.publications.journals + this.publications.conferences + this.publications.books;
    
    let isEligible = false;
    
    if (this.designation === 'Assistant Professor') {
        isEligible = yearsOfService >= 3 && this.experience.teaching >= 3 && totalPublications >= 5;
    } else if (this.designation === 'Associate Professor') {
        isEligible = yearsOfService >= 2 && this.experience.teaching >= 5 && totalPublications >= 10;
    } else if (this.designation === 'Professor') {
        isEligible = yearsOfService >= 1 && this.experience.teaching >= 8 && totalPublications >= 15;
    }
    
    this.ratificationStatus.isEligible = isEligible;
    return isEligible;
};

// Indexes for better performance
facultySchema.index({ email: 1 });
facultySchema.index({ employeeId: 1 });
facultySchema.index({ department: 1 });
facultySchema.index({ designation: 1 });
facultySchema.index({ 'ratificationStatus.isRatified': 1 });

module.exports = mongoose.model('Faculty', facultySchema);