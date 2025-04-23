import React from 'react';
import PropTypes from 'prop-types';
import './briefingTiles.css';

const BriefingTiles = ({ summary, hazards, pireps, sigmets, conditions, recommendations }) => {
    return (
        <div className="briefing-tiles">
            <div className="tile summary-tile">
                <h3>Summary</h3>
                <div className="tile-content" dangerouslySetInnerHTML={{ __html: summary }} />
            </div>
            <div className="tile hazards-tile">
                <h3>Hazards</h3>
                <div className="tile-content" dangerouslySetInnerHTML={{ __html: hazards }} />
            </div>
            <div className="tile pireps-tile">
                <h3>PIREPs</h3>
                <div className="tile-content" dangerouslySetInnerHTML={{ __html: pireps }} />
            </div>
            <div className="tile sigmets-tile">
                <h3>SIGMETs</h3>
                <div className="tile-content" dangerouslySetInnerHTML={{ __html: sigmets }} />
            </div>
            <div className="tile conditions-tile">
                <h3>Conditions</h3>
                <div className="tile-content" dangerouslySetInnerHTML={{ __html: conditions }} />
            </div>
            <div className="tile recommendations-tile">
                <h3>Recommendations</h3>
                <div className="tile-content" dangerouslySetInnerHTML={{ __html: recommendations }} />
            </div>
        </div>
    );
};

BriefingTiles.propTypes = {
    summary: PropTypes.string.isRequired,
    hazards: PropTypes.string.isRequired,
    pireps: PropTypes.string.isRequired,
    sigmets: PropTypes.string.isRequired,
    conditions: PropTypes.string.isRequired,
    recommendations: PropTypes.string.isRequired,
};

export default BriefingTiles;