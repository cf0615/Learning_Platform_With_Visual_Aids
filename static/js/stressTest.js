import { auth, db } from './firebase-config.js';
import { collection, query, getDocs, addDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

class StressTest {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            tests: [],
            summary: {}
        };
    }

    // Add authentication method
    async authenticate(email, password) {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            console.log('Authentication successful');
        } catch (error) {
            console.error('Authentication failed:', error);
            throw error;
        }
    }

    async testAddDocuments(iterations = 100) {
        console.log(`Starting add document test with ${iterations} iterations...`);

        // Ensure user is authenticated before running tests
        if (!auth.currentUser) {
            throw new Error('User must be authenticated before running tests');
        }

        for (let i = 0; i < iterations; i++) {
            const startTime = performance.now();
            try {
                // Add a new document to the "stress_test_data" collection
                await addDoc(collection(db, 'stress_test_data'), {
                    testField: `TestData ${i}`,
                    timestamp: new Date().toISOString()
                });

                const endTime = performance.now();
                this.results.tests.push({
                    type: 'database_add',
                    iteration: i,
                    success: true,
                    responseTime: endTime - startTime
                });
            } catch (error) {
                this.results.tests.push({
                    type: 'database_add',
                    iteration: i,
                    success: false,
                    error: error.message
                });
            }

            // Reduce delay between iterations to increase stress
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    // Test updating documents in "stress_test_data" collection
    async testUpdateDocuments(iterations = 100) {
        console.log(`Starting update document test with ${iterations} iterations...`);

        // Ensure user is authenticated before running tests
        if (!auth.currentUser) {
            throw new Error('User must be authenticated before running tests');
        }

        for (let i = 0; i < iterations; i++) {
            const startTime = performance.now();
            try {
                // Fetch a document ID (for simplicity, updating the same document repeatedly)
                const docRef = doc(db, 'stress_test_data', 'testDoc'); 

                // Update the document
                await updateDoc(docRef, {
                    updatedField: `UpdatedData ${i}`,
                    updateTimestamp: new Date().toISOString()
                });

                const endTime = performance.now();
                this.results.tests.push({
                    type: 'database_update',
                    iteration: i,
                    success: true,
                    responseTime: endTime - startTime
                });
            } catch (error) {
                this.results.tests.push({
                    type: 'database_update',
                    iteration: i,
                    success: false,
                    error: error.message
                });
            }

            // Reduce delay between iterations to increase stress
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    // Test database read operations
    async testDatabaseReads(iterations = 100) {
        console.log(`Starting database read test with ${iterations} iterations...`);
        
        // Ensure user is authenticated before running tests
        if (!auth.currentUser) {
            throw new Error('User must be authenticated before running tests');
        }
        
        for (let i = 0; i < iterations; i++) {
            const startTime = performance.now();
            try {
                // Test reading from different collections
                await Promise.all([
                    this.readCollection('badges'),
                    this.readCollection('feedback'),
                    this.readCollection('announcements')
                ]);

                const endTime = performance.now();
                this.results.tests.push({
                    type: 'database_read',
                    iteration: i,
                    success: true,
                    responseTime: endTime - startTime
                });
            } catch (error) {
                this.results.tests.push({
                    type: 'database_read',
                    iteration: i,
                    success: false,
                    error: error.message
                });
            }
            
            // Reduce delay between iterations to increase stress
            await new Promise(resolve => setTimeout(resolve, 100)); // Reduced from 500ms to 100ms
        }
    }

    // Helper function to read a collection
    async readCollection(collectionName) {
        const querySnapshot = await getDocs(collection(db, collectionName));
        return querySnapshot.size;
    }

    // Test concurrent user operations
    async testConcurrentUsers(userCredentials) {
        console.log(`Starting concurrent users test with ${userCredentials.length} users...`);
        
        const userOperations = userCredentials.map(async (credentials, index) => {
            try {
                // Authenticate with each account individually
                await this.authenticate(credentials.email, credentials.password);
    
                const startTime = performance.now();
                await this.simulateUserActions();
                const endTime = performance.now();
    
                return {
                    type: 'concurrent_user',
                    userId: index,
                    success: true,
                    responseTime: endTime - startTime
                };
            } catch (error) {
                return {
                    type: 'concurrent_user',
                    userId: index,
                    success: false,
                    error: error.message
                };
            } finally {
                // Sign out after each operation to clean up
                await auth.signOut();
            }
        });
    
        const results = await Promise.all(userOperations);
        this.results.tests.push(...results);
    }

    // Simulate typical user actions
    async simulateUserActions() {
        // Simulate typical user operations
        await Promise.all([
            this.readCollection('badges'),
            this.readCollection('announcements')
        ]);
    }

    // Calculate and add summary statistics
    calculateSummary() {
        const successfulTests = this.results.tests.filter(test => test.success);
        const failedTests = this.results.tests.filter(test => !test.success);
        
        const responseTimes = successfulTests
            .filter(test => test.responseTime)
            .map(test => test.responseTime);

        this.results.summary = {
            totalTests: this.results.tests.length,
            successfulTests: successfulTests.length,
            failedTests: failedTests.length,
            averageResponseTime: responseTimes.length > 0 
                ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2)
                : 0,
            maxResponseTime: Math.max(...responseTimes).toFixed(2),
            minResponseTime: Math.min(...responseTimes).toFixed(2)
        };
    }

    // Generate HTML report
    generateHTMLReport() {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Stress Test Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .summary { background: #f5f5f5; padding: 20px; margin-bottom: 20px; }
                    .test-results { margin-top: 20px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { padding: 8px; border: 1px solid #ddd; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .success { color: green; }
                    .failure { color: red; }
                </style>
            </head>
            <body>
                <h1>Stress Test Report</h1>
                <div class="summary">
                    <h2>Summary</h2>
                    <p>Total Tests: ${this.results.summary.totalTests}</p>
                    <p>Successful Tests: ${this.results.summary.successfulTests}</p>
                    <p>Failed Tests: ${this.results.summary.failedTests}</p>
                    <p>Average Response Time: ${this.results.summary.averageResponseTime}ms</p>
                    <p>Max Response Time: ${this.results.summary.maxResponseTime}ms</p>
                    <p>Min Response Time: ${this.results.summary.minResponseTime}ms</p>
                </div>
                <div class="test-results">
                    <h2>Detailed Results</h2>
                    <table>
                        <tr>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Response Time (ms)</th>
                            <th>Details</th>
                        </tr>
                        ${this.results.tests.map(test => `
                            <tr>
                                <td>${test.type}</td>
                                <td class="${test.success ? 'success' : 'failure'}">
                                    ${test.success ? 'Success' : 'Failure'}
                                </td>
                                <td>${test.responseTime ? test.responseTime.toFixed(2) : 'N/A'}</td>
                                <td>${test.error || '-'}</td>
                            </tr>
                        `).join('')}
                    </table>
                </div>
            </body>
            </html>
        `;
    }

    // Add burst testing capability
    async testBurstLoad(burstSize = 20, numberOfBursts = 5) {
        console.log(`Starting burst load test with ${burstSize} requests per burst, ${numberOfBursts} bursts`);
        
        for (let burst = 0; burst < numberOfBursts; burst++) {
            const promises = Array(burstSize).fill().map(async () => {
                const startTime = performance.now();
                try {
                    await this.simulateUserActions();
                    return {
                        type: 'burst_test',
                        burstNumber: burst,
                        success: true,
                        responseTime: performance.now() - startTime
                    };
                } catch (error) {
                    return {
                        type: 'burst_test',
                        burstNumber: burst,
                        success: false,
                        error: error.message
                    };
                }
            });

            const results = await Promise.all(promises);
            this.results.tests.push(...results);
            
            // Short delay between bursts
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

// Export the class
export default StressTest;
