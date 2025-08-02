// server.js
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const Faculty = require('./models/Faculty');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Enhanced Database connection with better error handling
const connectDB = async () => {
    try {
        // Clear any existing connections
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }

        const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jntuk_faculty';
        console.log('🔄 Attempting to connect to MongoDB at:', mongoURI);
        
        const conn = await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4, // Force IPv4
        });
        
        console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}`);
        console.log(`📊 Database Name: ${conn.connection.name}`);
        
        // Test the connection by attempting to list collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`📁 Available collections: ${collections.map(c => c.name).join(', ') || 'None yet'}`);
        
        // Create indexes
        try {
            await Faculty.createIndexes();
            console.log('📝 Database indexes created successfully');
        } catch (indexError) {
            console.warn('⚠️ Index creation warning:', indexError.message);
        }
        
        return conn;
        
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        
        // More specific error messages
        if (error.name === 'MongoNetworkError') {
            console.error('💡 Suggestion: Make sure MongoDB is running locally or check your connection string');
        } else if (error.name === 'MongoServerSelectionError') {
            console.error('💡 Suggestion: MongoDB server might not be running. Try starting it with "mongod" command');
        }
        
        // Don't exit process in development, try to continue
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        } else {
            console.warn('⚠️ Continuing without database connection (development mode)');
        }
    }
};

// Initialize database connection
connectDB();

// Enhanced connection event handlers
mongoose.connection.on('connected', () => {
    console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err.message);
    // Attempt to reconnect
    setTimeout(() => {
        console.log('🔄 Attempting to reconnect to MongoDB...');
        connectDB();
    }, 5000);
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠️ Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed through app termination');
        process.exit(0);
    } catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
});

// Add middleware to check database connection
const checkDBConnection = (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            success: false,
            message: 'Database connection not available',
            error: 'Please try again in a moment'
        });
    }
    next();
};

// Apply database check middleware to all API routes
app.use('/api', checkDBConnection);

// Faculty Routes

// GET all faculty with filtering and pagination
app.get('/api/faculty', async (req, res) => {
    try {
        console.log('🔍 Fetching faculty with query:', req.query);
        const { 
            department, 
            designation, 
            status = 'Active', 
            page = 1, 
            limit = 10,
            search,
            ratified
        } = req.query;
        
        const query = { status };
        if (department && department !== 'all') query.department = department;
        if (designation && designation !== 'all') query.designation = designation;
        if (ratified !== undefined) query['ratificationStatus.isRatified'] = ratified === 'true';
        
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { employeeId: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        
        console.log('🔍 MongoDB query:', JSON.stringify(query, null, 2));
        
        const faculty = await Faculty.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .select('-documents -__v')
            .lean(); // Use lean() for better performance
        
        const total = await Faculty.countDocuments(query);
        
        console.log(`📊 Found ${faculty.length} faculty members (Total: ${total})`);
        
        res.json({
            success: true,
            data: faculty,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        console.error('❌ Error fetching faculty:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
});

// GET faculty by ID
app.get('/api/faculty/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid faculty ID format'
            });
        }

        const faculty = await Faculty.findById(req.params.id);
        
        if (!faculty) {
            return res.status(404).json({
                success: false,
                message: 'Faculty not found'
            });
        }
        
        res.json({
            success: true,
            data: faculty
        });
    } catch (error) {
        console.error('❌ Error fetching faculty:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
});

// POST create new faculty with enhanced validation
app.post('/api/faculty', async (req, res) => {
    try {
        console.log('📝 Received faculty data:', req.body);
        
        // Validate required fields
        const requiredFields = ['firstName', 'lastName', 'email', 'department', 'designation'];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }
        
        const faculty = new Faculty(req.body);
        
        // Check ratification eligibility before saving
        faculty.checkRatificationEligibility();
        
        console.log('💾 Saving faculty to database...');
        const savedFaculty = await faculty.save();
        console.log('✅ Faculty saved successfully with ID:', savedFaculty._id);
        
        // Verify the save by fetching the saved document
        const verification = await Faculty.findById(savedFaculty._id);
        if (!verification) {
            throw new Error('Faculty save verification failed');
        }
        
        console.log('✅ Save verification successful');
        
        res.status(201).json({
            success: true,
            data: savedFaculty,
            message: 'Faculty created and saved successfully'
        });
    } catch (error) {
        console.error('❌ Error creating faculty:', error);
        
        // Handle specific MongoDB errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            return res.status(400).json({
                success: false,
                message: `${field} already exists`,
                error: `Duplicate ${field}: ${error.keyValue[field]}`
            });
        }
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                error: validationErrors
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error creating faculty',
            error: error.message
        });
    }
});

// PUT update faculty with enhanced validation
app.put('/api/faculty/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid faculty ID format'
            });
        }

        console.log('📝 Updating faculty ID:', req.params.id);
        console.log('📝 Update data:', req.body);
        
        const faculty = await Faculty.findByIdAndUpdate(
            req.params.id,
            req.body,
            { 
                new: true, 
                runValidators: true,
                context: 'query' // Ensure validators run properly
            }
        );
        
        if (!faculty) {
            return res.status(404).json({
                success: false,
                message: 'Faculty not found'
            });
        }
        
        // Re-check ratification eligibility after update
        faculty.checkRatificationEligibility();
        await faculty.save();
        
        console.log('✅ Faculty updated successfully');
        
        res.json({
            success: true,
            data: faculty,
            message: 'Faculty updated successfully'
        });
    } catch (error) {
        console.error('❌ Error updating faculty:', error);
        
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                error: validationErrors
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error updating faculty',
            error: error.message
        });
    }
});

// DELETE faculty
app.delete('/api/faculty/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid faculty ID format'
            });
        }

        console.log('🗑️ Deleting faculty ID:', req.params.id);
        
        const faculty = await Faculty.findByIdAndDelete(req.params.id);
        
        if (!faculty) {
            return res.status(404).json({
                success: false,
                message: 'Faculty not found'
            });
        }
        
        console.log('✅ Faculty deleted successfully');
        
        res.json({
            success: true,
            message: 'Faculty deleted successfully'
        });
    } catch (error) {
        console.error('❌ Error deleting faculty:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const dbStatus = mongoose.connection.readyState;
        const dbStates = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        
        const totalFaculty = dbStatus === 1 ? await Faculty.countDocuments() : 0;
        
        res.json({
            success: true,
            data: {
                server: 'running',
                database: dbStates[dbStatus],
                timestamp: new Date().toISOString(),
                totalFaculty: totalFaculty
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Health check failed',
            error: error.message
        });
    }
});

// Test endpoint to verify database operations
app.post('/api/test/connection', async (req, res) => {
    try {
        // Test write operation
        const testDoc = new Faculty({
            firstName: 'Test',
            lastName: 'User',
            email: `test_${Date.now()}@test.com`,
            department: 'CSE',
            designation: 'Assistant Professor',
            employeeId: `TEST_${Date.now()}`
        });
        
        const saved = await testDoc.save();
        
        // Test read operation
        const found = await Faculty.findById(saved._id);
        
        // Clean up test document
        await Faculty.findByIdAndDelete(saved._id);
        
        res.json({
            success: true,
            message: 'Database connection test successful',
            data: {
                saved: !!saved,
                found: !!found,
                deleted: true
            }
        });
    } catch (error) {
        console.error('❌ Database test failed:', error);
        res.status(500).json({
            success: false,
            message: 'Database connection test failed',
            error: error.message
        });
    }
});

// All other routes remain the same...
// [Rest of your ratification routes, stats routes, etc.]

// Ratification Routes
app.get('/api/ratification/eligible', async (req, res) => {
    try {
        const faculty = await Faculty.find({
            status: 'Active',
            'ratificationStatus.isRatified': false
        });
        
        const eligibleFaculty = [];
        for (let f of faculty) {
            if (f.checkRatificationEligibility()) {
                eligibleFaculty.push(f);
            }
        }
        
        res.json({
            success: true,
            data: eligibleFaculty
        });
    } catch (error) {
        console.error('Error fetching eligible faculty:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
});

// POST ratify faculty
app.post('/api/ratification/ratify/:id', async (req, res) => {
    try {
        const { ratifiedBy, comments } = req.body;
        
        const faculty = await Faculty.findById(req.params.id);
        if (!faculty) {
            return res.status(404).json({
                success: false,
                message: 'Faculty not found'
            });
        }
        
        if (!faculty.checkRatificationEligibility()) {
            return res.status(400).json({
                success: false,
                message: 'Faculty does not meet ratification criteria'
            });
        }
        
        faculty.ratificationStatus.isRatified = true;
        faculty.ratificationStatus.ratificationDate = new Date();
        faculty.ratificationStatus.ratifiedBy = ratifiedBy;
        faculty.ratificationStatus.comments = comments;
        
        await faculty.save();
        
        res.json({
            success: true,
            data: faculty,
            message: 'Faculty ratified successfully'
        });
    } catch (error) {
        console.error('Error ratifying faculty:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
});

// GET overview statistics with better error handling
app.get('/api/stats/overview', async (req, res) => {
    try {
        const totalFaculty = await Faculty.countDocuments({ status: 'Active' });
        const ratifiedFaculty = await Faculty.countDocuments({ 
            status: 'Active', 
            'ratificationStatus.isRatified': true 
        });
        
        // Group by designation
        const designationStats = await Faculty.aggregate([
            { $match: { status: 'Active' } },
            {
                $group: {
                    _id: '$designation',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        const stats = {
            totalFaculty,
            professors: designationStats.find(d => d._id === 'Professor')?.count || 0,
            associateProfessors: designationStats.find(d => d._id === 'Associate Professor')?.count || 0,
            assistantProfessors: designationStats.find(d => d._id === 'Assistant Professor')?.count || 0,
            ratifiedFaculty
        };
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Error generating overview stats:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
});

// Serve main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('💥 Unhandled error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Access the application at http://localhost:${PORT}`);
    console.log(`🔧 Health check available at http://localhost:${PORT}/api/health`);
    console.log(`🧪 Test database connection at http://localhost:${PORT}/api/test/connection`);
});

module.exports = app;