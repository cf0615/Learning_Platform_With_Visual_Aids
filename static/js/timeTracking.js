import { auth, db } from './firebase-config.js';  // Import Firebase config
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

let sessionStartTime;
let sessionIntervalId;

// Start tracking study time when the page loads
function startStudySession() {
    sessionStartTime = Date.now();  // Capture start time
    console.log("Study session started");
    console.log(new Date().toISOString().split('T')[0]);

    // Periodically send time spent to Firestore (e.g., every 5 minutes)
    sessionIntervalId = setInterval(() => {
        sendStudyTimeToFirestore();
    }, 5 * 60 * 1000);  // Every 5 minutes (5 * 60 * 1000 milliseconds)
}

// Send the study time to Firestore
async function sendStudyTimeToFirestore() {
    const sessionEndTime = Date.now();  // Capture session end time
    const timeSpentInSeconds = (sessionEndTime - sessionStartTime) / 1000;  // Calculate session time in seconds

    const user = auth.currentUser;  // Get the current authenticated user

    if (user) {
        const userId = user.uid;
        const userRef = doc(db, 'users', userId);  // Reference to the user's Firestore document

        try {
            // Fetch current user document
            const userDoc = await getDoc(userRef);
            const userData = userDoc.data();

            // Get the current date (just the date part)
            const currentDate = new Date().toISOString().split('T')[0];  // Example: "2024-10-29"

            // Find if there is an existing session for today
            let sessions = userData.sessions || [];
            const existingSession = sessions.find(session => session.date === currentDate);

            if (existingSession) {
                // Update the time spent for today's session
                existingSession.timeSpent += timeSpentInSeconds;
            } else {
                // Add a new session for today
                sessions.push({
                    date: currentDate,
                    timeSpent: timeSpentInSeconds
                });
            }

            // Update the user's Firestore document with the new/updated session
            await updateDoc(userRef, {
                totalStudyTime: (userData.totalStudyTime || 0) + timeSpentInSeconds,  // Update total time
                sessions: sessions  // Update sessions array
            });

            console.log(`Updated total study time and session data for user ${userId}`);
        } catch (error) {
            console.error('Error updating study time:', error);
        }
    }

    sessionStartTime = Date.now();  // Reset session start time
}

// Start tracking session when the page loads
window.addEventListener('load', startStudySession);

// Stop tracking session when the user leaves the page
export async function saveStudyTime() {
    const sessionEndTime = Date.now();  // Capture session end time
    const timeSpentInSeconds = (sessionEndTime - sessionStartTime) / 1000;  // Calculate session time in seconds

    const user = auth.currentUser;  // Get the current authenticated user

    if (user) {
        const userId = user.uid;
        const userRef = doc(db, 'users', userId);  // Reference to the user's Firestore document

        try {
            // Fetch current user document
            const userDoc = await getDoc(userRef);
            const userData = userDoc.data();

            // Get the current date (just the date part)
            const currentDate = new Date().toISOString().split('T')[0];  // Example: "2024-10-29"

            // Find if there is an existing session for today
            let sessions = userData.sessions || [];
            const existingSession = sessions.find(session => session.date === currentDate);

            if (existingSession) {
                // Update the time spent for today's session
                existingSession.timeSpent += timeSpentInSeconds;
            } else {
                // Add a new session for today
                sessions.push({
                    date: currentDate,
                    timeSpent: timeSpentInSeconds
                });
            }

            // Update the user's Firestore document with the new/updated session
            await updateDoc(userRef, {
                totalStudyTime: (userData.totalStudyTime || 0) + timeSpentInSeconds,  // Update total time
                sessions: sessions  // Update sessions array
            });

            console.log(`Updated total study time and session data for user ${userId}`);
        } catch (error) {
            console.error('Error updating study time:', error);
        }
    }

    sessionStartTime = Date.now();  // Reset session start time
}
