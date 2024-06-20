import React from "react";
import { NavDropdown } from "react-bootstrap";
const AnalysisDataType = ({ schemaRow }) => {
	if (schemaRow.dataType === "VARCHAR") {
		return <>{`VARCHAR (${schemaRow.varCharUnits})`}</>;
	} else if (schemaRow.dataType === "CATEGORY") {
		return (
			<NavDropdown title="CATEGORY">
				{schemaRow.categories?.map((category,index) => {
					return <NavDropdown.Item
                   key={`category-schemaRow-${index}`} 
                    >{category}</NavDropdown.Item>;
				})}
			</NavDropdown>
		);
	} else {
		return <>{schemaRow.dataType}</>;
	}
};

export default AnalysisDataType;
