// scripts/setupDatabase.js
const mongoose = require('mongoose');
require('dotenv').config();

const Faculty = require('../models/Faculty');

const setupDatabase = async () => {
    try {
        console.log('🔄 Setting up database...');
        
        // Connect to MongoDB
        const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jntuk_faculty';
        console.log('📡 Connecting to:', mongoURI);
        
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ Connected to MongoDB');
        
        // Create indexes
        console.log('📝 Creating indexes...');
        await Faculty.createIndexes();
        console.log('✅ Indexes created');
        
        // Check existing data
        const existingCount = await Faculty.countDocuments();
        console.log(`📊 Existing faculty records: ${existingCount}`);
        
        if (existingCount === 0) {
            console.log('📝 Creating sample data...');
            
            const sampleFaculty = [
                {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john.doe@jntuk.edu.in',
                    employeeId: 'JNTUK001',
                    department: 'Computer Science Engineering',
                    designation: 'Professor',
                    dateOfJoining: new Date('2020-01-15'),
                    qualifications: ['Ph.D', 'M.Tech'],
                    experience: {
                        teaching: 10,
                        industry: 5,
                        research: 8
                    },
                    publications: {
                        journals: 15,
                        conferences: 20,
                        books: 2
                    },
                    phone: '+91-9876543210',
                    address: {
                        street: '123 Faculty Housing',
                        city: 'Kakinada',
                        state: 'Andhra Pradesh',
                        pincode: '533003'
                    },
                    status: 'Active'
                },
                {
                    firstName: 'Jane',
                    lastName: 'Smith',
                    email: 'jane.smith@jntuk.edu.in',
                    employeeId: 'JNTUK002',
                    department: 'Electrical Engineering',
                    designation: 'Associate Professor',
                    dateOfJoining: new Date('2021-03-20'),
                    qualifications: ['Ph.D', 'M.E'],
                    experience: {
                        teaching: 8,
                        industry: 3,
                        research: 6
                    },
                    publications: {
                        journals: 12,
                        conferences: 15,
                        books: 1
                    },
                    phone: '+91-9876543211',
                    address: {
                        street: '456 University Road',
                        city: 'Kakinada',
                        state: 'Andhra Pradesh',
                        pincode: '533003'
                    },
                    status: 'Active'
                },
                {
                    firstName: 'Bob',
                    lastName: 'Johnson',
                    email: 'bob.johnson@jntuk.edu.in',
                    employeeId: 'JNTUK003',
                    department: 'Mechanical Engineering',
                    designation: 'Assistant Professor',
                    dateOfJoining: new Date('2022-06-10'),
                    qualifications: ['M.Tech', 'B.Tech'],
                    experience: {
                        teaching: 5,
                        industry: 2,
                        research: 3
                    },
                    publications: {
                        journals: 8,
                        conferences: 10,
                        books: 0
                    },
                    phone: '+91-9876543212',
                    address: {
                        street: '789 Campus View',
                        city: 'Kakinada',
                        state: 'Andhra Pradesh',
                        pincode: '533003'
                    },
                    status: 'Active'
                }
            ];
            
            for (const facultyData of sampleFaculty) {
                const faculty = new Faculty(facultyData);
                faculty.checkRatificationEligibility();
                await faculty.save();
                console.log(`✅ Created: ${faculty.fullName}`);
            }
            
            console.log('✅ Sample data created successfully');
        }
        
        // Verify the setup
        const finalCount = await Faculty.countDocuments();
        console.log(`📊 Total faculty records: ${finalCount}`);
        
        // Test basic operations
        console.log('🧪 Testing database operations...');
        
        // Test read
        const faculty = await Faculty.find().limit(1);
        console.log('✅ Read operation successful');
        
        // Test aggregation
        const stats = await Faculty.aggregate([
            {
                $group: {
                    _id: '$department',
                    count: { $sum: 1 }
                }
            }
        ]);
        console.log('✅ Aggregation operation successful');
        console.log('📊 Department distribution:', stats);
        
        console.log('🎉 Database setup completed successfully!');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
};

// Run the setup
if (require.main === module) {
    setupDatabase()
        .then(() => {
            console.log('✅ Setup completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Setup failed:', error);
            process.exit(1);
        });
}

module.exports = setupDatabase;