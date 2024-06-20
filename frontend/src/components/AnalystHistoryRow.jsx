import { Button, OverlayTrigger, Tooltip } from "react-bootstrap";
import { ANALYSIS_STATUS, API_ENDPOINTS, PREDEFINED_JOB_IDS } from "../constants.js";
import { useNavigate } from "react-router-dom";
import { CgDanger } from "react-icons/cg";
import useReqTVA from "../hooks/useReqTVA";
import { ColorRing } from "react-loader-spinner";
import { useState, useRef, useEffect } from "react"
import {
    getAnalysisNotifs
} from "../firebase/firebase.js"

import { onSnapshot } from "firebase/firestore";
const AnalystHistoryRow = ({
    status,
    name,
    ownersRegistered,
    jobId,
    documentId,
}) => {
    let s = status;
    const [isLogExpanded, setIsLogExpanded] = useState(false)


    const navigate = useNavigate();
    const analysisLinkOnClick = () => {
        navigate("/entry/" + documentId);
    };
    const { apiReqError, axiosPostToTva } = useReqTVA();

    const PROCESSING_ANALYSIS_STATUSES = [
        ANALYSIS_STATUS.CREATING_VMS,
        ANALYSIS_STATUS.VMS_CREATED,
        ANALYSIS_STATUS.SETTING_UP_AUTH,
        ANALYSIS_STATUS.FINISHED_AUTH_SETUP,
        ANALYSIS_STATUS.DEPLOYING_AGENT,
        ANALYSIS_STATUS.FINISHED_AGENT_DEPLOYMENT,
        ANALYSIS_STATUS.PREPARING_INPUT_SECRET_SHARES,
        ANALYSIS_STATUS.INPUT_SECRET_SHARES_PREPARED,
        ANALYSIS_STATUS.RUNNING_EXPERIMENT,
        ANALYSIS_STATUS.EXPERIMENT_FINISHED,
        ANALYSIS_STATUS.EXPORTING_RESULT_SHARES,
        ANALYSIS_STATUS.RESULT_SHARES_EXPORTED,
    ]

    const FINISHED_ANALYSIS_STATUSES = [
        ANALYSIS_STATUS.TERMINATING_RESOURCES,
        ANALYSIS_STATUS.SUCCESS,

    ]

    const QueryButton = () => {
        const isJobIdPredefined = Object.values(PREDEFINED_JOB_IDS).includes(jobId);
        const processingStatus = PROCESSING_ANALYSIS_STATUSES.find(e => e == s)
        const finishStatus = FINISHED_ANALYSIS_STATUSES.find(e => e == s);
        if (!isJobIdPredefined) {
            return (
                <Button variant="light" disabled={true}>
                    Start Analysis (Disabled)
                </Button>
            );
        } else if (s == ANALYSIS_STATUS.CREATED) {
            return (
                <Button variant="primary" onClick={handleSubmitQuery}>
                    Start Analysis
                </Button>
            );
        } else if (processingStatus != undefined) {

            return (
                <div>
                    <Button variant="secondary">
                        Started
                    </Button>
                    <ColorRing
                        visible={true}
                        height="40"
                        width="40"
                        ariaLabel="color-ring-loading"
                        wrapperStyle={{}}
                        wrapperClass="color-ring-wrapper"
                        colors={['#088F8F', '#088F8F', '#088F8F', '#088F8F', '#088F8F']}
                    />
                </div>
            );
        } else if (finishStatus != undefined) {
            // either TERMINATING_RESOURCES or SUCCESS
            return (

                <div>
                    <Button variant="success" onClick={analysisLinkOnClick}>
                        See Results
                    </Button>
                </div>
            )
        } else if (s == ANALYSIS_STATUS.FAIL) {
            return (
                <Button variant="danger">
                    Fail
                </Button>
            )
        } else {
            return <Button variant="danger">N/A</Button>;
        }
    };

    const DangerIcon = ({ message }) => {
        return (
            <OverlayTrigger
                overlay={
                    <Tooltip id={`${documentId}-tooltip`}>{message}</Tooltip>
                }
            >
                <span style={{ marginLeft: "5px" }}>
                    <CgDanger color="red" />
                </span>
            </OverlayTrigger>
        );
    };

    const trRef = useRef(null);


    const [rowDims, setRowDims] = useState({
        top: 0,
        width: trRef.current?.clientWidth,
        height: trRef.current?.clientHeight,
    });

    const handleOpenLog = () => {
        if (isLogExpanded) {
            return
        }
        const height = window.innerHeight * 0.35 - trRef.current.clientHeight
        setIsLogExpanded(true)
        setRowDims({
            top: trRef.current.clientHeight,
            height: height,
            width: trRef.current.clientWidth,
        })
    }

    const [analysisNotifs, setAnalysisNotifs] = useState([]);
    useEffect(() => {
        const q = getAnalysisNotifs(documentId)
        onSnapshot(q, (querySnapshot) => {
            if (querySnapshot.size > 0) {
                const temp = [];
                querySnapshot.forEach((doc) => {
                    temp.push({ id: doc.id, ...doc.data() });
                });
                setAnalysisNotifs(temp.sort(
                    (a, b) => a.timestamp.seconds - b.timestamp.seconds
                ));
            }
        });
    }, [])

    useEffect(() => {
        if (![
            ANALYSIS_STATUS.CREATED, ANALYSIS_STATUS.SUCCESS, ANALYSIS_STATUS.FAIL
        ].includes(status)) {

            handleOpenLog()
        }
    }, [status])

    const [submittedQuery, setSubmittedQuery] = useState(false)
    const handleSubmitQuery = async () => {
        if (submittedQuery) {
            return
        }
        await axiosPostToTva({
            data: {
                job_id: jobId,
            },
            apiUrl: API_ENDPOINTS.SUBMIT_JOB,
        });
        setSubmittedQuery(true)
    };


    return (
        <>
            <tr
                ref={trRef}
                style={{
                    position: "relative",
                    height: isLogExpanded ? "40vh" : "auto"
                }}
            >
                <td>

                    <div>
                        {
                            ([
                                ANALYSIS_STATUS.CREATED, ANALYSIS_STATUS.SUCCESS, ANALYSIS_STATUS.FAIL
                            ].includes(status)) ? status :
                                "Started"
                        }
                    </div>

                    {isLogExpanded && <div style={{
                        position: "absolute",
                        top: rowDims.top,
                        left: 0,
                        height: rowDims.height,
                        maxHeight: "200px",
                        width: rowDims.width,
                        background: "#f0f0f0",
                        borderRadius: "8px",
                        padding: "16px",
                        overflowX: "auto",
                        marginBot: "10px"
                    }}>
                        {analysisNotifs.map(msg => <p
                            key={`analysis-notifs-${msg.timestamp.seconds}`}
                            style={{
                                whiteSpace: "pre-wrap",
                                fontFamily: "monospace"
                            }}
                        >
                            {`${new Date(
                                msg.timestamp.seconds * 1000
                            ).toUTCString()}:${msg.message}`}
                        </p>)}
                    </div>}

                </td>
                <td>
                    <p
                        style={{
                            cursor: "pointer",
                            color: "blue",
                            textDecoration: "underline",
                        }}
                        onClick={analysisLinkOnClick}
                    >
                        {name}
                    </p>
                </td>
                <td>{ownersRegistered.length}</td>
                <td
                    style={{
                        display: "flex",
                        justifyContent: "left"
                    }}
                >
                    <QueryButton />
                    {apiReqError.hasError && (
                        <DangerIcon message={submitJobError.message} />
                    )}
                </td>
            </tr>
        </>
    );
};

export default AnalystHistoryRow;
