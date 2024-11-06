import StressTest from './stressTest.js';
import { auth } from './firebase-config.js';

let userCredentials = [
    { email: 'user1@gmail.com', password: 'Cf@030615' },
    { email: 'user2@gmail.com', password: 'Cf@030615' },
    { email: 'user3@gmail.com', password: 'Cf@030615' },
    { email: 'user4@gmail.com', password: 'Cf@030615' },
    { email: 'user5@gmail.com', password: 'Cf@030615' },
    { email: 'user6@gmail.com', password: 'Cf@030615' },
    { email: 'user7@gmail.com', password: 'Cf@030615' },
    { email: 'user8@gmail.com', password: 'Cf@030615' },
    { email: 'user9@gmail.com', password: 'Cf@030615' },
    { email: 'user10@gmail.com', password: 'Cf@030615' },
    { email: 'jisoo@gmail.com', password: 'Cf@030615' },
    { email: 'jisoo0615@gmail.com', password: 'Cf@030615' },
    { email: 'cat@gmail.com', password: 'Cf@030615' },
    { email: 'p21013579@student.newinti.edu.my', password: '123456' },
];

export async function runTests(email, password) {
    const tester = new StressTest();

    try {
        // First authenticate with the admin/test user credentials
        await tester.authenticate(email, password);
        
        // Run concurrent user tests
        await tester.testConcurrentUsers(userCredentials);
        
        // Re-authenticate the main test user after concurrent tests
        await tester.authenticate(email, password);
        
        // Run the remaining tests
        await tester.testDatabaseReads(1000);
        await tester.testAddDocuments(1000);
        await tester.testUpdateDocuments(1000);
        await tester.testBurstLoad(200, 50);

        tester.calculateSummary();
        const reportHTML = tester.generateHTMLReport();
        saveReport(reportHTML);

    } catch (error) {
        console.error('Stress testing failed:', error);
        throw error;
    } finally {
        await auth.signOut();
    }
}

function saveReport(htmlContent) {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `stress-test-report-${new Date().toISOString()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}