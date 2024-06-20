import { initializeApp } from "firebase/app";
import {
	getFirestore,
	collection,
	getDocs,
	doc,
	addDoc,
	getDoc,
	updateDoc,
	query,
	limit,
	where,
    onSnapshot,
} from "firebase/firestore";

const firebaseConfig = {
	apiKey: import.meta.env.VITE_API_KEY,
	authDomain: import.meta.env.VITE_AUTH_DOMAIN,
	databaseURL: import.meta.env.VITE_DATABASE_URL,
	projectId: import.meta.env.VITE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analysisCatalogRef = collection(db, "analysis-catalog");
const usersRef = collection(db, "users");
const dataOwnerRegistrationRef = collection(db, "data-owner-registrations");
const dataOwnerNotificationsRef = collection(db, "notifications");
const dataAnalystNotifRef = collection(db, "data-analyst-notifs")
const resultsRef = collection(db,"results")

export async function getAllAnalyses() {
	const snapshot = await getDocs(analysisCatalogRef);
	const analyses = [];

	snapshot.forEach((doc) => {
		analyses.push({ id: doc.id, ...doc.data() });
	});
	return analyses;
}
// todo-es : might need to have a real time for get all analyses
export function getAllAnalysesRealtime(callback) {
    // Set up the real-time listener on the analysisCatalogRef
    return onSnapshot(analysisCatalogRef, (snapshot) => {
        const analyses = [];
        snapshot.forEach((doc) => {
            analyses.push({ id: doc.id, ...doc.data() });
        });
        // Invoke the callback function with the updated data
        callback(analyses);
    }, 
    (error) => {
        // Handle any errors here
        console.error("Error fetching real-time analyses:", error);
    });
}

export async function getResult(analysisId){
    const q = query(resultsRef,where("analysisId",'==',analysisId),limit(1))
    const querySnapshot = await getDocs(q)
    if (querySnapshot.size > 0){
		const firstResult = querySnapshot.docs[0];
		return { id: firstResult.id, ...firstResult.data() };
    }else {
        return null
    }
}

export function onSnapshotResult(analysisId, callback) {
    const q = query(resultsRef, where("analysisId", '==', analysisId), limit(1));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        if (querySnapshot.size > 0) {
            const firstResult = querySnapshot.docs[0];
            const result = { id: firstResult.id, ...firstResult.data() };
            callback(result);
        } else {
            callback(null);
        }
    });

    return unsubscribe;
}


export function getMyAnalyses(userId) {
	const q = query(analysisCatalogRef, where("dataAnalystId", "==", userId));
	return q;
}

export function getAnalysisNotifs(entryId) {
	const q = query(dataAnalystNotifRef, where("analysisId", '==', entryId));
	return q;
}

export async function getAnalysis(analysisId) {
	const analysisDocRef = doc(analysisCatalogRef, analysisId);
	const snapshot = await getDoc(analysisDocRef);

	if (snapshot.exists()) {
		return { id: analysisId, ...snapshot.data() };
	} else {
		return null; // Analysis not found
	}
}

export async function createAnalysis(analysisData) {
	const newDocRef = await addDoc(analysisCatalogRef, analysisData);
	return newDocRef.id;
}

export async function updateAnalysis(analysisId, newData) {
	const analysisDocRef = doc(analysisCatalogRef, analysisId);
	await updateDoc(analysisDocRef, newData);
}

export async function getUser(userId) {
	const q = query(usersRef, where("userId", "==", userId), limit(1));
	const querySnapshot = await getDocs(q);

	if (querySnapshot.size > 0) {
		const firstUser = querySnapshot.docs[0];
		return { id: firstUser.id, ...firstUser.data() };
	} else {
		return null; // No documents found
	}
}

export async function createUser(userData) {
	const newDocRef = await addDoc(usersRef, userData);
	return newDocRef.id;
}

export const appendDataOwnerRegistration = async (userId, analysisId) => {
	const q = query(
		dataOwnerRegistrationRef,
		where("dataOwnerId", "==", userId),
		limit(1)
	);
	const querySnapshot = await getDocs(q);
	if (querySnapshot.size > 0) {
		const doc = querySnapshot.docs[0];
		const docRef = doc.ref;
		const data = { ...doc.data() };
		await updateDoc(docRef, {
			...data,
			registeredAnalyses: [...data.registeredAnalyses, analysisId],
		});
	} else {
		await addDoc(dataOwnerRegistrationRef, {
			dataOwnerId: userId,
			registeredAnalyses: analysisId,
		});
	}
};

export const getAllNotificationsSnapshot = (dataOwnerId) => {
	return query(
		dataOwnerNotificationsRef,
		where("dataOwnerId", "==", dataOwnerId)
	);
};

