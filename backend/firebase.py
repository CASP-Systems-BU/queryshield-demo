from typing import Any, Dict, Optional
from firebase_admin import firestore, credentials, initialize_app
import os


FIREBASE_CREDENTIALS_FILE_PATH = os.getenv("FIREBASE_CREDENTIALS_FILE_PATH")

# Initialize Firebase app
cred = credentials.Certificate(FIREBASE_CREDENTIALS_FILE_PATH)
app = initialize_app(cred)
db = firestore.client()

# References to Firestore collections
analysis_catalog_ref = db.collection("analysis-catalog")
data_owner_notifications_ref = db.collection("notifications")
data_analyst_notifs_ref = db.collection('data-analyst-notifs')
results_ref = db.collection("results")


def get_analysis_id_by_job_id(job_id):
    job_id_value = job_id
    query = analysis_catalog_ref.where('jobId', '==', job_id_value)

    # Execute the query.
    results = query.get()
    if len(results) > 0:
        return results[0].id
    return None


def create_new_result(analysis_id, result_data):
    query = results_ref.where("analysisId", '==', analysis_id)
    results = query.get()
    if len(results) == 0:
        results_ref.add({
            "analysisId": analysis_id,
            "result": result_data
        })


def update_analysis_status(analysis_id, status, message):
    analysis_doc_ref = analysis_catalog_ref.document(analysis_id)
    snapshot = analysis_doc_ref.get()
    if snapshot.exists:
        analysis_doc_ref.update(
            {**snapshot.to_dict(), "status": status, "statusMessage": message}
        )


def create_new_data_analyst_notification(analysis_id, message):
    data_analyst_notifs_ref.add(
        {
            "analysisId": analysis_id,
            "timestamp": firestore.firestore.SERVER_TIMESTAMP,
            "message": message
        }
    )


def create_new_notification(analysis_id, message, title):
    analysis_doc_ref = analysis_catalog_ref.document(analysis_id)
    snapshot = analysis_doc_ref.get()
    if snapshot.exists:
        analysis_entry_name = snapshot.to_dict()["analysisName"]
        data_owners_registered = snapshot.to_dict()["ownersRegistered"]
        notifications = []
        for data_owner_id in data_owners_registered:
            notification = data_owner_notifications_ref.add(
                {
                    "dataOwnerId": data_owner_id,
                    "analysisEntryName": analysis_entry_name,
                    "analysisEntryId": analysis_id,
                    "notificationMessage": message,
                    "timestamp": firestore.firestore.SERVER_TIMESTAMP,
                    "title": title,
                }
            )
            notifications.append(notification)
        return notifications
    else:
        return None


def get_analysis_dict_by_id(analysis_id: str) -> Optional[Dict[str, Any]]:
    doc_ref = analysis_catalog_ref.document(analysis_id)
    snapshot = doc_ref.get()
    if not snapshot.exists:
        return None
    return snapshot.to_dict()


def delete_data_analyst_notification_by_id(analysis_id: str) -> None:
    query = data_analyst_notifs_ref.where('analysisId', '==', analysis_id)
    # Execute the query.
    results = query.get()
    if len(results) == 0:
        return

    for result in results:
        doc_id = result.id
        data_analyst_notifs_ref.document(doc_id).delete()


def delete_results_by_id(analysis_id: str) -> None:
    query = results_ref.where('analysisId', '==', analysis_id)
    # Execute the query.
    results = query.get()
    if len(results) == 0:
        return

    for result in results:
        doc_id = result.id
        results_ref.document(doc_id).delete()


def delete_data_owner_notifications_by_id(analysis_id: str) -> None:
    query = data_owner_notifications_ref.where(
        'analysisEntryId', '==', analysis_id)
    # Execute the query.
    results = query.get()
    if len(results) == 0:
        return

    for result in results:
        doc_id = result.id
        data_owner_notifications_ref.document(doc_id).delete()


def update_analysis_catalog_ref_by_id(analysis_id: str, updates: Dict[str, Any]):
    doc_ref = analysis_catalog_ref.document(analysis_id)
    snapshot = doc_ref.get()
    if snapshot.exists:
        doc_ref.update(
            {**snapshot.to_dict(),
             **updates,
             }
        )
