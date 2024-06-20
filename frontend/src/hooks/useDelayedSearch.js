import { useState, useEffect, useRef } from "react";
const useDelayedSearch = () => {
	const [committedQuery, setCommittedQuery] = useState("");
	const [stagingQuery, setStagingQuery] = useState("");

	let currentTimeout = useRef(null);
	useEffect(() => {
		const commitQueryTimeout = () =>
			setTimeout(() => {
				setCommittedQuery(stagingQuery);
			}, 1000);
		if (currentTimeout.current) {
			clearTimeout(currentTimeout.current);
		}
		currentTimeout.current = commitQueryTimeout();
	}, [stagingQuery]);

	const handleSearch = (e) => {
		setStagingQuery(e.target.value);
	};
	return {
		handleSearch,
		committedQuery,
		stagingQuery,
	};
};

export default useDelayedSearch;
